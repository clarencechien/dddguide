# Day 3 — 戰略設計：Bounded Context、Context Map、C4、ADR

**一句話目標**：今天結束時，你從自己的 storm board 推導出一組 Bounded Context（不是抄的），
用關係模式畫出 Context Map，畫出 C4 前兩層，並用兩份 ADR 把「為什麼這樣切」與「MVP1 只做哪些」寫成可以被挑戰的決策。

## 今天結束你會拿到

| 交付物 | 路徑 | 最低要求 |
|---|---|---|
| Context Map | `workshop/day3/context-map.md` | 邊界推導紀錄（四種線索）；context 清單含不變條件、獨立存活、Core/Supporting/Generic；Mermaid 圖；每條關係有模式與理由；至少一個推翻過的切法 |
| C4 | `workshop/day3/c4.md` | System Context + Container（MVP1）Mermaid；每個箭頭對到一個事件或 API |
| ADR-0001 | `workshop/day3/adr/0001-<slug>.md` | context 切法；≥ 2 個替代方案；後果 |
| ADR-0002 | `workshop/day3/adr/0002-<slug>.md` | MVP1 範圍；為什麼是這三塊；不做什麼 |

範本在 `workshop/day3/TEMPLATE.md`；驗收標準在 `docs/rubric.md`。

## 講師開場（15 分鐘）

- **[3 分] 今天的禁令解除一半**：前兩天助教不准講 Bounded Context。今天你們要**自己**切出來，切完才准打開 `docs/curriculum.md` §1.4 對答案。切得跟官方不一樣不扣分，**說不出理由**才扣分。
- **[4 分] 邊界的四種線索**（寫白板）：
  1. 語言衝突：同一個詞在兩群人嘴裡意思不同（「會話」對阿忠是停車、對小美是充電）。
  2. 生命週期不同：充電會話活 30 分鐘、工單活 3 天、帳單活 5 年。
  3. 一致性要求不同：「一個連接器一個進行中會話」要立刻守；「帳單金額對齊」可以晚點。
  4. 獨立存活：總部掛了，閘門要能開；OCPP 在場站，總部只訂閱結果。
- **[3 分] 關係模式只講四個**：ACL（防腐層，翻譯別人的語言）、Partnership（伙伴，一起改）、Customer-Supplier（顧客—供應者，上游事件是契約）、Conformist（遵奉者，照單全收）。每個模式在今天的地圖上至少出現一次。
- **[2 分] MVP1 不是全部**：切出五塊之後只做三塊。ADR-0002 要寫清楚**不做什麼**與**為什麼**。
- **[2 分] ADR 是給三個月後的自己看的**：背景、決策、替代方案、後果。沒有替代方案的 ADR 不叫決策叫公告。
- **[1 分] 交付物**：四個檔案。`adr/` 是子目錄。

## 先讀（30 分鐘）

| 檔案 | 時間 | 讀什麼 |
|---|---|---|
| `docs/references/ddd-strategic.md` | 15 分 | Bounded Context 的定義、Core / Supporting / Generic、Context Map 關係模式（ACL、Partnership、Customer-Supplier、Conformist、Open Host、Published Language） |
| `docs/references/c4.md` | 5 分 | Level 1 / Level 2 各畫什麼、不畫什麼；Mermaid `C4Context` / `C4Container` 語法 |
| `docs/references/adr.md` | 5 分 | ADR 格式與「什麼值得寫 ADR」 |
| 你的 `workshop/day2/storm-board.md` 樞紐事件 + hotspots | 5 分 | 樞紐事件的左右兩邊「在乎的人」——那是今天的起點 |

**還是不要看** `docs/curriculum.md` §1.4 與 `docs/diagrams/context-map.*`，B2 結束才看。

---

## Block 1（90 分鐘）— 找邊界

### 目標
從 storm board 用四種線索切出一組 context，每個 context 說得出：它說的話、守的不變條件、獨立存活的要求。助教只提問不給答案。

### 步驟
1. **（25 分，不開 Claude）** 開 `context-map.md`，四個小節各填 ≥ 2 條證據，全部引用 Day 1–2 的檔案：
   - 語言衝突：從 `glossary.md` 的「不是」欄找。例：「會話」「放行」「開始」在不同角色的意思。
   - 生命週期：從 storm board 找活得長短明顯不同的聚合候選。
   - 一致性：從 `rules.md` 找「立刻守」vs「可延遲」的規則。
   - 獨立存活：從 Day 1 訪談的「斷線時怎麼辦」找。
