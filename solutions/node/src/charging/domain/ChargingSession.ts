import type { ChargingEvent } from './events.ts';
import { chargerIdOf, parseConnectorId, type ConnectorId } from './Connector.ts';
import { parseIdTag, type IdTag } from './IdTag.ts';
import { wattHours, type WattHours } from './Energy.ts';
import { InvalidStateError } from './errors.ts';

export const SessionStatus = {
  Idle: 'Idle',
  Charging: 'Charging',
  Completed: 'Completed',
  Faulted: 'Faulted',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export interface StartInput {
  sessionId: string;
  idTag: IdTag;
  authorized: boolean; // decided by the AuthorizationService port, passed in (aggregate does no I/O)
  meterStartWh: WattHours;
  at: string;
}

// Aggregate root of the Charging context.
// Invariant: one connector has at most one session in status Charging.
// The aggregate only records events (R8); it never touches a repository, bus or clock.
export class ChargingSession {
  readonly connectorId: ConnectorId;
  private _status: SessionStatus;
  private _sessionId?: string;
  private _idTag?: IdTag;
  private _meterStartWh: WattHours;
  private _lastMeterWh: WattHours;
  private _startedAt?: string;
  private events: ChargingEvent[] = [];

  private constructor(
    connectorId: ConnectorId,
    status: SessionStatus,
    sessionId?: string,
    idTag?: IdTag,
    meterStartWh: WattHours = 0,
    lastMeterWh: WattHours = 0,
    startedAt?: string,
  ) {
    this.connectorId = connectorId;
    this._status = status;
    this._sessionId = sessionId;
    this._idTag = idTag;
    this._meterStartWh = meterStartWh;
    this._lastMeterWh = lastMeterWh;
    this._startedAt = startedAt;
  }

  // A fresh, not-yet-started session for a connector.
  static idle(connectorId: string): ChargingSession {
    return new ChargingSession(parseConnectorId(connectorId), SessionStatus.Idle);
  }

  // Used by repositories to rebuild state (Day 6). No events are recorded.
  static rehydrate(state: {
    connectorId: string;
    status: SessionStatus;
    sessionId?: string;
    idTag?: string;
    meterStartWh: number;
    lastMeterWh: number;
    startedAt?: string;
  }): ChargingSession {
    return new ChargingSession(
      state.connectorId,
      state.status,
      state.sessionId,
      state.idTag,
      state.meterStartWh,
      state.lastMeterWh,
      state.startedAt,
    );
  }

  get status(): SessionStatus {
    return this._status;
  }
  get sessionId(): string | undefined {
    return this._sessionId;
  }
  get idTag(): IdTag | undefined {
    return this._idTag;
  }
  get meterStartWh(): WattHours {
    return this._meterStartWh;
  }
  get lastMeterWh(): WattHours {
    return this._lastMeterWh;
  }
  get startedAt(): string | undefined {
    return this._startedAt;
  }

  // R1 + R2
  start(input: StartInput): void {
    const idTag = parseIdTag(input.idTag);
    if (this._status === SessionStatus.Charging) {
      // R1: the original session stays untouched; we only record the rejection.
      this.record({
        type: 'ChargingStartRejected',
        connectorId: this.connectorId,
        idTag,
        reason: 'ConnectorOccupied',
        occurredAt: input.at,
      });
      return;
    }
    if (!input.authorized) {
      // R2
      this.record({
        type: 'ChargingStartRejected',
        connectorId: this.connectorId,
        idTag,
        reason: 'Unauthorized',
        occurredAt: input.at,
      });
      return;
    }
    this._sessionId = input.sessionId;
    this._idTag = idTag;
    this._meterStartWh = wattHours(input.meterStartWh);
    this._lastMeterWh = this._meterStartWh;
    this._startedAt = input.at;
    this._status = SessionStatus.Charging;
    this.record({
      type: 'ChargingStarted',
      sessionId: input.sessionId,
      connectorId: this.connectorId,
      idTag,
      meterStartWh: this._meterStartWh,
      occurredAt: input.at,
    });
  }

  // R3: meter readings must be monotonic (a register never goes backwards).
  reportMeter(meterWh: WattHours, at: string): void {
    const value = wattHours(meterWh);
    const base = {
      sessionId: this._sessionId ?? '',
      connectorId: this.connectorId,
      meterWh: value,
      lastMeterWh: this._lastMeterWh,
      occurredAt: at,
    };
    if (this._status !== SessionStatus.Charging) {
      this.record({ type: 'MeterValueRejected', ...base, reason: 'NotCharging' });
      return;
    }
    if (value < this._lastMeterWh) {
      this.record({ type: 'MeterValueRejected', ...base, reason: 'NotMonotonic' });
      return;
    }
    this._lastMeterWh = value;
    this.record({
      type: 'EnergyMetered',
      sessionId: this._sessionId!,
      connectorId: this.connectorId,
      meterWh: value,
      occurredAt: at,
    });
  }

  // R4: only a Charging session can be stopped; energy = last meter - start meter.
  stop(stopReason: string, at: string): void {
    if (this._status !== SessionStatus.Charging) throw new InvalidStateError('stop', this._status);
    this._status = SessionStatus.Completed;
    this.record({
      type: 'ChargingCompleted',
      sessionId: this._sessionId!,
      connectorId: this.connectorId,
      energyWh: this._lastMeterWh - this._meterStartWh,
      startedAt: this._startedAt!,
      endedAt: at,
      stopReason,
      occurredAt: at,
    });
  }

  // The charger declared it cannot deliver energy per contract. A charging session is interrupted.
  reportFault(faultCode: string, at: string): void {
    const stillEnergized = this._status === SessionStatus.Charging;
    this._status = SessionStatus.Faulted;
    this.record({
      type: 'ChargerFaulted',
      chargerId: chargerIdOf(this.connectorId),
      connectorId: this.connectorId,
      faultCode,
      stillEnergized,
      occurredAt: at,
    });
  }

  // Application service calls this once, after the command succeeded, to hand events to the Outbox.
  pullEvents(): ChargingEvent[] {
    const pulled = this.events;
    this.events = [];
    return pulled;
  }

  private record(event: ChargingEvent): void {
    this.events.push(event);
  }
}
