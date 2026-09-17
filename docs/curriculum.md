# EV Charge Ops 工作坊 · 課程總綱（單一事實來源）

> 這份文件是整個 repo 的「憲法」：主控台（`index.html`）、每日教材（`docs/days/`）、
> 參考資料（`docs/references/`）、Claude Code skills（`.claude/skills/`）、起手式程式碼（`starter/`）
> 全部對齊這裡的名詞、事件名、路徑與交付物。改動請先改這裡。

## 0. 一句話

**七天內，讓一位 1–3 年經驗、沒碰過充電樁領域的工程師，用 Claude Code 當助教，
從訪談需求開始，走完 BPR → Event Storming → 戰略 DDD → 戰術 DDD + TDD → Event-Driven → MVP 上線 → SDLC 收尾。**

- 學員：1–3 年工程師（後端為主，前端 / QA 亦可），不需要 EV 領域知識。
- 環境：一台筆電。Node 22+ **或** Python 3.11+；Git；Claude Code。Docker 選配（Day 6 才用得到，沒有也能走完）。
- 講師：Day 1 早上 30–60 分鐘開場；之後每日早上 15 分鐘 kickoff（可用 `docs/days/dayN.md` 的「講師開場」段落）。
- 助教：Claude Code（讀 `CLAUDE.md` + `.claude/skills/`）。學員在主控台按按鈕產生提示，貼給 Claude Code。
- 主控台：`index.html`，單一檔案、無建置、可直接開、可上傳到任何靜態主機（imitator / GitHub Pages / S3）。所有連結指回 https://github.com/clarencechien/dddguide 。

## 1. 領域設定（所有教材共用，不准各自發明）

### 1.1 產品假設
連鎖停車場營運商新上充電樁。每站有：既有停車場系統（LPR 車牌辨識、月票、臨停）、新裝充電樁（OCPP 1.6J / 2.0.1）、值班室。
總部要看全國樁健康度並派工。顧客：臨停車主、月票車主、合約車隊。
**場站在對總部連線中斷時，仍要能進場、充電、人工放行；對帳可事後補。**

### 1.2 兩層地理、三種錢、一條故障生命週期
- 現地 SITE：閘門、車位、樁、槍、值班室。
- 總部 HQ：資產、工單、技術員、備品、SLA。
- 三種錢：停車費、電費、維修成本。
- 故障生命週期：申告 → 開單 → 派工 → 修復驗證 → 恢復可售。

### 1.3 角色（人物誌；`docs/domain/stakeholders.md` 有完整訪談腳本）
| 角色 | 代號 | 在乎的事 |
|---|---|---|
| 場站值班長 | 阿忠 | 閘門、車位占用、客訴、樁顯示異常、人工放行 |
| 充電營運 | 小美 | 費率時段、啟動授權、度數、異常中止 |
| 帳務 | 老陳 | 停車單與充電單合併、發票、對帳、爭議 |
| 總部調度 | Vicky | 哪座樁掛了、誰去修、SLA、備品在不在車上 |
| 技術員 | 阿豪 | 工單上的樁編號、故障碼、可否遠端重啟 |

### 1.4 五個 Bounded Context（Day 3 學員要「自己推導出」接近這個的答案；助教不得在 Day 1–2 先講）
| Context | 說的話 | 一致性不變條件 | 獨立存活 |
|---|---|---|---|
| Parking 場站停車 | 進場、車位、停車會話、放行 | 一輛車同一時間一個進行中停車會話 | 總部掛掉仍能開關閘 |
| Charging 充電會話 | 連接器、授權、計量、中止原因 | 一個連接器同一時間一個進行中會話 | OCPP 在場站；總部只訂閱結果 |
| Billing 計費帳務 | 費率、帳單、發票、爭議 | 帳單開立後金額不可默默改 | 可延遲出帳，不可丟事件 |
| AssetOps 資產維運 | 樁、槍、韌體、健康、工單 | 一座樁同一時間一個進行中根因工單 | 總部主系統；場站只上報 |
| Dispatch 調度派工 | 技術員、路線、SLA、備品預留 | 一張工單同一時間一個主責技術員 | 可離線執行，回報後再對齊 |

**MVP1 範圍（Day 4–6 實作）：Charging（核心域）+ AssetOps 的工單開立（支援域）+ Billing 的草稿帳單（最小消費者）。**
Parking 與 Dispatch 只做事件契約與 stub。

Context Map 關係：
- OCPP → Charging：**防腐層 ACL**。`StatusNotification` 不是通用語言。
- Parking ↔ Charging：**伙伴 + 事件下游**。
- Charging / Parking → Billing：**顧客—供應者**。上游事件是契約，帳務不得回呼凍結會話。
- Charging → AssetOps：**遵奉者**。AssetOps 接受 `ChargerFaulted` 語意。
- AssetOps → Dispatch：內部；不對顧客帳務發「技術員已出發」。