2. 把樞紐事件當剪刀：每條垂直線的左右兩邊，「在乎的人」與「用的詞」如果都換了，那裡就是一條候選邊界。
3. 列 context 清單。每個一行：名字（中英）、說的話（3–5 個 glossary 詞）、不變條件（1 條）、獨立存活（1 句）。**3–7 個**都合理，少於 3 通常是沒切開，多於 7 通常是把聚合當 context。
4. 分類 Core / Supporting / Generic：哪一塊是這家公司賺錢與差異化的（Core）？哪一塊必要但不差異化（Supporting）？哪一塊買現成的就好（Generic，例如發票開立、LPR 車牌辨識）？
5. **（45 分）** 用 `/context-map` 讓助教挑戰。它會問「這兩個 context 為什麼不合併？」「這個 context 守得住那條不變條件嗎？」——每個問題的答案寫進「邊界推導紀錄」。
6. **（20 分）** 至少推翻一次自己的切法，把推翻前後都留在檔案裡（「我推翻過的切法」小節）。

### 貼給 Claude Code 的提示
```
/context-map

Day 3 Block 1。我從 workshop/day2/storm-board.md 推導出這組 context（含四種線索的證據、不變條件、獨立存活、Core/Supporting/Generic）：
<貼上 context-map.md 目前內容>

請你只提問、不給答案，也不要說「官方答案是幾個」。針對每個 context 各問我一個「為什麼它不能併進隔壁那個」的問題；
針對每條不變條件問我「這條規則在哪個時刻必須成立？它會跨到別的 context 嗎？」；
針對獨立存活問我「總部斷線 30 分鐘時，這個 context 哪些命令還能執行？」。
如果你認為我有兩個 context 其實是同一個聚合的兩面，只說「第 N 個和第 M 個」，不說理由。
最後給「下一個最小步驟」。
```

### 你自己要做的
- 切。這是今天最核心的判斷，Claude 只能問你問題。
- 決定 Core 是哪一塊，並寫一句「如果只有錢做一塊，做哪塊」的理由。
- 命名 context（中英）。用你 glossary 裡的詞，不要用系統名（「後台」「總部系統」不是 context 名）。

### 常見卡點
- **只切出兩塊：「場站」和「總部」** → 那是部署位置不是語言邊界。問：場站裡「停車放行」和「充電授權」用的詞一樣嗎？守的規則一樣嗎？
- **切出十塊** → 「連接器」「計量」「憑證」各一塊通常是把聚合或值物件當 context。問：它們有各自的一群人在乎、各自的一套詞嗎？
- **帳務找不到不變條件** → 回 `rules.md` 的 R7：帳單開立後金額不可變。那是它自己的規則、自己的生命週期。
- **不知道故障那段算誰的** → 「樁自己說壞了」和「總部承諾去修」是兩件事：一個是設備健康的事實，一個是對一根故障的承諾（工單）。守 R5 的是哪邊？
- **Generic 分不出來** → 問「這件事有沒有可以直接買的 SaaS？」發票、車牌辨識、簡訊通知通常是。

### 產出
`workshop/day3/context-map.md` 前半：邊界推導紀錄（四小節、每節 ≥ 2 條證據）、context 清單表（3–7 個、四欄齊全、Core/Supporting/Generic）、推翻過的切法 ≥ 1。

---

## Block 2（90 分鐘）— Context Map 與關係模式

### 目標
把 context 之間的每條線標上模式（ACL / Partnership / Customer-Supplier / Conformist）與理由，產出 Mermaid 圖，然後才對官方答案。

