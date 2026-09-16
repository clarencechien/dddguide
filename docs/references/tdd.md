# TDD（Test-Driven Development）

> Day 4 B2 的方法論，Day 5 延續。交付物：`starter/<lang>/src/charging/**` 測試全綠。用 `/tdd` 當教練——它會拒絕在沒有紅燈時寫產品碼。

## 讀完你會拿到

- 紅 / 綠 / 重構的節奏，以及每一步「停下來」的條件。
- 本專案的 inside-out 順序：聚合 → 應用服務 → adapter，與對應的測試金字塔形狀。
- 「測試名稱就是規則」的命名法。
- vitest 與 pytest 的最小速查表。
- 跟 Claude 做 TDD 的對話長什麼樣（含 Claude 不准做的事）。
- R1 的紅燈測試，TypeScript 與 Python 各一份，可直接貼進 starter。

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
       ├─ 紅：寫測試 → 跑 → 看到它因為「正確的理由」失敗
       │      停止條件：失敗訊息是「找不到 ChargingSession」或「期望 1 個 ChargingStartRejected 得到 0 個」，
       │                不是語法錯誤、不是 import 錯誤
       ├─ 綠：最少程式碼 → 跑 → 全綠
       │      停止條件：這個測試過了，而且之前的測試沒壞
       └─ 重構：改名、抽值物件、刪重複 → 跑 → 仍全綠
              停止條件：你能在 10 秒內說出「我改了什麼、行為沒變」
  └─ 下一個 scenario
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
| 1 | 聚合（`charging/domain`） | R1–R4 的每個 scenario | 無（純物件） | 4 |
| 2 | 聚合（`assetops/domain`） | R5 | 無 | 4 |
| 3 | 應用服務（`app/`） | 命令 → 聚合 → 事件進 Outbox；R1 的 repo 查詢；R2 的授權 | in-memory repo、fake clock、spy outbox | 5 |
| 4 | 消費者（`billing/`, Process Manager） | 冪等、去重鍵 | in-memory bus、store | 5 |
| 5 | ACL（`charging/acl`） | OCPP JSON → 命令 | 無（純函式） | 6 |
| 6 | Adapter（HTTP、SQLite） | 路由 → 命令；repo 契約測試 | 真 SQLite（記憶體模式） | 6 |
| 7 | E2E（`scripts/e2e`） | 14:02 → 18:18 整條 | 模擬器 + 真程序 | 6 |

**為什麼 inside-out 而不是 outside-in**：因為規則在裡面。Outside-in（從 HTTP 測試開始）適合「規則不清楚、先把介面定下來」的情境；我們 Day 2 已經把規則定得很清楚了。

### 3.1 金字塔的形狀

```
        E2E（1 條劇本）                 ← scripts/e2e
      Adapter 測試（~10）               ← HTTP 路由、SQLite repo 契約
    應用服務 + 消費者測試（~20）        ← app/, billing/, Process Manager
  聚合測試（~30–40）                    ← R1–R5 的每個 scenario 至少一個
```

比例大概 1 : 10 : 20 : 40。如果你的 E2E 有 15 條、聚合測試只有 5 個，金字塔倒了，`/review` 會指出。

---

## 4. 測試名稱就是規則

```ts
describe("R1 連接器占用時拒絕第二次 Start", () => {
  it("空閒的連接器可以開始", ...);
  it("占用中的連接器拒絕第二次 Start，發布 ChargingStartRejected(ConnectorOccupied)", ...);
  it("被拒後原會話不變", ...);
  it("另一把槍不受影響", ...);
});
```

規則：

- `describe` = 規則編號 + 一句話（從 `rules.md` 複製）。
- `it` = scenario 名稱（從 `rules.md` 複製）。
- 測試失敗時的輸出直接是業務語言：`R1 連接器占用時拒絕第二次 Start › 被拒後原會話不變`。老陳看得懂。
- 一個 `it` 只斷言一個 scenario 的 Then（可以有多個 `expect`，但都在講同一件事）。

Python 同理：`class TestR1ConnectorOccupied:` + `def test_rejects_second_start_on_occupied_connector(self):`。

---

## 5. vitest / pytest 速查

