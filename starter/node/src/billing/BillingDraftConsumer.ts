import type { InMemoryEventBus } from '../shared/EventBus.ts';
import type { IntegrationEvent } from '../shared/IntegrationEvent.ts';

export interface DraftInvoice {
  invoiceId: string; // INV-778
  sessionId: string; // S-991 — the dedup key (§1.8)
  connectorId: string;
  energyWh: number;
  amount: number;
  status: 'Draft';
}

// Day 5 B2: the smallest possible Billing consumer. It subscribes to
// charging.session.started.v1 / charging.session.completed.v1 and keeps ONE draft per sessionId,
// no matter how many times the bus redelivers the same event (at-least-once).
// It never calls back into Charging (customer-supplier: Billing is downstream).
export class BillingDraftConsumer {
  private readonly drafts = new Map<string, DraftInvoice>();

  subscribe(bus: InMemoryEventBus): void {
    throw new Error('TODO Day 5 B2: subscribe to started/completed');
  }

  onSessionStarted(event: IntegrationEvent): void {
    throw new Error('TODO Day 5 B2: create draft once per sessionId');
  }

  onSessionCompleted(event: IntegrationEvent): void {
    throw new Error('TODO Day 5 B2: set energyWh/amount; idempotent');
  }

  draftFor(sessionId: string): DraftInvoice | undefined {
    return this.drafts.get(sessionId);
  }

  all(): DraftInvoice[] {
    return [...this.drafts.values()];
  }
}
