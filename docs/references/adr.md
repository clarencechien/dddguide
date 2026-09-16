# 架構決策紀錄（Architecture Decision Records, ADR）

> Day 3 B3 產 ADR-0001 與 ADR-0002；Day 7 補實作決策。交付物：`workshop/day3/adr/0001-*.md`、`0002-*.md`。用 `/adr new <題目>` 建範本、`/adr review 0001` 審查。

## 讀完你會拿到

- Michael Nygard 的 ADR 格式，以及每一節「寫什麼、不寫什麼」。
- 兩份填好的範例：ADR-0001 五個 Bounded Context、ADR-0002 MVP1 範圍。
- 什麼決定值得一份 ADR、什麼不值得。

---

## 1. 為什麼存在

Nygard 在 2011 年的部落格文章裡講了一個所有人都遇過的場景：新人問「為什麼這裡要這樣做？」，答案是「不知道，一直都這樣」。然後有人把它改掉，三個月後踩到當初那個決定要避開的坑。

ADR 是**一份一頁的文件，記錄一個決定、當時的脈絡、以及後果**。它不是設計文件（那太長），不是 wiki（那會過期），是一份**不可變的紀錄**：決定改了就寫新的一份，舊的標 superseded。

對我們：Day 3 你會做兩個很難逆轉的決定（怎麼切 context、MVP1 做什麼）。Day 7 的 PR 描述要連到它們。三個月後你帶回公司時，這兩份是你講給主管聽的範本。

---

## 2. 格式（Nygard 原版 + 一節「否決的替代方案」）

```markdown
# ADR-NNNN: <決定的一句話，用祈使句或名詞>

日期：YYYY-MM-DD
狀態：Proposed | Accepted | Deprecated | Superseded by ADR-NNNN

## 脈絡（Context）
我們面對什麼問題？有哪些力量在拉扯（業務、技術、時間、人）？
只寫事實，不寫立場。

## 決定（Decision）
我們決定……。主詞是「我們」，動詞是現在式。一段就好。

## 否決的替代方案（Alternatives considered）
- 方案 B：一句話 + 為什麼不選。
- 方案 C：同上。

## 後果（Consequences）
決定之後，什麼變好、什麼變難、什麼要注意。**好的與壞的都寫**。
這一節是 ADR 最有價值的部分。

## 參考
連結到 curriculum、storm board、context map、相關 ADR。
```

每一節的紀律：

| 節 | 寫 | 不寫 |
|---|---|---|
| 脈絡 | 訪談發現、規則、耦合、限制（一台筆電、7 天） | 「我們覺得應該…」 |
| 決定 | 一個決定 | 三個決定（拆成三份） |
| 替代方案 | 你真的考慮過的 | 稻草人 |
| 後果 | 「Billing 必須自己維護顧客概念」這種具體代價 | 「更乾淨」「更好維護」 |

檔名：`NNNN-<kebab-case-title>.md`，四位數編號，永不重用。

---

## 3. ADR-0001 範例

