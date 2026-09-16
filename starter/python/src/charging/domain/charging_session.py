"""Day 4 B1-B2: the aggregate root of the Charging context.

Invariant: one connector has at most one session in status Charging.
Rules of the game:
 - no I/O here (no repository, bus, clock, requests): everything comes in through parameters
 - business "no"s are recorded as events (ChargingStartRejected, MeterValueRejected)
 - events are collected in `_events` and handed out through pull_events() (R8)
Replace each `raise NotImplementedError("TODO Rx")` with the real rule, one red test at a time (/tdd).
"""
from enum import Enum

from charging.domain.connector import charger_id_of, parse_connector_id  # noqa: F401  (you will need charger_id_of)
from charging.domain.energy import watt_hours  # noqa: F401
from charging.domain.errors import InvalidStateError  # noqa: F401
from charging.domain.events import (  # noqa: F401
    ChargerFaulted,
    ChargingCompleted,
    ChargingEvent,
    ChargingStarted,
    ChargingStartRejected,
    EnergyMetered,
    MeterValueRejected,
)
from charging.domain.id_tag import parse_id_tag  # noqa: F401


class SessionStatus(str, Enum):
    IDLE = "Idle"
    CHARGING = "Charging"
    COMPLETED = "Completed"
    FAULTED = "Faulted"


class ChargingSession:
    def __init__(self, connector_id: str, status: SessionStatus = SessionStatus.IDLE) -> None:
        self.connector_id = parse_connector_id(connector_id)
        self.status = status
        self.session_id: str | None = None
        self.id_tag: str | None = None
        self.meter_start_wh: int = 0
        self.last_meter_wh: int = 0
        self.started_at: str | None = None
        self._events: list[ChargingEvent] = []

    @classmethod
    def idle(cls, connector_id: str) -> "ChargingSession":
        return cls(connector_id)

    def start(self, *, session_id: str, id_tag: str, authorized: bool, meter_start_wh: int, at: str) -> None:
        """R1: if this connector is already Charging -> record ChargingStartRejected(ConnectorOccupied), change nothing.
        R2: if not authorized -> record ChargingStartRejected(Unauthorized).
        otherwise -> become Charging, remember session_id/id_tag/meter_start/started_at, record ChargingStarted."""
        raise NotImplementedError("TODO R1")

    def report_meter(self, meter_wh: int, at: str) -> None:
        """R3: only while Charging; a value lower than last_meter_wh -> MeterValueRejected(NotMonotonic),
        not Charging -> MeterValueRejected(NotCharging); otherwise update last_meter_wh and record EnergyMetered."""
        raise NotImplementedError("TODO R3")

    def stop(self, stop_reason: str, at: str) -> None:
        """R4: only a Charging session can stop (raise InvalidStateError otherwise);
        record ChargingCompleted with energy_wh = last_meter_wh - meter_start_wh."""
        raise NotImplementedError("TODO R4")

    def report_fault(self, fault_code: str, at: str) -> None:
        """The charger declared it cannot deliver energy: status -> Faulted, record ChargerFaulted
        (charger_id = charger_id_of(connector_id), still_energized = was Charging)."""
        raise NotImplementedError("TODO ChargerFaulted")

    def pull_events(self) -> list[ChargingEvent]:
        """The application service calls this once after the command succeeded (R8)."""
        pulled, self._events = self._events, []
        return pulled

    def _record(self, event: ChargingEvent) -> None:
        self._events.append(event)
