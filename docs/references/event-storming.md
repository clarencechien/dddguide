# Event Storming（事件風暴）

> Day 2 B1–B2 的方法論。交付物：`workshop/day2/storm-board.md`。用 `/storm` 引導。

## 讀完你會拿到

- 三個層級（big picture → process → design）各自的目的與停止條件。
- 便利貼顏色的語意，以及在 Markdown + Mermaid 裡怎麼「貼」。
- 用 curriculum §1.7 的時間線 T0–T6 + F 做一個人的 Event Storming 的完整流程。
- 辨識「系統動作當事實」的三個測試。

---

## 1. 為什麼存在

Brandolini 在 2013 年發明 Event Storming，起因是：**沒有任何一個人知道整個流程**。阿忠知道場站、Vicky 知道總部、老陳知道錢，但沒人知道從 14:02 進場到 18:18 派工的全貌。

傳統做法是各部門寫需求文件，然後架構師「整合」。Event Storming 的做法是：把所有人關在一個房間，牆上貼一張無限長的紙，每個人把「發生過的事」用過去式寫在橘黃色便利貼上，按時間貼上去。兩小時後，牆上就是整個系統。

工作坊裡沒有房間也沒有那些人，所以我們做**一個人的 Event Storming**：你 + Claude（扮演五位角色的記憶）+ Markdown。品質會比真的工作坊差，但足以把 Day 3 的邊界找出來。

---

## 2. 便利貼顏色與語意

| 顏色 | 東西 | 寫法 | 例子 |
|---|---|---|---|
| 🟧 橘黃（yellow-orange） | **領域事件**（Domain Event） | 過去式，業務語言 | `ChargingStarted`, `ChargerFaulted` |
| 🟦 藍（blue） | **命令**（Command） | 祈使句 | `StartCharging`, `ReportFault` |
| 🟨 小黃（small yellow） | **角色**（Actor） | 人或系統 | 阿忠、車主、樁 |
| 🟪 淡紫（lilac） | **政策**（Policy） | 「每當 X 就 Y」 | 每當 `ChargerFaulted` 就 `OpenWorkOrder` |
| 🩷 粉紅（pink，大） | **聚合**（Aggregate） | 名詞 | `ChargingSession`, `WorkOrder` |
| 🟩 綠（green） | **讀模型 / 資訊**（Read Model） | 誰需要看什麼才能決定 | 場站看板：連接器可售狀態 |
| 🔴 亮粉 / 紅（hot pink） | **熱點**（Hotspot） | 問題、爭議、不確定 | 「跨時段怎麼計價？」 |
| ⬜ 白 / 粉紅小 | **外部系統** | 名詞 | OCPP 樁、LPR、ERP |

> 注意：原始 Event Storming 的命令是**藍色**、事件是**橘色**。有些教材把命令畫成橘色、事件畫黃色；本工作坊統一用上表，`/storm` 的輸出也是。

Markdown 裡沒有顏色，所以用**前綴**：

```markdown
- [E] ChargingStarted            ← 事件
- [C] StartCharging              ← 命令
- [A] 車主                        ← 角色
- [P] 每當 ChargerFaulted → OpenWorkOrder   ← 政策
- [AG] ChargingSession           ← 聚合
- [R] 連接器可售看板              ← 讀模型
- [!] 跨時段計價？                ← 熱點
- [X] OCPP 樁                     ← 外部系統
```

---

## 3. 三個層級

### 3.1 Big Picture（Day 2 B1，60 分鐘）

**目的**：把時間線攤開，只貼事件。找出熱點與樞紐事件（pivotal events）。

**規則**：
1. 只貼 🟧 事件。不准貼命令、不准貼系統。
2. 過去式。「充電已開始」可以，「開始充電」不行。
3. 不確定的直接貼，旁邊貼 🔴 熱點。
4. 貼完後從左到右**講一遍故事**（storytelling），講不順的地方就是缺事件。
5. 標樞紐事件：那些「之前與之後世界不一樣」的事件，通常是 context 邊界。

**停止條件**：能從 14:02 講到 18:18 不卡；熱點 ≥ 5 個。

### 3.2 Process Level（Day 2 B2，90 分鐘）

**目的**：對每個事件補「是誰、用什麼命令、觸發了什麼政策、需要看什麼資訊」。

**每個事件周圍的固定圖樣**：

```
[A] 角色 → [C] 命令 → [AG] 聚合 → [E] 事件 → [P] 政策 → [C] 下一個命令
                          ↑
                     [R] 讀模型（角色決定下命令前要看什麼）
```

**停止條件**：每個 🟧 至少有一個 🟦 與一個 🟨；每個 🟪 都指向一個 🟦。

### 3.3 Design Level（Day 4 才做）

把聚合定下來、把不變條件寫成規則。工作坊用 Example Mapping（`example-mapping.md`）與戰術 DDD（`ddd-tactical.md`）取代這一層。

---

## 4. 一個人怎麼做：Markdown + Mermaid + Claude

### 4.1 準備

