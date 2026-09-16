import pytest

from shared.event_bus import InMemoryEventBus
from shared.integration_event import IntegrationEvent


def test_delivers_to_subscribers_and_can_redeliver_at_least_once():
    bus = InMemoryEventBus()
    seen: list[str] = []
    bus.subscribe("charging.session.started.v1", lambda e: seen.append(e.event_id))

    event = IntegrationEvent(
        type="charging.session.started.v1",
        producer="charging",
        occurred_at="2025-05-20T14:04:00+08:00",
        correlation_id="corr-1",
        causation_id="corr-1",
        payload={"sessionId": "S-991", "connectorId": "CP-A12-2", "idTag": "TAG-MONTHLY-77", "startedAt": "2025-05-20T14:04:00+08:00"},
    )
    bus.publish(event)
    bus.redeliver(event.event_id)

    assert seen == [event.event_id, event.event_id]  # same message twice: consumers must cope
    assert len(bus.delivered) == 2
    with pytest.raises(KeyError, match="unknown event_id"):
        bus.redeliver("nope")
