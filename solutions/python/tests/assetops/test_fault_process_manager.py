from app import build_app
from assetops.domain.work_order import WorkOrderStatus
from charging.application.commands import ReportFault

T_1810 = "2025-05-20T18:10:00+08:00"
T_1810_08 = "2025-05-20T18:10:08+08:00"
T_1818 = "2025-05-20T18:18:00+08:00"


def report_ground_failure(app, at):
    app.charging.report_fault(ReportFault(charger_id="CP-A12", connector_id="CP-A12-2", fault_code="GroundFailure", at=at, correlation_id="corr-fault"))
    app.relay_all()


def test_charger_faulted_opens_WO_2208_dispatches_TECH_HAO_and_publishes_work_order_opened():
    app = build_app()
    report_ground_failure(app, T_1810)

    (wo,) = app.work_orders.all()
    assert wo.work_order_id == "WO-2208"
    assert wo.status is WorkOrderStatus.ASSIGNED
    assert wo.technician_id == "TECH-HAO"

    opened = app.bus.delivered_of_type("ops.work_order.opened.v1")
    assert len(opened) == 1
    assert opened[0].payload == {"workOrderId": "WO-2208", "chargerId": "CP-A12", "faultCode": "GroundFailure", "openedAt": T_1810}
    # envelope lineage: same correlation as the fault, caused by the faulted event
    faulted = app.bus.delivered_of_type("charging.charger.faulted.v1")[0]
    assert opened[0].correlation_id == "corr-fault"
    assert opened[0].causation_id == faulted.event_id


def test_R5_second_report_8_seconds_later_is_attached_to_WO_2208_no_WO_2209():
    app = build_app()
    report_ground_failure(app, T_1810)
    report_ground_failure(app, T_1810_08)

    assert [w.work_order_id for w in app.work_orders.all()] == ["WO-2208"]
    assert app.work_orders.all()[0].duplicate_report_count == 1
    assert len(app.bus.delivered_of_type("ops.work_order.opened.v1")) == 1


def test_redelivery_of_the_same_faulted_event_does_not_open_a_second_work_order():
    app = build_app()
    report_ground_failure(app, T_1810)
    faulted = app.bus.delivered_of_type("charging.charger.faulted.v1")[0]

    app.bus.redeliver(faulted.event_id)
    app.relay_all()

    assert len(app.work_orders.all()) == 1


def test_closing_publishes_work_order_closed_and_lets_the_same_fault_open_a_new_WO():
    app = build_app()
    report_ground_failure(app, T_1810)

    app.faults.close_work_order("WO-2208", "Repaired", T_1818, "corr-fault")
    app.relay_all()

    closed = app.bus.delivered_of_type("ops.work_order.closed.v1")
    assert closed[0].payload == {"workOrderId": "WO-2208", "chargerId": "CP-A12", "closedAt": T_1818, "outcome": "Repaired"}

    report_ground_failure(app, "2025-05-21T09:00:00+08:00")
    assert [w.work_order_id for w in app.work_orders.all()] == ["WO-2208", "WO-2209"]