### 步驟
1. **（20 分，不開 Claude）** 列出所有「一個 context 需要知道另一個 context 發生了什麼」的箭頭。每條箭頭寫：上游 → 下游、傳什麼（用 Day 2 的事件名）、下游可不可以回頭改上游。
2. 每條箭頭選模式：
   - 下游要翻譯上游的語言（OCPP 的 `StatusNotification` 進來要變成 `ChargerFaulted`）→ **ACL**。
   - 兩邊一起改、互相配合（停車與充電都在場站、都碰車位）→ **Partnership**。
   - 上游事件是契約、下游不得回呼改上游（帳務拿到 `ChargingCompleted` 就出帳，不能回頭凍結會話）→ **Customer-Supplier**。
   - 下游照單全收上游語意、自己不翻譯（工單系統直接接受「充電器已申告故障」）→ **Conformist**。
3. 對每條線寫**一句反例**：「如果不用這個模式，會發生什麼？」（例：Billing 不是 Customer-Supplier 而是能回呼 → 帳務系統慢的時候充電結束會卡住。）
4. **（40 分）** 用 `/context-map` 產 Mermaid 圖並審查關係。它可能會挑戰「這條為什麼是 Partnership 不是 Customer-Supplier」——答得出來就保留，答不出來就改。
5. **（15 分）** 現在打開 `docs/curriculum.md` §1.4 與 §1.4 下的 Context Map 關係清單。逐條比對，把差異寫進 `context-map.md` 的「與官方版差異」小節：**每個差異寫「我為什麼這樣切」或「我接受官方版，因為…」**。
6. **（15 分）** 修正圖。決定最終 context 名稱從此固定（可以用官方的 Parking / Charging / Billing / AssetOps / Dispatch，也可以保留自己的，但 Day 4 起程式碼目錄 `src/charging`、`src/assetops`、`src/billing` 是固定的）。

### 貼給 Claude Code 的提示
```
/context-map

Day 3 Block 2。這是我的 context 清單與每條關係的模式 + 理由 + 反例：
<貼上>

請：
1. 產一張 Mermaid flowchart 的 context map：節點是 context，邊上標模式（ACL / Partnership / Customer-Supplier / Conformist）與流過的事件名。只用我提供的名字與事件名，不要加你認為應該有的節點。
2. 對每條邊挑戰一次：「如果下游掛了 30 分鐘，上游會怎樣？」——我的模式選擇如果讓上游被拖住，請指出是哪條邊（不說要改成什麼）。
3. 我把「OCPP」畫成一個 context 了嗎？如果有，問我「OCPP 有自己的一群業務人員嗎？」
4. 最後給「下一個最小步驟」。
```

### 你自己要做的
- 對官方答案時**先寫自己的理由再改**。「因為官方這樣寫」不是理由。
- 決定 Parking ↔ Charging 那條線：你覺得是 Partnership 還是單向事件？兩者在 Day 5 的實作會不一樣（stub 的方向）。

### 常見卡點
- **所有線都畫成雙向** → Context Map 的箭頭是「誰的語言 / 誰的事件流向誰」。雙向通常代表你還沒決定誰是上游。
- **把 OCPP 畫成 context** → OCPP 是協定，不是一群人的語言。它是 Charging 的**外部系統**，中間隔一層 ACL。
- **AssetOps → Dispatch 想發整合事件給 Billing** → §1.4 最後一條：「不對顧客帳務發『技術員已出發』」。維修成本是第三種錢，但不走顧客帳單。
- **Mermaid 不會渲染** → 邊的 label 不要有括號和冒號以外的特殊字元；先用 `flowchart LR`，`C4Context` 留到 B3。

### 產出
`workshop/day3/context-map.md` 完整：Mermaid 圖、關係表（每條有模式、理由、反例）、「與官方版差異」小節（每條差異有理由）。

---

## Block 3（90 分鐘）— C4 與 ADR

### 目標
畫 C4 Level 1（System Context）與 Level 2（Container，MVP1 範圍），寫 ADR-0001（context 切法）與 ADR-0002（MVP1 範圍）。

