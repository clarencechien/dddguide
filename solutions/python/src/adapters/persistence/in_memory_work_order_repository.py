from assetops.domain.work_order import WorkOrder


class InMemoryWorkOrderRepository:
    def __init__(self) -> None:
        self._by_id: dict[str, WorkOrder] = {}

    def find_by_id(self, work_order_id: str) -> WorkOrder | None:
        return self._by_id.get(work_order_id)

    def find_open_by_fault(self, charger_id: str, fault_code: str) -> WorkOrder | None:
        for wo in self._by_id.values():
            if wo.charger_id == charger_id and wo.fault_code == fault_code and wo.is_open:
                return wo
        return None

    def save(self, work_order: WorkOrder) -> None:
        self._by_id[work_order.work_order_id] = work_order

    def all(self) -> list[WorkOrder]:
        return list(self._by_id.values())


class StubDispatchService:
    """Dispatch stub (Sprint 2 backlog: a real Dispatch context with routes, SLA, spare parts)."""

    def __init__(self, technician_id: str = "TECH-HAO") -> None:
        self._technician_id = technician_id

    def request_technician(self, work_order_id: str, charger_id: str) -> str:
        return self._technician_id
