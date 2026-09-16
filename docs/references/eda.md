# 事件驅動架構（Event-Driven Architecture）

> Day 5 全天的方法論。交付物：`src/{app,billing,assetops}/**` 測試全綠、`contracts/*.json`。用 `/event-contract` 審查。

## 讀完你會拿到

- 領域事件與整合事件的差別，以及一個變成另一個的那一行程式碼在哪。
- 信封（envelope）八個欄位各是幹什麼的，版本怎麼升。
- Transactional Outbox + relay 的完整機制，以及為什麼它是 R8 的實作。
- 至少一次投遞 + 冪等消費者：Billing 與 AssetOps 各自的去重鍵。
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
| 語言 | 該 context 的通用語言，可以有 VO | Published Language，只有 JSON 基本型別 |
| 穩定性 | 可以隨重構改 | 是契約；改要升版本 |
| 例子 | `ChargingCompleted{sessionId, energy: Energy, …}` | `charging.session.completed.v1{sessionId, energyWh: 12400, …}` |
| 誰產生 | 聚合（`record`） | 應用服務在 commit 前 map 出來 |
| 誰消費 | 同 context 內的政策 / 讀模型 | 其他 context 的消費者 |
| 存哪 | 聚合的 `events` 陣列 → 可選 event store | Outbox 表 → broker |

**轉換點**只有一個：應用服務。

```ts
// src/app/StopCharging.ts（節錄）
const domainEvents = session.pullEvents();
const integration = domainEvents.flatMap(toIntegrationEvents);   // ChargingCompleted → charging.session.completed.v1
await this.uow.run(async () => {
  await this.sessions.save(session);
  await this.outbox.append(integration);                          // 同一交易
});
```

`toIntegrationEvents` 的對照表：

| 領域事件 | 整合事件 | 備註 |
|---|---|---|
| `ChargingStarted` | `charging.session.started.v1` | |
| `ChargingCompleted` | `charging.session.completed.v1` | |
| `ChargerFaulted` | `charging.charger.faulted.v1` | |
| `EnergyMetered` | （無） | Billing 不需要每筆計量（T4 陷阱） |
| `MeterValueRejected` | （無） | 內部監控 |
| `ChargingStartRejected` | （無，MVP1） | Sprint 2 可考慮 |
| `WorkOrderOpened` | `ops.work_order.opened.v1` | |
| `WorkOrderClosed` | `ops.work_order.closed.v1` | |
| `ParkingManuallyReleased` | `parking.session.closed.v1(releaseMode=Manual)` | 一個整合事件對多個領域事件 |

---

## 3. 信封（Envelope）

curriculum §1.8 定義了八個欄位：

```json
{
  "eventId": "6f1c2a8e-3b7d-4e5f-9a10-1b2c3d4e5f60",
  "type": "charging.session.completed",
  "version": 1,
  "occurredAt": "2026-09-16T14:31:00+08:00",
  "producer": "charging@SITE-TPE-01",
  "correlationId": "P-441",
  "causationId": "3a9d...（造成這個事件的命令或事件的 id）",
  "payload": {
    "sessionId": "S-991",
    "connectorId": "CP-A12-2",
    "energyWh": 12400,
    "startedAt": "2026-09-16T14:04:10+08:00",
    "endedAt": "2026-09-16T14:31:00+08:00",
    "stopReason": "Local"
  }
}
```

| 欄位 | 用途 | 誰讀 |
|---|---|---|
| `eventId` | 唯一；**傳輸層去重**的鍵 | 所有消費者 |
| `type` + `version` | 路由與 schema 選擇；`type` 不含版本，合起來才是 `charging.session.completed.v1` | broker、消費者 |
| `occurredAt` | **業務時間**（事實發生的時間），不是發送時間 | Billing 算尖離峰、AssetOps 算 SLA |
| `producer` | 誰發的，含節點；除錯用 | 監控 |
| `correlationId` | 一整條業務流程的共同 ID（一個午後：`P-441`；一次故障：第一則 `eventId`） | 追蹤 |
| `causationId` | 直接造成它的那一則命令 / 事件 | 追蹤鏈 |
| `payload` | 契約定義的欄位 | 消費者 |

`occurredAt` 與「送出時間」分開是 Vicky 隱藏事實 2 的答案：SLA 從 18:10（`occurredAt`）起算，即使 relay 在 18:30 才送出。

---

## 4. 版本

規則：

