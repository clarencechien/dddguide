"""Day 5 B1: application service = one method per command.

Shape of every method: load aggregate -> call ONE domain method -> _commit(aggregate + outbox).
No business rules here; they live in ChargingSession.
"""
from charging.application.commands import ReportFault, ReportMeterValue, StartCharging, StopCharging
from charging.application.ports import AuthorizationService, ChargingSessionRepository
from charging.domain.charging_session import ChargingSession
from charging.domain.events import ChargingEvent
from shared.outbox import Outbox


class ChargingService:
    def __init__(self, sessions: ChargingSessionRepository, authorization: AuthorizationService, outbox: Outbox) -> None:
        self._sessions = sessions
        self._authorization = authorization
        self._outbox = outbox

    def start_charging(self, cmd: StartCharging) -> list[ChargingEvent]:
        # 1. authorized = self._authorization.is_authorized(cmd.id_tag)
        # 2. session = self._sessions.find_active_by_connector(cmd.connector_id) or ChargingSession.idle(cmd.connector_id)
        # 3. session.start(...)   4. return self._commit(session, cmd)
        raise NotImplementedError("TODO Day 5 B1: start_charging")

    def report_meter_value(self, cmd: ReportMeterValue) -> list[ChargingEvent]:
        raise NotImplementedError("TODO Day 5 B1: report_meter_value")

    def stop_charging(self, cmd: StopCharging) -> list[ChargingEvent]:
        raise NotImplementedError("TODO Day 5 B1: stop_charging")

    def report_fault(self, cmd: ReportFault) -> list[ChargingEvent]:
        raise NotImplementedError("TODO Day 5 B1: report_fault")

    def _commit(self, session: ChargingSession, cmd) -> list[ChargingEvent]:
        """'Unit of work': save the aggregate AND write its integration events to the outbox together.
        Map domain events -> integration events (charging.session.started.v1, ...completed.v1, ...charger.faulted.v1)
        using shared.integration_event.IntegrationEvent (payload keys camelCase, see contracts/). Rejections stay inside."""
        raise NotImplementedError("TODO Day 5 B1: _commit (aggregate + outbox in one unit of work)")
