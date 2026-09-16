# Day 5 — 應用層與事件驅動

**一句話目標**：今天結束時，四個命令處理器在同一交易內寫聚合與 Outbox，整合事件有 JSON Schema 契約，
Billing 草稿消費者對重送冪等，`ChargerFaulted` 會自動變成一張工單再變回「可售」——而且聚合裡仍然沒有一行 `publish`。

## 今天結束你會拿到

| 交付物 | 路徑 | 最低要求 |
|---|---|---|
| 命令處理器 | `starter/<lang>/src/charging/application/**` | `StartCharging`、`StopCharging`、`ReportMeterValue`、`ReportFault`；交易 + Outbox 同寫 |
| 共用基礎 | `starter/<lang>/src/shared/**` | 事件信封（envelope）、Outbox、in-memory bus、Outbox relay（in-memory 版） |
| 整合事件契約 | `contracts/*.json` | §1.8 七個事件的 JSON Schema v1 + 每個一份範例；MVP1 發出的四個要被測試驗證 |
| Billing 草稿消費者 | `starter/<lang>/src/billing/**` | 訂閱 `charging.session.completed.v1`，以 `sessionId` 冪等，產 `DraftInvoice` |
| Process Manager | `starter/<lang>/src/assetops/**` | `ChargerFaulted` → 開單 → 派工 stub → 關單恢復可售 |
| 事件流說明 | `workshop/day5/event-flow.md` | 處理器表、Outbox sequence 圖、契約表、冪等做法、PM 狀態表、審查紀錄 |

範本在 `workshop/day5/TEMPLATE.md`；驗收標準在 `docs/rubric.md`。

## 講師開場（15 分鐘）

- **[3 分] 昨天在聚合裡，今天在聚合外**：聚合守規則、記錄事件；今天的應用層負責「載入聚合 → 呼叫方法 → 存回去 → 把事件交出去」。應用層沒有業務規則，只有編排。
- **[4 分] 為什麼要 Outbox（R8）**：如果在 `save()` 之後直接 `bus.publish()`，兩個失敗情境——存成功、發失敗（帳務永遠收不到）；發成功、存失敗（帳務收到不存在的會話）。解法：事件與聚合狀態**在同一交易寫進同一個儲存**（outbox 表），另一個 relay 程序讀 outbox 送到 bus，送完標記。至少一次（at-least-once）→ 消費者必須冪等。
- **[3 分] 整合事件 ≠ 領域事件**：領域事件是聚合內的事實（`ChargingCompleted`）；整合事件是跨 context 的**契約**（`charging.session.completed.v1`），有信封、有版本、有 Schema、改欄位要升版。今天把兩者分開。
- **[2 分] 冪等鍵**：Billing 用 `sessionId`；AssetOps 用 `chargerId + faultCode`（開放期間）。同一事件送三次，結果要跟送一次一樣。
- **[2 分] Process Manager**：一段「聽事件、下命令、記狀態」的流程。今天做故障那條：聽 `ChargerFaulted` → 下 `OpenWorkOrder` → 叫 Dispatch（stub）→ 聽 `WorkOrderClosed` → 樁恢復可售。
- **[1 分] 交付物**：程式碼全綠 + `contracts/*.json` + `event-flow.md`。仍然 TDD，`/tdd` 仍然在。

## 先讀（30 分鐘）

| 檔案 | 時間 | 讀什麼 |
|---|---|---|
| `docs/references/eda.md` | 15 分 | Outbox 模式、at-least-once 與冪等、整合事件的信封與版本、Process Manager vs Saga |
| `docs/references/hexagonal.md`「應用層」一節 | 5 分 | Application Service 的職責邊界（編排、交易、不含規則） |
| `docs/curriculum.md` §1.8 | 5 分 | 七個整合事件、必要欄位、信封欄位、去重鍵——今天的契約照這張表 |
| `contracts/README.md`（若存在） | 5 分 | 既有的 Schema 骨架與範例格式 |