1. **加欄位不升版**（消費者要容忍未知欄位）。
2. **改型別、改語意、刪欄位、改必要性 → 升版**：`v1` → `v2`，兩個版本**並行發布**一段時間。
3. 版本進 `type` 的路由名（`charging.session.completed.v2`），schema 檔一版一個（`contracts/charging.session.completed.v2.json`）。
4. 消費者宣告它吃哪個版本；生產者停發舊版前要確認沒人訂閱。

例子：Sprint 2 小美要「按分段計量」，`charging.session.completed` 需要加 `meterReadings[]`——**加欄位，不升版**。如果要把 `energyWh` 改成 `energyKWh` 小數——**升版**，而且工作坊會直接拒絕這個提案（精度）。

---

## 5. Transactional Outbox + Relay（R8 的實作）

### 5.1 問題

```ts
await db.save(session);           // 成功
await broker.publish(event);      // 網路失敗 → Billing 永遠不知道 S-991 結束了
```

或反過來：先 publish 再 save，save 失敗 → Billing 收到不存在的會話。**兩個系統沒有共同交易**，這是分散式系統的第一課。

### 5.2 解法

```
┌──────── 同一個 DB 交易 ────────┐
│ INSERT INTO charging_sessions   │
│ INSERT INTO outbox (event…)     │
│ COMMIT                          │
└─────────────────────────────────┘
          ▲
          │ 另一個迴圈 / 程序
┌─────────┴───────────────────────┐
│ Relay：                          │
│   SELECT * FROM outbox WHERE     │
│     published_at IS NULL         │
│     ORDER BY id LIMIT 100        │
│   for each: broker.publish(e)    │
│             UPDATE outbox SET    │
│               published_at=now() │
└─────────────────────────────────┘
```

Outbox 表：

| 欄 | 型別 |
|---|---|
| `id` | 自增（保序） |
| `event_id` | uuid（唯一） |
| `type`, `version` | |
| `occurred_at` | |
| `aggregate_id` | `S-991` / `WO-2208`，用來按聚合保序 |
| `envelope` | JSON |
| `published_at` | null = 未送 |

### 5.3 保證

- **不丟**：commit 了就一定會送（relay 會重試到成功）。
- **至少一次**：relay 送了但 `UPDATE published_at` 失敗 → 下次再送一次。所以消費者**必須冪等**。
- **場站斷線**：Outbox 在場站本機 DB；斷線時 relay 一直失敗一直重試；連線恢復自動補送。這就是「對帳可事後補」。

### 5.4 Day 5 / Day 6 的實作

- Day 5：`InMemoryOutbox` + `InMemoryEventBus`；relay 是一個 `drain()` 函式，測試裡手動呼叫。
- Day 6：`SqliteOutbox` + 定時 relay（`setInterval` / `asyncio` loop）；EventBus 仍是程序內（MVP1 不需要真 broker）。

---

## 6. 至少一次 + 冪等消費者

### 6.1 兩層去重

| 層 | 鍵 | 擋什麼 |
|---|---|---|
| 傳輸層 | `eventId` | 同一則事件被送兩次（relay 重送） |
| 業務層 | 業務鍵 | 業務上「同一件事」以不同事件出現（樁真的重報故障） |

curriculum §1.8 指定的業務鍵：

- **Billing：`sessionId`**。同一個 `S-991` 的 `completed` 只出一次帳，不管收到幾次。
- **AssetOps：`chargerId + faultCode`（在工單開放期間）**。這就是 R5。

### 6.2 Billing 草稿消費者

```ts
// src/billing/DraftInvoiceConsumer.ts
export class DraftInvoiceConsumer {
  constructor(private drafts: DraftInvoiceStore, private processed: ProcessedEventStore, private tariff: Tariff) {}

  async on(e: IntegrationEvent): Promise<void> {
    if (await this.processed.has(e.eventId)) return;                   // 傳輸層去重
    switch (`${e.type}.v${e.version}`) {
      case "charging.session.started.v1": {
        await this.drafts.upsert(e.payload.sessionId, { sessionId: e.payload.sessionId, status: "open" });   // upsert = 冪等
        break;
      }
      case "charging.session.completed.v1": {
        const d = await this.drafts.get(e.payload.sessionId);
        if (d?.energyWh !== undefined) break;                            // 業務層去重：已計價過的 sessionId 不再算
        const amount = this.tariff.price(e.payload.energyWh, new Date(e.payload.startedAt));   // 12400 Wh × 8 元/kWh = 99.2
        await this.drafts.upsert(e.payload.sessionId, { ...d, energyWh: e.payload.energyWh, amount, status: "priced" });
        break;
      }
      case "parking.session.closed.v1": { /* 合併停車費；MVP1 stub */ break; }
    }
    await this.processed.add(e.eventId);
  }
}
```

