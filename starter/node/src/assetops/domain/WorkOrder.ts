import type { WorkOrderEvent } from './events.ts';

// Day 4 B3: aggregate root of AssetOps — HQ's promise to fix one root cause on one charger.
// Invariant (R5): one open root-cause WO per (chargerId, faultCode).
// The lookup "is there already an open WO for this fault?" needs the repository, so it happens
// outside the aggregate (Day 5 B3 process manager); the aggregate records appendDuplicateReport().
export const WorkOrderStatus = { Open: 'Open', Assigned: 'Assigned', Closed: 'Closed' } as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export class WorkOrder {
  readonly workOrderId: string; // WO-2208
  readonly chargerId: string; // CP-A12
  readonly faultCode: string; // GroundFailure
  readonly connectorId: string | undefined; // CP-A12-2 (undefined = whole charger)
  readonly openedAt: string;
  readonly reports: string[] = []; // occurredAt of every report, first one included
  private _status: WorkOrderStatus = WorkOrderStatus.Open;
  private _technicianId?: string;
  private _outcome?: string;
  private events: WorkOrderEvent[] = [];

  private constructor(workOrderId: string, chargerId: string, faultCode: string, connectorId: string | undefined, openedAt: string) {
    this.workOrderId = workOrderId;
    this.chargerId = chargerId;
    this.faultCode = faultCode;
    this.connectorId = connectorId;
    this.openedAt = openedAt;
  }

  // Record the first report and a WorkOrderOpened event.
  static open(input: { workOrderId: string; chargerId: string; connectorId?: string; faultCode: string; at: string }): WorkOrder {
    throw new Error('TODO R5: WorkOrder.open');
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

  // R5: only while open; push to reports, record DuplicateFaultReported.
  appendDuplicateReport(at: string): void {
    throw new Error('TODO R5: appendDuplicateReport');
  }

  assign(technicianId: string, at: string): void {
    throw new Error('TODO Day 5 B3: assign');
  }

  close(outcome: string, at: string): void {
    throw new Error('TODO Day 5 B3: close');
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
