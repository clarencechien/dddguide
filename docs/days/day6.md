# Day 6 — MVP 上線

**一句話目標**：今天結束時，你的 MVP1 能用 HTTP 接命令、透過 ACL 吃 OCPP 模擬器的訊息、把狀態與 Outbox 存進 SQLite（或 Postgres）、
用一個 Docker image 跑起來，並且用 `scripts/e2e` 跑通「14:02 → 18:18 那條真實午後」。

## 今天結束你會拿到

| 交付物 | 路徑 | 最低要求 |
|---|---|---|
| HTTP API | `starter/<lang>/src/adapters/http/**` | Node: Fastify / Python: FastAPI；四個命令 + 兩個查詢；R1 拒絕回 409 |
| OCPP ACL | `starter/<lang>/src/adapters/ocpp-acl/**` | `StartTransaction` / `MeterValues` / `StopTransaction` / `StatusNotification(Faulted)` → 領域命令；OCPP 字眼不出 ACL |
| 持久化 | `starter/<lang>/src/adapters/persistence/**` | SQLite repository ×2 + SQLite Outbox + 交易；Postgres 選配 |
| Outbox relay | `starter/<lang>/src/shared/**` | 用 SQLite outbox 的 relay（輪詢或手動觸發） |
| Docker | `starter/<lang>/Dockerfile` | `docker build` 後可跑 API |
| E2E | `scripts/e2e/` 跑通 | 14:02 → 18:18 劇本全部斷言通過 |
| 文件 | `workshop/day6/README-mvp.md`、`e2e-log.md` | 怎麼跑、API 表、ACL 翻譯表、持久化、E2E 步驟、已知限制 |

範本在 `workshop/day6/TEMPLATE.md`；驗收標準在 `docs/rubric.md`。

## 講師開場（15 分鐘）

- **[3 分] 今天全部是 adapter**：領域層與應用層昨天就完成了，今天一行都不該改（改了就是昨天漏了）。六角架構的回報日：HTTP、OCPP、SQLite、Docker 都是可插拔的外圈。
- **[4 分] ACL 是今天最重要的一段**：OCPP 的 `StartTransaction.req { connectorId: 2, idTag: "TAG-MONTHLY-77", meterStart: 1000, timestamp }` 進來，ACL 翻成 `StartCharging { connectorId: "CP-A12-2", idTag, startMeterWh: 1000, at }`。翻譯表要寫在 `README-mvp.md`。OCPP 的 `connectorId` 是整數 2，我們的 `ConnectorId` 是 `CP-A12-2`——這種差異就是 ACL 存在的理由。
- **[3 分] 持久化預設 SQLite、零安裝**；想玩 Postgres 的在 repo 根目錄 `docker compose up -d`。Repository 介面昨天就定了，今天只是換實作；交易 = SQLite 的 `BEGIN/COMMIT`，Outbox 是同一個 DB 的一張表。
- **[2 分] E2E 劇本是那個下午**：14:02 進場（Parking stub）→ 14:04 插槍授權 → 14:10 第二次被拒 → 計量 → 14:31 結束 12.4 kWh → 草稿帳單 → 14:33 離場（stub）→ 18:10 故障 → 18:15 重複申告 → 18:18 看板上 `WO-2208` 指派 `TECH-HAO`。
- **[2 分] `/ship` 是上線清單**：API、持久化、Docker、E2E、日誌。它會問你「沒有 Docker 能跑嗎」「日誌裡看得到 correlationId 嗎」。
- **[1 分] 交付物**：E2E 跑通 + `README-mvp.md` + `e2e-log.md`。

## 先讀（25 分鐘）

| 檔案 | 時間 | 讀什麼 |
|---|---|---|
| `docs/domain/ocpp-primer.md` | 10 分 | 四個訊息：`StartTransaction`、`MeterValues`、`StopTransaction`、`StatusNotification`；欄位名；`connectorId` 是整數、`idTag` 是字串、`meterStart` / `meterStop` 單位 Wh |
| `scripts/ocpp-sim/README.md` | 5 分 | 模擬器怎麼跑、送什麼 JSON、預設 `CP-A12` |
| `scripts/e2e/README.md` | 5 分 | 劇本步驟、斷言、怎麼指定 base URL |
| `docs/references/hexagonal.md`「adapter」一節 | 5 分 | adapter 只做翻譯與 I/O，不做決策 |

