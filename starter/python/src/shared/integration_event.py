"""The envelope every cross-context event travels in (curriculum §1.8)."""
from dataclasses import dataclass, field
from typing import Any

from shared.ids import new_id


@dataclass(frozen=True)
class IntegrationEvent:
    type: str  # e.g. "charging.session.started.v1" (version suffix included)
    producer: str  # bounded context name: charging | assetops | parking | billing
    occurred_at: str  # when the fact happened (domain time), not when it was published
    correlation_id: str  # same for the whole business flow (one afternoon at CP-A12-2)
    causation_id: str  # the message that directly caused this one
    payload: dict[str, Any]  # contract fields, camelCase as in contracts/*.schema.json
    version: int = 1
    event_id: str = field(default_factory=new_id)  # uuid, also the Outbox row id

    def to_json(self) -> dict[str, Any]:
        """The wire shape (camelCase keys), identical to the Node solution and contracts/."""
        return {
            "eventId": self.event_id,
            "type": self.type,
            "version": self.version,
            "occurredAt": self.occurred_at,
            "producer": self.producer,
            "correlationId": self.correlation_id,
            "causationId": self.causation_id,
            "payload": self.payload,
        }
