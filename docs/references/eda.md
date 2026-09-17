# 事件驅動架構（Event-Driven Architecture）

> Day 5 全天的方法論。交付物：`workshop/day5/event-flow.md`、`src/{charging/application,billing,assetops/application}/**` 測試全綠、整合事件通過 `contracts/validate.mjs`。用 `/event-contract` 審查。
> 程式碼對齊 `starter/` 與 `solutions/` 的名字：`ChargingService.commit`、`OutboxRelay`、`InMemoryEventBus.redeliver`、`BillingDraftConsumer`、`FaultProcessManager`。

## 讀完你會拿到

- 領域事件與整合事件的差別，以及一個變成另一個的那一行程式碼在哪。
- 信封（envelope）八個欄位各是幹什麼的，版本怎麼升。
- Transactional Outbox + relay 的完整機制，以及為什麼它是 R8 的實作。
- 至少一次投遞 + 冪等消費者：Billing 與 AssetOps 各自的去重鍵，以及 `redeliver()` 怎麼測。
- 「故障 → 工單 → 派工 → 關單」的 Process Manager。
- 三個反模式的樣子，以及整合事件契約 v1 完整表。

---

## 1. 為什麼存在

BPR 的第四原則（以事件連接平行活動）、DDD 的最終一致性（Vernon 規則 4）、場站要在總部斷線時活著（curriculum §1.1）——三件事的工程答案都是同一個：**用事件而不是呼叫來連接 context**。

呼叫（RPC / REST）的問題不是慢，是**耦合了可用性**：Charging 在 Stop 時呼叫 Billing，Billing 掛了 Stop 就失敗，車主拔不了槍。事件的做法：Charging 記錄 `ChargingCompleted`，寫進 Outbox，commit，回應車主。Billing 什麼時候醒來什麼時候算。

代價是**複雜度移到了別的地方**：重送、順序、冪等、版本。本文就是講那些地方。

---

## 2. 領域事件 vs 整合事件

| | 領域事件（Domain Event） | 整合事件（Integration Event） |
|---|---|---|
| 作用域 | 一個 Bounded Context 內 | 跨 context |
| 語言 | 該 context 的通用語言 | Published Language，只有 JSON 基本型別 |
| 穩定性 | 可以隨重構改 | 是契約；改要升版本 |
| 形狀 | `{ type, occurredAt, …欄位 }`（`shared/DomainEvent.ts`） | 信封八欄位 + `payload`（`shared/IntegrationEvent.ts`） |
| 例子 | `ChargingCompleted{sessionId, energyWh: 12400, …}` | `charging.session.completed.v1{payload:{sessionId, energyWh: 12400, …}}` |
| 誰產生 | 聚合（`record`） | 應用服務在 commit 時 map 出來 |
| 誰消費 | 同 context 內的政策 / 讀模型 | 其他 context 的消費者 |
| 存哪 | 聚合的 `events` 陣列 | Outbox → bus |

**轉換點**只有一個：應用服務的 `commit`。

```ts
// charging/application/ChargingService.ts（Day 5 B1 你要填的）
private async commit(session: ChargingSession, cmd: { correlationId?: string; causationId?: string }): Promise<ChargingEvent[]> {
  const events = session.pullEvents();
  await this.sessions.save(session);                                    // 同一個 unit of work
  for (const e of events) {
    const integration = toIntegrationEvent(e, cmd);                     // ChargingCompleted → charging.session.completed.v1；拒絕事件回 undefined
    if (integration) await this.outbox.add(integration);
  }
  return events;
}
```

對照表：

| 領域事件 | 整合事件 | 備註 |
|---|---|---|
| `ChargingStarted` | `charging.session.started.v1` | |
| `ChargingCompleted` | `charging.session.completed.v1` | |
| `ChargerFaulted` | `charging.charger.faulted.v1` | |
| `EnergyMetered` | （無） | Billing 不需要每筆計量（T4 陷阱） |
| `MeterValueRejected`、`ChargingStartRejected` | （無，MVP1） | 內部監控；Sprint 2 可考慮 |
| `WorkOrderOpened` | `ops.work_order.opened.v1` | |
| `WorkOrderClosed` | `ops.work_order.closed.v1` | |
| `DuplicateFaultReported`、`TechnicianAssigned` | （無） | AssetOps 內部；不對帳務發「技術員已出發」 |
| `VehicleExited(releaseMode=Manual)`（由 `ParkingManuallyReleased` 伴隨） | `parking.session.closed.v1(releaseMode=Manual)` | Parking stub |

