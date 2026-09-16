# Day 3 交付物範本 — 戰略設計

存成 `context-map.md`、`c4.md`、`adr/0001-<slug>.md`、`adr/0002-<slug>.md`。做法見 `docs/days/day3.md`。

---

## 檔案 1：`context-map.md`

```markdown
# Bounded Contexts 與 Context Map

## 邊界推導紀錄（我怎麼切的）
### 語言衝突（同一個詞、不同意思）
### 生命週期不同
### 一致性要求不同
### 獨立存活要求

## Context 清單
| Context | 說的話 | 不變條件 | 獨立存活 | Core / Supporting / Generic |
|---|---|---|---|---|

## Context Map（Mermaid）
```mermaid
flowchart LR
```

## 關係模式與理由
| 上游 → 下游 | 模式（ACL / Partnership / Customer-Supplier / Conformist） | 為什麼 |
|---|---|---|

## 我推翻過的切法（至少一個）
```

---

## 檔案 2：`c4.md`

```markdown
# C4 圖

## Level 1 System Context
```mermaid
C4Context
```
## Level 2 Container（MVP1）
```mermaid
C4Container
```
## 圖上每個箭頭對應的整合事件 / API
```

---

## 檔案 3、4：`adr/0001-<slug>.md`、`adr/0002-<slug>.md`

```markdown
# ADR-0001: <決策標題>

- 狀態：Proposed / Accepted
- 日期：

## 背景（Context）
## 決策（Decision）
## 考慮過的替代方案（至少兩個）
## 後果（Consequences：好的、壞的、要監看的）
```

ADR-0001 = context 切法；ADR-0002 = MVP1 範圍（為什麼是 Charging + AssetOps 工單 + Billing 草稿）。
