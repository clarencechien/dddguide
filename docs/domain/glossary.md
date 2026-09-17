# 通用語言詞彙表（Ubiquitous Language Glossary）

> 這是 curriculum §1.5 的完整版。Day 2 學員要在 `workshop/day2/glossary.md` 交出自己的版本；這份是助教與講師的對照答案，**Day 1–2 不要直接抄**。
> 規則：一個詞只能有一個意思；同一個意思只能有一個詞；每個詞都有「擁有它的 context」。

## 讀完你會拿到

- 一張 ≥ 30 個詞的表：中文、英文、「是什麼」、「不是什麼」、擁有的 Bounded Context。
- 一份「常見用語衝突」清單：同一個字在不同人嘴裡意思不同的地方——這些正是 Day 3 找邊界的線索。
- 一套判斷「這個詞該不該進通用語言」的檢查法。

---

## 1. 為什麼需要這張表

Evans 在《Domain-Driven Design》第二章的核心主張：**模型、程式碼、對話用同一套語言**。實務上會失敗的原因通常不是沒有人寫詞彙表，而是：

1. 同一個字在兩個部門意思不同（「會話」對阿忠是停車、對小美是充電）。
2. 程式碼用了設備語言（`StatusNotification`）而不是業務語言（`ChargerFaulted`）。
3. 有人自己發明新詞（「充電紀錄」「交易」「訂單」）而不查表。

所以表的每一列都有「不是」欄位——通用語言的邊界比定義本身更有用。

---

## 2. 詞彙表

### 2.1 場站與設備

| # | 中文 | 英文 | 是 | 不是 | 擁有者 |
|---|---|---|---|---|---|
| 1 | 場站 | Site | 一個有地址、有閘門、有值班室的營運地點，例 `SITE-TPE-01` | 總部的行政區劃 | Parking |
| 2 | 充電樁 / 樁 | Charger（Charge Point） | 一台有韌體、有 OCPP 連線、會故障、會被修的設備，例 `CP-A12` | 一把槍；一筆資產折舊分錄 | AssetOps |
| 3 | 連接器 / 槍 | Connector | 一把槍的業務身份，能獨立插車、獨立計量，例 `CP-A12-2` | Modbus 位址；OCPP 的 `connectorId: 2` | Charging |
| 4 | 充電車位 | Charging Bay | 場站裡標示為可充電的停車位 | 連接器（一個車位可能對應一把槍，但不是同一件事） | Parking |
| 5 | 閘門 | Gate | 進出場站的實體障礙，由 Parking 決定開關 | 總部 API 的一個 endpoint | Parking |
| 6 | 車牌辨識 | LPR（License Plate Recognition） | 既有停車系統認出車牌的機制 | 顧客身份（車牌 ≠ 帳戶） | Parking |
| 7 | 韌體 | Firmware | 樁上跑的軟體版本，`BootNotification` 會報 | 我們的程式碼 | AssetOps |
| 8 | 健康度 | Health | 樁最近心跳、故障、離線時間的綜合判斷 | 一則 `Heartbeat` 訊息 | AssetOps |

### 2.2 停車

| # | 中文 | 英文 | 是 | 不是 | 擁有者 |
|---|---|---|---|---|---|
| 9 | 停車會話 | ParkingSession | 從進場到放行的一次占用契約，例 `P-441` | 閘門硬體日誌；充電會話 | Parking |
| 10 | 車輛已辨識進場 | VehicleEntered | LPR 認出車牌且閘門放行的事實 | 車開到門口（尚未辨識） | Parking |
| 11 | 充電車位已占用 | ChargingBayOccupied | 感測器確認充電車位有車 | 充電已開始 | Parking |
| 12 | 車輛已離場 | VehicleExited | 車通過出口閘門的事實 | 帳單已結清 | Parking |
| 13 | 人工放行 | Manual Release | 值班長在不依賴總部的情況下開閘讓車出去（R6） | 免費放行（帳務事後仍要對齊） | Parking |
| 14 | 停車已人工放行 | ParkingManuallyReleased | 人工放行發生的事實，帳務事後對齊 | 系統錯誤日誌 | Parking |
| 15 | 月票 | Monthly Pass | 停車的月費資格，例憑證 `TAG-MONTHLY-77` 持有者 | 電費的免費資格 | Parking（資格）/ Billing（計價） |

