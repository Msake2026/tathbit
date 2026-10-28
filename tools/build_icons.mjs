// Génère icon.svg et icons/*.png (symbole seul : un nom de six lettres devient illisible à 60 px) à partir de tools/_logo.mjs.
// Usage : node tools/build_icons.mjs   (demande Google Chrome)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { BG, SYMBOL, ICON_SVG, svg } from './_logo.mjs';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.writeFileSync(path.join(root, 'icon.svg'), ICON_SVG + '\n');
// standard : carré plein cadre avec cadre doré (le système arrondit les coins) ; maskable : fond uni, symbole réduit dans la zone sûre (≈ 74 %)
const art = kind => kind === 'maskable'
  ? svg(BG(0, false) + `<g transform="translate(80 80) scale(.74) translate(-80 -80)">${SYMBOL}</g>`)
  : svg(BG(0) + SYMBOL);
const html = (S, kind) => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}svg{display:block;width:${S}px;height:${S}px}</style>${art(kind)}
<script>document.title = 'ready';</script>`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const prof = fs.mkdtempSync('/tmp/ic-');
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--allow-file-access-from-files', '--remote-debugging-port=9340', '--user-data-dir=' + prof, 'about:blank'], { stdio: 'ignore' });
let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9340/json')).json(); if (list.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) pend[d.id](d); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
for (const [file, S, kind] of [['icon-512.png', 512, 'standard'], ['icon-192.png', 192, 'standard'], ['apple-touch-icon.png', 180, 'standard'], ['icon-maskable-512.png', 512, 'maskable']]) {
  const tmp = path.join(prof, 'i.html'); fs.writeFileSync(tmp, html(S, kind));
  await send('Emulation.setDeviceMetricsOverride', { width: S, height: S, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: url.pathToFileURL(tmp).href });
  let st = ''; for (let i = 0; i < 40; i++) { await sleep(200); const r = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true }); st = String(r.result?.result?.value); if (st === 'ready') break; }
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: S, height: S, scale: 1 } });
  fs.writeFileSync(path.join(root, 'icons', file), Buffer.from(shot.result.data, 'base64')); console.log(file, S, st);
}
chrome.kill(); process.exit(0);
