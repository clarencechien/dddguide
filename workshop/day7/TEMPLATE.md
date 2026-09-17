# Day 7 交付物範本 — SDLC 收尾

存成 `pr.md`、`retro.md`、`sprint-2-backlog.md`、`takeaway.md`。CI 設定檔放在 `.github/workflows/ci.yml`。做法見 `docs/days/day7.md`。

---

## 檔案 1：`pr.md`

```markdown
# PR
- 連結：
- CI 狀態（截圖或連結）：
- PR 描述有附：ADR-0001、ADR-0002、contracts/ 連結 ☐
- /review 指出、且我修了的問題（至少 3 條）：
- /review 指出、我決定不修的問題（以及理由）：
```

---

## 檔案 2：`retro.md`

```markdown
# Retro（7 天）
## 七天時間線（從 git log 抄：哪天 commit 了什麼）
## Start（下次要開始做的，≥ 2，每條附證據：檔案或 commit）
## Stop（要停止的，≥ 2）
## Continue（要繼續的，≥ 2）
## 數字（commit 數、測試數、卡住最久的三個地方與當時缺什麼）
## 對助教（Claude Code）的用法：什麼提示有用、什麼沒用
```

---

## 檔案 3：`sprint-2-backlog.md`

```markdown
# Sprint 2 Backlog
| 優先 | 項目 | 屬於哪個 Context | 需要的新事件 / 契約 | 驗收條件 | 估點 |
|---|---|---|---|---|---|
| 1 | Billing 合併出帳（停車單 + 充電單 → 一張 Invoice） | Billing | | | |
| 2 | Dispatch 真派工 | Dispatch | | | |
| 3 | Parking 真整合（LPR、月票） | Parking | | | |
```

---

## 檔案 4：`takeaway.md`

```markdown
# 帶回公司清單
## 我公司裡的「人當 API」交接點（三個）
## 我會先切的一個 Bounded Context
## 30 天行動計畫（週 1 / 週 2 / 週 3 / 週 4）
## 最終評量分數：___ %（≥ 80% 過關）
```
