# docs/days/ — 七天教材總覽

每一天一份 `dayN.md`。學員照著走；講師早上用其中的「講師開場」段落；Claude Code 助教（`CLAUDE.md`）讀它來知道今天的 Block 與產出。
所有名詞、事件名、識別碼、規則編號都以 `docs/curriculum.md` 為準。

## 七天地圖

| Day | 主題 | 方法論 | 你會用到的 skills | 交付物（`workshop/dayN/`） |
|---|---|---|---|---|
| [1](day1.md) | 進場：領域入門、訪談、BPR | 領域入門、利害關係人訪談、As-Is / To-Be、BPR 四原則 | `/ta` `/interview` `/bpr-review` `/checkout` | `interviews.md`, `as-is.md`, `to-be.md` |
| [2](day2.md) | 事件風暴與通用語言 | Event Storming（big picture → process）、Glossary、Example Mapping | `/storm` `/rules-check` | `storm-board.md`, `glossary.md`, `rules.md`（≥6 條 GWT） |
| [3](day3.md) | 戰略設計 | Bounded Context、Context Map、Core/Supporting/Generic、C4、ADR | `/context-map` `/c4` `/adr` | `context-map.md`, `c4.md`, `adr/0001-*.md`, `adr/0002-*.md` |
| [4](day4.md) | 戰術設計 + TDD | Aggregate / Entity / VO / Domain Event、不變條件、六角架構、紅綠重構 | `/tdd` `/aggregate-review` | `starter/<lang>/src/charging/**` 測試全綠 + `model.md`, `test-report.md` |
| [5](day5.md) | 應用層與事件驅動 | Application Service、Outbox、Integration Event、冪等消費者、Process Manager | `/tdd` `/event-contract` | `src/{charging/application,billing,assetops}/**` 測試全綠、`contracts/*.json`、`event-flow.md` |
| [6](day6.md) | MVP 上線 | HTTP API、OCPP 模擬器 + ACL、持久化（SQLite / Postgres）、Docker、E2E 劇本 | `/ship` | `scripts/e2e` 跑通、`README-mvp.md`, `e2e-log.md` |
| [7](day7.md) | SDLC 收尾 | Code Review、重構、CI、Backlog、Retro、帶回公司 | `/review` `/adr` `/retro` `/takeaway` | PR + CI 綠、`pr.md`, `retro.md`, `sprint-2-backlog.md`, `takeaway.md` |

MVP1 範圍（Day 4–6 實作）：Charging（核心域）+ AssetOps 的工單開立（支援域）+ Billing 的草稿帳單（最小消費者）。Parking 與 Dispatch 只做事件契約與 stub。

## 每一天的固定結構

每份 `dayN.md` 都是同一個骨架，讀熟一次之後每天就不用重新適應：

| 段落 | 給誰 | 內容 |
|---|---|---|
| 標題 + 一句話目標 | 所有人 | 今天結束時你能做到什麼 |
| 今天結束你會拿到 | 學員 | 交付物清單與路徑 |
| 講師開場 | 講師 | 15 分鐘的 bullet script（Day 1 是 45 分鐘） |
| 先讀 | 學員 | 要先看的 `docs/domain/*`、`docs/references/*`，附時間預算 |
| Block 1 / 2 / 3 | 學員 + 助教 | 每個 90 分鐘：目標、步驟、貼給 Claude Code 的提示、你自己要做的、常見卡點、產出 |
| Check-out | 學員 | 5 題 quiz（答案摺疊）、交付物自評 checklist、`/checkout` 提示 |
| 如果你落後了 | 學員 | 今天的最小可行版本 |
| 延伸 | 學員 | 有餘力時的加分題 |

## 一天的時間預算

| 時段 | 長度 | 內容 |
|---|---|---|
| Kickoff | 15 分（Day 1：45 分） | 講師開場 + 讀「先讀」 |
| Block 1 | 90 分 | 含 Claude Code 對話 |
| 休息 | 15 分 | |
| Block 2 | 90 分 | |
| 午休 | 60 分 | |
| Block 3 | 90 分 | |
| Check-out | 30 分 | quiz、自評、`/checkout`、commit 到 `workshop/<你的名字>` |

每個 Block 內部建議切法：**前 20 分鐘自己動手（不開 Claude）→ 中間 50 分鐘和 Claude 來回 → 最後 20 分鐘整理產出檔案**。
Claude 是助教不是代筆：「貼給 Claude Code 的提示」都設計成讓它**問你問題**；「你自己要做的」段落裡的東西不要丟給它。

## 怎麼用 Claude Code 當助教

1. 在 repo 根目錄開 Claude Code，它會讀 `CLAUDE.md`。第一次先打 `/ta`，確認它知道你在 Day 幾、用哪個語言。
2. 每個 Block 的「貼給 Claude Code 的提示」直接整段貼上；提示裡已經指定了要用的 skill（如 `/interview 阿忠`、`/storm`、`/tdd R1`）。
3. 卡住 20 分鐘以內：只准問它問題、不准要答案。超過 20 分鐘：明說「我卡住超過 20 分鐘了」，它才會給參考解（`solutions/`）。
4. 每天結束打 `/checkout`，它會對照 `docs/rubric.md` 幫你檢查交付物。

## 落後了怎麼辦

每份教材末尾有「如果你落後了」：那是當天的最小可行版本，做完它就能進下一天。Day 4–6 的程式碼有 `solutions/` 參考解，
但只在「卡住 20 分鐘」後看，看完關掉自己重寫。Day 7 的評量門檻是 80%，不是 100%。
