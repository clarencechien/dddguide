// Commands are plain data. `correlationId`/`causationId` are optional: the HTTP/OCPP adapter
// may pass them through; otherwise the service starts a new correlation.
interface CommandMeta {
  correlationId?: string;
  causationId?: string;
}

export interface StartCharging extends CommandMeta {
  sessionId: string; // S-991 (assigned by the adapter or an id generator)
  connectorId: string; // CP-A12-2
  idTag: string; // TAG-MONTHLY-77
  meterStartWh: number;
  at: string;
}

export interface ReportMeterValue extends CommandMeta {
  sessionId: string;
  meterWh: number;
  at: string;
}

export interface StopCharging extends CommandMeta {
  sessionId: string;
  stopReason: string; // "Local" | "Remote" | "EVDisconnected" ... (domain wording, not OCPP enum)
  at: string;
}

export interface ReportFault extends CommandMeta {
  chargerId: string; // CP-A12
  connectorId?: string; // CP-A12-2; undefined = whole charger
  faultCode: string; // GroundFailure
  at: string;
}
