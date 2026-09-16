# 戰術 DDD（Tactical Domain-Driven Design）

> Day 4 B1、B3 的方法論。交付物：`starter/<lang>/src/charging/**` 測試全綠。用 `/aggregate-review` 審查聚合。
> 本文的程式碼是**草圖**（sketch），不是參考解；`solutions/` 才是，卡住 20 分鐘再看。

## 讀完你會拿到

- 八個戰術模式各一句定義、一個判斷法、一個本專案的例子。
- Vernon 的四條聚合設計規則，以及它們在 `ChargingSession` 與 `WorkOrder` 上的具體長相。
- `ChargingSession`（R1–R4）與 `WorkOrder`（R5）的 TypeScript 與 Python 草圖。
- 領域事件「記錄在聚合內、由外面 pull 出去」的機制，以及為什麼聚合絕對不能直接 publish（R8）。

---

## 1. 為什麼存在

戰略 DDD 決定「Charging 是一個 context」；戰術 DDD 決定「Charging 裡面的程式碼長什麼樣，才能讓 R1–R4 永遠成立」。

沒有戰術模式的程式碼長這樣：

```ts
// ❌ 貧血模型 + 規則散落在 service
async function startCharging(req) {
  const s = await db.query("SELECT * FROM sessions WHERE connector_id = ? AND status = 'Charging'", [req.connectorId]);
  if (s.length > 0) throw new Error("occupied");        // R1 在這裡
  const tag = await authService.check(req.idTag);        // R2 在這裡
  if (!tag.ok) throw new Error("unauthorized");
  await db.insert("sessions", {...});
  await broker.publish("charging.session.started.v1", {...});   // 違反 R8
}
```

三個月後 R1 會在四個地方各有一份略微不同的實作。戰術 DDD 的目標只有一個：**規則有唯一的家**。

---

## 2. 八個模式

| 模式 | 一句話 | 判斷法 | 本專案 |
|---|---|---|---|
| **實體（Entity）** | 有身份、會隨時間改變的東西 | 「兩個屬性完全相同的它，是同一個嗎？」是 → 實體 | `ChargingSession(S-991)`, `WorkOrder(WO-2208)` |
| **值物件（Value Object）** | 沒身份、以值定義、不可變 | 兩個值相同就可互換 → VO | `Connector(CP-A12-2)`, `Energy(12400 Wh)`, `IdTag(TAG-MONTHLY-77)`, `FaultCode` |
| **聚合（Aggregate）** | 一組實體 + VO，以一個根為入口，作為一致性邊界 | 「哪些東西必須在同一個交易裡保持一致？」 | `ChargingSession`（根本身就是全部）、`WorkOrder` + 重複申告清單 |
| **聚合根（Aggregate Root）** | 聚合唯一的對外入口；外面只能持有根的 ID | 外面能直接改子物件嗎？不能 | `ChargingSession`, `WorkOrder` |
| **領域事件（Domain Event）** | 聚合內發生的、以過去式命名的事實 | 是不是「已經發生、不可否認」？ | `ChargingStarted`, `MeterValueRejected`, `WorkOrderOpened` |
| **儲存庫（Repository）** | 以聚合為單位存取的集合介面 | 一個 repo 對一個聚合根 | `ChargingSessionRepository`, `WorkOrderRepository` |
| **領域服務（Domain Service）** | 不屬於任何一個聚合的領域邏輯 | 「這個邏輯需要兩個以上聚合，或不屬於任何實體」 | 授權策略 `AuthorizationPolicy`（憑證 × 斷線狀態 × 白名單） |
| **工廠（Factory）** | 建立複雜聚合的邏輯 | 建構需要驗證或多步驟 | `ChargingSession.start(...)` 靜態方法 |

兩個常見的分類錯誤：

- **`Connector` 是值物件，不是實體**。在 Charging 裡我們只在乎「哪一把槍」，不在乎它的歷史；歷史是 AssetOps 的事（那裡它可能是實體）。同一個名詞在不同 context 可以是不同模式。
- **`Energy` 是值物件**，帶單位與運算（`minus`、`isAfter`），不是裸 `number`。R3 的「單調遞增」與 R4 的「相減」都住在它裡面或它旁邊。