---

## Block 1（90 分鐘）— Application Service 與 Outbox 同寫

### 目標
四個命令處理器；每個處理器：開交易 → 載入聚合 → 呼叫方法 → `save` → 把 `pendingEvents` 包成信封寫進 Outbox → 提交。今天的「交易」是 in-memory 的 unit of work；Day 6 換成 SQLite 交易時處理器不用改。

### 步驟
1. **（15 分，不開 Claude）** 在 `event-flow.md` 填處理器表：每個命令載入哪個聚合、寫哪些事件、交易邊界在哪。特別想 `StartCharging`：R1 需要 `findActiveByConnector`，R2 需要授權——授權從哪來？（一個 `AuthorizationPort`，今天 in-memory：`TAG-MONTHLY-77` 有效、`TAG-VISITOR-03` 無效。）
2. 建共用基礎（先寫型別，再 TDD）：
   - Node：`src/shared/events.ts`（`Envelope { eventId, type, version, occurredAt, producer, correlationId, causationId, payload }`）、`src/shared/outbox.ts`（`OutboxPort { append(envelopes), pending(), markSent(ids) }` + `InMemoryOutbox`）、`src/shared/bus.ts`（`InMemoryBus { subscribe(type, handler), publish(envelope) }`）、`src/shared/unit-of-work.ts`（`InMemoryUnitOfWork.run(fn)`：fn 內所有寫入要嘛全成功要嘛全丟掉）。
   - Python：`src/shared/events.py`、`outbox.py`、`bus.py`、`unit_of_work.py`，同構。
3. **（50 分）TDD 處理器**，測試檔 Node `test/charging/application/*.test.ts`、Python `tests/charging/application/test_*.py`：
   - `StartCharging writes the session and its events to the outbox in one transaction`：執行後 repository 有 `S-991`、outbox 有一筆 `type === "charging.session.started.v1"`，且 bus **收不到任何東西**（還沒 relay）。
   - `StartCharging rolls back the outbox when saving the session fails`：用一個會拋錯的 repository stub，執行後 outbox 為空。
   - `R1 second StartCharging on an occupied connector is rejected at the application layer`：第二次執行回傳拒絕（或拋錯，依 Day 4 決定），outbox 沒有第二筆 `started`。
   - `ReportMeterValue appends EnergyMetered and rejects backwards values`（R3 走到應用層）。
   - `StopCharging emits charging.session.completed.v1 with energyWh 12400`：payload 有 `sessionId, connectorId, energyWh, startedAt, endedAt, stopReason`。
   - `ReportFault opens a work order or attaches a duplicate`（R5 的應用層決策，用 Day 4 的 `findOpenBy`）。
   處理器檔：Node `src/charging/application/StartCharging.ts`、`StopCharging.ts`、`ReportMeterValue.ts`、`ReportFault.ts`；Python `start_charging.py`、`stop_charging.py`、`report_meter_value.py`、`report_fault.py`。（`ReportFault` 若你認為屬於 AssetOps 應用層，放 `src/assetops/application/` 亦可，寫進取捨。）
4. **（15 分）** 領域事件 → 整合事件的**翻譯**放哪裡？建議 `src/charging/application/integration-mapper.ts`（Python `integration_mapper.py`）：`ChargingStarted` → `charging.session.started.v1` 信封；`ChargingCompleted` → `charging.session.completed.v1`；`ChargerFaulted` → `charging.charger.faulted.v1`。`correlationId` 用 `sessionId`（或 `chargerId`），`causationId` 用觸發命令的 id。
5. **（10 分）** 畫 Outbox 同寫的 Mermaid `sequenceDiagram`（API/呼叫者 → 處理器 → UoW → repository → outbox → commit；relay 在虛線之後）進 `event-flow.md`。

