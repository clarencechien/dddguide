# 戰略 DDD（Strategic Domain-Driven Design）

> Day 3 B1–B2 的方法論。交付物：`workshop/day3/context-map.md`。用 `/context-map` 產 Mermaid 並挑戰你的邊界理由。
> **助教規則**：Day 1–2 不得先講五個 context；學員要自己推導出接近 curriculum §1.4 的答案。

## 讀完你會拿到

- 子領域（core / supporting / generic）與 Bounded Context 的差別，以及為什麼兩者常常不是一對一。
- 找邊界的四條線索：語言衝突、生命週期、一致性、團隊。
- 七種 Context Map 關係模式，每種都用我們的五個 context 舉例。
- 「超級充電平台」大泥球反模式的樣子，以及它怎麼從一個看起來合理的決定長出來。

---

## 1. 為什麼存在

Evans 的書有兩半：前半是戰術（entity、aggregate…），後半是戰略。他後來公開說：**如果重寫，戰略要放前面**。因為戰術模式用在錯的邊界裡，只會讓錯誤更精緻。

戰略 DDD 回答三個問題：

1. 這個系統裡哪些部分是「我們靠它賺錢 / 跟別人不一樣」的？（子領域）
2. 一個模型能管多大的範圍，超過就會自相矛盾？（Bounded Context）
3. 兩個模型之間怎麼講話，誰遷就誰？（Context Map）

在我們的領域裡，這三個問題的答案分別是：Charging 是核心；五個 context；OCPP 要被隔離、Billing 只能訂閱、AssetOps 遵奉 Charging 的語意。**但這些是 Day 3 結束時你自己推出來的，不是背的。**

---

## 2. 子領域（Subdomain）

子領域是**問題空間**的切分：業務本來就有的區塊，不管你寫不寫軟體。

| 類型 | 定義 | 判斷法 | 我們的例子 |
|---|---|---|---|
| **核心（Core）** | 公司靠它贏；做不好就輸 | 「競爭者做得比我們好，我們就完了」 | **Charging**：在停車場裡讓充電順、準、斷線也能賣 |
| **支援（Supporting）** | 必要，但沒有差異化；買不到只好自己做 | 「重要，但沒人會因為這個選我們」 | AssetOps（工單）、Dispatch、Parking（既有系統） |
| **通用（Generic）** | 每家都一樣；買現成或用開源 | 「市面上有 SaaS」 | Billing 的發票開立、身份驗證、通知 |

幾個容易搞錯的：

- **核心是相對的**。對充電樁製造商，OCPP 韌體是核心；對我們（停車場營運商），它是要隔離的外部系統。
- **Billing 在我們這裡不是核心**，即使它管錢。老陳的痛都是「對得起來」而不是「算得比別人好」。但 Billing 裡「合併停車與充電帳單」這一小塊有點差異化——所以 MVP1 只做「草稿帳單」這個最小消費者。
- **Parking 是既有系統**。它是支援子領域，但我們幾乎不會重寫它，只會接它的事件。

curriculum §1.4 的 MVP1 決定（Charging 核心 + AssetOps 工單 + Billing 草稿）就是「核心全做、支援做一小塊、通用先 stub」的標準配置。

---

## 3. Bounded Context（限界上下文）

Bounded Context 是**解空間**的切分：一個模型（含它的通用語言、程式碼、資料）能保持一致的邊界。

### 3.1 定義的三個部分

1. **一套語言**：在這個邊界裡，「會話」只有一個意思。
2. **一組不變條件**：邊界內的一致性由這裡保證（curriculum §1.4 的「一致性不變條件」欄）。
3. **一個部署 / 存活單位**：邊界內的東西可以獨立活著（「獨立存活」欄）。

### 3.2 我們的五個（Day 3 結束後才看）