### vitest（`starter/node`）

```bash
npm test                    # 跑全部
npx vitest run src/charging # 跑一個目錄
npx vitest --watch          # 監看模式（TDD 主要用這個）
npx vitest run -t "R1"      # 只跑名稱含 R1 的
```

```ts
import { describe, it, expect, beforeEach } from "vitest";
expect(x).toBe(1);                       // 嚴格相等
expect(obj).toEqual({ a: 1 });           // 深相等
expect(arr).toHaveLength(1);
expect(events).toContainEqual(expect.objectContaining({ type: "ChargingStartRejected", reason: "ConnectorOccupied" }));
expect(() => s.stop(...)).toThrow(InvalidSessionState);
await expect(handler.handle(cmd)).resolves.toBeUndefined();
```

### pytest（`starter/python`）

```bash
pytest                      # 跑全部
pytest tests/charging       # 一個目錄
pytest -k "R1"              # 名稱含 R1
pytest -x                   # 第一個失敗就停
pytest --lf                 # 只跑上次失敗的
ptw                         # pytest-watch（需另裝）
```

```python
import pytest
assert x == 1
assert events == [ChargingStartRejected(...)]        # dataclass 相等
assert any(e.type == "ChargingStartRejected" and e.reason == "ConnectorOccupied" for e in events)
with pytest.raises(InvalidSessionState):
    s.stop(...)

@pytest.fixture
def repo(): return InMemoryChargingSessionRepository()
```

---

## 6. R1 的紅燈測試

兩份都假設 Day 4 的擺法：R1 由「應用層薄薄一層 + in-memory repo」保證（見 `ddd-tactical.md` §4.5）。如果你選擇把 R1 放進一個 `Connector` 聚合，測試形狀類似，只是主詞換掉。

### 6.1 TypeScript（`starter/node/test/charging/r1.connector-occupied.test.ts`）

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { ChargingSession } from "../../src/charging/domain/ChargingSession";
import { Connector, IdTag, Energy } from "../../src/charging/domain/values";
import { InMemoryChargingSessionRepository } from "../../src/adapters/outbound/memory/InMemoryChargingSessionRepository";
import { StartCharging } from "../../src/app/StartCharging";
import { FixedClock, SequenceIdGenerator, AllowListAuthorizer, SpyOutbox } from "../support/fakes";

const T1404 = new Date("2026-09-16T14:04:00+08:00");
const T1412 = new Date("2026-09-16T14:12:00+08:00");

describe("R1 連接器占用時拒絕第二次 Start", () => {
  let repo: InMemoryChargingSessionRepository;
  let outbox: SpyOutbox;
  let handler: StartCharging;

  beforeEach(() => {
    repo = new InMemoryChargingSessionRepository();
    outbox = new SpyOutbox();
    handler = new StartCharging(repo, new AllowListAuthorizer(["TAG-MONTHLY-77", "TAG-FLEET-03"]),
                                new SequenceIdGenerator("S", 991), new FixedClock(T1404), outbox);
  });

  it("占用中的連接器拒絕第二次 Start，發布 ChargingStartRejected(ConnectorOccupied)", async () => {
    // Given 連接器 CP-A12-2 上有進行中的充電會話 S-991
    await handler.handle({ connectorId: "CP-A12-2", idTag: "TAG-MONTHLY-77", meterStartWh: 105200, at: T1404 });
    outbox.clear();

    // When 另一張憑證嘗試 Start
    const result = await handler.handle({ connectorId: "CP-A12-2", idTag: "TAG-FLEET-03", meterStartWh: 106000, at: T1412 });

    // Then 發布 ChargingStartRejected(reason=ConnectorOccupied)
    expect(result).toEqual({ outcome: "rejected", reason: "ConnectorOccupied" });
    expect(outbox.domainEvents).toContainEqual(expect.objectContaining({
      type: "ChargingStartRejected", connectorId: "CP-A12-2", idTag: "TAG-FLEET-03", reason: "ConnectorOccupied", at: T1412,
    }));
    // But 沒有發布 ChargingStarted
    expect(outbox.domainEvents.filter(e => e.type === "ChargingStarted")).toHaveLength(0);
  });

  it("被拒後原會話不變", async () => {
    await handler.handle({ connectorId: "CP-A12-2", idTag: "TAG-MONTHLY-77", meterStartWh: 105200, at: T1404 });
    await handler.handle({ connectorId: "CP-A12-2", idTag: "TAG-FLEET-03", meterStartWh: 106000, at: T1412 });

    const s = await repo.findById("S-991");
    expect(s).not.toBeNull();
    expect(s!.isActive()).toBe(true);
    expect(s!.idTag.value).toBe("TAG-MONTHLY-77");
    expect(s!.meterStart.wh).toBe(105200);
    expect(await repo.findActiveByConnector("CP-A12-2")).toBe(s);
  });
});
```

第一次跑，預期的紅燈：`Cannot find module '../../src/app/StartCharging'`。**這不是「正確的理由」**——它是缺檔案。先建一個空殼讓它變成「期望 rejected 得到 undefined」，那才是紅燈。`/tdd` 會要求你貼出失敗訊息。

### 6.2 Python（`starter/python/tests/charging/test_r1_connector_occupied.py`）

```python
from datetime import datetime, timezone, timedelta
import pytest

