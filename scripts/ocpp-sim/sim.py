#!/usr/bin/env python3
"""OCPP 1.6J simulator for the canonical afternoon at SITE-TPE-01 / CP-A12 (curriculum §1.6).

Dependency-free (stdlib only). Emits CALL frames [2, uniqueId, action, payload] as NDJSON on stdout
(default) or POSTs them one by one to --url (Day 6: your ACL endpoint).

    python scripts/ocpp-sim/sim.py
    python scripts/ocpp-sim/sim.py --pretty
    python scripts/ocpp-sim/sim.py --url http://localhost:8000/ocpp/CP-A12 [--delay 0.2]
"""
import argparse
import copy
import json
import sys
import time
import urllib.request

DATE = "2025-05-20"
CONNECTOR = 2  # CP-A12-2
ID_TAG = "TAG-MONTHLY-77"
TX = "$TX"  # placeholder for the transactionId assigned by the central system (991 -> S-991)


def at(hhmmss: str) -> str:
    return f"{DATE}T{hhmmss}+08:00"


def energy(hhmmss: str, wh: int) -> dict:
    return {
        "connectorId": CONNECTOR,
        "transactionId": TX,
        "meterValue": [{"timestamp": at(hhmmss), "sampledValue": [{"value": str(wh), "measurand": "Energy.Active.Import.Register", "unit": "Wh"}]}],
    }


MESSAGES = [
    ("BootNotification", {"chargePointVendor": "ACME", "chargePointModel": "AC22", "chargePointSerialNumber": "CP-A12", "firmwareVersion": "1.6.3"}),
    ("StatusNotification", {"connectorId": CONNECTOR, "status": "Available", "errorCode": "NoError", "timestamp": at("14:00:00")}),
    ("Authorize", {"idTag": ID_TAG}),
    ("StartTransaction", {"connectorId": CONNECTOR, "idTag": ID_TAG, "meterStart": 0, "timestamp": at("14:04:00")}),
    ("MeterValues", energy("14:13:00", 4000)),
    ("MeterValues", energy("14:22:00", 8000)),
    ("MeterValues", energy("14:31:00", 12400)),
    ("StopTransaction", {"transactionId": TX, "idTag": ID_TAG, "meterStop": 12400, "timestamp": at("14:31:00"), "reason": "Local"}),
    ("StatusNotification", {"connectorId": CONNECTOR, "status": "Faulted", "errorCode": "GroundFailure", "timestamp": at("18:10:00"), "info": "RCD trip"}),
    ("StatusNotification", {"connectorId": CONNECTOR, "status": "Faulted", "errorCode": "GroundFailure", "timestamp": at("18:10:08"), "info": "RCD trip (repeat)"}),
]


def frames(transaction_id: int = 991) -> list:
    out = []
    for i, (action, payload) in enumerate(MESSAGES, start=1):
        p = copy.deepcopy(payload)
        if p.get("transactionId") == TX:
            p["transactionId"] = transaction_id
        out.append([2, f"sim-{i:03d}", action, p])
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", help="POST each frame as JSON to this URL instead of printing")
    parser.add_argument("--delay", type=float, default=0.0, help="seconds between frames in --url mode")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    if not args.url:
        for frame in frames():
            print(json.dumps(frame, indent=2 if args.pretty else None, ensure_ascii=False))
        return

    transaction_id = 991
    for i, (action, payload) in enumerate(MESSAGES, start=1):
        frame = frames(transaction_id)[i - 1]
        req = urllib.request.Request(args.url, data=json.dumps(frame).encode(), headers={"content-type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req) as res:
                text = res.read().decode()
                status = res.status
        except urllib.error.HTTPError as e:
            text, status = e.read().decode(), e.code
        print(f"{action:<18} -> {status} {text}")
        if action == "StartTransaction" and status < 300:
            try:
                conf = json.loads(text)
                tx = conf[2].get("transactionId") if isinstance(conf, list) else conf.get("transactionId")
                if tx is not None:
                    transaction_id = tx
            except (ValueError, AttributeError, IndexError):
                pass
        if args.delay:
            time.sleep(args.delay)


if __name__ == "__main__":
    sys.exit(main())
