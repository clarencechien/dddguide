"""Stand-in for a real broker (Kafka / RabbitMQ / SNS). Semantics we keep on purpose:

- at-least-once: the same event CAN be delivered again (`redeliver`), so every consumer must be
  idempotent (Billing dedups on sessionId, AssetOps on chargerId+faultCode).
- no ordering guarantee across types is promised, even though this in-memory version is FIFO.
"""
from collections import defaultdict
from typing import Callable

from shared.integration_event import IntegrationEvent

EventHandler = Callable[[IntegrationEvent], None]


class InMemoryEventBus:
    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)
        self.delivered: list[IntegrationEvent] = []  # audit log, handy in tests

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        self._handlers[event_type].append(handler)

    def publish(self, event: IntegrationEvent) -> None:
        self.delivered.append(event)
        for handler in self._handlers.get(event.type, []):
            handler(event)

    def redeliver(self, event_id: str) -> None:
        """Simulates the broker re-sending an already delivered message (consumer crashed before
        ack, network retry, relay restarted...). Use it in idempotency tests."""
        event = next((e for e in self.delivered if e.event_id == event_id), None)
        if event is None:
            raise KeyError(f"redeliver: unknown event_id {event_id}")
        self.publish(event)

    def delivered_of_type(self, event_type: str) -> list[IntegrationEvent]:
        return [e for e in self.delivered if e.type == event_type]
