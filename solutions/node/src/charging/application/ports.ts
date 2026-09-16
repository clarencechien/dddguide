import type { ChargingSession } from '../domain/ChargingSession.ts';

// Ports (hexagonal): the application layer depends on these interfaces,
// adapters (in-memory today, SQLite/Postgres on Day 6) implement them.
export interface ChargingSessionRepository {
  findById(sessionId: string): Promise<ChargingSession | undefined>;
  findActiveByConnector(connectorId: string): Promise<ChargingSession | undefined>; // status === Charging
  save(session: ChargingSession): Promise<void>;
}

export interface AuthorizationService {
  isAuthorized(idTag: string): Promise<boolean>;
}