---

## 3. Vernon 的四條聚合規則

出自 *Implementing Domain-Driven Design* 第 10 章。

### 規則 1：在一致性邊界內保護真正的不變條件
聚合的大小由「哪些東西必須同時為真」決定，不是由「哪些東西相關」決定。

- `ChargingSession` 的不變條件：R1（一個連接器一個進行中會話）、R3（計量單調）、R4（只有 Charging 可 Stop）。
- **注意 R1 其實跨越多個會話**（「這個連接器上有沒有別的會話」）。純聚合內無法保證。工作坊的解法：Repository 提供 `findActiveByConnector`，應用服務先查再呼叫；並在儲存層加唯一約束（`connector_id WHERE status='Charging'`）當最後防線。這是規則 3 的必然結果。

### 規則 2：設計小聚合
聚合越大，交易衝突越多、載入越慢。

- ❌ `Charger` 聚合包含所有 `Connector` 包含所有 `ChargingSession`：改一個會話要鎖整根樁。
- ✅ `ChargingSession` 自己一個聚合，持有 `Connector` 值物件與 `chargerId` 字串。
- ✅ `WorkOrder` 持有 `chargerId` 與 `faultCode`，不持有 `Charger`。

### 規則 3：以 ID 參照其他聚合
聚合之間只用識別碼，不用物件參照。

- `ChargingSession.connector: Connector`（VO，內含 `CP-A12-2`）而非 `ChargingSession.charger: Charger`。
- `WorkOrder.chargerId: "CP-A12"`，不是 `WorkOrder.charger`。

### 規則 4：跨聚合用最終一致性
一個命令、一個交易、一個聚合。跨聚合的一致性靠領域事件。

- `ChargingCompleted` → Billing 草稿更新：最終一致。
- `ChargerFaulted` → `WorkOrder` 開立：最終一致（Day 5 的 Process Manager）。
- 老陳說「晚一點沒關係，不能漏」就是最終一致性的業務背書。

---

## 4. ChargingSession 建模

### 4.1 狀態與轉移

```
           StartCharging（R1, R2）
  (none) ─────────────────────────▶ Charging
                                      │  ReportMeterValue（R3）→ 自迴圈
                                      │  StopCharging（R4）
                                      ▼
                                   Completed
```

刻意沒有的狀態：`Preparing`（那是 OCPP 的）、`Faulted`（那是樁的，不是會話的）、`Suspended`（MVP1 不管）。

### 4.2 值物件

| VO | 欄位 | 不變條件 | 行為 |
|---|---|---|---|
| `Connector` | `chargerId`, `index` 或直接 `id` | 格式 `CP-XXX-n` | `equals` |
| `IdTag` | `value` | 非空 | `equals` |
| `Energy` | `wh: int` | ≥ 0 | `minus(other)`, `isAtLeast(other)`, `toKWh()` |

### 4.3 事件（記錄在聚合內）

| 事件 | 欄位 | 觸發 |
|---|---|---|
| `ChargingStarted` | sessionId, connectorId, idTag, startedAt, meterStartWh | R1/R2 通過 |
| `ChargingStartRejected` | connectorId, idTag, reason, at | R1/R2 擋下（**注意**：沒有會話可掛，見 §4.5） |
| `EnergyMetered` | sessionId, wh, at | R3 通過 |
| `MeterValueRejected` | sessionId, wh, lastWh, at | R3 擋下 |
| `ChargingCompleted` | sessionId, connectorId, energyWh, startedAt, endedAt, stopReason | R4 通過 |

### 4.4 TypeScript 草圖

