import type { DomainEvent } from '../../shared/DomainEvent.ts';

// Domain events of the Charging context. Field names are ubiquitous language,
// NOT OCPP (no transactionId / meterStart / sampledValue here — that is the ACL's job).

export interface ChargingStarted extends DomainEvent {
  type: 'ChargingStarted';
  sessionId: string;
  connectorId: string;
  idTag: string;
  meterStartWh: number;
}

export type StartRejectReason = 'ConnectorOccupied' | 'Unauthorized';

export interface ChargingStartRejected extends DomainEvent {
  type: 'ChargingStartRejected';
  connectorId: string;
  idTag: string;
  reason: StartRejectReason;
}

export interface EnergyMetered extends DomainEvent {
  type: 'EnergyMetered';
  sessionId: string;
  connectorId: string;
  meterWh: number;
}

export type MeterRejectReason = 'NotMonotonic' | 'NotCharging';

export interface MeterValueRejected extends DomainEvent {
  type: 'MeterValueRejected';
  sessionId: string;
  connectorId: string;
  meterWh: number;
  lastMeterWh: number;
  reason: MeterRejectReason;
}

export interface ChargingCompleted extends DomainEvent {
  type: 'ChargingCompleted';
  sessionId: string;
  connectorId: string;
  energyWh: number; // last meter - start meter (R4)
  startedAt: string;
  endedAt: string;
  stopReason: string;
}

export interface ChargerFaulted extends DomainEvent {
  type: 'ChargerFaulted';
  chargerId: string;
  connectorId?: string;
  faultCode: string;
  stillEnergized: boolean; // true when a session was charging at the moment of the fault
}

export type ChargingEvent =
  | ChargingStarted
  | ChargingStartRejected
  | EnergyMetered
  | MeterValueRejected
  | ChargingCompleted
  | ChargerFaulted;