---

## Block 1（90 分鐘）— HTTP API + OCPP 模擬器 → ACL

### 目標
用 Fastify / FastAPI 把昨天的四個命令處理器接上 HTTP；用 ACL 把 `scripts/ocpp-sim` 送來的 OCPP JSON 翻成命令。ACL 是唯一准出現 OCPP 字眼的地方。

### 步驟
1. **（10 分）** 在 `README-mvp.md` 先寫 API 表（先設計後寫碼）：
   | Method | Path | 命令 | 成功 | 拒絕 |
   |---|---|---|---|---|
   | POST | `/sessions/start` | `StartCharging` | 201 `{ sessionId }` | 409 `ConnectorOccupied` / 403 `Unauthorized` |
   | POST | `/sessions/{id}/meter` | `ReportMeterValue` | 202 | 422 `MeterValueRejected` |
   | POST | `/sessions/{id}/stop` | `StopCharging` | 200 `{ energyWh }` | 409 not charging |
   | POST | `/chargers/{id}/faults` | `ReportFault` | 202 `{ workOrderId, duplicate: bool }` | — |
   | GET | `/sessions/{id}` | 查詢 | 200 | 404 |
   | GET | `/work-orders?chargerId=` | 查詢（看板） | 200 | — |
   | POST | `/ocpp/{chargerId}` | ACL 入口（模擬器打這裡） | 200 OCPP conf | 400 unknown action |
   回應碼依你 Day 4 決定的「拒絕事件 vs 拋錯」一致。
2. **（35 分）HTTP，TDD**（in-memory repository 即可，B2 才換 SQLite）：
   - Node：`src/adapters/http/server.ts`（`buildServer(deps)` 回 Fastify instance；`src/adapters/http/routes/sessions.ts`、`chargers.ts`、`ocpp.ts`）；`src/main.ts` 組裝。測試 `test/adapters/http/api.test.ts` 用 `server.inject()`：
     `POST /sessions/start returns 201 and sessionId`、`R1 POST /sessions/start returns 409 when connector CP-A12-2 is occupied`、`POST /sessions/S-991/stop returns energyWh 12400`。
   - Python：`src/adapters/http/app.py`（`create_app(deps)` 回 FastAPI）；`src/adapters/http/routes/sessions.py`、`chargers.py`、`ocpp.py`；`src/main.py`。測試 `tests/adapters/http/test_api.py` 用 `TestClient`，同名測試 snake_case。
3. **（30 分）ACL，TDD**：
   - Node：`src/adapters/ocpp-acl/OcppTranslator.ts`（純函式：`translate(chargerId, ocppMessage) → Command | null`）、`src/adapters/ocpp-acl/ConnectorIdMapper.ts`（`(CP-A12, 2) → CP-A12-2`）。測試 `test/adapters/ocpp-acl/OcppTranslator.test.ts`：
     `StartTransaction with idTag TAG-MONTHLY-77 on connector 2 becomes StartCharging on CP-A12-2`、
     `MeterValues with Energy.Active.Import.Register 7000 becomes ReportMeterValue 7000`、
     `StopTransaction with meterStop 13400 becomes StopCharging`、
     `StatusNotification Faulted with errorCode E42 becomes ReportFault and stillEnergized is derived`、
     `unknown OCPP action returns null and is logged, never thrown into the domain`、
     `ACL output contains no OCPP field names`（把命令物件 `JSON.stringify` 後斷言不含 `idTag`、`meterStart`、`errorCode` 這些原始字——你的命令欄位叫 `idTag` 也行，但要在 `README-mvp.md` 翻譯表中明列；名字相同不代表語意相同）。
   - Python：`src/adapters/ocpp_acl/translator.py`、`connector_id_mapper.py`；測試 `tests/adapters/ocpp_acl/test_translator.py`。