from charging.domain.charging_session import ChargingSession
from charging.domain.values import Connector, IdTag, Energy
from adapters.outbound.memory.charging_session_repository import InMemoryChargingSessionRepository
from app.start_charging import StartCharging, StartChargingCommand
from tests.support.fakes import FixedClock, SequenceIdGenerator, AllowListAuthorizer, SpyOutbox

TPE = timezone(timedelta(hours=8))
T1404 = datetime(2026, 9, 16, 14, 4, tzinfo=TPE)
T1412 = datetime(2026, 9, 16, 14, 12, tzinfo=TPE)


class TestR1ConnectorOccupied:
    """R1 連接器占用時拒絕第二次 Start；發布 ChargingStartRejected(reason=ConnectorOccupied)，原會話不變。"""

    @pytest.fixture
    def repo(self):
        return InMemoryChargingSessionRepository()

    @pytest.fixture
    def outbox(self):
        return SpyOutbox()

    @pytest.fixture
    def handler(self, repo, outbox):
        return StartCharging(
            sessions=repo,
            authorizer=AllowListAuthorizer({"TAG-MONTHLY-77", "TAG-FLEET-03"}),
            ids=SequenceIdGenerator("S", 991),
            clock=FixedClock(T1404),
            outbox=outbox,
        )

    def test_rejects_second_start_on_occupied_connector(self, handler, outbox):
        # Given 連接器 CP-A12-2 上有進行中的充電會話 S-991
        handler.handle(StartChargingCommand(connector_id="CP-A12-2", id_tag="TAG-MONTHLY-77", meter_start_wh=105200, at=T1404))
        outbox.clear()

        # When 另一張憑證嘗試 Start
        result = handler.handle(StartChargingCommand(connector_id="CP-A12-2", id_tag="TAG-FLEET-03", meter_start_wh=106000, at=T1412))

        # Then 發布 ChargingStartRejected(reason=ConnectorOccupied)
        assert result.outcome == "rejected" and result.reason == "ConnectorOccupied"
        rejected = [e for e in outbox.domain_events if e.type == "ChargingStartRejected"]
        assert len(rejected) == 1
        assert rejected[0].connector_id == "CP-A12-2"
        assert rejected[0].id_tag == "TAG-FLEET-03"
        assert rejected[0].at == T1412
        # But 沒有發布 ChargingStarted
        assert not [e for e in outbox.domain_events if e.type == "ChargingStarted"]

    def test_original_session_unchanged_after_rejection(self, handler, repo):
        handler.handle(StartChargingCommand(connector_id="CP-A12-2", id_tag="TAG-MONTHLY-77", meter_start_wh=105200, at=T1404))
        handler.handle(StartChargingCommand(connector_id="CP-A12-2", id_tag="TAG-FLEET-03", meter_start_wh=106000, at=T1412))

        s = repo.find_by_id("S-991")
        assert s is not None
        assert s.is_active()
        assert s.id_tag == IdTag("TAG-MONTHLY-77")
        assert s.meter_start == Energy(105200)
        assert repo.find_active_by_connector("CP-A12-2") is s