**測試**：同一則 `completed` 送兩次，草稿只有一筆、金額 99.2 不變。

### 6.3 順序

至少一次還意味著**可能亂序**：`completed` 可能比 `started` 先到（不同 relay 批次）。MVP1 的處理：消費者對每個事件獨立處理，`completed` 沒看到草稿就自己建。**不要**假設順序，除非 broker 按 `aggregate_id` 分區且你只有一個消費者——MVP1 的 in-memory bus 剛好是這樣，但測試要故意打亂順序一次。

---

## 7. Process Manager：故障 → 工單 → 派工 → 關單

Process Manager（也叫 Saga 的協調式變體）是一個**有狀態的政策**：它訂閱事件、記住進度、發出命令。

```
charging.charger.faulted.v1 ──▶ [FaultToWorkOrder PM]
                                    │ 查 WorkOrderRepository.findOpenByChargerAndFault
                                    ├─ 沒有 → OpenWorkOrder → WorkOrderOpened → ops.work_order.opened.v1
                                    └─ 有   → attachDuplicateReport（R5）
ops.work_order.opened.v1 ──▶ [Dispatch stub] ──▶ AssignTechnician(TECH-HAO)（MVP1：直接指派，不排路線）
（人 / Vicky）CloseWorkOrder ──▶ WorkOrderClosed ──▶ ops.work_order.closed.v1
ops.work_order.closed.v1 ──▶ [Charging 健康] ──▶ 連接器恢復可售
```

狀態圖在 `docs/diagrams/fault-saga.mmd`。

### 7.1 MVP1 的 Process Manager 骨架

```ts
// src/app/FaultToWorkOrder.ts
export class FaultToWorkOrder {
  constructor(private workOrders: WorkOrderRepository, private uow: UnitOfWork, private outbox: Outbox,
              private ids: IdGenerator, private clock: Clock, private processed: ProcessedEventStore) {}

  async on(e: IntegrationEvent /* charging.charger.faulted.v1 */): Promise<void> {
    if (await this.processed.has(e.eventId)) return;
    const { chargerId, faultCode, occurredAt } = e.payload;
    await this.uow.run(async () => {
      const existing = await this.workOrders.findOpenByChargerAndFault(chargerId, faultCode);
      if (existing) {
        existing.attachDuplicateReport(new Date(occurredAt), e.eventId);
        await this.workOrders.save(existing);
      } else {
        const wo = WorkOrder.open({ id: this.ids.next("WO"), chargerId, faultCode, reportedAt: new Date(occurredAt), openedAt: this.clock.now() });
        await this.workOrders.save(wo);
        await this.outbox.append(wo.pullEvents().flatMap(toIntegrationEvents));
      }
      await this.processed.add(e.eventId);
    });
  }
}
```

注意 `processed.add` 在同一交易裡——這樣「處理了但沒記錄」不會發生。

### 7.2 Saga 的補償

MVP1 沒有補償（compensation）。Sprint 2 如果加「派工失敗 → 工單回到 Open」就需要。Richardson 的書有完整的模式。

---

## 8. 反模式

### 8.1 廣播 OCPP 原始訊息
把 `StatusNotification` JSON 直接丟到 broker，「大家自己解」。結果：Billing、AssetOps、看板全部得懂 OCPP；升 2.0.1 全公司改。**整合事件必須是業務語言**。

### 8.2 總部命令場站
HQ 發 `ForceStopSession` 命令給場站，場站照做。結果：總部掛了場站的行為不完整；總部的 bug 直接影響現場安全。**總部只訂閱結果**（curriculum §1.4 Charging 列）。合法的反向操作只有一種：小美的 `RemoteStopTransaction` 是一個**請求**，事實仍由場站產生。

### 8.3 用事件當 RPC
發 `PleaseCalculateInvoice` 事件，然後等 `InvoiceCalculated` 回來才回應車主。這是同步呼叫穿了事件的衣服，可用性耦合一樣存在。**事件是通知過去的事實，不是請求**。事件名不能是祈使句。

### 8.4 其他

| 反模式 | 症狀 |
|---|---|
| 事件裡放整個聚合 | payload 200 個欄位；改聚合就破契約 |
| 事件裡放計算結果（金額） | Charging 開始算錢 = 邊界破了 |
| 消費者回頭查生產者的 DB | shared database |
| 沒有 `occurredAt`，用收到時間 | SLA 算錯 |
| 一個 `Event` 表存所有 context 的事件 | 大泥球的事件版 |

---

## 9. 整合事件契約 v1（curriculum §1.8 全表）

