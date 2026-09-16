# solutions/python — Day 4–5 參考解（Python 3.11 + pytest）

> 先看 `solutions/README.md` 的「卡住 20 分鐘再看」原則。

## 跑起來

```bash
cd solutions/python
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pytest                # 31 passed
python src/app.py     # 只是驗證組裝（composition root）能啟動
```

執行期零依賴（標準函式庫）。`scripts/e2e/run.py` 直接把 `src/` 加進 `sys.path` 跑整個下午。

## 目錄對照課程

| 路徑 | 天 | 內容 |
|---|---|---|
| `src/shared/` | 4–5 | `DomainEvent`、`IntegrationEvent` 信封（`to_json()` 輸出 camelCase 契約）、`Outbox` port + in-memory、`InMemoryEventBus`（`redeliver` 模擬至少一次）、`OutboxRelay`、`Clock`、`ids` |
| `src/charging/domain/` | 4 B1–B2 | `ChargingSession` 聚合（R1–R4）、`connector` / `id_tag` / `energy` 值物件、frozen dataclass 事件、錯誤 |
| `src/assetops/domain/` | 4 B3 | `WorkOrder` 聚合（R5 的「重複申告」在這裡記錄） |
| `src/charging/application/` | 5 B1 | `ChargingService`：一個命令一個方法；`_commit()` 同時寫聚合與 Outbox |
| `src/billing/` | 5 B2 | `BillingDraftConsumer`（以 `sessionId` 去重）；`Invoice`（R7） |
| `src/assetops/application/` | 5 B3 | `FaultProcessManager`：`charging.charger.faulted.v1` → 開工單 → 派工 stub → 關單 |
| `src/adapters/ocpp/` | 6 B1 | `OcppAcl`：四種 OCPP 訊息 → 領域命令 |
| `src/adapters/persistence/` | 4 B3 / 6 B2 | in-memory repository、授權白名單、Dispatch stub |
| `src/parking/` | — | R6 的最小 stub |
| `src/app.py` | 5–6 | 組裝根 `build_app()` |

## 與 Node 版的對應

- 領域內部用 snake_case（`session_id`），跨 context 的整合事件 payload 用 camelCase（`sessionId`）——契約是語言中立的，`contracts/` 只有一份。
- Node 版的 repository 是 async；Python 版是同步（SQLite 也是同步 API），Day 6 用 FastAPI 時直接呼叫即可。
- 其餘設計決定（拒絕是事件、授權結果由 port 決定、每 context 一個 Outbox、`correlationId`/`causationId` 血緣）與 `solutions/node/README.md` 相同。