### 1.5 通用語言（節錄；完整見 `docs/domain/glossary.md`）
| 用語 | 英文 | 是 | 不是 |
|---|---|---|---|
| 停車會話 | ParkingSession | 從進場到放行的一次占用契約 | 閘門硬體日誌 |
| 充電會話 | ChargingSession | 從插槍授權到結束計量的一次能量交付 | OCPP Transaction |
| 連接器 | Connector | 一把槍的業務身份 | Modbus 位址 |
| 帳單 | Invoice | 對顧客的求償文件 | MeterValue 陣列 |
| 工單 | WorkOrder | 總部對一根故障的承諾 | 一通值班電話 |
| 故障申告 | ChargerFaulted | 設備已聲明自己無法按契約供電 | App 連不上的客訴 |

### 1.6 範例識別碼（教材、測試、模擬器一律用這組）
- 場站 `SITE-TPE-01`；樁 `CP-A12`；連接器 `CP-A12-2`；車牌 `ABC-1234`
- 停車會話 `P-441`；充電會話 `S-991`；憑證 `TAG-MONTHLY-77`
- 帳單 `INV-778`；工單 `WO-2208`；技術員 `TECH-HAO`
- 度數 `12.4 kWh`；時間軸 14:02 進場 → 14:04 插槍 → 14:31 結束 → 14:33 離場 → 18:10 故障

### 1.7 場站時間線（Event Storming 骨架）
| 時間 | 事實（黃貼） | 誰在乎 | 不該發生的耦合 |
|---|---|---|---|
| T0 | 車輛已辨識進場 VehicleEntered | Parking、占位政策 | 此時就去打總部派工 API |
| T1 | 充電車位已占用 ChargingBayOccupied | Parking、Charging | 占用等同充電已開始 |
| T2 | 連接器已插上 ConnectorPluggedIn | Charging | 插槍等同已授權扣款 |
| T3 | 充電已授權開始 ChargingStarted | Charging、Billing 草稿 | 開始充電時鎖死停車費結算 |
| T4 | 電量已計量 EnergyMetered | Charging、Billing | 每次 MeterValue 都開發票 |
| T5 | 充電已結束 ChargingCompleted | Charging、Billing | 結束時同步呼叫總部工單系統 |
| T6 | 車輛已離場 VehicleExited | Parking、Billing | 離場被未結束充電擋住且無法人工放行 |
| F | 充電器已申告故障 ChargerFaulted | AssetOps、Dispatch | 現場必須先打電話才產生工單 |

### 1.8 整合事件契約 v1（跨 context；經 Outbox；至少一次；消費者冪等）
| 事件 | 發布者 | 訂閱者 | 必要欄位 |
|---|---|---|---|
| `parking.vehicle_entered.v1` | Parking | 占位政策 | plate, siteId, lane, occurredAt |
| `charging.session.started.v1` | Charging | Billing 草稿、Parking | sessionId, connectorId, idTag, startedAt |
| `charging.session.completed.v1` | Charging | Billing | sessionId, connectorId, energyWh, startedAt, endedAt, stopReason |
| `parking.session.closed.v1` | Parking | Billing | parkingSessionId, plate, durationMin, releaseMode |
| `charging.charger.faulted.v1` | Charging | AssetOps | chargerId, connectorId?, faultCode, stillEnergized, occurredAt |
| `ops.work_order.opened.v1` | AssetOps | Dispatch、場站看板 | workOrderId, chargerId, faultCode, openedAt |
| `ops.work_order.closed.v1` | AssetOps | Charging 健康、SLA | workOrderId, chargerId, closedAt, outcome |

信封（envelope）欄位：`eventId`(uuid), `type`, `version`, `occurredAt`, `producer`, `correlationId`, `causationId`, `payload`。
去重鍵：Billing 用 `sessionId`；AssetOps 用 `chargerId + faultCode`（在工單開放期間）。

### 1.9 核心領域規則（Day 2 寫成 Given/When/Then；Day 4 用 TDD 實作）
R1 連接器占用時拒絕第二次 Start；發布 `ChargingStartRejected(reason=ConnectorOccupied)`，原會話不變。
R2 未授權憑證不得開始充電；發布 `ChargingStartRejected(reason=Unauthorized)`。
R3 計量值單調遞增；倒退的 MeterValue 拒絕並記錄 `MeterValueRejected`。
R4 只有 Charging 狀態可 Stop；Stop 產生 `ChargingCompleted(energyWh = 最後計量 − 起始計量)`。
R5 同一樁同一故障碼在工單開放期間重複申告，只保留一張根因工單；第二次附加「重複申告」。
R6 離場放行不依賴總部：連線中斷時值班長可人工放行，發布 `ParkingManuallyReleased`，帳務事後對齊。
R7 帳單開立後金額不可變；更正走 `InvoiceAdjusted` 新事件。
R8 聚合內不得直接發送到 broker；事件先記錄在聚合，交易成功後由 Outbox relay 發布。

