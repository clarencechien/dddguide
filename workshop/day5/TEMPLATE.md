# Day 5 交付物範本 — 應用層與事件驅動

主要交付物是程式碼：`starter/<lang>/src/charging/application/**`、`src/billing/**`、`src/assetops/**`、`src/shared/**` 測試全綠，
以及 `contracts/*.json`（整合事件 JSON Schema v1 + 範例）。
`workshop/day5/` 放 `event-flow.md`。做法見 `docs/days/day5.md`。

---

## 檔案：`event-flow.md`

```markdown
# 事件流（Event Flow）

## 命令處理器清單
| 命令 | 處理器檔案 | 載入的聚合 | 寫入的事件 | 交易邊界 |
|---|---|---|---|---|
| StartCharging | | | | |
| StopCharging | | | | |
| ReportMeterValue | | | | |
| ReportFault | | | | |

## Outbox 同寫流程（Mermaid sequenceDiagram）

## 整合事件契約
| 事件 | Schema 檔 | 範例檔 | 去重鍵 | 消費者 |
|---|---|---|---|---|
| charging.session.started.v1 | contracts/charging.session.started.v1.json | | sessionId | Billing 草稿 |

## Billing 草稿消費者：冪等怎麼做的
## Process Manager（ChargerFaulted → WorkOrder → Dispatch stub → 關單）狀態表
## 測試指令與結果
## /event-contract 審查發現的問題與修正
```
