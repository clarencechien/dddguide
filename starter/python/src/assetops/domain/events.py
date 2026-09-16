from dataclasses import dataclass, field
from typing import Union

from shared.domain_event import DomainEvent


@dataclass(frozen=True)
class WorkOrderOpened(DomainEvent):
    work_order_id: str
    charger_id: str
    fault_code: str
    connector_id: str | None = None
    type: str = field(default="WorkOrderOpened", init=False)


@dataclass(frozen=True)
class DuplicateFaultReported(DomainEvent):
    """R5: a repeated report while the WO is open is attached, it does not open a second WO."""
    work_order_id: str
    charger_id: str
    fault_code: str
    type: str = field(default="DuplicateFaultReported", init=False)


@dataclass(frozen=True)
class TechnicianAssigned(DomainEvent):
    work_order_id: str
    technician_id: str
    type: str = field(default="TechnicianAssigned", init=False)


@dataclass(frozen=True)
class WorkOrderClosed(DomainEvent):
    work_order_id: str
    charger_id: str
    outcome: str  # "Repaired" | "ReplacedConnector" | "NoFaultFound" ...
    type: str = field(default="WorkOrderClosed", init=False)


WorkOrderEvent = Union[WorkOrderOpened, DuplicateFaultReported, TechnicianAssigned, WorkOrderClosed]
