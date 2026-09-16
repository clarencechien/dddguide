"""Day 5 B2: the smallest possible Billing consumer.

It subscribes to charging.session.started.v1 / charging.session.completed.v1 and keeps ONE draft per
sessionId, no matter how many times the bus redelivers the same event (at-least-once).
It never calls back into Charging (customer-supplier: Billing is downstream).
"""
from dataclasses import dataclass

from shared.event_bus import InMemoryEventBus
from shared.integration_event import IntegrationEvent


@dataclass
class DraftInvoice:
    invoice_id: str  # INV-778
    session_id: str  # S-991 — the dedup key (§1.8)
    connector_id: str
    energy_wh: int = 0
    amount: float = 0.0
    status: str = "Draft"


class BillingDraftConsumer:
    def __init__(self) -> None:
        self._drafts: dict[str, DraftInvoice] = {}

    def subscribe(self, bus: InMemoryEventBus) -> None:
        raise NotImplementedError("TODO Day 5 B2: subscribe to started/completed")

    def on_session_started(self, event: IntegrationEvent) -> None:
        raise NotImplementedError("TODO Day 5 B2: create draft once per sessionId")

    def on_session_completed(self, event: IntegrationEvent) -> None:
        raise NotImplementedError("TODO Day 5 B2: set energy_wh/amount; idempotent")

    def draft_for(self, session_id: str) -> DraftInvoice | None:
        return self._drafts.get(session_id)

    def all(self) -> list[DraftInvoice]:
        return list(self._drafts.values())
