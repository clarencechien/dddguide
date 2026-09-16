import { createIntegrationEvent, type IntegrationEvent } from '../../shared/IntegrationEvent.ts';
import type { ChargingEvent } from '../domain/events.ts';

export const PRODUCER = 'charging';

// Which domain events cross the context boundary, and under which contract name (§1.8).
// Rejections and EnergyMetered stay inside Charging (nobody downstream needs every MeterValue: T4).
export function toIntegrationEvent(
  event: ChargingEvent,
  ids: { correlationId: string; causationId: string },
): IntegrationEvent | undefined {
  switch (event.type) {
    case 'ChargingStarted':
      return createIntegrationEvent({
        type: 'charging.session.started.v1',
        producer: PRODUCER,
        occurredAt: event.occurredAt,
        ...ids,
        payload: {
          sessionId: event.sessionId,
          connectorId: event.connectorId,
          idTag: event.idTag,
          startedAt: event.occurredAt,
        },
      });
    case 'ChargingCompleted':
      return createIntegrationEvent({
        type: 'charging.session.completed.v1',
        producer: PRODUCER,
        occurredAt: event.occurredAt,
        ...ids,
        payload: {
          sessionId: event.sessionId,
          connectorId: event.connectorId,
          energyWh: event.energyWh,
          startedAt: event.startedAt,
          endedAt: event.endedAt,
          stopReason: event.stopReason,
        },
      });
    case 'ChargerFaulted':
      return createIntegrationEvent({
        type: 'charging.charger.faulted.v1',
        producer: PRODUCER,
        occurredAt: event.occurredAt,
        ...ids,
        payload: {
          chargerId: event.chargerId,
          ...(event.connectorId ? { connectorId: event.connectorId } : {}),
          faultCode: event.faultCode,
          stillEnergized: event.stillEnergized,
          occurredAt: event.occurredAt,
        },
      });
    default:
      return undefined;
  }
}