1. 打開 `workshop/day1/interviews.md` 與 `to-be.md`。To-Be 的事實清單就是第一批便利貼。
2. 打開 `docs/curriculum.md` §1.7 的骨架表——**但先不要看**，自己貼完再對。
3. 輸入 `/storm` 開始。

### 4.2 Big Picture 步驟

**第一輪：亂貼**。不管順序，把所有想到的過去式事件列出來：

```markdown
## 事件池（未排序）
- [E] VehicleEntered
- [E] ChargingStarted
- [E] ChargerFaulted
- [E] 帳單已開立
- [E] 技術員已到場
- [E] 收到 StatusNotification        ← 等一下會被 /storm 打回票
- [E] ChargingCompleted
- [E] VehicleExited
- [E] 阿忠打了電話                     ← As-Is 的事，To-Be 不該有，貼到熱點
```

**第二輪：排時間線**。

```markdown
## 時間線（主線：一個正常的午後）
| T | 時間 | 事件 | 誰在乎 |
|---|---|---|---|
| T0 | 14:02 | [E] VehicleEntered | Parking |
| T1 | 14:03 | [E] ChargingBayOccupied | Parking, Charging? |
| T2 | 14:04 | [E] ConnectorPluggedIn | Charging |
| T3 | 14:04 | [E] ChargingStarted | Charging, Billing |
| T4 | 14:10, 14:20 | [E] EnergyMetered | Charging, Billing? |
| T5 | 14:31 | [E] ChargingCompleted | Charging, Billing |
| T6 | 14:33 | [E] VehicleExited | Parking, Billing |

## 支線：故障
| F | 時間 | 事件 | 誰在乎 |
|---|---|---|---|
| F0 | 18:10 | [E] ChargerFaulted | AssetOps, Dispatch |
| F1 | 18:11 | [E] 工單已開立 | Dispatch, 場站看板 |
| F2 | 18:15 | [E] ChargerFaulted（重複） | AssetOps |
| F3 | 18:18 | [E] 工單已派工 | Dispatch |
| F4 | 隔天 | [E] 工單已關閉 | Charging 健康, SLA |
```

**第三輪：熱點**。

```markdown
## 熱點
- [!] T1：車位占用但沒充電，誰知道？→ 阿忠隱藏事實 4
- [!] T3：跨時段怎麼算錢？→ 小美隱藏事實 1
- [!] T4：每次計量都要通知 Billing 嗎？
- [!] F2：重複申告要怎麼處理？→ Vicky 隱藏事實 1
- [!] T6：總部斷線時離場怎麼辦？→ 阿忠隱藏事實 1
- [!] 「充電中被拒絕」算事件嗎？（ChargingStartRejected）
```

**第四輪：樞紐事件**。用 `⭐` 標：

- ⭐ `ChargingStarted`：之前是停車的世界，之後是充電 + 計費的世界。
- ⭐ `ChargingCompleted`：之後 Billing 可以算錢了。
- ⭐ `ChargerFaulted`：之前是賣電，之後是修樁。

三個樞紐事件 → 三個明顯的邊界候選。Day 3 會用到。

### 4.3 Mermaid 時間線

```mermaid
timeline
  title SITE-TPE-01 的午後（ABC-1234 / CP-A12-2）
  section 停車與充電
    14:02 : VehicleEntered
    14:03 : ChargingBayOccupied
    14:04 : ConnectorPluggedIn : ChargingStarted ⭐
    14:10 : EnergyMetered
    14:20 : EnergyMetered
    14:31 : ChargingCompleted ⭐
    14:33 : VehicleExited
  section 故障
    18:10 : ChargerFaulted ⭐
    18:11 : 工單已開立 WO-2208
    18:15 : ChargerFaulted（重複申告）
    18:18 : 派工 TECH-HAO
```

### 4.4 Process Level 步驟

對每個事件補完整圖樣。以 T3 與 F0 為例：

```markdown
### T3 ChargingStarted
- [A] 車主 看 [R] 樁螢幕「請刷卡」
- [A] 車主 → [C] StartCharging(connectorId=CP-A12-2, idTag=TAG-MONTHLY-77, meterStart=105200)
- [AG] ChargingSession
- [E] ChargingStarted(sessionId=S-991) ／ [E] ChargingStartRejected(reason=ConnectorOccupied | Unauthorized)
- [P] 每當 ChargingStarted → Billing 建立草稿
- [P] 每當 ChargingStarted → Parking 標記車位「充電中」
- [!] 授權由誰判？斷線時怎麼辦？

### F0 ChargerFaulted
- [A] 樁（外部系統 [X] OCPP）→ 經 ACL → [C] ReportFault(chargerId=CP-A12, faultCode=GroundFailure, stillEnergized=false)
- [AG] （Charging 只翻譯，不持有狀態；或 Charger 健康聚合？）→ [!]
- [E] ChargerFaulted
- [P] 每當 ChargerFaulted → OpenWorkOrder（AssetOps）
- [P] 每當 ChargerFaulted → 連接器停售（Charging）
- [R] Vicky 看：開放中的工單清單（去重後）
```

### 4.5 用 Claude 的方式

