"""Port (R8): the application service writes the aggregate AND its integration events through
this port inside one unit of work. Nothing here talks to a broker."""
from datetime import datetime, timezone
from typing import Protocol

from shared.integration_event import IntegrationEvent


class Outbox(Protocol):
    def add(self, event: IntegrationEvent) -> None: ...
    def pending(self) -> list[IntegrationEvent]: ...
    def mark_published(self, event_id: str) -> None: ...


class InMemoryOutbox:
    def __init__(self) -> None:
        self._rows: dict[str, tuple[IntegrationEvent, str | None]] = {}

    def add(self, event: IntegrationEvent) -> None:
        self._rows[event.event_id] = (event, None)

    def pending(self) -> list[IntegrationEvent]:
        return [event for event, published_at in self._rows.values() if published_at is None]

    def mark_published(self, event_id: str) -> None:
        if event_id in self._rows:
            event, _ = self._rows[event_id]
            self._rows[event_id] = (event, datetime.now(timezone.utc).isoformat())

    def all(self) -> list[IntegrationEvent]:
        """Test helper: everything ever written, published or not."""
        return [event for event, _ in self._rows.values()]
