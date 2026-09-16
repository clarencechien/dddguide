"""Ports (hexagonal): the application layer depends on these Protocols,
adapters (in-memory today, SQLite/Postgres on Day 6) implement them."""
from typing import Protocol

from charging.domain.charging_session import ChargingSession


class ChargingSessionRepository(Protocol):
    def find_by_id(self, session_id: str) -> ChargingSession | None: ...
    def find_active_by_connector(self, connector_id: str) -> ChargingSession | None: ...  # status == Charging
    def save(self, session: ChargingSession) -> None: ...


class AuthorizationService(Protocol):
    def is_authorized(self, id_tag: str) -> bool: ...
