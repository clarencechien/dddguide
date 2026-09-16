---
name: event-contract
description: Day 5 審查整合事件（Integration Event）：命名 <context>.<noun>.<verb-past>.v1、版本、信封欄位、去重鍵、Outbox 同交易寫入、消費者冪等、拒絕 OCPP 欄位名；審 contracts/*.json 與發布 / 消費程式碼，輸出 findings 表與判定。輸入 /event-contract、/event-contract charging.session.completed.v1 時觸發。
---

# /event-contract — 整合事件契約審查

## 觸發

- `/event-contract` — 審 `contracts/` 全部 schema + 發布 / 消費程式碼
- `/event-contract charging.session.completed.v1` — 只審一個事件
- `/event-contract outbox` — 只審 Outbox 寫入與 relay
- `/event-contract consumer billing` — 只審某個消費者的冪等

## 先讀

1. `docs/references/eda.md` — 整合事件 vs 領域事件、Outbox、至少一次、冪等消費者、Process Manager。
2. `docs/curriculum.md` §1.8（契約 v1 全表、信封欄位、去重鍵）、§1.9 R8、§1.4 Context Map 關係（帳務不得回呼）。
3. `contracts/*.json` — 課程提供的 JSON Schema v1 與範例（若學員自寫，與此比對）。
4. `workshop/.config` 取 LANG；讀：
   - Node：`starter/node/src/app/**`、`src/billing/**`、`src/assetops/**`、`src/shared/outbox*`、`test/**`
   - Python：`starter/python/src/app/**`、`src/billing/**`、`src/assetops/**`、`src/shared/outbox*`、`tests/**`
5. `docs/domain/ocpp-primer.md` — 用來辨認「OCPP 欄位名」（`transactionId`, `meterStop`, `idTag` 是例外見下、`connectorId` 整數、`errorCode`, `vendorErrorCode`, `StatusNotification`, `StopTransaction`）。

以 Bash 掃描：
```bash
grep -rnE "transactionId|meterStart|meterStop|StatusNotification|StopTransaction|StartTransaction|vendorErrorCode|errorCode|MeterValues" contracts starter/*/src/app starter/*/src/billing starter/*/src/assetops 2>/dev/null
```

## 角色與態度

- 先問後答：「這個事件的消費者是誰？它用哪個欄位去重？」
- 不改 schema；給 findings 與問題。
- 卡住 ≥ 20 分鐘：給一個事件的完整信封範例（用 `S-991`），要他照樣改自己的。
- 回覆短；結尾 `下一個最小步驟：…`。
- 繁體中文；欄位名英文。

## 檢查清單

### A. 命名與版本
- [ ] `type` 格式 `<context>.<noun>.<verb_past>.v<N>`，小寫、底線；與 §1.8 七個名稱完全一致。
- [ ] 版本在 type 尾（`.v1`）且 `version` 欄一致；欄位變更**只加不刪**，破壞性變更升 v2 並保留 v1 一段時間。
- [ ] 事件名是**事實**（`completed`），不是命令（`complete`）或 OCPP 訊息名。

### B. 信封（envelope）
- [ ] `eventId`(uuid)、`type`、`version`、`occurredAt`(ISO-8601 UTC)、`producer`(context 名)、`correlationId`、`causationId`、`payload` 八個都有。
- [ ] `occurredAt` 是**業務發生時間**，不是發布時間。
- [ ] `correlationId` 貫穿一條劇本（14:02 → 14:33 同一 correlationId）；`causationId` = 上一個事件 / 命令的 id。

### C. Payload（依 §1.8）
| 事件 | 必要欄位 |
|---|---|
| `charging.session.started.v1` | sessionId, connectorId, idTag, startedAt |
| `charging.session.completed.v1` | sessionId, connectorId, energyWh, startedAt, endedAt, stopReason |
| `charging.charger.faulted.v1` | chargerId, connectorId?, faultCode, stillEnergized, occurredAt |
| `ops.work_order.opened.v1` | workOrderId, chargerId, faultCode, openedAt |
| `ops.work_order.closed.v1` | workOrderId, chargerId, closedAt, outcome |
| `parking.vehicle_entered.v1` | plate, siteId, lane, occurredAt |
| `parking.session.closed.v1` | parkingSessionId, plate, durationMin, releaseMode |
- [ ] `connectorId` 是業務 ID 字串（`CP-A12-2`），不是 OCPP 整數 `2`。
- [ ] `energyWh` 整數 Wh，不是 `meterStop − meterStart` 的原始欄位外露。
- [ ] `idTag` 允許（它已是通用語言「憑證」），但不得出現 `transactionId`、`meterStart/Stop`、`errorCode`、`vendorErrorCode`。
- [ ] 不外露聚合內部狀態（`status`、`pendingEvents`）與其他 context 的資料（帳單金額）。
- [ ] 有 JSON Schema（`required`、`additionalProperties: false` 或有意識地放寬）與一份範例 JSON。

### D. Outbox（R8）
- [ ] 應用服務在**同一交易**寫聚合與 outbox 列；沒有「先 publish 再 commit」。
- [ ] Outbox 列含 `eventId`、`type`、`payload`、`createdAt`、`publishedAt?`；relay 以 `eventId` 標記已發。
- [ ] Relay 失敗可重送（至少一次）；不保證順序時契約有說明。

### E. 消費者冪等
- [ ] Billing 以 `sessionId` 去重；AssetOps 以 `chargerId + faultCode`（工單開放期間）去重（§1.8）。
- [ ] 重複投遞測試存在：同一事件送兩次，副作用一次。
- [ ] 消費者不回呼上游（帳務不凍結會話；§1.4 Customer-Supplier）。
- [ ] Process Manager（`ChargerFaulted` → 開單 → 派工 stub → 關單）有狀態且可重入。

## 輸出格式

```markdown
## 📨 Event Contract Review — <事件 | all>