## 2. 七天課表

每天結構固定：**Kickoff（15–60 分）→ 三個 Block（各 90 分，含 Claude Code 對話）→ Check-out（quiz + 交付物自評）**。
每天末尾在 `workshop/dayN/` 交出檔案，並 commit 到自己的分支 `workshop/<你的名字>`。

| Day | 主題 | 方法論 | 交付物（`workshop/dayN/`） |
|---|---|---|---|
| 1 | 進場：領域入門、訪談、BPR | 領域入門、利害關係人訪談、As-Is / To-Be、BPR 四原則 | `interviews.md`, `as-is.md`, `to-be.md` |
| 2 | 事件風暴與通用語言 | Event Storming（big picture → process）、Glossary、Example Mapping | `storm-board.md`, `glossary.md`, `rules.md`（≥6 條 GWT） |
| 3 | 戰略設計 | Bounded Context、Context Map、Core/Supporting/Generic、C4、ADR | `context-map.md`, `c4.md`, `adr/0001-*.md`, `adr/0002-*.md` |
| 4 | 戰術設計 + TDD | Aggregate / Entity / VO / Domain Event、不變條件、六角架構、紅綠重構 | `starter/<lang>/src/charging/**` 測試全綠 |
| 5 | 應用層與事件驅動 | Application Service、Outbox、Integration Event、冪等消費者、Process Manager | `starter/<lang>/src/{app,billing,assetops}/**` 測試全綠、`contracts/*.json` |
| 6 | MVP 上線 | HTTP API、OCPP 模擬器 + ACL、持久化（SQLite / Postgres）、Docker、E2E 劇本 | 本機跑通 `scripts/e2e`，`README-mvp.md` |
| 7 | SDLC 收尾 | Code Review、重構、CI、Backlog、Retro、帶回公司 | PR + CI 綠、`retro.md`、`sprint-2-backlog.md`、評量 ≥ 80% |

### 各天 Block 摘要
**Day 1**
- B1 環境：clone、開主控台、跑 starter 測試、確認 Claude Code 讀到 `CLAUDE.md`（`/ta` 回應）。讀 `docs/domain/ev-charging-primer.md`。
- B2 訪談：用 `/interview` 讓 Claude 扮演五位角色，各 10 分鐘。產出 `interviews.md`。
- B3 BPR：從訪談畫 As-Is 顧客旅程，圈「人當 API」的交接；寫 To-Be 四原則。用 `/bpr-review` 檢查。

**Day 2**
- B1 Big-picture Event Storming：只貼「已發生的事實」；用 `/storm` 引導，產出 `storm-board.md`（時間線 + 故障支線 + hotspots）。
- B2 Process-level：加命令、政策、聚合候選、角色；標 pivotal events。
- B3 Example Mapping：把 R1–R8 中至少 6 條寫成 Given/When/Then，每條帶數字例子；用 `/rules-check` 驗收。

**Day 3**
- B1 找邊界：語言衝突 / 生命週期 / 一致性；得出 context 清單（助教只提問不給答案）。
- B2 Context Map：關係模式（ACL、Partnership、Customer-Supplier、Conformist）；用 `/context-map` 產 Mermaid。
- B3 C4 + ADR：System Context / Container 圖；ADR-0001 context 切法；ADR-0002 MVP1 範圍。

**Day 4**
- B1 戰術建模：ChargingSession 聚合、Connector / Energy / IdTag 值物件、領域事件；六角架構目錄。
- B2 TDD：R1 → R2 → R3 → R4 逐條紅綠重構；用 `/tdd` 逼迫先寫測試。
- B3 WorkOrder 聚合 + R5（去重）；Repository port + in-memory adapter。

**Day 5**
- B1 Application Service：`StartCharging` / `StopCharging` / `ReportMeterValue` / `ReportFault` 命令處理器；交易 + Outbox 同寫。
- B2 Integration Event 契約（JSON Schema 於 `contracts/`）；in-memory bus；Billing 草稿消費者（冪等）。
- B3 Process Manager：`ChargerFaulted` → 開工單 → 派工（stub）→ 關單恢復可售；用 `/event-contract` 審查。

