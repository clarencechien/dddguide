"""Errors are for programming / protocol mistakes (calling stop on an Idle session).
Business "no"s that stakeholders care about are *events* (ChargingStartRejected, MeterValueRejected)."""


class DomainError(Exception):
    pass


class InvalidStateError(DomainError):
    def __init__(self, action: str, status: str) -> None:
        super().__init__(f"Cannot {action}: session is {status}")
