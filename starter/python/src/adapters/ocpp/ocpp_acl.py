"""Day 6 B1: anti-corruption layer. OCPP vocabulary stops here; only ubiquitous-language commands go inward.
One instance per charger connection (the charger id comes from the connection / URL, not the payload).

OCPP 1.6J call frame: [2, uniqueId, action, payload]; result: [3, uniqueId, payload].

Translate:
  StatusNotification(status=Faulted, errorCode)   -> charging.report_fault(ReportFault(charger_id, connector_id?, fault_code=errorCode, at=timestamp))
  StartTransaction(connectorId, idTag, meterStart) -> charging.start_charging(StartCharging(session_id=f"S-{transaction_id}", connector_id=connector_id_of(charger_id, n), ...))
  MeterValues(transactionId, meterValue[].sampledValue[]) -> charging.report_meter_value(...)   (Energy.Active.Import.Register, Wh)
  StopTransaction(transactionId, meterStop, reason) -> report_meter_value(meterStop) then stop_charging(stop_reason)
Test idea: after feeding the 4 messages, json.dumps(outbox) must not contain any OCPP field name.
"""
from datetime import datetime, timezone

from charging.application.charging_service import ChargingService
from charging.application.ports import AuthorizationService
from charging.domain.connector import connector_id_of  # noqa: F401


class OcppAcl:
    def __init__(self, charger_id: str, charging: ChargingService, authorization: AuthorizationService) -> None:
        self._charger_id = charger_id
        self._charging = charging
        self._authorization = authorization
        self._next_transaction_id = 991  # -> S-991 for the canonical afternoon

    def handle(self, frame: list) -> list:
        _, unique_id, action, payload = frame
        if action == "BootNotification":
            return [3, unique_id, {"status": "Accepted", "currentTime": datetime.now(timezone.utc).isoformat(), "interval": 300}]
        raise NotImplementedError(f"TODO Day 6 B1: translate OCPP {action} for {self._charger_id}")


