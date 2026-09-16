#!/usr/bin/env node
// Drives the solutions/node in-memory stack through the canonical afternoon (see e2e.md)
// and prints a Parking / Charging / Billing / Ops state table. Exit 1 if the final state is wrong.
// No build step: Node 22 strips the TypeScript types on import.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { buildApp } = await import(join(root, 'solutions/node/src/app.ts'));
const { ParkingSession } = await import(join(root, 'solutions/node/src/parking/ParkingSession.ts'));
const { frames } = await import(join(root, 'scripts/ocpp-sim/sim.mjs'));

const app = buildApp({ validTags: ['TAG-MONTHLY-77', 'TAG-VISITOR-01'] });
const parking = new ParkingSession('P-441', 'ABC-1234', '2025-05-20T14:02:00+08:00');
const ocpp = Object.fromEntries(frames().map((f) => [f[1], f])); // sim-001 ... sim-010
const rows = [];

function snapshot(time, input) {
  const s991 = app.sessions.all().find((s) => s.sessionId === 'S-991');
  const charging = s991 ? `S-991 ${s991.status} (last ${s991.lastMeterWh} Wh)` : '—';
  const draft = app.billing.draftFor('S-991');
  const billing = draft ? `${draft.invoiceId} ${draft.status} ${draft.energyWh / 1000} kWh / ${draft.amount}` : '—';
  const ops = app.workOrders.all().map((w) => `${w.workOrderId} ${w.status}${w.technicianId ? ' → ' + w.technicianId : ''} dup=${w.duplicateReportCount}`).join(', ') || '—';
  rows.push({ time, input, parking: `P-441 ${parking.status}`, charging, billing, ops });
}

// 14:02 vehicle entered (Parking stub)
snapshot('14:02', 'VehicleEntered ABC-1234');
// 14:04 StartTransaction
await app.acl.handle(ocpp['sim-004']); await app.relayAll();
snapshot('14:04', 'StartTransaction TAG-MONTHLY-77');
// 14:05 R1: second card on the same connector
const [, , blocked] = await app.acl.handle([2, 'e2e-r1', 'StartTransaction', { connectorId: 2, idTag: 'TAG-VISITOR-01', meterStart: 0, timestamp: '2025-05-20T14:05:00+08:00' }]);
snapshot('14:05', `StartTransaction TAG-VISITOR-01 → ${blocked.idTagInfo.status}`);
// 14:13 / 14:22 meter values
await app.acl.handle(ocpp['sim-005']); snapshot('14:13', 'MeterValues 4000 Wh');
await app.acl.handle(ocpp['sim-006']); snapshot('14:22', 'MeterValues 8000 Wh');
// 14:31 final meter + stop
await app.acl.handle(ocpp['sim-007']); await app.acl.handle(ocpp['sim-008']); await app.relayAll();
snapshot('14:31', 'MeterValues 12400 Wh + StopTransaction');
// 14:33 manual release (R6)
parking.manualRelease('阿忠', '2025-05-20T14:33:00+08:00');
snapshot('14:33', 'ParkingManuallyReleased by 阿忠');
// 18:10:00 fault
await app.acl.handle(ocpp['sim-009']); await app.relayAll();
snapshot('18:10:00', 'StatusNotification Faulted GroundFailure');
// 18:10:08 duplicate fault (R5)
await app.acl.handle(ocpp['sim-010']); await app.relayAll();
snapshot('18:10:08', 'StatusNotification Faulted GroundFailure (again)');
// 18:12 broker redelivery (at-least-once)
const faulted = app.bus.deliveredOfType('charging.charger.faulted.v1')[0];
await app.bus.redeliver(faulted.eventId); await app.relayAll();
snapshot('18:12', 'redeliver charging.charger.faulted.v1');
// 18:18 technician verified repair
await app.faults.closeWorkOrder('WO-2208', 'Repaired', '2025-05-20T18:18:00+08:00', faulted.correlationId); await app.relayAll();
snapshot('18:18', 'WorkOrder closed: Repaired');

console.table(rows);

// ---- assertions (mirror the list in e2e.md) ----
const s991 = app.sessions.all().find((s) => s.sessionId === 'S-991');
const completed = app.bus.deliveredOfType('charging.session.completed.v1');
const count = (type) => app.bus.deliveredOfType(type).length;
const correlationIds = new Set(app.bus.delivered.filter((e) => e.type.startsWith('ops.')).map((e) => e.correlationId));
const checks = [
  ['S-991 Completed', s991?.status === 'Completed'],
  ['charging.session.completed.v1 energyWh 12400', completed[0]?.payload.energyWh === 12400],
  ['exactly one draft INV-778 with 12400 Wh', app.billing.all().length === 1 && app.billing.draftFor('S-991')?.invoiceId === 'INV-778' && app.billing.draftFor('S-991')?.energyWh === 12400],
  ['exactly one work order WO-2208, Closed, 1 duplicate report', app.workOrders.all().length === 1 && app.workOrders.all()[0].status === 'Closed' && app.workOrders.all()[0].duplicateReportCount === 1],
  ['ops.work_order.opened.v1 x1 / closed.v1 x1', count('ops.work_order.opened.v1') === 1 && count('ops.work_order.closed.v1') === 1],
  ['charging.session.started.v1 x1 / completed.v1 x1', count('charging.session.started.v1') === 1 && count('charging.session.completed.v1') === 1],
  ['all ops events share the fault correlationId', correlationIds.size === 1],
  ['P-441 released manually', parking.status === 'Released'],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
console.log(failed ? `\n${failed} check(s) failed` : '\nE2E afternoon complete: all checks passed');
process.exit(failed ? 1 : 0);
