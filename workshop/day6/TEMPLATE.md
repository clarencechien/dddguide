# Day 6 交付物範本 — MVP 上線

交付物：`workshop/day6/README-mvp.md` + `scripts/e2e` 本機跑通的紀錄（`e2e-log.md`）。做法見 `docs/days/day6.md`。

---

## 檔案 1：`README-mvp.md`

```markdown
# EV Charge Ops MVP1

## 這個 MVP 做什麼、不做什麼
## 怎麼跑（三種：純本機 SQLite / Postgres via docker compose / Docker image）
## HTTP API
| Method | Path | 命令 | 成功回應 | 拒絕回應 |
|---|---|---|---|---|
## OCPP 模擬器怎麼用（scripts/ocpp-sim）與 ACL 翻譯表
| OCPP 訊息 | 翻成哪個命令 / 事件 | 丟掉的欄位 |
|---|---|---|
## 持久化：資料表 / Outbox relay 怎麼跑
## E2E 劇本（14:02 → 18:18）每一步打了什麼、期待什麼
## 已知限制與 /ship 清單未勾的項目
```

---

## 檔案 2：`e2e-log.md`

```markdown
# E2E 執行紀錄
- 日期 / 語言 / 持久化方式：
- 指令：
- 輸出（貼）：
- 失敗過的地方與修法：
```
