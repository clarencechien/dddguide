import re

from app import build_app
from charging.application.commands import ReportFault, ReportMeterValue, StartCharging, StopCharging
from charging.domain.charging_session import SessionStatus
from charging.domain.events import ChargingStartRejected

T_1404 = "2025-05-20T14:04:00+08:00"
T_1431 = "2025-05-20T14:31:00+08:00"


def start_s991(app, correlation_id=None):
    return app.charging.start_charging(StartCharging("S-991", "CP-A12-2", "TAG-MONTHLY-77", 0, T_1404, correlation_id=correlation_id))


def test_R8_aggregate_never_publishes_directly_events_reach_the_bus_only_through_the_outbox_relay():
    app = build_app()

    start_s991(app)

    assert app.bus.delivered == []  # nothing on the bus yet
    assert [e.type for e in app.charging_outbox.pending()] == ["charging.session.started.v1"]

    app.relay_all()
    assert len(app.bus.delivered_of_type("charging.session.started.v1")) == 1
    assert app.charging_outbox.pending() == []

    app.relay_all()  # relaying again publishes nothing new
    assert len(app.bus.delivered) == 1


def test_writes_the_integration_envelope_with_all_required_fields():
    app = build_app()
    start_s991(app, correlation_id="corr-afternoon")

    event = app.charging_outbox.pending()[0].to_json()
    assert re.fullmatch(r"[0-9a-f-]{36}", event.pop("eventId"))
    assert event == {
        "type": "charging.session.started.v1",
        "version": 1,
        "occurredAt": T_1404,
        "producer": "charging",
        "correlationId": "corr-afternoon",
        "causationId": "corr-afternoon",
        "payload": {"sessionId": "S-991", "connectorId": "CP-A12-2", "idTag": "TAG-MONTHLY-77", "startedAt": T_1404},
    }


def test_R1_through_the_service_second_start_on_CP_A12_2_is_rejected_and_not_persisted():
    app = build_app(valid_tags=["TAG-MONTHLY-77", "TAG-VISITOR-01"])
    start_s991(app)

    events = app.charging.start_charging(StartCharging("S-992", "CP-A12-2", "TAG-VISITOR-01", 0, T_1404))

    assert isinstance(events[0], ChargingStartRejected) and events[0].reason == "ConnectorOccupied"
    assert app.sessions.find_by_id("S-992") is None
    assert app.sessions.find_by_id("S-991").status is SessionStatus.CHARGING


def test_R2_through_the_service_unknown_id_tag_is_rejected_by_the_authorization_port():
    app = build_app()
    events = app.charging.start_charging(StartCharging("S-991", "CP-A12-2", "TAG-UNKNOWN", 0, T_1404))
    assert isinstance(events[0], ChargingStartRejected) and events[0].reason == "Unauthorized"


def test_R4_through_the_service_completed_event_carries_energy_wh_12400():
    app = build_app()
    start_s991(app)
    app.charging.report_meter_value(ReportMeterValue("S-991", 12400, T_1431))
    app.charging.stop_charging(StopCharging("S-991", "Local", T_1431))

    pending = app.charging_outbox.pending()
    assert [e.type for e in pending] == ["charging.session.started.v1", "charging.session.completed.v1"]
    assert pending[1].payload == {"sessionId": "S-991", "connectorId": "CP-A12-2", "energyWh": 12400, "startedAt": T_1404, "endedAt": T_1431, "stopReason": "Local"}


def test_fault_on_idle_connector_is_still_published_still_energized_false_no_session_persisted():
    app = build_app()
    app.charging.report_fault(ReportFault(charger_id="CP-A12", connector_id="CP-A12-2", fault_code="GroundFailure", at="2025-05-20T18:10:00+08:00"))
    event = app.charging_outbox.pending()[0]
    assert event.type == "charging.charger.faulted.v1"
    assert event.payload == {"chargerId": "CP-A12", "connectorId": "CP-A12-2", "faultCode": "GroundFailure", "stillEnergized": False, "occurredAt": "2025-05-20T18:10:00+08:00"}
    assert app.sessions.all() == []