**Day 6**
- B1 HTTP API（Node: Fastify / Python: FastAPI）+ OCPP 模擬器 `scripts/ocpp-sim` → ACL 翻譯。
- B2 持久化：SQLite（預設，零安裝）或 Postgres（`docker-compose up`）；Outbox relay。
- B3 Docker 化 + E2E 劇本 `scripts/e2e`（14:02 → 18:18 那條真實午後）；用 `/ship` 檢查上線清單。

**Day 7**
- B1 用 `/review` 做 code review，重構一輪；補漏測。
- B2 GitHub Actions CI；開 PR；PR 描述附 ADR 與事件契約連結。
- B3 Retro + Sprint 2 backlog（Billing 合併出帳、Dispatch、Parking 真整合）；主控台最終評量；`/takeaway` 產出「帶回公司清單」。

## 3. Claude Code skills（`.claude/skills/<name>/SKILL.md`）
| 指令 | 用途 | 出場 |
|---|---|---|
| `/ta` | 助教總入口：讀進度、指路、蘇格拉底式提問、不直接給答案（除非學員說「卡住 20 分鐘」） | 全程 |
| `/interview` | 扮演五位利害關係人（一次一位），有隱藏事實要學員問出來 | Day 1 |
| `/bpr-review` | 檢查 As-Is / To-Be：是否圈出人當 API、四原則是否成立 | Day 1 |
| `/storm` | Event Storming 引導；輸出 markdown board + Mermaid timeline；糾正「系統動作當事實」 | Day 2 |
| `/rules-check` | 驗收 GWT 規則：有無 context、命令、成功事件、拒絕事件、數字例子 | Day 2 |
| `/context-map` | 從 storm 推導 BC；產 Mermaid context map；挑戰邊界理由 | Day 3 |
| `/c4` | 產 C4 Context / Container Mermaid | Day 3 |
| `/adr` | 建 ADR 範本並審查 | Day 3、7 |
| `/tdd` | 紅綠重構教練：拒絕在沒有紅燈時寫產品碼；一次一條規則 | Day 4–5 |
| `/aggregate-review` | 審查聚合：不變條件、大小、事件、不得碰 I/O | Day 4 |
| `/event-contract` | 審查整合事件：命名、版本、信封、去重鍵、Outbox | Day 5 |
| `/ship` | MVP 上線清單：API、持久化、Docker、E2E、日誌 | Day 6 |
| `/review` | Code review（DDD / 六角 / 測試品質） | Day 7 |
| `/retro` | Retro + Sprint 2 backlog | Day 7 |
| `/takeaway` | 產出「帶回公司」清單與 30 天行動計畫 | Day 7 |
| `/checkout` | 每日 check-out：對照交付物清單自評，給下一步 | 每天 |

## 4. Repo 版面
```
dddguide/
├── index.html                 主控台（單檔，可搬到任何靜態主機）
├── README.md                  入口：怎麼開始、七天地圖、連結
├── CLAUDE.md                  Claude Code 助教守則
├── docs/
│   ├── curriculum.md          本文件
│   ├── 00-orientation.md      學員第一天怎麼用 repo + 主控台 + Claude Code
│   ├── instructor.md          講師 / 帶課者手冊
│   ├── rubric.md              評量與交付物 DoD
│   ├── domain/                ev-charging-primer.md, glossary.md, stakeholders.md, ocpp-primer.md
│   ├── references/            bpr, event-storming, ddd-strategic, ddd-tactical, hexagonal, eda, tdd, c4, adr, sdlc, reading-list
│   ├── days/day1.md … day7.md
│   └── diagrams/              Mermaid 原始碼（context-map, c4, event-flow, hexagonal, fault-saga）
├── .claude/skills/<name>/SKILL.md
├── starter/
│   ├── node/                  TypeScript + vitest；六角目錄骨架 + 第一個紅燈
│   └── python/                pytest；同構骨架
├── solutions/                 參考解（Day 4–6），README 說明「卡住 20 分鐘再看」
├── contracts/                 整合事件 JSON Schema v1 + 範例
├── scripts/                   ocpp-sim、e2e 劇本
├── workshop/                  學員交付物（dayN/），含 .gitkeep 與範本
└── docker-compose.yml         Postgres（選配）
```

## 5. 寫作規範
- 繁體中文為主，術語附英文（第一次出現）。對象是工程師，不是主管：多程式碼、少口號。
- 每份教材開頭：「今天結束你會拿到」；結尾：「check-out 問題」。
- 助教原則：先問後答；學員自述卡住 ≥ 20 分鐘才給參考解；每次回覆末尾指出「下一個最小步驟」。
- 所有範例一律用 §1.6 的識別碼與 §1.8 的事件名。
