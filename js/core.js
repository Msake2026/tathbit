/* Tathbīt — Noyau : utilitaires, langues, données, état enregistré, audio des versets.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- utilitaires ---------- */
const $app = document.getElementById('app');
const $ = id => document.getElementById(id);
const JSERR = [];   // dernières erreurs du programme (message seulement) : jointes au diagnostic de la page Contact
const jsErrAdd = m => { JSERR.push(String(m).slice(0, 160)); if (JSERR.length > 5) JSERR.shift(); };
addEventListener('error', e => jsErrAdd(e.message || 'erreur')); addEventListener('unhandledrejection', e => jsErrAdd((e.reason && e.reason.message) || e.reason || 'promesse rejetée'));
let cloudDirty = () => {}; // branché plus bas : envoie la progression au compte quand elle change
const store = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} cloudDirty(k); }
};
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- langues : français (référence), anglais, arabe ---------- */
const I18N = window.I18N || {}; // dictionnaires (i18n.js) : clé = texte français
let LANG = 'fr';
const LANGS = {fr: 'Français', en: 'English', ar: 'العربية'};
const missingKeys = new Set(); // clés sans traduction rencontrées (aide au contrôle)
function lookup(k){ if (LANG === 'fr') return k; const d = (I18N[LANG] || {})[k]; if (d === undefined){ missingKeys.add(k); return k; } return d; }
const fill = (s, v) => v ? s.replace(/\{(\w+)\}/g, (m, n) => n in v ? v[n] : m) : s;
const tr = (k, v) => fill(lookup(k), v);                                   // texte (avec {variables})
const trp = (n, k, v) => { const [a, b] = lookup(k).split('|'); return fill((LANG === 'fr' ? n > 1 : n !== 1) ? (b ?? a) : a, {n, ...v}); }; // « singulier|pluriel »
const LOCALE = () => ({fr: 'fr-FR', en: 'en-GB', ar: 'ar-u-nu-latn'})[LANG];
/* indicateur « hors ligne » : dit ce qui reste disponible (le texte, les exercices et le plan sont dans l'application ; le reste dépend du réseau) */
function offlineSync(){
  let b = document.getElementById('offbar');
  if (navigator.onLine){ if (b) b.remove(); return; }
  if (!b){ b = document.createElement('div'); b.id = 'offbar'; b.setAttribute('role', 'status'); document.body.insertBefore(b, document.body.firstChild); }
  b.innerHTML = `<details><summary>📴 ${tr('Hors ligne : ce qui reste disponible')}</summary><ul>
    <li>✓ ${tr('Le texte du Coran et des moutoun, les exercices, ton plan et ta progression.')}</li>
    <li>✓ ${tr('Les sourates audio que tu as téléchargées.')}</li>
    <li>✗ ${tr("L'audio en ligne, la reconnaissance vocale et la recherche de mises à jour.")}</li>
    <li>✗ ${tr("Les traductions, le tafsir et les couleurs du tajwīd que tu n'as pas encore ouverts.")}</li>
    <li>↻ ${tr('Ta progression sera envoyée à ton compte dès que le réseau revient.')}</li></ul></details>`;
}
addEventListener('offline', () => offlineSync());
addEventListener('online', () => { offlineSync(); if (me && sb && cmeta().dirty) cloudPush(); });
const AR_DEF = 1.9;   // taille par défaut du texte arabe (rem) ; cfg.rdSize la règle partout (lecteur, exercices, résultats, erreurs…)
function applyArSize(){ document.documentElement.style.setProperty('--arz', ((cfg.rdSize || AR_DEF) / AR_DEF).toFixed(3)); }
function applyLang(){
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.title = tr('Tathbīt – Coran et moutoun');
  const b = document.getElementById('boot'); if (b) b.textContent = tr('Chargement du texte du Coran…');
  offlineSync(); applyArSize();
}

/* Normalisation arabe (mode souple) : on ignore voyelles, signes coraniques, variantes d'alif/ya/ta marbuta */
const norm = w => w
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ࣓-ࣿ﻿]/g, '')
  .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[^ء-ي]/g, '');
function lev(a, b){
  const d = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}
