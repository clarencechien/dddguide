# Day 7 — SDLC 收尾：Code Review、CI、PR、Retro、帶回公司

**一句話目標**：今天結束時，你的七天成果是一個有 CI 綠燈、有 ADR 與事件契約連結的 PR；你有一份 retro、一份 Sprint 2 backlog、
一份「帶回公司清單」，而且主控台最終評量 ≥ 80%。

## 今天結束你會拿到

| 交付物 | 路徑 | 最低要求 |
|---|---|---|
| Code review 與重構 | `starter/<lang>/**` | `/review` 指出的問題 ≥ 3 條已修、每條有測試；領域層仍零 I/O |
| CI | `.github/workflows/ci.yml` | push / PR 觸發；跑你的 LANG 的測試 + contracts 驗證；綠燈 |
| PR | `workshop/day7/pr.md` | PR 連結；描述附 ADR-0001、ADR-0002、`contracts/` 連結；CI 綠 |
| Retro | `workshop/day7/retro.md` | Keep / 卡最久的三處 / 重來會做的事 / 助教用法 |
| Sprint 2 backlog | `workshop/day7/sprint-2-backlog.md` | Billing 合併出帳、Dispatch、Parking 真整合，每項有 context、事件、驗收、估點 |
| 帶回公司 | `workshop/day7/takeaway.md` | 三個「人當 API」、第一個要切的 BC、30 天計畫、評量分數 |

範本在 `workshop/day7/TEMPLATE.md`；驗收標準在 `docs/rubric.md`。

## 講師開場（15 分鐘）

- **[3 分] 今天沒有新方法論**：今天是把六天的東西變成「別人可以接手」的狀態。接手的人看 PR 描述、ADR、契約、README、CI，不看你的腦袋。
- **[3 分] Code review 的三個鏡頭**：DDD（聚合守不變條件、語言一致、事件先記錄）、六角（依賴方向、adapter 無決策）、測試品質（測試名 = 規則、沒有測實作細節、沒有 `.skip`）。`/review` 就照這三個鏡頭。
- **[3 分] CI 是最低的 DoD**：`npm test` / `pytest` 在乾淨機器上綠。`.github/workflows/ci.yml` 你自己寫；不要抄整份，理解每一行。
- **[2 分] PR 描述是文件**：連結 ADR-0001（為什麼這樣切）、ADR-0002（為什麼只做這些）、`contracts/`（別人怎麼接）。reviewer 讀完描述應該不用問「為什麼」。
- **[2 分] Retro 誠實、backlog 具體**：Sprint 2 三件事——Billing 合併出帳、Dispatch 真派工、Parking 真整合。每件要有事件契約與驗收條件，不是一句話。
- **[2 分] 帶回公司**：這七天的方法在你公司裡的第一個落點。`/takeaway` 幫你整理成 30 天計畫。主控台最終評量 ≥ 80% 過關。

## 先讀（20 分鐘）

| 檔案 | 時間 | 讀什麼 |
|---|---|---|
| `docs/references/sdlc.md` | 10 分 | Code review checklist、CI 最小配置、PR 描述格式、retro 格式、backlog 寫法 |
| `docs/rubric.md` Day 7 與總評 | 5 分 | 評量項目與權重 |
| 你的 `workshop/day3/adr/*.md`、`workshop/day6/README-mvp.md` | 5 分 | PR 描述要引用它們；先看一遍有沒有過時的內容要更新 |

---

## Block 1（90 分鐘）— `/review` Code review、重構一輪、補漏測

### 目標
用三個鏡頭審自己的碼；修 ≥ 3 條；每條修改有測試守住；全綠。

### 步驟
1. **（10 分，不開 Claude）** 自己先審：開 `git diff main...HEAD --stat`，列出你覺得最心虛的三個檔案（通常是 Day 6 趕出來的 adapter、Day 5 的 PM）。
2. **（30 分）** `/review`。它會回一張表（檔名:行號 | 鏡頭 | 問題 | 嚴重度）。你決定每條：修 / 不修（理由寫進 `pr.md`）。
3. **（40 分）重構，仍然 TDD**：每條要修的——先確認有測試守住行為（沒有就先補紅→綠），再重構，測試不動仍綠，一條一個 commit（`refactor: ...`）。常見的三類：
   - 應用層長出規則（`if status === ...`）→ 移回聚合方法，聚合測試補一條。
   - adapter 長出決策（route handler 判斷授權）→ 移回處理器 / port。
   - 測試測實作（斷言私有欄位、斷言呼叫順序）→ 改成斷言事件與狀態。
