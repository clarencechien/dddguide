# 戰術 DDD（Tactical Domain-Driven Design）

> Day 4 B1、B3 的方法論。交付物：`workshop/day4/model.md`、`starter/<lang>/src/charging/**` 測試全綠。用 `/aggregate-review` 審查聚合。
> 本文的程式碼**對齊 `starter/` 的骨架**（方法名、事件名、目錄），但只是草圖；`solutions/` 才是參考解，卡住 20 分鐘再看。

## 讀完你會拿到

- 八個戰術模式各一句定義、一個判斷法、一個本專案的例子。
- Vernon 的四條聚合設計規則，以及它們在 `ChargingSession` 與 `WorkOrder` 上的具體長相。
- `ChargingSession`（R1–R4）與 `WorkOrder`（R5）的 TypeScript 與 Python 草圖，與 starter 的簽名一致。
- 領域事件「記錄在聚合內、由外面 `pullEvents()` 拉出去」的機制，以及為什麼聚合絕對不能直接 publish（R8）。

---

## 1. 為什麼存在

戰略 DDD 決定「Charging 是一個 context」；戰術 DDD 決定「Charging 裡面的程式碼長什麼樣，才能讓 R1–R4 永遠成立」。

沒有戰術模式的程式碼長這樣：

```ts
// ❌ 貧血模型 + 規則散落在 service
async function startCharging(req) {
  const rows = await db.query("SELECT * FROM sessions WHERE connector_id = ? AND status = 'Charging'", [req.connectorId]);
  if (rows.length > 0) throw new Error("occupied");        // R1 在這裡
  if (!(await authService.check(req.idTag))) throw new Error("unauthorized");   // R2 在這裡
  await db.insert("sessions", {...});
  await broker.publish("charging.session.started.v1", {...});   // 違反 R8
}
```

三個月後 R1 會在四個地方各有一份略微不同的實作。戰術 DDD 的目標只有一個：**規則有唯一的家**。

---

## 2. 八個模式

| 模式 | 一句話 | 判斷法 | 本專案 |
|---|---|---|---|
| **實體（Entity）** | 有身份、會隨時間改變的東西 | 「兩個屬性完全相同的它，是同一個嗎？」是 → 實體 | `ChargingSession`（一把槍上的會話）、`WorkOrder(WO-2208)` |
| **值物件（Value Object）** | 沒身份、以值定義、不可變 | 兩個值相同就可互換 → VO | `ConnectorId("CP-A12-2")`、`WattHours(12400)`、`IdTag("TAG-MONTHLY-77")` |
| **聚合（Aggregate）** | 一組實體 + VO，以一個根為入口，作為一致性邊界 | 「哪些東西必須在同一個交易裡保持一致？」 | `ChargingSession`（根本身就是全部）、`WorkOrder` + 申告清單 |
| **聚合根（Aggregate Root）** | 聚合唯一的對外入口；外面只能持有根的 ID | 外面能直接改子物件嗎？不能 | `ChargingSession`、`WorkOrder` |
| **領域事件（Domain Event）** | 聚合內發生的、以過去式命名的事實 | 是不是「已經發生、不可否認」？ | `ChargingStarted`、`MeterValueRejected`、`WorkOrderOpened`、`DuplicateFaultReported` |
| **儲存庫（Repository）** | 以聚合為單位存取的集合介面 | 一個 repo 對一個聚合根 | `ChargingSessionRepository`、`WorkOrderRepository` |
| **領域服務（Domain Service）** | 不屬於任何一個聚合的領域邏輯 | 需要兩個以上聚合，或不屬於任何實體 | 授權判定 `AuthorizationService`（憑證 × 白名單 × 斷線）；結果以 `authorized: boolean` 傳進聚合 |
| **工廠（Factory）** | 建立複雜聚合的邏輯 | 建構需要驗證或多步驟 | `ChargingSession.idle(connectorId)`、`WorkOrder.open({...})` |

兩個常見的分類錯誤：

- **`ConnectorId` 是值物件，不是實體**。在 Charging 裡我們只在乎「哪一把槍」，不在乎它的歷史；歷史是 AssetOps 的事（那裡它可能是實體）。同一個名詞在不同 context 可以是不同模式。
- **`WattHours` 是值物件**，即使 starter 用 `type WattHours = number` + `wattHours(value)` 驗證函式來實作。VO 的重點是「不可變 + 有驗證 + 以值相等」，不是「一定要是 class」。starter 選擇 type + parse 函式是為了讓聚合好讀；你想改成 class（`Energy.wh(12400).minus(...)`）也可以，寫進 `model.md` 的取捨。

