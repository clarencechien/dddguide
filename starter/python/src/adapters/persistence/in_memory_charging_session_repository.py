"""Simplest adapter that satisfies the port. Day 6 replaces it with SQLite/Postgres
(see docker/init.sql for the table shape) without touching domain or application code."""
from charging.domain.charging_session import ChargingSession, SessionStatus


class InMemoryChargingSessionRepository:
    def __init__(self) -> None:
        self._by_session_id: dict[str, ChargingSession] = {}

    def find_by_id(self, session_id: str) -> ChargingSession | None:
        return self._by_session_id.get(session_id)

    def find_active_by_connector(self, connector_id: str) -> ChargingSession | None:
        for session in self._by_session_id.values():
            if session.connector_id == connector_id and session.status is SessionStatus.CHARGING:
                return session
        return None

    def save(self, session: ChargingSession) -> None:
        if session.session_id is None:
            return  # a rejected/never-started session has nothing to persist
        self._by_session_id[session.session_id] = session

    def all(self) -> list[ChargingSession]:
        return list(self._by_session_id.values())
