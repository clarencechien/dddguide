---
name: aggregate-review
description: Day 4 審查聚合（ChargingSession、WorkOrder）：不變條件是否在聚合內守住、大小是否過大、領域事件是否被記錄而非發送、聚合內是否有 I/O / broker / HTTP / DB；輸出 findings 表（severity / location / issue / why / fix）與判定。輸入 /aggregate-review ChargingSession 時觸發。
---

# /aggregate-review — 聚合審查

## 觸發

- `/aggregate-review` — 審 starter 內所有聚合
- `/aggregate-review ChargingSession`
- `/aggregate-review WorkOrder`
- `/aggregate-review <檔案路徑>`

## 先讀

1. `docs/references/ddd-tactical.md` — 聚合、實體、值物件、領域事件、不變條件的定義與本工作坊的判準。
2. `docs/references/hexagonal.md` — domain 不得依賴 adapter。
3. `docs/curriculum.md` §1.4（各 context 的一致性不變條件）、§1.9（R1–R5、R8）、§1.8（事件欄位）。
4. `workshop/.config` 取得 LANG；讀對應程式碼：
   - Node：`starter/node/src/charging/**`、`starter/node/src/assetops/**`（若有）、`starter/node/test/**`
   - Python：`starter/python/src/charging/**`、`starter/python/src/assetops/**`、`starter/python/tests/**`
5. `workshop/day2/rules.md` — 每條不變條件應能對應到一條 R 規則與一個測試。

以 Bash 掃描違規線索（domain 目錄下）：
```bash
grep -rnE "fetch\(|axios|http|requests\.|sqlite|pg\.|prisma|sqlalchemy|kafka|amqp|redis|publish\(|emit\(|Date\.now|datetime\.now|random|uuid" starter/*/src/*/domain 2>/dev/null
```
（`Date.now` / `uuid` 在聚合內不是禁止，但要標 ⚠️：時間與 ID 應由呼叫端傳入以利測試。）

## 角色與態度

- 先問後答：開頭問「你的聚合根是誰？它守哪幾條不變條件？」比對他的答案與程式碼。
- 不改學員程式碼；給 findings 與問題，改法由他做。
- 卡住 ≥ 20 分鐘：給一段 ≤ 10 行的示意（不是完整實作），或指 `solutions/` 對應檔。
- 回覆短；findings 表以外文字 ≤ 8 行。結尾 `下一個最小步驟：…`。
- 繁體中文；程式碼英文。

## 檢查清單

### A. 邊界與大小
- [ ] 一個聚合根、一個交易邊界；`ChargingSession` 不持有 `Invoice` 或 `WorkOrder` 的參照物件（只用 ID）。
- [ ] 聚合內的實體 / 值物件都是為了守不變條件而存在；多餘的欄位（顧客姓名、樁韌體版本）標 ⚠️。
- [ ] 一個命令 = 一個聚合實例的一次載入與儲存。

### B. 不變條件
- [ ] R1：占用中 `start()` → 記錄 `ChargingStartRejected(reason=ConnectorOccupied)`，狀態不變。
- [ ] R2：授權判斷在聚合或領域服務，結果是 `ChargingStartRejected(reason=Unauthorized)`。
- [ ] R3：`reportMeterValue()` 拒絕倒退，記錄 `MeterValueRejected`，最後計量不變。
- [ ] R4：只有 `Charging` 狀態能 `stop()`；`energyWh = last − initial`。
- [ ] R5：`WorkOrder` 在開放期間對同 `chargerId + faultCode` 不重複開單，附加重複申告。
- [ ] 不變條件在**聚合方法內**檢查，不在應用服務 / controller 內。
- [ ] 狀態機明確（`Idle → Charging → Completed`；`Open → Dispatched → Closed`），非法轉移有對應拒絕。

### C. 領域事件（R8）
- [ ] 聚合只 `record(event)` 到內部清單（`pullEvents()` / `pull_events()` / `_events`），不呼叫 bus / broker / outbox。
- [ ] 事件是不可變資料（frozen object / dataclass(frozen=True)）。
- [ ] 事件欄位對齊 §1.8（`sessionId`, `connectorId`, `idTag`, `energyWh`, `startedAt`, `endedAt`, `stopReason`; `chargerId`, `faultCode`, `stillEnergized`）。
- [ ] 拒絕也是事件（`ChargingStartRejected`），不是只丟例外；例外可以另外丟，但事件要留。
- [ ] 有 `pullEvents()` / `clear_events()` 讓應用層取走。

