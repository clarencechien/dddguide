import type { DomainEvent } from '../shared/DomainEvent.ts';

// R7: once issued, the amount never changes in place. Corrections are new facts (InvoiceAdjusted).
export interface InvoiceIssued extends DomainEvent {
  type: 'InvoiceIssued';
  invoiceId: string;
  sessionId: string;
  amount: number;
}
export interface InvoiceAdjusted extends DomainEvent {
  type: 'InvoiceAdjusted';
  invoiceId: string;
  delta: number;
  reason: string;
}
export type InvoiceEvent = InvoiceIssued | InvoiceAdjusted;

export class Invoice {
  private events: InvoiceEvent[] = [];
  private readonly adjustments: Array<{ delta: number; reason: string }> = [];

  readonly invoiceId: string;
  readonly sessionId: string;
  readonly amount: number; // readonly on purpose: the issued amount is history

  private constructor(invoiceId: string, sessionId: string, amount: number) {
    this.invoiceId = invoiceId;
    this.sessionId = sessionId;
    this.amount = amount;
  }

  static issue(invoiceId: string, sessionId: string, amount: number, at: string): Invoice {
    const invoice = new Invoice(invoiceId, sessionId, amount);
    invoice.events.push({ type: 'InvoiceIssued', invoiceId, sessionId, amount, occurredAt: at });
    return invoice;
  }

  adjust(delta: number, reason: string, at: string): void {
    if (!reason.trim()) throw new Error('An adjustment needs a reason');
    this.adjustments.push({ delta, reason });
    this.events.push({ type: 'InvoiceAdjusted', invoiceId: this.invoiceId, delta, reason, occurredAt: at });
  }

  get total(): number {
    return this.adjustments.reduce((sum, a) => sum + a.delta, this.amount);
  }

  pullEvents(): InvoiceEvent[] {
    const pulled = this.events;
    this.events = [];
    return pulled;
  }
}
