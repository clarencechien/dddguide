# scripts/ocpp-sim — OCPP 1.6J 模擬器

把 §1.6 那個下午（14:04 插槍 → 14:31 結束 12.4 kWh → 18:10 故障申告兩次）以 **OCPP 1.6J 的 JSON 訊息**吐出來。零依賴，Node 與 Python 兩版行為相同。

## 用法

```bash
# stdout（NDJSON，一行一個 CALL frame：[2, uniqueId, action, payload]）
node scripts/ocpp-sim/sim.mjs
python scripts/ocpp-sim/sim.py
node scripts/ocpp-sim/sim.mjs --pretty

# Day 6：逐筆 POST 到你的 ACL 端點
node scripts/ocpp-sim/sim.mjs --url http://localhost:3000/ocpp/CP-A12 --delay 200
python scripts/ocpp-sim/sim.py --url http://localhost:8000/ocpp/CP-A12 --delay 0.2
```

## 訊息序列

| # | Action | 重點 | 時間 |
|---|---|---|---|
| 1 | `BootNotification` | serial `CP-A12` | — |
| 2 | `StatusNotification` | connector 2 `Available` | 14:00 |
| 3 | `Authorize` | `TAG-MONTHLY-77` | — |
| 4 | `StartTransaction` | connector 2、`meterStart: 0` | 14:04 |
| 5–7 | `MeterValues` × 3 | `Energy.Active.Import.Register` 4000 / 8000 / 12400 Wh | 14:13 / 14:22 / 14:31 |
| 8 | `StopTransaction` | `meterStop: 12400`、`reason: Local` | 14:31 |
| 9 | `StatusNotification` | `Faulted` / `errorCode: GroundFailure` | 18:10:00 |
| 10 | `StatusNotification` | 同上，**8 秒後再報一次**（R5 去重測試） | 18:10:08 |

## 關於 `transactionId`

OCPP 的 `transactionId` 是**中央系統在 `StartTransaction.conf` 裡指定**的。參考解的 ACL 從 991 起算（對應 `S-991`）；模擬器預設用 991 填 `MeterValues` / `StopTransaction`。`--url` 模式會讀 `StartTransaction` 回應裡的 `transactionId`（支援 `[3, id, {…}]` 或裸 `{…}` 兩種回應）並自動帶入後續訊息。

## 這些欄位名不該出現在你的領域事件裡

`transactionId`、`meterStart`、`meterStop`、`sampledValue`、`measurand`、`errorCode`、`timestamp`——它們是 OCPP 的話，不是通用語言。防腐層（`adapters/ocpp`）的工作就是翻譯成 `sessionId`、`meterWh`、`faultCode`、`occurredAt`。`solutions/*/test*/…ocpp_acl` 有一個測試專門檢查這件事。
