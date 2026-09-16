import type { WorkOrder } from '../domain/WorkOrder.ts';

export interface WorkOrderRepository {
  findById(workOrderId: string): Promise<WorkOrder | undefined>;
  findOpenByFault(chargerId: string, faultCode: string): Promise<WorkOrder | undefined>; // R5 lookup
  save(workOrder: WorkOrder): Promise<void>;
}

// Dispatch is its own context; in MVP1 it is a stub that always sends TECH-HAO.
export interface DispatchService {
  requestTechnician(workOrderId: string, chargerId: string): Promise<string>; // returns technicianId
}
