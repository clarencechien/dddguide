# Day 4 — 戰術設計 + TDD

**一句話目標**：今天結束時，`ChargingSession` 與 `WorkOrder` 兩個聚合在你的 starter 裡活著，R1–R5 每條規則都有一個以規則命名的測試，
全部綠燈，而且領域層一行 I/O 都沒有。

## 今天結束你會拿到

| 交付物 | 路徑 | 最低要求 |
|---|---|---|
| Charging 領域層 | `starter/<lang>/src/charging/domain/**` | `ChargingSession` 聚合、`ConnectorId` / `Energy` / `IdTag` 值物件、領域事件、Repository port |
| AssetOps 領域層 | `starter/<lang>/src/assetops/domain/**` | `WorkOrder` 聚合、R5 去重、Repository port |
| In-memory adapter | `starter/<lang>/src/adapters/persistence/**` | 兩個 in-memory repository |
| 測試 | `starter/node/test/**` 或 `starter/python/tests/**` | R1–R5 各 ≥ 1 個測試，名字是規則句；`npm test` / `pytest` 全綠 |
| 模型說明 | `workshop/day4/model.md` | 聚合、VO、狀態機、事件、目錄對照、取捨 |
| 測試報告 | `workshop/day4/test-report.md` | 指令、輸出、測試名對規則、紅→綠 commit |

範本在 `workshop/day4/TEMPLATE.md`；驗收標準在 `docs/rubric.md`。

## 講師開場（15 分鐘）

- **[3 分] 從圖到程式碼**：前三天的 `rules.md` 今天變成測試，`storm-board.md` 的聚合候選變成 class，事件變成 record。沒有新的領域知識要學，只有紀律。
- **[4 分] 四個戰術積木**（白板）：
  - 聚合（Aggregate）：一個一致性邊界，一次交易只改一個。`ChargingSession` 守 R1–R4；`WorkOrder` 守 R5。
  - 實體（Entity）vs 值物件（Value Object）：有身份、會變的是實體；用值比較、不可變的是 VO。`ConnectorId`、`Energy`、`IdTag` 都是 VO。
  - 領域事件（Domain Event）：聚合做完決定後「記錄」的事實。**先記錄在聚合裡，不發布**（R8）。
  - Port / Adapter（六角架構）：領域層定義 `ChargingSessionRepository` 介面（port），`adapters/persistence/` 實作它。今天只做 in-memory。
- **[3 分] TDD 三步，一次一條規則**：紅（寫一個以規則命名的失敗測試、跑、看它紅）→ 綠（最少的碼讓它過）→ 重構（測試不動、碼變乾淨）。`/tdd` 在沒有紅燈時會拒絕寫產品碼——這是故意的。
- **[2 分] 領域層零 I/O**：`src/*/domain/` 不 import 資料庫、HTTP、時鐘、bus。時間從命令參數帶進來。OCPP 的字不准出現。
- **[2 分] 語言**：`workshop/.config` 決定你在 `starter/node`（TypeScript + vitest）或 `starter/python`（pytest）。目錄同構，教材兩邊都給。
- **[1 分] 交付物**：程式碼全綠 + `model.md` + `test-report.md`。

## 先讀（30 分鐘）

| 檔案 | 時間 | 讀什麼 |
|---|---|---|
| `docs/references/ddd-tactical.md` | 12 分 | 聚合的規則（小、一次改一個、用 ID 引用其他聚合）、VO 的判準、領域事件怎麼記錄 |
| `docs/references/hexagonal.md` | 8 分 | port / adapter、依賴方向（adapter 依賴 domain，反之不可）、starter 的目錄對照 |
| `docs/references/tdd.md` | 5 分 | 紅綠重構、測試命名 = 規則、一次一條 |
| 你的 `workshop/day2/rules.md` R1–R5 | 5 分 | 印出來放旁邊；每條的數字例子就是今天的測試資料 |

---

## Block 1（90 分鐘）— 戰術建模：聚合、值物件、事件、目錄

### 目標
在寫任何邏輯之前，決定 `ChargingSession` 的形狀：狀態、命令方法、守的規則、記錄的事件；決定三個 VO 的驗證規則；把六角目錄對上你的檔案。

