"""Which domain events cross the context boundary, and under which contract name (§1.8).
Rejections and EnergyMetered stay inside Charging (nobody downstream needs every MeterValue: T4).
Payload keys are camelCase: the contract is language-neutral (see contracts/*.schema.json)."""
from charging.domain.events import ChargerFaulted, ChargingCompleted, ChargingEvent, ChargingStarted
from shared.integration_event import IntegrationEvent

PRODUCER = "charging"


def to_integration_event(event: ChargingEvent, correlation_id: str, causation_id: str) -> IntegrationEvent | None:
    common = dict(producer=PRODUCER, occurred_at=event.occurred_at, correlation_id=correlation_id, causation_id=causation_id)
    if isinstance(event, ChargingStarted):
        return IntegrationEvent(
            type="charging.session.started.v1",
            payload={"sessionId": event.session_id, "connectorId": event.connector_id, "idTag": event.id_tag, "startedAt": event.occurred_at},
            **common,
        )
    if isinstance(event, ChargingCompleted):
        return IntegrationEvent(
            type="charging.session.completed.v1",
            payload={
                "sessionId": event.session_id,
                "connectorId": event.connector_id,
                "energyWh": event.energy_wh,
                "startedAt": event.started_at,
                "endedAt": event.ended_at,
                "stopReason": event.stop_reason,
            },
            **common,
        )
    if isinstance(event, ChargerFaulted):
        payload = {"chargerId": event.charger_id, "faultCode": event.fault_code, "stillEnergized": event.still_energized, "occurredAt": event.occurred_at}
        if event.connector_id:
            payload["connectorId"] = event.connector_id
        return IntegrationEvent(type="charging.charger.faulted.v1", payload=payload, **common)
    return None
