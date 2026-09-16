#!/usr/bin/env python3
"""Drives the solutions/python in-memory stack through the canonical afternoon (see e2e.md)
and prints a Parking / Charging / Billing / Ops state table. Exit 1 if the final state is wrong."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "solutions" / "python" / "src"))
sys.path.insert(0, str(ROOT / "scripts" / "ocpp-sim"))

from app import build_app  # noqa: E402
from parking.parking_session import ParkingSession  # noqa: E402
from sim import frames  # noqa: E402

app = build_app(valid_tags=["TAG-MONTHLY-77", "TAG-VISITOR-01"])
parking = ParkingSession("P-441", "ABC-1234", "2025-05-20T14:02:00+08:00")
ocpp = {f[1]: f for f in frames()}  # sim-001 ... sim-010
rows: list[tuple[str, ...]] = []


def snapshot(time: str, inp: str) -> None:
    s991 = app.sessions.find_by_id("S-991")
    charging = f"S-991 {s991.status.value} (last {s991.last_meter_wh} Wh)" if s991 else "—"
    draft = app.billing.draft_for("S-991")
    billing = f"{draft.invoice_id} {draft.status} {draft.energy_wh / 1000} kWh / {draft.amount}" if draft else "—"
    ops = ", ".join(f"{w.work_order_id} {w.status.value}{' → ' + w.technician_id if w.technician_id else ''} dup={w.duplicate_report_count}" for w in app.work_orders.all()) or "—"
    rows.append((time, inp, f"P-441 {parking.status}", charging, billing, ops))


snapshot("14:02", "VehicleEntered ABC-1234")
app.acl.handle(ocpp["sim-004"]); app.relay_all()
snapshot("14:04", "StartTransaction TAG-MONTHLY-77")
blocked = app.acl.handle([2, "e2e-r1", "StartTransaction", {"connectorId": 2, "idTag": "TAG-VISITOR-01", "meterStart": 0, "timestamp": "2025-05-20T14:05:00+08:00"}])
snapshot("14:05", f"StartTransaction TAG-VISITOR-01 → {blocked[2]['idTagInfo']['status']}")
app.acl.handle(ocpp["sim-005"]); snapshot("14:13", "MeterValues 4000 Wh")
app.acl.handle(ocpp["sim-006"]); snapshot("14:22", "MeterValues 8000 Wh")
app.acl.handle(ocpp["sim-007"]); app.acl.handle(ocpp["sim-008"]); app.relay_all()
snapshot("14:31", "MeterValues 12400 Wh + StopTransaction")
parking.manual_release("阿忠", "2025-05-20T14:33:00+08:00")
snapshot("14:33", "ParkingManuallyReleased by 阿忠")
app.acl.handle(ocpp["sim-009"]); app.relay_all()
snapshot("18:10:00", "StatusNotification Faulted GroundFailure")
app.acl.handle(ocpp["sim-010"]); app.relay_all()
snapshot("18:10:08", "StatusNotification Faulted GroundFailure (again)")
faulted = app.bus.delivered_of_type("charging.charger.faulted.v1")[0]
app.bus.redeliver(faulted.event_id); app.relay_all()
snapshot("18:12", "redeliver charging.charger.faulted.v1")
app.faults.close_work_order("WO-2208", "Repaired", "2025-05-20T18:18:00+08:00", faulted.correlation_id); app.relay_all()
snapshot("18:18", "WorkOrder closed: Repaired")

headers = ("time", "input", "Parking", "Charging", "Billing", "Ops")
widths = [max(len(str(r[i])) for r in [headers, *rows]) for i in range(len(headers))]
for r in [headers, *rows]:
    print("  ".join(str(c).ljust(w) for c, w in zip(r, widths)))
print()

# ---- assertions (mirror the list in e2e.md) ----
s991 = app.sessions.find_by_id("S-991")
completed = app.bus.delivered_of_type("charging.session.completed.v1")
count = lambda t: len(app.bus.delivered_of_type(t))  # noqa: E731
wos = app.work_orders.all()
draft = app.billing.draft_for("S-991")
ops_correlations = {e.correlation_id for e in app.bus.delivered if e.type.startswith("ops.")}
checks = [
    ("S-991 Completed", s991 is not None and s991.status.value == "Completed"),
    ("charging.session.completed.v1 energyWh 12400", bool(completed) and completed[0].payload["energyWh"] == 12400),
    ("exactly one draft INV-778 with 12400 Wh", len(app.billing.all()) == 1 and draft is not None and draft.invoice_id == "INV-778" and draft.energy_wh == 12400),
    ("exactly one work order WO-2208, Closed, 1 duplicate report", len(wos) == 1 and wos[0].status.value == "Closed" and wos[0].duplicate_report_count == 1),
    ("ops.work_order.opened.v1 x1 / closed.v1 x1", count("ops.work_order.opened.v1") == 1 and count("ops.work_order.closed.v1") == 1),
    ("charging.session.started.v1 x1 / completed.v1 x1", count("charging.session.started.v1") == 1 and count("charging.session.completed.v1") == 1),
    ("all ops events share the fault correlationId", len(ops_correlations) == 1),
    ("P-441 released manually", parking.status == "Released"),
]
failed = 0
for name, ok in checks:
    print(f"{'PASS' if ok else 'FAIL'}  {name}")
    failed += 0 if ok else 1
print(f"\n{failed} check(s) failed" if failed else "\nE2E afternoon complete: all checks passed")
sys.exit(1 if failed else 0)