### 2.3 充電

| # | 中文 | 英文 | 是 | 不是 | 擁有者 |
|---|---|---|---|---|---|
| 16 | 充電會話 | ChargingSession | 從插槍授權到結束計量的一次能量交付，例 `S-991` | OCPP Transaction（`transactionId: 5567`） | Charging |
| 17 | 憑證 | IdTag | 用來授權充電的身份憑證（卡、App token），例 `TAG-MONTHLY-77` | 車牌；停車月票本身 | Charging |
| 18 | 授權 | Authorization | 憑證被判定可以在此連接器開始充電 | 樁回 `Accepted` 這個動作 | Charging |
| 19 | 連接器已插上 | ConnectorPluggedIn | 槍已物理連接車輛的事實 | 已授權；已扣款 | Charging |
| 20 | 充電已授權開始 | ChargingStarted | 授權成功且開始計量的事實 | 插槍；刷卡 | Charging |
| 21 | 充電開始被拒 | ChargingStartRejected | 開始請求被規則擋下，帶 `reason=ConnectorOccupied` 或 `Unauthorized` | 系統例外 | Charging |
| 22 | 電量已計量 | EnergyMetered | 一次合法（單調遞增）的累計讀數被記錄 | 每次 OCPP `MeterValues` 訊息 | Charging |
| 23 | 計量值被拒 | MeterValueRejected | 倒退的讀數被拒絕並留下紀錄（R3） | 靜默丟棄 | Charging |
| 24 | 充電已結束 | ChargingCompleted | 會話結束，`energyWh = 最後計量 − 起始計量`（R4） | 拔槍；`RemoteStop` 被 Accepted | Charging |
| 25 | 中止原因 | Stop Reason | 會話結束的原因（`Local`, `Remote`, `EVDisconnected`, `PowerLoss` …） | 故障碼 | Charging |
| 26 | 度數 / 能量 | Energy（energyWh） | 以 Wh 整數表示的能量，例 `12400 Wh = 12.4 kWh` | 功率 kW；金額 | Charging |
| 27 | 計量值 | Meter Value | 電表的累計讀數（Wh），應單調遞增 | 這段時間用了多少 | Charging |
| 28 | 充電器已申告故障 | ChargerFaulted | 設備已聲明自己無法按契約供電 | App 連不上的客訴；`Unavailable` | Charging（產生）/ AssetOps（消費） |
| 29 | 故障碼 | Fault Code | 故障的分類代碼，例 `GroundFailure` | 客訴文字 | Charging / AssetOps |
| 30 | 仍帶電 | stillEnergized | 故障當下連接器是否仍在輸出（安全欄位） | 樁有沒有電源 | Charging |

### 2.4 帳務

| # | 中文 | 英文 | 是 | 不是 | 擁有者 |
|---|---|---|---|---|---|
| 31 | 帳單 | Invoice | 對顧客的求償文件，例 `INV-778` | MeterValue 陣列；草稿 | Billing |
| 32 | 草稿帳單 | Draft Invoice | 會話進行中或未合併前的暫存計價 | 已開立的帳單（不可變） | Billing |
| 33 | 費率 | Tariff | 每度電價 / 每分鐘停車價的規則表，含尖離峰 | 電力公司給營運商的躉售價 | Billing |
| 34 | 尖峰 / 離峰 | Peak / Off-peak | 費率的時段分類 | 樁的忙碌程度 | Billing |
| 35 | 服務費 | Service Fee | 電費以外的固定或按度加收 | 維修成本 | Billing |
| 36 | 帳單已更正 | InvoiceAdjusted | 已開立帳單的金額更正事件（R7） | 直接 UPDATE 帳單金額 | Billing |
| 37 | 爭議 | Dispute | 顧客對帳單的異議流程 | 客訴電話本身 | Billing |
| 38 | 對帳 | Reconciliation | 事後把停車、充電、放行事件對齊成帳單 | 即時扣款 | Billing |

### 2.5 資產維運與派工

