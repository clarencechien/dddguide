# OCPP 入門：工作坊剛好夠用的那一點點

> OCPP（Open Charge Point Protocol）是充電樁與後台之間的開放協定。本文只講 **ACL（防腐層）會碰到的訊息**。
> 工作坊全程使用假的模擬器 `scripts/ocpp-sim`，**不接任何真實硬體**。

## 讀完你會拿到

- 知道 CSMS 是什麼、樁與 CSMS 誰連誰、訊息長什麼樣。
- 看得懂 8 種訊息的 JSON：`BootNotification`、`StatusNotification`、`Authorize`、`StartTransaction` / `TransactionEvent`、`MeterValues`、`StopTransaction`、`Heartbeat`、`RemoteStopTransaction`。
- 背得出 1.6J 的連接器狀態列舉，知道 2.0.1 哪裡不一樣。
- 最重要的：能說出**為什麼這些訊息不是通用語言**，以及每一則訊息該被 ACL 翻成哪個領域事實。

---

## 1. CSMS 是誰

- **Charge Point（CP）/ Charging Station**：樁。`CP-A12`。
- **CSMS（Charging Station Management System）**，1.6 時代叫 **Central System**：後台。**樁主動連 CSMS**（WebSocket，樁是 client），不是後台去連樁。

在我們的架構裡，**CSMS 端點跑在場站節點**（site node），不在總部——因為場站要在總部斷線時繼續充電（curriculum §1.1）。Charging context 的 ACL 就是這個端點後面的第一層。

```
CP-A12  ──WebSocket──▶  場站節點 /ocpp/CP-A12  ──▶  ACL（adapters/ocpp/OcppAcl）──▶  ChargingService  ──▶  ChargingSession
（scripts/ocpp-sim 扮演 CP-A12；工作坊裡它用 HTTP POST 把同樣的 frame 打到 /ocpp/CP-A12，省掉 WebSocket 生命週期）
```

### 1.1 版本

| | OCPP 1.6J | OCPP 2.0.1 |
|---|---|---|
| 傳輸 | JSON over WebSocket（J = JSON） | JSON over WebSocket |
| 市占 | 目前裝機最多 | 新樁逐漸採用 |
| 交易模型 | `StartTransaction` / `StopTransaction` 兩則 | 單一 `TransactionEvent`（Started / Updated / Ended） |
| 連接器層級 | connectorId（0 = 整台樁） | EVSE → Connector 兩層 |
| 工作坊 | **主要用 1.6J**，模擬器預設 | 只需認得 `TransactionEvent` 的形狀 |

### 1.2 訊息框架（OCPP-J）

每一則 WebSocket 訊息是一個 JSON 陣列：

```json
[2, "msg-0001", "StatusNotification", { ...payload... }]   // CALL
[3, "msg-0001", { ...payload... }]                          // CALLRESULT
[4, "msg-0001", "InternalError", "description", {}]        // CALLERROR
```

- `2` = CALL（請求）、`3` = CALLRESULT（回應）、`4` = CALLERROR。
- 第二個欄位是 UniqueId，用來配對請求與回應。
- 樁與 CSMS **雙向都能發 CALL**：樁發 `StartTransaction`，CSMS 發 `RemoteStopTransaction`。

---

## 2. 八種訊息（1.6J 為主）

以下 payload 一律用 curriculum §1.6 的識別碼。時間用 ISO 8601（UTC 或帶時區，模擬器用 `+08:00`）。

### 2.1 BootNotification（樁 → CSMS）

樁開機或重連時報到。**ACL 幾乎不翻譯它**，只用來確認 `CP-A12` 上線；AssetOps 在乎的韌體版本從這裡來。

```json
[2, "b-1", "BootNotification", {
  "chargePointVendor": "WorkshopSim",
  "chargePointModel": "AC-22-2G",
  "chargePointSerialNumber": "CP-A12",
  "firmwareVersion": "1.4.2"
}]
```

回應：

```json
[3, "b-1", { "status": "Accepted", "currentTime": "2026-09-16T05:55:00Z", "interval": 300 }]
```