4. **（10 分）補漏測**：用覆蓋率工具看一眼（Node：`npx vitest run --coverage`；Python：`pytest --cov=src`），只補**規則**的缺口，不追求數字。R6、R7 若只有部分實作，確認它們的最小測試在。

### 貼給 Claude Code 的提示
```
/review

Day 7 Block 1。請直接讀 starter/<lang>/src/ 與測試目錄，用三個鏡頭審查：DDD（不變條件、通用語言、事件先記錄後拉取、聚合零 I/O）、六角（依賴方向、adapter 不做決策、OCPP 只在 ACL）、測試品質（測試名 = 規則、不測實作細節、無 skip）。
輸出一張表：檔名:行號 | 鏡頭 | 問題 | 嚴重度（高 / 中 / 低）| 你要問我的一個問題。
規則：
- 不要給修改後的碼。
- 每個問題附「哪個測試（現有或應新增）能守住這個行為」。
- 至少找出 5 條；如果你認為程式碼很乾淨，找出 5 條「可以更好但不必修」並標低。
最後給「下一個最小步驟」。
```

### 你自己要做的
- 決定修哪些。`/review` 的嚴重度是它的意見；你的理由才是 PR 描述要寫的。
- 重構前先跑測試確認綠、重構後再跑——中間不寫新功能。

### 常見卡點
- **`/review` 列了 20 條** → 只修「高」和你認同的「中」；其餘進 `sprint-2-backlog.md` 的「技術債」段。
- **重構後某個 E2E 步驟壞了** → 先 `git stash`，用測試找是哪一層；E2E 不是重構的安全網，單元測試才是。
- **覆蓋率很低但不知道補什麼** → 只補 R1–R8 與整合事件的行為；adapter 的 glue 不用追。

### 產出
- ≥ 3 個 `refactor:` commit，全綠。
- `pr.md` 的「修了 / 沒修（理由）」兩段草稿。

---

## Block 2（90 分鐘）— GitHub Actions CI、開 PR

### 目標
`.github/workflows/ci.yml` 在 push 與 PR 時跑測試與契約驗證並綠燈；PR 描述附 ADR 與契約連結。

### 步驟
1. **（30 分）寫 CI**：檔案 `.github/workflows/ci.yml`，**自己寫**，期待的內容：
   - `on: { push: { branches: ["workshop/**", "main"] }, pull_request: {} }`
   - job `node`（`if` 你的 LANG 是 node，或兩個 job 都放、對方的用 `continue-on-error` / 條件跳過）：`ubuntu-latest` → `actions/checkout@v4` → `actions/setup-node@v4`（`node-version: 20`，`cache: npm`，`cache-dependency-path: starter/node/package-lock.json`）→ `working-directory: starter/node` 下 `npm ci` → `npm test`。
   - job `python`：`actions/setup-python@v5`（`python-version: "3.11"`，`cache: pip`）→ `working-directory: starter/python` 下 `pip install -r requirements.txt` → `pytest`。
   - job `contracts`：驗證 `contracts/examples/*.json` 對 Schema（Node：`npx ajv-cli validate -s contracts/<schema>.json -d contracts/examples/<example>.json`，或直接跑 Day 5 那個 `schemas` 測試；Python：`python -m jsonschema`）。
   - 選配 job `e2e`：啟動 API（SQLite）於背景 → 跑 `scripts/e2e` → 失敗就上傳 log（`actions/upload-artifact@v4`）。
   - `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`；`timeout-minutes: 15`。
   本機先驗語法：`npx yaml-lint .github/workflows/ci.yml` 或 `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"`。
2. **（10 分）** commit、push 你的分支（**這是本週唯一一次教材要你 push**）：`git push -u origin workshop/<你的名字>`。到 GitHub 看 Actions 是否跑起來。紅了看 log 修，通常是 `working-directory`、cache 路徑或 lockfile。
3. **（30 分）開 PR**：base 依講師指示（自己的 fork 的 `main`，或課程 repo 的 `workshop-submissions`）。描述結構：
   ```
   ## 這個 PR 做了什麼
   MVP1：Charging 核心 + AssetOps 工單開立 + Billing 草稿帳單；Parking / Dispatch 為 stub。
   ## 為什麼這樣切
   - ADR-0001 <連結 workshop/day3/adr/0001-*.md>
   - ADR-0002 <連結 workshop/day3/adr/0002-*.md>
   ## 別人怎麼接
   - 事件契約 <連結 contracts/>，去重鍵：Billing sessionId、AssetOps chargerId+faultCode
   - README <連結 workshop/day6/README-mvp.md>
   ## 怎麼驗
   npm test / pytest；scripts/e2e；CI 連結
   ## 已知限制
   （從 README-mvp.md 複製）
   ## Review 紀錄
   修了：… / 沒修（理由）：…
   ```
