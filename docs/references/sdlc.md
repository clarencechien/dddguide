# SDLC：工作坊教的那一段

> Day 7 全天。交付物：PR + CI 綠、`workshop/day7/retro.md`、`sprint-2-backlog.md`、評量 ≥ 80%。用 `/review`、`/retro`、`/takeaway`。
> 但 SDLC 不是 Day 7 才開始：從 Day 1 的分支、每天的 commit、Day 4 的 TDD，都是它的一部分。

## 讀完你會拿到

- 本工作坊教的 SDLC 切片：backlog → 規則 → 分支 → TDD → PR → review → CI → ship → retro，每一步的最小做法。
- Definition of Done、conventional commits、分支命名、PR 描述範本。
- 一場 45 分鐘 retro 的跑法。
- 「帶回公司」時該怎麼挑。

---

## 1. 為什麼存在

方法論（DDD、TDD、EDA）回答「怎麼做對」；SDLC 回答「怎麼**一直**做對」。1–3 年的工程師通常在公司裡經歷過某種 SDLC，但多半是被動遵守：「因為 PR 要兩個 approve」。工作坊的目標是讓你知道每一步**為什麼存在**，回去之後能改你公司的流程，而不只是遵守它。

我們只教一個切片。沒有 sprint planning 儀式、沒有估點、沒有 release train。有的是：**一條規則從 backlog 到上線的最短誠實路徑**。

---

## 2. 切片：九步

```
backlog ──▶ 規則 ──▶ 分支 ──▶ TDD ──▶ PR ──▶ review ──▶ CI ──▶ ship ──▶ retro
 (Day 2)   (Day 2)  (Day 1)  (Day 4-6) (Day 7) (Day 7)  (Day 7) (Day 6)  (Day 7)
```

### 2.1 Backlog
一條 backlog 項目 = 一條規則或一個能力，帶 context 與驗收條件。不是「做工單功能」，是「R5：同樁同碼在開放期間只保留一張根因工單」。`rules.md` 就是你的 backlog。

### 2.2 規則
Example Mapping 產出的 GWT（`example-mapping.md`）。DoD 五項齊全才能進下一步。

### 2.3 分支
```bash
git checkout -b workshop/<你的名字>          # Day 1 建，整週用
# 例：workshop/clarence
```
規則：
- 一人一條分支 `workshop/<name>`，每天 commit，Day 7 開 PR 到 `main`（或講師指定的整合分支）。
- 不要每條規則一條分支——工作坊的粒度是「一週一個 PR」，公司的粒度通常是「一條規則一個 PR」，Day 7 retro 會討論差別。
- 不要在 `main` 上工作。

### 2.4 TDD
`tdd.md`。每條規則紅綠重構，每個綠燈一個 commit。

### 2.5 Commit：Conventional Commits
```
<type>(<scope>): <一句話，祈使句，小寫開頭，不超過 72 字>

<可選：為什麼，不是做了什麼>

<可選：Refs: R1, ADR-0001>
```

| type | 用在 |
|---|---|
| `feat` | 新規則 / 能力 |
| `fix` | 修 bug |
| `test` | 只加測試（TDD 的紅燈 commit） |
| `refactor` | 綠燈下的整理 |
| `docs` | workshop/ 下的 md、ADR |
| `chore` | 設定、CI、依賴 |

scope 用 context 名：`charging`、`assetops`、`billing`、`app`、`acl`、`contracts`。

例子：
```
test(charging): red test for R1 connector occupied
feat(charging): reject second start on occupied connector (R1)
refactor(charging): extract Connector value object
feat(assetops): dedupe fault reports into root-cause work order (R5)
docs(adr): ADR-0002 MVP1 scope
chore(ci): add vitest workflow
```

### 2.6 PR
一個 PR = 一週的成果（工作坊）。描述範本見 §4。

### 2.7 Review
`/review` 先跑一輪（DDD / 六角 / 測試品質三面向），修完再請人看。人看的重點：**reviewer 能不能只靠 PR 描述 + 測試名稱懂你做了什麼**。

