# 評量與交付物 DoD（Rubric）

> 兩個用途：(1) 每天 `/checkout dayN` 對照的 Definition of Done；(2) Day 7 的最終評量，及格線 **80%**。
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
- [ ] 五位角色各一節（阿忠、小美、老陳、Vicky、阿豪），用 `stakeholders.md` §7 的範本。
- [ ] 每位至少 2 條**事實**（過去式）、1 條**規則**、1 條**交接**。
- [ ] 挖出的隱藏事實 ≥ 10 條（對照 `stakeholders.md` 隱藏事實表；學員不看表，講師看）。
- [ ] 「我引導了他嗎」段落誠實填寫，至少一條。
- 講師看這裡：隱藏事實數；有沒有「你需要 X 嗎」的引導式問題。

`as-is.md`
- [ ] 兩條流程：正常午後（14:02 → 14:33）、故障（18:10 →）。
- [ ] 每步有：誰、工具、耗時、人當 API（是 / 否）。
- [ ] 圈出 ≥ 3 個人當 API，各附「如果他請假」。
- [ ] 增值時間與總時長。
- 講師看這裡：故障流程有沒有「阿忠打電話」與「客服開單」兩個人當 API。

`to-be.md`
- [ ] 同兩條流程。
- [ ] 每處改動標 P1–P4。
- [ ] 產生的事實清單（過去式）≥ 8 個。
- [ ] 「故意沒有的東西」段落。
- [ ] `/bpr-review` 通過。
- 講師看這裡：To-Be 有沒有偷渡功能需求（「加一個看板」）。

### Day 2 · Event Storming、通用語言、規則

**交付物**：`workshop/day2/storm-board.md`、`glossary.md`、`rules.md`

`storm-board.md`
- [ ] 事件池 ≥ 15 個 `[E]`，全部過去式，主詞是領域的東西。
- [ ] 主線 T0–T6 + 故障支線 F + 至少一個拒絕分支。
- [ ] 熱點 ≥ 5，各對到一位角色。
- [ ] 樞紐事件 ≥ 3。
- [ ] Process level：≥ 4 個事件補完角色 / 命令 / 聚合候選 / 政策。
- [ ] 一張 Mermaid `timeline` 或 `sequenceDiagram`。
- 講師看這裡：有沒有「收到 X」「呼叫 Y」這類假事實；熱點是不是真的問題。

`glossary.md`
- [ ] ≥ 20 個詞，欄位：中文、英文、是、不是、擁有者（Day 3 前可空）。
- [ ] 包含 curriculum §1.5 的六個與 §1.7 的八個事件。
- [ ] 至少 2 組「用語衝突」。
- 講師看這裡：「不是」欄有沒有真的寫；「會話」有沒有被拆成兩個。

`rules.md`
- [ ] ≥ 6 條規則（從 R1–R8 選或從熱點加），每條 DoD 五項：context、命令、成功事件、拒絕事件、數字例子。
- [ ] 每條 ≥ 2 個 scenario；拒絕場景有 `But` 行。
- [ ] 識別碼與事件名來自 curriculum §1.6 / §1.7 / §1.9。
- [ ] 問題卡區塊。
- [ ] `/rules-check` 全部 ✅ 或 ⚠️（無 ❌）。
- 講師看這裡：R4 的 `energyWh` 有沒有真的算（117600 − 105200）；R5 有沒有分「broker 重送」與「樁再申告」。

### Day 3 · 戰略設計

**交付物**：`workshop/day3/context-map.md`、`c4.md`、`adr/0001-*.md`、`adr/0002-*.md`

`context-map.md`
- [ ] context 清單（4–6 個皆可），每個：語言、不變條件、獨立存活條件。
- [ ] 每條 R1–R8 標擁有的 context，沒有一條跨兩個。
- [ ] Mermaid context map，每條線標關係模式（至少用到 ACL、Customer–Supplier、Conformist 三種）。
- [ ] 每個邊界附一條「找邊界的線索」（語言 / 生命週期 / 一致性 / 團隊）。
- [ ] 一段「與 curriculum §1.4 的差異與理由」（Day 3 B2 之後寫）。
- [ ] `/context-map 挑戰` 過一輪。
- 講師看這裡：OCPP → Charging 是不是 ACL；Billing 有沒有被畫成回呼 Charging。

`c4.md`
- [ ] System Context：≥ 4 位角色、1 個系統、≥ 2 個外部系統、每條線有動詞。
- [ ] Container：site / HQ 兩個邊界、技術欄、Outbox relay 與 bus、DB 分開。
- [ ] 每張圖 3–5 行「這張圖想說的事」。
- [ ] 「MVP1 不包含」清單。
- 講師看這裡：Context 圖上有沒有 DB（不該有）；Container 圖有沒有兩個邊界。

