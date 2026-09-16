# 六角架構（Hexagonal Architecture / Ports & Adapters）

> Day 4 B1 決定目錄、Day 5 填應用層、Day 6 接 adapter。`starter/node/` 與 `starter/python/` 的骨架就是本文的目錄。

## 讀完你會拿到

- Port 與 Adapter 的定義，以及「依賴規則」一句話。
- starter 的實際目錄結構，每個目錄放什麼、不放什麼。
- OCPP ACL 在六角架構裡的位置（它是一個 inbound adapter，不是 domain）。
- 在 port 上放測試替身（test double）的做法，讓 Day 4–5 完全不需要 DB、broker、HTTP。

---

## 1. 為什麼存在

Alistair Cockburn 在 2005 年提出 Hexagonal Architecture，動機只有一句：**讓應用程式可以在沒有 UI、沒有資料庫的情況下被驅動與測試**。

對我們：`ChargingSession` 的 R1–R4 應該在沒有 Fastify / FastAPI、沒有 SQLite、沒有 OCPP 模擬器的情況下就能測完。Day 4 整天沒有任何 I/O。Day 6 才把 adapter 接上，而且接上時**聚合一行都不改**。

它也是 R8 的架構保證：聚合在最裡面，bus 在最外面，中間隔著 port。

---

## 2. 核心觀念

### 2.1 三個詞

| 詞 | 定義 | 我們的例子 |
|---|---|---|
| **核心（application core）** | 領域 + 應用服務。不知道外面世界的技術 | `ChargingSession`、`ChargingService` |
| **Port** | 核心對外界的**介面**（interface / Protocol）。分兩種：驅動（inbound）與被驅動（outbound） | inbound：`ChargingService.startCharging(cmd)`；outbound：`ChargingSessionRepository`、`Outbox` |
| **Adapter** | 把某個具體技術接到某個 port 的實作 | inbound：HTTP 路由、`OcppAcl`；outbound：`InMemoryChargingSessionRepository`、SQLite repo |

### 2.2 依賴規則（一句話）

**箭頭永遠指向核心。** adapter 依賴 port，port 由核心定義，核心不依賴任何 adapter。

```
[HTTP adapter] ──▶ [ChargingService.startCharging] ──▶ [ChargingSession]
[OcppAcl]      ──▶ [ChargingService.reportFault]   ──▶ [ChargingSession]
                                                          │
[SQLite repo]  ◀── implements ── [ChargingSessionRepository] ◀── 核心使用
[OutboxRelay]  ◀── reads ─────── [Outbox] ◀── ChargingService.commit 寫入
```

檢查法：`src/*/domain/` 與 `src/*/application/` 裡的 import 不准出現 `adapters/`、`shared/EventBus`、`node:http`、`sqlite`。這條可以寫成一個測試（`tdd.md` §7）。

### 2.3 為什麼是六角形

沒有意義，Cockburn 只是想畫一個「每一邊都可以接東西」的形狀。重點是**左右對稱**：左邊是驅動它的東西（HTTP、OCPP、CLI、測試），右邊是它驅動的東西（DB、bus、時鐘）。**測試是一個合法的 driving adapter**。

---

## 3. starter 的目錄（Node；Python 同構，snake_case）

```
starter/node/src/
├── charging/
│   ├── domain/                    聚合、值物件、領域事件（零 I/O）
│   │   ├── ChargingSession.ts     idle() / start / reportMeter / stop / reportFault / pullEvents
│   │   ├── Connector.ts           parseConnectorId / chargerIdOf / connectorIdOf
│   │   ├── Energy.ts              wattHours / toKwh
│   │   ├── IdTag.ts               parseIdTag
│   │   ├── events.ts              ChargingStarted … ChargerFaulted
│   │   └── errors.ts              DomainError / InvalidStateError
│   └── application/
│       ├── commands.ts            StartCharging / ReportMeterValue / StopCharging / ReportFault（純資料）
│       ├── ports.ts               ChargingSessionRepository / AuthorizationService（介面）
│       └── ChargingService.ts     一個命令一個方法；commit = save + outbox 同一交易
├── assetops/
│   ├── domain/                    WorkOrder / events
│   └── application/               FaultProcessManager / ports（WorkOrderRepository, DispatchService）
├── billing/
│   └── BillingDraftConsumer.ts    整合事件消費者（冪等，sessionId）；只認 contracts/ 的 JSON
├── shared/                        跨 context 的「技術港口」，仍然零 I/O 實作以外的東西
│   ├── DomainEvent.ts             { type, occurredAt }
│   ├── IntegrationEvent.ts        信封八欄位 + createIntegrationEvent()
│   ├── Outbox.ts                  Outbox port + InMemoryOutbox
│   ├── OutboxRelay.ts             publishPending()：Outbox → bus（R8 唯一的搬運者）
│   ├── EventBus.ts                InMemoryEventBus（subscribe / publish / redeliver）
│   ├── Clock.ts                   Clock port + SystemClock + FixedClock
│   └── Ids.ts                     newId() / sequence('S-', 991)
├── adapters/
│   ├── ocpp/OcppAcl.ts            inbound：OCPP 1.6J frame → 命令；transactionId ↔ sessionId
│   ├── http/                      inbound：Day 6 你寫（Fastify 或 node:http）
│   └── persistence/               outbound：InMemoryChargingSessionRepository（Day 6 加 SQLite）
└── app.ts                         composition root：組裝 adapter → port，啟動
```

