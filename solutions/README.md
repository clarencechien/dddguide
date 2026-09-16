# solutions/ — 參考解（Day 4–6）

## 卡住 20 分鐘再看

這裡的程式碼**不是**拿來抄的。工作坊的價值在「你自己推導出來」的那段掙扎；助教（`/ta`、`/tdd`）也被要求先問後答。使用規則：

1. 先寫測試、跑出紅燈、自己試至少 **20 分鐘**。
2. 真的卡住：只看你卡住的那**一個**檔案 / 一條規則，看完關掉，用自己的話重寫。
3. 對答案：Day 4/5 結束後，用 `/review` 或 `/aggregate-review` 比較你的版本與這裡的差異——**差異才是學習點**，不是「一樣就對」。
4. 參考解也有取捨（見各語言 README「刻意的設計決定」）。你可以不同意；寫進 ADR 就好。

## 內容對照七天

| 天 | Block | 參考解在哪 |
|---|---|---|
| Day 4 | B1–B2 ChargingSession 聚合、R1–R4 | `node/src/charging/domain/`、`python/src/charging/domain/` + 對應測試 |
| Day 4 | B3 WorkOrder + R5、Repository port + in-memory | `*/…/assetops/domain/`、`*/…/adapters/persistence/` |
| Day 5 | B1 Application Service + Outbox 同寫 | `*/…/charging/application/`、`*/…/shared/outbox*` |
| Day 5 | B2 整合事件契約、in-memory bus、Billing 冪等消費者 | `contracts/`、`*/…/shared/event_bus*`、`*/…/billing/` |
| Day 5 | B3 Process Manager（ChargerFaulted → 工單 → 派工 stub → 關單） | `*/…/assetops/application/` |
| Day 6 | B1 OCPP ACL | `*/…/adapters/ocpp/`（HTTP 層**沒有**參考解：那是你的） |
| Day 6 | B2 持久化 | 沒有參考解；`docker/init.sql` 給了表結構，in-memory adapter 給了 port 的形狀 |
| Day 6 | B3 E2E | `scripts/e2e/run.mjs` / `run.py` 直接驅動這裡的 in-memory 組裝 |

R6（Parking 人工放行）與 R7（帳單不可變）不在 MVP1 實作範圍，但各有一個最小 stub + 測試，讓 R1–R8 都能在測試名裡找到。

## 跑

```bash
cd solutions/node && npm install && npm test        # 31 passed
cd solutions/python && pip install -r requirements.txt && pytest   # 31 passed
node scripts/e2e/run.mjs && python scripts/e2e/run.py
```
