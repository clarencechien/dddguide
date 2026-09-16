# 00 · 學員入門：第一天怎麼用這個 repo

> 對象：Day 1 早上第一次打開 repo 的你。讀完 20 分鐘，做完 45 分鐘（Day 1 Block 1）。
> 所有連結指回 https://github.com/clarencechien/dddguide 。

## 讀完你會拿到

- 一個能跑測試的本機環境（Node 20+ **或** Python 3.11+，二選一）。
- 打開主控台 `index.html`，知道每個按鈕在幹嘛。
- Claude Code 已經讀到 `CLAUDE.md`，`/ta` 有回應。
- 一條自己的分支 `workshop/<你的名字>`，以及第一個 commit。
- 「主控台按鈕 → 複製提示 → 貼到 Claude Code」這個循環做過一次。
- 知道卡住時的 20 分鐘規則怎麼用。

---

## 1. 這個 repo 是什麼

七天自學工作坊：用一個**連鎖停車場新裝充電樁**的虛構案子，走完 BPR → Event Storming → 戰略 DDD → 戰術 DDD + TDD → 事件驅動 → MVP 上線 → SDLC。Claude Code 是助教。

三個東西你會一直打開：

| 東西 | 路徑 | 用途 |
|---|---|---|
| 主控台 | `index.html` | 每天的 Block、按鈕產生提示、交付物清單、最終評量 |
| 課程總綱 | `docs/curriculum.md` | 唯一事實來源：領域、事件名、規則 R1–R8、七天表 |
| 助教 | Claude Code + `.claude/skills/` | `/ta` 開始，之後每個 Block 有對應的 skill |

你**不需要**先懂充電樁。Day 1 B1 會讀 `docs/domain/ev-charging-primer.md`，20 分鐘夠了。

---

## 2. 環境（20 分鐘）

### 2.1 Clone

```bash
git clone https://github.com/clarencechien/dddguide.git
cd dddguide
```

### 2.2 選一個語言

| | Node | Python |
|---|---|---|
| 版本 | 20+ | 3.11+ |
| 目錄 | `starter/node/` | `starter/python/` |
| 測試 | vitest | pytest |
| Day 6 HTTP | Fastify | FastAPI |
| 選它如果 | 你平常寫 TS / JS | 你平常寫 Python |

兩邊骨架同構，教材的程式碼草圖兩種都有。**不要兩個都做**。

### 2.3 跑 starter 測試

Node（20+；Day 6 跑 `node src/app.ts` 與 `scripts/e2e` 需要 22+ 的原生 TypeScript 支援）：
```bash
cd starter/node
npm install
npm test
```

Python：
```bash
cd starter/python
python -m venv .venv && . .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest
```

**預期結果：一個紅燈 `Error: TODO R1`，其餘三個 skip。** starter 故意放了第一個失敗的測試（R1 的第一個 scenario，`test/charging/ChargingSession.test.ts` 或 `tests/charging/test_charging_session.py`），這是 Day 4 的起點。看到紅燈 = 環境正確。看到 import error 或找不到指令 = 環境問題，先修。

然後告訴助教你選了哪個語言：

```bash
cp workshop/.config.example workshop/.config      # 打開它，留下 LANG=node 或 LANG=python 其中一行
```

Claude Code 每次對話都會讀 `workshop/.config` 決定用哪個 starter。

### 2.4 Docker（選配，Day 6 才用）

沒有 Docker 也能走完七天（SQLite 預設零安裝）。有的話 Day 6 B2 可以用 `docker-compose up` 起 Postgres。現在不用裝。

### 2.5 Claude Code

1. 安裝 Claude Code（依官方說明）。
2. 在 repo 根目錄啟動：`claude`。
3. 輸入 `/ta`。

預期回應：它會自我介紹是這個工作坊的助教、偵測你在 Day 1、列出今天三個 Block 與交付物、然後**問你一個問題**而不是給你答案。如果它回答得像一般 Claude（沒提工作坊），代表 `CLAUDE.md` 沒被讀到——確認你在 repo 根目錄。

