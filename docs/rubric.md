# 評量與交付物 DoD（Rubric）

> 兩個用途：(1) 每天 `/checkout dayN` 對照的 Definition of Done；(2) Day 7 的最終評量，及格線 **80%**。
> 交付物路徑與數量門檻對齊 `docs/days/dayN.md`；兩邊不一致時以本檔為準並回報講師。
> 講師驗收看「講師看這裡」欄；學員自評看清單。

## 讀完你會拿到

- 七天每天交付物的 DoD 檢查清單（可勾）。
- 最終評量的 0–3 分量表與各項權重，以及 80% 怎麼算。
- 自評的方法：`/checkout` 會讀這個檔案。

---

## 1. 評分量表（所有項目共用）

| 分 | 意思 | 判斷 |
|---|---|---|
| 0 | 沒有 | 交付物不存在或空白 |
| 1 | 有，但不對 | 形式有，但違反 curriculum 的名詞 / 事件 / 規則，或明顯是生成的、無法解釋 |
| 2 | 對，但不完整 | 對齊 curriculum，缺少 DoD 的一到兩項 |
| 3 | 完整 | DoD 全部滿足，且能口頭解釋為什麼 |

「能口頭解釋」是 2 與 3 的分水嶺。講師抽問：「這一行 / 這個框 / 這條規則為什麼在那？」

---

## 2. 每日 DoD

### Day 1 · 領域入門、訪談、BPR

**交付物**：`workshop/day1/interviews.md`、`as-is.md`、`to-be.md`

`interviews.md`
- [ ] 五位角色各一節（阿忠、小美、老陳、Vicky、阿豪），每節四小節：一天的工作 / 最痛三件事 / 隱藏事實 / 原話（逐字）。
- [ ] 每位至少 1 條隱藏事實（對照 `stakeholders.md` 的表；學員不看表，講師看）；五位合計 ≥ 5，優秀 ≥ 10。
- [ ] 每位記下 Claude 跳出角色時告知的「沒問到的隱藏事實數」。
- [ ] 跨角色矛盾 ≥ 3 條（例：小美「插槍就算開始」vs 老陳「沒授權不算」）。
- [ ] 「我引導了他嗎」誠實填寫至少一條。
- 講師看這裡：隱藏事實數；有沒有「你需要 X 嗎」的引導式問題；原話有沒有逐字。

`as-is.md`
- [ ] 時間線從 14:02 到 18:10（正常午後 + 故障開頭），每步：誰、工具、耗時。
- [ ] 圈出 ≥ 4 個「人當 API」交接點，每個附代價（等待多久、錯誤率、誰背鍋）與「如果他請假」。
- [ ] 斷線情境（總部連不上時場站怎麼進場、充電、放行）。
- [ ] 增值時間與總時長。
- 講師看這裡：故障流程有沒有「阿忠打電話」與「客服開單」兩個人當 API；斷線情境有沒有寫。

`to-be.md`
- [ ] 同兩條流程，改寫後；每處改動標 P1–P4。
- [ ] 產生的事實清單（過去式）≥ 8 個。
- [ ] 「故意沒有的東西」段落。
- [ ] `/bpr-review` 通過。
- 講師看這裡：To-Be 有沒有偷渡功能需求（「加一個看板」）。

### Day 2 · Event Storming、通用語言、規則

**交付物**：`workshop/day2/storm-board.md`、`glossary.md`、`rules.md`

`storm-board.md`
- [ ] 主線 ≥ 7 個事實、故障支線 ≥ 5 個，全部過去式、無系統動作（「收到 X」「呼叫 Y」不算）。
- [ ] 每個事實有命令 / 執行者；政策 ≥ 3（「每當 X 就 Y」）；拒絕事件至少一個分支。
- [ ] 聚合候選 ≥ 3，各有「守的規則」。
- [ ] 樞紐事件 ≥ 3；hotspots ≥ 4，各對到一位角色。
- [ ] 一張 Mermaid `timeline` 或 `sequenceDiagram`。
- 講師看這裡：假事實；hotspot 是不是真的問題。

`glossary.md`
- [ ] ≥ 12 個詞，每個有「是 / 不是」；包含 curriculum §1.5 的六個與 §1.7 的八個事件。
- [ ] ≥ 3 個「不要用的詞」（例：Transaction、status、Session 裸字）。
- [ ] 至少 2 組用語衝突。
- 講師看這裡：「不是」欄有沒有真的寫；「會話」有沒有被拆成兩個。

