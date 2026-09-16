import { describe, it } from 'vitest';

describe('WorkOrder aggregate (Day 4 B3)', () => {
  // R5: Given WO-2208 open for CP-A12 / GroundFailure at 18:10:00,
  //     When the same charger reports GroundFailure again at 18:10:08,
  //     Then the repository still holds ONE work order, and WO-2208 has duplicateReportCount === 1
  //     with a DuplicateFaultReported event. Hint: WorkOrderRepository.findOpenByFault(chargerId, faultCode).
  //     Also: after close(), the same fault opens a NEW work order (WO-2209).
  it.skip('R5 same charger + fault code while open: second report is appended, no second work order', () => {
    // TODO
  });
});
