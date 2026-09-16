import pytest

from app import build_app
from billing.invoice import Invoice
from charging.application.commands import ReportMeterValue, StartCharging, StopCharging

T_1404 = "2025-05-20T14:04:00+08:00"
T_1431 = "2025-05-20T14:31:00+08:00"


def run_s991(app):
    app.charging.start_charging(StartCharging("S-991", "CP-A12-2", "TAG-MONTHLY-77", 0, T_1404))
    app.charging.report_meter_value(ReportMeterValue("S-991", 12400, T_1431))
    app.charging.stop_charging(StopCharging("S-991", "Local", T_1431))


def test_creates_one_draft_invoice_INV_778_for_session_S_991_with_12_4_kwh():
    app = build_app()
    run_s991(app)
    app.relay_all()

    assert len(app.billing.all()) == 1
    draft = app.billing.draft_for("S-991")
    assert (draft.invoice_id, draft.energy_wh, draft.amount, draft.status) == ("INV-778", 12400, 99.2, "Draft")


def test_idempotent_on_session_id_redelivering_started_and_completed_creates_no_second_draft():
    app = build_app()
    run_s991(app)
    app.relay_all()

    for event in list(app.bus.delivered):
        app.bus.redeliver(event.event_id)

    assert len(app.billing.all()) == 1
    assert app.billing.draft_for("S-991").invoice_id == "INV-778"
    assert app.billing.draft_for("S-991").energy_wh == 12400


def test_handles_completed_arriving_before_started_with_still_one_draft():
    app = build_app()
    run_s991(app)
    started, completed = app.charging_outbox.pending()

    app.bus.publish(completed)
    app.bus.publish(started)

    assert len(app.billing.all()) == 1
    assert app.billing.draft_for("S-991").energy_wh == 12400


def test_R7_issued_invoice_amount_never_changes_corrections_are_InvoiceAdjusted_events():
    invoice = Invoice.issue("INV-778", "S-991", 99.2, T_1431)
    invoice.adjust(-20, "Disputed: charger stopped early", "2025-05-21T10:00:00+08:00")

    assert invoice.amount == 99.2
    assert invoice.total == pytest.approx(79.2)
    assert [e.type for e in invoice.pull_events()] == ["InvoiceIssued", "InvoiceAdjusted"]
    with pytest.raises(AttributeError):
        invoice.amount = 1  # type: ignore[misc]
    with pytest.raises(ValueError, match="reason"):
        invoice.adjust(-1, "  ", T_1431)
