# Claude Code Skills — EV Charge Ops 工作坊助教

這個目錄放 16 個 Claude Code skill（slash command）。每個 skill 是 `.claude/skills/<name>/SKILL.md`，
Claude Code 讀到 `CLAUDE.md` 後會自動載入；學員在 Claude Code 對話中輸入 `/<name> <參數>` 觸發。
所有 skill 都遵守 `docs/curriculum.md` §5 的助教原則：先問後答、卡住 ≥ 20 分鐘才給參考解、每次回覆末尾給「下一個最小步驟」、繁體中文。

## 怎麼用

1. 在 repo 根目錄啟動 `claude`（Claude Code 會讀 `CLAUDE.md` 與本目錄）。
2. 輸入 `/ta` 確認助教有醒著、知道你在 Day 幾。
3. 依當天 Block 用對應 skill；每天結束用 `/checkout dayN`。
4. 主控台 `index.html` 的按鈕會產生對應提示，貼進 Claude Code 即可。

## 清單

| 指令 | 一句話 | 出場 | 典型輸入 |
|---|---|---|---|
| `/ta` | 助教總入口：偵測進度、列三個 Block 與相關 skill、處理「我卡住了」 | 全程 | `/ta`、`/ta day3`、`/ta 我卡住了` |
| `/interview` | 扮演五位利害關係人之一，隱藏事實要你問出來；結束給 N/M debrief | Day 1 | `/interview 阿忠`、`/interview`（列角色） |
| `/bpr-review` | 檢查 As-Is / To-Be：人當 API ≥ 3 處、四原則、不偷渡技術解 | Day 1 | `/bpr-review`、`/bpr-review to-be` |
| `/storm` | Event Storming 引導：只收過去式事實、退回系統動作、建 T0–T6+F、process-level | Day 2 | `/storm`、`/storm process`、`/storm 呼叫總部 API` |
| `/rules-check` | 驗收 GWT 規則：守門者 / 命令 / 成功事件 / 拒絕事件 / 數字例子；≥ 6 條 | Day 2 | `/rules-check`、`/rules-check R3` |
| `/context-map` | 先要你提切法，用邊界啟發法挑戰，再產 Mermaid context map，最後才對照課綱 | Day 3 | `/context-map`、`/context-map 挑戰`、`/context-map 對照` |
| `/c4` | 產 C4 L1 / L2 Mermaid，檢查 ACL 與 Outbox 是否可見 | Day 3 | `/c4 context`、`/c4 container`、`/c4 審查` |
| `/adr` | 建 ADR 骨架（問三題後）與審查替代方案 / 負面後果 | Day 3、7 | `/adr new 0001 context 切法`、`/adr review 0002` |
| `/tdd` | 紅綠重構教練：一次一條規則；沒紅燈不寫產品碼 | Day 4–5 | `/tdd R1`、`/tdd StopCharging 應用服務` |
| `/aggregate-review` | 審聚合：不變條件、大小、事件 record 不 publish、聚合內禁 I/O | Day 4 | `/aggregate-review ChargingSession` |
| `/event-contract` | 審整合事件：命名 / 版本 / 信封 / 去重鍵 / Outbox / 冪等；拒絕 OCPP 欄位 | Day 5 | `/event-contract`、`/event-contract outbox` |
| `/ship` | MVP 上線七段清單：API、ACL、DB、Outbox、Docker、E2E、日誌；用輸出驗證 | Day 6 | `/ship`、`/ship e2e` |
| `/review` | Code review（DDD / 六角 / 測試品質）findings 表 + 判定 | Day 7 | `/review`、`/review pr` |
| `/retro` | Start / Stop / Continue + Sprint 2 backlog | Day 7 | `/retro`、`/retro backlog` |
| `/takeaway` | 帶回公司的 5 件事、30 天行動計畫、給主管的一頁 | Day 7 | `/takeaway`、`/takeaway 30天` |
| `/checkout` | 每日 check-out：對照 `docs/rubric.md` 打分、列最少要補的事、預告明天 | 每天 | `/checkout day2` |

## 每天的 skill 路線

| Day | Block 1 | Block 2 | Block 3 | 收尾 |
|---|---|---|---|---|
| 1 | `/ta` | `/interview` ×5 | `/bpr-review` | `/checkout day1` |
| 2 | `/storm` | `/storm process` | `/rules-check` | `/checkout day2` |
| 3 | `/context-map` | `/context-map 畫圖` | `/c4`、`/adr` | `/checkout day3` |
| 4 | `/aggregate-review` | `/tdd R1`…`R4` | `/tdd R5` | `/checkout day4` |
| 5 | `/tdd <命令處理器>` | `/event-contract` | `/event-contract consumer` | `/checkout day5` |
| 6 | `/ship api`、`/ship acl` | `/ship db`、`/ship outbox` | `/ship docker`、`/ship e2e` | `/checkout day6` |
| 7 | `/review` | `/adr new 0003…` | `/retro`、`/takeaway` | `/checkout day7` |

## 每個 SKILL.md 的固定段落

觸發 → 先讀 → 角色與態度 → 流程 → 輸出格式 → 不准 → 範例對話。
改 skill 前先改 `docs/curriculum.md`；名詞、事件名、識別碼一律以它為準（§1.6、§1.8、§1.9）。