### 步驟
1. **（15 分，不開 Claude）** 在 `workshop/day4/model.md` 畫 `ChargingSession` 狀態機（Mermaid `stateDiagram-v2`）。最少狀態：`Idle`（或不存在）→ `Charging` → `Completed`；R1 / R2 是進入 `Charging` 的守衛，R3 在 `Charging` 內，R4 只允許 `Charging → Completed`。
2. 列出聚合的命令方法（英文，祈使）與每個方法可能記錄的事件：
   | 方法 | 成功事件 | 拒絕事件 |
   |---|---|---|
   | `start(idTag, startMeterWh, at)` | `ChargingStarted` | `ChargingStartRejected(reason=ConnectorOccupied \| Unauthorized)` |
   | `recordMeter(meterWh, at)` | `EnergyMetered` | `MeterValueRejected` |
   | `stop(lastMeterWh, at, stopReason)` | `ChargingCompleted(energyWh)` | 拋錯或拒絕事件（你決定，寫進 model.md） |
3. 決定三個 VO 的驗證：`ConnectorId`（格式 `CP-A12-2`：樁 ID + 連接器序號）、`Energy`（Wh 整數、≥ 0）、`IdTag`（非空；授權與否**不是** VO 的事——授權是誰的責任？寫進「取捨」）。
4. 打開 starter，把六角目錄對照寫進 `model.md`：
   ```
   starter/node/src/charging/domain/          ← 聚合、VO、事件、port（今天）
   starter/node/src/charging/application/     ← 命令處理器（明天）
   starter/node/src/assetops/domain/          ← WorkOrder（今天 B3）
   starter/node/src/billing/                  ← 草稿帳單消費者（明天）
   starter/node/src/shared/                   ← events（信封）、outbox、bus（明天）
   starter/node/src/adapters/persistence/     ← in-memory（今天）、SQLite（Day 6）
   starter/node/src/adapters/http/            ← Fastify（Day 6）
   starter/node/src/adapters/ocpp-acl/        ← OCPP 翻譯（Day 6）
   starter/node/test/**                       ← 測試（Python：starter/python/tests/**，src 同構、檔名 snake_case）
   ```
5. **（45 分）** 用 `/aggregate-review` 審你的模型草稿（還沒有程式碼，審的是 `model.md`）。它會問：不變條件在哪個方法守？聚合裡有沒有不該在的東西（樁韌體版本、費率）？事件是 push 進 `pendingEvents` 還是直接發？
6. **（30 分）** 建檔案骨架（只有型別 / 簽名、沒有邏輯）：
   - Node：`src/charging/domain/ChargingSession.ts`、`ConnectorId.ts`、`Energy.ts`、`IdTag.ts`、`events.ts`、`ChargingSessionRepository.ts`
   - Python：`src/charging/domain/charging_session.py`、`connector_id.py`、`energy.py`、`id_tag.py`、`events.py`、`repository.py`
   跑一次測試，確認 starter 附的第一個紅燈（R1）還是紅的——那是 B2 的起點。

### 貼給 Claude Code 的提示
```
/aggregate-review ChargingSession

Day 4 Block 1。我還沒寫程式碼，這是我的 workshop/day4/model.md（請直接讀檔）：ChargingSession 狀態機、命令方法與事件、三個 VO 的驗證、目錄對照。
請審查模型而不是替我寫：
1. 對 R1–R4 各問我「這條規則在哪個方法、哪一行判斷會守住？守不住時記錄什麼事件？」
2. 檢查聚合有沒有塞了不屬於這個一致性邊界的東西——只說「第 N 個欄位你確定要放這裡？」
3. 「授權（IdTag 是否有效）」我放在聚合裡還是外面？請問我兩個問題讓我自己決定。
4. 事件：確認我的設計是「聚合記錄、應用層拉取」，如果不是，只問我「誰負責發布？」
最後給「下一個最小步驟」。
```

### 你自己要做的
- 狀態機與命令方法的簽名。Claude 可以挑戰，不該替你畫。
- 決定 `stop()` 在非 `Charging` 狀態時是拋錯還是記錄拒絕事件——兩者都合理，但要一致，且明天 API 會依它決定回 4xx 或 202。
- 決定授權的位置（提示：聚合可以收一個已經判斷好的 `authorized: boolean`，或收一個 `AuthorizationPolicy` port；不要在聚合裡查資料庫）。

