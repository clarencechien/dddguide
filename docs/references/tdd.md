# TDD（Test-Driven Development）

> Day 4 B2 的方法論，Day 5 延續。交付物：`starter/<lang>/src/charging/**` 測試全綠、`workshop/day4/test-report.md`。用 `/tdd` 當教練——它會拒絕在沒有紅燈時寫產品碼。

## 讀完你會拿到

- 紅 / 綠 / 重構的節奏，以及每一步「停下來」的條件。
- 本專案的 inside-out 順序：聚合 → 應用服務 → adapter，與對應的測試金字塔形狀。
- 「測試名稱就是規則」的命名法。
- vitest 與 pytest 的最小速查表，含 starter 的實際指令與檔案路徑。
- 跟 Claude 做 TDD 的對話長什麼樣（含 Claude 不准做的事）。
- starter 附的 R1 紅燈測試（TypeScript 與 Python）逐行解讀，以及「正確的紅」長什麼樣。

---

## 1. 為什麼存在

Kent Beck 的定義只有三步：

1. **紅**：寫一個會失敗的測試，描述你想要的行為。
2. **綠**：用最少的程式碼讓它過。允許醜。
3. **重構**：在綠燈下整理，不改行為。

工作坊要它的理由不是「測試覆蓋率」，是：

- **規則 R1–R8 已經是 Given / When / Then 了**。TDD 是把它們變成可執行規格的最短路徑。
- **聚合設計會在寫測試時被逼出來**。「我要怎麼斷言 `ChargingStartRejected`？」→「所以拒絕是事件不是例外」→ `pullEvents()` 就出現了。
- **Claude 寫產品碼太快**。沒有紅燈，Claude 會給你一個 200 行的「完整實作」，你看不懂也測不到。`/tdd` 的存在就是拉住它。

---

## 2. 節奏與停止條件

```
挑一條規則（R1）
  └─ 挑一個 scenario（「占用中的連接器拒絕第二次 Start」）
       ├─ 紅：寫 / 讀測試 → 跑 → 看到它因為「正確的理由」失敗
       │      停止條件：失敗訊息是 `Error: TODO R1`（starter 的骨架）或
       │                「期望 1 個 ChargingStartRejected 得到 0 個」——不是語法錯、不是 import 錯
       ├─ 綠：最少程式碼 → 跑 → 全綠
       │      停止條件：這個測試過了，而且之前的測試沒壞
       └─ 重構：改名、抽方法、刪重複 → 跑 → 仍全綠
              停止條件：你能在 10 秒內說出「我改了什麼、行為沒變」
  └─ 下一個 scenario（把 `it.skip` / `@pytest.mark.skip` 拿掉）
下一條規則
```

三個「不准」：

1. 不准一次寫兩個測試。
2. 不准在紅燈時重構。
3. 不准在綠燈時加功能（「順便把 R2 也做了」）。

一個循環通常 2–10 分鐘。超過 20 分鐘沒綠 → 測試太大，拆。

---

## 3. 本專案的 inside-out

| 順序 | 層 | 測什麼 | 替身 | Day |
|---|---|---|---|---|
| 1 | 聚合 `charging/domain/ChargingSession` | R1–R4 的每個 scenario | 無（純物件） | 4 |
| 2 | 聚合 `assetops/domain/WorkOrder` | R5 | 無 | 4 |
| 3 | 應用服務 `charging/application/ChargingService` | 命令 → 聚合 → 整合事件進 Outbox；授權 port | `InMemoryChargingSessionRepository`、`InMemoryAuthorizationService`、`InMemoryOutbox`、`FixedClock` | 5 |
| 4 | `billing/BillingDraftConsumer`、`assetops/application/FaultProcessManager` | 冪等、去重鍵、`redeliver` | `InMemoryEventBus` | 5 |
| 5 | ACL `adapters/ocpp/OcppAcl` | OCPP frame → 命令；拒絕 → `Blocked` / `Invalid` | 上面那些 | 6 |
| 6 | Adapter（HTTP、SQLite） | 路由 → 命令；repo 契約測試 | 真 SQLite（記憶體模式） | 6 |
| 7 | E2E `scripts/e2e` | 14:02 → 18:18 整條 | 模擬器 + 真程序 | 6 |