---

## 3. 信封（Envelope）

curriculum §1.8 定義八個欄位；`contracts/envelope.schema.json` 是機器可讀版本：

```json
{
  "eventId": "11111111-1111-4111-8111-111111111103",
  "type": "charging.session.completed.v1",
  "version": 1,
  "occurredAt": "2025-05-20T14:31:00+08:00",
  "producer": "charging",
  "correlationId": "6f1d2c3b-0000-4000-8000-000000000441",
  "causationId": "cmd-stop-charging",
  "payload": {
    "sessionId": "S-991", "connectorId": "CP-A12-2", "energyWh": 12400,
    "startedAt": "2025-05-20T14:04:00+08:00", "endedAt": "2025-05-20T14:31:00+08:00", "stopReason": "Local"
  }
}
```

| 欄位 | 用途 | 誰讀 |
|---|---|---|
| `eventId` | 唯一（uuid）；也是 Outbox 列的 id；**傳輸層去重**的鍵 | 所有消費者 |
| `type` | `<context>.<subject>.<fact>.v<N>`，**含版本後綴**；路由與 schema 選擇 | bus、消費者 |
| `version` | 與後綴同一個數字 | 消費者 |
| `occurredAt` | **業務時間**（事實發生的時間），不是發送時間 | Billing 算尖離峰、AssetOps 算 SLA |
| `producer` | context 名：`charging` / `assetops` / `parking` / `billing` / `dispatch` | 監控 |
| `correlationId` | 一整條業務流程共用（那個下午的所有事件同一個 uuid） | 追蹤 |
| `causationId` | 直接造成它的那一則命令 / 事件的 id | 追蹤鏈 |
| `payload` | 契約定義的欄位 | 消費者 |

`occurredAt` 與「送出時間」分開是 Vicky 隱藏事實 2 的答案：SLA 從 18:10:00（`occurredAt`）起算，即使 relay 在 18:30 才送出。

---

## 4. 版本

規則：

1. **加欄位不升版**（消費者要容忍未知欄位）。
2. **改型別、改語意、刪欄位、改必要性 → 升版**：`v1` → `v2`，兩個版本**並行發布**一段時間。
3. 版本進 `type`（`charging.session.completed.v2`），schema 檔一版一個（`contracts/charging.session.completed.v2.schema.json`）。
4. 消費者宣告它吃哪個版本；生產者停發舊版前要確認沒人訂閱。

例子：Sprint 2 小美要「按分段計量」，`charging.session.completed` 需要加 `meterReadings[]`——**加欄位，不升版**。如果要把 `energyWh` 改成 `energyKWh` 小數——**升版**，而且工作坊會直接拒絕這個提案（精度）。

---

## 5. Transactional Outbox + Relay（R8 的實作）

### 5.1 問題

```ts
await db.save(session);           // 成功
await bus.publish(event);         // 網路失敗 → Billing 永遠不知道 S-991 結束了
```

或反過來：先 publish 再 save，save 失敗 → Billing 收到不存在的會話。**兩個系統沒有共同交易**，這是分散式系統的第一課。

### 5.2 解法

```
┌──────── 同一個 unit of work ────────┐
│ sessions.save(session)              │
│ outbox.add(integrationEvent)        │    ← ChargingService.commit
│ COMMIT                              │
└─────────────────────────────────────┘
          ▲
          │ 另一個迴圈 / 程序
┌─────────┴───────────────────────────┐
│ OutboxRelay.publishPending()：      │
│   for e of outbox.pending():        │
│     bus.publish(e)                  │    ← 失敗就 throw，不標記 → 下次重試
│     outbox.markPublished(e.eventId) │
└─────────────────────────────────────┘
```

Outbox port（`shared/Outbox.ts`）：`add(event)`、`pending()`、`markPublished(eventId)`。Day 6 的表：

| 欄 | 型別 |
|---|---|
| `event_id` | uuid（主鍵） |
| `seq` | 自增（保序） |
| `type`, `version`, `occurred_at`, `correlation_id` | |
| `envelope` | JSON |
| `published_at` | null = 未送 |

### 5.3 保證

- **不丟**：commit 了就一定會送（relay 會重試到成功）。
- **至少一次**：relay 送了但 `markPublished` 失敗 → 下次再送一次。所以消費者**必須冪等**。
- **場站斷線**：Outbox 在場站本機 DB；斷線時 relay 一直失敗一直重試；連線恢復自動補送。這就是「對帳可事後補」。