### 2.2 Heartbeat（樁 → CSMS）

每 `interval` 秒一次，沒有內容。健康度（AssetOps）靠它判斷「樁還活著嗎」。

```json
[2, "h-42", "Heartbeat", {}]
[3, "h-42", { "currentTime": "2026-09-16T06:00:00Z" }]
```

### 2.3 StatusNotification（樁 → CSMS）

樁報告某個連接器（或整台樁，`connectorId: 0`）的狀態。**這是 ACL 最忙的一則**。

```json
[2, "s-7", "StatusNotification", {
  "connectorId": 2,
  "status": "Preparing",
  "errorCode": "NoError",
  "timestamp": "2026-09-16T06:04:00+08:00"
}]
```

故障時：

```json
[2, "s-88", "StatusNotification", {
  "connectorId": 2,
  "status": "Faulted",
  "errorCode": "GroundFailure",
  "info": "RCD trip",
  "timestamp": "2025-05-20T18:10:00+08:00"
}]
```

模擬器對 `connectorId: 2` 報故障（所以 `ChargerFaulted.connectorId = "CP-A12-2"`）；真實樁常常對 `connectorId: 0`（整台樁）報，ACL 要把 0 翻成 `undefined`。模擬器會在 8 秒後（18:10:08）把同一則再送一次——那是 R5 的測試素材。

**1.6J 連接器狀態列舉（`status`）**：

| 值 | 意思 | 領域上看到的東西 |
|---|---|---|
| `Available` | 沒車、可用 | 可售 |
| `Preparing` | 插了槍或刷了卡，還沒開始 | `ConnectorPluggedIn` |
| `Charging` | 正在送電 | 會話進行中 |
| `SuspendedEVSE` | 樁那側暫停（例如電網限電） | 會話仍進行中，能量不增加 |
| `SuspendedEV` | 車那側暫停（例如電池滿了） | 同上 |
| `Finishing` | 交易結束、槍還沒拔 | 會話已結束，占位開始 |
| `Reserved` | 被預約 | MVP1 不處理 |
| `Unavailable` | 被人設成停用 | 停售，非故障 |
| `Faulted` | 樁說自己壞了 | **`ChargerFaulted`** |

**`errorCode` 列舉（節錄）**：`NoError`, `ConnectorLockFailure`, `EVCommunicationError`, `GroundFailure`, `HighTemperature`, `InternalError`, `OverCurrentFailure`, `OverVoltage`, `PowerMeterFailure`, `PowerSwitchFailure`, `ReaderFailure`, `UnderVoltage`, `WeakSignal`, `OtherError`。工作坊範例用 `GroundFailure`，對應到領域事件的 `faultCode`。

### 2.4 Authorize（樁 → CSMS）

車主刷卡。樁問 CSMS「這個 idTag 可以嗎」。

```json
[2, "a-3", "Authorize", { "idTag": "TAG-MONTHLY-77" }]
[3, "a-3", { "idTagInfo": { "status": "Accepted", "expiryDate": "2026-12-31T23:59:59Z" } }]
```

`idTagInfo.status` 可能是 `Accepted`, `Blocked`, `Expired`, `Invalid`, `ConcurrentTx`。**規則 R2** 的「未授權」就從這裡來——但注意，判定授不授權是 Charging 領域（`IdTag` 值物件 + 授權策略）的責任，ACL 只是把問句翻進來、把答案翻出去。斷線時，場站本機白名單要能回答這個問題。

### 2.5 StartTransaction（樁 → CSMS，1.6J）

樁說「我開始送電了」，附起始讀數。

```json
[2, "t-1", "StartTransaction", {
  "connectorId": 2,
  "idTag": "TAG-MONTHLY-77",
  "meterStart": 0,
  "timestamp": "2025-05-20T14:04:00+08:00"
}]
[3, "t-1", { "transactionId": 991, "idTagInfo": { "status": "Accepted" } }]
```