---

## 3. 主控台 `index.html`

直接用瀏覽器開（雙擊，或 `open index.html`）。單一檔案，不需要 server。也可以上傳到任何靜態主機。

版面：

```
┌─────────────────────────────────────────────────┐
│ EV Charge Ops 工作坊    Day 1 2 3 4 5 6 7  [評量]  │
├─────────────────────────────────────────────────┤
│ 今天結束你會拿到：…                                │
│                                                 │
│ Block 1 環境（90 分）                             │
│   [📋 複製提示：/ta]  [📋 複製提示：讀 primer]      │
│ Block 2 訪談（90 分）                             │
│   [📋 /interview 阿忠] [小美] [老陳] [Vicky] [阿豪] │
│ Block 3 BPR（90 分）                              │
│   [📋 /bpr-review]                               │
│                                                 │
│ Check-out：交付物清單 ☐ interviews.md ☐ as-is.md … │
│   [📋 /checkout day1]                            │
└─────────────────────────────────────────────────┘
```

每個按鈕做一件事：**把一段提示複製到剪貼簿**。提示裡已經寫好 skill 名稱、你該貼的檔案路徑、以及這個 Block 的目標。

### 3.1 循環

```
主控台按按鈕 ──▶ 剪貼簿 ──▶ 貼到 Claude Code ──▶ 對話 ──▶ 寫檔到 workshop/dayN/ ──▶ 回主控台勾交付物
```

一天大概做 8–12 次這個循環。主控台不會跟 Claude Code 通訊，它只是「提示的遙控器」；進度靠你自己勾（存在瀏覽器 localStorage）。

### 3.2 主控台上的連結

每個 Block 旁邊有「教材」連結，指向 GitHub 上的 `docs/references/*.md`、`docs/domain/*.md`。Day 7 的「評量」頁指向 `docs/rubric.md`。所有連結都是 https://github.com/clarencechien/dddguide/blob/main/... 的絕對路徑，所以主控台搬到任何地方都能用。

---

## 4. 分支與交付物

### 4.1 建分支（現在就做）

```bash
git checkout -b workshop/<你的名字>       # 例：workshop/clarence
```

整週都在這條分支上。**不要在 main 工作**。Day 7 開 PR。

### 4.2 每天交付到 `workshop/dayN/`

| Day | 交付物 |
|---|---|
| 1 | `workshop/day1/interviews.md`, `as-is.md`, `to-be.md` |
| 2 | `workshop/day2/storm-board.md`, `glossary.md`, `rules.md` |
| 3 | `workshop/day3/context-map.md`, `c4.md`, `adr/0001-*.md`, `adr/0002-*.md` |
| 4 | `workshop/day4/model.md`, `test-report.md`；`starter/<lang>/src/charging/**` 測試全綠 |
| 5 | `workshop/day5/event-flow.md`；`src/{charging/application,billing,assetops/application}/**` 測試全綠；整合事件過 `contracts/validate.mjs` |
| 6 | `workshop/day6/README-mvp.md`, `e2e-log.md`；`scripts/e2e` 跑通 |
| 7 | `workshop/day7/pr.md`, `retro.md`, `sprint-2-backlog.md`, `takeaway.md`；PR + CI 綠 |

`workshop/dayN/` 已有 `.gitkeep` 與 `TEMPLATE.md`，照範本的段落開始寫（完整 DoD 在 `docs/rubric.md`）。

### 4.3 Commit

每天至少一個，Day 4 起每個綠燈一個。格式（`docs/references/sdlc.md` §2.5）：

```bash
git add workshop/day1
git commit -m "docs(day1): interviews with five stakeholders"
git push -u origin workshop/<你的名字>
```

### 4.4 第一個 commit（現在）

```bash
cp workshop/day1/TEMPLATE.md workshop/day1/interviews.md     # 照範本段落開始寫
git add workshop/.config workshop/day1
git commit -m "docs(day1): start interviews"
git push -u origin workshop/<你的名字>
```

---

## 5. 一天的節奏