4. **（15 分）** 跑模擬器打你的 API：
   ```bash
   # 終端 1
   cd starter/node && npm run dev        # 或 python -m src.main（看 starter README）
   # 終端 2，repo 根目錄
   node scripts/ocpp-sim/sim.js --charger CP-A12 --connector 2 --idTag TAG-MONTHLY-77 --base http://localhost:3000
   # 或 python scripts/ocpp-sim/sim.py ...
   ```
   （實際指令與旗標以 `scripts/ocpp-sim/README.md` 為準。）看到 `S-991` 建立、`GET /sessions/S-991` 回 `Charging`。

### 貼給 Claude Code 的提示
```
/tdd OCPP ACL

Day 6 Block 1。我要 TDD OCPP 防腐層：StartTransaction / MeterValues / StopTransaction / StatusNotification(Faulted) → StartCharging / ReportMeterValue / StopCharging / ReportFault。
規則：OCPP 的字只能出現在 src/adapters/ocpp-acl/；ACL 不做業務判斷（占用、授權都不在這裡）。
先問我三個問題：
1. OCPP 的 connectorId 是整數 2，我的 ConnectorId 是 CP-A12-2——誰知道 chargerId？從 URL 還是訊息？
2. StatusNotification(Faulted) 的 stillEnergized 從哪裡推？OCPP 沒有這個欄位。
3. 收到 ACL 不認得的 action 要怎樣？拋錯、忽略、還是回 OCPP 的錯誤 conf？
然後照 /tdd 規則：我貼紅燈測試，你不寫 src/ 的碼。
這是我的第一個測試：
<貼上>
```

### 你自己要做的
- API 表（路徑、回應碼）與 ACL 翻譯表（OCPP 欄位 → 命令欄位 → 丟掉的欄位）。兩張表都進 `README-mvp.md`。
- 決定 `stillEnergized` 的推導規則（例如 `errorCode` 屬於某集合就 `true`）。寫下來，Day 7 的 backlog 可能會推翻它。
- 組裝根（`main.ts` / `main.py`）：這是唯一一個 import 所有 adapter 的檔案。

### 常見卡點
- **route handler 裡出現 `if (session.status === "Charging")`** → 規則跑進 adapter 了。handler 只做：解析請求 → 呼叫處理器 → 把結果映成回應碼。
- **ACL 想直接呼叫 repository** → ACL 是翻譯器；翻完交給處理器。`translate()` 保持純函式最好測。
- **模擬器打不到** → port、base URL、`/ocpp/{chargerId}` 路徑；看模擬器 README 的預設值。
- **Fastify inject / FastAPI TestClient 測試互相污染** → 每個測試 `buildServer()` / `create_app()` 一次，注入新的 in-memory repository。

### 產出
- HTTP + ACL 測試全綠；模擬器手動跑通 `StartTransaction` → `GET /sessions/S-991`。
- `README-mvp.md`：API 表、ACL 翻譯表。

---

## Block 2（90 分鐘）— 持久化：SQLite（預設）/ Postgres（選配）+ Outbox relay

### 目標
兩個 Repository 與 Outbox 換成 SQLite 實作，命令處理器一行不改；交易真的是交易（存聚合失敗 → outbox 也不寫）；relay 從 SQLite 讀 pending 發到 bus。

### 步驟
1. **（10 分）** 設計三張表（寫進 `README-mvp.md`）：
   - `charging_sessions(session_id PK, connector_id, status, id_tag, start_meter_wh, last_meter_wh, started_at, ended_at, stop_reason, version)`
   - `work_orders(work_order_id PK, charger_id, fault_code, status, opened_at, closed_at, outcome, duplicate_reports JSON)`；索引 `(charger_id, fault_code, status)` 給 `findOpenBy`
   - `outbox(event_id PK, type, version, occurred_at, producer, correlation_id, causation_id, payload JSON, sent_at NULL)`
   - `processed_events(consumer, key, processed_at, PK(consumer, key))`（Billing / AssetOps 的冪等表）
   - `draft_invoices(invoice_id PK, session_id UNIQUE, energy_wh, amount, status)`
