# starter/python — Python 3.11 + pytest 起手式

## 跑起來

```bash
cd starter/python
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pytest            # 現在應該是：1 failed (R1), 4 skipped, 1 passed
pytest -x -q      # 一紅就停，適合 TDD 節奏
```

第一次執行看到 **R1 紅燈**是正常的——那就是 Day 4 的起點。`pyproject.toml` 已把 `src/` 加進 `pythonpath`，測試直接 `from charging.domain... import ...`。

## 目錄是什麼意思（六角架構）

```
src/
├── shared/                  跨 context 共用：domain_event、integration_event 信封（to_json 輸出 camelCase）、
│                            outbox（port + in-memory）、event_bus（有 redeliver）、clock、ids
├── charging/                核心域 Charging
│   ├── domain/              聚合 charging_session.py（骨架，TODO）、值物件 connector / id_tag / energy、
│   │                        事件 events.py（frozen dataclass）、errors.py          ← Day 4 B1–B2
│   └── application/         ports.py（Protocol）、commands.py、charging_service.py（骨架）  ← Day 5 B1
├── assetops/domain/         work_order.py 聚合（骨架）+ events.py                     ← Day 4 B3
├── billing/                 billing_draft_consumer.py（骨架）                          ← Day 5 B2
├── adapters/
│   ├── ocpp/ocpp_acl.py     OCPP 1.6J → 領域命令的防腐層（骨架）                     ← Day 6 B1
│   ├── http/                FastAPI 放這裡（README 有建議端點；requirements.txt 解除註解）← Day 6 B1
│   └── persistence/         in_memory_charging_session_repository.py（可用）；SQLite ← Day 6 B2
└── app.py                   組裝根 build_app()（TODO）                                ← Day 5–6
tests/                       與 src 對映；測試函式以規則命名（test_R1_…）
```

## 每天的工作落在哪

| 天 | 做什麼 | 檔案 |
|---|---|---|
| Day 4 B1–B2 | R1 → R2 → R3 → R4，一次一條紅綠重構 | `src/charging/domain/charging_session.py`、`tests/charging/test_charging_session.py`（把 `skip` 一個一個拿掉） |
| Day 4 B3 | WorkOrder 聚合 + R5；Repository port + in-memory adapter | `src/assetops/domain/work_order.py`、`tests/assetops/test_work_order.py`、`src/adapters/persistence/` |
| Day 5 B1 | 命令處理器 + Outbox 同寫 | `src/charging/application/charging_service.py` |
| Day 5 B2 | 整合事件契約（`contracts/`）、冪等的 Billing 消費者 | `src/billing/billing_draft_consumer.py` |
| Day 5 B3 | Process Manager：ChargerFaulted → 工單 → 派工 stub → 關單 | 新增 `src/assetops/application/fault_process_manager.py` |
| Day 6 | HTTP API、OCPP ACL、持久化、`scripts/e2e` | `src/adapters/**`、`src/app.py` |

## 規矩

- 聚合裡**不准** I/O：沒有 repository、bus、`datetime.now()`、`requests`。事件先 `_record()`，由應用層 `pull_events()` 交給 Outbox（R8）。
- 業務上的「不行」（R1/R2/R3）是 **事件**（`ChargingStartRejected`、`MeterValueRejected`），不是 exception；呼叫端用錯狀態（R4 對 Idle 呼叫 stop）才 raise `InvalidStateError`。
- 事件欄位用通用語言（`session_id`、`connector_id`、`meter_wh`），不用 OCPP 名字（`transaction_id`、`meter_start`）。
- 卡住 ≥ 20 分鐘再開 `solutions/python`。
