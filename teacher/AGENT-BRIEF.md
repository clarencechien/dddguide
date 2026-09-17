# 給頁面寫手的共同簡報（每一天的 agent 都先讀這份）

你要寫 `teacher/src/dayN.body.html`（N 由任務指定），這是「教師版」：假設學員把這一天全程跑完，桌上會留下什麼。
講師會拿這一頁對照學員交的東西，所以**交付物必須完整**，不是摘要。

## 先讀（依序）
1. `teacher/SPEC.md` — 頁面骨架、元件、SVG 規則、內容規範。**照它寫，不要自創結構。**
2. `teacher/src/smoke.body.html` — 元件用法的最小範例。
3. `docs/curriculum.md` — 單一事實來源：識別碼（§1.6）、時間線（§1.7）、事件（§1.8）、規則 R1–R8（§1.9）、當天 Block（§2）。
4. `docs/days/dayN.md` — 當天教材：三個 Block、提示、卡點、check-out quiz。你的頁面要把這份教材「跑一遍」。
5. `docs/rubric.md` 當天那段 — check-out 表格用它的 DoD。
6. `docs/instructor.md` 當天那段 — 講師註的素材。
7. 任務裡列的其他來源（domain 文件、solutions 程式碼、scripts）。

## 寫法
- 繁體中文（台灣用語），程式碼與識別碼英文。用 §1.6 的識別碼：SITE-TPE-01、CP-A12、CP-A12-2、ABC-1234、P-441、S-991、TAG-MONTHLY-77、INV-778、WO-2208、TECH-HAO、12.4 kWh；時間 14:02 / 14:04 / 14:31 / 14:33 / 14:40 / 18:10 / 18:18。
- 助教對話照 `CLAUDE.md` 的規矩：先問 1–3 個問題、學員答、助教指出問題、結尾一行「下一個最小步驟：…」。至少每個 Block 一段 3–6 則的對話重播。
- 產出檔案（`.file`）要是**完整參考版本**。Markdown 交付物渲染成 HTML；程式碼用 `<pre>`，從 `solutions/` 抄真的（Node 與 Python 用 `data-tabs` 分頁，兩邊都要）。
- 每個 Block 至少一張全幅 SVG 圖（viewBox 960 寬），每張圖後面附 `<details class="datatable">` 文字版。
- 每個 Block 一個 `.teach` 講師註：驗收時看哪一行、常見失真、怎麼攔。
- Check-out：`/checkout dayN` 的回覆表格（交付物 / DoD / 狀態 / 一句理由）+ quiz 五題參考答案（`.answer`）。
- 最後一節「講師手記」：誠實評估這一天教材的完整性（夠 / 不夠 / 講師要自己補什麼 / 時間會不會爆）。
- 長度目標：body 1,200–2,500 行。不寫「略」。
- HTML 裡的 `<`、`>`、`&` 在 `<pre>` 內要轉義（`&lt;` `&gt;` `&amp;`）。

## 完成前
```bash
node teacher/_shared/build.mjs dayN          # 必須印 ✓，沒有 ✗
node /tmp/claude-0/-home-user-dddguide/e6ab7e68-b12c-56ac-9058-bdd2f462d3ad/scratchpad/tcheck.mjs /home/user/dddguide/teacher/dayN.html /tmp/claude-0/-home-user-dddguide/e6ab7e68-b12c-56ac-9058-bdd2f462d3ad/scratchpad/dayN
```
tcheck 會印 JSON：`errs` 必須是空陣列、`hs1440` 與 `hs375` 必須是 false。不是就修到是。
看一眼 `dayN-1440.png`（全頁）與 `dayN-375.png`：圖裡的字有沒有超出方塊、有沒有貼到右緣。
只寫 `teacher/src/dayN.body.html`；不要改 `teacher/_shared/`、不要 commit。
回報：檔案行數、tcheck JSON、你認為教材在這一天哪裡不夠（講師手記的重點）。