```ts
// src/charging/domain/ChargingSession.ts
import { Connector, IdTag, Energy } from "./values";
import { DomainEvent } from "./events";

export type SessionStatus = "Charging" | "Completed";

export class ChargingSession {
  private events: DomainEvent[] = [];
  private status: SessionStatus = "Charging";
  private lastMeter: Energy;

  private constructor(
    readonly id: string,
    readonly connector: Connector,
    readonly idTag: IdTag,
    readonly startedAt: Date,
    readonly meterStart: Energy,
  ) {
    this.lastMeter = meterStart;
  }

  // Factory：唯一的建立入口。R1 的「連接器是否占用」由呼叫端（應用服務 + repo）先查，
  // 這裡只負責 R2 之後的建立與事件記錄。
  static start(p: { id: string; connector: Connector; idTag: IdTag; meterStart: Energy; at: Date }): ChargingSession {
    const s = new ChargingSession(p.id, p.connector, p.idTag, p.at, p.meterStart);
    s.record({ type: "ChargingStarted", sessionId: s.id, connectorId: s.connector.id,
               idTag: s.idTag.value, startedAt: s.startedAt, meterStartWh: s.meterStart.wh });
    return s;
  }

  // R3：計量值單調遞增；倒退拒絕並記錄 MeterValueRejected
  reportMeter(reading: Energy, at: Date): void {
    this.assertCharging("ReportMeterValue");
    if (!reading.isAtLeast(this.lastMeter)) {
      this.record({ type: "MeterValueRejected", sessionId: this.id, wh: reading.wh, lastWh: this.lastMeter.wh, at });
      return;                                   // 拒絕不是 throw，是事實
    }
    this.lastMeter = reading;
    this.record({ type: "EnergyMetered", sessionId: this.id, wh: reading.wh, at });
  }

  // R4：只有 Charging 可 Stop；energyWh = 最後計量 − 起始計量
  stop(meterStop: Energy, at: Date, stopReason: string): void {
    this.assertCharging("StopCharging");
    const last = meterStop.isAtLeast(this.lastMeter) ? meterStop : this.lastMeter;   // 結束讀數也受 R3 約束
    this.status = "Completed";
    this.record({ type: "ChargingCompleted", sessionId: this.id, connectorId: this.connector.id,
                  energyWh: last.minus(this.meterStart).wh, startedAt: this.startedAt, endedAt: at, stopReason });
  }

  isActive(): boolean { return this.status === "Charging"; }

  // R8：事件只記錄，不發送。應用服務在交易成功後 pull 出去寫 Outbox。
  pullEvents(): DomainEvent[] { const out = this.events; this.events = []; return out; }

  private record(e: DomainEvent) { this.events.push(e); }
  private assertCharging(cmd: string) {
    if (this.status !== "Charging") throw new InvalidSessionState(this.id, this.status, cmd);
  }
}
```

值物件：

```ts
// src/charging/domain/values.ts
export class Energy {
  private constructor(readonly wh: number) {}
  static wh(n: number): Energy { if (!Number.isInteger(n) || n < 0) throw new Error("Energy must be non-negative integer Wh"); return new Energy(n); }
  minus(o: Energy): Energy { return Energy.wh(this.wh - o.wh); }
  isAtLeast(o: Energy): boolean { return this.wh >= o.wh; }
  toKWh(): number { return this.wh / 1000; }
}
export class Connector {
  constructor(readonly id: string) { if (!/^CP-[A-Z0-9]+-\d+$/.test(id)) throw new Error(`bad connector ${id}`); }
  get chargerId(): string { return this.id.replace(/-\d+$/, ""); }
  equals(o: Connector) { return this.id === o.id; }
}
export class IdTag { constructor(readonly value: string) { if (!value) throw new Error("empty idTag"); } }
```

### 4.5 R1 與 R2 住在哪裡

`ChargingStartRejected` 在**沒有會話**的情況下發生，所以它不能記錄在 `ChargingSession` 上。工作坊的做法（Day 5 會實作）：應用服務 `StartCharging` 持有一個「命令層事件收集器」：

```ts
// src/app/StartCharging.ts（Day 5）
async handle(cmd) {
  const active = await this.sessions.findActiveByConnector(cmd.connectorId);
  if (active) return this.reject(cmd, "ConnectorOccupied");            // R1
  if (!(await this.auth.isAuthorized(cmd.idTag, cmd.connectorId))) return this.reject(cmd, "Unauthorized");  // R2
  const session = ChargingSession.start({...});
  await this.uow.commit(session, session.pullEvents());               // 同一交易寫聚合 + Outbox
}
```

Day 4 你可以先把 R1 寫成「`Connector` 上的第二次 `start` 應該被拒」的測試，用 in-memory repo 模擬。`/tdd` 會接受任一種擺法，只要規則有唯一的家、拒絕是事件不是例外。