### 貼給 Claude Code 的提示
```
/tdd StartCharging

Day 5 Block 1。我要用 TDD 做 StartCharging 命令處理器，要求：同一交易內寫聚合與 Outbox；聚合不碰 bus（R8）。
我的處理器表在 workshop/day5/event-flow.md（請直接讀檔）。
照 /tdd 規則：我先貼紅燈測試，你只說它為什麼會失敗，不寫 src/ 的碼。
在那之前先問我三個問題：
1. 交易失敗時 outbox 要怎樣？我的測試有沒有涵蓋？
2. 授權（R2）在處理器裡怎麼進來？我有沒有把它變成 port？
3. 領域事件轉整合事件的信封，在哪一層做？correlationId 用什麼？
這是我的第一個測試：
<貼上>
```

### 你自己要做的
- `UnitOfWork` 的介面（`run(fn)` 或 `begin/commit/rollback`）。想 Day 6 的 SQLite 交易要能塞進同一個介面。
- 信封欄位的來源：`eventId` 誰產（uuid，在 mapper）、`occurredAt` 從領域事件的 `at` 來、`producer` 是 `"charging"`。
- 決定 `ReportFault` 的歸屬（Charging 應用層還是 AssetOps 應用層），寫進 `event-flow.md`。

### 常見卡點
- **測試裡 bus 收到了事件** → 你在處理器裡 publish 了。刪掉；relay 是 B2 的事。
- **rollback 測不出來** → in-memory UoW 要真的「暫存 → 提交」：寫入先進 staging，`fn` 成功才 flush 到 repository 與 outbox。
- **處理器裡開始出現 `if status === "Charging"`** → 規則跑進應用層了。移回聚合方法。
- **`correlationId` 不知道填什麼** → 一條業務流程一個 id。充電流程用 `sessionId`（`S-991`），故障流程用 `chargerId + faultCode` 或工單 id。
- **Python 循環 import**（domain ↔ application）→ application import domain，domain 永遠不 import application。

### 產出
- 四個處理器 + `src/shared/{events,outbox,bus,unit-of-work}` 測試全綠；bus 在此階段收不到任何事件。
- `event-flow.md`：處理器表、Outbox sequence 圖。

---

## Block 2（90 分鐘）— 整合事件契約、in-memory bus、Billing 草稿消費者

### 目標
`contracts/` 有七個事件的 JSON Schema 與範例；Outbox relay 把 pending 信封送到 bus；Billing 消費者收到 `charging.session.completed.v1` 產一張草稿帳單，重送三次只有一張。

### 步驟
1. **（25 分）契約**。每個事件一個檔：`contracts/charging.session.started.v1.json`、`charging.session.completed.v1.json`、`charging.charger.faulted.v1.json`、`ops.work_order.opened.v1.json`、`ops.work_order.closed.v1.json`、`parking.vehicle_entered.v1.json`、`parking.session.closed.v1.json`；範例在 `contracts/examples/<type>.json`。Schema 內容：
   - 頂層是信封（八個欄位皆 `required`；`type` 用 `const`；`version` 用 `const: 1`）。
   - `payload` 依 §1.8 必要欄位；`energyWh` 是 `integer` `minimum 0`；`occurredAt` / `startedAt` / `endedAt` 是 `format: date-time`；`stopReason` 是 `enum`（你決定值，例如 `Local | Remote | EVDisconnected | PowerLoss | Other`）；`connectorId?` 在 faulted 裡是可選。
   - 如果 `contracts/` 已有骨架，補齊而非覆蓋；有差異寫進 `event-flow.md`。
