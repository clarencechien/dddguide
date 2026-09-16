import type { WorkOrderEvent } from './events.ts';

export const WorkOrderStatus = { Open: 'Open', Assigned: 'Assigned', Closed: 'Closed' } as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

// Aggregate root of AssetOps: HQ's promise to fix one root cause on one charger.
// Invariant (R5): one open root-cause WO per (chargerId, faultCode) — enforced by whoever
// opens WOs (FaultProcessManager + repository lookup), recorded here as duplicate reports.
export class WorkOrder {
  private events: WorkOrderEvent[] = [];
  private _status: WorkOrderStatus = WorkOrderStatus.Open;
  private _technicianId?: string;
  private _outcome?: string;
  readonly reports: string[] = []; // occurredAt of every report, first one included

  readonly workOrderId: string;
  readonly chargerId: string;
  readonly faultCode: string;
  readonly connectorId: string | undefined;
  readonly openedAt: string;

  private constructor(workOrderId: string, chargerId: string, faultCode: string, connectorId: string | undefined, openedAt: string) {
    this.workOrderId = workOrderId;
    this.chargerId = chargerId;
    this.faultCode = faultCode;
    this.connectorId = connectorId;
    this.openedAt = openedAt;
  }

  static open(input: { workOrderId: string; chargerId: string; connectorId?: string; faultCode: string; at: string }): WorkOrder {
    const wo = new WorkOrder(input.workOrderId, input.chargerId, input.faultCode, input.connectorId, input.at);
    wo.reports.push(input.at);
    wo.record({
      type: 'WorkOrderOpened',
      workOrderId: wo.workOrderId,
      chargerId: wo.chargerId,
      ...(input.connectorId ? { connectorId: input.connectorId } : {}),
      faultCode: wo.faultCode,
      occurredAt: input.at,
    });
    return wo;
  }

  get status(): WorkOrderStatus {
    return this._status;
  }
  get technicianId(): string | undefined {
    return this._technicianId;
  }
  get outcome(): string | undefined {
    return this._outcome;
  }
  get isOpen(): boolean {
    return this._status !== WorkOrderStatus.Closed;
  }
  get duplicateReportCount(): number {
    return this.reports.length - 1;
  }

  // R5
  appendDuplicateReport(at: string): void {
    if (!this.isOpen) throw new Error(`Cannot append report: work order ${this.workOrderId} is closed`);
    this.reports.push(at);
    this.record({
      type: 'DuplicateFaultReported',
      workOrderId: this.workOrderId,
      chargerId: this.chargerId,
      faultCode: this.faultCode,
      occurredAt: at,
    });
  }

  assign(technicianId: string, at: string): void {
    if (!this.isOpen) throw new Error(`Cannot assign: work order ${this.workOrderId} is closed`);
    this._technicianId = technicianId;
    this._status = WorkOrderStatus.Assigned;
    this.record({ type: 'TechnicianAssigned', workOrderId: this.workOrderId, technicianId, occurredAt: at });
  }

  close(outcome: string, at: string): void {
    if (!this.isOpen) throw new Error(`Work order ${this.workOrderId} is already closed`);
    this._status = WorkOrderStatus.Closed;
    this._outcome = outcome;
    this.record({ type: 'WorkOrderClosed', workOrderId: this.workOrderId, chargerId: this.chargerId, outcome, occurredAt: at });
  }

  pullEvents(): WorkOrderEvent[] {
    const pulled = this.events;
    this.events = [];
    return pulled;
  }

  private record(event: WorkOrderEvent): void {
    this.events.push(event);
  }
}
