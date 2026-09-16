# adapters/http

Day 6 B1 的作業：在這裡放 HTTP 入站配接器（Python 建議 FastAPI + uvicorn，見 requirements.txt 註解）。

建議端點：

| Method | Path | 做什麼 |
|---|---|---|
| `POST` | `/ocpp/:chargerId` | 收 `scripts/ocpp-sim` 送來的 OCPP 1.6J 訊息，交給 `adapters/ocpp/ocpp_acl.py` |
| `GET` | `/sessions/:sessionId` | 讀 ChargingSession 狀態 |
| `GET` | `/work-orders` | 讀工單清單 |
| `POST` | `/relay` | 手動觸發 Outbox relay（沒有背景排程時用） |

規則：HTTP 層只做「解析請求 → 呼叫 application service → 序列化回應」，不得出現業務規則。