/* Orthographe uthmani ≠ courante (ex. الصلوة / الصلاة) : tolérance d'une lettre sur les mots longs (souple et moutoun) */
const same = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && lev(a, b) <= 1);
/* Correction stricte/standard : lettres + voyelles (fatha, damma, kasra, soukoun, chadda, tanwin) exactes.
   Toujours toléré (orthographe, pas mémoire) : signes de récitation, tatwil, madda, alif de prolongation (ٰ / ا / وٰ),
   alif wasla ٱ = ا, ى = ي.
   Niveau « standard » en plus : soukoun ignoré et chadda ignorée sur la 1re lettre d'un mot (assimilation / idghām,
   que l'écriture courante ne note pas comme l'uthmani). */
function skey(w, tol){
  let t = w.replace(/ۡ/g, 'ْ').replace(/[وي]ٰ/g, '').replace(/ٱ/g, 'ا').replace(/ى/g, 'ي').replace(/آ/g, 'ءَا')
    .replace(/[^ء-يً-ْ]/g, '');
  if (tol) t = t.replace(/ْ/g, '').replace(/^(.[ً-ْ]*)/, m => m.replace(/ّ/g, ''));
  t = t.replace(/[ً-ْ]+/g, m => [...m].sort().join(''));
  return t ? t[0] + t.slice(1).replace(/ا(?![ً-ْ])/g, '') : '';
}
const ck = w => skey(w, cfg.corr === 'standard');
function tokenize(text){
  const tok = text.replace(/﻿/g, '').trim().split(/\s+/);
  const nw = tok.map(norm);
  const idx = nw.map((w, i) => w ? i : -1).filter(i => i >= 0);
  return {tok, nw, idx, sk: tok.map(ck)};
}
function splitPoint(words){ // prose : coupe près du milieu, de préférence après une ponctuation
  const n = words.length; let best = null;
  for (let i = Math.floor(n * .35); i <= Math.floor(n * .65); i++)
    if (i && /[،:؛.؟"”]$/.test(words[i - 1]) && (best === null || Math.abs(i - n / 2) < Math.abs(best - n / 2))) best = i;
  return best || Math.ceil(n / 2);
}

/* ---------- données ---------- */
let Q = null; // [{n, ar, en, a:[{t, j, p}]}]
let MT = {};  // moutoun : id -> {ar, fr, author, kind, unit, source, a:[{t, m}]}
let custom = store.get('tathbit.custom', []); // moutoun ajoutés par l'utilisateur
const MS = (window.MUTASHABIHAT && window.MUTASHABIHAT.pairs) || {}; // versets proches (calculés)
let OFF = [], PAGE_LEN = [], PAGE_JUZ = [];
const isQ = s => typeof s === 'number';
const book = s => isQ(s) ? Q[s - 1] : MT[s];
const pk = k => { const [s, a] = k.split(':'); return {s: /^\d+$/.test(s) ? +s : s, a: +a}; };
const CACHE_KEY = 'tathbit.quran.v2'; // ancien cache du navigateur (remplacé par quran.js) : supprimé pour libérer de la place
const quranOk = q => Array.isArray(q) && q.length === 114 && q.reduce((n, s) => n + s.a.length, 0) === 6236 && q.every((s, i) => s.n === i + 1 && s.a.every(v => v.t && v.p >= 1 && v.p <= 604));
async function sha256hex(txt){
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function bundledQuran(){ // texte embarqué (quran.js, généré par tools/build_quran.py) : contrôlé avant usage
  const B = window.QURAN; if (!B) return null;
  const q = B.surahs.map(s => ({n: s.n, ar: s.ar, en: s.en, a: s.a.map(([t, j, p]) => ({t, j, p}))}));
  if (!quranOk(q)) return null;
  if (window.crypto && crypto.subtle){ // indisponible hors HTTPS/localhost : le contrôle de structure ci-dessus reste appliqué
    try { if (await sha256hex(q.flatMap(s => s.a.map(v => v.t)).join('\n')) !== B.sha256) return null; } catch {}
  }
  return q;
}
async function loadQuran(){
  Q = await bundledQuran();
  if (Q) try { localStorage.removeItem(CACHE_KEY); } catch {}
  else { // secours : texte embarqué absent ou altéré → cache du navigateur, puis api.alquran.cloud
    Q = store.get(CACHE_KEY, null);
    if (!quranOk(Q)){
      const r = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const surahs = (await r.json()).data.surahs;
      Q = surahs.map(s => ({
        n: s.number, ar: s.name, en: s.englishName,
        a: s.ayahs.map((v, i) => {
          let t = v.text.replace(/\ufeff/g, '').trim();
          if (i === 0 && s.number !== 1 && s.number !== 9) t = t.split(/\s+/).slice(4).join(' ');
          return {t, j: v.juz, p: v.page};
        })
      }));
      if (!quranOk(Q)) throw new Error('Coran incomplet');
      store.set(CACHE_KEY, Q);
    }
  }
  let n = 0; OFF = Q.map(s => { const o = n; n += s.a.length; return o; });
  PAGE_LEN = new Array(605).fill(0); PAGE_JUZ = new Array(605).fill(0);
  Q.forEach(s => s.a.forEach(v => { PAGE_LEN[v.p]++; if (!PAGE_JUZ[v.p]) PAGE_JUZ[v.p] = v.j; }));
}

/* ---------- état persistant ---------- */
const DEF = {mode: 'mix', scope: {type: 'surah', from: 78, to: 114}, n: 10, input: 'recite', level: 40,
  corr: 'standard', tjKind: 'rule', mkKind: 'zone', sfKind: 'pair', ahKind: 'nun', mdKind: 'type', audFrom: 78, audTo: 114, audCap: 100, audQ: 64, audAuto: false, setTab: 'hub', lastMemo: 'mix', show: {s: true, v: true, p: true}, reciter: 'ar.alafasy', goal: 20, contLen: 5, endLen: 2, begLen: 1, map: 's', tab: 'home', rdHide: false, rdSize: 1.9, rdTaj: false, rdTr: '', rdTf: false,
  lang: ['fr', 'en', 'ar'].includes((navigator.language || '').slice(0, 2)) ? navigator.language.slice(0, 2) : 'fr'};
const stored = store.get('tathbit.cfg', {});
let cfg = Object.assign({}, DEF, stored);
if (stored.strict === false && !stored.corr) cfg.corr = 'soft';   // ancien réglage
if (stored.strict === true && !stored.corr) cfg.corr = 'strict';
LANG = ['fr', 'en', 'ar'].includes(cfg.lang) ? cfg.lang : 'fr'; applyLang();
let stats = store.get('tathbit.stats', {}); // "s:a" -> [ok, ko]
let errors = store.get('tathbit.errors', []); // journal : {t, k, m, sc, ans?, bad?[]}
let plan = store.get('tathbit.plan', null);   // plan de révision (voir plus bas)
const savePlan = () => store.set('tathbit.plan', plan);
let sched = store.get('tathbit.sched', {}); // "s:a" -> {iv: jours, due: timestamp}
let hfs = store.get('tathbit.hf', {});       // makhārij / ṣifāt : « mk:ظ » ou « sf:qalqala » -> [réussies, ratées]
let tjs = store.get('tathbit.tj', {});       // règle de tajwīd -> [réussies, ratées] (entraînement, séparé de la mémorisation)
let days = store.get('tathbit.days', {});   // "AAAA-MM-JJ" -> nb de réponses
const saveCfg = () => store.set('tathbit.cfg', cfg);
const today = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
let SR = window.SpeechRecognition || window.webkitSpeechRecognition;   // (let : les tests y mettent un faux micro)
const key = r => r.s + ':' + r.a;
const verse = r => book(r.s).a[r.a - 1].t;
const slen = s => book(s).a.length;
const SN = n => LANG === 'ar' ? Q[n - 1].ar.replace(/^\S+\s+/, '') : Q[n - 1].en;   // nom de la sourate dans la langue de l'interface
const MN = id => LANG === 'ar' ? MT[id].ar : MT[id].fr;                              // idem pour les moutoun
const UNIT = u => ({vers: tr('vers'), hadith: tr('hadith'), passage: tr('passage')})[u] || u;
const sname = s => isQ(s) ? (LANG === 'ar' ? SN(s) : `${Q[s-1].en} · ${Q[s-1].ar}`) : (LANG === 'ar' ? MT[s].ar : `${MT[s].fr} · ${MT[s].ar}`);
const rlabel = r => isQ(r.s) ? tr('Sourate {n} – {name}, verset {a}', {n: r.s, name: SN(r.s), a: r.a}) + ' · ' + tr('page {p}', {p: Q[r.s-1].a[r.a-1].p})
  : `${MN(r.s)}, ${UNIT(MT[r.s].unit)} ${r.a}`;
function record(r, score){
  const [ok, ko] = stats[key(r)] || [0, 0];
  stats[key(r)] = [ok + score, ko + (1 - score)];
  store.set('tathbit.stats', stats);
  const k = key(r); sched[k] = srsNext(sched[k], score, Date.now());   // répétition espacée adaptative (voir srsNext)
  store.set('tathbit.sched', sched);
  days[today()] = (days[today()] || 0) + 1;
  store.set('tathbit.days', days);
}
/* SRS:begin — répétition espacée adaptative : fonctions pures, testées dans tests/node.test.mjs */
const SRS = {MAXIV: 180, EZ0: 2.2, EZMIN: 1.3, EZMAX: 2.8, HALF: 10, WINDOW: 45};
/* Après chaque réponse : réussite → l'intervalle grandit d'un facteur « ez » propre au verset (2,2 au départ, +0,05 par réussite) ;
   hésitation → ×0,7 (1 jour au moins) et ez −0,1 ; raté → retour dans 6 h et ez −0,2 (un verset difficile grandit donc plus lentement).
   Après un raté, la première réussite ramène à 1 jour. Réviser un verset bien avant son échéance ne fait pas grandir l'intervalle. */
function srsNext(prev, score, now){
  const DAY = 864e5, iv0 = (prev && prev.iv) || 0, ez0 = (prev && prev.ez) || SRS.EZ0, due0 = (prev && prev.due) || 0;
  if (score >= 1){
    if (iv0 >= 1 && now < due0 - 0.25 * DAY) return {iv: iv0, ez: ez0, due: due0};
    const iv = iv0 >= 1 ? Math.min(SRS.MAXIV, iv0 * ez0) : 1;
    return {iv, ez: Math.min(SRS.EZMAX, ez0 + 0.05), due: now + iv * DAY};
  }
  if (score >= 0.5){ const iv = Math.max(1, iv0 * 0.7); return {iv, ez: Math.max(SRS.EZMIN, ez0 - 0.1), due: now + iv * DAY}; }
  return {iv: 0.25, ez: Math.max(SRS.EZMIN, ez0 - 0.2), due: now + 0.25 * DAY};
}
/* Versets « à renforcer en priorité » : erreurs (les récentes comptent le plus : demi-vie de 10 jours, fenêtre de 45 jours), taux de réussite
   (dès 3 réponses) et retard de révision. Un verset qui tient depuis 7 jours ou plus compte pour 40 % de son poids. */
function weakList(errs, stats, sched, now){
  const DAY = 864e5, by = {}, out = [];
  for (const e of errs){
    const age = (now - e.t) / DAY; if (age < 0 || age > SRS.WINDOW || e.sc >= 1) continue;
    const o = by[e.k] ||= {err: 0, n30: 0}; o.err += (1 - e.sc) * Math.pow(0.5, age / SRS.HALF); if (age <= 30) o.n30++;
  }
  for (const k of new Set([...Object.keys(by), ...Object.keys(stats || {})])){
    const [ok, ko] = (stats && stats[k]) || [0, 0], tot = ok + ko, s = sched && sched[k], o = by[k] || {err: 0, n30: 0};
    const ratio = tot >= 3 ? ko / tot : 0, lateD = s && s.due < now ? (now - s.due) / DAY : 0;
    if (o.err < 0.3 && ratio < 0.4) continue;
    let pri = 2 * o.err + ratio + 0.5 * Math.min(14, lateD) / 14;
    if (s && s.iv >= 7) pri *= 0.4;
    if (pri >= 0.6) out.push({k, pri, n30: o.n30, lateD: Math.floor(lateD), pct: tot >= 3 ? Math.round(100 * ok / tot) : null});
  }
  return out.sort((a, b) => b.pri - a.pri);
}
/* SRS:end */
const dueRefs = () => Object.entries(sched).filter(([, v]) => v.due <= Date.now())
  .sort((a, b) => a[1].due - b[1].due).map(([k]) => pk(k)).filter(r => book(r.s));
const weakNow = () => weakList(errors, stats, sched, Date.now()).filter(w => book(pk(w.k).s));
function reviewPick(n = 15){ // versets dus : les plus fragiles d'abord, puis les plus en retard
  const pri = {}; weakNow().forEach(w => { pri[w.k] = w.pri; });
  return dueRefs().sort((a, b) => (pri[key(b)] || 0) - (pri[key(a)] || 0)).slice(0, n);
}
function streak(){
  let n = 0; const d = new Date();
  if (!days[today(d)]) d.setDate(d.getDate() - 1);
  while (days[today(d)]){ n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* blocs d'un matn (MT[id].sec = [{ar, fr, from}], titres de la source) : n° du premier et du dernier vers du bloc k */
const secRange = (id, k) => { const S = MT[id] && MT[id].sec; if (!S || k == null || !S[k]) return [1, Infinity]; return [S[k].from, S[k + 1] ? S[k + 1].from - 1 : Infinity]; };
const THEMES = [['Tajwīd'], ['ʿAqīda, fiqh mālikī, taṣawwuf'], ['Muṣṭalaḥ al-ḥadīth'], ['Ḥadīth']];
function matnOpts(sel){ // liste des moutoun groupés par thème (discipline) ; les matns ajoutés à la main à part
  const opt = t => `<option value="${t.id}" ${sel === t.id ? 'selected' : ''}>${esc(MN(t.id))}${LANG === 'ar' ? '' : ' · ' + esc(t.ar)} (${t.a.length})</option>`;
  const all = Object.values(MT), seen = new Set();
  const g = (label, L) => L.length ? `<optgroup label="${esc(label)}">${L.map(opt).join('')}</optgroup>` : '';
  const out = THEMES.map(([th]) => { const L = all.filter(t => !t.custom && t.topic === th); L.forEach(t => seen.add(t.id)); return g(tr(th), L); });
  return out.join('') + g(tr('Autres moutoun'), all.filter(t => !seen.has(t.id)));
}
const secSize = (id, k) => { const [f, t] = secRange(id, k); return Math.min(t, MT[id].a.length) - f + 1; };
const secName = s => LANG === 'ar' ? s.ar : tr(s.fr);
function buildPool(sc){
  const p = [];
  if (sc.type === 'matn'){
    for (const id of Object.keys(MT)) if (sc.id === 'all' || sc.id === id){
      const [from, to] = secRange(id, sc.sec);
      MT[id].a.forEach((_, i) => { if (i + 1 >= from && i + 1 <= to) p.push({s: id, a: i + 1}); });
    }
    return p;
  }
  for (const S of Q){
    if (sc.type === 'surah' && (S.n < sc.from || S.n > sc.to)) continue;
    S.a.forEach((v, i) => {
      if (sc.type === 'juz' && (v.j < sc.from || v.j > sc.to)) return;
      if (sc.type === 'page' && (v.p < sc.from || v.p > sc.to)) return;
      p.push({s: S.n, a: i + 1});
    });
  }
  return p;
}
function pickWeighted(list){
  const w = list.map(r => {
    const [ok, ko] = stats[key(r)] || [0, 0];
    return (ok + ko) === 0 ? 2 : 0.3 + 3 * ko / (ok + ko);
  });
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++){ x -= w[i]; if (x <= 0) return list[i]; }
  return list[list.length - 1];
}

/* ---------- audio (récitation verset par verset : cdn.islamic.network / AlQuran Cloud) ---------- */
const RECITERS = [['ar.alafasy', 'Mishary Alafasy', 128], ['ar.husary', 'Al-Husary', 128], ['ar.husarymujawwad', 'Al-Husary (mujawwad)', 128],
  ['ar.mahermuaiqly', 'Maher Al-Muaiqly', 128], ['ar.hudhaify', 'Al-Hudhaify', 128], ['ar.muhammadayyoub', 'Muhammad Ayyoub', 128],
  ['ar.abdurrahmaansudais', 'Abdurrahmaan As-Sudais', 64], ['ar.saoodshuraym', 'Saood Ash-Shuraym', 64]];
/* AU:begin — audio hors ligne : fonctions pures (testées dans tests/node.test.mjs). Fichiers d'everyayah.com (accessibles en CORS, 64 kbps), liste officielle : https://everyayah.com/data/recitations.js */
const AU_EA = {'ar.alafasy': 'Alafasy_64kbps', 'ar.husary': 'Husary_64kbps', 'ar.husarymujawwad': 'Husary_Mujawwad_64kbps', 'ar.mahermuaiqly': 'Maher_AlMuaiqly_64kbps',
  'ar.hudhaify': 'Hudhaify_64kbps', 'ar.muhammadayyoub': 'Muhammad_Ayyoub_64kbps', 'ar.abdurrahmaansudais': 'Abdurrahmaan_As-Sudais_64kbps', 'ar.saoodshuraym': 'Saood_ash-Shuraym_64kbps'};
const AU_EA128 = {'ar.alafasy': 'Alafasy_128kbps', 'ar.husary': 'Husary_128kbps', 'ar.husarymujawwad': 'Husary_128kbps_Mujawwad', 'ar.mahermuaiqly': 'MaherAlMuaiqly128kbps',
  'ar.hudhaify': 'Hudhaify_128kbps', 'ar.muhammadayyoub': 'Muhammad_Ayyoub_128kbps', 'ar.saoodshuraym': 'Saood_ash-Shuraym_128kbps'};   // pas de 128 kbps pour As-Sudais (64 ou 192 seulement)
const auPad = n => String(n).padStart(3, '0');
const auQ = (rec, q) => q === 128 && AU_EA128[rec] ? 128 : 64;          // qualité réellement disponible pour ce récitateur
const auUrl = (rec, s, a, q = 64) => `https://everyayah.com/data/${auQ(rec, q) === 128 ? AU_EA128[rec] : AU_EA[rec]}/${auPad(s)}${auPad(a)}.mp3`;
const auEntry = v => typeof v === 'number' ? {b: v, q: 64} : v;           // {b : octets, q : 64 ou 128}
const auChars = t => t.replace(/[^\u0621-\u064A\u0671-\u06D3]/g, '').length;
function auEstimate(samples, chars){ // [{bytes, chars}] -> octets estimés pour `chars` lettres, avec 15 % de marge
  const b = samples.reduce((t, x) => t + x.bytes, 0), c = samples.reduce((t, x) => t + x.chars, 0);
  return c ? Math.round(b / c * chars * 1.15) : 0;
}
function auPlan(items, cap){ // [{s, bytes}] dans l'ordre : ce qui tient dans le plafond est retenu, le reste est laissé
  let used = 0; const take = [], skip = [];
  for (const it of items){ if (used + it.bytes <= cap){ used += it.bytes; take.push(it.s); } else skip.push(it.s); }
  return {take, skip, used};
}
const auWifi = c => !!c && (c.type === 'wifi' || c.type === 'ethernet') && !c.saveData;   // seuls certains navigateurs (Chrome Android) disent le type de connexion : pas Safari / iPhone
const auPlanSurahs = T => [...new Set([...(T.next ? [T.next.s] : []), ...(T.rec || []).map(c => c.s), ...(T.man || []).map(c => c.s)])].sort((a, b) => a - b);   // sourates du plan du jour
const auMissing = (list, got) => list.filter(s => !got[s]);
const auMo = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' Go' : Math.max(1, Math.round(b / 1e6)) + ' Mo';
/* AU:end */
let audioOff = store.get('tathbit.audio', {});          // récitateur -> {numéro de sourate: octets} : sourates complètes enregistrées sur cet appareil
const audioSet = rec => audioOff[rec] || {};
const audioUrl = r => {
  const got = audioSet(cfg.reciter)[r.s];
  if (AU_EA[cfg.reciter] && got) return auUrl(cfg.reciter, r.s, r.a, auEntry(got).q);   // téléchargée : lue depuis l'appareil (service worker)
  const rc = RECITERS.find(x => x[0] === cfg.reciter) || RECITERS[0];
  return `https://cdn.islamic.network/quran/audio/${rc[2]}/${rc[0]}/${OFF[r.s - 1] + r.a}.mp3`;
};
const player = new Audio();
let playQ = [], playDone = null;
function playUrls(urls, done){
  stopAudio(); playQ = urls.slice(); playDone = done || null; step();
}
function step(){
  if (!playQ.length){ const d = playDone; playDone = null; if (d) d(); return; }
  player.src = playQ.shift();
  player.play().catch(() => { playQ = []; const m = $('audio-msg'); if (m) m.textContent = tr('Audio indisponible (connexion ?).'); });
}
player.onended = step;
function stopAudio(){ playQ = []; playDone = null; try { player.pause(); } catch {} stopMic(); }
const audioHtml = () => (cur && cur.audio && cur.audio.length && isQ(cur.audio[0].s))
  ? `<div class="grades"><button data-act="play">🔊 ${tr('Écouter')} (${(RECITERS.find(x => x[0] === cfg.reciter) || RECITERS[0])[1]})</button><button data-act="stopaudio" style="flex:0 0 auto;min-width:0">⏹</button></div><p class="ref" id="audio-msg"></p>` : '';