### 常見卡點
- **聚合越畫越大**（想放費率、樁狀態、車牌）→ 問「R1–R4 需要它嗎？」不需要就不放；用 ID 引用（`connectorId`），不要抱物件。
- **VO 想做成可變的 class** → VO 是值：兩個 `Energy(12400)` 相等；改變就是產生新的一個。
- **不知道事件長什麼樣** → 從 `rules.md` 的 Then 抄：`ChargingStarted { sessionId, connectorId, idTag, startedAt }`。欄位名對齊 §1.8 契約（`sessionId`、`connectorId`、`energyWh`）。
- **starter 目錄跟教材對不上** → 以 starter 內的 `README` 為準，把差異寫進 `model.md`；目錄名字不重要，依賴方向才重要。

### 產出
- `workshop/day4/model.md`：狀態機、方法 / 事件表、VO 表、目錄對照、取捨（授權位置、stop 失敗方式）。
- 領域層檔案骨架存在；測試仍是「一個紅燈」。

---

## Block 2（90 分鐘）— TDD：R1 → R2 → R3 → R4 逐條紅綠重構

### 目標
四條規則、四輪（或更多）紅綠重構，每輪一個 commit。`/tdd` 是教練：沒有紅燈它不寫產品碼。

### 步驟
1. 跑測試，確認紅燈。指令：
   - Node：`cd starter/node && npm install && npm test`
   - Python：`cd starter/python && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && pytest`
2. **R1**（starter 已附紅燈；讀它，如果它的命名或資料不合你的 `rules.md`，先改測試）。測試檔：
   - Node：`starter/node/test/charging/domain/ChargingSession.test.ts`
   - Python：`starter/python/tests/charging/domain/test_charging_session.py`
   ```ts
   // vitest
   it("R1 occupied connector rejects a second start", () => {
     const s = ChargingSession.open("S-991", ConnectorId.of("CP-A12-2"));
     s.start({ idTag: IdTag.of("TAG-MONTHLY-77"), authorized: true, startMeterWh: 1000, at: t("14:04") });
     s.start({ idTag: IdTag.of("TAG-VISITOR-03"), authorized: true, startMeterWh: 1000, at: t("14:10") });
     const rejected = s.pendingEvents().filter(e => e.type === "ChargingStartRejected");
     expect(rejected).toHaveLength(1);
     expect(rejected[0].reason).toBe("ConnectorOccupied");
     expect(s.status).toBe("Charging");           // 原會話不變
     expect(s.startMeterWh).toBe(1000);
   });
   ```
   ```python
   # pytest
   def test_r1_occupied_connector_rejects_a_second_start():
       s = ChargingSession.open("S-991", ConnectorId.of("CP-A12-2"))
       s.start(id_tag=IdTag.of("TAG-MONTHLY-77"), authorized=True, start_meter_wh=1000, at=t("14:04"))
       s.start(id_tag=IdTag.of("TAG-VISITOR-03"), authorized=True, start_meter_wh=1000, at=t("14:10"))
       rejected = [e for e in s.pending_events() if e.type == "ChargingStartRejected"]
       assert len(rejected) == 1 and rejected[0].reason == "ConnectorOccupied"
       assert s.status == "Charging" and s.start_meter_wh == 1000
   ```
   最少的碼讓它綠 → commit `R1 green` → 重構（抽 `assertIdle()` 之類）→ 測試仍綠 → commit。
3. **R2** `R2 unauthorized id tag cannot start charging`：`authorized=false` → `ChargingStartRejected(reason=Unauthorized)`、狀態仍 `Idle`。紅 → 綠 → 重構。
4. **R3** 兩個測試：`R3 meter value must not go backwards`（1000 → 7000 → 6500：第三筆記錄 `MeterValueRejected`，`lastMeterWh` 仍 7000）與 `R3 equal meter value is <accepted|rejected>`（照你 `rules.md` 的決定）。
5. **R4** 兩個測試：`R4 only a charging session can be stopped`（`Idle` 下 `stop` → 你在 B1 決定的失敗方式）與 `R4 stop yields energyWh equal to last minus start meter`（1000 → 13400，`ChargingCompleted.energyWh === 12400`、`stopReason` 有值）。
6. **R8 前哨**：`R8 aggregate records events and does not publish`——聚合建構子與方法都不接受 bus / repository 參數；`pendingEvents()` 回傳後 `clearEvents()` 清空。這條明天會延伸到 Outbox。
7. 每條規則綠了就在 `workshop/day4/test-report.md` 的表格加一行（測試名、規則、commit hash）。

