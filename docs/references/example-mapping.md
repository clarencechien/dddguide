# Example Mapping 與 BDD（Given / When / Then）

> Day 2 B3 的方法論。交付物：`workshop/day2/rules.md`（≥ 6 條 GWT）。用 `/rules-check` 驗收。Day 4 這些規則直接變成紅燈測試——所以本文的數字對齊 `starter/` 附的測試與 `scripts/e2e`。

## 讀完你會拿到

- Example Mapping 的四種卡片（故事、規則、例子、問題）與 25 分鐘的流程。
- 一條規則的 Definition of Done：擁有的 context、命令、成功事件、拒絕事件、數字例子。
- R1、R5、R6 三條規則的完整寫法，可以直接當 Day 4 測試的規格。
- Given / When / Then 的寫法規範，以及新手常見的「假 GWT」。

---

## 1. 為什麼存在

Event Storming 給你事件與熱點；熱點是**問題**，不是答案。「重複申告要怎麼處理？」這個熱點要變成可以測試的規則，中間需要一個工具。

Matt Wynne 在 2015 年提出 Example Mapping：用 25 分鐘、四種顏色的索引卡，把一個 story 拆成「規則」與「例子」，找出「問題」。它的核心洞見是：**規則是抽象的，例子是具體的，而人只有在看到具體例子時才會發現規則寫錯了**。

Dan North 更早（2006）提出 BDD 與 Given / When / Then：把例子寫成「前提 / 動作 / 結果」，讓它同時是規格、測試與文件。

在本工作坊：Day 2 寫 GWT → Day 4 逐條變紅燈測試 → Day 7 PR 描述引用規則編號。**規則編號 R1–R8 是整個工作坊的主鍵。**

---

## 2. 四種卡片

| 卡 | 顏色 | 內容 | 我們的例子 |
|---|---|---|---|
| 故事（Story） | 黃 | 一個要交付的能力 | 「車主可以在連接器上開始充電」 |
| 規則（Rule） | 藍 | 業務約束，一個故事有多條 | R1 連接器占用時拒絕第二次 Start |
| 例子（Example） | 綠 | 一個規則有多個，帶具體數字 | `CP-A12-2` 上 `S-991` 進行中，`TAG-VISITOR-01` 嘗試 Start → 拒絕 |
| 問題（Question） | 紅 | 沒人能當場回答的 | 「插了槍沒刷卡算占用嗎？」 |

排法：故事在上，規則橫排，每條規則下面掛例子，問題另外堆一區。

**流程（25 分鐘，一個 story）**：
1. 5 分：講故事，貼第一張規則。
2. 15 分：對每條規則貼例子；貼例子時發現新規則就加卡；答不出來就貼問題。
3. 5 分：看卡片的形狀——規則太多 → story 太大要拆；問題太多 → 不該進 sprint；例子太少 → 沒想清楚。

一個人做時，Claude 扮演「一直問例子的 tester」。輸入 `/rules-check` 之前，先自己把每條規則至少配兩個例子（一個成功、一個拒絕）。

---

## 3. 規則的 Definition of Done

`/rules-check` 對每條規則查五件事。缺一項就打回。

| # | 要有 | 為什麼 | R1 的答案 |
|---|---|---|---|
| 1 | **擁有的 context** | Day 3 要能直接落到 BC；一條規則跨兩個 context 就是邊界畫錯 | Charging |
| 2 | **命令** | 規則是在「有人想做某事」時被檢查的 | `StartCharging` |
| 3 | **成功事件** | 規則通過時世界變成什麼樣 | `ChargingStarted` |
| 4 | **拒絕事件** | 規則擋下時**也是事實**，要被記錄、可被統計 | `ChargingStartRejected(reason=ConnectorOccupied)` |
| 5 | **數字例子** | 用 curriculum §1.6 的識別碼與具體數值 | `S-991`, `CP-A12-2`, `100 Wh`, `14:04` |

第 4 點是新手最常漏的：「拒絕就丟例外」不行。小美要統計「每天有多少次被拒的 Start」，Vicky 要知道「這根樁被拒了 20 次是不是壞了」。拒絕是事件，不是 exception。**例外只留給呼叫端的錯**（對 Idle 的會話 Stop）。

