"""Aggregate root of AssetOps: HQ's promise to fix one root cause on one charger.

Invariant (R5): one open root-cause WO per (charger_id, fault_code) — enforced by whoever opens
WOs (FaultProcessManager + repository lookup), recorded here as duplicate reports.
"""
from enum import Enum

from assetops.domain.events import DuplicateFaultReported, TechnicianAssigned, WorkOrderClosed, WorkOrderEvent, WorkOrderOpened


class WorkOrderStatus(str, Enum):
    OPEN = "Open"
    ASSIGNED = "Assigned"
    CLOSED = "Closed"


class WorkOrder:
    def __init__(self, work_order_id: str, charger_id: str, fault_code: str, connector_id: str | None, opened_at: str) -> None:
        self.work_order_id = work_order_id
        self.charger_id = charger_id
        self.fault_code = fault_code
        self.connector_id = connector_id
        self.opened_at = opened_at
        self.status = WorkOrderStatus.OPEN
        self.technician_id: str | None = None
        self.outcome: str | None = None
        self.reports: list[str] = []  # occurred_at of every report, first one included
        self._events: list[WorkOrderEvent] = []

    @classmethod
    def open(cls, *, work_order_id: str, charger_id: str, fault_code: str, at: str, connector_id: str | None = None) -> "WorkOrder":
        wo = cls(work_order_id, charger_id, fault_code, connector_id, at)
        wo.reports.append(at)
        wo._record(WorkOrderOpened(occurred_at=at, work_order_id=work_order_id, charger_id=charger_id, fault_code=fault_code, connector_id=connector_id))
        return wo

    @property
    def is_open(self) -> bool:
        return self.status is not WorkOrderStatus.CLOSED

    @property
    def duplicate_report_count(self) -> int:
        return len(self.reports) - 1

    # R5
    def append_duplicate_report(self, at: str) -> None:
        if not self.is_open:
            raise ValueError(f"Cannot append report: work order {self.work_order_id} is closed")
        self.reports.append(at)
        self._record(DuplicateFaultReported(occurred_at=at, work_order_id=self.work_order_id, charger_id=self.charger_id, fault_code=self.fault_code))

    def assign(self, technician_id: str, at: str) -> None:
        if not self.is_open:
            raise ValueError(f"Cannot assign: work order {self.work_order_id} is closed")
        self.technician_id = technician_id
        self.status = WorkOrderStatus.ASSIGNED
        self._record(TechnicianAssigned(occurred_at=at, work_order_id=self.work_order_id, technician_id=technician_id))

    def close(self, outcome: str, at: str) -> None:
        if not self.is_open:
            raise ValueError(f"Work order {self.work_order_id} is already closed")
        self.status = WorkOrderStatus.CLOSED
        self.outcome = outcome
        self._record(WorkOrderClosed(occurred_at=at, work_order_id=self.work_order_id, charger_id=self.charger_id, outcome=outcome))

    def pull_events(self) -> list[WorkOrderEvent]:
        pulled, self._events = self._events, []
        return pulled

    def _record(self, event: WorkOrderEvent) -> None:
        self._events.append(event)
