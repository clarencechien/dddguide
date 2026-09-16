# starter/node — TypeScript + vitest 起手式

## 跑起來

```bash
cd starter/node
npm install
npm test          # 現在應該是：1 failed (R1), 4 skipped, 1 passed
npm run test:watch
npm run typecheck # tsc --noEmit（型別檢查，選配）
```

第一次執行看到 **R1 紅燈**是正常的——那就是 Day 4 的起點。

## 目錄是什麼意思（六角架構）

```
src/
├── shared/                  跨 context 共用的小東西：DomainEvent、IntegrationEvent 信封、
│                            Outbox（port + in-memory）、InMemoryEventBus（有 redeliver）、Clock、Ids
├── charging/                核心域 Charging
│   ├── domain/              聚合 ChargingSession（骨架，TODO）、值物件 Connector / IdTag / Energy、
│   │                        領域事件 events.ts、錯誤 errors.ts       ← Day 4 B1–B2
│   └── application/         ports.ts（Repository / AuthorizationService）、commands.ts、
│                            ChargingService（骨架，TODO）               ← Day 5 B1
├── assetops/domain/         WorkOrder 聚合（骨架）+ 事件                 ← Day 4 B3
├── billing/                 BillingDraftConsumer（骨架）                 ← Day 5 B2
├── adapters/
│   ├── ocpp/OcppAcl.ts      OCPP 1.6J → 領域命令的防腐層（骨架）          ← Day 6 B1
│   ├── http/                HTTP API 放這裡（README 有建議端點）          ← Day 6 B1
│   └── persistence/         InMemoryChargingSessionRepository（可用）；SQLite/Postgres ← Day 6 B2
└── app.ts                   組裝根（composition root，TODO）             ← Day 5–6
test/                        與 src 對映；測試以規則命名（R1…R8）
```

## 每天的工作落在哪

| 天 | 做什麼 | 檔案 |
|---|---|---|
| Day 4 B1–B2 | R1 → R2 → R3 → R4，一次一條紅綠重構 | `src/charging/domain/ChargingSession.ts`、`test/charging/ChargingSession.test.ts`（把 `.skip` 一個一個拿掉） |
| Day 4 B3 | WorkOrder 聚合 + R5；Repository port + in-memory adapter | `src/assetops/domain/WorkOrder.ts`、`test/assetops/WorkOrder.test.ts`、`src/adapters/persistence/` |
| Day 5 B1 | 命令處理器 + Outbox 同寫 | `src/charging/application/ChargingService.ts` |
| Day 5 B2 | 整合事件契約（`contracts/`）、冪等的 Billing 消費者 | `src/billing/BillingDraftConsumer.ts` |
| Day 5 B3 | Process Manager：ChargerFaulted → 工單 → 派工 stub → 關單 | 新增 `src/assetops/application/FaultProcessManager.ts` |
| Day 6 | HTTP API、OCPP ACL、持久化、`scripts/e2e` | `src/adapters/**`、`src/app.ts` |

## 規矩

- 聚合裡**不准** I/O：沒有 repository、bus、`new Date()`、`fetch`。事件先 `record()`，由應用層 `pullEvents()` 交給 Outbox（R8）。
- 業務上的「不行」（R1/R2/R3）是 **事件**（`ChargingStartRejected`、`MeterValueRejected`），不是 exception；呼叫端用錯狀態（R4 對 Idle 呼叫 stop）才丟 `InvalidStateError`。
- 事件欄位用通用語言（`sessionId`、`connectorId`、`meterWh`），不用 OCPP 名字（`transactionId`、`meterStart`）。
- 卡住 ≥ 20 分鐘再開 `solutions/node`。