### 2.8 CI
GitHub Actions，最小版本：

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  node:
    if: ${{ hashFiles('starter/node/package.json') != '' }}
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: starter/node } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: starter/node/package-lock.json }
      - run: npm ci
      - run: npm test -- --run
  python:
    if: ${{ hashFiles('starter/python/pyproject.toml') != '' }}
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: starter/python } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r requirements.txt
      - run: pytest -q
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node contracts/validate.mjs
```

CI 綠是 PR 的前提，不是 review 的替代。

### 2.9 Ship
Day 6 的 `/ship` 清單：API 五個端點可打、SQLite 持久化、Outbox relay 在跑、Docker build 過、`scripts/e2e` 綠、日誌帶 `eventId` / `correlationId`。`README-mvp.md` 寫「怎麼跑、怎麼驗、已知限制」。

### 2.10 Retro
§5。

---

## 3. Definition of Done

### 3.1 一條規則的 DoD
- [ ] `rules.md` 裡有 GWT，五項齊全。
- [ ] 每個 scenario 至少一個測試，測試名 = scenario 名。
- [ ] 測試綠；`npm test` / `pytest` 全綠。
- [ ] 拒絕是事件不是例外（若適用）。
- [ ] 聚合無 I/O import。
- [ ] commit 訊息引用規則編號。

### 3.2 一個 PR 的 DoD
- [ ] CI 綠。
- [ ] PR 描述有：範圍（哪些規則）、ADR 連結、事件契約連結、怎麼驗證、已知限制；副本存 `workshop/day7/pr.md`。
- [ ] `/review` 無 High severity finding。
- [ ] `workshop/dayN/` 交付物齊（見 `docs/rubric.md`）。
- [ ] 沒有 `console.log` / `print` 除錯殘留（日誌走 logger）。
- [ ] 沒有 `solutions/` 的複製痕跡（講師會比對）。

### 3.3 MVP1 的 DoD（Day 6）
- [ ] `scripts/e2e` 14:02 → 18:18 全綠。
- [ ] 斷線劇本：關掉 HQ 節點，site 仍能 Start / Stop；恢復後 Outbox 補送，Billing 草稿正確。
- [ ] `README-mvp.md`。

---

## 4. PR 描述範本

```markdown
## 範圍
實作 Charging（R1–R4）、AssetOps 工單開立（R5）、Billing 草稿消費者；Parking / Dispatch stub。
對應 ADR-0002。

## 決策
- ADR-0001 五個 Bounded Context：workshop/day3/adr/0001-bounded-contexts.md
- ADR-0002 MVP1 範圍：workshop/day3/adr/0002-mvp1-scope.md
- ADR-0003 聚合身份 = 連接器，R1 / R2 在聚合內：workshop/day3/adr/0003-connector-scoped-aggregate.md

## 事件契約
- contracts/charging.session.started.v1.schema.json
- contracts/charging.session.completed.v1.schema.json
- contracts/charging.charger.faulted.v1.schema.json
- contracts/ops.work_order.opened.v1.schema.json / closed.v1.schema.json
`node contracts/validate.mjs` 全過。去重鍵：Billing `sessionId`；AssetOps `chargerId + faultCode` + `eventId`。

## 怎麼驗證
1. `cd starter/node && npm test` → 47 passed
2. `node scripts/e2e/run.mjs` → 14:02 進場 … 18:18 WO-2208 Closed ✓（輸出在 workshop/day6/e2e-log.md）
3. 斷線劇本：停掉 HQ 程序 → S-991 仍能 Start / Stop、P-441 人工放行；恢復後 `POST /relay` 補送 3 則

## 測試金字塔
聚合 31 / 應用層與消費者 12 / adapter 3 / e2e 1

## 已知限制
- 草稿帳單單一費率 8 元/kWh；跨時段計價在 Sprint 2（backlog #3）
- DispatchService stub 固定指派 TECH-HAO
- `DuplicateFaultReported` 不對外（ADR-0004 待決）

## Reviewer 請特別看
- `src/assetops/application/FaultProcessManager.ts` 的 processedEventIds 是否與工單同一交易
- `src/adapters/ocpp/OcppAcl.ts` connectorId=0 的處理與 Blocked / Invalid 對應
```

原則：**reviewer 應該能在 5 分鐘內從描述知道去哪裡看什麼**。「請看 diff」不是描述。

---

## 5. Retro：45 分鐘

工作坊用 Start / Stop / Continue，因為它最不需要引導。

| 時間 | 做什麼 |
|---|---|
| 0–5 | 設定：今天談的是流程與方法，不是人。每人先靜默寫。 |
| 5–15 | 每人靜默寫便利貼：Start（該開始做的）、Stop（該停止的）、Continue（該保留的）。每欄至少 2 張。 |
| 15–30 | 輪流貼、講 30 秒。相似的合併。 |
| 30–40 | 投票（每人 3 票），選前三個。 |
| 40–45 | 每個前三項指定一個「下一個最小步驟」與一個人。寫進 `retro.md`。 |

一個人做時，`/retro` 扮演「一直問為什麼」的同事。它會先讀你七天的 `workshop/` 交付物，然後問：「Day 4 你 R3 花了三小時，是規則不清楚還是測試寫太大？」

`retro.md` 格式：

```markdown
# Retro — Day 7

