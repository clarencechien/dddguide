#!/usr/bin/env node
// OCPP 1.6J simulator for the canonical afternoon at SITE-TPE-01 / CP-A12 (curriculum §1.6).
// Dependency-free. Emits CALL frames [2, uniqueId, action, payload] either as NDJSON on stdout
// (default) or POSTed one by one to --url (Day 6: your ACL endpoint, e.g. http://localhost:3000/ocpp/CP-A12).
//
//   node scripts/ocpp-sim/sim.mjs                       # NDJSON to stdout
//   node scripts/ocpp-sim/sim.mjs --pretty              # human readable
//   node scripts/ocpp-sim/sim.mjs --url http://localhost:3000/ocpp/CP-A12 [--delay 200]
//
// Note: StartTransaction.conf carries the transactionId the central system assigned. The reference
// ACL assigns 991 (-> session S-991); MeterValues/StopTransaction below use that number. If your
// ACL numbers transactions differently, read it from the StartTransaction response (--url mode does).

const DATE = '2025-05-20';
const at = (hhmmss) => `${DATE}T${hhmmss}+08:00`;
const CONNECTOR = 2; // CP-A12-2
const ID_TAG = 'TAG-MONTHLY-77';

const energy = (hhmmss, wh) => ({
  connectorId: CONNECTOR,
  transactionId: '$TX',
  meterValue: [{ timestamp: at(hhmmss), sampledValue: [{ value: String(wh), measurand: 'Energy.Active.Import.Register', unit: 'Wh' }] }],
});

export const MESSAGES = [
  ['BootNotification', { chargePointVendor: 'ACME', chargePointModel: 'AC22', chargePointSerialNumber: 'CP-A12', firmwareVersion: '1.6.3' }],
  ['StatusNotification', { connectorId: CONNECTOR, status: 'Available', errorCode: 'NoError', timestamp: at('14:00:00') }],
  ['Authorize', { idTag: ID_TAG }],
  ['StartTransaction', { connectorId: CONNECTOR, idTag: ID_TAG, meterStart: 0, timestamp: at('14:04:00') }],
  ['MeterValues', energy('14:13:00', 4000)],
  ['MeterValues', energy('14:22:00', 8000)],
  ['MeterValues', energy('14:31:00', 12400)],
  ['StopTransaction', { transactionId: '$TX', idTag: ID_TAG, meterStop: 12400, timestamp: at('14:31:00'), reason: 'Local' }],
  ['StatusNotification', { connectorId: CONNECTOR, status: 'Faulted', errorCode: 'GroundFailure', timestamp: at('18:10:00'), info: 'RCD trip' }],
  ['StatusNotification', { connectorId: CONNECTOR, status: 'Faulted', errorCode: 'GroundFailure', timestamp: at('18:10:08'), info: 'RCD trip (repeat)' }],
];

// Replace the '$TX' placeholder with the real transaction id (991 unless the central system said otherwise).
export function frames(transactionId = 991) {
  return MESSAGES.map(([action, payload], i) => {
    const withTx = JSON.parse(JSON.stringify(payload).replaceAll('"$TX"', String(transactionId)));
    return [2, `sim-${String(i + 1).padStart(3, '0')}`, action, withTx];
  });
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const url = opt('--url');
  const delay = Number(opt('--delay') ?? 0);
  const pretty = args.includes('--pretty');

  if (!url) {
    for (const frame of frames()) console.log(pretty ? JSON.stringify(frame, null, 2) : JSON.stringify(frame));
    return;
  }

  let transactionId = 991;
  for (let i = 0; i < MESSAGES.length; i++) {
    const frame = frames(transactionId)[i]; // re-render so a transactionId learned from StartTransaction.conf is used
    const action = frame[2];
    const body = JSON.stringify(frame);
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    const text = await res.text();
    console.log(`${action.padEnd(18)} -> ${res.status} ${text}`);
    if (action === 'StartTransaction' && res.ok) {
      try {
        const conf = JSON.parse(text);
        const tx = Array.isArray(conf) ? conf[2]?.transactionId : conf.transactionId;
        if (tx !== undefined) transactionId = tx;
      } catch {}
    }
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  }
}

if (process.argv[1] && process.argv[1].endsWith('sim.mjs')) main().catch((e) => { console.error(e); process.exit(1); });