| # | 中文 | 英文 | 是 | 不是 | 擁有者 |
|---|---|---|---|---|---|
| 39 | 工單 | WorkOrder | 總部對一根故障的承諾，例 `WO-2208` | 一通值班電話；一則故障訊息 | AssetOps |
| 40 | 根因工單 | Root-cause WorkOrder | 同一樁同一故障碼在開放期間唯一的那張工單（R5） | 每次申告一張 | AssetOps |
| 41 | 重複申告 | Duplicate Report（事件 `DuplicateFaultReported`） | 工單開放期間再次收到同樁同碼的申告，附加到根因工單；AssetOps 內部事件，不對外 | 新工單；broker 重送同一則事件（那靠 `eventId` 擋） | AssetOps |
| 42 | 工單已開立 / 已關閉 | WorkOrderOpened / WorkOrderClosed | 工單生命週期的兩端；對外為 `ops.work_order.opened.v1` / `closed.v1` | 技術員的到場打卡 | AssetOps |
| 43 | 恢復可售 | Back in Service | 修復驗證後樁重新可以賣電 | 樁回 `Available` 這則訊息本身 | AssetOps（宣告）/ Charging（在乎） |
| 44 | 技術員 | Technician | 能被派工的人，例 `TECH-HAO` | 值班長 | Dispatch |
| 45 | 派工 | Dispatch（事件 `TechnicianAssigned`） | 把工單指派給主責技術員並規劃路線；MVP1 是 stub 固定回 `TECH-HAO` | 開工單；「技術員已出發」不是對帳務的整合事件 | Dispatch |
| 46 | 備品 | Spare Part | 修某類故障需要的零件，可預留 | 資產 | Dispatch |
| 47 | SLA | Service Level Agreement | 故障到恢復可售的承諾時限 | 技術員出發時間 | Dispatch（追蹤）/ AssetOps（起算） |
| 48 | 遠端重啟 | Remote Reset | 技術員或營運從遠端重啟樁的動作 | 故障已修復 | AssetOps |

### 2.6 架構與流程用語（跨 context，非領域名詞）

| # | 中文 | 英文 | 是 | 不是 |
|---|---|---|---|---|
| 49 | 命令 | Command | 對聚合的意圖：`StartCharging`, `StopCharging`, `ReportMeterValue`, `ReportFault` | 事件 |
| 50 | 領域事件 | Domain Event | 聚合內發生、以過去式命名的事實 | 整合事件 |
| 51 | 整合事件 | Integration Event | 跨 context 契約，例 `charging.session.completed.v1` | 領域事件本身 |
| 52 | 發件匣 | Outbox | 與聚合同一交易寫入的事件暫存表（R8） | 訊息佇列 |
| 53 | 防腐層 | ACL（Anti-Corruption Layer） | 把 OCPP 翻成命令與事件的那一層 | Controller |
| 54 | 人當 API | Human-as-API | BPR 用語：流程中靠人打電話、抄單、貼紙傳遞資料的交接點 | 客服 |

---

## 3. 常見用語衝突

這一節是 Day 3 找邊界的直接證據：**同一個字，不同人、不同意思，就是 context 邊界的候選**。

### 3.1 「會話 / Session」

| 誰說 | 意思 | 我們的詞 |
|---|---|---|
| 阿忠（值班長） | 車從進來到出去 | ParkingSession `P-441` |
| 小美（充電營運） | 從插槍到結束計量 | ChargingSession `S-991` |
| 樁的韌體工程師 | OCPP Transaction | 不進通用語言，ACL 對應表 |
| Web 工程師 | HTTP session / cookie | 完全無關，程式碼裡禁用裸字 `session` |

同一輛車 `ABC-1234` 在 14:02–14:33 有**一個** `P-441`，可能有**零到多個** `S-991`（拔了再插）。兩者生命週期不同，這是 Parking 與 Charging 分家的第一個理由。

### 3.2 「狀態 / Status」

| 誰說 | 意思 |
|---|---|
| OCPP | 連接器狀態機 `Available / Preparing / Charging / Finishing / Faulted …` |
| 小美 | 會話狀態：進行中 / 已結束 / 異常中止 |
| Vicky | 樁的健康狀態：正常 / 故障 / 維修中 / 停用 |
| 老陳 | 帳單狀態：草稿 / 已開立 / 已更正 / 爭議中 |

