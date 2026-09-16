# 六角架構（Hexagonal Architecture / Ports & Adapters）

> Day 4 B1 決定目錄、Day 5 填應用層、Day 6 接 adapter。`starter/node/` 與 `starter/python/` 的骨架就是本文的目錄。

## 讀完你會拿到

- Port 與 Adapter 的定義，以及「依賴規則」一句話。
- starter 的目錄結構，每個目錄放什麼、不放什麼。
- OCPP ACL 在六角架構裡的位置（它是一個 inbound adapter，不是 domain）。
- 在 port 上放測試替身（test double）的做法，讓 Day 4–5 完全不需要 DB、broker、WebSocket。

---

## 1. 為什麼存在

Alistair Cockburn 在 2005 年提出 Hexagonal Architecture，動機只有一句：**讓應用程式可以在沒有 UI、沒有資料庫的情況下被驅動與測試**。

對我們：`ChargingSession` 的 R1–R4 應該在沒有 Fastify / FastAPI、沒有 SQLite、沒有 WebSocket、沒有 OCPP 模擬器的情況下就能測完。Day 4 整天沒有任何 I/O。Day 6 才把 adapter 接上，而且接上時**聚合一行都不改**。

它也是 R8 的架構保證：聚合在最裡面，broker 在最外面，中間隔著 port。

---

## 2. 核心觀念

### 2.1 三個詞

| 詞 | 定義 | 我們的例子 |
|---|---|---|
| **核心（application core）** | 領域 + 應用服務。不知道外面世界的技術 | `ChargingSession`, `StartCharging` handler |
| **Port** | 核心對外界的**介面**（interface / Protocol）。分兩種：驅動（inbound）與被驅動（outbound） | inbound：`StartCharging` 命令；outbound：`ChargingSessionRepository` |
| **Adapter** | 把某個具體技術接到某個 port 的實作 | inbound：HTTP controller、OCPP ACL；outbound：SQLite repo、in-memory repo |

### 2.2 依賴規則（一句話）

**箭頭永遠指向核心。** adapter 依賴 port，port 由核心定義，核心不依賴任何 adapter。

```
[HTTP adapter] ──▶ [inbound port: StartCharging] ──▶ [ChargingSession]
[OCPP ACL]     ──▶ [inbound port: ReportFault]  ──▶ [WorkOrder]
                                                        │
[SQLite repo]  ◀── implements ── [outbound port: ChargingSessionRepository] ◀── 核心使用
[Outbox relay] ◀── implements ── [outbound port: Outbox]
```

檢查法：`src/charging/domain/` 與 `src/app/` 裡的 import 不准出現 `adapters/`、`infrastructure/`、`fastify`、`sqlite`、`ws`。這條可以寫成一個測試（見 `tdd.md` §7）。

### 2.3 為什麼是六角形

沒有意義，Cockburn 只是想畫一個「每一邊都可以接東西」的形狀。重點是**左右對稱**：左邊是驅動它的東西（HTTP、OCPP、CLI、測試），右邊是它驅動的東西（DB、broker、時鐘）。**測試是一個合法的 driving adapter**。

---

## 3. starter 的目錄

```
starter/node/src/              （python 同構：starter/python/src/）
├── charging/
│   ├── domain/                聚合、值物件、領域事件、repository port（介面）
│   │   ├── ChargingSession.ts
│   │   ├── values.ts          Connector / Energy / IdTag
│   │   ├── events.ts          ChargingStarted … MeterValueRejected
│   │   └── ports.ts           ChargingSessionRepository, AuthorizationPolicy（介面）
│   └── acl/                   OCPP → 命令 的翻譯（Day 6）；transactionId ↔ sessionId 對應
├── assetops/
│   └── domain/                WorkOrder, WorkOrderRepository port
├── billing/
│   └── DraftInvoiceConsumer.ts    整合事件消費者（冪等）；草稿帳單
├── app/                       應用層：命令處理器、Process Manager、Unit of Work port、Outbox port
│   ├── StartCharging.ts
│   ├── StopCharging.ts
│   ├── ReportMeterValue.ts
│   ├── ReportFault.ts
│   ├── FaultToWorkOrder.ts    Process Manager（Day 5 B3）
│   └── ports.ts               UnitOfWork, Outbox, Clock, IdGenerator, EventBus（介面）
├── adapters/
│   ├── inbound/
│   │   ├── http/              Fastify routes → 命令
│   │   └── ocpp/              WebSocket server → acl → 命令
│   └── outbound/
│       ├── memory/            InMemoryChargingSessionRepository, InMemoryOutbox（測試 + Day 4–5）
│       ├── sqlite/            SqliteChargingSessionRepository, SqliteOutbox（Day 6）
│       └── relay/             OutboxRelay → EventBus
├── infrastructure/            DB 連線、設定、logging、程序啟動（composition root）
│   └── main.ts
└── contracts/  → 指向 repo 根目錄 contracts/（JSON Schema）
```