| 嚴重度 | 位置 | 問題 | 為什麼 | 修法方向 |
|---|---|---|---|---|
| 🔴 | contracts/charging.session.completed.v1.schema.json | payload 有 `transactionId`、`meterStop` | OCPP 欄位外洩到整合事件；§1.4 ACL、§1.8 必要欄位 | 改 `sessionId`、`energyWh`；OCPP 名詞止於 ACL |
| 🔴 | src/app/stop-charging.ts:30 | `bus.publish()` 在 `repo.save()` 之前 | R8：交易失敗事件已出去 | 同交易寫 outbox，relay 另外發 |
| 🟠 | src/billing/consumer.ts | 沒有 `sessionId` 去重 | 至少一次投遞會重複建草稿帳單；§1.8 去重鍵 | 用 `processed_events(sessionId)` 或 upsert |
| 🟡 | contracts/*.json | 缺 `causationId` | 追蹤斷鏈；eda.md 信封段 | 補欄位 |

### 契約對照表
| 事件 | 命名 ✅ | 信封 ✅ | 必要欄位 ✅ | Schema ✅ | 範例 ✅ | 去重鍵 ✅ |
|---|---|---|---|---|---|---|
| charging.session.completed.v1 | ✅ | ⚠️ | ❌ | ✅ | ❌ | ✅ |

### 判定
- ✅ 契約可凍結為 v1 / ⚠️ 修 🔴 後可 / ❌ 重做
下一個最小步驟：…
```

嚴重度：🔴 OCPP 欄位外洩、非同交易 outbox、消費者回呼上游；🟠 缺去重 / 缺必要欄位；🟡 信封欄位或 schema 細節。

## 不准

- 不准放行 payload 內出現 OCPP 欄位或訊息名（`transactionId`、`meterStart`、`meterStop`、`errorCode`、`vendorErrorCode`、`StatusNotification`、`StopTransaction`）——一律 🔴。
- 不准放行 §1.8 七個名稱以外的自創事件名；學員需要新事件時，要他先寫進 `contracts/` 並補 ADR。
- 不准放行「聚合或應用服務直接 publish、不經 outbox」。
- 不准放行沒有去重鍵與重複投遞測試的消費者。
- 不准替學員改 schema 或程式碼；只給表。
- 不准省略「下一個最小步驟」。

## 範例對話

> 學員：`/event-contract charging.session.completed.v1`
>
> 助教：先問：這個事件的消費者是誰？它用什麼去重？
>
> 學員：Billing，用 sessionId。
>
> 助教：對。但你的 schema payload 有 `meterStop: 12500`——那是 OCPP 的話，Billing 不該懂。老陳要的是 `energyWh: 12400`。另外 `connectorId: 2` 是整數，契約要 `"CP-A12-2"`。兩個都是 🔴。
>
> 下一個最小步驟：改 `contracts/charging.session.completed.v1.schema.json` 這兩個欄位，補一份 `S-991` 的範例 JSON，然後跑消費者測試。