### 5.4 Day 5 / Day 6 的實作

- Day 5：`InMemoryOutbox` + `InMemoryEventBus` + `OutboxRelay`；測試裡手動呼叫 `relay.publishPending()`。
- Day 6：SQLite outbox；relay 由 `POST /relay` 手動觸發或 `setInterval` / `asyncio` 定時；bus 仍是程序內（MVP1 不需要真 broker）。

---

## 6. 至少一次 + 冪等消費者

### 6.1 兩層去重

| 層 | 鍵 | 擋什麼 | 怎麼測 |
|---|---|---|---|
| 傳輸層 | `eventId` | 同一則事件被送兩次（relay 重送） | `bus.redeliver(eventId)` |
| 業務層 | 業務鍵 | 業務上「同一件事」以不同事件出現（樁真的重報故障） | 再 publish 一則新 `eventId` 的同語意事件 |

curriculum §1.8 指定的業務鍵：**Billing：`sessionId`**；**AssetOps：`chargerId + faultCode`（在工單開放期間）** = R5。其他事件的去重鍵見 `contracts/README.md`。

### 6.2 Billing 草稿消費者（`billing/BillingDraftConsumer.ts`）

```ts
export class BillingDraftConsumer {
  private readonly drafts = new Map<string, DraftInvoice>();          // key = sessionId
  constructor(private ratePerKwh = 8, private nextInvoiceId = sequence('INV-', 778)) {}

  subscribe(bus: InMemoryEventBus): void {
    bus.subscribe('charging.session.started.v1', (e) => this.onSessionStarted(e));
    bus.subscribe('charging.session.completed.v1', (e) => this.onSessionCompleted(e));
  }
  onSessionStarted(e: IntegrationEvent): void {
    const { sessionId, connectorId } = e.payload as { sessionId: string; connectorId: string };
    if (this.drafts.has(sessionId)) return;                            // 冪等：一個 sessionId 一張
    this.drafts.set(sessionId, { invoiceId: this.nextInvoiceId(), sessionId, connectorId, energyWh: 0, amount: 0, status: 'Draft' });
  }
  onSessionCompleted(e: IntegrationEvent): void {
    const { sessionId, connectorId, energyWh } = e.payload as { sessionId: string; connectorId: string; energyWh: number };
    const draft = this.drafts.get(sessionId) ?? this.onSessionStartedFor(sessionId, connectorId);   // 亂序：completed 先到也要能建
    draft.energyWh = energyWh;                                          // 重送：同值覆寫 = 沒變
    draft.amount = Math.round((energyWh / 1000) * this.ratePerKwh * 100) / 100;   // 12400 → 99.2
  }
}
```

**測試**：`completed` 送一次 → `redeliver(eventId)` 一次 → 草稿仍一張、`INV-778`、99.2。**不呼叫 Charging**（Customer–Supplier 的下游）。

### 6.3 順序

至少一次還意味著**可能亂序**：`completed` 可能比 `started` 先到。`InMemoryEventBus` 剛好 FIFO，但它的註解明說「不承諾順序」。所以消費者對每個事件獨立處理，`completed` 沒看到草稿就自己建；Day 5 要有一個故意打亂順序的測試。

---

## 7. Process Manager：故障 → 工單 → 派工 → 關單

Process Manager（Saga 的協調式變體）是一個**有狀態的政策**：訂閱事件、記住進度、驅動聚合、發出自己的事件。

```
charging.charger.faulted.v1 ──▶ [FaultProcessManager.onChargerFaulted]
     │ processedEventIds 有這個 eventId？有 → 忽略（傳輸層冪等）
     │ workOrders.findOpenByFault(chargerId, faultCode)
     ├─ 有   → wo.appendDuplicateReport(occurredAt)（R5）→ commit
     └─ 沒有 → WorkOrder.open(...) → commit → ops.work_order.opened.v1
                dispatch.requestTechnician(...)（stub，回 TECH-HAO）→ wo.assign → TechnicianAssigned（內部）
（Day 6 HTTP）closeWorkOrder(WO-2208, 'Repaired', 18:18) ──▶ WorkOrderClosed ──▶ ops.work_order.closed.v1
ops.work_order.closed.v1 ──▶ [Charging 健康] ──▶ CP-A12 恢復可售
```

狀態圖在 `docs/diagrams/fault-saga.mmd`；那個下午的實際序列：