---

## 3. Vernon 的四條聚合規則

出自 *Implementing Domain-Driven Design* 第 10 章。

### 規則 1：在一致性邊界內保護真正的不變條件
聚合的大小由「哪些東西必須同時為真」決定，不是由「哪些東西相關」決定。

- `ChargingSession` 的不變條件：**一個連接器同時只有一個 Charging 中的會話**（R1）、計量單調（R3）、只有 Charging 可 Stop（R4）。
- starter 的關鍵決定：**聚合的身份是連接器**（`ChargingSession.idle("CP-A12-2")`），會話 `S-991` 是它的一段狀態。這樣 R1 就是純聚合內的不變條件——第二次 `start` 看自己的 `status` 就知道占用。代價：一把槍的歷史會話不在這個聚合裡（那是查詢 / 事件的事）。
- 另一種切法（會話本身是聚合、R1 靠 repository 查詢 + DB 唯一約束）也合法；`model.md` 要寫你選哪個、為什麼。

### 規則 2：設計小聚合
- ❌ `Charger` 聚合包含所有 `Connector` 包含所有會話：改一把槍要鎖整根樁。
- ✅ 一把槍一個 `ChargingSession` 聚合；`WorkOrder` 持有 `chargerId` 字串，不持有 `Charger`。

### 規則 3：以 ID 參照其他聚合
- `ChargingSession.connectorId: "CP-A12-2"`，`chargerIdOf(connectorId)` 算出 `CP-A12`，不持有 `Charger` 物件。
- `WorkOrder.chargerId: "CP-A12"`、`technicianId: "TECH-HAO"`。

### 規則 4：跨聚合用最終一致性
一個命令、一個交易、一個聚合。跨聚合靠領域事件 → 整合事件。

- `ChargingCompleted` → Billing 草稿：最終一致。
- `ChargerFaulted` → `WorkOrder` 開立：最終一致（Day 5 的 `FaultProcessManager`）。
- 老陳說「晚一點沒關係，不能漏」就是最終一致性的業務背書。

---

## 4. ChargingSession 建模（對齊 `starter/<lang>/src/charging/domain/`）

### 4.1 狀態與轉移

```
                 start(authorized=true)（R1 看 status，R2 看 authorized）
   Idle ─────────────────────────────────────────────▶ Charging
    ▲                                                    │ reportMeter（R3）自迴圈
    │                                                    │ stop（R4）
    │  reportFault ─▶ Faulted ◀── reportFault ───────────┤
    │                                                    ▼
    └──（下一次 start 從 Idle 或 Completed 開始）      Completed
```

`Faulted` 是 starter 給的（樁申告故障時這把槍停售），`Preparing` / `Suspended` 沒有（那是 OCPP 的狀態，MVP1 不管）。

### 4.2 值物件

| VO | starter 實作 | 不變條件 |
|---|---|---|
| `ConnectorId` | `parseConnectorId("CP-A12-2")`、`chargerIdOf()`、`connectorIdOf("CP-A12", 2)` | 格式 `<chargerId>-<n>` |
| `WattHours` | `wattHours(12400)`、`toKwh()` | 非負整數 Wh |
| `IdTag` | `parseIdTag("TAG-MONTHLY-77")` | 非空、≤ 20 字 |

### 4.3 事件（記錄在聚合內；欄位是通用語言，沒有 OCPP 字）

| 事件 | 欄位 | 觸發 |
|---|---|---|
| `ChargingStarted` | sessionId, connectorId, idTag, meterStartWh, occurredAt | R1/R2 通過 |
| `ChargingStartRejected` | connectorId, idTag, reason=`ConnectorOccupied` \| `Unauthorized`, occurredAt | R1/R2 擋下 |
| `EnergyMetered` | sessionId, connectorId, meterWh, occurredAt | R3 通過 |
| `MeterValueRejected` | sessionId, connectorId, meterWh, lastMeterWh, reason=`NotMonotonic` \| `NotCharging`, occurredAt | R3 擋下 |
| `ChargingCompleted` | sessionId, connectorId, energyWh, startedAt, endedAt, stopReason | R4 通過 |
| `ChargerFaulted` | chargerId, connectorId?, faultCode, stillEnergized, occurredAt | `reportFault` |

