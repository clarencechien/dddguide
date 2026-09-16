"""Parking is NOT in MVP1 scope; this stub exists to keep R6 executable:
releasing a vehicle must never depend on HQ being reachable."""
from dataclasses import dataclass, field
from typing import Union

from shared.domain_event import DomainEvent


@dataclass(frozen=True)
class ParkingManuallyReleased(DomainEvent):
    parking_session_id: str
    plate: str
    released_by: str
    type: str = field(default="ParkingManuallyReleased", init=False)


@dataclass(frozen=True)
class VehicleExited(DomainEvent):
    parking_session_id: str
    plate: str
    release_mode: str  # "Auto" | "Manual"
    type: str = field(default="VehicleExited", init=False)


ParkingEvent = Union[ParkingManuallyReleased, VehicleExited]


class ParkingSession:
    def __init__(self, parking_session_id: str, plate: str, entered_at: str) -> None:
        self.parking_session_id = parking_session_id  # P-441
        self.plate = plate  # ABC-1234
        self.entered_at = entered_at
        self.status = "Active"
        self._events: list[ParkingEvent] = []

    def manual_release(self, released_by: str, at: str) -> None:
        """R6: the shift lead (阿忠) releases by hand; Billing reconciles later from the events."""
        if self.status == "Released":
            raise ValueError("Already released")
        self.status = "Released"
        self._events.append(ParkingManuallyReleased(occurred_at=at, parking_session_id=self.parking_session_id, plate=self.plate, released_by=released_by))
        self._events.append(VehicleExited(occurred_at=at, parking_session_id=self.parking_session_id, plate=self.plate, release_mode="Manual"))

    def pull_events(self) -> list[ParkingEvent]:
        pulled, self._events = self._events, []
        return pulled