規則：

| 目錄 | 可以 import | 不可以 import |
|---|---|---|
| `*/domain/` | 同 context 的 domain | 任何其他目錄 |
| `app/` | 任何 `*/domain/`、`app/ports` | `adapters/`、`infrastructure/`、任何框架 |
| `adapters/` | `app/`、`*/domain/`（只為了型別） | 其他 adapter（除非透過 port） |
| `infrastructure/` | 全部（它是組裝點） | — |
| `billing/` | 只 import `contracts/` 的型別 | `charging/domain/`（它是另一個 context！） |

最後一列很重要：**Billing 消費者不准 import Charging 的領域物件**。它只認整合事件的 JSON。這是 Customer–Supplier 關係在程式碼裡的樣子。

---

## 4. Port 的清單

### 4.1 Inbound（驅動）port = 命令

| 命令 | 參數 | 誰會呼叫 |
|---|---|---|
| `StartCharging` | connectorId, idTag, meterStartWh, at | HTTP、OCPP ACL、測試 |
| `StopCharging` | sessionId, meterStopWh, at, stopReason | 同上 |
| `ReportMeterValue` | sessionId, wh, at | OCPP ACL、測試 |
| `ReportFault` | chargerId, connectorId?, faultCode, stillEnergized, at | OCPP ACL、測試 |
| `ReleaseVehicleManually`（Parking stub） | parkingSessionId, plate, operator, at | HTTP |

在 TypeScript 裡通常是一個 `handle(cmd): Promise<Result>` 的類別；Python 是一個 `Handler` 類別或函式。

### 4.2 Outbound（被驅動）port

```ts
// src/charging/domain/ports.ts
export interface ChargingSessionRepository {
  findById(id: string): Promise<ChargingSession | null>;
  findActiveByConnector(connectorId: string): Promise<ChargingSession | null>;   // R1 用
  save(s: ChargingSession): Promise<void>;
}
export interface AuthorizationPolicy {           // R2 用；領域服務的 port
  isAuthorized(idTag: IdTag, connector: Connector): Promise<boolean>;
}

// src/app/ports.ts
export interface Outbox { append(events: IntegrationEvent[]): Promise<void>; }
export interface UnitOfWork { run<T>(fn: () => Promise<T>): Promise<T>; }   // 交易邊界
export interface Clock { now(): Date; }
export interface IdGenerator { next(prefix: "S" | "WO" | "INV"): string; }
export interface EventBus { publish(e: IntegrationEvent): Promise<void>; subscribe(type: string, h: Handler): void; }
```

Python 用 `typing.Protocol`：

```python
class ChargingSessionRepository(Protocol):
    def find_by_id(self, id: str) -> ChargingSession | None: ...
    def find_active_by_connector(self, connector_id: str) -> ChargingSession | None: ...
    def save(self, s: ChargingSession) -> None: ...
```

---

## 5. OCPP ACL 的位置

ACL 是一個 **inbound adapter**，住在 `adapters/inbound/ocpp/` + `charging/acl/`。它做四件事：

1. **協定框架**：解 `[2, id, action, payload]`，回 `[3, id, result]`。（`adapters/inbound/ocpp/server.ts`）
2. **翻譯**：`StartTransaction` → `StartCharging` 命令；`StatusNotification(Faulted)` → `ReportFault` 命令。（`charging/acl/translate.ts`）
3. **對應表**：`transactionId 5567 ↔ S-991`；`connectorId 2 @ CP-A12 ↔ CP-A12-2`。（`charging/acl/mapping.ts`，用 outbound port 存）
4. **反向翻譯**：`ChargingStartRejected` → `idTagInfo.status = "Invalid"`。

```ts
// charging/acl/translate.ts（節錄）
export function toCommand(chargerId: string, action: string, payload: any, clock: Clock): Command | null {
  switch (action) {
    case "StartTransaction":
      return { type: "StartCharging", connectorId: `${chargerId}-${payload.connectorId}`, idTag: payload.idTag,
               meterStartWh: Number(payload.meterStart), at: new Date(payload.timestamp) };
    case "StatusNotification":
      if (payload.status !== "Faulted") return null;   // 其他狀態 MVP1 只記 log
      return { type: "ReportFault", chargerId, connectorId: payload.connectorId === 0 ? null : `${chargerId}-${payload.connectorId}`,
               faultCode: payload.errorCode, stillEnergized: false, at: new Date(payload.timestamp) };
    case "MeterValues": {
      const energy = payload.meterValue.flatMap((m: any) => m.sampledValue)
        .find((s: any) => s.measurand === "Energy.Active.Import.Register");
      return energy ? { type: "ReportMeterValue", sessionId: /* 查對應表 */ "", wh: Number(energy.value), at: new Date(payload.meterValue[0].timestamp) } : null;
    }
    // …
  }
}
```

ACL 的測試是**純函式測試**：給 JSON、期望命令。不需要 WebSocket。Day 6 才把 `ws` 接上。