### 4.4 TypeScript 草圖

```ts
// starter/node/src/charging/domain/ChargingSession.ts（骨架已在 starter；你要填的是方法內容）
export class ChargingSession {
  readonly connectorId: ConnectorId;
  private _status: SessionStatus;             // 'Idle' | 'Charging' | 'Completed' | 'Faulted'
  private _sessionId?: string; private _idTag?: IdTag;
  private _meterStartWh: WattHours = 0; private _lastMeterWh: WattHours = 0; private _startedAt?: string;
  private events: ChargingEvent[] = [];

  static idle(connectorId: string): ChargingSession { return new ChargingSession(parseConnectorId(connectorId), 'Idle'); }

  // R1 + R2。拒絕不是 throw，是事件。
  start(input: { sessionId: string; idTag: IdTag; authorized: boolean; meterStartWh: WattHours; at: string }): void {
    if (this._status === 'Charging') {
      this.record({ type: 'ChargingStartRejected', connectorId: this.connectorId, idTag: input.idTag, reason: 'ConnectorOccupied', occurredAt: input.at });
      return;                                                   // 原會話不變
    }
    if (!input.authorized) {
      this.record({ type: 'ChargingStartRejected', connectorId: this.connectorId, idTag: input.idTag, reason: 'Unauthorized', occurredAt: input.at });
      return;
    }
    this._status = 'Charging';
    this._sessionId = input.sessionId; this._idTag = input.idTag;
    this._meterStartWh = input.meterStartWh; this._lastMeterWh = input.meterStartWh; this._startedAt = input.at;
    this.record({ type: 'ChargingStarted', sessionId: input.sessionId, connectorId: this.connectorId, idTag: input.idTag, meterStartWh: input.meterStartWh, occurredAt: input.at });
  }

  // R3：單調遞增；倒退記錄 MeterValueRejected(NotMonotonic)；非 Charging 記錄 NotCharging
  reportMeter(meterWh: WattHours, at: string): void {
    if (this._status !== 'Charging') { this.record({ type: 'MeterValueRejected', sessionId: this._sessionId ?? '', connectorId: this.connectorId, meterWh, lastMeterWh: this._lastMeterWh, reason: 'NotCharging', occurredAt: at }); return; }
    if (meterWh < this._lastMeterWh)  { this.record({ type: 'MeterValueRejected', sessionId: this._sessionId!, connectorId: this.connectorId, meterWh, lastMeterWh: this._lastMeterWh, reason: 'NotMonotonic', occurredAt: at }); return; }
    this._lastMeterWh = meterWh;
    this.record({ type: 'EnergyMetered', sessionId: this._sessionId!, connectorId: this.connectorId, meterWh, occurredAt: at });
  }

  // R4：只有 Charging 可 Stop（其他狀態是呼叫端的錯 → throw）；energyWh = 最後計量 − 起始計量
  stop(stopReason: string, at: string): void {
    if (this._status !== 'Charging') throw new InvalidStateError('stop', this._status);
    this._status = 'Completed';
    this.record({ type: 'ChargingCompleted', sessionId: this._sessionId!, connectorId: this.connectorId,
                  energyWh: this._lastMeterWh - this._meterStartWh, startedAt: this._startedAt!, endedAt: at, stopReason, occurredAt: at });
  }

  reportFault(faultCode: string, at: string): void {
    const stillEnergized = this._status === 'Charging';
    this._status = 'Faulted';
    this.record({ type: 'ChargerFaulted', chargerId: chargerIdOf(this.connectorId), connectorId: this.connectorId, faultCode, stillEnergized, occurredAt: at });
  }

  // R8：事件只記錄，不發送。應用服務在交易成功後 pull 出去寫 Outbox。
  pullEvents(): ChargingEvent[] { const pulled = this.events; this.events = []; return pulled; }
  private record(e: ChargingEvent): void { this.events.push(e); }
}
```

注意 `stop` 在 starter 裡**沒有** `meterStop` 參數：ACL 收到 `StopTransaction` 時先呼叫 `reportMeterValue(meterStop)`（它也受 R3 約束），再呼叫 `stopCharging`。這是「一個方法一件事」的好例子。

### 4.5 Python 草圖（`starter/python/src/charging/domain/charging_session.py`）

