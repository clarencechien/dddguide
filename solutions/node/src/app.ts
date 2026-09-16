import { InMemoryOutbox } from './shared/Outbox.ts';
import { InMemoryEventBus } from './shared/EventBus.ts';
import { OutboxRelay } from './shared/OutboxRelay.ts';
import { sequence } from './shared/Ids.ts';
import { ChargingService } from './charging/application/ChargingService.ts';
import { FaultProcessManager } from './assetops/application/FaultProcessManager.ts';
import { BillingDraftConsumer } from './billing/BillingDraftConsumer.ts';
import { OcppAcl } from './adapters/ocpp/OcppAcl.ts';
import { InMemoryChargingSessionRepository } from './adapters/persistence/InMemoryChargingSessionRepository.ts';
import { InMemoryAuthorizationService } from './adapters/persistence/InMemoryAuthorizationService.ts';
import { InMemoryWorkOrderRepository, StubDispatchService } from './adapters/persistence/InMemoryWorkOrderRepository.ts';

// Composition root: the only place that knows about concrete adapters.
// Each context owns its outbox; one in-memory bus stands in for the broker.
export function buildApp(options: { chargerId?: string; validTags?: string[] } = {}) {
  const chargerId = options.chargerId ?? 'CP-A12';
  const bus = new InMemoryEventBus();

  // Charging context
  const sessions = new InMemoryChargingSessionRepository();
  const authorization = new InMemoryAuthorizationService(options.validTags);
  const chargingOutbox = new InMemoryOutbox();
  const charging = new ChargingService(sessions, authorization, chargingOutbox);
  const acl = new OcppAcl(chargerId, charging, authorization);

  // AssetOps context
  const workOrders = new InMemoryWorkOrderRepository();
  const opsOutbox = new InMemoryOutbox();
  const faults = new FaultProcessManager(workOrders, new StubDispatchService(), opsOutbox, sequence('WO-', 2208));
  faults.subscribe(bus);

  // Billing context (consumer only)
  const billing = new BillingDraftConsumer();
  billing.subscribe(bus);

  const relays = [new OutboxRelay(chargingOutbox, bus), new OutboxRelay(opsOutbox, bus)];
  // Drain every outbox until nothing is left (a published event may produce new outbox rows).
  async function relayAll(): Promise<void> {
    let moved: number;
    do {
      moved = 0;
      for (const relay of relays) moved += await relay.publishPending();
    } while (moved > 0);
  }

  return { bus, sessions, charging, acl, workOrders, faults, billing, chargingOutbox, opsOutbox, relayAll };
}

export type App = ReturnType<typeof buildApp>;

// `npm run dev` smoke: boot the wiring and print what is registered.
if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
  const app = buildApp();
  console.log('EV Charge Ops in-memory stack ready:', Object.keys(app).join(', '));
}
