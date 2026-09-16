import type { ChargingEvent } from './events.ts';
import { chargerIdOf, parseConnectorId, type ConnectorId } from './Connector.ts';
import type { IdTag } from './IdTag.ts';
import type { WattHours } from './Energy.ts';

// Day 4 B1-B2: the aggregate root of the Charging context.
// Invariant: one connector has at most one session in status Charging.
// Rules of the game:
//  - no I/O here (no repository, bus, clock, fetch): everything comes in through parameters
//  - business "no"s are recorded as events (ChargingStartRejected, MeterValueRejected)
//  - events are collected in `events` and handed out through pullEvents() (R8)
// Replace each `throw new Error('TODO Rx')` with the real rule, one red test at a time (/tdd).

export const SessionStatus = {
  Idle: 'Idle',
  Charging: 'Charging',
  Completed: 'Completed',
  Faulted: 'Faulted',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export interface StartInput {
  sessionId: string; // S-991
  idTag: IdTag; // TAG-MONTHLY-77
  authorized: boolean; // decided by the AuthorizationService port, passed in
  meterStartWh: WattHours;
  at: string; // ISO-8601
}

export class ChargingSession {
  readonly connectorId: ConnectorId;
  private _status: SessionStatus;
  private _sessionId?: string;
  private _idTag?: IdTag;
  private _meterStartWh: WattHours = 0;
  private _lastMeterWh: WattHours = 0;
  private _startedAt?: string;
  private events: ChargingEvent[] = [];

  private constructor(connectorId: ConnectorId, status: SessionStatus) {
    this.connectorId = connectorId;
    this._status = status;
  }

  static idle(connectorId: string): ChargingSession {
    return new ChargingSession(parseConnectorId(connectorId), SessionStatus.Idle);
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

  // R1: if this connector is already Charging -> record ChargingStartRejected(ConnectorOccupied), change nothing.
  // R2: if !input.authorized -> record ChargingStartRejected(Unauthorized).
  // otherwise -> become Charging, remember sessionId/idTag/meterStart/startedAt, record ChargingStarted.
  start(input: StartInput): void {
    throw new Error('TODO R1');
  }

  // R3: only while Charging; a value lower than lastMeterWh -> MeterValueRejected(NotMonotonic),
  // not Charging -> MeterValueRejected(NotCharging); otherwise update lastMeterWh and record EnergyMetered.
  reportMeter(meterWh: WattHours, at: string): void {
    throw new Error('TODO R3');
  }

  // R4: only a Charging session can stop (throw InvalidStateError otherwise);
  // record ChargingCompleted with energyWh = lastMeterWh - meterStartWh.
  stop(stopReason: string, at: string): void {
    throw new Error('TODO R4');
  }

  // The charger declared it cannot deliver energy: status -> Faulted, record ChargerFaulted
  // (chargerId = chargerIdOf(connectorId), stillEnergized = was Charging).
  reportFault(faultCode: string, at: string): void {
    throw new Error('TODO ChargerFaulted');
  }

  // The application service calls this once after the command succeeded (R8).
  pullEvents(): ChargingEvent[] {
    const pulled = this.events;
    this.events = [];
    return pulled;
  }

  private record(event: ChargingEvent): void {
    this.events.push(event);
  }
}