### 貼給 Claude Code 的提示
```
/tdd R1

Day 4 Block 2，語言見 workshop/.config。我要用紅綠重構做 R1「連接器占用時拒絕第二次 Start」。
我的例子在 workshop/day2/rules.md 的 R1 段（請直接讀檔），聚合設計在 workshop/day4/model.md。
規則：
- 你不可以在我沒有紅燈之前寫任何 src/ 底下的碼。先幫我看測試：我貼上我的測試，你只回「這個測試會因為什麼原因失敗」，不要改它。
- 我跑完測試貼結果給你之後，你才可以建議「最少的碼」——但只描述改哪個方法、大概幾行，讓我自己寫。
- 綠了之後，問我一個重構問題（重複、命名、方法太長），不要直接重構。
- 全程不准用 OCPP 的字、不准在 domain 內 import 任何 I/O。
這是我的測試：
<貼上>
```
每條規則換 `/tdd R2`、`/tdd R3`、`/tdd R4`，同樣格式。

### 你自己要做的
- 寫測試。每個測試自己打字，資料用 `rules.md` 的數字。
- 跑測試、看紅燈、貼輸出。不跑就寫產品碼是今天唯一會被 `/tdd` 擋下的事。
- 每輪 commit。message 用英文：`R1 green: reject start on occupied connector`。

### 常見卡點
- **測試一寫就綠** → 測試沒測到規則。把實作註解掉再跑，還綠就是測試錯。
- **R3 的「相等」** → 你 Day 2 決定的。沒決定就現在決定，寫進 `rules.md` 與測試名。
- **R4 想在 `stop` 裡順便算錢** → 錢是 Billing 的事。`ChargingCompleted` 只帶 `energyWh`，帳單明天由消費者算。
- **想在聚合裡 `new Date()`** → 時間由命令參數 `at` 帶進來。測試才能寫 14:04。
- **`pendingEvents` 回傳後測試改了它** → 回傳複本（Node：`[...this.events]`；Python：`list(self._events)`）。
- **Python import 路徑錯** → starter 用 `src/` layout；看 `starter/python/README` 或 `pyproject.toml` 的 `pythonpath`。

### 產出
- R1–R4（+ R8 前哨）測試全綠；每條至少一個 commit。
- `workshop/day4/test-report.md` 表格填到 R4。

---

## Block 3（90 分鐘）— WorkOrder 聚合 + R5、Repository port + in-memory adapter

### 目標
第二個聚合 `WorkOrder` 守 R5（同樁同故障碼開放期間只留一張根因工單）；替兩個聚合定義 Repository port 並用 in-memory adapter 實作，證明領域層不知道儲存方式。

### 步驟
1. **（10 分）** `WorkOrder` 形狀寫進 `model.md`：`workOrderId`、`chargerId`（`CP-A12`）、`faultCode`（`E42`）、`status: Open | Closed`、`duplicateReports: [{ at, connectorId? }]`、事件 `WorkOrderOpened`、`DuplicateFaultAttached`、`WorkOrderClosed`。
2. **R5 的判斷在哪裡？** 「同樁同故障碼、開放期間、是否已有工單」需要**查**現有工單——聚合自己查不到（零 I/O）。所以判斷分兩層：Repository port 提供 `findOpenBy(chargerId, faultCode)`；應用層（明天）決定是開新單還是呼叫既有單的 `attachDuplicateReport(at)`。今天測試聚合的兩個行為 + port 的介面。
3. **（35 分）TDD**：
   - `R5 open work order attaches duplicate fault instead of opening another`：`WorkOrder.open("WO-2208", "CP-A12", "E42", t("18:10"))` → `attachDuplicateReport(t("18:15"))` → `duplicateReports.length === 1`、事件 `DuplicateFaultAttached`、狀態仍 `Open`。
   - `R5 different fault code on same charger is not a duplicate`：這條其實是 port 查詢的行為——用 in-memory repository 測：存 `WO-2208(E42)` 後 `findOpenBy("CP-A12","E17")` 回 `null`。
   - `R5 closed work order does not absorb new reports`：關單後再 `attachDuplicateReport` → 你決定：拋錯或拒絕事件（與 B1 的 stop 一致）。
   測試檔：Node `starter/node/test/assetops/domain/WorkOrder.test.ts`；Python `starter/python/tests/assetops/domain/test_work_order.py`。
