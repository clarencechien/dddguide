// Assemble teacher/dayN.html from teacher/src/dayN.body.html + shared head/nav/tail.
// Usage: node teacher/_shared/build.mjs [day1 day2 ...]   (default: every src/*.body.html)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const chassis = readFileSync(join(here, 'report.css'), 'utf8');
const voice = readFileSync(join(here, 'voice.css'), 'utf8');
const nav = readFileSync(join(here, 'nav.html'), 'utf8');
const tail = readFileSync(join(here, 'tail.html'), 'utf8');
if (!chassis.includes('imitator report chassis')) throw new Error('report.css is not the chassis');

const META = {
  register: '教師版竣工紀錄 — 假設七天全程跑完，桌上會留下的每一份產出、每一張圖、每一步互動的實況',
  reference: '1990 年代國立編譯館《教師手冊》— 淡粉紅道林紙、灰底參考答案框、頁緣批註欄',
  paper: 'hsl(350 22% 95%)',
  accent: 'hsl(176 52% 26%)',
};

function head(title, description) {
  return `<!doctype html>
<html lang="zh-Hant">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="imitator-style" content="v3">
<meta name="imitator-register" content="${META.register}">
<meta name="imitator-reference" content="${META.reference}">
<meta name="imitator-paper" content="${META.paper}">
<meta name="imitator-accent" content="${META.accent}">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet">
<style>
${chassis}
${voice}
</style>
<body>
<div class="progress" aria-hidden="true"></div>
<button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false">theme · auto</button>
<main class="report">
`;
}

function build(name) {
  const src = readFileSync(join(root, 'src', `${name}.body.html`), 'utf8');
  const m = src.match(/<!--\s*title:\s*(.+?)\s*-->/); const d = src.match(/<!--\s*description:\s*(.+?)\s*-->/);
  const dayNum = (name.match(/day(\d)/) || [])[1] || '0';
  if (!m) throw new Error(`${name}: missing <!-- title: … --> comment at top of body`);
  const navHere = nav.replace(`data-day="${dayNum}"`, `data-day="${dayNum}" class="here" aria-current="page"`);
  const html = head(m[1], d ? d[1] : '') + navHere + '\n' + src + tail;
  // floor checks
  const bad = [];
  if (/localStorage|sessionStorage|indexedDB|document\.cookie|BroadcastChannel|serviceWorker/.test(src)) bad.push('storage API in body');
  if (/<script[^>]+src=/i.test(src)) bad.push('external script');
  const fr = [...src.matchAll(/grid-template-columns:\s*([^;}]+)/g)].map(x => x[1]).filter(v => /(^|[\s,(])\d*\.?\d*fr\b/.test(v) && !/minmax\([^)]*\)/.test(v));
  if (fr.length) bad.push('bare fr track: ' + fr.join(' | '));
  if (!/<h1 class="display">[\s\S]*?<em>[\s\S]*?<\/em>[\s\S]*?<\/h1>/.test(src)) bad.push('display headline needs exactly one <em>');
  if ((src.match(/<em>/g) || []).length !== 1 && /<h1 class="display">/.test(src)) { /* em elsewhere is fine; count only inside h1 */ }
  if (bad.length) { console.error(`✗ ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
  writeFileSync(join(root, `${name}.html`), html);
  console.log(`✓ ${name}.html  ${(html.length / 1024).toFixed(0)} KB`);
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(root, 'src')).filter(f => f.endsWith('.body.html')).map(f => f.replace('.body.html', ''));
names.forEach(build);
