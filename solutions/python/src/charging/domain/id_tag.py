"""The credential presented to start charging (RFID card, app token): "TAG-MONTHLY-77"."""
from charging.domain.errors import DomainError


def parse_id_tag(raw: str) -> str:
    value = raw.strip()
    if not value or len(value) > 20:
        raise DomainError(f'Invalid idTag: "{raw}"')
    return value