---

## 4. Given / When / Then 範本

```gherkin
# 規則 Rx：<一句話>
# Context：<Charging | Parking | Billing | AssetOps | Dispatch>
# 命令：<CommandName(欄位…)>
# 成功事件：<EventName(欄位…)>
# 拒絕事件：<EventName(reason=…)>

Scenario: <例子的名字，說出關鍵條件>
  Given <世界的狀態，用識別碼與數字>
    And <更多狀態>
  When  <一個命令，帶參數>
  Then  <一個或多個事件，帶欄位>
    And <聚合狀態的斷言，可選>
    But  <什麼「沒有」發生>          ← 拒絕場景一定要有這行
```

寫法規範：

- **Given 只描述狀態**，不描述動作。「Given 車主插了槍」❌ → 「Given 連接器 `CP-A12-2` 上有進行中會話 `S-991`」✅。
- **When 只有一個命令**。兩個 When 就是兩個 scenario。
- **Then 用事件講**，不用「資料庫裡有一筆」。
- **數字要真的算**：`12400 − 0 = 12400`，不要寫「energyWh 是正確的」。
- **But 行**：拒絕時，明確寫「原會話不變」「沒有第二張工單」。這是 Day 4 測試裡最有價值的斷言。

---

## 5. R1 完整寫法

```gherkin
# 規則 R1：連接器占用時拒絕第二次 Start；發布 ChargingStartRejected(reason=ConnectorOccupied)，原會話不變。
# Context：Charging
# 命令：StartCharging(sessionId, connectorId, idTag, meterStartWh, at)   ← authorized 由 AuthorizationService 判定後傳入聚合
# 成功事件：ChargingStarted(sessionId, connectorId, idTag, meterStartWh, occurredAt)
# 拒絕事件：ChargingStartRejected(connectorId, idTag, reason=ConnectorOccupied, occurredAt)

Scenario: 空閒的連接器可以開始
  Given 連接器 CP-A12-2 空閒（Idle）
    And 憑證 TAG-MONTHLY-77 已授權
  When  StartCharging(sessionId=S-991, connectorId=CP-A12-2, idTag=TAG-MONTHLY-77, meterStartWh=100, at=14:04)
  Then  發布 ChargingStarted(sessionId=S-991, connectorId=CP-A12-2, idTag=TAG-MONTHLY-77, meterStartWh=100, occurredAt=14:04)
    And CP-A12-2 的狀態為 Charging

Scenario: 占用中的連接器拒絕第二次 Start
  Given 連接器 CP-A12-2 上有進行中的充電會話 S-991（憑證 TAG-MONTHLY-77，起始 100 Wh，14:04）
    And 憑證 TAG-VISITOR-01 已授權
  When  StartCharging(sessionId=S-992, connectorId=CP-A12-2, idTag=TAG-VISITOR-01, meterStartWh=4100, at=14:13)
  Then  發布 ChargingStartRejected(connectorId=CP-A12-2, idTag=TAG-VISITOR-01, reason=ConnectorOccupied, occurredAt=14:13)
    But  沒有發布 ChargingStarted
    And  CP-A12-2 的會話仍為 S-991，憑證仍為 TAG-MONTHLY-77，狀態仍為 Charging，起始計量仍為 100

Scenario: 同一憑證重送 Start 也拒絕（樁重試）
  Given 連接器 CP-A12-2 上有進行中的充電會話 S-991（憑證 TAG-MONTHLY-77）
  When  StartCharging(sessionId=S-993, connectorId=CP-A12-2, idTag=TAG-MONTHLY-77, meterStartWh=100, at=14:04:30)
  Then  發布 ChargingStartRejected(reason=ConnectorOccupied)
    But  S-991 不變

Scenario: 另一把槍不受影響
  Given 連接器 CP-A12-2 上有進行中的充電會話 S-991
    And 連接器 CP-A12-1 空閒
  When  StartCharging(sessionId=S-992, connectorId=CP-A12-1, idTag=TAG-VISITOR-01, meterStartWh=88000, at=14:13)
  Then  發布 ChargingStarted(sessionId=S-992, connectorId=CP-A12-1, …)
```