2. **（40 分）SQLite，TDD**：
   - Node：`src/adapters/persistence/sqlite/db.ts`（開連線、跑 `migrations/*.sql`）、`SqliteChargingSessionRepository.ts`、`SqliteWorkOrderRepository.ts`、`SqliteOutbox.ts`、`SqliteUnitOfWork.ts`（`BEGIN` … `COMMIT` / `ROLLBACK`）、`SqliteProcessedEvents.ts`、`SqliteDraftInvoiceRepository.ts`。驅動用 starter `package.json` 已裝的那個。測試 `test/adapters/persistence/sqlite.test.ts`（用 `:memory:` 或暫存檔）：
     `SQLite repository round-trips S-991 and finds the active session on CP-A12-2`、
     `SQLite unit of work rolls back the outbox when the session save fails`、
     `SQLite outbox returns pending rows in occurredAt order and markSent hides them`、
     `Outbox relay over SQLite publishes each envelope exactly once across two runs`.
   - Python：`src/adapters/persistence/sqlite/db.py`（stdlib `sqlite3`）、`charging_session_repository.py`、`work_order_repository.py`、`outbox.py`、`unit_of_work.py`、`processed_events.py`、`draft_invoice_repository.py`；測試 `tests/adapters/persistence/test_sqlite.py`。
3. **（15 分）** 把 Day 5 的應用層測試**用 SQLite 實作再跑一次**（參數化：同一組測試跑 in-memory 與 SQLite）。這是六角架構的驗收：處理器不改、兩種 adapter 都綠。
4. **（15 分）relay 程序**：`src/shared/outbox-relay` 加一個可以輪詢的入口（`relayForever(intervalMs)` 或 CLI `npm run relay` / `python -m src.relay`）；`main` 啟動時一併啟動（或另開一個程序，你決定，寫進 README）。
5. **（10 分，選配）Postgres**：repo 根目錄 `docker compose up -d`（`docker-compose.yml` 只有 Postgres）；`DATABASE_URL=postgres://...` 時切換到 `src/adapters/persistence/postgres/`。同一套測試加 `describe.skipIf(!process.env.DATABASE_URL)`（Python：`pytest.mark.skipif`）。沒 Docker 就跳過，不影響今天的 DoD。

### 貼給 Claude Code 的提示
```
/tdd SQLite persistence

Day 6 Block 2。我要把 ChargingSessionRepository、WorkOrderRepository、Outbox、UnitOfWork 換成 SQLite 實作，Day 5 的處理器一行不改。
表設計在 workshop/day6/README-mvp.md。
先問我：
1. 聚合 → row 的映射放在 repository 內還是獨立 mapper？領域物件會不會因此多出 setter？
2. 交易怎麼傳給 repository？（同一個 connection / 同一個 transaction 物件？）
3. pendingEvents 在哪一刻被拉出來寫進 outbox？在 save() 內還是 UoW commit 前？
然後照 /tdd 規則：我先貼紅燈測試。
這是我的第一個測試：
<貼上>
```

### 你自己要做的
- 映射：領域物件不為了 ORM 長 setter。用 `toRow(session)` / `fromRow(row)`，或聚合提供 `snapshot()` / `restore()`（Day 4 延伸的 `fromEvents` 也行）。
- 交易邊界：一個 HTTP 請求 = 一個 UoW = 一個 SQLite 交易。relay 是另一個交易。
- 樂觀鎖要不要？（`version` 欄位）——MVP1 可以不要，但寫進「已知限制」。

