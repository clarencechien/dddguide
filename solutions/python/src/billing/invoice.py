"""R7: once issued, the amount never changes in place. Corrections are new facts (InvoiceAdjusted)."""
from dataclasses import dataclass, field
from typing import Union

from shared.domain_event import DomainEvent


@dataclass(frozen=True)
class InvoiceIssued(DomainEvent):
    invoice_id: str
    session_id: str
    amount: float
    type: str = field(default="InvoiceIssued", init=False)


@dataclass(frozen=True)
class InvoiceAdjusted(DomainEvent):
    invoice_id: str
    delta: float
    reason: str
    type: str = field(default="InvoiceAdjusted", init=False)


InvoiceEvent = Union[InvoiceIssued, InvoiceAdjusted]


class Invoice:
    def __init__(self, invoice_id: str, session_id: str, amount: float) -> None:
        self.invoice_id = invoice_id
        self.session_id = session_id
        self._amount = amount  # private + read-only property: the issued amount is history
        self._adjustments: list[tuple[float, str]] = []
        self._events: list[InvoiceEvent] = []

    @classmethod
    def issue(cls, invoice_id: str, session_id: str, amount: float, at: str) -> "Invoice":
        invoice = cls(invoice_id, session_id, amount)
        invoice._events.append(InvoiceIssued(occurred_at=at, invoice_id=invoice_id, session_id=session_id, amount=amount))
        return invoice

    @property
    def amount(self) -> float:
        return self._amount

    @property
    def total(self) -> float:
        return self._amount + sum(delta for delta, _ in self._adjustments)

    def adjust(self, delta: float, reason: str, at: str) -> None:
        if not reason.strip():
            raise ValueError("An adjustment needs a reason")
        self._adjustments.append((delta, reason))
        self._events.append(InvoiceAdjusted(occurred_at=at, invoice_id=self.invoice_id, delta=delta, reason=reason))

    def pull_events(self) -> list[InvoiceEvent]:
        pulled, self._events = self._events, []
        return pulled
