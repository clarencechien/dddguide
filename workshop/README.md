# workshop/ — 你的交付物放這裡

這個目錄是**學員**的工作區。七天每天結束前，把當天的交付物放進 `workshop/dayN/`，
然後 commit 到你自己的分支 `workshop/<你的名字>`（不要推到 `main`）。

## 第一次使用

```bash
cp workshop/.config.example workshop/.config   # 選 LANG=node 或 LANG=python
git checkout -b workshop/<你的名字>
```

Claude Code 助教（`CLAUDE.md`）會讀 `workshop/.config` 決定你用哪個 starter，
並且看 `workshop/dayN/` 裡有什麼檔案來判斷你走到第幾天。

## 每天要交什麼

| Day | 目錄 | 交付物 | 範本 |
|---|---|---|---|
| 1 | `workshop/day1/` | `interviews.md`, `as-is.md`, `to-be.md` | [`day1/TEMPLATE.md`](day1/TEMPLATE.md) |
| 2 | `workshop/day2/` | `storm-board.md`, `glossary.md`, `rules.md`（≥6 條 GWT） | [`day2/TEMPLATE.md`](day2/TEMPLATE.md) |
| 3 | `workshop/day3/` | `context-map.md`, `c4.md`, `adr/0001-*.md`, `adr/0002-*.md` | [`day3/TEMPLATE.md`](day3/TEMPLATE.md) |
| 4 | `workshop/day4/` + `starter/<lang>/src/charging/**` | 測試全綠、`model.md`、`test-report.md` | [`day4/TEMPLATE.md`](day4/TEMPLATE.md) |
| 5 | `workshop/day5/` + `starter/<lang>/src/{charging/application,billing,assetops}/**` + `contracts/*.json` | 測試全綠、`event-flow.md` | [`day5/TEMPLATE.md`](day5/TEMPLATE.md) |
| 6 | `workshop/day6/` | `README-mvp.md`、`scripts/e2e` 跑通的紀錄 | [`day6/TEMPLATE.md`](day6/TEMPLATE.md) |
| 7 | `workshop/day7/` | `pr.md`（PR 連結 + CI 綠）、`retro.md`、`sprint-2-backlog.md`、`takeaway.md` | [`day7/TEMPLATE.md`](day7/TEMPLATE.md) |

每個 `dayN/TEMPLATE.md` 列出當天檔案的骨架（標題），把它複製成對應檔名再填。
交付物的驗收標準（Definition of Done）在 `docs/rubric.md`；當天的做法在 `docs/days/dayN.md`。

## 規矩

- 用 `docs/domain/glossary.md` 的名詞；範例識別碼一律 `SITE-TPE-01`、`CP-A12`、`CP-A12-2`、`S-991`…（見 `docs/curriculum.md` §1.6）。
- 不要把 `solutions/` 的內容抄進來；卡住 20 分鐘再看，而且看完要自己重寫。
- 每天結束前跑一次 `/checkout` 讓助教對照交付物清單。
