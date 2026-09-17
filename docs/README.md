# docs/ 索引

> 所有文件對齊 `curriculum.md`（單一事實來源）。名詞、識別碼、事件名、規則 R1–R8 有衝突時以它為準。
> 每份教材開頭「讀完你會拿到」、結尾「自我檢查」。

## 從哪開始

| 你是 | 先讀 |
|---|---|
| 學員，第一天 | `00-orientation.md` → `domain/ev-charging-primer.md` → 主控台 `index.html` |
| 講師 | `instructor.md` → `rubric.md` → `curriculum.md` |
| 只想看方法論 | `references/` 按 Day 順序 |
| 想改教材 | `curriculum.md` §5 寫作規範，改完先改它 |

## 頂層

| 檔案 | 一句話 |
|---|---|
| `curriculum.md` | 課程總綱：領域設定、五個 context、通用語言、識別碼、事件契約、R1–R8、七天表、skills、repo 版面、寫作規範 |
| `00-orientation.md` | 學員第一天：clone、選語言、跑 starter 紅燈、主控台循環、分支、20 分鐘規則 |
| `instructor.md` | 講師手冊：Day 1 開場 45 分腳本、每日 kickoff 卡、誤解攔截、投影、驗收、五天 / 三天版 |
| `rubric.md` | 每日交付物 DoD 清單 + 最終評量（0–3 × 12 面向，80% 及格，一票否決） |

## domain/ — 領域

| 檔案 | 一句話 |
|---|---|
| `ev-charging-primer.md` | 給非 EV 人的入門：場站 / 樁 / 槍、kW vs kWh、計量、費率、總部、故障生命週期、斷線存活、14:02 → 18:18 敘事 |
| `ocpp-primer.md` | 剛好夠用的 OCPP 1.6J / 2.0.1：CSMS、八種訊息 JSON、狀態列舉、「為什麼不是通用語言」翻譯表、`scripts/ocpp-sim` |
| `glossary.md` | 通用語言 54 個詞（中 / 英 / 是 / 不是 / 擁有者）+ 八組用語衝突 |
| `stakeholders.md` | 五位人物誌：背景、痛、說 vs 意思、隱藏事實（助教用）、好壞問題、訪談筆記範本 |

## references/ — 方法論（按出場天）

| Day | 檔案 | 一句話 |
|---|---|---|
| 1 | `bpr.md` | BPR 與價值流：人當 API、As-Is / To-Be、四原則、故障流程完整範例 |
| 2 | `event-storming.md` | 三層級、便利貼語意、一個人用 Markdown + Mermaid 做、T0–T6 + F、辨識假事實 |
| 2 | `example-mapping.md` | 四種卡片、規則 DoD 五項、GWT 範本、R1 / R5 / R6 完整寫法、假 GWT |
| 3 | `ddd-strategic.md` | 子領域、Bounded Context、四條找邊界線索、七種關係模式（用五個 context 舉例）、大泥球 |
| 3 | `c4.md` | Context / Container 層、Mermaid C4 語法、我們的兩張圖、什麼不要畫 |
| 3 | `adr.md` | Nygard 格式、ADR-0001 五個 context、ADR-0002 MVP1 範圍、什麼值得寫 |
| 4 | `ddd-tactical.md` | 八個模式、Vernon 四規則、ChargingSession / WorkOrder 草圖（TS + Python）、pullEvents、R8 |
| 4 | `hexagonal.md` | Ports & Adapters、starter 目錄、port 清單、OCPP ACL 位置、測試替身、依賴規則 |
| 4–5 | `tdd.md` | 紅綠重構、inside-out、金字塔、測試名 = 規則、vitest / pytest 速查、跟 Claude 做 TDD、R1 紅燈測試（TS + Python） |
| 5 | `eda.md` | 領域 vs 整合事件、信封、版本、Outbox + relay、兩層冪等、Process Manager、反模式、契約 v1 全表 |
| 7 | `sdlc.md` | 九步切片、DoD、conventional commits、分支、PR 範本、CI、retro、帶回公司 |
| 全 | `reading-list.md` | 按天分組的書 / 文章 / 演講，每項一句為什麼；回公司 90 天順序 |

## diagrams/ — Mermaid 原始碼

| 檔案 | 一句話 |
|---|---|
| `README.md` | 怎麼渲染（GitHub / VS Code / mermaid.live / CLI）、語法注意、修改規則 |
| `context-map.mmd` | 五個 context + 七種關係模式 |
| `c4-context.mmd` | C4 System Context |
| `c4-container.mmd` | C4 Container：場站節點 vs 總部節點 |
| `event-flow.mmd` | 14:02 → 18:18 sequence（`scripts/e2e` 原型） |
| `hexagonal.mmd` | starter 的 ports & adapters |
| `fault-saga.mmd` | WorkOrder 狀態機：申告 → 開單 → 派工 → 驗證 → 恢復可售 |

## days/ — 每日教材

`day1.md` … `day7.md`：每天的講師開場段、三個 Block（含貼給 Claude Code 的提示）、常見卡點、Check-out。交付物路徑與數量門檻以 `rubric.md` 對齊。

## 閱讀順序建議（學員）

```
Day 0  00-orientation → domain/ev-charging-primer
Day 1  domain/stakeholders（只讀 §0、§7、§8，不讀隱藏事實）→ references/bpr
Day 2  references/event-storming → references/example-mapping →（交完後）domain/glossary
Day 3  references/ddd-strategic →（B2 之後）curriculum §1.4 → references/c4 → references/adr
Day 4  references/ddd-tactical → references/hexagonal → references/tdd
Day 5  references/eda
Day 6  domain/ocpp-primer → diagrams/event-flow
Day 7  references/sdlc → rubric
每晚   references/reading-list 當天的 ★
```
