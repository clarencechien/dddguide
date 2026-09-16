import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.ts';

const T_1810 = '2025-05-20T18:10:00+08:00';
const T_1810_08 = '2025-05-20T18:10:08+08:00';
const T_1818 = '2025-05-20T18:18:00+08:00';

async function reportGroundFailure(app: ReturnType<typeof buildApp>, at: string) {
  await app.charging.reportFault({ chargerId: 'CP-A12', connectorId: 'CP-A12-2', faultCode: 'GroundFailure', at, correlationId: 'corr-fault' });
  await app.relayAll();
}

describe('FaultProcessManager (Day 5 B3)', () => {
  it('charging.charger.faulted.v1 -> WO-2208 opened, TECH-HAO dispatched, ops.work_order.opened.v1 published', async () => {
    const app = buildApp();
    await reportGroundFailure(app, T_1810);

    const [wo] = app.workOrders.all();
    expect(wo.workOrderId).toBe('WO-2208');
    expect(wo.status).toBe('Assigned');
    expect(wo.technicianId).toBe('TECH-HAO');

    const opened = app.bus.deliveredOfType('ops.work_order.opened.v1');
    expect(opened).toHaveLength(1);
    expect(opened[0].payload).toEqual({ workOrderId: 'WO-2208', chargerId: 'CP-A12', faultCode: 'GroundFailure', openedAt: T_1810 });
    // envelope lineage: same correlation as the fault, caused by the faulted event
    const faulted = app.bus.deliveredOfType('charging.charger.faulted.v1')[0];
    expect(opened[0].correlationId).toBe('corr-fault');
    expect(opened[0].causationId).toBe(faulted.eventId);
  });

  it('R5 the second report 8 seconds later is attached to WO-2208, no WO-2209', async () => {
    const app = buildApp();
    await reportGroundFailure(app, T_1810);
    await reportGroundFailure(app, T_1810_08);

    expect(app.workOrders.all().map((w) => w.workOrderId)).toEqual(['WO-2208']);
    expect(app.workOrders.all()[0].duplicateReportCount).toBe(1);
    expect(app.bus.deliveredOfType('ops.work_order.opened.v1')).toHaveLength(1);
  });

  it('redelivery of the same faulted event does not open a second work order', async () => {
    const app = buildApp();
    await reportGroundFailure(app, T_1810);
    const faulted = app.bus.deliveredOfType('charging.charger.faulted.v1')[0];

    await app.bus.redeliver(faulted.eventId);
    await app.relayAll();

    expect(app.workOrders.all()).toHaveLength(1);
  });

  it('closing the work order publishes ops.work_order.closed.v1 and lets the same fault open a new WO', async () => {
    const app = buildApp();
    await reportGroundFailure(app, T_1810);

    await app.faults.closeWorkOrder('WO-2208', 'Repaired', T_1818, 'corr-fault');
    await app.relayAll();

    const closed = app.bus.deliveredOfType('ops.work_order.closed.v1');
    expect(closed[0].payload).toEqual({ workOrderId: 'WO-2208', chargerId: 'CP-A12', closedAt: T_1818, outcome: 'Repaired' });

    await reportGroundFailure(app, '2025-05-21T09:00:00+08:00');
    expect(app.workOrders.all().map((w) => w.workOrderId)).toEqual(['WO-2208', 'WO-2209']);
  });
});
