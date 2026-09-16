"""Process manager for the fault lifecycle (§1.2): report -> open WO -> dispatch -> repair verified -> sellable again.

It reacts to integration events (Charging is upstream; AssetOps conforms to ChargerFaulted),
drives the WorkOrder aggregate, and writes its own outbox. Idempotent on charger_id + fault_code (R5).
"""
from assetops.application.ports import DispatchService, WorkOrderRepository
from assetops.domain.events import WorkOrderClosed, WorkOrderEvent, WorkOrderOpened
from assetops.domain.work_order import WorkOrder
from shared.event_bus import InMemoryEventBus
from shared.ids import IdGenerator
from shared.integration_event import IntegrationEvent
from shared.outbox import Outbox

PRODUCER = "assetops"


class FaultProcessManager:
    def __init__(self, work_orders: WorkOrderRepository, dispatch: DispatchService, outbox: Outbox, next_work_order_id: IdGenerator) -> None:
        self._work_orders = work_orders
        self._dispatch = dispatch
        self._outbox = outbox
        self._next_work_order_id = next_work_order_id
        # Technical idempotency: the broker may deliver the SAME event_id twice (at-least-once).
        # That is different from R5, where two DIFFERENT reports of the same fault arrive.
        # Day 6: this set becomes a processed_events table written in the same transaction.
        self._processed_event_ids: set[str] = set()

    def subscribe(self, bus: InMemoryEventBus) -> None:
        bus.subscribe("charging.charger.faulted.v1", self.on_charger_faulted)

    def on_charger_faulted(self, event: IntegrationEvent) -> WorkOrder | None:
        if event.event_id in self._processed_event_ids:
            return None  # redelivery: already handled
        self._processed_event_ids.add(event.event_id)
        p = event.payload
        charger_id, fault_code, occurred_at = p["chargerId"], p["faultCode"], p["occurredAt"]
        ids = (event.correlation_id, event.event_id)

        existing = self._work_orders.find_open_by_fault(charger_id, fault_code)
        if existing:
            # R5 (and redelivery safety): same charger + fault code while open -> attach, no second WO.
            existing.append_duplicate_report(occurred_at)
            self._commit(existing, *ids)
            return existing

        wo = WorkOrder.open(work_order_id=self._next_work_order_id(), charger_id=charger_id, fault_code=fault_code, connector_id=p.get("connectorId"), at=occurred_at)
        self._commit(wo, *ids)

        # Dispatch is a stub in MVP1; a real one would answer asynchronously with its own event.
        technician_id = self._dispatch.request_technician(wo.work_order_id, charger_id)
        wo.assign(technician_id, occurred_at)
        self._commit(wo, *ids)
        return wo

    def close_work_order(self, work_order_id: str, outcome: str, at: str, correlation_id: str | None = None) -> WorkOrder:
        """Called when the technician reports "repair verified" (Day 6: an HTTP endpoint)."""
        wo = self._work_orders.find_by_id(work_order_id)
        if wo is None:
            raise KeyError(f"Unknown work order {work_order_id}")
        wo.close(outcome, at)
        self._commit(wo, correlation_id or work_order_id, work_order_id)
        return wo

    def _commit(self, wo: WorkOrder, correlation_id: str, causation_id: str) -> None:
        self._work_orders.save(wo)
        for event in wo.pull_events():
            integration = _to_integration_event(event, wo, correlation_id, causation_id)
            if integration:
                self._outbox.add(integration)


def _to_integration_event(event: WorkOrderEvent, wo: WorkOrder, correlation_id: str, causation_id: str) -> IntegrationEvent | None:
    common = dict(producer=PRODUCER, occurred_at=event.occurred_at, correlation_id=correlation_id, causation_id=causation_id)
    if isinstance(event, WorkOrderOpened):
        return IntegrationEvent(
            type="ops.work_order.opened.v1",
            payload={"workOrderId": wo.work_order_id, "chargerId": wo.charger_id, "faultCode": wo.fault_code, "openedAt": event.occurred_at},
            **common,
        )
    if isinstance(event, WorkOrderClosed):
        return IntegrationEvent(
            type="ops.work_order.closed.v1",
            payload={"workOrderId": wo.work_order_id, "chargerId": wo.charger_id, "closedAt": event.occurred_at, "outcome": event.outcome},
            **common,
        )
    return None  # DuplicateFaultReported / TechnicianAssigned stay inside AssetOps
