"""Anti-corruption layer. OCPP vocabulary (StatusNotification, transactionId, meterStart, sampledValue)
stops here; only ubiquitous-language commands go inward. One ACL instance per charger connection.

OCPP 1.6J call frame: [2, uniqueId, action, payload]; result: [3, uniqueId, payload].
"""
from datetime import datetime, timezone
from typing import Any

from charging.application.charging_service import ChargingService
from charging.application.commands import ReportFault, ReportMeterValue, StartCharging, StopCharging
from charging.application.ports import AuthorizationService
from charging.domain.connector import connector_id_of
from charging.domain.events import ChargingStartRejected

OcppCall = list  # [2, unique_id, action, payload]
OcppResult = list  # [3, unique_id, payload]


class OcppAcl:
    def __init__(self, charger_id: str, charging: ChargingService, authorization: AuthorizationService, first_transaction_id: int = 991) -> None:
        self._charger_id = charger_id
        self._charging = charging
        self._authorization = authorization
        self._next_transaction_id = first_transaction_id  # -> S-991 for the canonical afternoon

    def handle(self, frame: OcppCall) -> OcppResult:
        _, unique_id, action, payload = frame
        return [3, unique_id, self._dispatch(action, payload)]

    def _dispatch(self, action: str, p: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if action == "BootNotification":
            return {"status": "Accepted", "currentTime": now, "interval": 300}
        if action == "Heartbeat":
            return {"currentTime": now}
        if action == "Authorize":
            return {"idTagInfo": {"status": "Accepted" if self._authorization.is_authorized(p["idTag"]) else "Invalid"}}
        if action == "StatusNotification":
            if p.get("status") != "Faulted":
                return {}  # Available/Preparing/... carry no command in MVP1
            connector_id = connector_id_of(self._charger_id, p["connectorId"]) if p.get("connectorId", 0) > 0 else None
            self._charging.report_fault(ReportFault(charger_id=self._charger_id, connector_id=connector_id, fault_code=p["errorCode"], at=p["timestamp"]))
            return {}
        if action == "StartTransaction":
            transaction_id = self._next_transaction_id
            self._next_transaction_id += 1
            events = self._charging.start_charging(
                StartCharging(
                    session_id=_session_id_for(transaction_id),
                    connector_id=connector_id_of(self._charger_id, p["connectorId"]),
                    id_tag=p["idTag"],
                    meter_start_wh=p["meterStart"],
                    at=p["timestamp"],
                )
            )
            rejected = next((e for e in events if isinstance(e, ChargingStartRejected)), None)
            status = "Accepted" if rejected is None else ("Invalid" if rejected.reason == "Unauthorized" else "Blocked")
            return {"transactionId": transaction_id, "idTagInfo": {"status": status}}
        if action == "MeterValues":
            meter_wh = _energy_register_wh(p.get("meterValue"))
            if meter_wh is None or "transactionId" not in p:
                return {}
            self._charging.report_meter_value(ReportMeterValue(session_id=_session_id_for(p["transactionId"]), meter_wh=meter_wh, at=p["meterValue"][0]["timestamp"]))
            return {}
        if action == "StopTransaction":
            session_id = _session_id_for(p["transactionId"])
            # The final register value is just another meter reading (R3), then the stop (R4).
            self._charging.report_meter_value(ReportMeterValue(session_id=session_id, meter_wh=p["meterStop"], at=p["timestamp"]))
            self._charging.stop_charging(StopCharging(session_id=session_id, stop_reason=p.get("reason", "Local"), at=p["timestamp"]))
            return {"idTagInfo": {"status": "Accepted"}}
        raise ValueError(f"OCPP action not supported: {action}")


def _session_id_for(transaction_id: int) -> str:
    return f"S-{transaction_id}"


def _energy_register_wh(meter_value: list[dict[str, Any]] | None) -> int | None:
    """MeterValues carries a list of samples; we only care about the cumulative energy register in Wh."""
    for entry in meter_value or []:
        for sample in entry.get("sampledValue", []):
            if sample.get("measurand", "Energy.Active.Import.Register") != "Energy.Active.Import.Register":
                continue
            value = float(sample["value"])
            return round(value * 1000) if sample.get("unit") == "kWh" else round(value)
    return None
