import json

from app import build_app


def call(action, payload):
    return [2, f"u-{action}", action, payload]


START = call("StartTransaction", {"connectorId": 2, "idTag": "TAG-MONTHLY-77", "meterStart": 0, "timestamp": "2025-05-20T14:04:00+08:00"})
METER = call("MeterValues", {"connectorId": 2, "transactionId": 991, "meterValue": [{"timestamp": "2025-05-20T14:13:00+08:00", "sampledValue": [{"value": "4000", "measurand": "Energy.Active.Import.Register", "unit": "Wh"}]}]})
STOP = call("StopTransaction", {"transactionId": 991, "idTag": "TAG-MONTHLY-77", "meterStop": 12400, "timestamp": "2025-05-20T14:31:00+08:00", "reason": "Local"})
FAULT = call("StatusNotification", {"connectorId": 2, "status": "Faulted", "errorCode": "GroundFailure", "timestamp": "2025-05-20T18:10:00+08:00"})


def test_translates_the_four_OCPP_messages_into_domain_commands():
    app = build_app()

    assert app.acl.handle(call("Authorize", {"idTag": "TAG-MONTHLY-77"})) == [3, "u-Authorize", {"idTagInfo": {"status": "Accepted"}}]
    assert app.acl.handle(START)[2] == {"transactionId": 991, "idTagInfo": {"status": "Accepted"}}
    app.acl.handle(METER)
    app.acl.handle(STOP)
    app.acl.handle(FAULT)

    pending = app.charging_outbox.pending()
    assert [e.type for e in pending] == ["charging.session.started.v1", "charging.session.completed.v1", "charging.charger.faulted.v1"]
    assert pending[1].payload["sessionId"] == "S-991"
    assert pending[1].payload["connectorId"] == "CP-A12-2"
    assert pending[1].payload["energyWh"] == 12400


def test_no_OCPP_field_names_leak_into_domain_or_integration_events():
    app = build_app()
    for frame in (START, STOP, FAULT):
        app.acl.handle(frame)

    serialized = json.dumps([e.to_json() for e in app.charging_outbox.pending()])
    for ocpp_field in ("transactionId", "meterStart", "meterStop", "sampledValue", "measurand", "errorCode", "timestamp", "StatusNotification"):
        assert f'"{ocpp_field}"' not in serialized


def test_second_StartTransaction_on_an_occupied_connector_is_answered_Blocked_R1_seen_from_OCPP():
    app = build_app(valid_tags=["TAG-MONTHLY-77", "TAG-VISITOR-01"])
    app.acl.handle(START)
    second = app.acl.handle(call("StartTransaction", {"connectorId": 2, "idTag": "TAG-VISITOR-01", "meterStart": 0, "timestamp": "2025-05-20T14:05:00+08:00"}))
    assert second[2]["idTagInfo"] == {"status": "Blocked"}