這就是 `starter/<lang>/test/charging/` 附的第一個紅燈測試（第二個 scenario）。ACL 收到拒絕後回給樁 `idTagInfo.status = "Blocked"`。

**問題卡**（Day 2 留著，Day 4 前要有答案或進 backlog）：
- ❓ 同一憑證重送 Start 應該是「拒絕」還是「冪等回同一個 S-991」？（工作坊決定：拒絕，因為 ACL 已經用 `transactionId` 去重；聚合保持簡單。）
- ❓ 「進行中」包含插槍未刷卡嗎？（工作坊決定：不包含；`ConnectorPluggedIn` 不建立會話。）

---

## 6. R5 完整寫法

```gherkin
# 規則 R5：同一樁同一故障碼在工單開放期間重複申告，只保留一張根因工單；第二次附加「重複申告」。
# Context：AssetOps
# 命令：（由 FaultProcessManager 消費 charging.charger.faulted.v1 後）WorkOrder.open(workOrderId, chargerId, connectorId?, faultCode, at)
#        或 existing.appendDuplicateReport(at)
# 成功事件：WorkOrderOpened(workOrderId, chargerId, connectorId?, faultCode, occurredAt) → ops.work_order.opened.v1
# 「拒絕」事件：DuplicateFaultReported(workOrderId, chargerId, faultCode, occurredAt)（AssetOps 內部，不對外）

Scenario: 首次申告開立根因工單
  Given 樁 CP-A12 沒有開放中的工單
  When  收到 charging.charger.faulted.v1(chargerId=CP-A12, connectorId=CP-A12-2, faultCode=GroundFailure, occurredAt=18:10:00, eventId=evt-A)
  Then  發布 WorkOrderOpened(workOrderId=WO-2208, chargerId=CP-A12, faultCode=GroundFailure, occurredAt=18:10:00)
    And ops.work_order.opened.v1 進 Outbox
    And WO-2208 狀態為 Open（MVP1 隨即由 Dispatch stub 指派 TECH-HAO → Assigned），duplicateReportCount = 0

Scenario: 開放期間同樁同碼再申告，附加不開新單
  Given 樁 CP-A12 有開放中的工單 WO-2208（faultCode=GroundFailure，openedAt=18:10:00）
  When  收到 charging.charger.faulted.v1(chargerId=CP-A12, faultCode=GroundFailure, occurredAt=18:10:08, eventId=evt-B)
  Then  發布 DuplicateFaultReported(workOrderId=WO-2208, chargerId=CP-A12, faultCode=GroundFailure, occurredAt=18:10:08)
    But  沒有發布 WorkOrderOpened，ops.work_order.opened.v1 仍只有一則
    And  WO-2208 的 duplicateReportCount = 1，狀態不變
    And  開放中的工單數仍為 1

Scenario: 至少一次投遞造成的完全重複事件（相同 eventId）
  Given 樁 CP-A12 有開放中的工單 WO-2208，且 evt-A 已處理
  When  broker 於 18:12 重送 charging.charger.faulted.v1(eventId=evt-A)
  Then  沒有任何變化：duplicateReportCount 仍 = 1，沒有新事件

Scenario: 同樁不同故障碼是另一張工單
  Given 樁 CP-A12 有開放中的工單 WO-2208（faultCode=GroundFailure）
  When  收到 charging.charger.faulted.v1(chargerId=CP-A12, faultCode=HighTemperature, occurredAt=18:20)
  Then  發布 WorkOrderOpened(workOrderId=WO-2209, chargerId=CP-A12, faultCode=HighTemperature, …)
    And 開放中的工單數為 2

Scenario: 關單後再申告是新的根因工單
  Given 樁 CP-A12 的工單 WO-2208（GroundFailure）已於 18:18 關閉（outcome=Repaired）
  When  收到 charging.charger.faulted.v1(chargerId=CP-A12, faultCode=GroundFailure, occurredAt=隔天 11:00)
  Then  發布 WorkOrderOpened(workOrderId=WO-2210, chargerId=CP-A12, faultCode=GroundFailure, …)
```