`rules.md`
- [ ] ≥ 6 條規則（從 R1–R8 選或從 hotspot 加），每條 DoD 五項：context、命令、成功事件、拒絕事件、數字例子。
- [ ] 每條 ≥ 2 個 scenario（一成功一拒絕）；拒絕場景有 `But` 行；每段有數字或識別碼。
- [ ] R3 的「相等」邊界與 R4 的數字已決定；R6–R8 至少各一個例子。
- [ ] 識別碼與事件名來自 curriculum §1.6 / §1.7 / §1.9。
- [ ] 「待決問題」清單；`/rules-check` 全部「完整」。
- 講師看這裡：R4 的 `energyWh` 有沒有真的算；R5 有沒有分「broker 重送」與「樁再申告」。

### Day 3 · 戰略設計

**交付物**：`workshop/day3/context-map.md`、`c4.md`、`adr/0001-*.md`、`adr/0002-*.md`

`context-map.md`
- [ ] 邊界推導紀錄四小節（語言 / 生命週期 / 一致性 / 團隊），每節 ≥ 2 條證據，引用 Day 1–2 的檔案。
- [ ] context 清單 3–7 個，四欄齊全：語言、不變條件、獨立存活、Core / Supporting / Generic。
- [ ] 每條 R1–R8 標擁有的 context，沒有一條跨兩個。
- [ ] Mermaid context map；每條關係有模式（ACL、Partnership、Customer–Supplier、Conformist 各至少一次）+ 理由 + 反例。
- [ ] 「我推翻過的切法」≥ 1。
- [ ] 「與 curriculum §1.4 的差異與理由」（B2 之後寫）；`/context-map 挑戰` 過一輪。
- 講師看這裡：OCPP → Charging 是不是 ACL；Billing 有沒有被畫成回呼 Charging。

`c4.md`
- [ ] System Context：≥ 4 位角色、1 個系統、≥ 2 個外部系統、每條線有動詞。
- [ ] Container（只畫 MVP1）：HTTP API、OCPP ACL、Charging 核心、AssetOps 工單、Billing 草稿消費者、Outbox + in-process bus、DB、OCPP 模擬器；Parking / Dispatch 虛線 stub；site / HQ 兩個邊界；每個箭頭對到事件名或命令。
- [ ] 每張圖 3–5 行「這張圖想說的事」；「MVP1 不包含」清單。
- 講師看這裡：Context 圖上有沒有 DB（不該有）；Container 圖有沒有兩個邊界。

`adr/0001-*.md`、`adr/0002-*.md`
- [ ] Nygard 格式：日期、狀態 Accepted、脈絡、決定、否決的替代方案、後果、參考。
- [ ] 替代方案 ≥ 2 且不是稻草人（至少一個你能說「它在 X 情況下比較好」）；後果有壞的 ≥ 2。
- [ ] 0001 = context 切法；0002 = MVP1 範圍；`/adr review` 通過。
- 講師看這裡：後果欄有沒有壞處。

### Day 4 · 戰術設計 + TDD

**交付物**：`workshop/day4/model.md`、`test-report.md`、`starter/<lang>/src/charging/**` + `src/assetops/domain/**` 測試全綠

- [ ] `model.md`：狀態機、方法 / 事件表、VO 表、目錄對照、取捨（授權位置、stop 失敗方式、R3 相等）。
- [ ] `npm test` / `pytest` 全綠；R1–R4 的 `it.skip` 全部拿掉；R5 有測試。
- [ ] 測試名 = 規則編號 + 句子（英文）。
- [ ] `ChargingSession`：`idle` / `start`（R1、R2）/ `reportMeter`（R3）/ `stop`（R4）/ `reportFault` / `pullEvents`。
- [ ] `WorkOrder`：`open` / `appendDuplicateReport`（R5）/ `close` / `pullEvents`；`duplicateReportCount`。
- [ ] 值物件有驗證（`parseConnectorId`、`wattHours`、`parseIdTag` 或你的 class）。
- [ ] 業務拒絕是事件（`ChargingStartRejected`、`MeterValueRejected`），呼叫端錯誤才 throw。
- [ ] `src/*/domain` 零 I/O import、無 `new Date()`（有依賴規則測試更好）。
- [ ] `test-report.md`：每條規則一行（測試名、規則、commit hash）；`git log` 看得出紅 / 綠 / 重構。
- [ ] `/aggregate-review ChargingSession` 與 `WorkOrder` 無 High。
- 講師看這裡：`git log` 粒度；隨機抽一行問「為什麼」；`grep -rn "publish\|StatusNotification\|transactionId" src/charging/domain` 應該是空的。