### 常見卡點
- **`findActiveByConnector` 回多筆** → 資料髒了或 R1 沒守住；查詢加 `status = 'Charging'` 並考慮 `UNIQUE(connector_id) WHERE status='Charging'`（partial index）。
- **rollback 測試在 SQLite 上一直過** → 你的 repository 各自開了連線；交易要共用同一個 connection。
- **JSON 欄位** → SQLite 存 TEXT，讀出來 `JSON.parse`；Postgres 用 `jsonb`。
- **Node 的 SQLite 驅動編譯失敗** → 用 starter 鎖定的版本；真的裝不起來就先用 in-memory 跑 E2E，把持久化列為今天的落後項。
- **Python `sqlite3` 交易行為怪** → `isolation_level=None` 然後自己 `BEGIN` / `COMMIT`。

### 產出
- SQLite 全套測試綠；Day 5 應用層測試在 SQLite 上也綠。
- `README-mvp.md`：表設計、relay 怎麼跑、Postgres 切換方式（或「未做」）。

---

## Block 3（90 分鐘）— Docker 化 + E2E 劇本 + `/ship`

### 目標
一個 `Dockerfile` 跑起 API + relay；`scripts/e2e` 對著它跑完整個下午；`/ship` 清單走一遍。

### 步驟
1. **（20 分）Dockerfile**（`starter/<lang>/Dockerfile`）：
   - Node：`FROM node:20-alpine` → `COPY package*.json` → `npm ci` → `COPY . .` → `npm run build` → `CMD ["node","dist/main.js"]`；`ENV DB_PATH=/data/app.db`；`VOLUME /data`。
   - Python：`FROM python:3.11-slim` → `COPY requirements.txt` → `pip install -r` → `COPY . .` → `CMD ["uvicorn","src.adapters.http.app:app","--host","0.0.0.0","--port","8000"]`（或 `python -m src.main`）。
   ```bash
   docker build -t evops-mvp starter/node     # 或 starter/python
   docker run --rm -p 3000:3000 -v evops-data:/data evops-mvp
   ```
   沒有 Docker：直接 `npm run start` / `python -m src.main`，E2E 一樣能跑；`README-mvp.md` 寫兩種。
2. **（40 分）E2E**：讀 `scripts/e2e/README.md`，劇本檔在 `scripts/e2e/afternoon.*`（名稱以實際為準）。它會依序打：
   | 時間 | 動作（透過 API 或模擬器） | 斷言 |
   |---|---|---|
   | 14:02 | Parking stub 發 `parking.vehicle_entered.v1`（`ABC-1234`, `SITE-TPE-01`） | 200，Charging 不受影響 |
   | 14:04 | OCPP `StartTransaction`（CP-A12, connector 2, `TAG-MONTHLY-77`, meterStart 1000） | `S-991` 為 `Charging` |
   | 14:10 | OCPP `StartTransaction`（同連接器, `TAG-VISITOR-03`） | 409 / `ChargingStartRejected(ConnectorOccupied)`；`S-991` 不變 |
   | 14:20 | OCPP `MeterValues` 7000 | 202 |
   | 14:25 | OCPP `MeterValues` 6500 | 422 / `MeterValueRejected`；`lastMeterWh` 7000 |
   | 14:31 | OCPP `StopTransaction` meterStop 13400 | `Completed`, `energyWh 12400` |
   | 14:31+ | relay 跑 | `GET /invoices?sessionId=S-991` 有一張 Draft，`energyWh 12400` |
   | 14:33 | Parking stub 發 `parking.session.closed.v1`（`P-441`） | 200（MVP1 只驗收下、不合併） |
   | 18:10 | OCPP `StatusNotification(Faulted, E42)` | `WO-2208` Open |
   | 18:15 | OCPP `StatusNotification(Faulted, E42)` | 仍一張；`duplicateReports` 1 |
   | 18:18 | `GET /work-orders?chargerId=CP-A12` | `WO-2208` 指派 `TECH-HAO`；relay 重跑 → `ops.work_order.opened.v1` 只發一次 |
   ```bash
   # API 跑著（本機或 Docker），repo 根目錄：
   E2E_BASE_URL=http://localhost:3000 node scripts/e2e/run.js      # 或 python scripts/e2e/run.py
   ```
   失敗就修 adapter；**不要為了 E2E 改領域層**（要改就記下來，那是昨天的 bug）。輸出貼進 `e2e-log.md`。