第二與第三個 scenario 的差別是 Day 5 的重點：**樁真的又申告一次**（新 `eventId`，靠 `chargerId + faultCode` 去重，聚合層 = R5）vs **同一則事件送兩次**（同 `eventId`，靠 `processedEventIds` 去重，消費者層）。curriculum §1.8 說 AssetOps 的去重鍵是前者；後者是所有消費者都要做的冪等。

**問題卡**：
- ❓ 「開放期間」的定義：Open + Assigned 都算？Closed 才不算？（starter 決定：`isOpen = status !== Closed`。）
- ❓ `DuplicateFaultReported` 要不要對外給場站看板？（留給 ADR。）

---

## 7. R6 完整寫法

```gherkin
# 規則 R6：離場放行不依賴總部：連線中斷時值班長可人工放行，發布 ParkingManuallyReleased，帳務事後對齊。
# Context：Parking（MVP1 為 stub：solutions/*/src/parking/ParkingSession）
# 命令：manualRelease(parkingSessionId, releasedBy, at)
# 成功事件：ParkingManuallyReleased(parkingSessionId, plate, releasedBy, occurredAt)
#           + VehicleExited(parkingSessionId, plate, releaseMode=Manual, occurredAt)
#           → 整合事件 parking.session.closed.v1(releaseMode=Manual)
# 拒絕事件：問題卡（見下）

Scenario: 總部斷線時值班長人工放行
  Given 停車會話 P-441（車牌 ABC-1234，14:02 進場）Active
    And 場站 SITE-TPE-01 對總部的連線已中斷
  When  manualRelease(parkingSessionId=P-441, releasedBy=阿忠, at=14:33)
  Then  發布 ParkingManuallyReleased(parkingSessionId=P-441, plate=ABC-1234, releasedBy=阿忠, occurredAt=14:33)
    And 發布 VehicleExited(parkingSessionId=P-441, plate=ABC-1234, releaseMode=Manual, occurredAt=14:33)
    And 閘門開啟，P-441 狀態為 Released
    And 整合事件 parking.session.closed.v1(parkingSessionId=P-441, plate=ABC-1234, durationMin=31, releaseMode=Manual) 寫入 Outbox
    But  沒有呼叫總部任何 API

Scenario: 連線正常時人工放行也合法（值班長判斷）
  Given 停車會話 P-441 Active
    And 場站對總部連線正常
  When  manualRelease(parkingSessionId=P-441, releasedBy=阿忠, at=14:33)
  Then  發布 ParkingManuallyReleased(…) 與 VehicleExited(releaseMode=Manual)

Scenario: 帳務事後對齊
  Given Billing 尚未收到 P-441 的任何結束事件
  When  連線恢復，Outbox relay 送出 parking.session.closed.v1(parkingSessionId=P-441, durationMin=31, releaseMode=Manual)
  Then  Billing 以 durationMin=31 計算停車費（月票 → 0 元）並合併入 INV-778 草稿（合併本身是 Sprint 2）
    And Billing 沒有因為 releaseMode=Manual 而拒收
```

**問題卡**：
- ❓ P-441 已 Released 時再人工放行怎麼處理？（stub 目前 throw `Already released`；正式版是事件還是例外，記入 Sprint 2 backlog。）
- ❓ 人工放行是否需要理由碼（斷線 / 閘門故障 / 客訴）？（問阿忠。）

R6 沒有真正的拒絕事件，這是合理的：R6 是一條**放寬**規則（「即使 X 也可以」），不是約束。`/rules-check` 接受「拒絕事件：不適用 + 理由」，但不接受空白。

---

## 8. 其他規則的骨架（學員自己補例子；數字對齊 starter 的測試註解）

