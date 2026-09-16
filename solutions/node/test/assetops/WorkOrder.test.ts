import { describe, expect, it } from 'vitest';
import { WorkOrder, WorkOrderStatus } from '../../src/assetops/domain/WorkOrder.ts';
import { InMemoryWorkOrderRepository } from '../../src/adapters/persistence/InMemoryWorkOrderRepository.ts';

const T_1810 = '2025-05-20T18:10:00+08:00';
const T_1810_08 = '2025-05-20T18:10:08+08:00';
const T_1818 = '2025-05-20T18:18:00+08:00';

describe('WorkOrder aggregate (Day 4 B3)', () => {
  it('opens a work order for a charger fault and records WorkOrderOpened', () => {
    const wo = WorkOrder.open({ workOrderId: 'WO-2208', chargerId: 'CP-A12', connectorId: 'CP-A12-2', faultCode: 'GroundFailure', at: T_1810 });

    expect(wo.status).toBe(WorkOrderStatus.Open);
    expect(wo.pullEvents()).toEqual([
      { type: 'WorkOrderOpened', workOrderId: 'WO-2208', chargerId: 'CP-A12', connectorId: 'CP-A12-2', faultCode: 'GroundFailure', occurredAt: T_1810 },
    ]);
  });

  it('R5 same charger + fault code while open: second report is appended, no second work order', async () => {
    const repo = new InMemoryWorkOrderRepository();
    const first = WorkOrder.open({ workOrderId: 'WO-2208', chargerId: 'CP-A12', faultCode: 'GroundFailure', at: T_1810 });
    await repo.save(first);

    // second report 8 seconds later: the intake looks up the open WO before opening a new one
    const existing = await repo.findOpenByFault('CP-A12', 'GroundFailure');
    expect(existing?.workOrderId).toBe('WO-2208');
    existing!.appendDuplicateReport(T_1810_08);
    await repo.save(existing!);

    expect(repo.all()).toHaveLength(1);
    expect(existing!.duplicateReportCount).toBe(1);
    expect(existing!.pullEvents().map((e) => e.type)).toEqual(['WorkOrderOpened', 'DuplicateFaultReported']);
  });

  it('R5 after the work order is closed, the same fault opens a NEW work order', async () => {
    const repo = new InMemoryWorkOrderRepository();
    const first = WorkOrder.open({ workOrderId: 'WO-2208', chargerId: 'CP-A12', faultCode: 'GroundFailure', at: T_1810 });
    first.close('Repaired', T_1818);
    await repo.save(first);

    expect(await repo.findOpenByFault('CP-A12', 'GroundFailure')).toBeUndefined();
    expect(() => first.appendDuplicateReport(T_1818)).toThrow(/closed/);
  });

  it('assign then close walks the fault lifecycle', () => {
    const wo = WorkOrder.open({ workOrderId: 'WO-2208', chargerId: 'CP-A12', faultCode: 'GroundFailure', at: T_1810 });
    wo.assign('TECH-HAO', T_1810);
    wo.close('Repaired', T_1818);

    expect(wo.status).toBe(WorkOrderStatus.Closed);
    expect(wo.technicianId).toBe('TECH-HAO');
    expect(wo.pullEvents().map((e) => e.type)).toEqual(['WorkOrderOpened', 'TechnicianAssigned', 'WorkOrderClosed']);
    expect(() => wo.close('Repaired', T_1818)).toThrow(/already closed/);
  });
});