### 步驟
1. **（25 分）** C4 Level 1：中間一個系統「EV Charge Ops」；外面是人（顧客、阿忠、小美、老陳、Vicky、阿豪）與外部系統（充電樁 via OCPP、既有停車場系統 / LPR、發票系統）。每條線寫「傳什麼」。
2. C4 Level 2（**只畫 MVP1**）：容器至少有——HTTP API（Node: Fastify / Python: FastAPI）、OCPP ACL、Charging 核心、AssetOps 工單、Billing 草稿消費者、Outbox + in-process bus、資料庫（SQLite，選配 Postgres）、OCPP 模擬器（`scripts/ocpp-sim`，測試用）。每個箭頭對到 Day 2 的事件名或一個 HTTP 命令。Parking 與 Dispatch 畫成虛線 stub。
3. **（20 分）** 用 `/c4` 產 Mermaid `C4Context` 與 `C4Container`，貼進 `c4.md`，檢查每個箭頭都能對到「§1.8 的整合事件」或「一個命令」。對不到的箭頭刪掉或改成事件。
4. **（30 分）** 用 `/adr` 建兩份 ADR：
   - `adr/0001-bounded-contexts.md`（slug 自訂）：決策 = 你的 context 切法。替代方案 ≥ 2（例：「場站 / 總部兩塊」、「Charging 與 Parking 合併為 Site」）。後果：好的（例：斷線時 Parking 可獨立）、壞的（例：帳務要處理兩個上游的事件對齊）、要監看的。
   - `adr/0002-mvp1-scope.md`：決策 = MVP1 只做 Charging + AssetOps 工單開立 + Billing 草稿；Parking 與 Dispatch 只做事件契約與 stub。替代方案（例：先做 Billing 合併出帳、先做 Parking 整合）。**不做什麼**要明列。
5. **（15 分）** 用 `/adr` 審查兩份 ADR：它會問「替代方案為什麼輸」與「後果裡有沒有你其實不確定的」。

### 貼給 Claude Code 的提示
```
/c4

Day 3 Block 3。這是我的 context map（workshop/day3/context-map.md，請直接讀檔）與我列的人 / 外部系統 / MVP1 容器清單：
<貼上>

請產 Mermaid C4Context 與 C4Container 兩張圖，只用我列的元素。
畫完之後對每個箭頭問我：「這條線傳的是 docs/curriculum.md §1.8 的哪個事件，還是哪個命令？」——對不到的箭頭請標成「?」讓我自己決定刪或改。
不要把 Parking 與 Dispatch 畫成實體容器，用虛線 stub。最後給「下一個最小步驟」。
```
```
/adr

Day 3 Block 3。請用 docs/references/adr.md 的格式建立兩份 ADR 的空骨架到 workshop/day3/adr/0001-bounded-contexts.md 與 0002-mvp1-scope.md，
只放標題與小節，不要填內容。我填完之後會再叫你審查。
```
```
/adr

我填完了 workshop/day3/adr/0001-bounded-contexts.md 與 0002-mvp1-scope.md，請審查（直接讀檔）。
對每份：替代方案各問我「它在什麼情況下反而會贏？」；後果各問我「哪一條你其實不確定、打算怎麼驗證？」。
不要重寫我的文字。最後給「下一個最小步驟」。
```

### 你自己要做的
- ADR 的替代方案要**真的考慮過**，不是稻草人。至少一個替代方案你要能說「它在 X 情況下比較好」。
- 決定 MVP1 的「不做清單」：Billing 合併出帳、Dispatch 真派工、Parking 真整合、發票、月票——這些都留給 `sprint-2-backlog.md`（Day 7）。

### 常見卡點
- **C4 Level 2 畫了五個 context 的全部容器** → 只畫 MVP1。其他用虛線 stub，箭頭仍然標事件名（那是契約）。
- **ADR 沒有替代方案** → 至少寫「什麼都不切，一個 monolith 一個 schema」——它真的是替代方案，而且在小團隊常常是對的。
- **ADR 的後果只寫好的** → 每個決策都有代價；「帳務要對齊兩個上游的事件」「多一層 ACL 要維護」都是壞的後果。
- **Mermaid C4 語法錯** → `docs/references/c4.md` 有最小可用範本；先用最小範本跑通再加元素。

### 產出
- `workshop/day3/c4.md`：兩張圖，每個箭頭對到事件或命令。
- `workshop/day3/adr/0001-*.md`、`adr/0002-*.md`：狀態 Accepted、≥ 2 替代方案、好壞後果、`/adr` 審查過。

---

## Check-out（30 分鐘）