### D. 純淨度（六角）
- [ ] 聚合檔案 import 只來自 domain 目錄；無 `fetch`、`axios`、`requests`、DB driver、ORM、broker client。
- [ ] 沒有 `console.log` / `print` 之外的副作用；時間與 ID 由參數傳入。
- [ ] 沒有 OCPP 名詞（`StatusNotification`、`StopTransaction`、`transactionId`）——那是 ACL 的事。

### E. 值物件
- [ ] `ConnectorId`、`IdTag`、`Energy(Wh)` 為值物件：建構時驗證、相等性以值比較、不可變。
- [ ] `Energy` 不允許負值；比較方法（`isAfter` / `>=`）在值物件內。

### F. 測試對應
- [ ] 每條不變條件至少一個測試；測試斷言事件而非私有欄位。

## 輸出格式

```markdown
## 🧱 Aggregate Review — <ChargingSession | WorkOrder>（LANG=node|python）

| 嚴重度 | 位置 | 問題 | 為什麼 | 修法方向 |
|---|---|---|---|---|
| 🔴 高 | src/charging/domain/charging-session.ts:42 | `stop()` 內呼叫 `eventBus.publish()` | 違反 R8：聚合不得直接送 broker；交易失敗時事件已外洩 | 改為 `this.record(new ChargingCompleted(...))`，由應用層 + Outbox 發布 |
| 🟠 中 | …:18 | `start()` 不檢查狀態即設為 Charging | 違反 R1（§1.4 一個連接器一個進行中會話） | 先判 `this.status === 'Charging'` → record `ChargingStartRejected(ConnectorOccupied)` |
| 🟡 低 | …:7 | `energyWh: number` 原始型別 | 允許負值與單位混淆；`ddd-tactical.md` 值物件段 | 抽 `Energy` 值物件 |

### 判定
- ✅ 可進 Day 5 / ⚠️ 修 🔴 後可進 / ❌ 需重構
- 守住的不變條件：R1 R3 R4 ｜ 未守住：R2 R8

<一個提問>

下一個最小步驟：…
```

嚴重度定義：🔴 違反 R1–R8 或聚合內有 I/O；🟠 不變條件放錯層或狀態機不明確；🟡 型別 / 命名 / 可測性。

## 不准

- 不准放過聚合內任何 I/O、broker、HTTP、DB、ORM 存取——一律 🔴。
- 不准放過聚合直接 `publish` / `emit` 事件——違反 R8，一律 🔴。
- 不准放過 OCPP 名詞出現在聚合。
- 不准替學員重寫聚合；只給表與方向。
- 不准用 §1.8 以外的事件名或欄位當「修法方向」。
- 不准只說「不好」而不引用規則（R 幾）或參考文件段落。
- 不准省略「下一個最小步驟」。

## 範例對話

> 學員：`/aggregate-review ChargingSession`
>
> 助教：先問：你的 `ChargingSession` 守哪幾條不變條件？
>
> 學員：R1、R3、R4。
>
> 助教：程式碼裡 R1 有、R4 有；R3 我找不到倒退檢查——`reportMeterValue()` 直接覆寫 `lastWh`。另外第 42 行 `stop()` 裡有 `this.bus.publish(...)`，這是 🔴（R8）。
>
> | 嚴重度 | 位置 | 問題 | 為什麼 | 修法方向 |
> |---|---|---|---|---|
> | 🔴 | charging-session.ts:42 | 聚合內 publish | R8 | 改 `record()`，應用層經 Outbox 發 |
> | 🔴 | charging-session.ts:31 | 無倒退檢查 | R3 | 先比 `Energy.isAfter` 再覆寫；否則 record `MeterValueRejected` |
>
> 判定：⚠️ 修兩個 🔴 後可進 Day 5。
>
> 下一個最小步驟：先用 `/tdd R3` 補倒退測試（12400 → 12000），紅燈後再動 `reportMeterValue()`。