2. **（15 分）** 寫一個測試驗證範例對 Schema：Node `test/contracts/schemas.test.ts`（`ajv`）；Python `tests/contracts/test_schemas.py`（`jsonschema`）——`every example in contracts/examples validates against its schema`。再加一個：`StopCharging output validates against charging.session.completed.v1`（B1 的處理器產的信封直接丟給 Schema）。
3. **（15 分）Outbox relay**：`src/shared/outbox-relay.ts`（Python `outbox_relay.py`）：`relayOnce()` 讀 `pending()` → 逐筆 `bus.publish` → `markSent`。測試 `Outbox relay publishes pending envelopes once and marks them sent`（跑兩次 relay，bus 只收到一次）。這條就是 R8 的完整版。
4. **（30 分）Billing 消費者（TDD）**：
   - `src/billing/DraftInvoice.ts`（最小：`invoiceId`、`sessionId`、`energyWh`、`amount`（先用固定單價，例如 6 元/kWh → `12.4 kWh` = 74.4）、`status: Draft`）；`src/billing/DraftInvoiceConsumer.ts`（`handle(envelope)`）；`src/billing/ProcessedEvents.ts`（去重表，in-memory）。Python 同構 snake_case。
   - 測試 `test/billing/DraftInvoiceConsumer.test.ts` / `tests/billing/test_draft_invoice_consumer.py`：
     - `Billing creates a draft invoice from charging.session.completed.v1` → `INV-778`（或自產 id）對 `S-991`，`energyWh 12400`。
     - `Billing consumer is idempotent on sessionId`：同一信封 `handle` 三次 → 一張。
     - `Billing consumer never calls back into Charging`：消費者的建構子只接受 `InvoiceRepository` 與 `ProcessedEvents`，沒有 `ChargingSessionRepository`（Customer-Supplier；帳務不得回呼凍結會話）。
     - `R7 issued invoice amount cannot change; correction is an InvoiceAdjusted event`（草稿 → 開立後 `amount` 不可改，`adjust()` 記錄新事件）。這條是 R7 的最小版本。
5. **（5 分）** 把 relay + consumer 串成一條端到端的 in-memory 測試：`StopCharging` → `relayOnce()` → Billing 有草稿帳單。

### 貼給 Claude Code 的提示
```
/event-contract

Day 5 Block 2。這是我寫的 contracts/*.json 與 contracts/examples/*.json（請直接讀檔）。
請依 docs/curriculum.md §1.8 與信封欄位審查：
1. 每個 Schema：信封八個欄位是否 required、type 是否 const、version 是否 const 1、payload 必要欄位是否齊、型別是否合理（energyWh integer、時間 date-time）。
   用表格回：「事件 | 缺什麼」，不要幫我改檔。
2. 去重鍵：Billing 用 sessionId、AssetOps 用 chargerId+faultCode——我的 payload 有沒有讓消費者拿得到去重鍵？沒有的話問我。
3. 問我一個「如果 Sprint 2 要在 completed 加 tariffCode，版本怎麼升」的問題。
最後給「下一個最小步驟」。
```
```
/tdd Billing consumer

Day 5 Block 2。我要 TDD Billing 草稿消費者：訂閱 charging.session.completed.v1、以 sessionId 冪等、不得回呼 Charging。
照 /tdd 規則。在我貼紅燈測試前，先問我：「冪等表要記 eventId 還是 sessionId？兩者差在哪個失敗情境？」
這是我的第一個測試：
<貼上>
```

### 你自己要做的
- Schema 的 `stopReason` enum、`faultCode` 格式（`^E\d{2}$`？）、金額單價——都是你的決定，寫進 `event-flow.md`。
- 冪等表的鍵：`eventId`（防重送）還是 `sessionId`（防同一會話產兩張帳單）？想清楚兩者對應的失敗情境（提示：relay 重送 = 同 eventId；上游 bug 發兩次 completed = 不同 eventId 同 sessionId）。

### 常見卡點
- **Schema 寫成只有 payload** → 消費者收到的是信封；Schema 頂層要是信封。
- **`ajv` / `jsonschema` 對 `format: date-time` 沒驗** → Node 要裝 `ajv-formats`；Python 要 `jsonschema[format]` 或自己用 `FormatChecker`。starter 若已裝就用。
- **relay 跑兩次 bus 收到兩次** → `markSent` 沒生效或 `pending()` 沒過濾。
- **Billing 想去查 Charging 的會話狀態** → 不行。它需要的全在 `payload` 裡；不在就是契約缺欄位（回去改 Schema 並升版思考）。
- **金額計算放進聚合還是消費者** → 草稿帳單是 Billing 的聚合（`DraftInvoice`），消費者只編排；金額在聚合內算。