4. **（20 分）** 用 `/adr` 檢查 PR 描述引用的 ADR 是否過時（例如 Day 6 發現 `ReportFault` 其實放在 AssetOps 應用層，ADR-0002 有沒有反映）；過時就補 ADR-0003 或更新狀態（`Superseded by`）。把 PR 連結、CI 狀態寫進 `pr.md`。

### 貼給 Claude Code 的提示
```
/ta

Day 7 Block 2。我寫了 .github/workflows/ci.yml（請直接讀檔），還沒 push。
請不要重寫它。請逐 job 問我：
1. 這個 job 在乾淨的 ubuntu-latest 上會缺什麼（lockfile、Node / Python 版本、working-directory、環境變數）？
2. cache 的 key 路徑對嗎？
3. 契約驗證 job 用的指令，本機跑過了嗎？
4. 如果我只想跑我的 LANG，另一個 job 我打算怎麼處理？
最後給「下一個最小步驟」。我 push 之後如果紅了，我會貼 log 給你。
```
```
/adr

Day 7 Block 2。請讀 workshop/day3/adr/0001-*.md、0002-*.md，對照 starter/<lang>/src/ 的實際結構與 workshop/day6/README-mvp.md，
指出 ADR 裡「已經和現況不符」的句子（引用原句），問我要更新、標 Superseded、還是寫 ADR-0003。不要替我改 ADR。最後給「下一個最小步驟」。
```

### 你自己要做的
- `ci.yml` 每一行都要知道為什麼。Claude 可以問你問題、看 log，不該替你生成整份。
- PR 描述。這是你這週寫給「下一個人」的第一份文件。

### 常見卡點
- **CI 紅：找不到 lockfile** → `cache-dependency-path` 要指到 `starter/node/package-lock.json`；Python 用 `cache-dependency-path: starter/python/requirements.txt`。
- **CI 紅：SQLite 驅動在 CI 編譯失敗** → Node 用預編譯版本或 `node:sqlite`（Node 22）；或測試時 `DB_PATH=:memory:`。
- **CI 紅：`pytest` 找不到 `src`** → `pyproject.toml` 的 `pythonpath` 或 `pip install -e .`；本機能跑是因為你在 venv 內 `cd` 對了。
- **PR 太大沒人看** → 描述先寫「從哪裡開始看」：`src/charging/domain/ChargingSession` → 測試 → `contracts/`。
- **想順手 push 到 `main`** → 不要。分支 `workshop/<名字>`，PR 進講師指定的 base。

### 產出
- `.github/workflows/ci.yml` 綠燈。
- PR 開好、描述齊全；`workshop/day7/pr.md` 有連結、CI 狀態、review 紀錄。

---

## Block 3（90 分鐘）— Retro、Sprint 2 backlog、最終評量、`/takeaway`

### 目標
誠實的 retro；三件 Sprint 2 事項寫到可以直接開工；主控台評量 ≥ 80%；帶回公司的 30 天計畫。

### 步驟
1. **（25 分）Retro**，用 `/retro`。先自己寫（不開 Claude）10 分鐘：Keep 三條、卡最久的三處（各附「當時缺的是什麼：知識 / 工具 / 決定」）、重來 Day 1 就會做的事、對助教的用法（哪種提示有用、哪種沒用）。然後貼給 `/retro` 讓它追問。
2. **（30 分）Sprint 2 backlog**，`sprint-2-backlog.md`：三件必列——
   - **Billing 合併出帳**：訂閱 `parking.session.closed.v1` + `charging.session.completed.v1`，以 `plate` / `parkingSessionId` 與 `sessionId` 的關聯（需要哪個新欄位？誰提供？→ 契約升版 `v2` 或新事件），一張 `Invoice` 兩個明細；R7 完整版（`InvoiceAdjusted`）。
   - **Dispatch 真派工**：`ops.work_order.opened.v1` → 技術員、路線、SLA、備品預留；離線執行、回報後對齊；「一張工單同一時間一個主責技術員」不變條件；stub 換真實作只改 adapter。
   - **Parking 真整合**：LPR → `parking.vehicle_entered.v1`；月票 / 臨停；R6 人工放行 `ParkingManuallyReleased` 與斷線對齊；Parking ↔ Charging 的 Partnership 要不要雙向事件。
   每項：Context、需要的新事件 / 契約、驗收條件（GWT 一條）、估點、依賴。再加「技術債」段：B1 沒修的 review 項目、Day 6 已知限制（樂觀鎖、relay 單程序、認證、`stillEnergized` 推導）。