```python
class ChargingSession:
    def __init__(self, connector_id: str, status: SessionStatus = SessionStatus.IDLE) -> None:
        self.connector_id = parse_connector_id(connector_id)
        self.status = status
        self.session_id = None; self.id_tag = None
        self.meter_start_wh = 0; self.last_meter_wh = 0; self.started_at = None
        self._events: list[ChargingEvent] = []

    @classmethod
    def idle(cls, connector_id: str) -> "ChargingSession": return cls(connector_id)

    def start(self, *, session_id: str, id_tag: str, authorized: bool, meter_start_wh: int, at: str) -> None:   # R1 + R2
        if self.status is SessionStatus.CHARGING:
            self._record(ChargingStartRejected(occurred_at=at, connector_id=self.connector_id, id_tag=id_tag, reason="ConnectorOccupied")); return
        if not authorized:
            self._record(ChargingStartRejected(occurred_at=at, connector_id=self.connector_id, id_tag=id_tag, reason="Unauthorized")); return
        self.status = SessionStatus.CHARGING
        self.session_id, self.id_tag, self.started_at = session_id, id_tag, at
        self.meter_start_wh = self.last_meter_wh = meter_start_wh
        self._record(ChargingStarted(occurred_at=at, session_id=session_id, connector_id=self.connector_id, id_tag=id_tag, meter_start_wh=meter_start_wh))

    def report_meter(self, meter_wh: int, at: str) -> None:                                                  # R3
        if self.status is not SessionStatus.CHARGING:
            self._record(MeterValueRejected(occurred_at=at, session_id=self.session_id or "", connector_id=self.connector_id, meter_wh=meter_wh, last_meter_wh=self.last_meter_wh, reason="NotCharging")); return
        if meter_wh < self.last_meter_wh:
            self._record(MeterValueRejected(occurred_at=at, session_id=self.session_id, connector_id=self.connector_id, meter_wh=meter_wh, last_meter_wh=self.last_meter_wh, reason="NotMonotonic")); return
        self.last_meter_wh = meter_wh
        self._record(EnergyMetered(occurred_at=at, session_id=self.session_id, connector_id=self.connector_id, meter_wh=meter_wh))

    def stop(self, stop_reason: str, at: str) -> None:                                                       # R4
        if self.status is not SessionStatus.CHARGING: raise InvalidStateError("stop", self.status.value)
        self.status = SessionStatus.COMPLETED
        self._record(ChargingCompleted(occurred_at=at, session_id=self.session_id, connector_id=self.connector_id,
                                       energy_wh=self.last_meter_wh - self.meter_start_wh, started_at=self.started_at, ended_at=at, stop_reason=stop_reason))

    def pull_events(self) -> list[ChargingEvent]:                                                            # R8
        pulled, self._events = self._events, []
        return pulled

    def _record(self, e: ChargingEvent) -> None: self._events.append(e)
```

### 4.6 R1 與 R2 為什麼在聚合內

因為 starter 把聚合的身份定為**連接器**。「這把槍是不是占用中」是聚合自己的狀態；「這張卡有沒有授權」由應用層先問 `AuthorizationService`（領域服務的 port），把 `authorized: boolean` **當參數**傳進來。聚合不呼叫任何 port（零 I/O），但規則仍然在聚合裡——這是 Day 4 沒有 repository 也能把 R1–R4 全部測完的原因。

應用服務（Day 5）長這樣，**沒有任何規則**：

```ts
// starter/node/src/charging/application/ChargingService.ts
async startCharging(cmd: StartCharging): Promise<ChargingEvent[]> {
  const authorized = await this.authorization.isAuthorized(cmd.idTag);
  const session = (await this.sessions.findActiveByConnector(cmd.connectorId)) ?? ChargingSession.idle(cmd.connectorId);
  session.start({ sessionId: cmd.sessionId, idTag: cmd.idTag, authorized, meterStartWh: cmd.meterStartWh, at: cmd.at });
  return this.commit(session, cmd);     // save + 事件 → Outbox，同一交易
}
```

---

## 5. WorkOrder 建模（R5；`starter/<lang>/src/assetops/domain/`）

### 5.1 狀態

```
 open()                 assign(TECH-HAO)                  close(outcome)
 (none) ──▶ Open ───────────────────────▶ Assigned ─────────────────▶ Closed
             │▲ appendDuplicateReport        │▲ 同左
             └┘（記錄 DuplicateFaultReported，不改狀態）
```

「開放期間」= `isOpen` = 非 Closed。

### 5.2 事件

