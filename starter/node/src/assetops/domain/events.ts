import type { DomainEvent } from '../../shared/DomainEvent.ts';

export interface WorkOrderOpened extends DomainEvent {
  type: 'WorkOrderOpened';
  workOrderId: string;
  chargerId: string;
  connectorId?: string;
  faultCode: string;
}

// R5: a repeated report while the WO is open is attached, it does not open a second WO.
export interface DuplicateFaultReported extends DomainEvent {
  type: 'DuplicateFaultReported';
  workOrderId: string;
  chargerId: string;
  faultCode: string;
}

export interface TechnicianAssigned extends DomainEvent {
  type: 'TechnicianAssigned';
  workOrderId: string;
  technicianId: string;
}

export interface WorkOrderClosed extends DomainEvent {
  type: 'WorkOrderClosed';
  workOrderId: string;
  chargerId: string;
  outcome: string; // "Repaired" | "ReplacedConnector" | "NoFaultFound" ...
}

export type WorkOrderEvent = WorkOrderOpened | DuplicateFaultReported | TechnicianAssigned | WorkOrderClosed;