### 4.6 Python 草圖

```python
# src/charging/domain/charging_session.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from .values import Connector, IdTag, Energy
from .events import (ChargingStarted, EnergyMetered, MeterValueRejected, ChargingCompleted, DomainEvent)

class InvalidSessionState(Exception): ...

@dataclass
class ChargingSession:
    id: str
    connector: Connector
    id_tag: IdTag
    started_at: datetime
    meter_start: Energy
    status: Literal["Charging", "Completed"] = "Charging"
    _last_meter: Energy = field(init=False)
    _events: list[DomainEvent] = field(default_factory=list, init=False, repr=False)

    def __post_init__(self):
        self._last_meter = self.meter_start

    @classmethod
    def start(cls, *, id: str, connector: Connector, id_tag: IdTag, meter_start: Energy, at: datetime) -> "ChargingSession":
        s = cls(id=id, connector=connector, id_tag=id_tag, started_at=at, meter_start=meter_start)
        s._record(ChargingStarted(session_id=s.id, connector_id=connector.id, id_tag=id_tag.value,
                                  started_at=at, meter_start_wh=meter_start.wh))
        return s

    def report_meter(self, reading: Energy, at: datetime) -> None:          # R3
        self._assert_charging("ReportMeterValue")
        if not reading.is_at_least(self._last_meter):
            self._record(MeterValueRejected(session_id=self.id, wh=reading.wh, last_wh=self._last_meter.wh, at=at))
            return
        self._last_meter = reading
        self._record(EnergyMetered(session_id=self.id, wh=reading.wh, at=at))

    def stop(self, meter_stop: Energy, at: datetime, stop_reason: str) -> None:   # R4
        self._assert_charging("StopCharging")
        last = meter_stop if meter_stop.is_at_least(self._last_meter) else self._last_meter
        self.status = "Completed"
        self._record(ChargingCompleted(session_id=self.id, connector_id=self.connector.id,
                                       energy_wh=last.minus(self.meter_start).wh,
                                       started_at=self.started_at, ended_at=at, stop_reason=stop_reason))

    def is_active(self) -> bool:
        return self.status == "Charging"

    def pull_events(self) -> list[DomainEvent]:                             # R8
        out, self._events = self._events, []
        return out

    def _record(self, e: DomainEvent) -> None:
        self._events.append(e)

    def _assert_charging(self, cmd: str) -> None:
        if self.status != "Charging":
            raise InvalidSessionState(f"{self.id} is {self.status}; cannot {cmd}")
```

```python
# src/charging/domain/values.py
from dataclasses import dataclass
import re

@dataclass(frozen=True)
class Energy:
    wh: int
    def __post_init__(self):
        if not isinstance(self.wh, int) or self.wh < 0: raise ValueError("Energy must be non-negative int Wh")
    def minus(self, o: "Energy") -> "Energy": return Energy(self.wh - o.wh)
    def is_at_least(self, o: "Energy") -> bool: return self.wh >= o.wh
    def to_kwh(self) -> float: return self.wh / 1000

@dataclass(frozen=True)
class Connector:
    id: str
    def __post_init__(self):
        if not re.fullmatch(r"CP-[A-Z0-9]+-\d+", self.id): raise ValueError(f"bad connector {self.id}")
    @property
    def charger_id(self) -> str: return re.sub(r"-\d+$", "", self.id)

@dataclass(frozen=True)
class IdTag:
    value: str
    def __post_init__(self):
        if not self.value: raise ValueError("empty idTag")
```

---

## 5. WorkOrder 建模（R5）

### 5.1 狀態

```
 OpenWorkOrder            AssignTechnician（Dispatch，MVP1 stub）        CloseWorkOrder
 (none) ──────▶ Open ─────────────────────────────▶ Assigned ─────────────────▶ Closed
                 │▲                                    │▲
                 └┘ 重複申告：附加，不改狀態              └┘ 同左
```

「開放期間」= 非 Closed。

### 5.2 TypeScript 草圖