```markdown
# ADR-0001: 以五個 Bounded Context 切分 EV Charge Ops

日期：2026-09-18
狀態：Accepted

## 脈絡

連鎖停車場營運商在既有停車場（LPR、閘門、月票）新裝 OCPP 充電樁；總部要看全國樁健康度並派工。
Day 1 訪談與 Day 2 Event Storming 發現：

- 「會話」在值班長（進場到放行）與充電營運（插槍到結束計量）口中是不同的東西，生命週期不同：
  P-441（14:02–14:33）可包含零到多個 S-991（14:04–14:31）。
- 「狀態」有四個狀態機：OCPP 連接器、充電會話、樁健康、帳單。
- 帳務要求「可以晚、不能漏」；充電要求「連接器一次一個會話」必須立即保證。
- 場站必須在總部斷線時仍能進場、充電、人工放行（產品假設）。
- 總部調度要「一根樁一個故障碼一張根因工單」；技術員要離線回報。
- 樞紐事件：ChargingStarted、ChargingCompleted、ChargerFaulted。

## 決定

我們把系統切成五個 Bounded Context，各自擁有一套語言、一組不變條件、一個獨立存活條件：

| Context | 不變條件 | 獨立存活 |
|---|---|---|
| Parking | 一輛車同時一個進行中停車會話 | 總部掛掉仍能開關閘 |
| Charging | 一個連接器同時一個進行中會話 | OCPP 在場站；總部只訂閱結果 |
| Billing | 帳單開立後金額不可默默改 | 可延遲出帳，不可丟事件 |
| AssetOps | 一座樁同時一個進行中根因工單 | 總部主系統；場站只上報 |
| Dispatch | 一張工單同時一個主責技術員 | 可離線執行，回報後再對齊 |

Context 間關係：OCPP → Charging 用防腐層；Parking ↔ Charging 伙伴 + 事件；
Charging / Parking → Billing 顧客—供應者（帳務不得回呼凍結會話）；
Charging → AssetOps 遵奉者；AssetOps → Dispatch 內部。整合一律經整合事件 v1 + Outbox。

## 否決的替代方案

- **單一「Session」context 涵蓋停車與充電**：生命週期不同（一對多）、語言衝突（會話、狀態），
  且會讓人工放行被未結束的充電會話擋住（curriculum §1.7 T6 耦合）。否決。
- **把 AssetOps 與 Dispatch 合成一個「Ops」context**：MVP1 可行，但技術員離線回報與
  備品預留的一致性節奏（回報後才對齊）與工單的即時去重（R5）不同；且 Conway：調度與
  資產管理在總部是兩組人。保留為兩個，MVP1 Dispatch 只做 stub。
- **Billing 併入 Charging（Stop 時直接算錢）**：違反「帳務不得回呼凍結會話」與可用性隔離；
  且 Billing 需要「顧客」概念（車隊 / 月票），Charging 沒有。否決。
- **不做 ACL，直接用 OCPP 名詞**：升 2.0.1 時 StartTransaction 消失，聚合要改；
  StatusNotification 不是任何利害關係人的語言。否決。

## 後果

好：
- 每條規則 R1–R8 有唯一擁有者（R1–R4 Charging、R5 AssetOps、R6 Parking、R7 Billing、R8 全部）。
- 場站節點可以只部署 Parking stub + Charging，斷線時完整運作。
- OCPP 版本升級只影響 `charging/acl/`。

壞 / 要注意：
- Billing 必須自己維護「顧客」與「合併」邏輯，上游不提供；MVP1 只做草稿。
- R1「連接器是否占用」跨越多個 ChargingSession 聚合，需 repository 查詢 + 儲存層唯一約束。
- 五個 context 的整合事件契約要在 Day 5 前定版，否則 Billing / AssetOps 無法平行開發。
- 場站看板要保存工單副本（訂閱 ops.work_order.opened.v1），增加場站的狀態。

## 參考
- docs/curriculum.md §1.4、§1.7
- workshop/day2/storm-board.md（樞紐事件）
- workshop/day3/context-map.md
- docs/references/ddd-strategic.md §4（四條線索）
```

---

## 4. ADR-0002 範例

```markdown
# ADR-0002: MVP1 範圍 = Charging + AssetOps 工單開立 + Billing 草稿帳單

日期：2026-09-18
狀態：Accepted

## 脈絡

工作坊 Day 4–6 共三天、一台筆電、Node 或 Python、Docker 選配。
ADR-0001 定了五個 context；不可能三天做完五個。
Day 6 要跑通 scripts/e2e 的「14:02 → 18:18」劇本：正常充電一次 + 一次故障開單派工。
Charging 是核心子領域；AssetOps 的工單開立是故障流程的第一個自動化點（As-Is 的人當 API #1、#2）；
Billing 是 Charging 事件的第一個消費者，能證明 Outbox + 冪等真的成立。
Parking 是既有系統；Dispatch 的路線與備品在三天內做不出有意義的版本。

## 決定

MVP1 實作：
1. **Charging（完整）**：ChargingSession 聚合（R1–R4）、StartCharging / StopCharging / ReportMeterValue /
   ReportFault 命令、OCPP ACL、SQLite 持久化、Outbox relay、HTTP API。
2. **AssetOps（工單開立與關閉）**：WorkOrder 聚合（R5）、FaultToWorkOrder Process Manager、
   ops.work_order.opened / closed.v1、關單 HTTP 端點。
3. **Billing（草稿帳單，最小消費者）**：訂閱 charging.session.started / completed.v1，
   以 sessionId 去重，計算單一費率草稿金額；不開立正式帳單、不做 R7、不合併停車費。

MVP1 只做契約與 stub：
- **Parking**：parking.vehicle_entered.v1 / parking.session.closed.v1 的 JSON Schema 與範例；
  ReleaseVehicleManually 端點只發事件（R6 的事件契約成立，不做停車會話聚合）。
- **Dispatch**：訂閱 ops.work_order.opened.v1，固定指派 TECH-HAO；不排路線、不預留備品。

## 否決的替代方案

- **五個 context 都做「薄薄一層」**：每個都做不深，R1–R5 的 TDD 練習會被壓縮；E2E 劇本會有
  五個地方可能壞。否決。
- **只做 Charging**：沒有消費者就無法證明 Outbox / 冪等 / 契約；故障流程（工作坊的 BPR 主軸）
  完全沒有落地。否決。
- **做 Charging + Billing 完整出帳（含 R7、合併）**：Billing 需要顧客、費率表、停車事件，
  三者 MVP1 都沒有；且 R7 的價值在稽核，不在 E2E 劇本。移到 Sprint 2。
- **做真 broker（Kafka / RabbitMQ）**：一台筆電、Docker 選配；in-memory bus 足以證明模式，
  切換只影響 EventBus adapter。移到 Sprint 2。

## 後果

好：
- E2E 劇本每一步都有真程式碼：進場（stub 事件）→ 充電（真）→ 故障（真）→ 開單（真）→ 派工（stub）。
- Outbox、冪等、Process Manager 三個模式各有一個真實消費者驗證。
- Day 7 的 Sprint 2 backlog 有明確起點：Billing 合併出帳（R7）、Dispatch 路線與備品、Parking 真整合。

壞 / 要注意：
- 草稿帳單金額用單一費率（尖峰 8 元/kWh），跨時段計價（小美隱藏事實 1）留 backlog；
  契約已含 startedAt / endedAt，未來不需升版。
- Parking stub 不保證「一輛車一個進行中停車會話」；E2E 劇本不得依賴它。
- Dispatch stub 的「指派」不是真派工；ops.work_order.opened.v1 的訂閱者名單在 Sprint 2 會變。
- 沒有 broker 表示 site 與 HQ 節點 MVP1 實際在同一程序；C4 Container 圖仍畫成兩個邊界，
  README-mvp.md 要註明。

## 參考
- ADR-0001
- docs/curriculum.md §1.4（MVP1 範圍）、§1.8（契約）
- workshop/day3/c4.md（Container 圖）
- docs/diagrams/event-flow.mmd（E2E 劇本）
```