沒有 `infrastructure/` 目錄：**`app.ts` 就是組裝點**（composition root），`shared/` 放跨 context 的技術 port 與它們的 in-memory 實作。教材裡提到「infrastructure 層」時，指的就是 `app.ts` + `adapters/persistence` + Day 6 的 DB 連線。

規則：

| 目錄 | 可以 import | 不可以 import |
|---|---|---|
| `*/domain/` | 同 context 的 domain、`shared/DomainEvent` | 任何 adapter、`shared/EventBus`、`shared/Outbox` |
| `*/application/` | 任何 `*/domain/`、`shared/*`（port 與型別） | `adapters/`、任何框架 |
| `adapters/` | `*/application/`、`*/domain/`（只為了型別） | 其他 adapter（除非透過 port） |
| `billing/` | `shared/IntegrationEvent`、`shared/EventBus` | `charging/domain/`（它是另一個 context！） |
| `app.ts` | 全部（它是組裝點） | — |

最後第二列很重要：**Billing 消費者不准 import Charging 的領域物件**。它只認整合事件的 JSON。這是 Customer–Supplier 關係在程式碼裡的樣子。

---

## 4. Port 的清單

### 4.1 Inbound（驅動）port = 命令（`charging/application/commands.ts`）

| 命令 | 欄位 | 誰會呼叫 |
|---|---|---|
| `StartCharging` | sessionId, connectorId, idTag, meterStartWh, at | HTTP、`OcppAcl`、測試 |
| `ReportMeterValue` | sessionId, meterWh, at | `OcppAcl`、測試 |
| `StopCharging` | sessionId, stopReason, at | 同上 |
| `ReportFault` | chargerId, connectorId?, faultCode, at | `OcppAcl`、測試 |
| （Parking stub）`manualRelease(releasedBy, at)` | — | HTTP（R6） |

每個命令可帶 `correlationId` / `causationId`；adapter 傳進來，沒有就由服務開新的。

### 4.2 Outbound（被驅動）port

```ts
// charging/application/ports.ts
export interface ChargingSessionRepository {
  findById(sessionId: string): Promise<ChargingSession | undefined>;
  findActiveByConnector(connectorId: string): Promise<ChargingSession | undefined>;   // status === Charging
  save(session: ChargingSession): Promise<void>;
}
export interface AuthorizationService { isAuthorized(idTag: string): Promise<boolean>; }   // R2 的領域服務 port

// assetops/application/ports.ts
export interface WorkOrderRepository {
  findById(workOrderId: string): Promise<WorkOrder | undefined>;
  findOpenByFault(chargerId: string, faultCode: string): Promise<WorkOrder | undefined>;   // R5
  save(workOrder: WorkOrder): Promise<void>;
}
export interface DispatchService { requestTechnician(workOrderId: string, chargerId: string): Promise<string>; }   // MVP1 stub → TECH-HAO

// shared/
export interface Outbox { add(e: IntegrationEvent): Promise<void>; pending(): Promise<IntegrationEvent[]>; markPublished(eventId: string): Promise<void>; }
export interface Clock { now(): string; }
export type IdGenerator = () => string;
```

Python 用 `typing.Protocol`，方法名 snake_case（`find_active_by_connector`）。

---

## 5. OCPP ACL 的位置

