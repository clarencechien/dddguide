// Day 5-6: composition root. This is the only file allowed to `new` concrete adapters.
// Wire: repositories + AuthorizationService + Outbox -> ChargingService -> OcppAcl;
// InMemoryEventBus + OutboxRelay; BillingDraftConsumer.subscribe(bus); FaultProcessManager.subscribe(bus).
// scripts/e2e/run.mjs expects a `buildApp()` export (see solutions/node/src/app.ts for the reference shape).
export function buildApp(): Record<string, unknown> {
  throw new Error('TODO Day 5: wire the in-memory stack here');
}

if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
  console.log('starter/node: nothing wired yet — see src/app.ts');
}