`adr/0001-*.md`、`adr/0002-*.md`
- [ ] Nygard 格式：日期、狀態、脈絡、決定、否決的替代方案、後果、參考。
- [ ] 脈絡只有事實；決定只有一個；替代方案 ≥ 2 且不是稻草人；後果有壞的 ≥ 2。
- [ ] 0001 = context 切法；0002 = MVP1 範圍。
- [ ] `/adr review` 通過。
- 講師看這裡：後果欄有沒有壞處。

### Day 4 · 戰術設計 + TDD

**交付物**：`starter/<lang>/src/charging/**`、`src/assetops/domain/**` 測試全綠

- [ ] `npm test` / `pytest` 全綠；R1–R5 每個 `rules.md` 的 scenario 至少一個測試。
- [ ] 測試名 = 規則編號 + scenario 名。
- [ ] `ChargingSession` 聚合：`start` 工廠、`reportMeter`（R3）、`stop`（R4）、`pullEvents`。
- [ ] `Connector`、`Energy`、`IdTag` 值物件，不可變、有驗證。
- [ ] `WorkOrder` 聚合：`open`、`attachDuplicateReport`（R5）、`pullEvents`。
- [ ] Repository port + in-memory adapter；`findActiveByConnector`、`findOpenByChargerAndFault`。
- [ ] 拒絕是事件（`ChargingStartRejected`、`MeterValueRejected`），不是例外。
- [ ] domain 目錄零 I/O import（有依賴規則測試更好）。
- [ ] 每個綠燈一個 commit（`git log` 看得出紅 / 綠 / 重構）。
- [ ] `/aggregate-review ChargingSession` 與 `WorkOrder` 無 High。
- 講師看這裡：`git log` 的粒度；隨機抽一行問「為什麼」；`grep -r publish src/charging/domain` 應該是空的。

### Day 5 · 應用層與事件驅動

**交付物**：`src/{app,billing,assetops}/**` 測試全綠、`contracts/*.json`

- [ ] 四個命令處理器：`StartCharging`、`StopCharging`、`ReportMeterValue`、`ReportFault`；聚合 + Outbox 同一交易（UnitOfWork）。
- [ ] 有測試證明「save 失敗則 Outbox 沒有事件」。
- [ ] `contracts/` 至少 5 個 JSON Schema + example（started、completed、faulted、opened、closed），欄位對齊 curriculum §1.8，`additionalProperties: true`。
- [ ] 信封八欄位；`occurredAt` 是業務時間。
- [ ] Billing 草稿消費者：`sessionId` 去重；「同一則 completed 送兩次」測試；金額 12400 Wh → 99.2 元（單一費率）。
- [ ] `FaultToWorkOrder` Process Manager：R5 去重 `chargerId + faultCode`；`eventId` 傳輸層去重；`processed.add` 在同一交易。
- [ ] in-memory bus；至少一個「亂序」測試（completed 先於 started）。
- [ ] Billing 目錄不 import `charging/domain`。
- [ ] `/event-contract` 無 High。
- 講師看這裡：有沒有祈使句事件名；`grep -r "StatusNotification" contracts src/app src/billing` 應該是空的。

### Day 6 · MVP 上線

**交付物**：`scripts/e2e` 跑通、`workshop/day6/README-mvp.md`

- [ ] HTTP API 可打：start / stop / meter（或由 OCPP 端點取代）、fault、work order 查詢、close、draft invoice 查詢。
- [ ] `scripts/ocpp-sim` → OCPP 端點 → ACL → 命令；ACL 有純函式測試（含 `connectorId: 0`）。
- [ ] SQLite（或 Postgres）持久化；repo 契約測試（in-memory 與 SQLite 跑同一組）。
- [ ] Outbox relay 在跑；至少一次語意（relay 重試）。
- [ ] `scripts/e2e`：14:02 → 18:18 全綠，輸出對照 `docs/diagrams/event-flow.mmd`。
- [ ] 斷線劇本：HQ 停掉，site 仍能 Start / Stop；恢復後補送，Billing 草稿正確。
- [ ] Docker build 過（選配；沒有 Docker 標記「未做」不扣分）。
- [ ] 日誌帶 `eventId` / `correlationId`。
- [ ] `README-mvp.md`：怎麼跑、怎麼驗、已知限制、與 Container 圖的差異。
- [ ] `/ship` 全部通過。
- [ ] **核心（domain / app）在 Day 6 沒有改**——有改的話 README 說明為什麼（不扣分，這是學習訊號）。
- 講師看這裡：斷線劇本；E2E 條數（1–3 條；15 條扣分）。

