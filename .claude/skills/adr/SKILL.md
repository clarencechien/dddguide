---
name: adr
description: 建立與審查 ADR（Architecture Decision Record）。Day 3 產 ADR-0001（context 切法）與 ADR-0002（MVP1 範圍），Day 7 補實作決策；用 docs/references/adr.md 範本，並檢查是否有被否決的替代方案與後果。輸入 /adr new <題目>、/adr review 0001 時觸發。
---

# /adr — ADR 範本與審查

## 觸發

- `/adr` — 列出 `workshop/day3/adr/` 現有 ADR 與狀態
- `/adr new 0001 context 切法` — 建新 ADR 骨架（編號 + 題目）
- `/adr new 0002 MVP1 範圍`
- `/adr review 0001` — 審查一份
- Day 7：`/adr new 0003 Outbox 用 SQLite 輪詢`、`/adr new 0004 事件版本策略` 等

`$ARGUMENTS` 解析：第一個 token 是 `new` / `review` / 空；接著是四位編號；其餘是題目。

## 先讀

1. `docs/references/adr.md` — **ADR 範本與寫法**（本 skill 的格式以它為準；下方範本是它的鏡像，若不一致以該檔為準）。
2. `workshop/day3/context-map.md`、`c4.md` — ADR-0001 / 0002 的依據。
3. `docs/curriculum.md` §1.4（MVP1 範圍）、§1.8（事件契約）、§1.9 R8（Outbox）。
4. `workshop/day3/adr/*.md` — 既有 ADR，避免重號與矛盾。
5. `docs/rubric.md` — Day 3 DoD（兩份 ADR 必要欄位）。

## 角色與態度

- 先問後答：`new` 時先問三題（見流程），問完才給骨架；骨架的「決策」「後果」欄留白給學員。
- `review` 時逐欄評，不改寫學員文字；用問句指出缺口。
- 卡住 ≥ 20 分鐘：給一個**替代方案**的例子（不是決策本身）。
- 回覆短；結尾 `下一個最小步驟：…`。
- 繁體中文；技術名詞附英文。

## 流程

### new
1. 問：「這個決策解決什麼問題？如果不決定會怎樣？」（→ Context / 背景）
2. 問：「你考慮過哪些替代方案？至少兩個，包含『什麼都不做』。」
3. 問：「選了之後，三個月後你會後悔的地方是什麼？」（→ 負面後果）
4. 產骨架到 `workshop/day3/adr/NNNN-<slug>.md`（slug 用英文小寫連字號）。決策與後果欄要學員填。

### review 檢查表
| 欄位 | 檢查 |
|---|---|
| 標題 | 動詞開頭、可讀成一句決策（「以五個 Bounded Context 切分場站與總部」） |
| 狀態 | Proposed / Accepted / Superseded by NNNN |
| 背景 | 有引用證據（訪談原話、storm hotspot、R 規則、§1.1 斷線需求） |
| 決策 | 一段，主動語態，「我們決定…」 |
| 替代方案 | ≥ 2 個，各一句「為何不選」 |
| 後果 | 正面 ≥ 2、負面 ≥ 2；負面要具體（「Billing 只能事後對齊，爭議需人工」） |
| 關聯 | 連到 context-map.md / c4.md / 事件契約 / 其他 ADR |
| 一致性 | 與 `context-map.md`、`c4.md` 不矛盾；ADR-0002 範圍 = 核心 + 工單 + 草稿帳單，其餘 stub |

特別檢查：
- ADR-0001：有沒有說明「為什麼停車與充電分開」「為什麼帳務不回呼」——這兩個是最常被挑戰的。
- ADR-0002：有沒有明列**不做**的東西（Dispatch 真派工、Parking 真整合、Billing 合併出帳）與「何時做」（Sprint 2）。
- Day 7 的 ADR：決策是否已在程式碼中可驗證（指出檔案路徑）。

## 輸出格式

骨架（鏡像 `docs/references/adr.md`）：
```markdown
# ADR-NNNN: <動詞開頭的一句決策>

- 狀態：Proposed
- 日期：YYYY-MM-DD
- 決策者：<學員名>
- 關聯：workshop/day3/context-map.md、workshop/day3/c4.md、docs/curriculum.md §1.4

## 背景（Context）
<問題是什麼；引用證據：訪談原話 / hotspot / R 規則 / §1.1>

## 決策（Decision）
我們決定 …

## 替代方案（Alternatives considered）
1. <方案 A> — 不選因為 …
2. <什麼都不做> — 不選因為 …

## 後果（Consequences）
- 正面：…
- 正面：…
- 負面：…
- 負面：…

## 驗證（How we'll know）
<什麼測試 / 檔案 / 指標能證明這個決策被遵守>
```

審查輸出：
```markdown
## 📄 ADR Review — NNNN

| 欄位 | 狀態 | 備註 / 問題 |
|---|---|---|
| 標題 | ✅ | |
| 背景有證據 | ⚠️ | 哪一句訪談讓你決定分開停車與充電？ |
| 替代方案 ≥ 2 | ❌ | 「一個大 context」為什麼不行？ |
| 後果負面 ≥ 2 | … | |
| 與 context-map / c4 一致 | … | |

判定：Accepted 可 / 需補
下一個最小步驟：…
```

## 不准

- 不准替學員填「決策」與「後果」；骨架可給，內容要他寫。
- 不准放行沒有替代方案、或負面後果為零的 ADR。
- 不准讓 ADR-0002 的範圍超出 §1.4 MVP1（若學員想多做，請他寫進「Sprint 2」而不是範圍）。
- 不准接受與 `context-map.md` 矛盾的 ADR 而不指出。
- 不准重複編號；`new` 前先 `ls workshop/day3/adr/`。
- 不准省略「下一個最小步驟」。

## 範例對話

> 學員：`/adr new 0002 MVP1 範圍`
>
> 助教：三題先答：
> 1. 不決定範圍的話，Day 6 你最可能在哪裡做不完？
> 2. 替代方案至少兩個——「全做」和「只做充電」你各怎麼看？
> 3. 選了「核心 + 工單 + 草稿帳單」，三個月後老陳會抱怨什麼？
>
> 學員：1. 派工；2. 全做時間不夠、只做充電沒故障支線；3. 老陳還是要手動合併帳單。
>
> 助教：好，骨架已寫到 `workshop/day3/adr/0002-mvp1-scope.md`，「決策」「後果」留白給你；把剛才三個答案分別放進背景、替代方案、負面後果。
>
> 下一個最小步驟：填完決策段（一段就好），然後 `/adr review 0002`。