4. **（25 分）Repository port + in-memory**：
   - Node：`src/charging/domain/ChargingSessionRepository.ts`（`interface { findById, findActiveByConnector, save }`）、`src/assetops/domain/WorkOrderRepository.ts`（`findById, findOpenBy, save`）；實作 `src/adapters/persistence/InMemoryChargingSessionRepository.ts`、`InMemoryWorkOrderRepository.ts`。
   - Python：`src/charging/domain/repository.py`（`Protocol`）、`src/assetops/domain/repository.py`；實作 `src/adapters/persistence/in_memory.py`。
   - 測試：Node `test/adapters/persistence/InMemoryRepositories.test.ts`；Python `tests/adapters/persistence/test_in_memory.py`：`repository round-trips a session and finds the active one by connector`。
5. **（20 分）** 用 `/aggregate-review` 審**程式碼**（不是 model.md）：兩個聚合的 import 清單、事件的記錄方式、方法大小。修掉它指出的 I/O 洩漏。
6. 全部測試跑一次，輸出最後 20 行貼進 `test-report.md`；補「重構紀錄」。

### 貼給 Claude Code 的提示
```
/tdd R5

Day 4 Block 3。第二個聚合 WorkOrder，守 R5「同樁同故障碼在工單開放期間重複申告，只保留一張根因工單；第二次附加重複申告」。
例子在 workshop/day2/rules.md 的 R5 段。我打算把「查有沒有開放中的工單」放在 Repository port，聚合只負責 attachDuplicateReport。
先問我兩個問題確認這個切法有沒有問題，然後照 /tdd 規則：我先貼紅燈測試，你不寫 src/ 的碼。
這是我的第一個測試：
<貼上>
```
```
/aggregate-review ChargingSession WorkOrder

Day 4 Block 3 尾聲。請直接讀 starter/<lang>/src/charging/domain/ 與 src/assetops/domain/ 的所有檔案，審查：
1. 每個檔案的 import：有沒有任何 I/O、時鐘、bus、HTTP、資料庫、OCPP 字眼？有的話只指出檔名與行號。
2. 每個聚合：不變條件在哪個方法守？事件是不是先記錄後由外部拉取？
3. 兩個 Repository port 的方法簽名是否只用領域型別（不出現 SQL、row、dict）？
4. 挑一個你認為最該重構的方法，只說「為什麼」，不給重構後的碼。
最後給「下一個最小步驟」。
```

### 你自己要做的
- 決定 R5 判斷的分層（聚合 / port / 應用層）。把理由寫進 `model.md` 的「取捨」。
- Port 的方法簽名。想明天的命令處理器會怎麼呼叫它：`StartCharging` 需要 `findActiveByConnector`；`ReportFault` 需要 `findOpenBy`。

### 常見卡點
- **想讓 `WorkOrder.open()` 自己去 repository 查重複** → 那是 I/O。聚合零 I/O；查詢交給 port，決策交給應用層。
- **in-memory repository 存了聚合的參考，測試互相污染** → 每個測試 new 一個 repository；或 `save` 時存快照。
- **`findActiveByConnector` 回傳型別** → `ChargingSession | null`（Python：`Optional[ChargingSession]`）。不要回傳 `undefined` 與 `null` 混用。
- **Python `Protocol` vs `ABC`** → 都可以；starter 用哪個就跟哪個。

### 產出
- `starter/<lang>/src/assetops/domain/**`、`src/adapters/persistence/**` 存在且測試全綠。
- `workshop/day4/test-report.md` 完整：指令、輸出、R1–R5 + R8 前哨的測試名、commit、重構紀錄。
- `workshop/day4/model.md` 補 `WorkOrder`、port 簽名、R5 分層取捨。

---

## Check-out（30 分鐘）