### Quiz（5 題）
1. 「會話」這個詞在阿忠和小美嘴裡不同，這是四種線索裡的哪一種？它讓你切出了哪兩個 context？
2. OCPP → Charging 為什麼是 ACL 而不是 Conformist？如果做成 Conformist，`StatusNotification` 會出現在哪裡？
3. Charging → Billing 是 Customer-Supplier。「帳務不得回呼凍結會話」這句話的意思是什麼？違反了會發生什麼？
4. Charging → AssetOps 是 Conformist：誰遵奉誰？AssetOps 收到 `ChargerFaulted` 之後可以要求 Charging 改事件格式嗎？
5. ADR-0002 裡 Parking 「只做事件契約與 stub」——stub 的意思是 MVP1 裡誰發 `parking.session.closed.v1`？誰收？

<details>
<summary>參考答案</summary>

1. 語言衝突。停車會話（`ParkingSession`，進場到放行）與充電會話（`ChargingSession`，授權到結束計量）→ Parking 與 Charging 兩個 context。
2. OCPP 是外部協定，不是我們的通用語言；ACL 把 `StatusNotification(Faulted)` 翻成 `ChargerFaulted`。做成 Conformist，`StatusNotification` 會滲進 `src/charging/domain/`，之後換 OCPP 版本（1.6J → 2.0.1）領域層要跟著改。
3. 上游事件是契約：Billing 訂閱 `charging.session.completed.v1` 出草稿帳單，但**不能**呼叫 Charging 的 API 去「鎖住」會話等它算完錢。違反了：Billing 慢或掛時充電結束會被拖住，場站獨立存活的要求就破了。
4. AssetOps 遵奉 Charging：接受 `ChargerFaulted` 的語意與欄位（chargerId、faultCode、stillEnergized…）。它不能要求 Charging 改；要翻譯就自己在 AssetOps 內翻。
5. MVP1 裡沒有人真的發——`contracts/` 裡有它的 JSON Schema 與範例，測試可以用 stub 發一筆假的來驗 Billing 消費者；Billing 收。真正的發布者是 Sprint 2 的事。
</details>

### 交付物自評
- [ ] `context-map.md`：四種線索各 ≥ 2 條證據、3–7 個 context 四欄齊全、Core/Supporting/Generic、Mermaid 圖、每條關係有模式 + 理由 + 反例、推翻過的切法 ≥ 1、與官方版差異每條有理由
- [ ] `c4.md`：Level 1 + Level 2（MVP1）；每個箭頭對到事件或命令；Parking / Dispatch 是虛線 stub
- [ ] `adr/0001-*.md`、`adr/0002-*.md`：替代方案 ≥ 2、好壞後果、`/adr` 審過
- [ ] 全部 commit 到 `workshop/<你的名字>`

### 用 /checkout 讓助教檢查
```
/checkout

今天是 Day 3。請對照 docs/rubric.md 的 Day 3 DoD 檢查 workshop/day3/ 的四個檔案（含 adr/ 子目錄）。
每項回「過 / 不過 + 一句理由」；不過的給一個問題。
另外請確認：我的 context 名稱與明天 starter 目錄（src/charging、src/assetops、src/billing）對得上嗎？對不上的話問我要用哪個。
最後給「下一個最小步驟」，以及明天 Day 4 開始前我應該把 rules.md 的哪幾條印出來放旁邊。
```

---

## 如果你落後了

最小可行版本（約 3 小時）：
- 邊界推導只寫「語言衝突」與「獨立存活」兩節，各 2 條證據。
- context 清單直接切 3 塊（充電、資產維運、帳務），每塊一條不變條件；B2 結束對照官方版補成 5 塊，差異寫理由。
- Context Map 只畫 MVP1 的三條線（OCPP → Charging ACL、Charging → Billing Customer-Supplier、Charging → AssetOps Conformist）。
- C4 只畫 Level 2。
- ADR-0001 一個替代方案；ADR-0002 只寫「做 / 不做」兩張清單。

## 延伸

- 替 Dispatch 寫 ADR-0003：離線執行、回報後對齊——它和 Parking 的獨立存活是同一種模式嗎？
- 畫 C4 Level 3（Component）只畫 Charging 容器內部：六角架構的 port / adapter 位置。明天會實際建這些目錄。
- 讀 `docs/diagrams/context-map.*` 與 `docs/diagrams/fault-saga.*`，找出一個你認為畫錯或畫得不清楚的地方，寫在 `context-map.md` 末尾。