| Context | 語言 | 不變條件 | 獨立存活 |
|---|---|---|---|
| Parking | 進場、車位、停車會話、放行 | 一輛車同時一個進行中停車會話 | 總部掛掉仍能開關閘 |
| Charging | 連接器、授權、計量、中止原因 | 一個連接器同時一個進行中會話 | OCPP 在場站；總部只訂閱結果 |
| Billing | 費率、帳單、發票、爭議 | 帳單開立後金額不可默默改 | 可延遲出帳，不可丟事件 |
| AssetOps | 樁、槍、韌體、健康、工單 | 一座樁同時一個進行中根因工單 | 總部主系統；場站只上報 |
| Dispatch | 技術員、路線、SLA、備品預留 | 一張工單同時一個主責技術員 | 可離線執行，回報後再對齊 |

**子領域 ≠ Bounded Context**。理想上一對一，但實務上：一個 Billing 子領域可能被實作成兩個 context（計價 vs 發票），或者既有的 Parking 系統可能同時涵蓋停車與一小部分計費。Day 3 你畫出四個或六個都可以接受，只要理由站得住。

---

## 4. 找邊界的四條線索

### 4.1 語言衝突

同一個字在兩群人嘴裡意思不同 → 邊界。`docs/domain/glossary.md` §3 列了八組。

- 「會話」：阿忠 vs 小美 → Parking / Charging。
- 「狀態」：OCPP vs 小美 vs Vicky vs 老陳 → 四個狀態機，至少三個 context。
- 「開單」：Vicky vs 老陳 → AssetOps / Billing。

**測試**：把兩群人放在同一個會議，他們會不會為一個詞吵架？會 → 兩個 context。

### 4.2 生命週期

兩個東西的「出生到死亡」不同步 → 邊界。

- `P-441`（14:02–14:33）與 `S-991`（14:04–14:31）：一個停車會話可以有零到多個充電會話。
- `S-991`（27 分鐘）與 `INV-778`（可能月底才開立，之後還可以 `InvoiceAdjusted`）。
- `WO-2208`（18:11 → 隔天）與 `ChargerFaulted`（一個瞬間）。

**測試**：A 結束時 B 一定結束嗎？不一定 → 兩個 context。

### 4.3 一致性

必須在同一個交易裡保證的東西在一起；可以晚一點對齊的分開。

- 「一個連接器同時一個會話」必須立即保證 → Charging 內。
- 「帳單金額 = 停車費 + 電費」可以延遲對齊（老陳說「晚一點沒關係，不能漏」）→ Billing 與上游分開。
- 「一根樁一張根因工單」必須立即保證 → AssetOps 內。

**測試**：如果這兩件事之間有 5 秒延遲，會有人受傷嗎？不會 → 可以分開。

### 4.4 團隊 / 組織

Conway 定律：系統結構會長成組織的樣子。與其對抗，不如利用。

- 場站（阿忠）vs 總部（Vicky）是兩個組織 → 兩個節點。
- Parking 是既有廠商系統 → 天然邊界。
- 帳務（老陳）月底才工作 → 節奏不同。

**測試**：這兩塊東西是同一群人在改嗎？不是 → 別放同一個 context。

### 4.5 Day 3 B1 的做法

1. 拿出 `storm-board.md`，把每個事件的「誰在乎」欄攤開。
2. 把樞紐事件（⭐）當切點。
3. 對每個切點問四個測試。
4. 得到 context 清單，**每個附一句不變條件與一句獨立存活條件**。
5. 對每個規則 R1–R8 標擁有的 context；一條規則跨兩個 context → 回頭重切。

`/context-map` 會問你「為什麼 Charging 與 AssetOps 不是同一個？」你要能用四條線索之一回答。

---

## 5. Context Map 關係模式

Context Map 是**現況圖**，畫的是「兩個 context 之間誰遷就誰」。Evans 原始七種 + Vernon 補充。上游（U）決定語言，下游（D）遷就。

### 5.1 Partnership（伙伴）
兩邊一起演進，一起發版，失敗一起扛。
**我們**：Parking ↔ Charging（curriculum：「伙伴 + 事件下游」）。「車位占用」與「充電開始」要對得上，但兩邊都不主宰對方；靠事件同步。

