from typing import Protocol

from assetops.domain.work_order import WorkOrder


class WorkOrderRepository(Protocol):
    def find_by_id(self, work_order_id: str) -> WorkOrder | None: ...
    def find_open_by_fault(self, charger_id: str, fault_code: str) -> WorkOrder | None: ...  # R5 lookup
    def save(self, work_order: WorkOrder) -> None: ...


class DispatchService(Protocol):
    """Dispatch is its own context; in MVP1 it is a stub that always sends TECH-HAO."""

    def request_technician(self, work_order_id: str, charger_id: str) -> str: ...  # returns technician_id
