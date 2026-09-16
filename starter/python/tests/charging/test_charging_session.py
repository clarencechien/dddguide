import pytest

from charging.domain.charging_session import ChargingSession, SessionStatus
from charging.domain.events import ChargingStartRejected

# Canonical afternoon at SITE-TPE-01 (curriculum §1.6): CP-A12-2, TAG-MONTHLY-77, S-991, 12.4 kWh.
T_1404 = "2025-05-20T14:04:00+08:00"
T_1413 = "2025-05-20T14:13:00+08:00"


# Your first red. Make it green with the smallest change, then refactor, then un-skip R2.
def test_R1_occupied_connector_rejects_a_second_start():
    session = ChargingSession.idle("CP-A12-2")
    session.start(session_id="S-991", id_tag="TAG-MONTHLY-77", authorized=True, meter_start_wh=100, at=T_1404)
    session.pull_events()

    session.start(session_id="S-992", id_tag="TAG-VISITOR-01", authorized=True, meter_start_wh=4100, at=T_1413)

    assert session.pull_events() == [
        ChargingStartRejected(occurred_at=T_1413, connector_id="CP-A12-2", id_tag="TAG-VISITOR-01", reason="ConnectorOccupied")
    ]
    # the original session is unchanged
    assert session.session_id == "S-991"
    assert session.id_tag == "TAG-MONTHLY-77"
    assert session.status is SessionStatus.CHARGING


# R2: Given an Idle connector, When start with authorized=False,
#     Then ChargingStartRejected(reason="Unauthorized") and status stays IDLE.
#     Also write the happy path: authorized=True -> ChargingStarted with meter_start_wh.
@pytest.mark.skip(reason="TODO R2")
def test_R2_unauthorized_id_tag_cannot_start_charging():
    pass


# R3: Given Charging with last_meter_wh=4100, When report_meter(3900),
#     Then MeterValueRejected(reason="NotMonotonic", meter_wh=3900, last_meter_wh=4100) and last_meter_wh stays 4100.
#     Then report_meter(8100) -> EnergyMetered and last_meter_wh == 8100.
@pytest.mark.skip(reason="TODO R3")
def test_R3_meter_values_must_be_monotonic_backwards_value_is_rejected_and_recorded():
    pass


# R4: Given start at meter 100, readings 4100 / 8100 / 12500, When stop("Local", 14:31),
#     Then ChargingCompleted(energy_wh=12400, started_at=14:04, ended_at=14:31, stop_reason="Local"), status COMPLETED.
#     And: stop() on an Idle or Completed session raises InvalidStateError.
@pytest.mark.skip(reason="TODO R4")
def test_R4_stop_completes_the_session_with_energy_wh_last_minus_start_12_4_kwh():
    pass
