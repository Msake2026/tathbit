// Lance la suite de tests de l'application dans ton Chrome, sans rien installer : node tests/run-local.mjs [--fast]
//   --only "texte" : lance seulement le test dont le titre contient ce texte.
//   --fast : saute les tests lents (audit d'accessibilité, audio réel sur le réseau) ; pour les essais en cours de route.
//   (sans option) : suite complète, à lancer avant chaque envoi (tools/release.py le fait).
// Chrome : variable CHROME si besoin (par défaut celui de macOS). Un petit serveur local est démarré tout seul. Node 22 ou plus.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url))), fast = process.argv.includes('--fast'), onlyI = process.argv.indexOf('--only'), only = onlyI > 0 ? process.argv[onlyI + 1] : '';   // --only « texte » : un seul test (mise au point)
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'};
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(root, p)); if (!f.startsWith(root)) throw new Error('hors du dossier');
    const b = await readFile(f); res.writeHead(200, {'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store'}); res.end(b);
  } catch { res.writeHead(404); res.end('introuvable'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, dbg = 9400 + Math.floor(Math.random() * 500), prof = await mkdtemp(join(tmpdir(), 'tathbit-tests-'));
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',   // sans ces options, Chrome ralentit la page « cachée » et les tests s'étirent sur des minutes
  `--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`, 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const done = async code => { try { chrome.kill(); } catch {} server.close(); await sleep(300); await rm(prof, {recursive: true, force: true}).catch(() => {}); process.exit(code); };
let list = [];
for (let i = 0; i < 60; i++){ try { list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); if (list.find(t => t.type === 'page')) break; } catch { /* Chrome démarre */ } await sleep(500); }
const page = list.find(t => t.type === 'page'); if (!page){ console.error('Chrome introuvable ou non démarré (variable CHROME ?)'); await done(2); }
// Chaque échange avec Chrome passe par une connexion toute neuve, avec délai : une connexion unique qui se fige (arrivé : tests terminés, lanceur bloqué) ne peut plus bloquer l'attente.
const evalIn = (wsUrl, expression, ms = 8000) => new Promise(resolve => {
  let ws, done = false; const end = v => { if (done) return; done = true; try { ws.close(); } catch { /* déjà fermée */ } resolve(v); };
  try { ws = new WebSocket(wsUrl); } catch { return resolve(null); }
  setTimeout(() => end(null), ms);
  ws.onerror = () => end(null);
  ws.onopen = () => ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression, returnByValue: true}}));
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) end(d.result && d.result.result ? d.result.result.value : null); };
});
const pages = async () => { try { const r = await fetch(`http://127.0.0.1:${dbg}/json`, {signal: AbortSignal.timeout(4000)}); return await r.json(); } catch { return []; } };
const myPage = async () => (await pages()).find(t => t.type === 'page' && t.url.startsWith(`http://127.0.0.1:${port}/tests/`));
{ const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; });
  ws.send(JSON.stringify({id: 1, method: 'Page.navigate', params: {url: `http://127.0.0.1:${port}/tests/?${fast ? 'fast&' : ''}${only ? 'only=' + encodeURIComponent(only) : ''}`}})); await sleep(500); ws.close(); }
const t0 = Date.now(), LIMIT = (+process.env.TEST_TIMEOUT || 900) * 1000; let R = null;
while (Date.now() - t0 < LIMIT){
  await sleep(1500);
  const p = await myPage(); if (!p || !/^DONE/.test(p.title || '')) continue;   // la page de tests met « DONE » dans son titre quand elle a fini
  for (let k = 0; k < 6 && !R; k++){ const v = await evalIn(p.webSocketDebuggerUrl, 'JSON.stringify(window.__result || null)'); if (v && v !== 'null') R = JSON.parse(v); else await sleep(1000); }
  if (R) break;
}
if (!R){   // bloqué : on dit où (dernier test terminé), ce qui désigne le test qui tourne ou qui boucle
  const p = await myPage(); let L = [];
  if (p){ try { L = JSON.parse(await evalIn(p.webSocketDebuggerUrl, "JSON.stringify([...document.querySelectorAll('#out li')].map(l => l.textContent.trim().slice(0, 110)))")); } catch { /* page figée */ } }
  console.error(`Les tests n'ont pas fini en ${LIMIT / 1000} s. Terminés : ${L.length}. Dernier terminé : ${L[L.length - 1] || '(aucun)'}`);
  await done(2);
}
for (const t of R.results) console.log(`${t.skipped ? '⏭' : t.ok ? '✓' : '✗'} ${t.name}${t.ok ? '' : '\n    ' + t.err}`);
const slow = R.results.filter(t => t.ms > 2500).sort((a, b) => b.ms - a.ms).slice(0, 5);
if (slow.length) console.log('\nLes plus lents :\n' + slow.map(t => `  ${(t.ms / 1000).toFixed(1)} s  ${t.name.slice(0, 90)}`).join('\n'));
console.log(`\n${R.passed} réussis, ${R.failed} en échec${R.skipped ? `, ${R.skipped} ignorés (mode rapide)` : ''} — ${Math.round((Date.now() - t0) / 1000)} s`);
await done(R.failed || !R.results.length ? 1 : 0);