## Start
- 每條規則一個 PR（工作坊一週一個太大，review 時 reviewer 看不完）→ 下一步：Sprint 2 第一條規則試
## Stop
- 綠燈後跳過重構（R2–R4 有三份重複的 findActive 查詢）→ 下一步：`/tdd` 綠燈後強制問一次
## Continue
- 測試名 = scenario 名（review 時直接對照 rules.md，省很多時間）
## 數字
- 七天 commit 數、測試數、`/ta` 求助次數、卡住 ≥ 20 分鐘的次數與原因
```

### Sprint 2 backlog
`sprint-2-backlog.md`：從 ADR-0002 的「壞後果」、retro 的 Start、問題卡區塊生出來。每項：規則 / 能力、context、驗收條件、為什麼是現在。curriculum 指定的三項一定要有：Billing 合併出帳（R7）、Dispatch（路線與備品）、Parking 真整合。

---

## 6. 帶回公司

`/takeaway` 會從你的交付物產出「5 件事 + 30 天計畫 + 給主管的一頁」，存成 `workshop/day7/takeaway.md`（產出後要自己改，不是照單全收）。挑選原則：

| 帶回去的 | 條件 |
|---|---|
| 「人當 API」清單 | 你公司至少三個；這是最容易說服主管的東西，因為它有等待時間數字 |
| 一張詞彙表 | 挑一個大家吵過的詞（你們的「會話」是什麼？） |
| 規則 = 測試名 | 不需要任何人同意就能做 |
| 拒絕是事件 | 下一個功能就能用 |
| Outbox | 只在你們已經有「publish 後 DB 失敗」的痛時才推 |
| 五個 context | **不要**回去就提「我們要重切」；先畫現況 context map 給自己看 |
| ADR | 從下一個決定開始寫，一頁就好 |

30 天計畫的形狀：第 1 週只觀察（畫 As-Is），第 2 週做一件不需要許可的事（測試命名、ADR），第 3–4 週提一個有數字的提案（一個人當 API 的自動化）。

---

## 7. 在本專案怎麼出現

| Day | SDLC 的影子 |
|---|---|
| 1 | 建分支；第一個 commit（`docs(day1): interviews`） |
| 2 | `rules.md` = backlog |
| 3 | ADR |
| 4–5 | TDD；每綠一 commit；`/aggregate-review`、`/event-contract` = 自動 review |
| 6 | `/ship`；`README-mvp.md` |
| 7 | `/review`、CI、PR、`/retro`、`/takeaway` |

---

## 8. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| 一天結束一個大 commit「day4 done」 | 每個綠燈一個 commit |
| commit 訊息寫「fix」「update」 | type(scope): 祈使句 + 規則編號 |
| PR 描述是空的或「見 commit」 | §4 範本 |
| CI 紅了先 merge 再說 | CI 綠是前提 |
| retro 變成互相檢討 | Start / Stop / Continue 只談流程 |
| Sprint 2 backlog 是願望清單 | 每項要有驗收條件與 context |
| 帶回公司第一件事是「重切 context」 | 先畫 As-Is |
| 把 `solutions/` 複製過來 | 講師看得出來；而且你 retro 沒東西寫 |

---

## 9. 延伸閱讀

- Kent Beck, *Extreme Programming Explained*（2nd ed.），2004。—— 小步、持續整合、集體所有權的原始論述。
- Jez Humble & David Farley, *Continuous Delivery*, 2010, 第 3、5 章。—— CI 與部署管線為什麼長那樣。
- Nicole Forsgren, Jez Humble & Gene Kim, *Accelerate*, 2018。—— 四個指標（lead time、deploy frequency、MTTR、change fail rate）；給主管看的那一頁可以引用。
- Esther Derby & Diana Larsen, *Agile Retrospectives: Making Good Teams Great*, 2006。—— retro 的五階段結構。
- Michael Nygard, *Release It!*（2nd ed.），2018。—— 「ship」之後會發生的事。
- conventionalcommits.org —— 規格，5 分鐘。
- Google, "Code Review Developer Guide"（google.github.io/eng-practices）。—— reviewer 與作者兩邊的指南。
- Mike Cohn, *Succeeding with Agile*, 2009, 第 15 章 —— 測試金字塔的出處。

---

## 自我檢查

1. 九步切片裡，哪三步在 Day 7 之前就已經在做了？各是哪一天？
2. 一條規則的 DoD 六項是什麼？哪一項不需要任何工具就能檢查？
3. 寫出你 Day 4 R3 的三個 commit 訊息（紅、綠、重構）。
4. PR 描述的「怎麼驗證」為什麼要有具體指令與預期輸出？
5. 帶回公司的第一件事為什麼不該是「重切 context」？那該是什麼？