```ts
// src/assetops/domain/WorkOrder.ts
export class WorkOrder {
  private events: DomainEvent[] = [];
  private status: "Open" | "Assigned" | "Closed" = "Open";
  readonly duplicateReports: { reportedAt: Date; sourceEventId?: string }[] = [];

  private constructor(readonly id: string, readonly chargerId: string, readonly faultCode: string, readonly openedAt: Date) {}

  static open(p: { id: string; chargerId: string; faultCode: string; reportedAt: Date; openedAt: Date }): WorkOrder {
    const wo = new WorkOrder(p.id, p.chargerId, p.faultCode, p.openedAt);
    wo.record({ type: "WorkOrderOpened", workOrderId: wo.id, chargerId: wo.chargerId, faultCode: wo.faultCode, openedAt: wo.openedAt });
    return wo;
  }

  // R5：開放期間同樁同碼再申告 → 附加，不開新單
  attachDuplicateReport(reportedAt: Date, sourceEventId?: string): void {
    if (this.status === "Closed") throw new Error("cannot attach to closed work order");
    if (sourceEventId && this.duplicateReports.some(r => r.sourceEventId === sourceEventId)) return;  // 同一事件重送
    this.duplicateReports.push({ reportedAt, sourceEventId });
  }

  isOpen(): boolean { return this.status !== "Closed"; }
  matches(chargerId: string, faultCode: string): boolean { return this.chargerId === chargerId && this.faultCode === faultCode; }

  close(at: Date, outcome: string): void {
    if (this.status === "Closed") return;
    this.status = "Closed";
    this.record({ type: "WorkOrderClosed", workOrderId: this.id, chargerId: this.chargerId, closedAt: at, outcome });
  }

  pullEvents(): DomainEvent[] { const out = this.events; this.events = []; return out; }
  private record(e: DomainEvent) { this.events.push(e); }
}
```

R5 的「只保留一張」同樣需要 Repository：`findOpenByChargerAndFault(chargerId, faultCode)`。應用服務（Day 5 的 Process Manager）：

```ts
const existing = await this.workOrders.findOpenByChargerAndFault(evt.chargerId, evt.faultCode);
if (existing) { existing.attachDuplicateReport(evt.occurredAt, evt.eventId); await this.uow.commit(existing, existing.pullEvents()); return; }
const wo = WorkOrder.open({ id: ids.next("WO"), chargerId: evt.chargerId, faultCode: evt.faultCode, reportedAt: evt.occurredAt, openedAt: clock.now() });
await this.uow.commit(wo, wo.pullEvents());
```

### 5.3 Python 草圖（只列差異）

```python
@dataclass
class WorkOrder:
    id: str; charger_id: str; fault_code: str; opened_at: datetime
    status: Literal["Open", "Assigned", "Closed"] = "Open"
    duplicate_reports: list[dict] = field(default_factory=list)
    _events: list = field(default_factory=list, init=False, repr=False)

    @classmethod
    def open(cls, *, id, charger_id, fault_code, reported_at, opened_at):
        wo = cls(id=id, charger_id=charger_id, fault_code=fault_code, opened_at=opened_at)
        wo._events.append(WorkOrderOpened(work_order_id=id, charger_id=charger_id, fault_code=fault_code, opened_at=opened_at))
        return wo

    def attach_duplicate_report(self, reported_at, source_event_id=None):
        if self.status == "Closed": raise ValueError("closed")
        if source_event_id and any(r.get("source_event_id") == source_event_id for r in self.duplicate_reports): return
        self.duplicate_reports.append({"reported_at": reported_at, "source_event_id": source_event_id})

    def is_open(self): return self.status != "Closed"
    def pull_events(self): out, self._events = self._events, []; return out
```

---

## 6. 領域事件的機制：記錄、pull、絕不直接發

### 6.1 為什麼不能在聚合裡 `broker.publish()`（R8）

1. **交易還沒 commit**。發出去了，然後 DB 寫入失敗 → Billing 收到一個不存在的會話。
2. **聚合變得依賴 I/O**。單元測試要 mock broker；`/aggregate-review` 的「不得碰 I/O」直接不過。
3. **重試變成重複發送**。應用服務重試三次 = 發三次。

### 6.2 正確的流程

