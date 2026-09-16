"""R8: the ONLY component that moves events from the Outbox to the bus.

Runs after the unit of work committed (Day 6: a polling loop; here: called explicitly).
If publish raises we do not mark the row, so it is retried -> at-least-once.
"""
from shared.event_bus import InMemoryEventBus
from shared.outbox import Outbox


class OutboxRelay:
    def __init__(self, outbox: Outbox, bus: InMemoryEventBus) -> None:
        self._outbox = outbox
        self._bus = bus

    def publish_pending(self) -> int:
        events = self._outbox.pending()
        for event in events:
            self._bus.publish(event)
            self._outbox.mark_published(event.event_id)
        return len(events)
