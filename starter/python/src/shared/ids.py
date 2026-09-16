import uuid
from typing import Callable

IdGenerator = Callable[[], str]


def new_id() -> str:
    return str(uuid.uuid4())


def sequence(prefix: str, start: int) -> IdGenerator:
    """Deterministic ids for tests and the e2e script: sequence('WO-', 2208)() -> 'WO-2208', 'WO-2209' ..."""
    counter = iter(range(start, 10**9))
    return lambda: f"{prefix}{next(counter)}"
