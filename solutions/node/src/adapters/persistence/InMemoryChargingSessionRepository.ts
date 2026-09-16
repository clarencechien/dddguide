import { ChargingSession, SessionStatus } from '../../charging/domain/ChargingSession.ts';
import type { ChargingSessionRepository } from '../../charging/application/ports.ts';

// Simplest adapter that satisfies the port. Day 6 replaces it with SQLite/Postgres
// (see docker/init.sql for the table shape) without touching domain or application code.
export class InMemoryChargingSessionRepository implements ChargingSessionRepository {
  private readonly bySessionId = new Map<string, ChargingSession>();

  async findById(sessionId: string): Promise<ChargingSession | undefined> {
    return this.bySessionId.get(sessionId);
  }

  async findActiveByConnector(connectorId: string): Promise<ChargingSession | undefined> {
    for (const session of this.bySessionId.values()) {
      if (session.connectorId === connectorId && session.status === SessionStatus.Charging) return session;
    }
    return undefined;
  }

  async save(session: ChargingSession): Promise<void> {
    if (!session.sessionId) return; // a rejected/never-started session has nothing to persist
    this.bySessionId.set(session.sessionId, session);
  }

  all(): ChargingSession[] {
    return [...this.bySessionId.values()];
  }
}