| 時間 | 輸入 | PM 做什麼 |
|---|---|---|
| 18:10:00 | `faulted.v1`（evt-A） | 開 `WO-2208`、指派 `TECH-HAO`、發 `opened.v1` |
| 18:10:08 | `faulted.v1`（evt-B，樁再報） | R5：附加，`duplicateReportCount = 1`，不發第二個 `opened` |
| 18:12 | broker 重送 evt-A | `processedEventIds` 已有 → 忽略；count 仍 1 |
| 18:18 | 阿豪回報修復驗證 → `closeWorkOrder` | `Closed(Repaired)`、發 `closed.v1` |

### 7.1 骨架（`assetops/application/FaultProcessManager.ts`）

```ts
async onChargerFaulted(event: IntegrationEvent<FaultedPayload>): Promise<WorkOrder | undefined> {
  if (this.processedEventIds.has(event.eventId)) return undefined;     // Day 6：processed_events 表，與工單同交易
  this.processedEventIds.add(event.eventId);
  const { chargerId, connectorId, faultCode, occurredAt } = event.payload;
  const ids = { correlationId: event.correlationId, causationId: event.eventId };

  const existing = await this.workOrders.findOpenByFault(chargerId, faultCode);
  if (existing) { existing.appendDuplicateReport(occurredAt); await this.commit(existing, ids); return existing; }   // R5

  const wo = WorkOrder.open({ workOrderId: this.nextWorkOrderId(), chargerId, connectorId, faultCode, at: occurredAt });
  await this.commit(wo, ids);                                           // → ops.work_order.opened.v1
  wo.assign(await this.dispatch.requestTechnician(wo.workOrderId, chargerId), occurredAt);   // MVP1 stub
  await this.commit(wo, ids);
  return wo;
}
```

`commit` 與 Charging 的一樣：save + `pullEvents()` → 只有 `WorkOrderOpened` / `WorkOrderClosed` 變整合事件 → `outbox.add`。

### 7.2 Saga 的補償

MVP1 沒有補償（compensation）。Sprint 2 如果加「派工失敗 → 工單回到 Open」就需要。Richardson 的書有完整的模式。

---

## 8. 反模式

### 8.1 廣播 OCPP 原始訊息
把 `StatusNotification` JSON 直接丟到 bus，「大家自己解」。結果：Billing、AssetOps、看板全部得懂 OCPP；升 2.0.1 全公司改。**整合事件必須是業務語言**；`contracts/README.md` 規則 5 與 `solutions` 的 ACL 測試都在守這條。

### 8.2 總部命令場站
HQ 發 `ForceStopSession` 命令給場站，場站照做。結果：總部掛了場站的行為不完整；總部的 bug 直接影響現場安全。**總部只訂閱結果**（curriculum §1.4 Charging 列）。合法的反向操作只有一種：小美的 `RemoteStopTransaction` 是一個**請求**，事實仍由場站的 `StopTransaction(reason=Remote)` 產生。

### 8.3 用事件當 RPC
發 `PleaseCalculateInvoice` 事件，然後等 `InvoiceCalculated` 回來才回應車主。這是同步呼叫穿了事件的衣服。**事件是通知過去的事實，不是請求**。事件名不能是祈使句。

### 8.4 其他

| 反模式 | 症狀 |
|---|---|
| 事件裡放整個聚合 | payload 200 個欄位；改聚合就破契約 |
| 事件裡放計算結果（金額） | Charging 開始算錢 = 邊界破了 |
| 消費者回頭查生產者的 DB | shared database |
| 沒有 `occurredAt`，用收到時間 | SLA 算錯 |
| `processedEventIds` 與聚合不同交易 | 「處理了但沒記錄」→ 重複開單 |
| 一個 `Event` 表存所有 context 的事件 | 大泥球的事件版 |

---

## 9. 整合事件契約 v1（`contracts/`）

`contracts/` 是唯一一份：`envelope.schema.json` + 七個 `<type>.schema.json`（`allOf: [信封, {type/version/producer 固定值, payload 必要欄位}]`）+ `examples/<type>.json`（用 §1.6 識別碼，同一個 `correlationId` 貫穿整個下午）+ 零依賴驗證器 `node contracts/validate.mjs`。

