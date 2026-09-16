"""Day 4 B3: aggregate root of AssetOps — HQ's promise to fix one root cause on one charger.

Invariant (R5): one open root-cause WO per (charger_id, fault_code).
The lookup "is there already an open WO for this fault?" needs the repository, so it happens outside
the aggregate (Day 5 B3 process manager + WorkOrderRepository.find_open_by_fault); the aggregate
records append_duplicate_report().
"""
from enum import Enum

from assetops.domain.events import DuplicateFaultReported, TechnicianAssigned, WorkOrderClosed, WorkOrderEvent, WorkOrderOpened  # noqa: F401


class WorkOrderStatus(str, Enum):
    OPEN = "Open"
    ASSIGNED = "Assigned"
    CLOSED = "Closed"


class WorkOrder:
    def __init__(self, work_order_id: str, charger_id: str, fault_code: str, connector_id: str | None, opened_at: str) -> None:
        self.work_order_id = work_order_id  # WO-2208
        self.charger_id = charger_id  # CP-A12
        self.fault_code = fault_code  # GroundFailure
        self.connector_id = connector_id  # CP-A12-2 (None = whole charger)
        self.opened_at = opened_at
        self.status = WorkOrderStatus.OPEN
        self.technician_id: str | None = None
        self.outcome: str | None = None
        self.reports: list[str] = []  # occurred_at of every report, first one included
        self._events: list[WorkOrderEvent] = []

    @classmethod
    def open(cls, *, work_order_id: str, charger_id: str, fault_code: str, at: str, connector_id: str | None = None) -> "WorkOrder":
        """Record the first report and a WorkOrderOpened event."""
        raise NotImplementedError("TODO R5: WorkOrder.open")

    @property
    def is_open(self) -> bool:
        return self.status is not WorkOrderStatus.CLOSED

    @property
    def duplicate_report_count(self) -> int:
        return len(self.reports) - 1

    def append_duplicate_report(self, at: str) -> None:
        """R5: only while open; append to reports, record DuplicateFaultReported."""
        raise NotImplementedError("TODO R5: append_duplicate_report")

    def assign(self, technician_id: str, at: str) -> None:
        raise NotImplementedError("TODO Day 5 B3: assign")

    def close(self, outcome: str, at: str) -> None:
        raise NotImplementedError("TODO Day 5 B3: close")

    def pull_events(self) -> list[WorkOrderEvent]:
        pulled, self._events = self._events, []
        return pulled

    def _record(self, event: WorkOrderEvent) -> None:
        self._events.append(event)
