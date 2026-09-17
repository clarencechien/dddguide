# 教師版頁面規格（teacher/）

七份單檔 HTML（day1–day7）+ 一份總覽（index），發佈到 imitator（slug `ev-charge-ops-teacher-dayN`）。
每頁回答講師的一個問題：**「假設學員把這一天全程跑完，桌上會留下什麼？」** — 每份交付物的完整參考版本、
每張圖、每個互動演練實際跑起來的樣子、助教對話會長怎樣、驗收時看哪裡。

## 你只寫 body

寫 `teacher/src/dayN.body.html`，由 `node teacher/_shared/build.mjs dayN` 組裝成 `teacher/dayN.html`
（head、chassis CSS、voice、導覽列、footer、JS 全由 build 加上；`</main>` 也由 tail 補）。
body 第一行必須是兩個註解：

```html
<!-- title: 教師版 D2 · 事件風暴與通用語言 -->
<!-- description: 一句話。 -->
```

body 從 `<p class="eyebrow">` 開始，**不要**寫 `<html>`、`<head>`、`<body>`、`<main>`、`<style>`、`<script>`。
需要頁內互動一律用下面的資料屬性元件（JS 已在 tail）。不得用 storage API、不得載外部 script。

## 固定骨架（每一天都照這個順序）

1. `<p class="eyebrow">DAY N · ENGLISH KEY</p>` + `<h1 class="display">…<em>一個詞</em>…</h1>`（**恰好一個 `<em>`**，自己下 `<br>`，每行 ≤ 8 個中文字）+ `<p class="lede">`（回答「這一天在做什麼、為什麼」，一段）+ `<div class="meta-strip">方法論 · 時長 · 交付物 · skills</div>`
2. `## 00 · 跑完會留下什麼` — `<ul class="dod">` 列出全部交付物（路徑 + 一句話），後面一段講師視角：這一天最容易在哪裡失真。
3. 每個 Block 一節：`<p class="eyebrow">BLOCK 1 · …</p><h2>`。每節必含：
   - **實況**：這個 Block 實際會怎麼跑（時間、學員在做什麼、助教在做什麼）。
   - **助教對話重播**（`.chat` + `.msg.stu` / `.msg.ta`，3–6 則）：貼提示 → 助教回應（照 CLAUDE.md 的蘇格拉底風格：先問問題、結尾「下一個最小步驟」）→ 學員回答。要具體、要用課綱識別碼。
   - **產出檔案**（`.file`）：交付物的**完整參考版本**（不是摘要、不是「略」）。Markdown 交付物用 HTML 渲染（h4 / 表格 / 清單 / `.gwt`）；程式交付物用 `<pre>`，內容從 `solutions/` 抄真的。
   - **講師註**（`.teach`）：驗收時看哪裡、常見失真、怎麼攔。
   - 有圖的 Block：`<figure class="wide">` + `.diagram` SVG（見下）。
4. `## Check-out` — `/checkout dayN` 的助教回覆（表格：交付物 / DoD / 狀態 / 一句理由），與 quiz 五題的參考答案（`.answer`）。
5. `## 講師手記` — 今天教材的完整性檢查：哪些地方教材夠、哪些地方講師要自己補、時間預算實際會不會爆。誠實寫。

## 元件

- 參考答案框：`<div class="answer"><p class="head">參考答案</p>…</div>`
- 講師註：`<div class="teach"><p class="head">講師註</p>…</div>`
- 產出檔案：`<div class="file"><p class="path">workshop/day2/rules.md <span class="chip">交付物</span></p><div class="body">…</div></div>`
- 終端：`<pre class="term">…<span class="red">✗</span>…<span class="green">✓</span>…</pre>`
- GWT：`<pre class="gwt"><b>Given</b> …\n<b>When</b> …\n<b>Then</b> …</pre>`
- 時間線：`<ol class="timeline"><li><span class="t">14:02</span>…</li><li class="hot">…</li></ol>`
- 分頁：`<div class="tabs" data-tabs><button data-pane="p1" class="on">Node</button><button data-pane="p2">Python</button></div><div class="pane on" id="p1">…</div><div class="pane" id="p2">…</div>`
- 對話：`<div class="chat"><div class="msg stu"><p class="who">學員 → /storm</p><p>…</p></div><div class="msg ta"><p class="who">助教</p><p>…</p><p><b>下一個最小步驟：</b>…</p></div></div>`
- 表格一律包 `<div class="table-scroll">`；不可斷的格子加 `class="nowrap"`。
- 逐步重播（清單型）：`<section data-replay><div class="stepper"><button data-next class="primary">下一步</button><button data-all>全部</button><button data-reset>重來</button><span class="cap"></span></div><ol class="timeline"><li data-item>…</li>…</ol></section>`

### Event Storming 牆（逐步揭露）