3. **（15 分）最終評量**：開主控台 `index.html` → Day 7 → 評量。≥ 80% 過關；沒到就看錯的題對應哪一天的 quiz，回去重讀那一段再考一次。分數寫進 `takeaway.md`。
4. **（20 分）`/takeaway`**：產出「帶回公司清單」：你公司裡三個「人當 API」的交接點、第一個要切的 Bounded Context（用今天學的四種線索說理由）、30 天行動計畫（週 1 訪談 3 人；週 2 一場 2 小時 event storming；週 3 一份 ADR + 一個聚合的 TDD；週 4 一條 Outbox 的整合事件）。

### 貼給 Claude Code 的提示
```
/retro

Day 7 Block 3。這是我自己先寫的 retro 草稿（workshop/day7/retro.md，請直接讀檔）。
請不要重寫。對「卡最久的三處」各追問一次：「當時缺的是知識、工具、還是一個沒人幫你做的決定？」；
對「重來會做的事」問：「這件事在 Day 1 的哪個 Block 可以做？要花多久？」；
對「助教用法」問：「哪一次你要到了答案卻沒學到？」
然後幫我把 Sprint 2 backlog 的三件事各檢查：Context、新事件 / 契約、驗收 GWT、估點、依賴——缺的欄位列出來讓我填。
最後給「下一個最小步驟」。
```
```
/takeaway

Day 7 Block 3。請讀 workshop/day1/as-is.md、workshop/day3/context-map.md、workshop/day7/retro.md，
然後只用提問幫我完成 workshop/day7/takeaway.md：
1. 問我公司裡三個最像「阿忠打電話給總部」的交接點（一次問一個，我答完再問下一個）。
2. 問我：如果只能切一個 Bounded Context，用四種線索（語言衝突 / 生命週期 / 一致性 / 獨立存活）的哪一種最站得住？
3. 30 天計畫：每週一件事，問我「這件事需要誰點頭？」
整理成 takeaway.md 的骨架（只放我的答案，不加你的建議）。最後給「下一個最小步驟」。
```

### 你自己要做的
- Retro 的誠實度。「都很好」的 retro 對三個月後的你沒用。
- Backlog 的估點與依賴——這是你判斷，Claude 只能問你「這件事依賴哪個契約升版」。
- 評量自己考；錯的題回去讀，不要問 Claude 答案。

### 常見卡點
- **Backlog 寫成功能清單**（「做 Dispatch」）→ 每項要有 GWT 驗收條件與新事件名。寫不出事件名就代表還沒想清楚，那正是 Sprint 2 第一天要做的 event storming。
- **評量 < 80%** → 錯題通常集中在某一天；回去看那天的 Check-out quiz 答案與 `docs/references/` 對應章節，再考。
- **帶回公司清單太抽象**（「推廣 DDD」）→ 只寫「下週一我會約誰、問什麼」。

### 產出
- `workshop/day7/retro.md`、`sprint-2-backlog.md`（三件 + 技術債）、`takeaway.md`（含評量分數）。
- 全部 commit、push 到 `workshop/<你的名字>`，PR 更新。

---

## Check-out（30 分鐘）

### Quiz（5 題）
1. `/review` 指出「route handler 內判斷憑證是否有效」——這違反哪個鏡頭？應該移到哪一層？
2. CI 的 `contracts` job 在守什麼？如果有人改了 `charging.session.completed.v1.json` 拿掉 `energyWh`，哪個測試會紅？
3. PR 描述為什麼要連結 ADR-0002 而不是只寫「MVP1 做了 Charging」？
4. Sprint 2 的「Billing 合併出帳」需要把停車會話與充電會話對上——現在的兩個契約有共同鍵嗎？沒有的話你會升版哪個事件、加哪個欄位、為什麼是 `v2` 而不是直接改 `v1`？
5. 你公司裡的一個「人當 API」交接點，用這七天的哪三個工具（訪談 / storm / 契約 / Outbox / ACL…）可以在 30 天內改成事件驅動？