| 時段 | 做什麼 | 工具 |
|---|---|---|
| Kickoff 15–60 分 | 講師開場（或自己讀 `docs/days/dayN.md` 的「講師開場」段） | 主控台投影 |
| Block 1–3，各 90 分 | 主控台按鈕 → Claude Code 對話 → 寫交付物 | 主控台 + Claude Code + 編輯器 |
| Check-out 15 分 | `/checkout dayN`：對照交付物自評，Claude 給下一步 | Claude Code |
| 當晚 30 分 | `docs/references/reading-list.md` 當天的 ★ | — |

Block 之間休息 10 分鐘。90 分鐘做不完是正常的——`/checkout` 會告訴你最少要補什麼。

---

## 6. 卡住的 20 分鐘規則

助教原則（curriculum §5）：**先問後答；學員自述卡住 ≥ 20 分鐘才給參考解。**

意思是：

1. 卡住了先用 `/ta 我卡住了`，描述你試過什麼。它會問你問題，不會給答案。
2. 計時 20 分鐘。這 20 分鐘內你要：重讀規則、重看測試失敗訊息、換一個更小的步驟。
3. 20 分鐘後對 Claude 說「**我卡住 20 分鐘了**」（就用這句），它才會給參考解或指向 `solutions/`。
4. 看了參考解之後，**先關掉它，自己重寫一次**。retro 時記下「卡在哪、為什麼」。

為什麼是 20 分鐘：太短你學不到，太長你會放棄。Day 4 平均每人會觸發 2–3 次。

不算卡住的情況：環境問題（npm 裝不起來）直接問，不用等；教材看不懂直接問，不用等。20 分鐘規則只管「你在做交付物、需要自己想出來的東西」。

---

## 7. 常見第一天問題

| 問題 | 答 |
|---|---|
| Claude Code 沒有 `/ta` | 確認在 repo 根目錄；`ls .claude/skills/` 應該看到 16 個目錄 |
| 主控台按鈕沒反應 | 剪貼簿權限；換 Chrome / Edge；或直接複製按鈕下方的文字框 |
| 測試全綠，沒有紅燈 | 你可能在 `solutions/` 跑；回 `starter/<lang>/` |
| 要不要先讀 OCPP | 不用。Day 1 只讀 `ev-charging-primer.md`；`ocpp-primer.md` Day 6 才需要 |
| 可以直接看 `docs/domain/glossary.md` 和 curriculum §1.4 嗎 | 可以看 curriculum，但 **§1.4 五個 context 請 Day 3 結束後再對**；`glossary.md` Day 2 交完自己的再看 |
| 我想兩個語言都做 | 不要。七天剛好夠一個 |
| 我可以跳過訪談直接寫程式嗎 | 可以，然後 Day 3 你會發現沒東西可以推導邊界，Day 4 的規則沒有數字例子 |

---

## 8. 現在就做（Block 1 檢查表）

- [ ] clone 完成，`docs/curriculum.md` 打開讀過 §0–§1（15 分鐘）
- [ ] 選了語言，`npm test` 或 `pytest` 看到**一個紅燈**
- [ ] `index.html` 打開，按過一次「複製提示」並貼到 Claude Code
- [ ] `/ta` 有工作坊式的回應
- [ ] 分支 `workshop/<你的名字>` 建好、第一個 commit 推上去
- [ ] `docs/domain/ev-charging-primer.md` 讀完，自我檢查五題能答三題
- [ ] 知道 20 分鐘規則

做完去 Block 2：主控台按 `/interview 阿忠`。

---

## 自我檢查

1. 主控台與 Claude Code 之間是怎麼「溝通」的？主控台知道你的進度嗎？
2. starter 測試第一次跑應該看到什麼？看到全綠代表什麼？
3. 你的分支叫什麼？Day 7 之前會有幾個 PR？
4. 「我卡住 20 分鐘了」這句話會觸發什麼？在那之前 `/ta` 會做什麼？
5. curriculum §1.4 為什麼要 Day 3 之後才看？
