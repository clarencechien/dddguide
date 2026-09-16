import { describe, expect, it } from 'vitest';
import { ChargingSession, SessionStatus } from '../../src/charging/domain/ChargingSession.ts';
import { InvalidStateError } from '../../src/charging/domain/errors.ts';

// Canonical afternoon at SITE-TPE-01 (curriculum §1.6): CP-A12-2, TAG-MONTHLY-77, S-991, 12.4 kWh.
const T_1404 = '2025-05-20T14:04:00+08:00';
const T_1413 = '2025-05-20T14:13:00+08:00';
const T_1422 = '2025-05-20T14:22:00+08:00';
const T_1431 = '2025-05-20T14:31:00+08:00';

function chargingSession(): ChargingSession {
  const session = ChargingSession.idle('CP-A12-2');
  session.start({ sessionId: 'S-991', idTag: 'TAG-MONTHLY-77', authorized: true, meterStartWh: 100, at: T_1404 });
  session.pullEvents();
  return session;
}

describe('ChargingSession aggregate', () => {
  it('R1 occupied connector rejects a second start', () => {
    const session = chargingSession();

    session.start({ sessionId: 'S-992', idTag: 'TAG-VISITOR-01', authorized: true, meterStartWh: 4100, at: T_1413 });

    expect(session.pullEvents()).toEqual([
      { type: 'ChargingStartRejected', connectorId: 'CP-A12-2', idTag: 'TAG-VISITOR-01', reason: 'ConnectorOccupied', occurredAt: T_1413 },
    ]);
    // the original session is unchanged
    expect(session.sessionId).toBe('S-991');
    expect(session.idTag).toBe('TAG-MONTHLY-77');
    expect(session.status).toBe(SessionStatus.Charging);
  });

  it('R2 unauthorized idTag cannot start charging', () => {
    const session = ChargingSession.idle('CP-A12-2');

    session.start({ sessionId: 'S-991', idTag: 'TAG-EXPIRED-99', authorized: false, meterStartWh: 100, at: T_1404 });

    expect(session.pullEvents()).toEqual([
      { type: 'ChargingStartRejected', connectorId: 'CP-A12-2', idTag: 'TAG-EXPIRED-99', reason: 'Unauthorized', occurredAt: T_1404 },
    ]);
    expect(session.status).toBe(SessionStatus.Idle);
  });

  it('R2 authorized idTag starts charging and records ChargingStarted', () => {
    const session = ChargingSession.idle('CP-A12-2');
    session.start({ sessionId: 'S-991', idTag: 'TAG-MONTHLY-77', authorized: true, meterStartWh: 100, at: T_1404 });

    expect(session.pullEvents()).toEqual([
      { type: 'ChargingStarted', sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 100, occurredAt: T_1404 },
    ]);
    expect(session.status).toBe(SessionStatus.Charging);
  });

  it('R3 meter values must be monotonic; a backwards value is rejected and recorded', () => {
    const session = chargingSession();

    session.reportMeter(4100, T_1413);
    session.reportMeter(3900, T_1422); // register went backwards -> reject
    session.reportMeter(8100, T_1422);

    const events = session.pullEvents();
    expect(events.map((e) => e.type)).toEqual(['EnergyMetered', 'MeterValueRejected', 'EnergyMetered']);
    expect(events[1]).toMatchObject({ reason: 'NotMonotonic', meterWh: 3900, lastMeterWh: 4100, sessionId: 'S-991' });
    expect(session.lastMeterWh).toBe(8100);
  });

  it('R3 a meter value on a session that is not charging is rejected', () => {
    const session = ChargingSession.idle('CP-A12-2');
    session.reportMeter(4100, T_1413);
    expect(session.pullEvents()[0]).toMatchObject({ type: 'MeterValueRejected', reason: 'NotCharging' });
  });

  it('R4 stop completes the session with energyWh = last meter - start meter (12.4 kWh)', () => {
    const session = chargingSession();
    session.reportMeter(4100, T_1413);
    session.reportMeter(8100, T_1422);
    session.reportMeter(12500, T_1431);
    session.pullEvents();

    session.stop('Local', T_1431);

    expect(session.pullEvents()).toEqual([
      {
        type: 'ChargingCompleted',
        sessionId: 'S-991',
        connectorId: 'CP-A12-2',
        energyWh: 12400,
        startedAt: T_1404,
        endedAt: T_1431,
        stopReason: 'Local',
        occurredAt: T_1431,
      },
    ]);
    expect(session.status).toBe(SessionStatus.Completed);
  });

  it('R4 only a Charging session can be stopped', () => {
    const idle = ChargingSession.idle('CP-A12-2');
    expect(() => idle.stop('Local', T_1431)).toThrow(InvalidStateError);

    const completed = chargingSession();
    completed.stop('Local', T_1431);
    expect(() => completed.stop('Local', T_1431)).toThrow(/Completed/);
  });

  it('a fault during charging marks the session Faulted and reports stillEnergized', () => {
    const session = chargingSession();
    session.reportFault('GroundFailure', '2025-05-20T18:10:00+08:00');

    expect(session.status).toBe(SessionStatus.Faulted);
    expect(session.pullEvents()).toEqual([
      { type: 'ChargerFaulted', chargerId: 'CP-A12', connectorId: 'CP-A12-2', faultCode: 'GroundFailure', stillEnergized: true, occurredAt: '2025-05-20T18:10:00+08:00' },
    ]);
  });
});