### 產出
- `contracts/*.json` + `contracts/examples/*.json` 七組；Schema 驗證測試綠。
- `src/shared/outbox-relay`、`src/billing/**` 測試全綠；端到端 in-memory 測試綠。
- `event-flow.md`：契約表（事件、Schema 檔、範例檔、去重鍵、消費者）、冪等做法。

---

## Block 3（90 分鐘）— Process Manager：故障 → 工單 → 派工（stub）→ 關單恢復可售

### 目標
一段自動化流程：收到 `charging.charger.faulted.v1` → 用 Day 4 的 `WorkOrder` + R5 開單或附加 → 發 `ops.work_order.opened.v1` → Dispatch stub 指派 `TECH-HAO` → 收到關單命令 → 發 `ops.work_order.closed.v1` → Charging 側把樁標回可售。用 `/event-contract` 審整條鏈。

### 步驟
1. **（15 分，不開 Claude）** 在 `event-flow.md` 寫 PM 狀態表：
   | 收到 | 目前狀態 | 動作 | 發出 | 新狀態 |
   |---|---|---|---|---|
   | `charging.charger.faulted.v1`（CP-A12, E42, 18:10） | 無開放單 | `WorkOrder.open(WO-2208)` | `ops.work_order.opened.v1` | Open |
   | `charging.charger.faulted.v1`（CP-A12, E42, 18:15） | Open | `attachDuplicateReport` | （無整合事件；或 `DuplicateFaultAttached` 只留領域事件） | Open |
   | `ops.work_order.opened.v1` | — | `DispatchPort.assign(WO-2208)` → stub 回 `TECH-HAO` | （內部，不對 Billing） | Assigned |
   | `CloseWorkOrder(WO-2208, outcome=Repaired)` | Assigned | `WorkOrder.close` | `ops.work_order.closed.v1` | Closed |
   | `ops.work_order.closed.v1` | — | Charging 側 `ChargerAvailability.markSellable(CP-A12)` | — | — |
2. **（45 分）TDD**，檔案：
   - Node：`src/assetops/application/FaultProcessManager.ts`、`src/assetops/application/DispatchPort.ts`、`src/adapters/dispatch/StubDispatch.ts`（永遠回 `TECH-HAO`）、`src/charging/application/ChargerAvailabilityConsumer.ts`（訂閱 `ops.work_order.closed.v1`）。
   - Python：`src/assetops/application/fault_process_manager.py`、`dispatch_port.py`、`src/adapters/dispatch/stub_dispatch.py`、`src/charging/application/charger_availability_consumer.py`。
   - 測試 Node `test/assetops/application/FaultProcessManager.test.ts`、Python `tests/assetops/application/test_fault_process_manager.py`：
     - `ChargerFaulted opens WO-2208 and emits ops.work_order.opened.v1`
     - `R5 second E42 on CP-A12 while WO-2208 is open attaches a duplicate and emits no second opened event`
     - `E17 on CP-A12 while WO-2208 is open opens a new work order`
     - `AssetOps consumer is idempotent on chargerId and faultCode while the work order is open`（同一 faulted 信封重送 → 不是「附加重複申告」而是忽略；想清楚：重送 = 同 `eventId`，重複申告 = 不同 `eventId`。兩者都不能開第二張單。）
     - `work order opened triggers dispatch stub which assigns TECH-HAO`
     - `closing WO-2208 emits ops.work_order.closed.v1 and CP-A12 becomes sellable again`
     - `AssetOps never emits an event to Billing`（bus 上訂閱 Billing 的 handler 在整條鏈中沒被呼叫）。