ACL 是一個 **inbound adapter**：`adapters/ocpp/OcppAcl.ts`。它做四件事：

1. **協定框架**：解 `[2, uniqueId, action, payload]`，回 `[3, uniqueId, result]`。
2. **翻譯**：`StartTransaction` → `startCharging` 命令；`StatusNotification(Faulted)` → `reportFault`；`MeterValues` 只取 `Energy.Active.Import.Register`；`StopTransaction` → 先 `reportMeterValue(meterStop)` 再 `stopCharging`。
3. **對應**：`transactionId` 由 ACL 發（從 991 起 → `S-991`）；`connectorId: 2` → `CP-A12-2`（`connectorIdOf`）；`connectorId: 0` → `undefined`（整台樁）。
4. **反向翻譯**：拒絕事件 → OCPP 回覆。`Unauthorized` → `idTagInfo.status = 'Invalid'`；`ConnectorOccupied` → `'Blocked'`。

```ts
// adapters/ocpp/OcppAcl.ts（節錄）
case 'StatusNotification': {
  if (p.status !== 'Faulted') return {};                         // 其他狀態 MVP1 不帶命令
  await this.charging.reportFault({ chargerId: this.chargerId,
    connectorId: p.connectorId > 0 ? connectorIdOf(this.chargerId, p.connectorId) : undefined,
    faultCode: p.errorCode, at: p.timestamp });
  return {};
}
case 'StartTransaction': {
  const transactionId = this.nextTransactionId++;
  const events = await this.charging.startCharging({ sessionId: `S-${transactionId}`, connectorId: connectorIdOf(this.chargerId, p.connectorId),
                                                     idTag: p.idTag, meterStartWh: p.meterStart, at: p.timestamp });
  const rejected = events.find(e => e.type === 'ChargingStartRejected');
  return { transactionId, idTagInfo: { status: rejected ? (rejected.reason === 'Unauthorized' ? 'Invalid' : 'Blocked') : 'Accepted' } };
}
```

**傳輸**：真實 OCPP-J 走 WebSocket；工作坊的 `scripts/ocpp-sim` 把同樣的 frame **用 HTTP POST 打到 `/ocpp/CP-A12`**（一行一個 frame），省掉 WebSocket 的生命週期問題。ACL 本身不知道差別——它只收 frame。Day 6 的 HTTP adapter 負責 `POST /ocpp/:chargerId` → `OcppAcl.handle(frame)`。

ACL 的測試是**純函式測試**：給 frame、期望命令與回覆（`solutions/node/test/adapters/OcppAcl.test.ts` 有一個專門檢查「OCPP 字眼沒有洩入領域事件」）。

**為什麼不把翻譯放在 domain？** 因為 domain 不能知道 OCPP 的存在（依賴規則）。**為什麼它在 `adapters/` 而不是 `charging/`？** 因為它綁定一個外部協定；換掉 OCPP（例如改用某廠商私有 API）只需要換這個檔案。

---

## 6. 在 port 上放測試替身

Day 4–5 的所有測試都用這些替身，全部已在 starter：

| 替身 | Port | 位置 | 用途 |
|---|---|---|---|
| `InMemoryChargingSessionRepository` | `ChargingSessionRepository` | `adapters/persistence/` | 幾乎所有應用層測試 |
| `InMemoryAuthorizationService` | `AuthorizationService` | `adapters/persistence/`（solutions） | 白名單：`TAG-MONTHLY-77` 有效 |
| `InMemoryOutbox` | `Outbox` | `shared/Outbox.ts` | 斷言整合事件；`all()` 看全部 |
| `InMemoryEventBus` | bus | `shared/EventBus.ts` | `subscribe` / `publish` / **`redeliver(eventId)`**（冪等測試） |
| `FixedClock` | `Clock` | `shared/Clock.ts` | 固定 `14:04` |
| `sequence('S-', 991)` | `IdGenerator` | `shared/Ids.ts` | 依序回 `S-991`, `S-992` |

**Fake vs Mock**：工作坊偏好 fake（有簡單真實行為的替身），少用 mock 框架。原因：fake 的測試讀起來像規格；mock 的測試讀起來像實作。`/review` 會對「一個測試裡 5 個 `expect(mock).toHaveBeenCalledWith`」皺眉。

---

## 7. 一個命令從外到內的完整路徑（Day 6 的樣子）

