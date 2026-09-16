import pytest

from adapters.persistence.in_memory_work_order_repository import InMemoryWorkOrderRepository
from assetops.domain.events import WorkOrderOpened
from assetops.domain.work_order import WorkOrder, WorkOrderStatus

T_1810 = "2025-05-20T18:10:00+08:00"
T_1810_08 = "2025-05-20T18:10:08+08:00"
T_1818 = "2025-05-20T18:18:00+08:00"


def test_opens_a_work_order_for_a_charger_fault_and_records_WorkOrderOpened():
    wo = WorkOrder.open(work_order_id="WO-2208", charger_id="CP-A12", connector_id="CP-A12-2", fault_code="GroundFailure", at=T_1810)

    assert wo.status is WorkOrderStatus.OPEN
    assert wo.pull_events() == [WorkOrderOpened(occurred_at=T_1810, work_order_id="WO-2208", charger_id="CP-A12", fault_code="GroundFailure", connector_id="CP-A12-2")]


def test_R5_same_charger_and_fault_code_while_open_second_report_is_appended_no_second_work_order():
    repo = InMemoryWorkOrderRepository()
    repo.save(WorkOrder.open(work_order_id="WO-2208", charger_id="CP-A12", fault_code="GroundFailure", at=T_1810))

    # second report 8 seconds later: the intake looks up the open WO before opening a new one
    existing = repo.find_open_by_fault("CP-A12", "GroundFailure")
    assert existing is not None and existing.work_order_id == "WO-2208"
    existing.append_duplicate_report(T_1810_08)
    repo.save(existing)

    assert len(repo.all()) == 1
    assert existing.duplicate_report_count == 1
    assert [e.type for e in existing.pull_events()] == ["WorkOrderOpened", "DuplicateFaultReported"]


def test_R5_after_the_work_order_is_closed_the_same_fault_opens_a_new_work_order():
    repo = InMemoryWorkOrderRepository()
    first = WorkOrder.open(work_order_id="WO-2208", charger_id="CP-A12", fault_code="GroundFailure", at=T_1810)
    first.close("Repaired", T_1818)
    repo.save(first)

    assert repo.find_open_by_fault("CP-A12", "GroundFailure") is None
    with pytest.raises(ValueError, match="closed"):
        first.append_duplicate_report(T_1818)


def test_assign_then_close_walks_the_fault_lifecycle():
    wo = WorkOrder.open(work_order_id="WO-2208", charger_id="CP-A12", fault_code="GroundFailure", at=T_1810)
    wo.assign("TECH-HAO", T_1810)
    wo.close("Repaired", T_1818)

    assert wo.status is WorkOrderStatus.CLOSED
    assert wo.technician_id == "TECH-HAO"
    assert [e.type for e in wo.pull_events()] == ["WorkOrderOpened", "TechnicianAssigned", "WorkOrderClosed"]
    with pytest.raises(ValueError, match="already closed"):
        wo.close("Repaired", T_1818)