| 事件 | 發布者 | 訂閱者 | 必要欄位 | 去重鍵 | MVP1 |
|---|---|---|---|---|---|
| `parking.vehicle_entered.v1` | parking | 占位政策 | plate, siteId, lane, occurredAt | plate + occurredAt | schema + stub |
| `charging.session.started.v1` | charging | Billing 草稿、Parking | sessionId, connectorId, idTag, startedAt | sessionId | 實作 |
| `charging.session.completed.v1` | charging | Billing | sessionId, connectorId, energyWh, startedAt, endedAt, stopReason | sessionId | 實作 |
| `parking.session.closed.v1` | parking | Billing | parkingSessionId, plate, durationMin, releaseMode | parkingSessionId | schema + stub |
| `charging.charger.faulted.v1` | charging | AssetOps | chargerId, connectorId?, faultCode, stillEnergized, occurredAt | chargerId + faultCode（開放期間） | 實作 |
| `ops.work_order.opened.v1` | assetops | Dispatch、場站看板 | workOrderId, chargerId, faultCode, openedAt | workOrderId | 實作 |
| `ops.work_order.closed.v1` | assetops | Charging 健康、SLA | workOrderId, chargerId, closedAt, outcome | workOrderId | 實作（關單由 HTTP 觸發） |

`charging.session.completed.v1.schema.json` 的形狀：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/clarencechien/dddguide/contracts/charging.session.completed.v1.schema.json",
  "allOf": [
    { "$ref": "envelope.schema.json" },
    { "properties": {
        "type": { "const": "charging.session.completed.v1" }, "version": { "const": 1 }, "producer": { "const": "charging" },
        "payload": { "type": "object",
          "required": ["sessionId", "connectorId", "energyWh", "startedAt", "endedAt", "stopReason"],
          "properties": { "sessionId": { "type": "string", "pattern": "^S-" }, "energyWh": { "type": "integer", "minimum": 0 } } } } }
  ]
}
```

payload 沒有 `additionalProperties: false`，這是「加欄位不升版」的技術表達。你的 `ChargingService.commit` 產生的事件要能過 `node contracts/validate.mjs my-event.json`。

---

## 10. `/event-contract` 檢查清單

1. 命名：`<context>.<subject>.<fact>.v<N>`，過去式、小寫、底線。
2. 信封八欄位齊全；`occurredAt` 是業務時間；`producer` 是 context 名。
3. payload 只有基本型別；沒有金額、沒有其他 context 的名詞、沒有 OCPP 欄位名。
4. 通過 `node contracts/validate.mjs`。
5. 生產者經 Outbox；有測試證明「save 失敗則沒有事件」。
6. 每個消費者有去重鍵，且有 `redeliver()` 的測試。
7. 沒有祈使句事件名。

---

## 11. 延伸閱讀

- Chris Richardson, *Microservices Patterns*, 2018, 第 3 章（訊息）、第 4 章（Saga）、第 5–6 章（Outbox）。—— Outbox / Polling publisher 的原始整理。
- Chris Richardson, microservices.io 的 "Transactional outbox" 與 "Idempotent Consumer" 頁面。—— 各 5 分鐘。
- Sam Newman, *Building Microservices*（2nd ed.），2021, 第 4 章 "Microservice Communication Styles"。
- Vaughn Vernon, *Implementing Domain-Driven Design*, 2013, 第 8 章 "Domain Events" 與第 13 章 "Integrating Bounded Contexts"。
- Vlad Khononov, *Learning Domain-Driven Design*, 2021, 第 9 章 "Communication Patterns"。—— Outbox、Saga、Process Manager 的區分。
- Martin Fowler, "What do you mean by 'Event-Driven'?", 2017（martinfowler.com）。
- Gregor Hohpe & Bobby Woolf, *Enterprise Integration Patterns*, 2003。—— Message、Envelope Wrapper、Idempotent Receiver、Process Manager 的原始定義。
- Pat Helland, "Idempotence Is Not a Medical Condition", ACM Queue, 2012。

---

## 自我檢查

1. 領域事件變成整合事件的那個方法叫什麼、在哪一層？為什麼不能在聚合裡、也不能在 adapter 裡？
2. Outbox 為什麼保證「不丟」但只能「至少一次」？`OutboxRelay` 哪一行讓它變成至少一次？
3. Billing 的去重鍵是什麼？用 `redeliver()` 描述一個測試的 Given / When / Then。
4. 18:10:08 與 18:12 兩次「重複」分別靠什麼擋下？各在哪一層？
5. 「總部發命令給場站」為什麼是反模式？小美的遠端停止為什麼不算違反？
