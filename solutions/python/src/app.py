"""Composition root: the only place that knows about concrete adapters.
Each context owns its outbox; one in-memory bus stands in for the broker."""
from dataclasses import dataclass

from adapters.ocpp.ocpp_acl import OcppAcl
from adapters.persistence.in_memory_authorization_service import InMemoryAuthorizationService
from adapters.persistence.in_memory_charging_session_repository import InMemoryChargingSessionRepository
from adapters.persistence.in_memory_work_order_repository import InMemoryWorkOrderRepository, StubDispatchService
from assetops.application.fault_process_manager import FaultProcessManager
from billing.billing_draft_consumer import BillingDraftConsumer
from charging.application.charging_service import ChargingService
from shared.event_bus import InMemoryEventBus
from shared.ids import sequence
from shared.outbox import InMemoryOutbox
from shared.outbox_relay import OutboxRelay


@dataclass
class App:
    bus: InMemoryEventBus
    sessions: InMemoryChargingSessionRepository
    charging: ChargingService
    acl: OcppAcl
    work_orders: InMemoryWorkOrderRepository
    faults: FaultProcessManager
    billing: BillingDraftConsumer
    charging_outbox: InMemoryOutbox
    ops_outbox: InMemoryOutbox
    relays: list[OutboxRelay]

    def relay_all(self) -> None:
        """Drain every outbox until nothing is left (a published event may produce new outbox rows)."""
        moved = 1
        while moved:
            moved = sum(relay.publish_pending() for relay in self.relays)


def build_app(charger_id: str = "CP-A12", valid_tags: list[str] | None = None) -> App:
    bus = InMemoryEventBus()

    # Charging context
    sessions = InMemoryChargingSessionRepository()
    authorization = InMemoryAuthorizationService(valid_tags)
    charging_outbox = InMemoryOutbox()
    charging = ChargingService(sessions, authorization, charging_outbox)
    acl = OcppAcl(charger_id, charging, authorization)

    # AssetOps context
    work_orders = InMemoryWorkOrderRepository()
    ops_outbox = InMemoryOutbox()
    faults = FaultProcessManager(work_orders, StubDispatchService(), ops_outbox, sequence("WO-", 2208))
    faults.subscribe(bus)

    # Billing context (consumer only)
    billing = BillingDraftConsumer()
    billing.subscribe(bus)

    relays = [OutboxRelay(charging_outbox, bus), OutboxRelay(ops_outbox, bus)]
    return App(bus, sessions, charging, acl, work_orders, faults, billing, charging_outbox, ops_outbox, relays)


if __name__ == "__main__":
    print("EV Charge Ops in-memory stack ready:", ", ".join(build_app().__dict__.keys()))
