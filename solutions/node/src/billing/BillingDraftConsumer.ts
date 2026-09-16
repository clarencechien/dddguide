import type { InMemoryEventBus } from '../shared/EventBus.ts';
import type { IntegrationEvent } from '../shared/IntegrationEvent.ts';
import type { IdGenerator } from '../shared/Ids.ts';
import { sequence } from '../shared/Ids.ts';

export interface DraftInvoice {
  invoiceId: string; // INV-778
  sessionId: string; // S-991 — the dedup key
  connectorId: string;
  idTag?: string;
  energyWh: number;
  amount: number; // TWD, computed from energy; parking fee merge is Sprint 2
  status: 'Draft';
}

// Minimal Billing consumer (customer of Charging). It never calls back into Charging.
// Idempotent: the dedup key is sessionId (§1.8), so a redelivered event changes nothing.
export class BillingDraftConsumer {
  private readonly drafts = new Map<string, DraftInvoice>();
  private readonly ratePerKwh: number;
  private readonly nextInvoiceId: IdGenerator;

  constructor(ratePerKwh = 8, nextInvoiceId: IdGenerator = sequence('INV-', 778)) {
    this.ratePerKwh = ratePerKwh;
    this.nextInvoiceId = nextInvoiceId;
  }

  subscribe(bus: InMemoryEventBus): void {
    bus.subscribe('charging.session.started.v1', (e) => this.onSessionStarted(e));
    bus.subscribe('charging.session.completed.v1', (e) => this.onSessionCompleted(e));
  }

  onSessionStarted(event: IntegrationEvent): void {
    const { sessionId, connectorId, idTag } = event.payload as { sessionId: string; connectorId: string; idTag: string };
    if (this.drafts.has(sessionId)) return; // duplicate delivery
    this.drafts.set(sessionId, {
      invoiceId: this.nextInvoiceId(),
      sessionId,
      connectorId,
      idTag,
      energyWh: 0,
      amount: 0,
      status: 'Draft',
    });
  }

  onSessionCompleted(event: IntegrationEvent): void {
    const { sessionId, connectorId, energyWh } = event.payload as { sessionId: string; connectorId: string; energyWh: number };
    const draft = this.drafts.get(sessionId) ?? this.onSessionStartedLate(sessionId, connectorId);
    // Same input -> same result: applying this twice is harmless.
    draft.energyWh = energyWh;
    draft.amount = Math.round((energyWh / 1000) * this.ratePerKwh * 100) / 100;
  }

  // "completed" may arrive before "started" (no cross-type ordering): still one draft per session.
  private onSessionStartedLate(sessionId: string, connectorId: string): DraftInvoice {
    const draft: DraftInvoice = { invoiceId: this.nextInvoiceId(), sessionId, connectorId, energyWh: 0, amount: 0, status: 'Draft' };
    this.drafts.set(sessionId, draft);
    return draft;
  }

  draftFor(sessionId: string): DraftInvoice | undefined {
    return this.drafts.get(sessionId);
  }

  all(): DraftInvoice[] {
    return [...this.drafts.values()];
  }
}
