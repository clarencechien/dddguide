import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '../../src/shared/EventBus.ts';
import { createIntegrationEvent } from '../../src/shared/IntegrationEvent.ts';

describe('InMemoryEventBus', () => {
  it('delivers to subscribers and can redeliver (at-least-once)', async () => {
    const bus = new InMemoryEventBus();
    const seen: string[] = [];
    bus.subscribe('charging.session.started.v1', (e) => {
      seen.push(e.eventId);
    });

    const event = createIntegrationEvent({
      type: 'charging.session.started.v1',
      producer: 'charging',
      occurredAt: '2025-05-20T14:04:00+08:00',
      correlationId: 'corr-1',
      causationId: 'corr-1',
      payload: { sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', startedAt: '2025-05-20T14:04:00+08:00' },
    });
    await bus.publish(event);
    await bus.redeliver(event.eventId);

    expect(seen).toEqual([event.eventId, event.eventId]); // same message twice: consumers must cope
    expect(bus.delivered).toHaveLength(2);
    await expect(bus.redeliver('nope')).rejects.toThrow(/unknown eventId/);
  });
});
