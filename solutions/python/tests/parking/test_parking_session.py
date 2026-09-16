from parking.parking_session import ParkingManuallyReleased, ParkingSession, VehicleExited


def test_R6_manual_release_works_without_HQ_and_publishes_ParkingManuallyReleased():
    parking = ParkingSession("P-441", "ABC-1234", "2025-05-20T14:02:00+08:00")

    parking.manual_release("阿忠", "2025-05-20T14:33:00+08:00")

    assert parking.status == "Released"
    assert parking.pull_events() == [
        ParkingManuallyReleased(occurred_at="2025-05-20T14:33:00+08:00", parking_session_id="P-441", plate="ABC-1234", released_by="阿忠"),
        VehicleExited(occurred_at="2025-05-20T14:33:00+08:00", parking_session_id="P-441", plate="ABC-1234", release_mode="Manual"),
    ]