```

### 6.3 讓它變綠的最少程式碼（提示，不是答案）

1. `StartCharging.handle`：查 `findActiveByConnector` → 有就 `outbox.append([rejectedEvent])` 並回 `{outcome:"rejected", reason:"ConnectorOccupied"}`。
2. 沒有就 `ChargingSession.start(...)` → `repo.save` → `outbox.append(session.pullEvents())` → 回 `{outcome:"started", sessionId}`。
3. R2 的授權**先不要寫**（那是下一條規則）。`AllowListAuthorizer` 在 R1 的測試裡兩張卡都允許，所以你可以先 hard-code `true`。

---

## 7. 架構規則的測試（R8 與依賴規則）

R8「聚合內不得直接發送到 broker」可以用一個測試守住：

```ts
// test/arch/dependency-rule.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const forbidden = [/adapters\//, /infrastructure\//, /fastify/, /sqlite/, /\bws\b/, /broker/i, /publish\(/];
function walk(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]); }
describe("R8 / 依賴規則：domain 與 app 不碰 I/O", () => {
  for (const file of [...walk("src/charging/domain"), ...walk("src/assetops/domain")]) {
    it(`${file} 沒有 I/O import`, () => {
      const src = readFileSync(file, "utf8");
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
Claude：我們從 R1 開始。rules.md 裡 R1 有四個 scenario，先做哪一個？
你：占用中拒絕第二次 Start
Claude：好。請你先寫測試（或告訴我你想怎麼斷言「拒絕」與「原會話不變」），我不會先寫產品碼。
你：（貼上測試）
Claude：跑一下，把失敗訊息貼給我。
你：Cannot find module '../../src/app/StartCharging'
Claude：這是缺檔案，不是規則失敗。建一個只有 handle() 回 undefined 的空殼，再跑。
你：expected { outcome: 'rejected', ... } received undefined
Claude：這是正確的紅燈。現在寫最少的程式碼讓它過——你想先在 handle 裡怎麼查「連接器是否占用」？
…
Claude：綠了。重構：`connectorId` 到處是裸字串，要不要抽 Connector 值物件？改完跑一次。
Claude：下一個最小步驟：scenario「被拒後原會話不變」。
```

### 8.2 Claude 不准做的事（寫在 `/tdd` 的 SKILL.md 裡）

1. 在沒有紅燈測試的情況下產出 `src/` 下的程式碼。
2. 一次給兩條規則的實作。
3. 在紅燈時建議重構。
4. 把測試改成會過（除非測試本身錯了，而且要先說明為什麼）。
5. 幫你「順便」加 R2。

### 8.3 你不該做的事

- 貼整份 `rules.md` 說「幫我全部實作」。
- 綠燈後跳過重構直接下一條（三條之後你會有三份重複的查詢碼）。
- 沒看失敗訊息就改程式碼。

---

## 9. 在本專案怎麼出現

| Day | TDD 的影子 |
|---|---|
| 2 | `rules.md` 的每個 scenario 就是未來的一個 `it` |
| 4 | R1 → R2 → R3 → R4 → R5，每條紅綠重構 |
| 5 | 應用服務與消費者，同樣節奏；加「同一事件送兩次」測試 |
| 6 | ACL 純函式測試；repo 契約測試（in-memory 與 SQLite 跑同一組） |
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
| 為了測試把 private 改 public | 用事件與查詢方法斷言，不用內部狀態 |
| 紅燈是 import error 就開始寫產品碼 | 先讓紅燈「因為正確的理由」 |
| 綠燈後不重構 | 每條規則後至少問一次「有重複嗎」 |

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

1. 紅燈「因為正確的理由失敗」是什麼意思？`Cannot find module` 算嗎？
2. 本專案為什麼用 inside-out？什麼情況下 outside-in 比較好？
3. R1 測試裡「被拒後原會話不變」斷言了哪四件事？少一件會漏掉什麼 bug？
4. `/tdd` 不准 Claude 做的五件事是什麼？你認為哪一件最容易被違反？
5. 用 R3 寫一個紅燈測試的名稱與三行 Given / When / Then 註解（不用寫程式碼）。
