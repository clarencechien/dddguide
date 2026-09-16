"""The domain never calls datetime.now() directly; time is injected so tests can pin "14:04"."""
from datetime import datetime, timezone
from typing import Protocol


class Clock(Protocol):
    def now(self) -> str: ...  # ISO-8601


class SystemClock:
    def now(self) -> str:
        return datetime.now(timezone.utc).isoformat()


class FixedClock:
    def __init__(self, initial: str) -> None:
        self._current = initial

    def now(self) -> str:
        return self._current

    def set(self, iso: str) -> None:
        self._current = iso