**為什麼 inside-out 而不是 outside-in**：因為規則在裡面。Outside-in（從 HTTP 測試開始）適合「規則不清楚、先把介面定下來」的情境；我們 Day 2 已經把規則定得很清楚了。

### 3.1 金字塔的形狀

```
        E2E（1 條劇本）                 ← scripts/e2e
      Adapter 測試（~10）               ← OcppAcl、HTTP 路由、SQLite repo 契約
    應用服務 + 消費者測試（~20）        ← ChargingService、BillingDraftConsumer、FaultProcessManager
  聚合測試（~30–40）                    ← R1–R5 的每個 scenario 至少一個
```

比例大概 1 : 10 : 20 : 40。如果你的 E2E 有 15 條、聚合測試只有 5 個，金字塔倒了，`/review` 會指出。

---

## 4. 測試名稱就是規則

starter 的慣例（CLAUDE.md）：**測試名 = 規則句子，英文**。

```ts
describe('ChargingSession aggregate (Day 4)', () => {
  it('R1 occupied connector rejects a second start', ...);
  it('R2 unauthorized idTag cannot start charging', ...);
  it('R3 meter values must be monotonic; a backwards value is rejected and recorded', ...);
  it('R4 stop completes the session with energyWh = last meter - start meter (12.4 kWh)', ...);
});
```

Python：`def test_R1_occupied_connector_rejects_a_second_start():`。

規則：

- 名稱開頭是規則編號；後面是 `rules.md` 那個 scenario 的一句話。
- 測試失敗時的輸出直接是業務語言：`R1 occupied connector rejects a second start`。老陳看得懂（至少看得懂 R1）。
- 一個 `it` 只斷言一個 scenario 的 Then（可以有多個 `expect`，但都在講同一件事）。
- 每條規則綠了，在 `workshop/day4/test-report.md` 加一行：測試名、規則、commit hash。

---

## 5. vitest / pytest 速查（starter 的實際指令）

### vitest（`starter/node`）

```bash
cd starter/node
npm install
npm test                           # vitest run（一次）
npm run test:watch                 # 監看模式（TDD 主要用這個）
npx vitest run -t "R1"             # 只跑名稱含 R1 的
npm run typecheck                  # tsc --noEmit
```

測試檔：`starter/node/test/charging/ChargingSession.test.ts`（Day 4）、`test/assetops/`、`test/billing/`、`test/adapters/`（Day 5–6 自己加）。

```ts
import { describe, it, expect } from 'vitest';
expect(x).toBe(1);                       // 嚴格相等
expect(events).toEqual([{ type: 'ChargingStartRejected', ... }]);   // 深相等，starter 的斷言風格
expect(events.filter(e => e.type === 'ChargingStarted')).toHaveLength(0);
expect(() => session.stop('Local', T)).toThrow(InvalidStateError);
it.skip('R2 ...', () => {});             // starter 用 skip 排隊下一條規則
```

### pytest（`starter/python`）

```bash
cd starter/python
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest                             # pyproject 已設 pythonpath=src、testpaths=tests、-q
pytest -k "R1"                     # 名稱含 R1
pytest -x                          # 第一個失敗就停
pytest --lf                        # 只跑上次失敗的
```

測試檔：`starter/python/tests/charging/test_charging_session.py`。

```python
import pytest
assert session.pull_events() == [ChargingStartRejected(occurred_at=T, connector_id="CP-A12-2", id_tag="TAG-VISITOR-01", reason="ConnectorOccupied")]
assert session.status is SessionStatus.CHARGING
with pytest.raises(InvalidStateError):
    session.stop("Local", T)
@pytest.mark.skip(reason="TODO R2")
def test_R2_unauthorized_id_tag_cannot_start_charging(): ...
```

---