### Day 7 · SDLC 收尾

**交付物**：PR + CI 綠、`workshop/day7/retro.md`、`sprint-2-backlog.md`、評量 ≥ 80%

- [ ] `/review` 跑過，High 全修，Medium 有處理或在 PR 註明。
- [ ] 重構一輪，至少一個 `refactor(...)` commit 有測試保護。
- [ ] `.github/workflows/ci.yml` 存在且綠。
- [ ] PR 開到指定分支，描述含：範圍、ADR 連結、契約連結、怎麼驗證、金字塔數字、已知限制、請 reviewer 看哪裡。
- [ ] `retro.md`：Start / Stop / Continue 各 ≥ 2，每個前三項有下一步；「數字」段。
- [ ] `sprint-2-backlog.md`：≥ 6 項，含 Billing 合併出帳（R7）、Dispatch、Parking 真整合；每項有 context 與驗收條件。
- [ ] `/takeaway` 產出：5 件事、30 天計畫、給主管的一頁。
- [ ] 最終評量 ≥ 80%（§3）。
- 講師看這裡：PR 描述能不能五分鐘內導航；retro 有沒有數字。

---

## 3. 最終評量

Day 7 B3 做。講師（或自評）對下表每項打 0–3 分。**總分 = Σ(分 × 權重) / Σ(3 × 權重)，≥ 80% 及格。**

| # | 面向 | 評什麼 | 權重 | 證據 |
|---|---|---|---|---|
| 1 | 領域理解 | 能用通用語言講 14:02 → 18:18；分得清會話 / 狀態 / 故障的多義 | 2 | 口試 + `glossary.md` |
| 2 | 訪談與 BPR | 隱藏事實 ≥ 10；人當 API ≥ 3 且量化；To-Be 用四原則 | 2 | Day 1 交付物 |
| 3 | Event Storming | 事件全過去式；熱點對到角色；樞紐事件 ≥ 3 | 2 | `storm-board.md` |
| 4 | 規則（GWT） | ≥ 6 條，DoD 五項齊；拒絕是事件；數字算對 | 3 | `rules.md` |
| 5 | 戰略設計 | 邊界有線索；關係模式正確（ACL / C–S / Conformist）；能反駁「單一 Session」 | 3 | `context-map.md` + 口試 |
| 6 | C4 + ADR | 兩層圖正確分層；ADR 有壞後果 | 2 | `c4.md`, `adr/` |
| 7 | 戰術設計 | 聚合小、VO 不可變、拒絕是事件、`pullEvents`、零 I/O | 3 | `src/*/domain` + `/aggregate-review` |
| 8 | TDD 紀律 | `git log` 紅綠重構粒度；測試名 = 規則；能解釋任一行 | 3 | `git log` + 抽問 |
| 9 | 事件驅動 | Outbox 同交易；兩層冪等；契約對齊 §1.8；無 OCPP 名詞外洩 | 3 | `src/app`, `contracts/` + `/event-contract` |
| 10 | MVP | E2E 綠；斷線劇本綠；核心未改（或有說明） | 3 | `scripts/e2e` 輸出 |
| 11 | SDLC | CI 綠；PR 描述可導航；commit 規範 | 2 | PR |
| 12 | Retro 與帶回公司 | retro 有數字與下一步；帶回清單來自自己的交付物 | 2 | `retro.md`, `/takeaway` 輸出 |

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

- 聚合內有 broker / HTTP / DB 呼叫（R8）。
- `src/*/domain` 或 `contracts/` 出現 OCPP 名詞（`StatusNotification`、`transactionId`、`sampledValue`）。
- 無法解釋自己交付物中隨機抽到的三處之二。
- 兩個語言都做（代表每個都沒做深）。

### 3.3 口試（15 分鐘，講師或 `/checkout day7`）

1. 講一遍 14:02 → 18:18，只用通用語言。
2. 「為什麼 Parking 和 Charging 不是同一個 context？」
3. 「18:15 那次申告，系統做了什麼、沒做什麼？哪一行程式碼？」
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
3. 最終評量 80% 對應幾分？權重最高的四個面向是什麼？
4. 一票否決的四條裡，哪一條你最可能不小心踩到？
5. Day 6 DoD 為什麼「核心有改」不扣分？那要做什麼？
