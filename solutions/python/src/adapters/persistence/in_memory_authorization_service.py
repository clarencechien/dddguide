"""Local whitelist: the site must keep authorizing when HQ is unreachable (§1.1)."""


class InMemoryAuthorizationService:
    def __init__(self, valid_tags: list[str] | None = None) -> None:
        self._known = set(valid_tags or ["TAG-MONTHLY-77"])

    def is_authorized(self, id_tag: str) -> bool:
        return id_tag in self._known
