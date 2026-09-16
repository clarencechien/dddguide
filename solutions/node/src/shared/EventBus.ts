import type { IntegrationEvent } from './IntegrationEvent.ts';

export type EventHandler = (event: IntegrationEvent) => Promise<void> | void;

// Stand-in for a real broker (Kafka / RabbitMQ / SNS). Semantics we keep on purpose:
//  - at-least-once: the same event CAN be delivered again (`redeliver`), so every
//    consumer must be idempotent (Billing dedups on sessionId, AssetOps on chargerId+faultCode).
//  - no ordering guarantee across types is promised, even though this in-memory version is FIFO.
export class InMemoryEventBus {
  private readonly handlers = new Map<string, EventHandler[]>();
  readonly delivered: IntegrationEvent[] = []; // audit log, handy in tests

  subscribe(type: string, handler: EventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  async publish(event: IntegrationEvent): Promise<void> {
    this.delivered.push(event);
    for (const handler of this.handlers.get(event.type) ?? []) {
      await handler(event);
    }
  }

  // Simulates the broker re-sending an already delivered message (consumer crashed before ack,
  // network retry, relay restarted...). Use it in idempotency tests.
  async redeliver(eventId: string): Promise<void> {
    const event = this.delivered.find((e) => e.eventId === eventId);
    if (!event) throw new Error(`redeliver: unknown eventId ${eventId}`);
    await this.publish(event);
  }

  deliveredOfType(type: string): IntegrationEvent[] {
    return this.delivered.filter((e) => e.type === type);
  }
}