```
命令 → 應用服務 → 載入聚合 → 呼叫聚合方法（記錄事件到 this.events）
     → 應用服務 pullEvents() → 同一交易：寫聚合 + 寫 Outbox
     → commit
     → Outbox relay（另一個程序 / 定時器）讀 Outbox → publish → 標記已送
```

聚合的介面只有 `pullEvents(): DomainEvent[]`。它**不知道** Outbox、broker、JSON 的存在。

### 6.3 領域事件 vs 整合事件

| | 領域事件 | 整合事件 |
|---|---|---|
| 住哪 | `src/charging/domain/events.ts` | `contracts/*.json` |
| 誰看 | 同一個 context 內 | 跨 context |
| 形狀 | 語言物件，欄位可以是 VO | JSON，信封 + payload |
| 例子 | `ChargingCompleted{energyWh: 12400}` | `charging.session.completed.v1` |
| 誰轉換 | 應用服務 / Outbox 寫入時的 mapper | — |

一個領域事件可以對應零個、一個或多個整合事件（`MeterValueRejected` 對外零個；`ChargingCompleted` 對外一個）。詳見 `eda.md`。

---

## 7. `/aggregate-review` 檢查清單

1. 每條 R1–R5 能指出唯一的家（哪個方法、哪一行）。
2. 聚合沒有 import 任何 `adapters/`、`infrastructure/`、broker、DB、HTTP。
3. 拒絕是事件（`ChargingStartRejected`、`MeterValueRejected`），不是例外。**例外只用在「呼叫端的 bug」**（對 Completed 的會話 Stop 是狀態錯誤，可以 throw；但你也可以選擇記錄事件，要在 ADR 說明）。
4. 有 `pullEvents()`，且呼叫後清空。
5. 值物件不可變、有驗證。
6. 沒有 `status: string` 吃多種狀態機。
7. 聚合之間只有 ID。

---

## 8. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| `Charger` 大聚合包所有會話 | 規則 2、3：`ChargingSession` 獨立，持 `connectorId` |
| `energyWh` 用 `number` 到處傳 | `Energy` VO |
| 用 `throw` 表示 R1 / R3 拒絕 | 記錄事件 |
| 聚合裡 `await repo.save(this)` | 聚合不存自己 |
| 聚合裡 `broker.publish()` | R8 |
| `session.status = "Faulted"` | 故障是樁的事，不是會話的 |
| 在聚合裡讀 `Date.now()` | 時間由命令帶進來（可測） |
| 一個 `Session` 類別吃停車與充電 | 兩個 context 兩個聚合 |

---

## 9. 延伸閱讀

- Eric Evans, *Domain-Driven Design*, 2003, 第 5–6 章（Entity / VO / Service / Aggregate / Repository / Factory）。
- Vaughn Vernon, *Implementing Domain-Driven Design*, 2013, 第 5–12 章；**第 10 章 Aggregates 必讀**（四條規則的出處）。
- Vaughn Vernon, "Effective Aggregate Design" Part I–III（免費 PDF，dddcommunity.org）。—— 第 10 章的前身，30 頁。
- Vlad Khononov, *Learning Domain-Driven Design*, 2021, 第 5–7 章。—— 聚合與事件的現代寫法。
- Scott Millett & Nick Tune, *Patterns, Principles, and Practices of Domain-Driven Design*, 2015, 第 14–19 章。—— 每個模式一章，附程式碼。
- Martin Fowler, "Anemic Domain Model", 2003（martinfowler.com）。—— 為什麼 §1 的寫法是反模式。
- Jimmy Bogard, "A better domain events pattern", 2014（部落格）。—— `pullEvents` 做法的來源之一。

---

## 自我檢查

1. `Connector` 在 Charging 是值物件，在 AssetOps 可能是實體。為什麼同一個名詞可以是不同模式？
2. R1 為什麼不能完全在 `ChargingSession` 聚合內保證？工作坊的三層防線是什麼？
3. `pullEvents()` 為什麼要清空？如果不清空，Outbox 會發生什麼？
4. 對已 Completed 的會話呼叫 `stop` 應該 throw 還是記錄事件？兩種選擇各自的理由是什麼？
5. 用 Vernon 四條規則檢查一次 `WorkOrder`：它持有 `chargerId` 而不是 `Charger`，是哪一條？
