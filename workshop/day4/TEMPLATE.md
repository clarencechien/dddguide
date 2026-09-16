# Day 4 交付物範本 — 戰術設計 + TDD

主要交付物是**程式碼**：`starter/<lang>/src/charging/**` 與 `starter/<lang>/src/assetops/domain/**` 測試全綠。
`workshop/day4/` 放兩個說明檔：`model.md`、`test-report.md`。做法見 `docs/days/day4.md`。

---

## 檔案 1：`model.md`

```markdown
# 戰術模型（Tactical Model）

## ChargingSession 聚合
- 聚合根：
- 識別：
- 狀態機（Mermaid stateDiagram）：
- 不變條件（對應 R1–R4）：
- 發出的領域事件：

## 值物件（Value Objects）
| VO | 驗證規則 | 為什麼是 VO 不是 Entity |
|---|---|---|
| ConnectorId | | |
| Energy | | |
| IdTag | | |

## WorkOrder 聚合（R5）
## Repository port 的介面（簽名）
## 六角架構目錄對照（哪個目錄是核心、哪個是 adapter）
## 我做過的取捨（例如：授權判斷放在聚合內還是應用層？）
```

---

## 檔案 2：`test-report.md`

```markdown
# 測試報告

- 語言：node | python
- 指令：
- 結果（貼最後 20 行輸出）：

## 測試清單（測試名 = 規則）
| 測試名 | 規則 | 紅 → 綠 的 commit |
|---|---|---|
| R1 occupied connector rejects a second start | R1 | |

## 重構紀錄（做了什麼、測試有沒有一直綠）
```
