"""Connector id = "<charger_id>-<connector number>", e.g. "CP-A12-2" is connector 2 of charger CP-A12.
Kept as a plain str; these helpers are the "value object" behaviour."""
import re

from charging.domain.errors import DomainError

_PATTERN = re.compile(r"^(.+)-(\d+)$")


def parse_connector_id(raw: str) -> str:
    if not _PATTERN.match(raw):
        raise DomainError(f"Invalid connector id: {raw}")
    return raw


def charger_id_of(connector_id: str) -> str:
    match = _PATTERN.match(connector_id)
    if not match:
        raise DomainError(f"Invalid connector id: {connector_id}")
    return match.group(1)


def connector_id_of(charger_id: str, connector_number: int) -> str:
    return f"{charger_id}-{connector_number}"
