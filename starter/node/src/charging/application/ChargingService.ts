import { ChargingSession } from '../domain/ChargingSession.ts';
import type { ChargingEvent } from '../domain/events.ts';
import type { Outbox } from '../../shared/Outbox.ts';
import type { AuthorizationService, ChargingSessionRepository } from './ports.ts';
import type { ReportFault, ReportMeterValue, StartCharging, StopCharging } from './commands.ts';

// Day 5 B1: application service = one method per command.
// Shape of every method: load aggregate -> call ONE domain method -> commit(aggregate + outbox).
// No business rules here; they live in ChargingSession.
export class ChargingService {
  private readonly sessions: ChargingSessionRepository;
  private readonly authorization: AuthorizationService;
  private readonly outbox: Outbox;

  constructor(sessions: ChargingSessionRepository, authorization: AuthorizationService, outbox: Outbox) {
    this.sessions = sessions;
    this.authorization = authorization;
    this.outbox = outbox;
  }

  // 1. authorized = await this.authorization.isAuthorized(cmd.idTag)
  // 2. session = (await this.sessions.findActiveByConnector(cmd.connectorId)) ?? ChargingSession.idle(cmd.connectorId)
  // 3. session.start({...})  4. return this.commit(session, cmd)
  async startCharging(cmd: StartCharging): Promise<ChargingEvent[]> {
    throw new Error('TODO Day 5 B1: startCharging');
  }

  async reportMeterValue(cmd: ReportMeterValue): Promise<ChargingEvent[]> {
    throw new Error('TODO Day 5 B1: reportMeterValue');
  }

  async stopCharging(cmd: StopCharging): Promise<ChargingEvent[]> {
    throw new Error('TODO Day 5 B1: stopCharging');
  }

  async reportFault(cmd: ReportFault): Promise<ChargingEvent[]> {
    throw new Error('TODO Day 5 B1: reportFault');
  }

  // "Unit of work": save the aggregate AND write its integration events to the outbox together.
  // Map domain events -> integration events (charging.session.started.v1, ...completed.v1, ...charger.faulted.v1)
  // with the envelope from shared/IntegrationEvent.ts. Rejections stay inside the context.
  private async commit(session: ChargingSession, cmd: { correlationId?: string; causationId?: string }): Promise<ChargingEvent[]> {
    throw new Error('TODO Day 5 B1: commit (aggregate + outbox in one unit of work)');
  }
}