---

## 5. 什麼值得寫 ADR

| 值得 | 不值得 |
|---|---|
| context 切法（0001） | 用哪個 lint 規則 |
| MVP 範圍（0002） | 變數命名慣例（放 CLAUDE.md） |
| Day 4：R1 的擺法（聚合內 vs 應用層 + repo 查詢） | 測試檔案怎麼分目錄 |
| Day 5：拒絕用事件不用例外；in-memory bus 而非 broker | 用 vitest 還是 jest（除非有人反對） |
| Day 6：SQLite 預設、Postgres 選配；Outbox relay 同程序 | Fastify 的 plugin 順序 |
| Day 7：`DuplicateFaultReported` 是否要對外成為整合事件（R5 留下的問題卡） | 重構時改的類別名 |

判斷法：**這個決定如果改，會不會有人要改超過一個目錄的程式碼、或要重新跟利害關係人談？** 會 → ADR。

Day 7 結束時，一個合格的 `workshop/day3/adr/`（Day 4–7 可以繼續加進同一個目錄）至少有 0001、0002，通常有 4–6 份。

---

## 6. `/adr` 怎麼用

- `/adr new 在應用層而非聚合內保證 R1` → 產出帶編號的範本，脈絡欄預填你的 rules.md 與 context map 的相關段落。
- `/adr review 0001` → 檢查：脈絡有沒有立場、決定是不是一個、替代方案是不是稻草人、後果有沒有壞的、狀態欄有沒有填。
- 它不會替你做決定。「你覺得該切幾個」得到的回答會是「你的樞紐事件有幾個？」

---

## 7. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| 脈絡寫成「我們想要一個乾淨的架構」 | 寫事實：「會話在兩位角色口中意思不同」 |
| 後果只寫好處 | 每份 ADR 至少兩條壞處 |
| 替代方案是「不做」 | 寫你真的考慮過的另一種切法 |
| 一份 ADR 三個決定 | 拆 |
| 決定改了就改舊 ADR | 寫新的，舊的標 Superseded by |
| 用 ADR 記錄「怎麼做」的步驟 | 那是 README / runbook |
| 沒有日期與狀態 | 補 |

---

## 8. 延伸閱讀

- Michael Nygard, "Documenting Architecture Decisions", 2011（cognitect.com 部落格）。—— 原文，一頁。
- Michael Nygard, *Release It!*（2nd ed.），2018。—— 不是講 ADR，但第 II 部分的穩定性模式是「後果」欄的好素材。
- adr.github.io —— ADR 工具與範本集，含 MADR 格式（比 Nygard 多幾節，看你喜好）。
- Joel Parker Henderson, "Architecture decision record (ADR)" GitHub repo。—— 各種格式與範例。
- Mark Richards & Neal Ford, *Fundamentals of Software Architecture*, 2020, 第 19 章 "Architecture Decisions"。—— ADR 在團隊裡怎麼流動。
- Gregor Hohpe, "Architecture Decisions: Demystifying Architecture", IEEE Software, 2007 與 *The Software Architect Elevator*, 2020。—— 「決策」才是架構師的產出。

---

## 自我檢查

1. ADR 的「脈絡」與「決定」各自的紀律是什麼？「我們想要乾淨的架構」錯在哪？
2. ADR-0001 否決了「單一 Session context」，理由是哪兩條找邊界的線索？
3. ADR-0002 的「壞後果」裡，哪一條會在 Sprint 2 第一個被處理？為什麼契約不需要升版？
4. 「R1 放在聚合內還是應用層」值不值得一份 ADR？用第 5 節的判斷法回答。
5. 決定改了應該怎麼處理舊的 ADR？
