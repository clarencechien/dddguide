# .github/

這個資料夾**故意是空的**（只有這份說明）。

Day 7 B2 的交付物之一，是由你自己寫出 `.github/workflows/ci.yml`：

1. 在 `workshop/<你的名字>` 分支上建立 `.github/workflows/ci.yml`。
2. 至少跑兩個 job：`starter/node`（`npm ci && npm test`）或 `starter/python`（`pip install -r requirements.txt && pytest`），
   以及 `node contracts/validate.mjs`（整合事件契約範例必須通過驗證）。
3. 開 PR；PR 描述附上 ADR（`workshop/day3/adr/`）與事件契約（`contracts/`）的連結。
4. CI 綠燈才算 Day 7 交付完成（見 `docs/rubric.md`）。

提示：用 `/ship` 或 `/review` 請 Claude Code 幫你檢查 workflow，但**先自己寫一版**。
