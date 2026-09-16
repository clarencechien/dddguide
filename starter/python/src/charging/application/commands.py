"""Commands are plain data. correlation_id / causation_id are optional: the HTTP/OCPP adapter
may pass them through; otherwise the service starts a new correlation."""
from dataclasses import dataclass


@dataclass(frozen=True)
class StartCharging:
    session_id: str  # S-991 (assigned by the adapter or an id generator)
    connector_id: str  # CP-A12-2
    id_tag: str  # TAG-MONTHLY-77
    meter_start_wh: int
    at: str
    correlation_id: str | None = None
    causation_id: str | None = None


@dataclass(frozen=True)
class ReportMeterValue:
    session_id: str
    meter_wh: int
    at: str
    correlation_id: str | None = None
    causation_id: str | None = None


@dataclass(frozen=True)
class StopCharging:
    session_id: str
    stop_reason: str  # "Local" | "Remote" | "EVDisconnected" ... (domain wording, not OCPP enum)
    at: str
    correlation_id: str | None = None
    causation_id: str | None = None


@dataclass(frozen=True)
class ReportFault:
    charger_id: str  # CP-A12
    fault_code: str  # GroundFailure
    at: str
    connector_id: str | None = None  # CP-A12-2; None = whole charger
    correlation_id: str | None = None
    causation_id: str | None = None