3. **（15 分）** 用 `/event-contract` 審整條鏈的事件：命名、版本、信封、`causationId` 鏈（faulted → opened → closed 要串得起來）、Outbox（PM 自己發的事件也要走 Outbox，不能直接 publish）。
4. **（15 分）** 全部測試跑一次；把「`/event-contract` 發現的問題與修正」寫進 `event-flow.md`；PM 狀態表補完。

### 貼給 Claude Code 的提示
```
/tdd FaultProcessManager

Day 5 Block 3。我要 TDD 故障 Process Manager：charging.charger.faulted.v1 → WorkOrder（R5）→ ops.work_order.opened.v1 → Dispatch stub（TECH-HAO）→ CloseWorkOrder → ops.work_order.closed.v1 → 樁恢復可售。
狀態表在 workshop/day5/event-flow.md。照 /tdd 規則。
先問我兩個問題：
1. 「同一 faulted 信封重送」與「不同信封、同樁同故障碼」我打算分別怎麼處理？去重鍵各是什麼？
2. Process Manager 自己發出的事件走不走 Outbox？如果 PM 在處理到一半掛掉會發生什麼？
這是我的第一個測試：
<貼上>
```
```
/event-contract

Day 5 Block 3 尾聲。請直接讀 starter/<lang>/src/assetops/、src/charging/application/、src/shared/、contracts/，審查整條故障鏈：
1. 每個發出的整合事件：type 命名是否符合 <context>.<noun>.<past_verb>.v<n>、信封齊全、有走 Outbox。
2. causationId 是否串成 faulted → opened → closed 的鏈；correlationId 是否整條一致。
3. 有沒有任何 AssetOps → Billing 的事件或呼叫（不該有）。
4. Dispatch stub 是否只透過 port 被呼叫、能否之後換成真實作而不改 PM。
用「檔名:行號 | 問題 | 問我的問題」表格回，不要改碼。最後給「下一個最小步驟」。
```

### 你自己要做的
- PM 的狀態存哪裡？今天 in-memory 即可，但要有一個 `ProcessStateRepository` 之類的 port——PM 掛掉重啟要能接續。
- 「可售」（sellable）是 Charging 的概念還是 AssetOps 的？決定並寫理由（提示：§1.4「AssetOps 是總部主系統；場站只上報」、「Charging 健康」訂閱 `closed`）。

### 常見卡點
- **PM 直接 `new WorkOrder` 然後 `bus.publish`** → PM 也是應用層：透過 `WorkOrderRepository` 存、事件進 Outbox、relay 送。
- **重送與重複申告混在一起** → 兩層去重：`ProcessedEvents(eventId)` 擋重送；`findOpenBy(chargerId, faultCode)` 擋重複申告。
- **關單後再申告同故障碼** → R5 說「在工單開放期間」。關單後再來 `E42` 就是新單（`WO-2209`）。寫個測試證明。
- **Dispatch stub 想發 `ops.technician.dispatched`** → MVP1 沒有這個契約；內部回傳值即可，且絕不對 Billing 發。

### 產出
- `src/assetops/application/**`、`src/adapters/dispatch/**`、`src/charging/application/ChargerAvailabilityConsumer` 測試全綠。
- `event-flow.md` 完整：PM 狀態表、`/event-contract` 審查與修正紀錄、測試指令與結果。

---

## Check-out（30 分鐘）

### Quiz（5 題）
1. 在 `save()` 之後直接 `bus.publish()` 有哪兩種失敗情境？Outbox 怎麼解？
2. at-least-once 代表消費者可能收到幾次同一事件？Billing 的去重鍵為什麼是 `sessionId` 而不只是 `eventId`？
3. `ChargingCompleted`（領域事件）與 `charging.session.completed.v1`（整合事件）差在哪？誰負責把前者變成後者？
4. 18:10 `E42`、18:15 `E42`、18:20 `E17`，都在 `CP-A12`：會有幾張工單？哪一張有「重複申告」？
5. Billing 消費者能不能 import `ChargingSessionRepository`？為什麼？