### 5.2 Shared Kernel（共享核心）
兩邊共用一小段程式碼 / schema，改動要兩邊同意。
**我們**：**沒有**。`contracts/` 裡的 JSON Schema 不是 shared kernel，它是 Published Language。工作坊刻意不用 shared kernel，因為它是大泥球的起點。

### 5.3 Customer–Supplier（顧客—供應者）
上游依下游的需求排優先序，但仍是上游決定語言。有正式的契約與測試。
**我們**：Charging / Parking → Billing。上游事件是契約；**帳務不得回呼凍結會話**（curriculum §1.4）。老陳可以要求 `energyWh` 用整數，但不能要求 Charging 在 Stop 時等 Billing 算完。

### 5.4 Conformist（遵奉者）
下游完全接受上游的語言，不翻譯。用在上游強勢或翻譯不值得時。
**我們**：Charging → AssetOps。AssetOps 直接接受 `ChargerFaulted` 的語意：`chargerId`、`faultCode`、`stillEnergized` 原樣進工單。為什麼不做 ACL？因為 `ChargerFaulted` 本來就是業務語言，翻譯沒有價值。

### 5.5 Anti-Corruption Layer（防腐層）
下游建一層翻譯，把上游的語言擋在外面。用在上游是外部系統、語言污染嚴重時。
**我們**：OCPP → Charging。`StatusNotification` 不是通用語言（curriculum §1.4）。`docs/domain/ocpp-primer.md` §3 是 ACL 的翻譯表；`hexagonal.md` 講它在程式碼裡的位置。

### 5.6 Open Host Service / Published Language（開放主機服務 / 公開語言）
上游定義一套公開的協定 / 格式，任何下游都用它。
**我們**：`contracts/*.json`（curriculum §1.8 的整合事件 v1）就是 Published Language；Outbox relay 就是 Open Host Service。Billing、AssetOps、Dispatch、場站看板都用同一套信封。

### 5.7 Separate Ways（各走各的）
兩邊沒有整合價值，乾脆不連。
**我們**：Dispatch ↔ Billing。Vicky 隱藏事實 4：帳務不該收到「技術員已出發」。維修成本（三種錢的第三種）MVP1 不算。

### 5.8 一張表

| 上游 → 下游 | 模式 | curriculum 原句 |
|---|---|---|
| OCPP → Charging | ACL | 防腐層；StatusNotification 不是通用語言 |
| Parking ↔ Charging | Partnership + 事件 | 伙伴 + 事件下游 |
| Charging → Billing | Customer–Supplier | 上游事件是契約，帳務不得回呼凍結會話 |
| Parking → Billing | Customer–Supplier | 同上 |
| Charging → AssetOps | Conformist | AssetOps 接受 ChargerFaulted 語意 |
| AssetOps → Dispatch | 內部（Customer–Supplier 或 Partnership 皆可） | 不對顧客帳務發「技術員已出發」 |
| AssetOps → Charging（closed） | Published Language | Charging 健康訂閱 `ops.work_order.closed.v1` |
| Dispatch ↔ Billing | Separate Ways | — |

Mermaid 原始碼在 `docs/diagrams/context-map.mmd`。

---

## 6. 反模式：「超級充電平台」大泥球

它是這樣長出來的，每一步都看起來合理：

1. **第一週**：「停車與充電都是同一輛車，用一個 `Session` 表就好，加個 `type` 欄。」
2. **第二週**：「OCPP 的 status 直接存進 `Session.status`，省得翻譯。」
3. **第三週**：「Billing 要算錢，直接 join `Session` 表。」
4. **第四週**：「故障也是 session 的一種狀態吧，`status = 'Faulted'`。」
5. **第五週**：「工單就掛在 session 上，加個 `work_order_id`。」
6. **第六週**：OCPP 升 2.0.1，`status` 列舉變了，Billing 的 SQL 壞了，工單查詢壞了，人工放行因為 `session.status` 卡在 `Charging` 而開不了閘。

症狀對照：