- `meterStart` 單位 **Wh**。模擬器為了好算從 0 起跳；真實電表會是像 105200 這種累計值，ACL 不在乎。
- `transactionId` 是 **CSMS 發給樁的**整數。它**不是** `S-991`。`S-991` 是 Charging 領域的 `ChargingSession` 識別碼；參考解的 ACL 從 991 起發號並維護 `transactionId 991 ↔ S-991` 的對應。這個對應就是 ACL 存在的理由之一。
- 這則訊息會觸發命令 `StartCharging`；成功時聚合記錄 `ChargingStarted`，被 R1 / R2 擋下時記錄 `ChargingStartRejected`。**ACL 對拒絕的翻譯：`ConnectorOccupied` → `idTagInfo.status = "Blocked"`；`Unauthorized` → `"Invalid"`**，讓樁不要送電。

### 2.6 MeterValues（樁 → CSMS）

定期回報累計讀數。

```json
[2, "m-9", "MeterValues", {
  "connectorId": 2,
  "transactionId": 991,
  "meterValue": [{
    "timestamp": "2025-05-20T14:13:00+08:00",
    "sampledValue": [
      { "value": "4000", "measurand": "Energy.Active.Import.Register", "unit": "Wh" },
      { "value": "6.8", "measurand": "Power.Active.Import", "unit": "kW" }
    ]
  }]
}]
```

- 一則訊息可以帶多個 `sampledValue`，**只有 `Energy.Active.Import.Register` 是我們要的**（累計進電量）。功率、電壓、溫度等 ACL 直接丟掉或給監控。
- `value` 是字串，ACL 要轉整數。
- 觸發命令 `ReportMeterValue`；成功記錄 `EnergyMetered`，倒退時記錄 `MeterValueRejected`（R3）。

### 2.7 StopTransaction（樁 → CSMS，1.6J）

```json
[2, "t-2", "StopTransaction", {
  "transactionId": 991,
  "idTag": "TAG-MONTHLY-77",
  "meterStop": 12400,
  "timestamp": "2025-05-20T14:31:00+08:00",
  "reason": "Local"
}]
[3, "t-2", { "idTagInfo": { "status": "Accepted" } }]
```

`reason` 列舉：`EmergencyStop`, `EVDisconnected`, `HardReset`, `Local`, `Other`, `PowerLoss`, `Reboot`, `Remote`, `SoftReset`, `UnlockCommand`, `DeAuthorized`。

ACL 把它翻成**兩個**命令：先 `ReportMeterValue(meterStop)`（結束讀數也受 R3 約束），再 `StopCharging(stopReason=Local)`；R4 說只有 Charging 狀態可以 Stop，成功記錄 `ChargingCompleted(energyWh = 12400 − 0 = 12400, stopReason=Local)`。`stopReason` 這個欄位是**領域決定要保留 OCPP 的 reason 字串**，因為小美在乎「異常中止」。

### 2.8 RemoteStopTransaction（CSMS → 樁）

唯一一則反向的。小美在營運後台按「遠端停止」時用。

```json
[2, "r-5", "RemoteStopTransaction", { "transactionId": 991 }]
[3, "r-5", { "status": "Accepted" }]
```

注意：`Accepted` 只代表樁**收到了**，真正的結束仍會以樁隨後送出的 `StopTransaction(reason=Remote)` 為準。**不要在收到 Accepted 時就記錄 `ChargingCompleted`**——這是「系統動作當事實」的典型錯誤。

### 2.9 2.0.1 的 TransactionEvent（認得形狀就好）

2.0.1 把 Start / MeterValues / Stop 合併成一則，用 `eventType` 區分：

```json
[2, "te-1", "TransactionEvent", {
  "eventType": "Started",
  "timestamp": "2025-05-20T14:04:00+08:00",
  "triggerReason": "Authorized",
  "seqNo": 0,
  "transactionInfo": { "transactionId": "tx-991" },
  "evse": { "id": 1, "connectorId": 2 },
  "idToken": { "idToken": "TAG-MONTHLY-77", "type": "ISO14443" },
  "meterValue": [{ "timestamp": "2025-05-20T14:04:00+08:00",
                   "sampledValue": [{ "value": 0, "measurand": "Energy.Active.Import.Register" }] }]
}]
```