<details>
<summary>參考答案</summary>

1. 六角（adapter 不做決策）與 DDD（授權是領域 / 應用層的規則 R2）。移到 `StartCharging` 處理器透過 `AuthorizationPort` 判斷，聚合記錄 `ChargingStartRejected(Unauthorized)`；handler 只映射回應碼。
2. 守「契約沒有被默默改壞」：Day 5 的 `every example validates against its schema` 與 `StopCharging output validates against charging.session.completed.v1` 會紅（範例與處理器輸出都還帶 `energyWh`，但 Schema 若加 `additionalProperties: false` 或 required 變動就會失敗）。
3. ADR 記錄替代方案與後果；reviewer（與三個月後的自己）需要知道「為什麼不先做 Billing 合併出帳」與「不做什麼」，才能判斷 PR 的取捨是否合理，也才能在 Sprint 2 知道哪些假設可以推翻。
4. 目前 `charging.session.completed.v1` 沒有 `plate` / `parkingSessionId`；`parking.session.closed.v1` 有 `plate` 但沒有 `sessionId`。可選：`charging.session.started.v1` 升 `v2` 加 `plate?`（由 Parking ↔ Charging 的 Partnership 在插槍時對應），或新增關聯事件。用 `v2` 是因為既有消費者（Billing 草稿）依 `v1` Schema 驗證；改 `v1` 會讓舊消費者與舊範例同時失效，違反「契約改欄位要升版」。
5. 例：訪談（找出交接點兩端的人與詞）→ storm（把交接點變成一個事實，例如 `ChargerFaulted`）→ 契約 + Outbox（上游記錄事件、下游冪等消費），必要時 ACL 隔開舊系統的語言。
</details>

### 交付物自評
- [ ] `/review` ≥ 3 條已修、各有測試、`refactor:` commit；沒修的有理由
- [ ] `.github/workflows/ci.yml` 自己寫、綠燈；含測試 + 契約驗證
- [ ] PR 已開，描述含 ADR-0001、ADR-0002、`contracts/`、README、已知限制、review 紀錄；`pr.md` 有連結
- [ ] `retro.md` 四段誠實；`sprint-2-backlog.md` 三件 + 技術債，每件有 context / 事件 / GWT / 估點 / 依賴
- [ ] `takeaway.md` 三個交接點、一個 BC、30 天計畫、評量分數 ≥ 80%
- [ ] 全部 push 到 `workshop/<你的名字>`

### 用 /checkout 讓助教檢查
```
/checkout day7

今天是 Day 7，也是最後一天。請對照 docs/rubric.md 的 Day 7 DoD 與總評：
1. 跑測試貼摘要；確認沒有 .skip / xfail。
2. 讀 .github/workflows/ci.yml，指出你認為在乾淨機器上會失敗的一行（如果有）。
3. 讀 workshop/day7/ 四個檔案，每個檔案回「過 / 不過 + 一句理由」。
4. 用 docs/rubric.md 的總評項目替我做一次七天總自評（每項 過 / 不過），列出「不過」的項目對應哪一天的哪個 Block。
最後給「下一個最小步驟」——這次是「回公司後的第一個最小步驟」。
```

---

## 如果你落後了

最小可行版本（約 3.5 小時）：
- B1 `/review` 只修 1 條「高」，其餘全部進 backlog 技術債。
- B2 CI 只跑你的 LANG 的測試 job（跳過契約與 e2e job）；PR 描述至少有 ADR 兩個連結與「怎麼驗」。
- B3 retro 三段各一條；backlog 三件各寫「Context + 一個新事件名 + 一條 GWT」；`/takeaway` 只做 30 天計畫；評量考一次，分數如實記錄。

## 延伸

- CI 加 e2e job（SQLite，背景啟動 API，跑 `scripts/e2e`，失敗上傳 log）。
- 寫 ADR-0003「Outbox relay 的部署方式」（同程序 vs 獨立程序 vs DB trigger），附 Day 6 `/ship` 的問題與你的答案。
- 把 `docs/days/README.md` 的七天地圖對照你的 retro，寫一段「我會怎麼改這門課」寄給講師（或開 issue 到 https://github.com/clarencechien/dddguide ）。
- 在你公司 repo 裡建一份 `CLAUDE.md`，把這裡的助教規則（蘇格拉底式、20 分鐘、TDD、通用語言、零 I/O 聚合、Outbox）改寫成你們團隊的版本——那就是帶回公司的第一個 artifact。
