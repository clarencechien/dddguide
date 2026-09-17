# EV Charge Ops · 七天自學工作坊

> 從一個你沒做過的領域（充電樁 × 停車場 × 總部派工）開始，用 Claude Code 當助教，
> 七天走完 **需求訪談 → BPR → Event Storming → 戰略 DDD → 戰術 DDD + TDD → Event-Driven → MVP 上線 → SDLC 收尾**。

- 對象：1–3 年經驗的工程師，不需要 EV 領域知識。
- 環境：一台筆電。Node 22+ **或** Python 3.11+、Git、[Claude Code](https://claude.com/claude-code)。Docker 選配。
- 形式：講師每天早上 15 分鐘 kickoff（Day 1 為 45 分鐘），其餘時間學員自己 + Claude Code。
- 主控台：[`index.html`](index.html) 單一檔案，直接開或放到任何靜態主機；所有連結指回本 repo。

## 三步開始

```bash
git clone https://github.com/clarencechien/dddguide.git && cd dddguide
git checkout -b workshop/<你的名字>
printf 'LANG=node\n' > workshop/.config        # 或 LANG=python
```

```bash
# Node
cd starter/node && npm install && npm test      # 預期：R1 一個紅燈，其餘綠或 skip
# Python
cd starter/python && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && pytest
```

```bash
claude            # 在 repo 根目錄啟動；它會讀 CLAUDE.md 變成助教
/ta 我是新學員，今天 Day 1
```

然後在瀏覽器打開 `index.html`：設定名字與語言 → 按「複製提示」→ 貼到 Claude Code → 做事 → 交付物放 `workshop/dayN/` → `/checkout dayN`。

## 七天地圖

| Day | 主題 | 方法論 | 交付物 |
|---|---|---|---|
| 1 | 進場：領域入門、訪談、BPR | 訪談、As-Is / To-Be、BPR 四原則 | `interviews.md` `as-is.md` `to-be.md` |
| 2 | 事件風暴與通用語言 | Event Storming、Glossary、Example Mapping | `storm-board.md` `glossary.md` `rules.md` |
| 3 | 戰略設計 | Bounded Context、Context Map、C4、ADR | `context-map.md` `c4.md` `adr/` |
| 4 | 戰術設計 + TDD | Aggregate / VO / Domain Event、六角架構、紅綠重構 | `starter/<lang>` 聚合測試全綠 |
| 5 | 應用層與事件驅動 | Application Service、Outbox、Integration Event、冪等、Process Manager | 消費者與 Saga 測試全綠、`contracts/` |
| 6 | MVP 上線 | HTTP API、OCPP 模擬器 + ACL、持久化、Docker、E2E | `scripts/e2e` 跑通、`README-mvp.md` |
| 7 | SDLC 收尾 | Code Review、CI、Backlog、Retro、帶回公司 | PR + CI 綠、`retro.md`、`takeaway.md` |

完整課綱（單一事實來源）：[`docs/curriculum.md`](docs/curriculum.md)。每日教材：[`docs/days/`](docs/days/)。

## Repo 版面

```
index.html            主控台（單檔，可搬到任何靜態主機）
CLAUDE.md             Claude Code 助教守則
docs/
  curriculum.md       課程總綱：領域設定、五個 context、事件契約、R1–R8、七天課表
  00-orientation.md   學員第一天怎麼用 repo + 主控台 + Claude Code
  instructor.md       講師手冊
  rubric.md           每日交付物 DoD 與最終評量
  domain/             領域入門（非 EV 人適用）、OCPP 入門、通用語言、五位角色與隱藏事實
  references/         BPR、Event Storming、Example Mapping、DDD 戰略 / 戰術、六角、EDA、TDD、C4、ADR、SDLC、閱讀清單
  days/               day1.md … day7.md
  diagrams/           Mermaid 原始碼
.claude/skills/       /ta /interview /storm /rules-check /context-map /c4 /adr /tdd /aggregate-review /event-contract /ship /review /retro /takeaway /checkout
starter/node          TypeScript + vitest 六角骨架，第一個紅燈已備好
starter/python        pytest 同構骨架
solutions/            Day 4–6 參考解（卡住 20 分鐘再看）
contracts/            整合事件 JSON Schema v1 + 範例 + 驗證腳本
scripts/ocpp-sim      假的 OCPP 樁：印出或 POST 一個真實午後的訊息
scripts/e2e           14:02 → 18:18 的 E2E 劇本
workshop/             你的交付物（dayN/），含範本
docker-compose.yml    Postgres（選配）
```

## 助教怎麼運作

`CLAUDE.md` 讓 Claude Code 變成蘇格拉底式助教：先問後答、學員自述卡住 ≥ 20 分鐘才給參考解、
Day 4–6 沒有紅燈不寫產品碼、通用語言優先、OCPP 的字不進 domain、聚合零 I/O、事件先記錄再由 Outbox 發。
每個 skill 都是 `.claude/skills/<name>/SKILL.md`，可以自己改。

## 給講師 / 帶課者

讀 [`docs/instructor.md`](docs/instructor.md)。主控台右上角切到「講師模式」會多出講師提示。
如果只有五天，砍法在講師手冊；如果要換領域，改 `docs/curriculum.md` §1 再改 `docs/domain/`，其餘結構可沿用。

## 授權

[CC BY-NC-ND 4.0](LICENSE.md)：可自由分享（需標示作者與原始連結），非商業使用；收費開課、改作散布、併入其他產品請先取得書面授權。
學員在自己的 fork 或本機修改 `starter/`、`workshop/` 完成課程不受此限。
現場費率、電業契約與 OCPP 細節以你們的實際情況為準，本 repo 的數字只是例子。
