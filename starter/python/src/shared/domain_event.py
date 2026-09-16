"""A domain event is a fact that happened inside ONE bounded context.

It is recorded by the aggregate (never sent to a broker from there: R8) and pulled out by the
application service after the aggregate method succeeded. Concrete events are frozen dataclasses
with a class-level `type` and an `occurred_at` ISO-8601 string.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class DomainEvent:
    occurred_at: str
