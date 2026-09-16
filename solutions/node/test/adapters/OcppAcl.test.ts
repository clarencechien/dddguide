import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.ts';
import type { OcppCall } from '../../src/adapters/ocpp/OcppAcl.ts';

const call = (action: string, payload: Record<string, unknown>): OcppCall => [2, `u-${action}`, action, payload];

describe('OcppAcl (Day 6 B1 anti-corruption layer)', () => {
  it('translates StartTransaction / MeterValues / StopTransaction / StatusNotification into domain commands', async () => {
    const app = buildApp();

    expect(await app.acl.handle(call('Authorize', { idTag: 'TAG-MONTHLY-77' }))).toEqual([3, 'u-Authorize', { idTagInfo: { status: 'Accepted' } }]);
    const [, , start] = await app.acl.handle(call('StartTransaction', { connectorId: 2, idTag: 'TAG-MONTHLY-77', meterStart: 0, timestamp: '2025-05-20T14:04:00+08:00' }));
    expect(start).toEqual({ transactionId: 991, idTagInfo: { status: 'Accepted' } });

    await app.acl.handle(call('MeterValues', { connectorId: 2, transactionId: 991, meterValue: [{ timestamp: '2025-05-20T14:13:00+08:00', sampledValue: [{ value: '4000', measurand: 'Energy.Active.Import.Register', unit: 'Wh' }] }] }));
    await app.acl.handle(call('StopTransaction', { transactionId: 991, idTag: 'TAG-MONTHLY-77', meterStop: 12400, timestamp: '2025-05-20T14:31:00+08:00', reason: 'Local' }));
    await app.acl.handle(call('StatusNotification', { connectorId: 2, status: 'Faulted', errorCode: 'GroundFailure', timestamp: '2025-05-20T18:10:00+08:00' }));

    const types = (await app.chargingOutbox.pending()).map((e) => e.type);
    expect(types).toEqual(['charging.session.started.v1', 'charging.session.completed.v1', 'charging.charger.faulted.v1']);
    expect((await app.chargingOutbox.pending())[1].payload).toMatchObject({ sessionId: 'S-991', connectorId: 'CP-A12-2', energyWh: 12400 });
  });

  it('no OCPP field names leak into domain / integration events', async () => {
    const app = buildApp();
    await app.acl.handle(call('StartTransaction', { connectorId: 2, idTag: 'TAG-MONTHLY-77', meterStart: 0, timestamp: '2025-05-20T14:04:00+08:00' }));
    await app.acl.handle(call('StopTransaction', { transactionId: 991, meterStop: 12400, timestamp: '2025-05-20T14:31:00+08:00', reason: 'Local' }));
    await app.acl.handle(call('StatusNotification', { connectorId: 2, status: 'Faulted', errorCode: 'GroundFailure', timestamp: '2025-05-20T18:10:00+08:00' }));

    const serialized = JSON.stringify(await app.chargingOutbox.pending());
    for (const ocppField of ['transactionId', 'meterStart', 'meterStop', 'sampledValue', 'measurand', 'errorCode', 'timestamp', 'StatusNotification']) {
      expect(serialized).not.toContain(`"${ocppField}"`);
    }
  });

  it('a second StartTransaction on an occupied connector is answered Blocked (R1 seen from OCPP)', async () => {
    const app = buildApp({ validTags: ['TAG-MONTHLY-77', 'TAG-VISITOR-01'] });
    await app.acl.handle(call('StartTransaction', { connectorId: 2, idTag: 'TAG-MONTHLY-77', meterStart: 0, timestamp: '2025-05-20T14:04:00+08:00' }));
    const [, , second] = await app.acl.handle(call('StartTransaction', { connectorId: 2, idTag: 'TAG-VISITOR-01', meterStart: 0, timestamp: '2025-05-20T14:05:00+08:00' }));
    expect(second).toMatchObject({ idTagInfo: { status: 'Blocked' } });
  });
});
