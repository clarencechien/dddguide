import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.ts';
import { Invoice } from '../../src/billing/Invoice.ts';

const T_1404 = '2025-05-20T14:04:00+08:00';
const T_1431 = '2025-05-20T14:31:00+08:00';

describe('BillingDraftConsumer (Day 5 B2)', () => {
  it('creates one draft invoice INV-778 for session S-991 with 12.4 kWh', async () => {
    const app = buildApp();
    await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 0, at: T_1404 });
    await app.charging.reportMeterValue({ sessionId: 'S-991', meterWh: 12400, at: T_1431 });
    await app.charging.stopCharging({ sessionId: 'S-991', stopReason: 'Local', at: T_1431 });
    await app.relayAll();

    expect(app.billing.all()).toHaveLength(1);
    expect(app.billing.draftFor('S-991')).toMatchObject({ invoiceId: 'INV-778', energyWh: 12400, amount: 99.2, status: 'Draft' });
  });

  it('is idempotent on sessionId: redelivering started + completed creates no second draft', async () => {
    const app = buildApp();
    await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 0, at: T_1404 });
    await app.charging.reportMeterValue({ sessionId: 'S-991', meterWh: 12400, at: T_1431 });
    await app.charging.stopCharging({ sessionId: 'S-991', stopReason: 'Local', at: T_1431 });
    await app.relayAll();

    for (const event of [...app.bus.delivered]) await app.bus.redeliver(event.eventId);

    expect(app.billing.all()).toHaveLength(1);
    expect(app.billing.draftFor('S-991')).toMatchObject({ invoiceId: 'INV-778', energyWh: 12400 });
  });

  it('handles completed arriving before started (no cross-type ordering) with still one draft', async () => {
    const app = buildApp();
    await app.charging.startCharging({ sessionId: 'S-991', connectorId: 'CP-A12-2', idTag: 'TAG-MONTHLY-77', meterStartWh: 0, at: T_1404 });
    await app.charging.reportMeterValue({ sessionId: 'S-991', meterWh: 12400, at: T_1431 });
    await app.charging.stopCharging({ sessionId: 'S-991', stopReason: 'Local', at: T_1431 });
    const [started, completed] = await app.chargingOutbox.pending();

    await app.bus.publish(completed);
    await app.bus.publish(started);

    expect(app.billing.all()).toHaveLength(1);
    expect(app.billing.draftFor('S-991')?.energyWh).toBe(12400);
  });

  it('R7 an issued invoice amount never changes; corrections are InvoiceAdjusted events', () => {
    const invoice = Invoice.issue('INV-778', 'S-991', 99.2, T_1431);
    invoice.adjust(-20, 'Disputed: charger stopped early', '2025-05-21T10:00:00+08:00');

    expect(invoice.amount).toBe(99.2);
    expect(invoice.total).toBeCloseTo(79.2);
    expect(invoice.pullEvents().map((e) => e.type)).toEqual(['InvoiceIssued', 'InvoiceAdjusted']);
    expect(() => invoice.adjust(-1, '  ', T_1431)).toThrow(/reason/);
  });
});
