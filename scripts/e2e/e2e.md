# scripts/e2e — 那條真實的午後（14:02 → 18:18）

Day 6 B3 的 E2E 劇本。`run.mjs`（Node）與 `run.py`（Python）直接驅動 `solutions/<lang>` 的 in-memory 組裝，
把整個下午跑一遍並印出狀態表。**Day 6 學員把它改成打自己的 HTTP API**（見文末）。

```bash
node scripts/e2e/run.mjs      # 用 solutions/node（Node 22 原生 type stripping，不用 build）
python scripts/e2e/run.py     # 用 solutions/python（不用安裝任何套件）
```

識別碼一律用課綱 §1.6：`SITE-TPE-01`、`CP-A12` / `CP-A12-2`、`ABC-1234`、`P-441`、`S-991`、`TAG-MONTHLY-77`、`INV-778`、`WO-2208`、`TECH-HAO`、`12.4 kWh`。

## 劇本與每步之後的期望狀態

| 時間 | 發生什麼（輸入） | Parking | Charging | Billing | Ops |
|---|---|---|---|---|---|
| 14:02 | LPR 辨識 `ABC-1234` 進場（stub） | P-441 Active | — | — | — |
| 14:04 | `StartTransaction`（connector 2、`TAG-MONTHLY-77`、meterStart 0）→ relay | P-441 Active | S-991 **Charging**（meter 0） | INV-778 Draft（0 Wh） | — |
| 14:05 | 第二張卡 `TAG-VISITOR-01` 在同一把槍 `StartTransaction`（**R1**） | P-441 Active | S-991 Charging；回 `Blocked`，無 S-992 | INV-778 Draft | — |
| 14:13 | `MeterValues` 4000 Wh | P-441 Active | S-991 Charging（last 4000） | INV-778 Draft | — |
| 14:22 | `MeterValues` 8000 Wh | P-441 Active | S-991 Charging（last 8000） | INV-778 Draft | — |
| 14:31 | `MeterValues` 12400 Wh + `StopTransaction`（**R4**）→ relay | P-441 Active | S-991 **Completed**，energy **12400 Wh** | INV-778 Draft **12.4 kWh / 99.2** | — |
| 14:33 | 值班長人工放行（**R6**，HQ 離線） | P-441 **Released (Manual)** | S-991 Completed | INV-778 Draft | — |
| 18:10:00 | `StatusNotification Faulted GroundFailure` → relay | P-441 Released | 槍 CP-A12-2 Faulted（無進行中會話） | INV-778 Draft | **WO-2208** Assigned → TECH-HAO；`ops.work_order.opened.v1` ×1 |
| 18:10:08 | 同樣的故障再報一次（**R5**）→ relay | P-441 Released | — | INV-778 Draft | 仍只有 WO-2208，duplicate reports = 1；opened ×1 |
| 18:12 | broker 重送 `charging.charger.faulted.v1`（至少一次） | P-441 Released | — | INV-778 Draft | 仍只有 WO-2208 |
| 18:18 | 技術員回報修復驗證 → 關單 → relay | P-441 Released | 槍恢復可售 | INV-778 Draft | WO-2208 **Closed (Repaired)**；`ops.work_order.closed.v1` ×1 |

最後一行的斷言（腳本會檢查，任何一項不符就 exit 1）：

- `S-991.status == Completed`、`energyWh == 12400`
- Billing 只有 **1** 張草稿，`INV-778`、`energyWh 12400`
- 工單只有 **1** 張 `WO-2208`，`Closed`，`duplicateReportCount == 1`
- bus 上 `ops.work_order.opened.v1` ×1、`ops.work_order.closed.v1` ×1、`charging.session.started.v1` ×1、`charging.session.completed.v1` ×1
- 所有整合事件的 `correlationId` 相同（同一個下午）

## Day 6：改成打你的 HTTP API

1. 把「輸入」欄換成 `fetch('/ocpp/CP-A12', {method:'POST', body: frame})`（frame 直接用 `scripts/ocpp-sim/sim.mjs` 的 `frames()`），或乾脆 `node scripts/ocpp-sim/sim.mjs --url ...`。
2. 把「期望狀態」欄換成 `GET /sessions/S-991`、`GET /work-orders`、`GET /invoices`（或直接查 SQLite / Postgres 表）。
3. 14:33 人工放行與 18:18 關單是人的動作，各自需要一個端點（例如 `POST /parking/P-441/manual-release`、`POST /work-orders/WO-2208/close`）。
4. 保留斷言。`/ship e2e` 會要求你貼出跑完的輸出。
