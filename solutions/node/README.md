# solutions/node — Day 4–5 參考解（TypeScript）

> 先看 `solutions/README.md` 的「卡住 20 分鐘再看」原則。

## 跑起來

```bash
cd solutions/node
npm install
npm test            # 31 tests, all green
npm run typecheck   # tsc --noEmit
npm run dev         # 只是驗證組裝（composition root）能啟動
```

執行期零依賴：`vitest` 與 `typescript` 只是 devDependencies。`scripts/e2e/run.mjs` 直接用 Node 22 的原生 type stripping 匯入 `src/app.ts`，不需要 build。

## 目錄對照課程

| 路徑 | 天 | 內容 |
|---|---|---|
| `src/shared/` | 4–5 | DomainEvent、IntegrationEvent 信封、Outbox port + InMemory、InMemoryEventBus（`redeliver` 模擬至少一次）、OutboxRelay、Clock、Ids |
| `src/charging/domain/` | 4 B1–B2 | `ChargingSession` 聚合（R1–R4）、Connector / IdTag / Energy 值物件、領域事件、錯誤 |
| `src/assetops/domain/` | 4 B3 | `WorkOrder` 聚合（R5 的「重複申告」在這裡記錄） |
| `src/charging/application/` | 5 B1 | `ChargingService`：一個命令一個方法；`commit()` 同時寫聚合與 Outbox（unit of work） |
| `src/billing/` | 5 B2 | `BillingDraftConsumer`（以 `sessionId` 去重的冪等消費者）；`Invoice`（R7） |
| `src/assetops/application/` | 5 B3 | `FaultProcessManager`：`charging.charger.faulted.v1` → 開工單 → 派工 stub → 關單 |
| `src/adapters/ocpp/` | 6 B1 | `OcppAcl`：四種 OCPP 訊息 → 領域命令；OCPP 欄位名到此為止 |
| `src/adapters/persistence/` | 4 B3 / 6 B2 | in-memory repository、授權白名單、Dispatch stub |
| `src/parking/` | — | R6 的最小 stub（Parking 不在 MVP1 範圍） |
| `src/app.ts` | 5–6 | 組裝根（composition root）：唯一知道具體 adapter 的地方 |

## 幾個刻意的設計決定

1. **業務上的「不行」是事件，不是例外。** R1/R2/R3 都記錄 `*Rejected` 事件，因為小美與老陳在乎「被拒絕了幾次」；R4 對 Idle 會話呼叫 Stop 是呼叫端的錯，丟 `InvalidStateError`。
2. **授權結果由 port 決定，聚合只收布林值。** 聚合不做 I/O（R8 的精神），所以 `AuthorizationService.isAuthorized()` 在應用層呼叫，把結果傳進 `start()`。
3. **R5 的查找在 process manager，記錄在聚合。** 「同一樁同一故障碼是否已有開放工單」需要跨聚合查詢，所以由 `WorkOrderRepository.findOpenByFault()` 負責；聚合只負責 `appendDuplicateReport()`。
4. **每個 context 一個 Outbox。** `app.ts` 為 Charging 與 AssetOps 各配一個 `InMemoryOutbox`，`relayAll()` 反覆抽乾直到沒有新事件。
5. **信封的 `correlationId` 貫穿整個下午；`causationId` 指向直接原因。** 工單事件的 `causationId` 就是 `charging.charger.faulted.v1` 的 `eventId`。
