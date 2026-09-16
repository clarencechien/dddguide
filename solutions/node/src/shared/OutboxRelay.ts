import type { Outbox } from './Outbox.ts';
import type { InMemoryEventBus } from './EventBus.ts';

// R8: the ONLY component that moves events from the Outbox to the bus.
// Runs after the unit of work committed (Day 6: a polling loop / cron; here: called explicitly).
// If publish throws we do not mark the row, so it is retried -> at-least-once.
export class OutboxRelay {
  private readonly outbox: Outbox;
  private readonly bus: InMemoryEventBus;

  constructor(outbox: Outbox, bus: InMemoryEventBus) {
    this.outbox = outbox;
    this.bus = bus;
  }

  async publishPending(): Promise<number> {
    const events = await this.outbox.pending();
    for (const event of events) {
      await this.bus.publish(event);
      await this.outbox.markPublished(event.eventId);
    }
    return events.length;
  }
}
