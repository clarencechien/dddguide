import { WorkOrder } from '../domain/WorkOrder.ts';
import type { WorkOrderEvent } from '../domain/events.ts';
import type { DispatchService, WorkOrderRepository } from './ports.ts';
import type { Outbox } from '../../shared/Outbox.ts';
import type { InMemoryEventBus } from '../../shared/EventBus.ts';
import { createIntegrationEvent, type IntegrationEvent } from '../../shared/IntegrationEvent.ts';
import type { IdGenerator } from '../../shared/Ids.ts';

const PRODUCER = 'assetops';

interface FaultedPayload {
  chargerId: string;
  connectorId?: string;
  faultCode: string;
  stillEnergized: boolean;
  occurredAt: string;
}

// Process manager for the fault lifecycle (§1.2): report -> open WO -> dispatch -> repair verified -> sellable again.
// It reacts to integration events (Charging is upstream; AssetOps conforms to ChargerFaulted),
// drives the WorkOrder aggregate, and writes its own outbox. Idempotent on chargerId+faultCode (R5).
export class FaultProcessManager {
  private readonly workOrders: WorkOrderRepository;
  private readonly dispatch: DispatchService;
  private readonly outbox: Outbox;
  private readonly nextWorkOrderId: IdGenerator;

  constructor(workOrders: WorkOrderRepository, dispatch: DispatchService, outbox: Outbox, nextWorkOrderId: IdGenerator) {
    this.workOrders = workOrders;
    this.dispatch = dispatch;
    this.outbox = outbox;
    this.nextWorkOrderId = nextWorkOrderId;
  }

  subscribe(bus: InMemoryEventBus): void {
    bus.subscribe('charging.charger.faulted.v1', async (e) => {
      await this.onChargerFaulted(e as unknown as IntegrationEvent<FaultedPayload>);
    });
  }

  async onChargerFaulted(event: IntegrationEvent<FaultedPayload>): Promise<WorkOrder> {
    const { chargerId, connectorId, faultCode, occurredAt } = event.payload;
    const ids = { correlationId: event.correlationId, causationId: event.eventId };

    const existing = await this.workOrders.findOpenByFault(chargerId, faultCode);
    if (existing) {
      // R5 (and redelivery safety): same charger + fault code while open -> attach, no second WO.
      existing.appendDuplicateReport(occurredAt);
      await this.commit(existing, ids);
      return existing;
    }

    const wo = WorkOrder.open({ workOrderId: this.nextWorkOrderId(), chargerId, connectorId, faultCode, at: occurredAt });
    await this.commit(wo, ids);

    // Dispatch is a stub in MVP1; a real one would answer asynchronously with its own event.
    const technicianId = await this.dispatch.requestTechnician(wo.workOrderId, chargerId);
    wo.assign(technicianId, occurredAt);
    await this.commit(wo, ids);
    return wo;
  }

  // Called when the technician reports "repair verified" (Day 6: an HTTP endpoint).
  async closeWorkOrder(workOrderId: string, outcome: string, at: string, correlationId?: string): Promise<WorkOrder> {
    const wo = await this.workOrders.findById(workOrderId);
    if (!wo) throw new Error(`Unknown work order ${workOrderId}`);
    wo.close(outcome, at);
    await this.commit(wo, { correlationId: correlationId ?? workOrderId, causationId: workOrderId });
    return wo;
  }

  private async commit(wo: WorkOrder, ids: { correlationId: string; causationId: string }): Promise<void> {
    await this.workOrders.save(wo);
    for (const event of wo.pullEvents()) {
      const integration = toIntegrationEvent(event, wo, ids);
      if (integration) await this.outbox.add(integration);
    }
  }
}

function toIntegrationEvent(
  event: WorkOrderEvent,
  wo: WorkOrder,
  ids: { correlationId: string; causationId: string },
): IntegrationEvent | undefined {
  switch (event.type) {
    case 'WorkOrderOpened':
      return createIntegrationEvent({
        type: 'ops.work_order.opened.v1',
        producer: PRODUCER,
        occurredAt: event.occurredAt,
        ...ids,
        payload: { workOrderId: wo.workOrderId, chargerId: wo.chargerId, faultCode: wo.faultCode, openedAt: event.occurredAt },
      });
    case 'WorkOrderClosed':
      return createIntegrationEvent({
        type: 'ops.work_order.closed.v1',
        producer: PRODUCER,
        occurredAt: event.occurredAt,
        ...ids,
        payload: { workOrderId: wo.workOrderId, chargerId: wo.chargerId, closedAt: event.occurredAt, outcome: event.outcome },
      });
    default:
      return undefined; // DuplicateFaultReported / TechnicianAssigned stay inside AssetOps
  }
}