### Quiz（5 題）
1. `ConnectorId` 為什麼是值物件不是實體？兩個 `ConnectorId.of("CP-A12-2")` 相等嗎？
2. `ChargingSession.start()` 在連接器占用時，是拋例外還是記錄 `ChargingStartRejected`？你的選擇對明天的 HTTP API 回應碼有什麼影響？
3. R3：1000 → 7000 → 6500，第三筆之後 `lastMeterWh` 是多少？如果接著 `stop(13400)`，`energyWh` 是多少？
4. 為什麼 R5 的「有沒有開放中工單」不能在 `WorkOrder` 聚合內判斷？那它在哪裡判斷？
5. 聚合的 `pendingEvents()` 被誰拉走？拉走之後聚合要做什麼？

<details>
<summary>參考答案</summary>

1. 它沒有自己的生命週期與身份，只是一個「值」——用值比較、不可變、可以隨意複製。相等（結構相等，不是參考相等）。
2. 依 R1 原文：「發布 `ChargingStartRejected(reason=ConnectorOccupied)`，原會話不變」→ 記錄拒絕事件。API 端可以據此回 `409 Conflict`（同步查 pending events）或 `202 Accepted`（純非同步）；你的選擇要在 `model.md` 寫清楚並在 Day 6 一致。
3. 7000（6500 被拒絕，記錄 `MeterValueRejected`）。`energyWh = 13400 − 1000 = 12400`。
4. 需要查其他工單 = I/O；聚合零 I/O。判斷在應用層（明天的 `ReportFault` 處理器）：先透過 `WorkOrderRepository.findOpenBy(chargerId, faultCode)` 查，有就 `attachDuplicateReport`，沒有就 `WorkOrder.open`。
5. 應用服務（明天）在同一交易內拉走、寫入 Outbox；然後呼叫 `clearEvents()`（或 `pullEvents()` 一次做完），避免重複發布。
</details>

### 交付物自評
- [ ] `npm test` / `pytest` 全綠，輸出貼在 `test-report.md`
- [ ] 測試名 = 規則：R1、R2、R3（×2）、R4（×2）、R5（×3）、R8 前哨，各 ≥ 1
- [ ] `src/charging/domain/`、`src/assetops/domain/` 沒有任何 I/O import、沒有 OCPP 字眼
- [ ] Repository port 在 domain、實作在 `adapters/persistence/`
- [ ] `model.md`：狀態機、方法 / 事件、VO、目錄對照、取捨（授權位置、失敗方式、R5 分層）
- [ ] 每條規則至少一個 commit，commit 在 `workshop/<你的名字>`

### 用 /checkout 讓助教檢查
```
/checkout day4

今天是 Day 4。請對照 docs/rubric.md 的 Day 4 DoD：
1. 跑 starter/<lang> 的測試（指令見 CLAUDE.md），貼摘要。
2. 列出所有測試名，對照 R1–R5 標哪條規則沒有測試。
3. grep src/charging/domain 與 src/assetops/domain 有沒有 I/O import 或 OCPP 字眼（StatusNotification、StartTransaction、MeterValues、idTag 原始格式）。
4. 檢查 workshop/day4/model.md 與 test-report.md 的必要小節。
每項回「過 / 不過 + 一句理由」；不過的給一個問題。最後給「下一個最小步驟」，以及明天 Day 5 開始前我該先讀 docs/references/eda.md 的哪一節。
```

---

## 如果你落後了

最小可行版本（約 3.5 小時）：
- B1 只寫狀態機與方法表，跳過 `/aggregate-review`。
- B2 只做 R1、R2、R4（各一個測試），R3 明天補。
- B3 只做 `WorkOrder.open` + `attachDuplicateReport` 一個測試；Repository port 只寫介面，in-memory 只實作 `ChargingSessionRepository`。
- 卡住超過 20 分鐘就明說，`/tdd` 會指向 `solutions/day4/`；看完關掉自己重打。

## 延伸

- 替 `Energy` 加單位安全：`Energy.wh(12400).kWh === 12.4`，避免 Wh / kWh 混用（§1.6 寫 `12.4 kWh`，§1.8 契約用 `energyWh`）。
- 給 `ChargingSession` 加 `fromEvents(events)` 重建（event sourcing 的第一步），並寫一個測試證明「重播 `ChargingStarted` + 兩筆 `EnergyMetered` + `ChargingCompleted` 得到同樣的狀態」。
- 用 property-based testing（Node：fast-check；Python：hypothesis）驗 R3：任意單調遞增序列全部接受、任一倒退全部拒絕。