| 事件 | 欄位 |
|---|---|
| `WorkOrderOpened` | workOrderId, chargerId, connectorId?, faultCode, occurredAt |
| `DuplicateFaultReported` | workOrderId, chargerId, faultCode, occurredAt |
| `TechnicianAssigned` | workOrderId, technicianId, occurredAt |
| `WorkOrderClosed` | workOrderId, chargerId, outcome, occurredAt |

對外只有 `WorkOrderOpened` → `ops.work_order.opened.v1` 與 `WorkOrderClosed` → `ops.work_order.closed.v1`；`DuplicateFaultReported` 與 `TechnicianAssigned` 留在 AssetOps 內（Vicky 隱藏事實 4：不對帳務發「技術員已出發」）。

### 5.3 TypeScript 草圖

```ts
export class WorkOrder {
  readonly workOrderId: string; readonly chargerId: string; readonly faultCode: string;
  readonly connectorId: string | undefined; readonly openedAt: string;
  readonly reports: string[] = [];                 // 每次申告的 occurredAt，含第一次
  private _status: WorkOrderStatus = 'Open';
  private _technicianId?: string; private _outcome?: string;
  private events: WorkOrderEvent[] = [];

  static open(input: { workOrderId: string; chargerId: string; connectorId?: string; faultCode: string; at: string }): WorkOrder {
    const wo = new WorkOrder(input.workOrderId, input.chargerId, input.faultCode, input.connectorId, input.at);
    wo.reports.push(input.at);
    wo.record({ type: 'WorkOrderOpened', workOrderId: wo.workOrderId, chargerId: wo.chargerId, connectorId: wo.connectorId, faultCode: wo.faultCode, occurredAt: input.at });
    return wo;
  }

  get isOpen(): boolean { return this._status !== 'Closed'; }
  get duplicateReportCount(): number { return this.reports.length - 1; }

  // R5：開放期間同樁同碼再申告 → 附加，不開新單
  appendDuplicateReport(at: string): void {
    if (!this.isOpen) throw new InvalidStateError('appendDuplicateReport', this._status);
    this.reports.push(at);
    this.record({ type: 'DuplicateFaultReported', workOrderId: this.workOrderId, chargerId: this.chargerId, faultCode: this.faultCode, occurredAt: at });
  }

  assign(technicianId: string, at: string): void {
    if (this._status !== 'Open') throw new InvalidStateError('assign', this._status);
    this._status = 'Assigned'; this._technicianId = technicianId;
    this.record({ type: 'TechnicianAssigned', workOrderId: this.workOrderId, technicianId, occurredAt: at });
  }

  close(outcome: string, at: string): void {
    if (!this.isOpen) return;                        // 冪等
    this._status = 'Closed'; this._outcome = outcome;
    this.record({ type: 'WorkOrderClosed', workOrderId: this.workOrderId, chargerId: this.chargerId, outcome, occurredAt: at });
  }

  pullEvents(): WorkOrderEvent[] { const pulled = this.events; this.events = []; return pulled; }
  private record(e: WorkOrderEvent): void { this.events.push(e); }
}
```

R5 的「只保留一張」需要 Repository：`findOpenByFault(chargerId, faultCode)`。Day 5 的 `FaultProcessManager`：

```ts
const existing = await this.workOrders.findOpenByFault(chargerId, faultCode);
if (existing) { existing.appendDuplicateReport(occurredAt); await this.commit(existing, ids); return existing; }
const wo = WorkOrder.open({ workOrderId: this.nextWorkOrderId(), chargerId, connectorId, faultCode, at: occurredAt });
await this.commit(wo, ids);
```

Python 版同構：`WorkOrder.open(...)`、`append_duplicate_report(at)`、`assign(...)`、`close(...)`、`pull_events()`。

---

## 6. 領域事件的機制：記錄、pull、絕不直接發

### 6.1 為什麼不能在聚合裡 `bus.publish()`（R8）

1. **交易還沒 commit**。發出去了，然後 DB 寫入失敗 → Billing 收到一個不存在的會話。
2. **聚合變得依賴 I/O**。單元測試要 mock bus；`/aggregate-review` 的「不得碰 I/O」直接不過。
3. **重試變成重複發送**。應用服務重試三次 = 發三次。

### 6.2 正確的流程