| 規則 | Context | 命令 | 成功事件 | 拒絕事件 | 數字例子提示 |
|---|---|---|---|---|---|
| R2 | Charging | `StartCharging`（`authorized=false`） | `ChargingStarted` | `ChargingStartRejected(reason=Unauthorized)`，狀態仍 Idle | `TAG-UNKNOWN`；斷線時車隊卡（小美隱藏事實 2） |
| R3 | Charging | `ReportMeterValue` | `EnergyMetered(meterWh=8100)` | `MeterValueRejected(reason=NotMonotonic, meterWh=3900, lastMeterWh=4100)`；非 Charging 時 `reason=NotCharging` | 4100 之後來 3900；「相等」算不算要你決定 |
| R4 | Charging | `StopCharging(stopReason=Local, at=14:31)` | `ChargingCompleted(energyWh=12400, startedAt=14:04, endedAt=14:31, stopReason=Local)` | Idle / Completed 下 Stop → `InvalidStateError`（呼叫端錯） | 起始 100，讀 4100 / 8100 / 12500 |
| R7 | Billing | `AdjustInvoice` | `InvoiceAdjusted` | 直接改金額被拒 | INV-778 從 99.2 改為 62（離峰 5 元）；Sprint 2 |
| R8 | 全部（架構規則） | — | — | — | 用測試證明聚合沒有 bus / Outbox 依賴（`tdd.md` §7） |

R8 不是業務規則，是架構規則；它的「測試」是 `/aggregate-review` 與一條檢查 import 的單元測試。

---

## 9. 假 GWT：新手常犯的錯

| 假 GWT | 問題 | 改法 |
|---|---|---|
| `When 使用者點擊開始按鈕` | UI 動作，不是命令 | `When StartCharging(…)` |
| `Then 資料庫有一筆 session` | 實作細節 | `Then 發布 ChargingStarted` |
| `Then 回傳 400` | HTTP 是 adapter 的事 | `Then 發布 ChargingStartRejected(reason=…)` |
| `Given 系統正常運作` | 沒有資訊 | 刪掉 |
| `Then energyWh 正確` | 沒有數字 | `Then energyWh = 12400` |
| `When Start 然後 Stop` | 兩個命令 | 拆成兩個 scenario，或第二個的 Given 包含第一個的結果 |
| 沒有 But 行的拒絕場景 | 沒斷言「什麼沒發生」 | 加 `But 沒有發布 ChargingStarted` |
| 規則寫成「系統應該正確處理重複申告」 | 不可測 | 寫成 R5 那樣可數的東西（duplicateReportCount = 1） |
| 用 OCPP 的字（`StartTransaction`、`transactionId`） | 不是通用語言 | `StartCharging`、`sessionId` |

---

## 10. `rules.md` 最低要求

1. ≥ 6 條規則（從 R1–R8 選，或自己從熱點加），每條有 DoD 五項。
2. 每條 ≥ 2 個 scenario（一成功一拒絕，或一正常一邊界）；每段有數字或識別碼。
3. R3 的「相等」邊界與 R4 的數字要決定；R6–R8 至少各一個例子（Day 3 切邊界要用）。
4. 所有識別碼來自 curriculum §1.6，所有事件名來自 §1.7 / §1.9。
5. 「待決問題」區塊，每個問題標「問誰」或「留給 ADR / backlog」。
6. 一段「這些規則各屬於哪個 context 候選」（Day 3 的輸入）。

---

## 11. 延伸閱讀

- Matt Wynne, "Introducing Example Mapping", Cucumber blog, 2015。—— 原文，10 分鐘。
- Dan North, "Introducing BDD", 2006（dannorth.net）。—— GWT 的起源。
- Gojko Adzic, *Specification by Example*, 2011。—— 例子驅動規格的完整方法。
- Seb Rose, Matt Wynne & Aslak Hellesøy, *The Cucumber Book*（2nd ed.），2017。—— 第 1–3 章即可，不需要真的用 Cucumber。
- Eric Evans, *Domain-Driven Design*, 2003, 第 6 章 —— 聚合的不變條件（invariant）就是規則。

---

## 自我檢查

1. 規則 DoD 的五項是什麼？哪一項最常被漏、為什麼它重要？
2. R1 的拒絕場景裡 `But` 行斷言了什麼？starter 的測試用 `toEqual([...])` 怎麼一次涵蓋它？
3. R5 的兩種「重複」（18:10:08 樁再申告 vs 18:12 broker 重送）分別靠什麼去重、在哪一層？
4. 為什麼 R6 可以沒有拒絕事件？什麼樣的規則可以？
5. 把 R3 寫成兩個完整 scenario，用 4100 / 3900 / 8100 這組數字。