```html
<section data-stepper data-step="1" data-max="7">
  <ol class="steps">
    <li data-goto="1">1 貼事實</li><li data-goto="2">2 挑戰</li><li data-goto="3">3 排時間線</li>
    <li data-goto="4">4 命令與角色</li><li data-goto="5">5 政策</li><li data-goto="6">6 聚合與樞紐</li><li data-goto="7">7 hotspot 收斂</li>
  </ol>
  <div class="stepper"><button data-prev>上一步</button><button data-next class="primary">下一步</button><button data-reset>重來</button><span class="cap"></span></div>
  <div class="step-note" data-note="1"><p>這一步發生什麼、助教說什麼。</p></div>
  … data-note="2" … "7"
  <div class="wall-scroll"><div class="wall" data-step-target style="--cols: 8">
    <div class="lane">角色 · ACTORS</div>
    <div class="sticky act" data-from="4">顧客</div> …
    <div class="lane">命令 · COMMANDS</div>
    <div class="sticky cmd" data-from="4"><span class="k">CMD</span>StartCharging</div> …
    <div class="lane">事實 · EVENTS</div>
    <div class="sticky evt" data-from="1"><span class="k">T3</span>充電已授權開始</div>
    <div class="sticky rej" data-from="1" data-until="2"><span class="k">✗</span>系統送出 StatusNotification</div>
    <div class="sticky evt pivot" data-from="6">…</div>
    <div class="lane">政策 · POLICIES</div>
    <div class="sticky pol" data-from="5">每當充電已結束 → 建立草稿帳單</div>
    <div class="lane">聚合候選 · AGGREGATES</div>
    <div class="sticky agg" data-from="6">充電會話</div>
    <div class="lane">HOTSPOTS</div>
    <div class="sticky hot" data-from="1" data-until="6">插槍＝開始充電？</div>
  </div></div>
</section>
```
`data-from=N` = 從第 N 步出現；`data-until=N` = 第 N 步後消失（被挑掉的「非事實」、被收斂的 hotspot）。
便利貼顏色：`evt` 黃橘＝事實、`cmd` 藍＝命令、`pol` 紫＝政策、`agg` 淡黃＝聚合、`act` 黃圓＝角色、`hot` 紅＝爭議、`read` 綠＝讀模型、`ext` 粉＝外部系統、`rej` 灰刪除線＝被挑掉。
`pivot` 加藍綠外框＝樞紐事件。牆用 grid 欄位對齊時間：同一時間點的命令 / 事實 / 政策放同一欄（用 `style="grid-column: 3"` 指定欄）。

### 全幅圖（SVG）

```html
<figure class="wide">
  <p class="title">圖名</p><p class="subtitle">一句說明</p>
  <div class="diagram"><svg viewBox="0 0 960 420" role="img" aria-label="…">…</svg></div>
  <figcaption>…</figcaption>
</figure>
```
- viewBox 寬 **960**，字級用 class：`.t`(13) `.t.b`(14 粗) `.t.s`(11.5 灰) `.t.a`(11.5 mono 藍綠) `.t.m`(mono)。
- 方塊 `.box`（`.core` 藍綠粗框、`.ext` 虛線外部、`.dim` 灰底）、區域 `.zone`、箭頭 `.ar`（實線命令）/ `.ar.ev`（虛線事件）/ `.ar.bad`（紅）；狀態膠囊 `.st`；序列圖生命線 `.life`。marker 已在 tail 定義（`#arr` `#arr-a` `#arr-x`）。
- 文字不可超出方塊、不可貼到 viewBox 右緣（右緣留 ≥ 12）。長標籤拆兩行。
- 每張圖後面用 `<details class="datatable"><summary>圖中資料</summary><div class="table-scroll"><table>…</table></div></details>` 附文字版（列出節點 / 關係），這是無障礙與列印的救援。

## 內容規範

- 繁體中文（台灣）；程式碼、測試名、事件名、識別碼英文。全部用 `docs/curriculum.md` §1.6–§1.9 的識別碼與事件名。
- 交付物必須**完整**：Day 1 的五份訪談紀錄要有五個人的原話與隱藏事實；Day 2 的 rules.md 要有 R1–R8 八條完整 GWT；Day 4 的測試與聚合要是能跑的程式碼（從 `solutions/` 抄）。講師要能拿這頁直接對照學員交的東西。
- 助教對話要像真的：學員貼提示 → 助教先問 1–3 個問題 → 學員答 → 助教指出問題 → 「下一個最小步驟」。
- 不寫「略」「以此類推」「等等」。寧可長。
- 不用 emoji 當標題或圖示（`.note` 裡最多一個字符）。不用「總結」「Key takeaways」。
- 每一節結尾的講師註要說**驗收時看哪一行**。

## 完成前自檢

`node teacher/_shared/build.mjs dayN` 無 ✗；在 375px 與 1440px 開 `teacher/dayN.html` 沒有橫向捲動；深色模式每張圖都看得見；stepper 每一步都有 note。