### Day 5 · 應用層與事件驅動

**交付物**：`workshop/day5/event-flow.md`、`src/{charging/application,billing,assetops/application}/**` 測試全綠、`contracts/` 驗證通過

- [ ] `event-flow.md`：處理器表（每個命令載入哪個聚合、寫哪些事件、交易邊界）、消費者表（去重鍵）。
- [ ] `ChargingService` 四個方法；`commit` = save + outbox 同一交易；有測試證明「save 失敗則 Outbox 沒有事件」。
- [ ] 整合事件通過 `node contracts/validate.mjs`（你的程式產生的事件也要能過）；信封八欄位；`occurredAt` 是業務時間；`producer` 是 context 名。
- [ ] `BillingDraftConsumer`：`sessionId` 去重；`bus.redeliver(eventId)` 後草稿仍一張、金額 12400 Wh → 99.2 元。
- [ ] `FaultProcessManager`：R5 `findOpenByFault` → `appendDuplicateReport`；`eventId` 去重；同一則事件重送不增加 `duplicateReportCount`。
- [ ] 至少一個亂序測試（`completed` 先於 `started`）。
- [ ] `billing/` 不 import `charging/domain`；`/event-contract` 無 High。
- 講師看這裡：有沒有祈使句事件名；`grep -rn "StatusNotification\|meterStart\|sampledValue" src/billing src/assetops contracts` 應該是空的。

### Day 6 · MVP 上線

**交付物**：`workshop/day6/README-mvp.md`、`e2e-log.md`、`scripts/e2e` 跑通

- [ ] HTTP：`POST /ocpp/:chargerId`、`GET /sessions/:id`、`GET /work-orders`、`POST /relay`（或背景 relay）、人工放行與關單端點。
- [ ] `scripts/ocpp-sim --url` → `OcppAcl` → 命令；ACL 有純函式測試（含 `connectorId: 0`、R1 回 `Blocked`）。
- [ ] SQLite（或 Postgres）持久化；repo 契約測試（in-memory 與 SQLite 跑同一組）。
- [ ] Outbox relay 在跑；至少一次語意（publish 失敗不標記、下次重試）。
- [ ] `scripts/e2e`：14:02 → 18:18 全綠，輸出貼進 `e2e-log.md`，對照 `docs/diagrams/event-flow.mmd`。
- [ ] 斷線劇本：HQ 停掉，site 仍能 Start / Stop / 人工放行；恢復後補送，Billing 草稿正確。
- [ ] Docker build 過（選配；沒有 Docker 標記「未做」不扣分）。
- [ ] 日誌帶 `eventId` / `correlationId`。
- [ ] `README-mvp.md`：怎麼跑、怎麼驗、已知限制、與 Container 圖的差異。
- [ ] `/ship` 全部通過；**核心（domain / application）在 Day 6 沒有改**——有改的話 README 說明為什麼（不扣分，這是學習訊號）。
- 講師看這裡：斷線劇本；E2E 條數（1–3 條；15 條扣分）。

### Day 7 · SDLC 收尾

**交付物**：`workshop/day7/pr.md`、`retro.md`、`sprint-2-backlog.md`、`takeaway.md`、PR + CI 綠、評量 ≥ 80%

- [ ] `/review` 跑過，High 全修，Medium 有處理或在 PR 註明；至少一個 `refactor(...)` commit 有測試保護。
- [ ] `.github/workflows/ci.yml`（Day 7 自己加）存在且綠。
- [ ] PR 開到指定分支；`pr.md` = PR 描述副本，含：範圍、ADR 連結、契約連結、怎麼驗證、金字塔數字、已知限制、請 reviewer 看哪裡。
- [ ] `retro.md`：Start / Stop / Continue 各 ≥ 2，每個前三項有下一步；「數字」段（commit 數、測試數、卡住次數）。
- [ ] `sprint-2-backlog.md`：≥ 6 項，含 Billing 合併出帳（R7）、Dispatch、Parking 真整合；每項有 context 與驗收條件。
- [ ] `takeaway.md`：5 件事、30 天計畫、給主管的一頁（`/takeaway` 產出後自己改）。
- [ ] 最終評量 ≥ 80%（§3）。
- 講師看這裡：PR 描述能不能五分鐘內導航；retro 有沒有數字。

---

## 3. 最終評量

Day 7 B3 做。講師（或自評）對下表每項打 0–3 分。**總分 = Σ(分 × 權重) / Σ(3 × 權重)，≥ 80% 及格。**