| 事件 | 發布者 | 訂閱者 | 必要欄位 | MVP1 |
|---|---|---|---|---|
| `parking.vehicle_entered.v1` | Parking | 占位政策 | plate, siteId, lane, occurredAt | schema + stub |
| `charging.session.started.v1` | Charging | Billing 草稿、Parking | sessionId, connectorId, idTag, startedAt | 實作 |
| `charging.session.completed.v1` | Charging | Billing | sessionId, connectorId, energyWh, startedAt, endedAt, stopReason | 實作 |
| `parking.session.closed.v1` | Parking | Billing | parkingSessionId, plate, durationMin, releaseMode | schema + stub |
| `charging.charger.faulted.v1` | Charging | AssetOps | chargerId, connectorId?, faultCode, stillEnergized, occurredAt | 實作 |
| `ops.work_order.opened.v1` | AssetOps | Dispatch、場站看板 | workOrderId, chargerId, faultCode, openedAt | 實作 |
| `ops.work_order.closed.v1` | AssetOps | Charging 健康、SLA | workOrderId, chargerId, closedAt, outcome | 實作（關單由 HTTP 觸發） |

去重鍵：Billing `sessionId`；AssetOps `chargerId + faultCode`（工單開放期間）。

`contracts/charging.session.completed.v1.json` 的樣子：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "charging.session.completed.v1",
  "type": "object",
  "required": ["sessionId", "connectorId", "energyWh", "startedAt", "endedAt", "stopReason"],
  "properties": {
    "sessionId":   { "type": "string", "pattern": "^S-\\d+$" },
    "connectorId": { "type": "string", "pattern": "^CP-[A-Z0-9]+-\\d+$" },
    "energyWh":    { "type": "integer", "minimum": 0 },
    "startedAt":   { "type": "string", "format": "date-time" },
    "endedAt":     { "type": "string", "format": "date-time" },
    "stopReason":  { "type": "string" }
  },
  "additionalProperties": true
}
```

`additionalProperties: true` 是「加欄位不升版」的技術表達。每個 schema 旁邊放一個 `*.example.json`，用 curriculum §1.6 的值。

---

## 10. `/event-contract` 檢查清單

1. 命名：`<context>.<聚合或主題>.<過去式>.v<n>`，小寫、底線。
2. 信封八欄位齊全；`occurredAt` 是業務時間。
3. payload 只有基本型別；沒有金額、沒有其他 context 的名詞。
4. 有 JSON Schema + example。
5. 生產者經 Outbox；有測試證明「save 失敗則沒有事件」。
6. 每個消費者有去重鍵，且有「同一事件送兩次」的測試。
7. 沒有祈使句事件名。

---

## 11. 延伸閱讀

- Chris Richardson, *Microservices Patterns*, 2018, 第 3 章（訊息）、第 4 章（Saga）、第 5–6 章（事件溯源與 Outbox）。—— Outbox / Polling publisher / Transaction log tailing 的原始整理。
- Chris Richardson, microservices.io 的 "Transactional outbox" 與 "Idempotent Consumer" 頁面。—— 各 5 分鐘。
- Sam Newman, *Building Microservices*（2nd ed.），2021, 第 4 章 "Microservice Communication Styles"。—— 同步 vs 非同步的取捨。
- Vaughn Vernon, *Implementing Domain-Driven Design*, 2013, 第 8 章 "Domain Events" 與第 13 章 "Integrating Bounded Contexts"。
- Vlad Khononov, *Learning Domain-Driven Design*, 2021, 第 9 章 "Communication Patterns"。—— Outbox、Saga、Process Manager 的區分。
- Martin Fowler, "What do you mean by 'Event-Driven'?", 2017（martinfowler.com）。—— 四種「事件驅動」的釐清。
- Gregor Hohpe & Bobby Woolf, *Enterprise Integration Patterns*, 2003。—— Message、Envelope、Idempotent Receiver、Process Manager 的原始定義。
- Pat Helland, "Idempotence Is Not a Medical Condition", ACM Queue, 2012。—— 為什麼至少一次 + 冪等是唯一合理的組合。

---

## 自我檢查

1. 領域事件變成整合事件的那一行在哪一層？為什麼不能在聚合裡、也不能在 adapter 裡？
2. Outbox 為什麼保證「不丟」但只能「至少一次」？消費者因此必須做什麼？
3. Billing 的兩層去重各用什麼鍵？用一個「同一則 `completed` 送兩次」的測試描述期望結果。
4. `occurredAt` 為什麼不能用「收到時間」？哪一位角色會因此受害？
5. 「總部發命令給場站」為什麼是反模式？小美的遠端停止為什麼不算違反？