```
命令 → 應用服務 → 載入聚合 → 呼叫聚合方法（record 到 this.events）
     → 應用服務 pullEvents() → 對照表轉成整合事件 → 同一交易：save 聚合 + outbox.add
     → commit
     → OutboxRelay.publishPending()（另一個迴圈）→ bus.publish → outbox.markPublished
```

聚合的介面只有 `pullEvents()`。它**不知道** Outbox、bus、JSON 的存在。

### 6.3 領域事件 vs 整合事件

| | 領域事件 | 整合事件 |
|---|---|---|
| 住哪 | `src/charging/domain/events.ts` | `contracts/*.schema.json` |
| 誰看 | 同一個 context 內 | 跨 context |
| 形狀 | `type` + `occurredAt` + 通用語言欄位 | 信封八欄位 + payload |
| 例子 | `ChargingCompleted{energyWh: 12400}` | `charging.session.completed.v1` |
| 誰轉換 | 應用服務的 `commit` | — |

一個領域事件對應零個或一個整合事件（`MeterValueRejected` 對外零個；`ChargingCompleted` 對外一個）。詳見 `eda.md`。

---

## 7. `/aggregate-review` 檢查清單

1. 每條 R1–R5 能指出唯一的家（哪個方法、哪一行）。
2. 聚合沒有 import `adapters/`、`shared/EventBus`、`shared/Outbox`、任何 DB / HTTP / 時鐘。
3. 業務拒絕是事件（`ChargingStartRejected`、`MeterValueRejected`）；**例外只用在「呼叫端的 bug」**（對 Idle 的會話 Stop）。
4. 有 `pullEvents()`，且呼叫後清空。
5. 值物件不可變、有驗證（class 或 parse 函式都可）。
6. 沒有一個 `status` 欄位吃兩種狀態機（會話狀態 vs 樁健康）。
7. 聚合之間只有 ID；時間由參數 `at` 帶進來，不 `new Date()`。

---

## 8. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| `Charger` 大聚合包所有會話 | 規則 2、3：一把槍一個聚合，持 `connectorId` |
| `energyWh` 用裸 `number` 到處傳 | `wattHours()` 驗證或 `Energy` class |
| 用 `throw` 表示 R1 / R3 拒絕 | 記錄事件 |
| 聚合裡 `await repo.save(this)` | 聚合不存自己 |
| 聚合裡 `bus.publish()` | R8 |
| 在 `stop` 裡順便算錢 | 錢是 Billing 的事；只帶 `energyWh` |
| 在聚合裡讀 `new Date()` | 時間由命令帶進來（可測） |
| 一個 `Session` 類別吃停車與充電 | 兩個 context 兩個聚合 |
| `pullEvents()` 回傳後測試改了它 | 回傳後陣列已被換掉；不要回傳內部參照 |

---

## 9. 延伸閱讀

- Eric Evans, *Domain-Driven Design*, 2003, 第 5–6 章（Entity / VO / Service / Aggregate / Repository / Factory）。
- Vaughn Vernon, *Implementing Domain-Driven Design*, 2013, 第 5–12 章；**第 10 章 Aggregates 必讀**（四條規則的出處）。
- Vaughn Vernon, "Effective Aggregate Design" Part I–III（免費 PDF，dddcommunity.org）。—— 第 10 章的前身，30 頁。
- Vlad Khononov, *Learning Domain-Driven Design*, 2021, 第 5–7 章。—— 聚合與事件的現代寫法。
- Scott Millett & Nick Tune, *Patterns, Principles, and Practices of Domain-Driven Design*, 2015, 第 14–19 章。
- Martin Fowler, "Anemic Domain Model", 2003（martinfowler.com）。—— 為什麼 §1 的寫法是反模式。
- Jimmy Bogard, "A better domain events pattern", 2014（部落格）。—— `pullEvents` 做法的來源之一。

---

## 自我檢查

1. `ConnectorId` 在 Charging 是值物件，在 AssetOps 可能是實體。為什麼同一個名詞可以是不同模式？
2. starter 把聚合身份定為「連接器」而非「會話」，R1 因此變成什麼？另一種切法要多加哪兩道防線？
3. `pullEvents()` 為什麼要清空？如果不清空，Outbox 會發生什麼？
4. 對 Idle 的會話呼叫 `stop` 用 throw、對占用中的連接器 `start` 用事件——判斷標準是什麼？
5. 用 Vernon 四條規則檢查一次 `WorkOrder`：它持有 `chargerId` 而不是 `Charger`，是哪一條？`DuplicateFaultReported` 為什麼不對外發？