3. **（20 分）** `/ship`：走上線清單。它會問日誌（每行有 `correlationId`？）、健康檢查（`GET /health`）、設定（環境變數）、失敗模式（relay 掛了會怎樣）。能補的補，不能補的寫進「已知限制」。
4. **（10 分）** `README-mvp.md` 補完：E2E 每一步、已知限制、`/ship` 未勾項目。

### 貼給 Claude Code 的提示
```
/ship

Day 6 Block 3。MVP1 在本機跑起來了，scripts/e2e 的結果如下（貼 e2e-log.md 內容）：
<貼上>
請用上線清單逐項問我（API / 持久化 / Docker / E2E / 日誌），每項只問一個能用「有 / 沒有 / 在哪個檔」回答的問題。
特別問：
1. 一個請求從 HTTP 進來到 outbox relay 發出去，日誌能用同一個 correlationId 串起來嗎？
2. relay 程序掛掉 10 分鐘再起來，帳務會少收還是多收？
3. 沒有 Docker 的同學照 README-mvp.md 能跑通 E2E 嗎？
不要幫我補碼；未通過的項目我自己決定「今天補」或「寫進已知限制」。最後給「下一個最小步驟」。
```

### 你自己要做的
- 已知限制清單。誠實列：沒有樂觀鎖、relay 單程序、沒有認證、Parking / Dispatch 是 stub、`stillEnergized` 是推導的。
- `README-mvp.md` 要讓**沒上過課的人**照著跑通。明天 PR 的 reviewer 就是那個人。

### 常見卡點
- **E2E 的 14:10 那步過不了** → 看 HTTP 回應碼是不是照 Day 4 的決定；E2E 劇本斷言的是「拒絕」語意，回應碼可在 `scripts/e2e` 的設定調整（看 README）。
- **草稿帳單沒出現** → relay 沒跑。E2E 劇本裡有「relay 跑」那步，本機要有 relay 程序或提供 `POST /admin/relay` 手動觸發（MVP 可接受，寫進限制）。
- **18:15 開了第二張單** → `findOpenBy` 的 SQL 沒過濾 `status='Open'`，或冪等表沒生效。
- **Docker 內 SQLite 檔案沒有持久化** → `VOLUME /data` + `DB_PATH`。
- **時間**：E2E 劇本用固定時間（14:02…）；API 要接受請求帶的 `at`，不要用伺服器時鐘覆蓋——這是 Day 4「時間從命令進來」的回報。

### 產出
- `Dockerfile` 可 build 可跑（或 README 明列「未 Docker 化」的替代跑法）。
- `scripts/e2e` 全過；`workshop/day6/e2e-log.md` 有輸出。
- `workshop/day6/README-mvp.md` 七個小節齊全。

---

## Check-out（30 分鐘）

### Quiz（5 題）
1. OCPP 的 `connectorId: 2` 與領域的 `ConnectorId("CP-A12-2")` 誰負責對應？這個對應如果寫進 `ChargingSession` 會有什麼問題？
2. 今天你改了幾行 `src/charging/domain/` 或 `src/charging/application/`？如果不是零，那些改動代表什麼？
3. 為什麼 outbox 表要和 `charging_sessions` 在同一個資料庫、同一個交易？分開放會發生什麼？
4. E2E 的 18:15 那步：模擬器送了第二次 `StatusNotification(Faulted, E42)`。走過哪幾層、各做了什麼判斷，最後為什麼只有一張工單？
5. relay 掛掉 10 分鐘再起來，Billing 會多收還是少收 `charging.session.completed.v1`？哪一層保證結果正確？

<details>
<summary>參考答案</summary>