`eventType: "Ended"` 時 `transactionInfo.stoppedReason` 對應 1.6 的 `reason`。2.0.1 的 `StatusNotification.connectorStatus` 只剩 `Available`, `Occupied`, `Reserved`, `Unavailable`, `Faulted`，故障細節改由 `NotifyEvent` 報。

**ACL 的價值在這裡最明顯**：不管樁講 1.6 還是 2.0.1，Charging 聚合看到的永遠是 `StartCharging` / `ReportMeterValue` / `StopCharging` 三個命令。

---

## 3. 為什麼這些不是通用語言

curriculum §1.4 明講：「OCPP → Charging：防腐層 ACL。`StatusNotification` 不是通用語言。」理由有四個。

### 3.1 OCPP 是設備語言，不是業務語言

`StatusNotification(Preparing)` 的意思是「樁的狀態機進入 Preparing」。小美不會說「樁 Preparing 了」，她會說「車主插槍了」。**通用語言是利害關係人會說的話**。

### 3.2 一則訊息 ≠ 一個事實

- `StatusNotification(Faulted)` 一天可能收到 20 次，但「這根樁壞了」只發生一次。
- `RemoteStopTransaction` 的 `Accepted` 不是「充電已結束」。
- `StartTransaction` 到了 CSMS 不代表可以充——R1 / R2 可能拒絕。

### 3.3 識別碼不一樣

`transactionId: 5567` 是樁與 CSMS 之間的臨時號碼；`S-991` 是全公司都認得的會話編號。`connectorId: 2` 是樁上的第幾把槍；`CP-A12-2` 是全國唯一的連接器身份（curriculum §1.5：連接器是「一把槍的業務身份」，不是 Modbus 位址）。

### 3.4 版本會變，業務不會

從 1.6 換到 2.0.1，`StartTransaction` 消失了，但「充電已授權開始」這個事實永遠存在。把 OCPP 名詞放進聚合，等於讓硬體供應商決定你的領域模型。

### 3.5 對照表：OCPP → 領域

| OCPP 訊息 | ACL 翻成的命令 | 成功事實（領域事件） | 拒絕事實 |
|---|---|---|---|
| `StatusNotification(status=Preparing)` | （查詢/記錄） | `ConnectorPluggedIn` | — |
| `Authorize` + `StartTransaction` | `StartCharging(sessionId, connectorId, idTag, meterStartWh, at)` | `ChargingStarted` | `ChargingStartRejected(reason=ConnectorOccupied \| Unauthorized)` → 回樁 `Blocked` / `Invalid` |
| `MeterValues` | `ReportMeterValue(sessionId, meterWh, at)` | `EnergyMetered` | `MeterValueRejected(reason=NotMonotonic \| NotCharging)` |
| `StopTransaction` | `ReportMeterValue(meterStop)` 再 `StopCharging(sessionId, stopReason, at)` | `ChargingCompleted(energyWh, stopReason)` | （R4：非 Charging 狀態是呼叫端錯，throw） |
| `StatusNotification(status=Faulted, errorCode=X)` | `ReportFault(chargerId, connectorId?, faultCode=X, at)` | `ChargerFaulted(stillEnergized)` | — |
| `StatusNotification(status=Available)` 於工單期間 | （供 AssetOps 修復驗證參考） | — | — |
| `Heartbeat` / `BootNotification` | （健康度、資產登記） | 不進 Charging 聚合 | — |
| `RemoteStopTransaction` | 由應用層發給樁的**請求**；事實要等 `StopTransaction(reason=Remote)` | — | — |

**規則**：聚合只認得右邊三欄的名詞；`src/charging/domain/` 裡不准出現 `StatusNotification`、`transactionId`、`sampledValue` 這些字。`/aggregate-review` 會抓。

### 3.6 「系統動作當事實」的 OCPP 版本

