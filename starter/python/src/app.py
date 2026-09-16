"""Day 5-6: composition root. This is the only file allowed to instantiate concrete adapters.

Wire: repositories + AuthorizationService + Outbox -> ChargingService -> OcppAcl;
InMemoryEventBus + OutboxRelay; BillingDraftConsumer.subscribe(bus); FaultProcessManager.subscribe(bus).
scripts/e2e/run.py expects a `build_app()` function (see solutions/python/src/app.py for the reference shape).
"""


def build_app():
    raise NotImplementedError("TODO Day 5: wire the in-memory stack here")


if __name__ == "__main__":
    print("starter/python: nothing wired yet — see src/app.py")