```
scripts/ocpp-sim ── HTTP POST /ocpp/CP-A12 ──▶ adapters/http（Day 6 你寫）
                                                   │ 解 body 成 frame
                                                   ▼
                                               adapters/ocpp/OcppAcl.handle(frame)
                                                   │ 翻譯成 StartCharging 命令
                                                   ▼
                                               charging/application/ChargingService.startCharging
                                                   │ authorization.isAuthorized（R2 的答案）
                                                   │ sessions.findActiveByConnector ?? ChargingSession.idle
                                                   │ session.start(...)（R1、R2 在聚合內）
                                                   │ commit：sessions.save + outbox.add(整合事件)   ← 同一交易
                                                   ▼
                                               adapters/persistence（Day 6：SQLite）
                                                   ▼
                                               shared/OutboxRelay.publishPending() ──▶ InMemoryEventBus ──▶ billing / assetops
```

Day 4 你只有 `ChargingSession`。Day 5 加 `ChargingService`、in-memory outbox / bus、消費者。Day 6 換外圈（HTTP、SQLite）。**每一天換掉的都是 adapter，核心不動**——如果你發現 Day 6 要改聚合，就是 Day 4 的 port 設計錯了，這是正常的學習訊號，記進 retro。

---

## 8. 在本專案怎麼出現

| Day | 六角架構的影子 |
|---|---|
| 4 | 聚合 + `model.md` 的目錄對照；starter 已給 in-memory repo |
| 5 | `ChargingService`、`FaultProcessManager`、`BillingDraftConsumer`；Outbox / bus 都是 in-memory |
| 6 | HTTP、SQLite adapter；`app.ts` 組裝；`scripts/ocpp-sim --url` 打進來 |
| 7 | `/review` 檢查依賴規則 |

---

## 9. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| 目錄叫 `controllers/ services/ models/`（按技術層） | 按 context + 六角角色 |
| Repository 回 DTO / row，不回聚合 | Repository 的單位是聚合 |
| 應用服務裡寫業務規則 | 規則進聚合；應用服務只協調（`ChargingService` 的註解：No business rules here） |
| 聚合裡呼叫 repository | 聚合不知道 repo 的存在；`authorized` 是參數 |
| 一個「萬用」port `Database` | port 以核心的需要命名：`ChargingSessionRepository` |
| ACL 先回 `Accepted` 給樁然後才處理命令 | 先處理命令再回；拒絕要回 `Blocked` / `Invalid` |
| 為了「解耦」加了七層 mapper | 一個 context 一層翻譯就夠 |
| Billing import `ChargingSession` 型別 | 只認契約 JSON |
| 把 `shared/` 當垃圾桶塞業務邏輯 | `shared/` 只有技術 port 與信封 |

---

## 10. 延伸閱讀

- Alistair Cockburn, "Hexagonal Architecture", 2005（alistair.cockburn.us）。—— 原文，短，讀原文。
- Alistair Cockburn & Juan Manuel Garrido de Paz, *Hexagonal Architecture Explained*, 2024。—— 原作者 20 年後的正式版。
- Robert C. Martin, "The Clean Architecture", 2012（部落格）與 *Clean Architecture*, 2017。—— 依賴規則的另一種表述；注意它不是六角的同義詞。
- Jeffrey Palermo, "The Onion Architecture", 2008。—— 同一族的第三種畫法。
- Tom Hombergs, *Get Your Hands Dirty on Clean Architecture*, 2019。—— 有目錄結構與 ArchUnit 測試範例。
- Vaughn Vernon, *Implementing Domain-Driven Design*, 2013, 第 4 章 "Architecture"。—— 六角 + DDD。
- Gerard Meszaros, *xUnit Test Patterns*, 2007, 第 11 章 "Using Test Doubles"。—— Fake / Stub / Spy / Mock 的正名。

---

## 自我檢查

1. 依賴規則的一句話是什麼？用 import 檢查怎麼驗證？
2. `OcppAcl` 為什麼放在 `adapters/ocpp/` 而不是 `charging/domain/`？它把 `ConnectorOccupied` 翻成什麼回給樁？
3. `findActiveByConnector` 這個 port 方法在 starter 的設計裡是為了什麼？R1 本身在哪裡判？
4. Billing 消費者為什麼不准 import `ChargingSession`？這對應哪種 context map 關係？
5. `InMemoryEventBus.redeliver()` 存在的目的是什麼？它在 Day 5 的哪個測試會用到？
