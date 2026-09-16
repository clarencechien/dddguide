"""Aggregate root of the Charging context.

Invariant: one connector has at most one session in status Charging.
The aggregate only records events (R8); it never touches a repository, bus or clock.
"""
from enum import Enum

from charging.domain.connector import charger_id_of, parse_connector_id
from charging.domain.energy import watt_hours
from charging.domain.errors import InvalidStateError
from charging.domain.events import (
    ChargerFaulted,
    ChargingCompleted,
    ChargingEvent,
    ChargingStarted,
    ChargingStartRejected,
    EnergyMetered,
    MeterValueRejected,
)
from charging.domain.id_tag import parse_id_tag


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
        """A fresh, not-yet-started session for a connector."""
        return cls(connector_id)

    # R1 + R2
    def start(self, *, session_id: str, id_tag: str, authorized: bool, meter_start_wh: int, at: str) -> None:
        tag = parse_id_tag(id_tag)
        if self.status is SessionStatus.CHARGING:
            # R1: the original session stays untouched; we only record the rejection.
            self._record(ChargingStartRejected(occurred_at=at, connector_id=self.connector_id, id_tag=tag, reason="ConnectorOccupied"))
            return
        if not authorized:  # R2
            self._record(ChargingStartRejected(occurred_at=at, connector_id=self.connector_id, id_tag=tag, reason="Unauthorized"))
            return
        self.session_id = session_id
        self.id_tag = tag
        self.meter_start_wh = watt_hours(meter_start_wh)
        self.last_meter_wh = self.meter_start_wh
        self.started_at = at
        self.status = SessionStatus.CHARGING
        self._record(
            ChargingStarted(occurred_at=at, session_id=session_id, connector_id=self.connector_id, id_tag=tag, meter_start_wh=self.meter_start_wh)
        )

    # R3: meter readings must be monotonic (a register never goes backwards).
    def report_meter(self, meter_wh: int, at: str) -> None:
        value = watt_hours(meter_wh)
        rejected = dict(occurred_at=at, session_id=self.session_id or "", connector_id=self.connector_id, meter_wh=value, last_meter_wh=self.last_meter_wh)
        if self.status is not SessionStatus.CHARGING:
            self._record(MeterValueRejected(reason="NotCharging", **rejected))
            return
        if value < self.last_meter_wh:
            self._record(MeterValueRejected(reason="NotMonotonic", **rejected))
            return
        self.last_meter_wh = value
        self._record(EnergyMetered(occurred_at=at, session_id=self.session_id or "", connector_id=self.connector_id, meter_wh=value))

    # R4: only a Charging session can be stopped; energy = last meter - start meter.
    def stop(self, stop_reason: str, at: str) -> None:
        if self.status is not SessionStatus.CHARGING:
            raise InvalidStateError("stop", self.status.value)
        self.status = SessionStatus.COMPLETED
        self._record(
            ChargingCompleted(
                occurred_at=at,
                session_id=self.session_id or "",
                connector_id=self.connector_id,
                energy_wh=self.last_meter_wh - self.meter_start_wh,
                started_at=self.started_at or "",
                ended_at=at,
                stop_reason=stop_reason,
            )
        )

    def report_fault(self, fault_code: str, at: str) -> None:
        """The charger declared it cannot deliver energy per contract. A charging session is interrupted."""
        still_energized = self.status is SessionStatus.CHARGING
        self.status = SessionStatus.FAULTED
        self._record(
            ChargerFaulted(
                occurred_at=at,
                charger_id=charger_id_of(self.connector_id),
                connector_id=self.connector_id,
                fault_code=fault_code,
                still_energized=still_energized,
            )
        )

    def pull_events(self) -> list[ChargingEvent]:
        """Application service calls this once, after the command succeeded, to hand events to the Outbox."""
        pulled, self._events = self._events, []
        return pulled

    def _record(self, event: ChargingEvent) -> None:
        self._events.append(event)
