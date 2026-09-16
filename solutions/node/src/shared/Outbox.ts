import type { IntegrationEvent } from './IntegrationEvent.ts';

// Port (R8). The application service writes the aggregate AND its integration events
// through this port inside one unit of work. Nothing here talks to a broker.
export interface Outbox {
  add(event: IntegrationEvent): Promise<void>;
  pending(): Promise<IntegrationEvent[]>;
  markPublished(eventId: string): Promise<void>;
}

export class InMemoryOutbox implements Outbox {
  private readonly rows = new Map<string, { event: IntegrationEvent; publishedAt?: string }>();

  async add(event: IntegrationEvent): Promise<void> {
    this.rows.set(event.eventId, { event });
  }

  async pending(): Promise<IntegrationEvent[]> {
    return [...this.rows.values()].filter((r) => !r.publishedAt).map((r) => r.event);
  }

  async markPublished(eventId: string): Promise<void> {
    const row = this.rows.get(eventId);
    if (row) row.publishedAt = new Date().toISOString();
  }

  // Test helper: everything ever written, published or not.
  all(): IntegrationEvent[] {
    return [...this.rows.values()].map((r) => r.event);
  }
}