<details>
<summary>參考答案</summary>

1. 存成功、發失敗（下游永遠收不到）；發成功、存失敗（下游收到不存在的事實）。Outbox：事件與聚合狀態在同一交易寫入同一儲存；relay 另外讀 outbox 發布並標記，失敗就重試。
2. ≥ 1 次。`eventId` 只能擋「同一封重送」；上游若因 bug 或重試對同一會話發了兩封不同 `eventId` 的 completed，只有 `sessionId` 能保證一張帳單。實務上兩層都做。
3. 領域事件是聚合內部、以領域語言命名、欄位可含內部細節；整合事件是跨 context 契約：有信封、版本、Schema，改欄位要升版。應用層的 mapper（`integration-mapper`）負責翻譯，聚合不知道整合事件存在。
4. 兩張：`WO-2208`（E42，帶一筆 18:15 的重複申告）與一張新的（E17）。
5. 不能。Charging → Billing 是 Customer-Supplier：上游事件是契約，帳務不得回呼；它需要的資料都在 payload。測試 `Billing consumer never calls back into Charging` 守這條。
</details>

### 交付物自評
- [ ] 四個命令處理器測試全綠；`StartCharging` 有 rollback 測試
- [ ] bus 只透過 Outbox relay 收到事件；聚合與處理器內無 `publish`
- [ ] `contracts/` 七組 Schema + 範例，驗證測試綠；MVP1 發出的信封通過 Schema
- [ ] Billing：草稿帳單、`sessionId` 冪等、不回呼 Charging、R7 最小版本
- [ ] PM：開單 / 附加 / 新故障碼 / 重送 / 派工 stub / 關單恢復可售，全綠；不對 Billing 發事件
- [ ] `event-flow.md` 六個小節齊全；commit 在 `workshop/<你的名字>`

### 用 /checkout 讓助教檢查
```
/checkout

今天是 Day 5。請對照 docs/rubric.md 的 Day 5 DoD：
1. 跑 starter/<lang> 測試，貼摘要；列出測試名並標出對應的規則 / 事件。
2. grep src/ 內所有 publish( 的呼叫點：只允許出現在 src/shared/outbox-relay；其他地方列出檔名行號。
3. 檢查 contracts/ 七個 Schema 與範例是否齊全。
4. 檢查 workshop/day5/event-flow.md 六個小節。
每項回「過 / 不過 + 一句理由」；不過的給一個問題。最後給「下一個最小步驟」，以及明天 Day 6 前我該先確認哪些工具已安裝（依我的 LANG）。
```

---

## 如果你落後了

最小可行版本（約 4 小時）：
- B1 只做 `StartCharging` 與 `StopCharging` 兩個處理器 + in-memory UoW + Outbox；rollback 測試可延後。
- B2 只寫 MVP1 發出的四個 Schema（started、completed、faulted、opened）+ 範例；relay + Billing 消費者只做「產草稿」與「冪等」兩個測試。
- B3 只做「開單」與「R5 附加」兩個測試；派工 stub 與關單明天 E2E 時補。
- `contracts/` 剩下三個（closed、parking ×2）直接照 §1.8 填最小 Schema。

## 延伸

- Outbox relay 加「失敗重試 + 死信」：`markFailed(id, error)`，三次失敗進 dead letter；寫測試。
- 讓 `parking.session.closed.v1` 真的有一個 stub 發布者（`scripts/` 或測試 helper），Billing 收到後把停車費併進同一張草稿——這是 Sprint 2「合併出帳」的前哨。
- 用 Mermaid `stateDiagram-v2` 畫 PM 的狀態機，和 `docs/diagrams/fault-saga.*` 比對，找出差異寫進 `event-flow.md`。