## 6. starter 附的 R1 紅燈測試

Day 4 B2 第一件事：**讀它**，對照你的 `rules.md`。名稱或數字不合就先改測試（測試是規格，規格是你的）。

### 6.1 TypeScript（`starter/node/test/charging/ChargingSession.test.ts`）

```ts
import { describe, expect, it } from 'vitest';
import { ChargingSession, SessionStatus } from '../../src/charging/domain/ChargingSession.ts';

// Canonical afternoon at SITE-TPE-01 (curriculum §1.6): CP-A12-2, TAG-MONTHLY-77, S-991, 12.4 kWh.
const T_1404 = '2025-05-20T14:04:00+08:00';
const T_1413 = '2025-05-20T14:13:00+08:00';

describe('ChargingSession aggregate (Day 4)', () => {
  it('R1 occupied connector rejects a second start', () => {
    // Given 連接器 CP-A12-2 上有進行中的會話 S-991（TAG-MONTHLY-77，起始 100 Wh）
    const session = ChargingSession.idle('CP-A12-2');
    session.start({ sessionId: 'S-991', idTag: 'TAG-MONTHLY-77', authorized: true, meterStartWh: 100, at: T_1404 });
    session.pullEvents();                                   // 清掉 ChargingStarted，只看接下來發生的事

    // When 另一張憑證嘗試 Start
    session.start({ sessionId: 'S-992', idTag: 'TAG-VISITOR-01', authorized: true, meterStartWh: 4100, at: T_1413 });

    // Then 只有一個 ChargingStartRejected(ConnectorOccupied)，沒有 ChargingStarted
    expect(session.pullEvents()).toEqual([
      { type: 'ChargingStartRejected', connectorId: 'CP-A12-2', idTag: 'TAG-VISITOR-01', reason: 'ConnectorOccupied', occurredAt: T_1413 },
    ]);
    // But 原會話不變
    expect(session.sessionId).toBe('S-991');
    expect(session.idTag).toBe('TAG-MONTHLY-77');
    expect(session.status).toBe(SessionStatus.Charging);
  });

  it.skip('R2 unauthorized idTag cannot start charging', () => { /* TODO */ });
  it.skip('R3 meter values must be monotonic; a backwards value is rejected and recorded', () => { /* TODO */ });
  it.skip('R4 stop completes the session with energyWh = last meter - start meter (12.4 kWh)', () => { /* TODO */ });
});
```

三個值得注意的設計：

1. `toEqual([...])` 斷言**整個事件陣列**，所以「沒有發布 `ChargingStarted`」（GWT 的 `But` 行）自動被涵蓋。
2. 第一次 `pullEvents()` 是為了清掉 Given 階段的事件。這也順便測了「pull 之後清空」。
3. 「原會話不變」斷言了三個欄位：sessionId、idTag、status。少一個就可能漏掉「第二次 start 覆寫了 idTag」這種 bug。

### 6.2 Python（`starter/python/tests/charging/test_charging_session.py`）

```python
from charging.domain.charging_session import ChargingSession, SessionStatus
from charging.domain.events import ChargingStartRejected

T_1404 = "2025-05-20T14:04:00+08:00"
T_1413 = "2025-05-20T14:13:00+08:00"

def test_R1_occupied_connector_rejects_a_second_start():
    session = ChargingSession.idle("CP-A12-2")
    session.start(session_id="S-991", id_tag="TAG-MONTHLY-77", authorized=True, meter_start_wh=100, at=T_1404)
    session.pull_events()

    session.start(session_id="S-992", id_tag="TAG-VISITOR-01", authorized=True, meter_start_wh=4100, at=T_1413)

    assert session.pull_events() == [
        ChargingStartRejected(occurred_at=T_1413, connector_id="CP-A12-2", id_tag="TAG-VISITOR-01", reason="ConnectorOccupied")
    ]
    assert session.session_id == "S-991"
    assert session.id_tag == "TAG-MONTHLY-77"
    assert session.status is SessionStatus.CHARGING
```