- `/storm` 會做三件事：(1) 打回票不是事實的貼紙；(2) 問「這個事件之後誰的世界變了」；(3) 幫你輸出 Mermaid。
- **不要**問 Claude「幫我列出所有事件」。你會得到一份整齊但不是你的清單，Day 3 你就沒有材料可以推導邊界。
- 可以問：「我這條時間線從 14:31 到 14:33 講不順，我漏了什麼？」

---

## 5. 怎麼認出「系統動作當事實」

這是 `/storm` 最常打回票的錯。三個測試：

### 測試 1：主詞是誰？
- 「系統收到 StatusNotification」→ 主詞是系統，動作是收到 → ❌
- 「充電器已申告故障」→ 主詞是充電器（領域裡的東西），是事實 → ✅

### 測試 2：老陳聽得懂嗎？
- 「寫入 sessions 表」→ 老陳：「什麼表？」→ ❌
- 「充電已結束，12.4 度」→ 老陳點頭 → ✅

### 測試 3：它會不會因為換供應商而消失？
- 「RemoteStop 已 Accepted」→ 換 2.0.1 就沒有這個 → ❌
- `ChargingCompleted(stopReason=Remote)` → 永遠存在 → ✅

**常見的假事實**：

| 假事實 | 真事實 |
|---|---|
| 收到 MeterValues | `EnergyMetered` |
| 呼叫 Billing API | `ChargingCompleted`（Billing 自己訂閱） |
| 送出 email | `ParkingManuallyReleased`（email 是 As-Is 的交接方式） |
| 使用者登入 | 通常不是領域事件，除非登入本身是業務（這裡不是） |
| 排程每 5 分鐘跑 | 那是機制；事實是它產生的東西 |
| 資料同步完成 | 幾乎永遠是假事實 |

反過來，**「充電開始被拒」是真事實**（`ChargingStartRejected`）。拒絕也是業務上發生的事，小美要統計它。

---

## 6. 在本專案怎麼出現

| 東西 | 來自 Event Storming 的哪裡 |
|---|---|
| curriculum §1.7 骨架 | Big picture 的答案（Day 2 結束後再對） |
| curriculum §1.9 R1–R8 | 熱點 → Example Mapping |
| curriculum §1.4 五個 context | 樞紐事件 + 「誰在乎」欄 |
| `docs/diagrams/event-flow.mmd` | 時間線的 sequence 版本 |
| 聚合 `ChargingSession`, `WorkOrder` | 粉紅貼 |
| 政策「每當 ChargerFaulted → OpenWorkOrder」 | Day 5 的 Process Manager |

---

## 7. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| 事件用現在式或祈使句 | 一律「已…」/ 過去分詞 |
| 一開始就貼命令與聚合 | Big picture 只准事件 |
| 時間線太乾淨，沒有分支 | 至少一條故障支線、一條拒絕分支（R1/R2） |
| 把 As-Is 的交接貼成事件（「阿忠打了電話」） | 那是熱點，不是 To-Be 事件 |
| 每個事件都寫「誰在乎：所有人」 | 逼自己選 1–2 個 |
| 沒有熱點 | 沒有熱點代表你沒問夠問題；至少 5 個 |
| 讓 Claude 生整份 board | Day 3 你會沒有東西可推導 |

---

## 8. `storm-board.md` 最低要求

1. 事件池 ≥ 15 個 🟧，全部過去式。
2. 主線時間線（T0–T6）+ 故障支線（F）+ 至少一個拒絕分支。
3. 熱點 ≥ 5 個，每個對到一位角色的訪談。
4. 樞紐事件 ≥ 3 個。
5. Process level：至少 4 個事件補完角色 / 命令 / 聚合候選 / 政策。
6. 一張 Mermaid `timeline` 或 `sequenceDiagram`。

---

## 9. 延伸閱讀

- Alberto Brandolini, *Introducing EventStorming: An act of Deliberate Collective Learning*, Leanpub（持續更新中）。—— 發明者本人寫的，前三章必讀。
- Alberto Brandolini, "50,000 Orange Stickies Later", talk at Explore DDD 2017。—— 45 分鐘，看完知道為什麼是橘色。
- Vaughn Vernon, *Domain-Driven Design Distilled*, 2016, 第 7 章 "Acceleration and Management Tools"。—— 用 Event Storming 加速 DDD 的做法。
- Paul Rayner, "EventStorming and the Rebel Alliance"（部落格與演講）。—— process level 的實務細節。
- Kenny Baas-Schwegler, "Visual Collaboration Tools" 系列。—— 遠端 / 個人怎麼做。

---

## 自我檢查

1. Big picture 階段為什麼只准貼事件？如果一開始就貼聚合會發生什麼？
2. 「收到 StatusNotification」用三個測試各檢查一次，說明它為什麼不是事實。
3. 你的時間線上有哪三個樞紐事件？各自「之前與之後」的世界差在哪？
4. 「充電開始被拒」是不是事實？誰在乎它？
5. Process level 的固定圖樣是什麼？用 F0 `ChargerFaulted` 完整寫一次。
