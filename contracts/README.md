# contracts/ — 整合事件契約 v1

跨 bounded context 的事件契約（課程總綱 §1.8）。**這裡是唯一一份**：Node 與 Python 的 `IntegrationEvent`、`scripts/e2e`、Day 7 的 CI 都以這裡為準。

## 檔案

| 檔案 | 內容 |
|---|---|
| `envelope.schema.json` | 信封：`eventId`、`type`、`version`、`occurredAt`、`producer`、`correlationId`、`causationId`、`payload` |
| `<type>.schema.json` × 7 | 每個事件：`allOf: [信封, { type/version/producer 固定值, payload 必要欄位 }]` |
| `examples/<type>.json` × 7 | 用 §1.6 識別碼寫的完整範例（同一個 `correlationId` 貫穿整個下午） |
| `validate.mjs` | 零依賴驗證器：`node contracts/validate.mjs`（全部範例）或 `node contracts/validate.mjs my-event.json` |

## 七個事件

| type | producer | 訂閱者 | 去重鍵 |
|---|---|---|---|
| `parking.vehicle_entered.v1` | parking | 占位政策 | plate + occurredAt |
| `charging.session.started.v1` | charging | Billing 草稿、Parking | sessionId |
| `charging.session.completed.v1` | charging | Billing | sessionId |
| `parking.session.closed.v1` | parking | Billing | parkingSessionId |
| `charging.charger.faulted.v1` | charging | AssetOps | chargerId + faultCode（工單開放期間） |
| `ops.work_order.opened.v1` | assetops | Dispatch、場站看板 | workOrderId |
| `ops.work_order.closed.v1` | assetops | Charging 健康、SLA | workOrderId |

## 規則（Day 5 B2 用 `/event-contract` 審查時對照）

1. **命名** `<context>.<subject>.<fact>.v<N>`，過去式，小寫底線。
2. **版本**只能加欄位；改語意或刪欄位就升 `v2` 並並行一段時間。
3. **信封**八個欄位缺一不可；`occurredAt` 是領域時間，不是發布時間。
4. **經 Outbox、至少一次**：消費者必須以表中的去重鍵做冪等。
5. **欄位名是通用語言**：不會出現 `transactionId`、`meterStart`、`errorCode` 這類 OCPP 名字。
6. 帳務不得回呼上游（顧客—供應者）；AssetOps 接受 `ChargerFaulted` 語意（遵奉者）。

`validate.mjs` 只實作這些 schema 用到的子集合（type / required / properties / const / enum / pattern / minimum / minLength / maxLength / format / allOf / $ref）。要完整驗證可用 `npx ajv-cli validate -s <schema> -d <example> --spec=draft2020`。