**為什麼不把翻譯放在 domain？** 因為 domain 不能知道 OCPP 的存在（依賴規則）。**為什麼不只放在 adapter？** 因為對應表與翻譯規則是 Charging 的知識，換掉 WebSocket 函式庫不該影響它。所以拆成 `charging/acl/`（純翻譯，屬於 context）與 `adapters/inbound/ocpp/`（技術）。

---

## 6. 在 port 上放測試替身

Day 4–5 的所有測試都用這四種替身，全部住在 `adapters/outbound/memory/` 或測試目錄：

| 替身 | Port | 行為 | 用途 |
|---|---|---|---|
| `InMemoryChargingSessionRepository` | Repository | Map 存物件 | 幾乎所有測試 |
| `FixedClock` | Clock | 回固定時間 `14:04` | 讓 `startedAt` 可斷言 |
| `SequenceIdGenerator` | IdGenerator | 依序回 `S-991`, `S-992` | 讓 sessionId 可斷言 |
| `AllowListAuthorizer` | AuthorizationPolicy | 只認 `TAG-MONTHLY-77` | R2 |
| `SpyOutbox` / `InMemoryOutbox` | Outbox | 記錄 append 的事件 | 斷言整合事件 |
| `InMemoryEventBus` | EventBus | 同步呼叫訂閱者 | Day 5 消費者測試 |

```ts
// test/support/fakes.ts
export class InMemoryChargingSessionRepository implements ChargingSessionRepository {
  private items = new Map<string, ChargingSession>();
  async findById(id) { return this.items.get(id) ?? null; }
  async findActiveByConnector(connectorId) {
    return [...this.items.values()].find(s => s.connector.id === connectorId && s.isActive()) ?? null;
  }
  async save(s) { this.items.set(s.id, s); }
}
export class FixedClock implements Clock { constructor(private t: Date) {} now() { return this.t; } }
```

**Fake vs Mock**：工作坊偏好 fake（有簡單真實行為的替身），少用 mock 框架。原因：fake 的測試讀起來像規格；mock 的測試讀起來像實作。`/review` 會對「一個測試裡 5 個 `expect(mock).toHaveBeenCalledWith`」皺眉。

---

## 7. 一個命令從外到內的完整路徑（Day 6 的樣子）

```
scripts/ocpp-sim ── ws ──▶ adapters/inbound/ocpp/server.ts
                              │ 解框架
                              ▼
                          charging/acl/translate.ts ──▶ StartCharging 命令
                              │
                              ▼
                          app/StartCharging.ts
                              │ repo.findActiveByConnector（R1）
                              │ auth.isAuthorized（R2）
                              │ ChargingSession.start(...)
                              │ uow.run: repo.save + outbox.append(session.pullEvents() → 整合事件)
                              ▼
                          adapters/outbound/sqlite/*  （同一交易）
                              ▼
                          adapters/outbound/relay/OutboxRelay.ts ──▶ EventBus ──▶ billing/DraftInvoiceConsumer
```

Day 4 你只有中間那一段（聚合 + in-memory repo）。Day 5 加 `app/` 與 in-memory outbox/bus。Day 6 換外圈。**每一天換掉的都是 adapter，核心不動**——如果你發現 Day 6 要改聚合，就是 Day 4 的 port 設計錯了，這是正常的學習訊號，記進 retro。

---

## 8. 在本專案怎麼出現

| Day | 六角架構的影子 |
|---|---|
| 4 | 建目錄；聚合 + repository port + in-memory adapter |
| 5 | `app/` 命令處理器；Outbox port；in-memory bus |
| 6 | HTTP、OCPP、SQLite adapter；composition root |
| 7 | `/review` 檢查依賴規則 |

---

## 9. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| 目錄叫 `controllers/ services/ models/`（按技術層） | 按 context + 六角角色 |
| Repository 回 DTO / row，不回聚合 | Repository 的單位是聚合 |
| 應用服務裡寫業務規則 | 規則進聚合；應用服務只協調 |
| 聚合裡呼叫 repository | 聚合不知道 repo 的存在 |
| 一個「萬用」port `Database` | port 以核心的需要命名：`ChargingSessionRepository` |
| ACL 直接回 HTTP 200 給樁然後才處理命令 | 先處理命令再回；拒絕要回 `Invalid` |
| 為了「解耦」加了七層 mapper | 一個 context 一層翻譯就夠 |
| Billing import `ChargingSession` 型別 | 只認契約 JSON |

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
2. OCPP ACL 為什麼拆成 `charging/acl/` 與 `adapters/inbound/ocpp/` 兩塊？各放什麼？
3. `findActiveByConnector` 這個 port 方法是為了哪條規則存在的？它為什麼不在聚合裡？
4. Billing 消費者為什麼不准 import `ChargingSession`？這對應哪種 context map 關係？
5. Fake 與 Mock 的差別是什麼？為什麼工作坊偏好 fake？
