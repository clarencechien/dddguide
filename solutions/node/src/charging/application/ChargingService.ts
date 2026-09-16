import { ChargingSession } from '../domain/ChargingSession.ts';
import type { ChargingEvent } from '../domain/events.ts';
import { connectorIdOf } from '../domain/Connector.ts';
import type { Outbox } from '../../shared/Outbox.ts';
import { newId } from '../../shared/Ids.ts';
import type { AuthorizationService, ChargingSessionRepository } from './ports.ts';
import type { ReportFault, ReportMeterValue, StartCharging, StopCharging } from './commands.ts';
import { toIntegrationEvent } from './integrationEvents.ts';

// Application service = one method per command. It orchestrates: load aggregate -> call one
// domain method -> commit (aggregate + outbox together). No business rules live here.
export class ChargingService {
  private readonly sessions: ChargingSessionRepository;
  private readonly authorization: AuthorizationService;
  private readonly outbox: Outbox;

  constructor(sessions: ChargingSessionRepository, authorization: AuthorizationService, outbox: Outbox) {
    this.sessions = sessions;
    this.authorization = authorization;
    this.outbox = outbox;
  }

  async startCharging(cmd: StartCharging): Promise<ChargingEvent[]> {
    const authorized = await this.authorization.isAuthorized(cmd.idTag);
    // R1 hinges on this lookup: if the connector already has a Charging session, that same
    // aggregate receives the second start and rejects it.
    const session =
      (await this.sessions.findActiveByConnector(cmd.connectorId)) ?? ChargingSession.idle(cmd.connectorId);
    session.start({
      sessionId: cmd.sessionId,
      idTag: cmd.idTag,
      authorized,
      meterStartWh: cmd.meterStartWh,
      at: cmd.at,
    });
    return this.commit(session, cmd);
  }

  async reportMeterValue(cmd: ReportMeterValue): Promise<ChargingEvent[]> {
    const session = await this.requireSession(cmd.sessionId);
    session.reportMeter(cmd.meterWh, cmd.at);
    return this.commit(session, cmd);
  }

  async stopCharging(cmd: StopCharging): Promise<ChargingEvent[]> {
    const session = await this.requireSession(cmd.sessionId);
    session.stop(cmd.stopReason, cmd.at);
    return this.commit(session, cmd);
  }

  async reportFault(cmd: ReportFault): Promise<ChargingEvent[]> {
    // A fault interrupts the active session on that connector, if any. If nothing is charging
    // the fact is still published — the subject of ChargerFaulted is the charger, not a session.
    const active = cmd.connectorId ? await this.sessions.findActiveByConnector(cmd.connectorId) : undefined;
    const session = active ?? ChargingSession.idle(cmd.connectorId ?? connectorIdOf(cmd.chargerId, 0));
    session.reportFault(cmd.faultCode, cmd.at);
    return this.commit(session, cmd, /* persist */ active !== undefined);
  }

  // "Unit of work": aggregate state and outbox rows are saved together.
  // In-memory this is trivial; on Day 6 both writes go into ONE database transaction.
  private async commit(
    session: ChargingSession,
    cmd: { correlationId?: string; causationId?: string },
    persist = true,
  ): Promise<ChargingEvent[]> {
    const events = session.pullEvents();
    const correlationId = cmd.correlationId ?? newId();
    const causationId = cmd.causationId ?? correlationId;
    if (persist) await this.sessions.save(session);
    for (const event of events) {
      const integration = toIntegrationEvent(event, { correlationId, causationId });
      if (integration) await this.outbox.add(integration);
    }
    return events;
  }

  private async requireSession(sessionId: string): Promise<ChargingSession> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new Error(`Unknown session ${sessionId}`);
    return session;
  }
}
