import pytest


# R5: Given WO-2208 open for CP-A12 / GroundFailure at 18:10:00,
#     When the same charger reports GroundFailure again at 18:10:08,
#     Then the repository still holds ONE work order, and WO-2208 has duplicate_report_count == 1
#     with a DuplicateFaultReported event. Hint: WorkOrderRepository.find_open_by_fault(charger_id, fault_code).
#     Also: after close(), the same fault opens a NEW work order (WO-2209).
@pytest.mark.skip(reason="TODO R5")
def test_R5_same_charger_and_fault_code_while_open_second_report_is_appended_no_second_work_order():
    pass