### 6.3 正確的紅

第一次跑：

```
FAIL  test/charging/ChargingSession.test.ts > R1 occupied connector rejects a second start
Error: TODO R1
```

這是**正確的紅**：測試跑到了 `start()`，而 `start()` 還沒實作。如果你看到的是 `Cannot find module` 或 `SyntaxError`，那是環境問題，先修，不算紅燈。`/tdd` 會要求你把這段輸出貼給它。

### 6.4 讓它變綠的最少程式碼（提示，不是答案）

1. `start()`：如果 `this._status === 'Charging'` → `record(ChargingStartRejected(ConnectorOccupied))`，return。
2. 否則設狀態、記欄位、`record(ChargingStarted)`。
3. **R2 的 `authorized` 先不要判**——那是下一條規則。這個測試兩次都 `authorized: true`，所以你可以先忽略它。
4. 綠了 → commit `R1 green: reject start on occupied connector` → 重構（例如把兩個 `record(...)` 的重複抽成 `reject(reason, idTag, at)`）→ 再跑 → commit。
5. 把 R2 的 `it.skip` 改成 `it`，回到紅。

### 6.5 接下來的紅燈（starter 註解裡已經給了數字）

| 規則 | Given | When | Then |
|---|---|---|---|
| R2 | Idle 連接器 | `start(authorized=false)` | `ChargingStartRejected(Unauthorized)`，狀態仍 Idle；另寫 happy path |
| R3 | Charging，lastMeterWh=4100 | `reportMeter(3900)` | `MeterValueRejected(NotMonotonic, meterWh=3900, lastMeterWh=4100)`，lastMeterWh 仍 4100；再 `reportMeter(8100)` → `EnergyMetered` |
| R4 | start 100，讀 4100 / 8100 / 12500 | `stop('Local', 14:31)` | `ChargingCompleted(energyWh=12400, startedAt=14:04, endedAt=14:31, stopReason='Local')`，Completed；Idle / Completed 下 `stop` throw `InvalidStateError` |
| R5 | `WorkOrder.open(WO-2208, CP-A12, GroundFailure, 18:10)` | `appendDuplicateReport(18:10:08)` | `duplicateReportCount === 1`，`DuplicateFaultReported`，狀態仍 Open |

---

## 7. 架構規則的測試（R8 與依賴規則）

R8「聚合內不得直接發送到 broker」可以用一個測試守住：

```ts
// starter/node/test/arch/dependency-rule.test.ts（自己加）
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const forbidden = [/adapters\//, /shared\/EventBus/, /shared\/Outbox/, /node:http/, /sqlite/, /publish\(/, /new Date\(/];
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]);

describe('R8 / dependency rule: domain has no I/O', () => {
  for (const file of [...walk('src/charging/domain'), ...walk('src/assetops/domain')]) {
    it(`${file} has no I/O import`, () => {
      const src = readFileSync(file, 'utf8');
      for (const re of forbidden) expect(src, `${file} matches ${re}`).not.toMatch(re);
    });
  }
});
```

Python 版用 `ast` 掃 `import` 節點，或直接裝 `import-linter`。

---

## 8. 跟 Claude 做 TDD

### 8.1 正確的對話

```
你：/tdd R1
Claude：我們從 R1 開始。starter 已經附了紅燈測試；你的 rules.md 裡 R1 的例子跟它一致嗎？
你：一致，我用 TAG-VISITOR-01。
Claude：好。跑一下，把失敗訊息貼給我。我不會先寫產品碼。
你：Error: TODO R1
Claude：這是正確的紅燈——測試碰到了還沒實作的 start()。現在只做「占用時拒絕」這一件事：
        你想在 start() 裡怎麼判斷「占用」？
你：看 this._status === 'Charging'
Claude：對。record 一個 ChargingStartRejected 然後 return。先不要碰 authorized。寫完跑。
你：綠了。
Claude：重構：兩段 record(...) 幾乎一樣，要不要抽成 reject(reason, idTag, at)？改完跑一次。
Claude：下一個最小步驟：把 R2 的 it.skip 拿掉，跑，貼紅燈。
```