| # | 面向 | 評什麼 | 權重 | 證據 |
|---|---|---|---|---|
| 1 | 領域理解 | 能用通用語言講 14:02 → 18:18；分得清會話 / 狀態 / 故障的多義 | 2 | 口試 + `glossary.md` |
| 2 | 訪談與 BPR | 隱藏事實每位 ≥ 1；人當 API ≥ 4 且量化；To-Be 用四原則 | 2 | Day 1 交付物 |
| 3 | Event Storming | 事實全過去式；hotspot 對到角色；樞紐事件 ≥ 3 | 2 | `storm-board.md` |
| 4 | 規則（GWT） | ≥ 6 條，DoD 五項齊；拒絕是事件；數字算對 | 3 | `rules.md` |
| 5 | 戰略設計 | 邊界有證據；關係模式正確；能反駁「單一 Session」；推翻過一次 | 3 | `context-map.md` + 口試 |
| 6 | C4 + ADR | 兩層圖正確分層；ADR 有壞後果與真替代方案 | 2 | `c4.md`, `adr/` |
| 7 | 戰術設計 | 聚合小、VO 有驗證、拒絕是事件、`pullEvents`、零 I/O | 3 | `src/*/domain` + `/aggregate-review` |
| 8 | TDD 紀律 | `git log` 紅綠重構粒度；測試名 = 規則；能解釋任一行；`test-report.md` | 3 | `git log` + 抽問 |
| 9 | 事件驅動 | Outbox 同交易；兩層冪等；契約過 `validate.mjs`；無 OCPP 名詞外洩 | 3 | `src/*/application`, `contracts/` + `/event-contract` |
| 10 | MVP | E2E 綠；斷線劇本綠；核心未改（或有說明） | 3 | `e2e-log.md` |
| 11 | SDLC | CI 綠；PR 描述可導航；commit 規範 | 2 | PR、`pr.md` |
| 12 | Retro 與帶回公司 | retro 有數字與下一步；帶回清單來自自己的交付物 | 2 | `retro.md`, `takeaway.md` |

Σ 權重 = 30；滿分 90；及格 72。

### 3.1 計算範例

| # | 分 | 權重 | 得分 |
|---|---|---|---|
| 1 | 3 | 2 | 6 |
| 2 | 2 | 2 | 4 |
| 3 | 3 | 2 | 6 |
| 4 | 3 | 3 | 9 |
| 5 | 2 | 3 | 6 |
| 6 | 2 | 2 | 4 |
| 7 | 3 | 3 | 9 |
| 8 | 2 | 3 | 6 |
| 9 | 3 | 3 | 9 |
| 10 | 2 | 3 | 6 |
| 11 | 3 | 2 | 6 |
| 12 | 2 | 2 | 4 |
| | | | **75 / 90 = 83%** ✅ |

### 3.2 一票否決

以下任一成立，不論總分，不及格：

- 聚合或應用服務內有 `bus.publish` / HTTP / DB 呼叫（R8）。
- `src/*/domain` 或 `contracts/` 出現 OCPP 名詞（`StatusNotification`、`transactionId`、`meterStart`、`sampledValue`、`errorCode`）。
- 無法解釋自己交付物中隨機抽到的三處之二。
- 兩個語言都做（代表每個都沒做深）。

### 3.3 口試（15 分鐘，講師或 `/checkout day7`）

1. 講一遍 14:02 → 18:18，只用通用語言。
2. 「為什麼 Parking 和 Charging 不是同一個 context？」
3. 「18:10:08 那次申告，系統做了什麼、沒做什麼？18:12 broker 重送那次呢？哪一行程式碼？」
4. 「save 成功、publish 失敗會怎樣？你的程式碼怎麼處理？」
5. 「回公司第一個月你要做什麼？」

---

## 4. 自評怎麼做

每天 check-out：

```
/checkout day3
```

Claude 會讀本檔案的 Day 3 段落與你的 `workshop/day3/`，逐項勾，輸出表格，列出未達標的最少補救。它**不會**幫你補。

Day 7：

```
/checkout day7
```

它會用 §3 的表打分並算百分比。分數是自評；講師版本以講師為準。差距超過 15% 時，retro 裡寫為什麼。

---

## 自我檢查

1. 2 分與 3 分的分水嶺是什麼？講師怎麼測？
2. Day 4 DoD 裡哪一項可以用 `grep` 一行驗證？
3. 最終評量 80% 對應幾分？權重最高的五個面向是什麼？
4. 一票否決的四條裡，哪一條你最可能不小心踩到？
5. Day 6 DoD 為什麼「核心有改」不扣分？那要做什麼？
