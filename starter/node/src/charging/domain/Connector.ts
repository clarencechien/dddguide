import { DomainError } from './errors.ts';

// Connector id = "<chargerId>-<connector number>", e.g. "CP-A12-2" is connector 2 of charger CP-A12.
// Keeping it a string (not a class) keeps the aggregate readable; the helpers below are the "value object".
export type ConnectorId = string;
export type ChargerId = string;

const PATTERN = /^(.+)-(\d+)$/;

export function parseConnectorId(raw: string): ConnectorId {
  if (!PATTERN.test(raw)) throw new DomainError(`Invalid connector id: ${raw}`);
  return raw;
}

export function chargerIdOf(connectorId: ConnectorId): ChargerId {
  const match = PATTERN.exec(connectorId);
  if (!match) throw new DomainError(`Invalid connector id: ${connectorId}`);
  return match[1];
}

export function connectorIdOf(chargerId: ChargerId, connectorNumber: number): ConnectorId {
  return `${chargerId}-${connectorNumber}`;
}
