import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.ts';

const T_1404 = '2025-05-20T14:04:00+08:00';
const T_1431 = '2025-05-20T14:31:00+08:00';

describe('ChargingService + Outbox (Day 5 B1)', () => {
  it('R8 the aggregate never publishes directly: events reach the bus only through the Outbox relay', async () => {
    const app = buildApp();

    await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 0, at: T_1404 });

    expect(app.bus.delivered).toHaveLength(0); // nothing on the bus yet
    const pending = await app.chargingOutbox.pending();
    expect(pending.map((e) => e.type)).toEqual(['charging.session.started.v1']);

    await app.relayAll();
    expect(app.bus.deliveredOfType('charging.session.started.v1')).toHaveLength(1);
    expect(await app.chargingOutbox.pending()).toHaveLength(0);

    await app.relayAll(); // relaying again publishes nothing new
    expect(app.bus.delivered).toHaveLength(1);
  });

  it('writes the integration envelope with all required fields', async () => {
    const app = buildApp();
    await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 0, at: T_1404, correlationId: 'corr-afternoon' });

    const [event] = await app.chargingOutbox.pending();
    expect(event).toMatchObject({
      type: 'charging.session.started.v1',
      version: 1,
      producer: 'charging',
      occurredAt: T_1404,
      correlationId: 'corr-afternoon',
      causationId: 'corr-afternoon',
      payload: { sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', startedAt: T_1404 },
    });
    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('R1 through the service: the second StartCharging on CP-A12-2 is rejected and not persisted', async () => {
    const app = buildApp({ validTags: ['TAG-MONTHLY-77', 'TAG-VISITOR-01'] });
    await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 0, at: T_1404 });

    const events = await app.charging.startCharging({ sessionId: 'S-992', connectorId: 'CP-A12-2', idTag: 'TAG-VISITOR-01', meterStartWh: 0, at: T_1404 });

    expect(events[0]).toMatchObject({ type: 'ChargingStartRejected', reason: 'ConnectorOccupied' });
    expect(await app.sessions.findById('S-992')).toBeUndefined();
    expect((await app.sessions.findById('S-991'))?.status).toBe('Charging');
  });

  it('R2 through the service: unknown idTag is rejected by the AuthorizationService port', async () => {
    const app = buildApp();
    const events = await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-UNKNOWN', meterStartWh: 0, at: T_1404 });
    expect(events[0]).toMatchObject({ type: 'ChargingStartRejected', reason: 'Unauthorized' });
  });

  it('R4 through the service: completed event carries energyWh 12400', async () => {
    const app = buildApp();
    await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 0, at: T_1404 });
    await app.charging.reportMeterValue({ sessionId: 'S-991', meterWh: 12400, at: T_1431 });
    await app.charging.stopCharging({ sessionId: 'S-991', stopReason: 'Local', at: T_1431 });

    const types = (await app.chargingOutbox.pending()).map((e) => e.type);
    expect(types).toEqual(['charging.session.started.v1', 'charging.session.completed.v1']);
    expect((await app.chargingOutbox.pending())[1].payload).toMatchObject({ sessionId: 'S-991', energyWh: 12400, stopReason: 'Local' });
  });

  it('a fault on an idle connector is still published (stillEnergized=false), no session persisted', async () => {
    const app = buildApp();
    await app.charging.reportFault({ chargerId: 'CP-A12', connectorId: 'CP-A12-2', faultCode: 'GroundFailure', at: '2025-05-20T18:10:00+08:00' });
    const [event] = await app.chargingOutbox.pending();
    expect(event.type).toBe('charging.charger.faulted.v1');
    expect(event.payload).toMatchObject({ chargerId: 'CP-A12', connectorId: 'CP-A12-2', faultCode: 'GroundFailure', stillEnergized: false });
    expect(app.sessions.all()).toHaveLength(0);
  });
});