### 8.2 Claude 不准做的事（`.claude/skills/tdd/SKILL.md`）

1. 在沒有紅燈測試的情況下產出 `src/` 下的程式碼。
2. 一次給兩條規則的實作。
3. 在紅燈時建議重構。
4. 把測試改成會過（除非測試本身錯了，而且要先說明為什麼）。
5. 幫你「順便」加 R2。

### 8.3 你不該做的事

- 貼整份 `rules.md` 說「幫我全部實作」。
- 綠燈後跳過重構直接下一條（三條之後你會有三份重複的 `record(...)`）。
- 沒看失敗訊息就改程式碼。
- 為了讓測試過把 `it.skip` 全拿掉——一次一條。

---

## 9. 在本專案怎麼出現

| Day | TDD 的影子 |
|---|---|
| 2 | `rules.md` 的每個 scenario 就是未來的一個 `it` |
| 4 | R1 → R2 → R3 → R4 → R5，每條紅綠重構；`test-report.md` 記錄 |
| 5 | `ChargingService`、消費者、Process Manager 同樣節奏；加 `bus.redeliver(eventId)` 的冪等測試 |
| 6 | `OcppAcl` 純函式測試；repo 契約測試（in-memory 與 SQLite 跑同一組） |
| 7 | `/review` 看金字塔形狀、測試命名、有沒有測到 But 行 |

---

## 10. 新手常犯的錯

| 錯 | 改法 |
|---|---|
| 先寫完聚合再補測試 | 那不是 TDD，是「有測試」；設計不會被逼出來 |
| 測試名叫 `test1`、`should work` | 規則編號 + scenario |
| 一個測試 30 個 `expect` | 一個 scenario 一個測試 |
| 用 mock 驗證「有呼叫 repo.save」 | 用 fake repo 驗證「findById 找得到」 |
| 在聚合測試裡起 SQLite | 聚合測試零 I/O |
| 為了測試把 private 改 public | 用事件與 getter 斷言，不用內部狀態 |
| 紅燈是 import error 就開始寫產品碼 | 先讓紅燈「因為正確的理由」 |
| 綠燈後不重構 | 每條規則後至少問一次「有重複嗎」 |
| 一口氣把四個 `it.skip` 都拿掉 | 一次一條 |

---

## 11. 延伸閱讀

- Kent Beck, *Test-Driven Development: By Example*, 2002。—— 第一部分「Money example」跟著做一遍，兩小時。
- Steve Freeman & Nat Pryce, *Growing Object-Oriented Software, Guided by Tests*, 2009。—— outside-in 與 mock 的正確用法；讀第 1–2 部分。
- Martin Fowler, "TestPyramid", 2012 與 "Mocks Aren't Stubs", 2007（martinfowler.com）。
- Gerard Meszaros, *xUnit Test Patterns*, 2007。—— 替身的正名與測試異味目錄。
- Ian Cooper, "TDD, Where Did It All Go Wrong", NDC 2013（演講）。—— 為什麼測試要對著行為（規則）而不是類別。
- Kent Beck, "Canon TDD", 2023（tidyfirst.substack.com）。—— 作者對「什麼是 TDD」的最新澄清。
- vitest 官方文件（vitest.dev）；pytest 官方文件（docs.pytest.org）"How to" 章節。

---

## 自我檢查

1. 「正確的紅」是什麼意思？`Error: TODO R1` 算嗎？`Cannot find module` 算嗎？
2. 本專案為什麼用 inside-out？什麼情況下 outside-in 比較好？
3. starter 的 R1 測試裡「原會話不變」斷言了哪三件事？`toEqual([...])` 為什麼同時涵蓋了 `But` 行？
4. `/tdd` 不准 Claude 做的五件事是什麼？你認為哪一件最容易被違反？
5. 用 R3 寫一個測試的名稱與 Given / When / Then 註解（用 starter 註解裡的數字 4100 / 3900 / 8100）。
