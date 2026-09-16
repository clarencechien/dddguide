"""Application service = one method per command. It orchestrates: load aggregate -> call one
domain method -> commit (aggregate + outbox together). No business rules live here."""
from charging.application.commands import ReportFault, ReportMeterValue, StartCharging, StopCharging
from charging.application.integration_events import to_integration_event
from charging.application.ports import AuthorizationService, ChargingSessionRepository
from charging.domain.charging_session import ChargingSession
from charging.domain.connector import connector_id_of
from charging.domain.events import ChargingEvent
from shared.ids import new_id
from shared.outbox import Outbox


class ChargingService:
    def __init__(self, sessions: ChargingSessionRepository, authorization: AuthorizationService, outbox: Outbox) -> None:
        self._sessions = sessions
        self._authorization = authorization
        self._outbox = outbox

    def start_charging(self, cmd: StartCharging) -> list[ChargingEvent]:
        authorized = self._authorization.is_authorized(cmd.id_tag)
        # R1 hinges on this lookup: if the connector already has a Charging session, that same
        # aggregate receives the second start and rejects it.
        session = self._sessions.find_active_by_connector(cmd.connector_id) or ChargingSession.idle(cmd.connector_id)
        session.start(session_id=cmd.session_id, id_tag=cmd.id_tag, authorized=authorized, meter_start_wh=cmd.meter_start_wh, at=cmd.at)
        return self._commit(session, cmd)

    def report_meter_value(self, cmd: ReportMeterValue) -> list[ChargingEvent]:
        session = self._require_session(cmd.session_id)
        session.report_meter(cmd.meter_wh, cmd.at)
        return self._commit(session, cmd)

    def stop_charging(self, cmd: StopCharging) -> list[ChargingEvent]:
        session = self._require_session(cmd.session_id)
        session.stop(cmd.stop_reason, cmd.at)
        return self._commit(session, cmd)

    def report_fault(self, cmd: ReportFault) -> list[ChargingEvent]:
        # A fault interrupts the active session on that connector, if any. If nothing is charging
        # the fact is still published — the subject of ChargerFaulted is the charger, not a session.
        active = self._sessions.find_active_by_connector(cmd.connector_id) if cmd.connector_id else None
        session = active or ChargingSession.idle(cmd.connector_id or connector_id_of(cmd.charger_id, 0))
        session.report_fault(cmd.fault_code, cmd.at)
        return self._commit(session, cmd, persist=active is not None)

    def _commit(self, session: ChargingSession, cmd, persist: bool = True) -> list[ChargingEvent]:
        """'Unit of work': aggregate state and outbox rows are saved together.
        In-memory this is trivial; on Day 6 both writes go into ONE database transaction."""
        events = session.pull_events()
        correlation_id = cmd.correlation_id or new_id()
        causation_id = cmd.causation_id or correlation_id
        if persist:
            self._sessions.save(session)
        for event in events:
            integration = to_integration_event(event, correlation_id, causation_id)
            if integration:
                self._outbox.add(integration)
        return events

    def _require_session(self, session_id: str) -> ChargingSession:
        session = self._sessions.find_by_id(session_id)
        if session is None:
            raise KeyError(f"Unknown session {session_id}")
        return session