四個「狀態」四個狀態機。程式碼裡不准有一個叫 `status` 的欄位吃四種值。

### 3.3 「故障」

| 誰說 | 意思 | 我們的詞 |
|---|---|---|
| 樁 | `StatusNotification(Faulted)` | 觸發 `ReportFault` 命令 |
| 小美 | 會話異常中止 | `ChargingCompleted(stopReason=PowerLoss…)`，**不是故障** |
| 阿忠 | 螢幕黑掉、車主投訴 | 可能是故障也可能不是，要查 |
| Vicky | 一張開放中的工單 | `WorkOrder` |
| 阿豪 | 故障碼 | `faultCode` |

`ChargerFaulted` 的定義刻意寫成「設備已聲明自己無法按契約供電」，把主語釘在設備上。

### 3.4 「交易 / Transaction」

- OCPP：`StartTransaction` / `StopTransaction`。
- 資料庫：`BEGIN … COMMIT`。
- 老陳：一筆帳。

三個都合法，但**都不能進 Charging 的通用語言**。Charging 說「會話」。

### 3.5 「連接器 / 槍 / 車位 / EVSE」

- 槍（connector）：賣電單位。
- 車位（charging bay）：停車單位。
- EVSE：OCPP 2.0.1 的中間層（一個 EVSE 可有多個 connector，但同時只能有一個在充）。

一個車位對一把槍是常態，但不是定律（雙槍樁可能服務兩個車位）。**「占用等同充電已開始」**（curriculum §1.7 T1）就是把車位與槍混為一談的結果。

### 3.6 「放行」

- 阿忠：閘門開，車出去。
- 老陳：帳結清。

R6 說放行不依賴總部，所以放行**不等於**結清。`ParkingManuallyReleased` 之後 Billing 事後對齊。

### 3.7 「開單」

- Vicky：開**工單** `WO-2208`。
- 老陳：開**帳單** `INV-778`。

中文都叫開單，英文一個 open、一個 issue。程式碼裡 `WorkOrder.open()` 與 `Invoice.issue()`。

### 3.8 「憑證 / 卡 / 月票 / 車牌」

| 詞 | 用途 | 擁有者 |
|---|---|---|
| 車牌 `ABC-1234` | 停車身份 | Parking |
| 憑證 `TAG-MONTHLY-77` | 充電授權身份 | Charging |
| 月票 | 停車資格 | Parking |
| 顧客 | 收帳單的人 | Billing |

同一個人可能有一張車牌、兩張卡、一份月票。Billing 合併 `P-441` 與 `S-991` 的依據是**顧客**，不是車牌也不是卡——這件事要在訪談老陳時問出來。

---

## 4. 一個詞該不該進通用語言：五個問題

1. **有利害關係人會自然說出這個詞嗎？** `ChargerFaulted` 有（阿忠說「樁掛了」）；`StatusNotification` 沒有。
2. **它是事實、意圖，還是實作？** 事實（過去式事件）與意圖（命令）進；實作（表名、API 名）不進。
3. **它有唯一擁有者嗎？** 沒有的話多半是兩個詞被塞在一起。
4. **它的「不是」寫得出來嗎？** 寫不出來代表你還不懂它。
5. **改掉它會讓某段對話講不下去嗎？** 會的話它是核心詞；不會的話它可能是同義詞，該合併。

---

## 5. 給 Day 2 交付物的格式建議

`workshop/day2/glossary.md` 至少要有：

```markdown
| 中文 | 英文 | 是 | 不是 | 擁有者（Day 3 前可留空） |
```

≥ 20 個詞，且必須包含 curriculum §1.5 的六個與 §1.7 的八個事件。`/rules-check` 與 `/context-map` 都會讀這個檔。

---

## 自我檢查

1. 「會話」在阿忠與小美口中分別指什麼？兩者的生命週期有什麼不同？
2. `ChargerFaulted` 的「不是」是什麼？為什麼定義要把主語釘在設備上？
3. 程式碼裡出現 `session.status = "Faulted"` 有什麼問題？至少講兩個。
4. 「放行」與「結清」為什麼必須是兩個事實？哪條規則要求這件事？
5. 挑一個表中沒有、但你在訪談時可能聽到的詞，用第 4 節的五個問題判斷它該不該進表。
