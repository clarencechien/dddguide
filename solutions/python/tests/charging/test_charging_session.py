import pytest

from charging.domain.charging_session import ChargingSession, SessionStatus
from charging.domain.errors import InvalidStateError
from charging.domain.events import ChargerFaulted, ChargingCompleted, ChargingStarted, ChargingStartRejected, MeterValueRejected

# Canonical afternoon at SITE-TPE-01 (curriculum §1.6): CP-A12-2, TAG-MONTHLY-77, S-991, 12.4 kWh.
T_1404 = "2025-05-20T14:04:00+08:00"
T_1413 = "2025-05-20T14:13:00+08:00"
T_1422 = "2025-05-20T14:22:00+08:00"
T_1431 = "2025-05-20T14:31:00+08:00"


def charging_session() -> ChargingSession:
    session = ChargingSession.idle("CP-A12-2")
    session.start(session_id="S-991", id_tag="TAG-MONTHLY-77", authorized=True, meter_start_wh=100, at=T_1404)
    session.pull_events()
    return session


def test_R1_occupied_connector_rejects_a_second_start():
    session = charging_session()

    session.start(session_id="S-992", id_tag="TAG-VISITOR-01", authorized=True, meter_start_wh=4100, at=T_1413)

    assert session.pull_events() == [
        ChargingStartRejected(occurred_at=T_1413, connector_id="CP-A12-2", id_tag="TAG-VISITOR-01", reason="ConnectorOccupied")
    ]
    # the original session is unchanged
    assert session.session_id == "S-991"
    assert session.id_tag == "TAG-MONTHLY-77"
    assert session.status is SessionStatus.CHARGING


def test_R2_unauthorized_id_tag_cannot_start_charging():
    session = ChargingSession.idle("CP-A12-2")

    session.start(session_id="S-991", id_tag="TAG-EXPIRED-99", authorized=False, meter_start_wh=100, at=T_1404)

    assert session.pull_events() == [
        ChargingStartRejected(occurred_at=T_1404, connector_id="CP-A12-2", id_tag="TAG-EXPIRED-99", reason="Unauthorized")
    ]
    assert session.status is SessionStatus.IDLE


def test_R2_authorized_id_tag_starts_charging_and_records_ChargingStarted():
    session = ChargingSession.idle("CP-A12-2")
    session.start(session_id="S-991", id_tag="TAG-MONTHLY-77", authorized=True, meter_start_wh=100, at=T_1404)

    assert session.pull_events() == [
        ChargingStarted(occurred_at=T_1404, session_id="S-991", connector_id="CP-A12-2", id_tag="TAG-MONTHLY-77", meter_start_wh=100)
    ]
    assert session.status is SessionStatus.CHARGING


def test_R3_meter_values_must_be_monotonic_backwards_value_is_rejected_and_recorded():
    session = charging_session()

    session.report_meter(4100, T_1413)
    session.report_meter(3900, T_1422)  # register went backwards -> reject
    session.report_meter(8100, T_1422)

    events = session.pull_events()
    assert [e.type for e in events] == ["EnergyMetered", "MeterValueRejected", "EnergyMetered"]
    assert events[1] == MeterValueRejected(occurred_at=T_1422, session_id="S-991", connector_id="CP-A12-2", meter_wh=3900, last_meter_wh=4100, reason="NotMonotonic")
    assert session.last_meter_wh == 8100


def test_R3_meter_value_on_a_session_that_is_not_charging_is_rejected():
    session = ChargingSession.idle("CP-A12-2")
    session.report_meter(4100, T_1413)
    event = session.pull_events()[0]
    assert isinstance(event, MeterValueRejected) and event.reason == "NotCharging"


def test_R4_stop_completes_the_session_with_energy_wh_last_minus_start_12_4_kwh():
    session = charging_session()
    session.report_meter(4100, T_1413)
    session.report_meter(8100, T_1422)
    session.report_meter(12500, T_1431)
    session.pull_events()

    session.stop("Local", T_1431)

    assert session.pull_events() == [
        ChargingCompleted(occurred_at=T_1431, session_id="S-991", connector_id="CP-A12-2", energy_wh=12400, started_at=T_1404, ended_at=T_1431, stop_reason="Local")
    ]
    assert session.status is SessionStatus.COMPLETED


def test_R4_only_a_charging_session_can_be_stopped():
    idle = ChargingSession.idle("CP-A12-2")
    with pytest.raises(InvalidStateError):
        idle.stop("Local", T_1431)

    completed = charging_session()
    completed.stop("Local", T_1431)
    with pytest.raises(InvalidStateError, match="Completed"):
        completed.stop("Local", T_1431)


def test_fault_during_charging_marks_session_faulted_and_reports_still_energized():
    session = charging_session()
    session.report_fault("GroundFailure", "2025-05-20T18:10:00+08:00")

    assert session.status is SessionStatus.FAULTED
    assert session.pull_events() == [
        ChargerFaulted(occurred_at="2025-05-20T18:10:00+08:00", charger_id="CP-A12", connector_id="CP-A12-2", fault_code="GroundFailure", still_energized=True)
    ]
