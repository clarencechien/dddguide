"""Energy is stored in whole watt-hours (int) to avoid floating point surprises. 12.4 kWh == 12400 Wh."""
from charging.domain.errors import DomainError


def watt_hours(value: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise DomainError(f"Invalid energy: {value} Wh")
    return value


def to_kwh(wh: int) -> float:
    return wh / 1000
