"""Domain events of the Charging context. Field names are ubiquitous language,
NOT OCPP (no transaction_id / meter_start / sampled_value here — that is the ACL's job)."""
from dataclasses import dataclass, field
from typing import Literal, Union

from shared.domain_event import DomainEvent


@dataclass(frozen=True)
class ChargingStarted(DomainEvent):
    session_id: str
    connector_id: str
    id_tag: str
    meter_start_wh: int
    type: str = field(default="ChargingStarted", init=False)


@dataclass(frozen=True)
class ChargingStartRejected(DomainEvent):
    connector_id: str
    id_tag: str
    reason: Literal["ConnectorOccupied", "Unauthorized"]
    type: str = field(default="ChargingStartRejected", init=False)


@dataclass(frozen=True)
class EnergyMetered(DomainEvent):
    session_id: str
    connector_id: str
    meter_wh: int
    type: str = field(default="EnergyMetered", init=False)


@dataclass(frozen=True)
class MeterValueRejected(DomainEvent):
    session_id: str
    connector_id: str
    meter_wh: int
    last_meter_wh: int
    reason: Literal["NotMonotonic", "NotCharging"]
    type: str = field(default="MeterValueRejected", init=False)


@dataclass(frozen=True)
class ChargingCompleted(DomainEvent):
    session_id: str
    connector_id: str
    energy_wh: int  # last meter - start meter (R4)
    started_at: str
    ended_at: str
    stop_reason: str
    type: str = field(default="ChargingCompleted", init=False)


@dataclass(frozen=True)
class ChargerFaulted(DomainEvent):
    charger_id: str
    fault_code: str
    still_energized: bool  # True when a session was charging at the moment of the fault
    connector_id: str | None = None
    type: str = field(default="ChargerFaulted", init=False)


ChargingEvent = Union[
    ChargingStarted, ChargingStartRejected, EnergyMetered, MeterValueRejected, ChargingCompleted, ChargerFaulted
]
