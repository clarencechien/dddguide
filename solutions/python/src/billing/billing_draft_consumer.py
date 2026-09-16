"""Minimal Billing consumer (customer of Charging). It never calls back into Charging.
Idempotent: the dedup key is sessionId (§1.8), so a redelivered event changes nothing."""
from dataclasses import dataclass

from shared.event_bus import InMemoryEventBus
from shared.ids import IdGenerator, sequence
from shared.integration_event import IntegrationEvent


@dataclass
class DraftInvoice:
    invoice_id: str  # INV-778
    session_id: str  # S-991 — the dedup key
    connector_id: str
    id_tag: str | None = None
    energy_wh: int = 0
    amount: float = 0.0  # TWD, computed from energy; parking fee merge is Sprint 2
    status: str = "Draft"


class BillingDraftConsumer:
    def __init__(self, rate_per_kwh: float = 8, next_invoice_id: IdGenerator | None = None) -> None:
        self._rate_per_kwh = rate_per_kwh
        self._next_invoice_id = next_invoice_id or sequence("INV-", 778)
        self._drafts: dict[str, DraftInvoice] = {}

    def subscribe(self, bus: InMemoryEventBus) -> None:
        bus.subscribe("charging.session.started.v1", self.on_session_started)
        bus.subscribe("charging.session.completed.v1", self.on_session_completed)

    def on_session_started(self, event: IntegrationEvent) -> None:
        p = event.payload
        if p["sessionId"] in self._drafts:
            return  # duplicate delivery
        self._drafts[p["sessionId"]] = DraftInvoice(self._next_invoice_id(), p["sessionId"], p["connectorId"], p.get("idTag"))

    def on_session_completed(self, event: IntegrationEvent) -> None:
        p = event.payload
        draft = self._drafts.get(p["sessionId"])
        if draft is None:
            # "completed" may arrive before "started" (no cross-type ordering): still one draft per session.
            draft = DraftInvoice(self._next_invoice_id(), p["sessionId"], p["connectorId"])
            self._drafts[p["sessionId"]] = draft
        # Same input -> same result: applying this twice is harmless.
        draft.energy_wh = p["energyWh"]
        draft.amount = round(p["energyWh"] / 1000 * self._rate_per_kwh, 2)

    def draft_for(self, session_id: str) -> DraftInvoice | None:
        return self._drafts.get(session_id)

    def all(self) -> list[DraftInvoice]:
        return list(self._drafts.values())