1. ACL（`ConnectorIdMapper`）。寫進聚合會讓領域層知道 OCPP 的編號方式，之後換 OCPP 2.0.1（`evseId` + `connectorId`）領域層要改；而且違反「OCPP 不得洩入領域層」。
2. 理想是零。非零代表 Day 4–5 有漏：例如聚合沒暴露足夠的快照給持久化、處理器把時間寫死用伺服器時鐘。記進 `retro.md`。
3. 同一交易才有原子性：聚合寫入成功 ⇔ 事件寫入成功。分開放（例如事件寫到另一個 DB 或直接發 bus）就回到「存成功發失敗 / 發成功存失敗」兩種不一致（Day 5 Quiz 1）。
4. ACL 翻成 `ReportFault(CP-A12, E42, 18:15)` → 處理器 / PM：`ProcessedEvents` 查 eventId（不同，放行）→ `WorkOrderRepository.findOpenBy(CP-A12, E42)` 找到 `WO-2208` → `attachDuplicateReport(18:15)` → 存回、outbox 沒有新的 `opened` 信封 → 只有一張。
5. 不會少收（事件在 outbox 裡等著，relay 回來就送）；可能多收（at-least-once，例如 relay 送出後標記前掛掉）。Billing 消費者的冪等（`sessionId` + `processed_events`）保證多收也只有一張草稿。
</details>

### 交付物自評
- [ ] HTTP API 六條路由 + `/ocpp/{chargerId}`；R1 拒絕回應碼一致
- [ ] ACL 測試全綠；`grep -r "StatusNotification\|StartTransaction\|MeterValues\|meterStart" src/` 只命中 `src/adapters/ocpp-acl/`
- [ ] SQLite repository ×2、Outbox、UoW、冪等表、草稿帳單表；rollback 測試綠；Day 5 應用層測試在 SQLite 上綠
- [ ] `Dockerfile` 可 build（或 README 明列替代）；`docker compose up -d` Postgres 為選配
- [ ] `scripts/e2e` 全過，`e2e-log.md` 有輸出
- [ ] `README-mvp.md` 七個小節；`/ship` 未勾項目在「已知限制」
- [ ] 今天沒改（或已記錄為什麼改）`src/*/domain/`；commit 在 `workshop/<你的名字>`

### 用 /checkout 讓助教檢查
```
/checkout

今天是 Day 6。請對照 docs/rubric.md 的 Day 6 DoD：
1. 跑 starter/<lang> 全部測試，貼摘要。
2. grep src/ 內的 OCPP 字眼（StatusNotification、StartTransaction、StopTransaction、MeterValues、meterStart、meterStop、errorCode），列出不在 src/adapters/ocpp-acl/ 的命中。
3. git diff 今天對 src/*/domain/ 與 src/charging/application/ 的改動行數；非零的話問我每一處為什麼。
4. 檢查 workshop/day6/README-mvp.md 七個小節與 e2e-log.md 是否有實際輸出。
每項回「過 / 不過 + 一句理由」；不過的給一個問題。最後給「下一個最小步驟」，以及明天 PR 前我該先把哪三個檔案再讀一次。
```

---

## 如果你落後了

最小可行版本（約 4 小時）：
- B1 只做 `POST /sessions/start`、`POST /sessions/{id}/stop`、`POST /ocpp/{chargerId}`（ACL 只翻 `StartTransaction` 與 `StopTransaction`）；模擬器只跑這兩步。
- B2 只做 `SqliteChargingSessionRepository` + `SqliteOutbox` + UoW；WorkOrder 留 in-memory（寫進限制）。
- B3 不做 Docker；E2E 只跑到 14:31（草稿帳單），故障段落留明天 B1 補。
- `README-mvp.md` 至少寫「怎麼跑」與「已知限制」。

## 延伸

- 用 Postgres 跑同一套測試與 E2E（`docker compose up -d`），比較 SQLite 與 Postgres 的 partial index 寫法。
- 加結構化日誌（Node: pino / Python: structlog），每行帶 `correlationId`、`causationId`；用 E2E 跑一次，抓出 `S-991` 從 HTTP 到 Billing 的完整鏈。
- 讓模擬器跑 OCPP 2.0.1 的 `TransactionEvent`（`scripts/ocpp-sim` 若支援），證明只改 ACL、領域層零改動。
- 加 `GET /health` 與 relay 的 lag 指標（pending 筆數、最舊 pending 的年齡）。
