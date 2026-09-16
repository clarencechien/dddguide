import type { WorkOrder } from '../../assetops/domain/WorkOrder.ts';
import type { DispatchService, WorkOrderRepository } from '../../assetops/application/ports.ts';

export class InMemoryWorkOrderRepository implements WorkOrderRepository {
  private readonly byId = new Map<string, WorkOrder>();

  async findById(workOrderId: string): Promise<WorkOrder | undefined> {
    return this.byId.get(workOrderId);
  }

  async findOpenByFault(chargerId: string, faultCode: string): Promise<WorkOrder | undefined> {
    for (const wo of this.byId.values()) {
      if (wo.chargerId === chargerId && wo.faultCode === faultCode && wo.isOpen) return wo;
    }
    return undefined;
  }

  async save(workOrder: WorkOrder): Promise<void> {
    this.byId.set(workOrder.workOrderId, workOrder);
  }

  all(): WorkOrder[] {
    return [...this.byId.values()];
  }
}

// Dispatch stub (Sprint 2 backlog: a real Dispatch context with routes, SLA, spare parts).
export class StubDispatchService implements DispatchService {
  private readonly technicianId: string;
  constructor(technicianId = 'TECH-HAO') {
    this.technicianId = technicianId;
  }
  async requestTechnician(): Promise<string> {
    return this.technicianId;
  }
}
