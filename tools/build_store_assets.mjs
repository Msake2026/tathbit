// Génère les écrans de lancement iPhone (icons/splash/*.png) et les captures d'écran du manifeste (screenshots/*.png).
// Usage : python3 -m http.server 8766 (dans le dossier du projet), puis  node tools/build_store_assets.mjs   (demande Google Chrome)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { FULL, svg, GREEN } from './_logo.mjs';
const SUB = 'Coran et moutoun';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const css = url.pathToFileURL(path.join(root, 'fonts/fonts.css')).href;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:8766/';
// [largeur appareil, hauteur appareil, densité] en points CSS : l'image mesure largeur×densité
// [largeur appareil, hauteur appareil, densité, orientations] en points CSS (dimensions de l'appareil tenu en portrait) : l'image mesure largeur×densité
const SPLASH = [[440, 956, 3, 'p'], [430, 932, 3, 'p'], [402, 874, 3, 'p'], [393, 852, 3, 'p'], [428, 926, 3, 'p'], [390, 844, 3, 'p'], [375, 812, 3, 'p'], [414, 896, 3, 'p'], [414, 896, 2, 'p'], [414, 736, 3, 'p'], [375, 667, 2, 'p'], [320, 568, 2, 'p'],
  // iPad : portrait et paysage (une tablette se tient dans les deux sens)
  [1032, 1376, 2, 'pl'], [1024, 1366, 2, 'pl'], [834, 1210, 2, 'pl'], [834, 1194, 2, 'pl'], [834, 1112, 2, 'pl'], [820, 1180, 2, 'pl'], [810, 1080, 2, 'pl'], [768, 1024, 2, 'pl'], [744, 1133, 2, 'pl']];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const prof = fs.mkdtempSync('/tmp/sa-');
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--allow-file-access-from-files', '--remote-debugging-port=9341', '--user-data-dir=' + prof, 'about:blank'], { stdio: 'ignore' });
let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9341/json')).json(); if (list.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) pend[d.id](d); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
fs.mkdirSync(path.join(root, 'icons/splash'), { recursive: true }); fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });
// --- écrans de lancement : fond vert du logo ; le logo complet et son sous-titre forment un groupe centré dans l'écran
const links = [];
for (const [dw, dh, d, ori] of SPLASH) for (const o of ori) {
  const w = o === 'p' ? dw : dh, h = o === 'p' ? dh : dw;   // l'image paysage a la largeur et la hauteur inversées
  const B = Math.min(w, h), L = Math.round(B * 0.6);   // le logo complet (avec son nom) fait 60 % du petit côté ; le sous-titre est en dessous
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${css}"><style>html,body{margin:0;height:100%}body{display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 25%,#127a5a,${GREEN} 70%)}svg{width:${L}px;height:${L}px}p{margin:${Math.round(B * 0.02)}px 0 0;font:600 ${Math.round(B * 0.042)}px/1 Inter,sans-serif;letter-spacing:${(B * 0.003).toFixed(1)}px;color:#d9bd6a}</style>${svg(FULL)}<p>${SUB}</p>
<script>Promise.all([document.fonts.load('22px "Amiri Quran"'), document.fonts.load('700 10px "Cormorant Garamond"'), document.fonts.load('600 20px Inter')]).then(() => { document.title = 'ready'; });</script>`;
  const tmp = path.join(prof, 's.html'); fs.writeFileSync(tmp, html);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: d, mobile: false });
  await send('Page.navigate', { url: url.pathToFileURL(tmp).href });
  for (let i = 0; i < 40; i++) { await sleep(200); const r = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true }); if (r.result?.result?.value === 'ready') break; }
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });   // JPEG : un dégradé en PNG pèse ~400 Ko
  const f = `icons/splash/splash-${w * d}x${h * d}.jpg`; fs.writeFileSync(path.join(root, f), Buffer.from(shot.result.data, 'base64')); console.log(f);
  links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: ${o === 'p' ? 'portrait' : 'landscape'})" href="${f}">`);
}
// les balises sont réécrites dans index.html entre les repères « splash:begin » et « splash:end »
const ip = path.join(root, 'index.html'); let page = fs.readFileSync(ip, 'utf8');
page = page.replace(/(<!-- splash:begin[^>]*-->\n)[\s\S]*?(<!-- splash:end -->)/, (_, a, b) => a + links.join('\n') + '\n' + b); fs.writeFileSync(ip, page);
// --- captures d'écran de l'application (comptes désactivés pour la capture : la vraie interface, sans connexion)
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: BASE + 'index.html' }); await sleep(4000);
await ev("localStorage.clear(); store.set('tathbit.welcome', 1); CLOUD.url = ''; CLOUD.anonKey = ''; me = null; sb = null; cfg.scope = {type: 'surah', from: 78, to: 114}; cfg.mode = 'mix'; cfg.input = 'recite'; 1");
const shots = [['accueil', "go('home')"], ['reviser', "go('train')"], ['question', "cfg.mode = 'mcq'; start()"]];
for (const [name, code] of shots) {
  await ev(code); await sleep(900);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(root, `screenshots/${name}.png`), Buffer.from(shot.result.data, 'base64')); console.log('screenshots/' + name + '.png');
}
chrome.kill(); process.exit(0);