Day 2 `/storm` 會糾正的錯誤，用 OCPP 舉例：

| 錯的黃貼 | 為什麼錯 | 對的黃貼 |
|---|---|---|
| 「收到 StatusNotification」 | 那是訊息到達，不是業務事實 | `ChargerFaulted` 或 `ConnectorPluggedIn` |
| 「呼叫 RemoteStop API」 | 那是命令，不是事實 | `ChargingCompleted(stopReason=Remote)` |
| 「寫入 transactions 表」 | 那是實作 | `ChargingStarted` |
| 「Heartbeat 逾時」 | 這其實是**可以**當事實的邊界案例：健康度 context 可能真的在乎「樁已失聯」 | 討論後決定，並命名成業務話 |

---

## 4. 模擬器 `scripts/ocpp-sim`

工作坊不接真樁。`scripts/ocpp-sim/sim.mjs` 與 `sim.py` 零依賴、行為相同：

```bash
node scripts/ocpp-sim/sim.mjs                     # stdout：一行一個 CALL frame（NDJSON）
node scripts/ocpp-sim/sim.mjs --pretty
node scripts/ocpp-sim/sim.mjs --url http://localhost:3000/ocpp/CP-A12 --delay 200   # Day 6：逐筆 POST 到你的端點
```

訊息序列（10 則）：`BootNotification(serial CP-A12)` → `StatusNotification(connector 2, Available, 14:00)` → `Authorize(TAG-MONTHLY-77)` → `StartTransaction(connector 2, meterStart 0, 14:04)` → `MeterValues` × 3（4000 / 8000 / 12400 Wh @ 14:13 / 14:22 / 14:31）→ `StopTransaction(meterStop 12400, Local, 14:31)` → `StatusNotification(Faulted, GroundFailure, 18:10:00)` → 同一則 **8 秒後再報一次**（18:10:08，R5 素材）。

`--url` 模式會讀 `StartTransaction` 回應裡的 `transactionId` 並自動帶入後續訊息。它**不會**送倒退的計量或第二張卡——那些（R1 的 `TAG-VISITOR-01`、R3 的 3900）在 Day 4–5 直接對聚合下命令就測完了；`scripts/e2e` 的劇本則自己補了 14:05 的第二張卡。模擬器只是 Day 6 讓 ACL 有東西可翻。

---

## 5. 常見誤解

- **「OCPP 的 Transaction 就是 ChargingSession。」** 不是。前者是協定層交易（有 `transactionId`），後者是業務會話（`S-991`）。一個會話對一個交易是常態，但會話的生命週期由 Charging 決定（例如 Preparing 逾時可以取消會話，OCPP 根本沒有交易）。
- **「把 OCPP JSON 直接丟到 broker 讓大家訂閱最省事。」** 這是 eda.md 的反模式第一名：所有下游都得懂 OCPP，版本一換全公司陪葬。
- **「connectorId=0 是 bug。」** 不是，0 代表整台樁。真實樁的 `Faulted` 常常是 0。ACL 要把 `connectorId: 0` 翻成 `connectorId: undefined`（契約裡的 `connectorId?`）；模擬器報的是 2，兩種你的 ACL 測試都要有。
- **「Authorize 回 Accepted 之後一定會有 StartTransaction。」** 不一定，車主可能刷了卡又走掉。這就是為什麼「刷卡」不等於「已授權開始」。

---

## 自我檢查

1. 樁與 CSMS 誰是 WebSocket 的 client？為什麼在我們的架構裡 CSMS 端點放在場站節點？
2. `transactionId: 991` 與 `S-991` 的關係是什麼？誰負責維護對應？
3. 收到 `RemoteStopTransaction` 的 `Accepted` 回應時，可以記錄 `ChargingCompleted` 嗎？為什麼？
4. 寫出 `StatusNotification(status=Faulted, errorCode=GroundFailure, connectorId=0)` 被 ACL 翻譯後的命令與領域事件，包含欄位。
5. 「`StatusNotification` 不是通用語言」的四個理由，請用自己的話各說一句。
