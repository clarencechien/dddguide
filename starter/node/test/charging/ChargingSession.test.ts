import { describe, expect, it } from 'vitest';
import { ChargingSession, SessionStatus } from '../../src/charging/domain/ChargingSession.ts';

// Canonical afternoon at SITE-TPE-01 (curriculum §1.6): CP-A12-2, TAG-MONTHLY-77, S-991, 12.4 kWh.
const T_1404 = '2025-05-20T14:04:00+08:00';
const T_1413 = '2025-05-20T14:13:00+08:00';

describe('ChargingSession aggregate (Day 4)', () => {
  // Your first red. Make it green with the smallest change, then refactor, then un-skip R2.
  it('R1 occupied connector rejects a second start', () => {
    const session = ChargingSession.idle('CP-A12-2');
    session.start({ sessionId: 'S-991', idTag: 'TAG-MONTHLY-77', authorized: true, meterStartWh: 100, at: T_1404 });
    session.pullEvents();

    session.start({ sessionId: 'S-992', idTag: 'TAG-VISITOR-01', authorized: true, meterStartWh: 4100, at: T_1413 });

    expect(session.pullEvents()).toEqual([
      { type: 'ChargingStartRejected', connectorId: 'CP-A12-2', idTag: 'TAG-VISITOR-01', reason: 'ConnectorOccupied', occurredAt: T_1413 },
    ]);
    // the original session is unchanged
    expect(session.sessionId).toBe('S-991');
    expect(session.idTag).toBe('TAG-MONTHLY-77');
    expect(session.status).toBe(SessionStatus.Charging);
  });

  // R2: Given an Idle connector, When start with authorized=false,
  //     Then ChargingStartRejected(reason=Unauthorized) and status stays Idle.
  //     Also write the happy path: authorized=true -> ChargingStarted with meterStartWh.
  it.skip('R2 unauthorized idTag cannot start charging', () => {
    // TODO
  });

  // R3: Given Charging with lastMeterWh=4100, When reportMeter(3900),
  //     Then MeterValueRejected(reason=NotMonotonic, meterWh=3900, lastMeterWh=4100) and lastMeterWh stays 4100.
  //     Then reportMeter(8100) -> EnergyMetered and lastMeterWh=8100.
  it.skip('R3 meter values must be monotonic; a backwards value is rejected and recorded', () => {
    // TODO
  });

  // R4: Given start at meter 100, readings 4100 / 8100 / 12500, When stop('Local', 14:31),
  //     Then ChargingCompleted(energyWh=12400, startedAt=14:04, endedAt=14:31, stopReason='Local'), status Completed.
  //     And: stop() on an Idle or Completed session throws InvalidStateError.
  it.skip('R4 stop completes the session with energyWh = last meter - start meter (12.4 kWh)', () => {
    // TODO
  });
});