| 症狀 | 違反的線索 |
|---|---|
| 一個 `Session` 有 14 種狀態 | 語言衝突（四個狀態機被塞成一個） |
| 改 OCPP 版本會動到帳單 | 缺 ACL |
| 總部掛了場站不能放行 | 一致性線索（把可延遲的做成同步） |
| 一根樁 20 張工單 | 不變條件沒有擁有者 |
| Billing 的 SQL 讀 Charging 的表 | 沒有 Published Language，直接 shared database |

**Vernon 的診斷法**：畫一張圖，把所有模組之間的箭頭畫出來；如果它像一團毛線而不是一張有方向的圖，就是大泥球。

`/context-map` 在 Day 3 會故意提議「把 Parking 和 Charging 合成一個 Session context 比較簡單」，看你會不會用四條線索反駁。

---

## 7. 在本專案怎麼出現

| Day | 戰略 DDD 的影子 |
|---|---|
| 1 | 訪談本身就是在收集「語言衝突」 |
| 2 | 樞紐事件 = 邊界候選；「誰在乎」欄 = 訂閱者 |
| 3 | 直接做 |
| 4 | `src/charging/` 目錄就是一個 context；聚合不准 import 其他 context |
| 5 | 整合事件 = Published Language；Billing 消費者 = Customer–Supplier 的下游 |
| 6 | 兩個節點（site / HQ）= 獨立存活條件的物理實現 |
| 7 | ADR-0001 記錄邊界決定 |

---

## 8. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| 按技術分層切 context（API / DB / Service） | context 是按語言切，不是按層 |
| 按名詞切（Car context、Charger context） | 按流程 / 語言切；一個名詞可以在多個 context 有不同意思 |
| 五個 context 就要五個微服務 | context 是模型邊界，部署是另一件事；MVP1 是一個程序兩個節點 |
| 畫 context map 時畫「資料流」 | 畫的是「誰遷就誰」；箭頭方向是語言的方向 |
| 所有關係都畫成 Partnership | 那代表你沒想過誰是上游 |
| 為了「乾淨」給每個外部系統都做 ACL | Conformist 是合法選擇；翻譯要有價值才做 |
| 把 shared kernel 當捷徑 | 工作坊禁用 |

---

## 9. 延伸閱讀

- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software*, 2003, Part IV "Strategic Design"（第 14–15 章 Bounded Context 與 Context Map）。
- Eric Evans, *Domain-Driven Design Reference*, 2015（免費 PDF）。—— 模式的濃縮定義，30 頁。
- Vaughn Vernon, *Implementing Domain-Driven Design*, 2013, 第 2–3 章。—— 子領域 vs context 的最清楚說明。
- Vaughn Vernon, *Domain-Driven Design Distilled*, 2016, 第 2–4 章。—— 100 頁版本，Day 3 前一晚讀。
- Vlad Khononov, *Learning Domain-Driven Design*, 2021, 第 1–4 章。—— 子領域判斷法與 context 整合模式的現代整理。
- Nick Tune & Scott Millett, *Architecting for Scale with Domain-Driven Design* / Tune 的 "Core Domain Charts"（部落格）。—— 怎麼視覺化哪個子領域值得投資。
- Alberto Brandolini, "Strategic Domain Driven Design with Context Mapping", InfoQ, 2009。—— Context Map 的實務畫法。
- Melvin Conway, "How Do Committees Invent?", 1968。—— Conway 定律原文，4 頁。

---

## 自我檢查

1. 子領域與 Bounded Context 的差別是什麼？為什麼 Billing 是子領域裡的支援 / 通用，但仍需要自己的 context？
2. 用四條線索中的兩條，說明 Parking 與 Charging 為什麼要分開。
3. Charging → AssetOps 為什麼用 Conformist 而不是 ACL？OCPP → Charging 為什麼相反？
4. 「帳務不得回呼凍結會話」是哪種關係模式的約束？違反它會發生什麼？
5. 大泥球的六步裡，你在自己公司看過哪一步？當時的理由是什麼？
