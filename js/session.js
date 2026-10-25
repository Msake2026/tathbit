/* Tathbīt — Séance d'exercices : questions, actions, reconnaissance vocale.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- séance ---------- */
let ses = null, cur = null, ls = null;
const HFMODES = ['makharij', 'sifat', 'ahkam', 'madd'];
let AHKAM_P = null;
function loadAhkam(){ // data/ahkam.js : chargé à la demande
  if (window.AHKAM) return Promise.resolve(window.AHKAM);
  return AHKAM_P ||= new Promise((ok, ko) => { const el = document.createElement('script'); el.src = 'data/ahkam.js';
    el.onload = () => window.AHKAM && window.AHKAM.occ ? ok(window.AHKAM) : (AHKAM_P = null, ko(new Error('données incomplètes')));
    el.onerror = () => { AHKAM_P = null; ko(new Error('hors ligne')); }; document.head.appendChild(el); });
}
function start(fixed){
  if (cfg.mode === 'ahkam' && !fixed && !window.AHKAM){
    $app.innerHTML = `<p class="sub" style="margin-top:40vh;text-align:center">${tr('Chargement…')}</p>`;
    loadAhkam().then(() => start(fixed), e => { alert(tr('Impossible de charger ce contenu ({e}). Vérifie ta connexion puis réessaie.', {e: e.message})); home(); });
    return;
  }
  if ((cfg.mode === 'tajweed' || cfg.mode === 'madd') && !fixed && !(window.QX && window.QX.tajweed)){ // les annotations se chargent (et se contrôlent) à la première utilisation
    $app.innerHTML = `<p class="sub" style="margin-top:40vh;text-align:center">${tr('Chargement…')}</p>`;
    loadX('tajweed').then(() => start(fixed), e => { alert(tr('Impossible de charger ce contenu ({e}). Vérifie ta connexion puis réessaie.', {e: e.message})); home(); });
    return;
  }
  const pool = fixed || (HFMODES.includes(cfg.mode) ? [{s: 1, a: 1}] : buildPool(cfg.scope));   // makhārij / ṣifāt : indépendants de la portée
  if (!pool.length) return alert(tr('Aucun verset dans cette portée.'));
  ses = {pool, fixed: !!fixed, i: 0, score: 0, missed: [], used: new Set(), total: fixed ? fixed.length : cfg.n, goal: goalSession}; goalSession = false;
  nextQ();
}
function shell(inner){
  setNav(false);
  $app.innerHTML = `
  <h1 class="sr-only">${tr('Question {i} sur {n}', {i: ses.i, n: ses.total})}</h1>
  <div class="top"><button class="link" data-act="home">✕ ${tr('Quitter')}</button><span>${ses.i} / ${ses.total}</span></div>
  <div class="bar"><i style="width:${100 * (ses.i - 1) / ses.total}%"></i></div>
  <div class="card">${inner}</div>`;
}
/* versets proches */
const sibsOf = r => (MS[key(r)] || []).map(x => { const [s, a, p] = x.split(':').map(Number); return {s, a, p}; });
const nextOf = r => ({s: r.s, a: r.a + 1});
const mutashOk = r => r.a < slen(r.s) && sibsOf(r).some(x => x.a < slen(x.s) && verse(nextOf(x)) !== verse(nextOf(r)));
/* phrases (prose) */
function clausesOf(r){
  const u = book(r.s).a[r.a - 1], w = u.t.split(/\s+/), out = []; let c = [];
  if (book(r.s).kind === 'poem' && u.m) return [w.slice(0, u.m).join(' '), w.slice(u.m).join(' ')];
  for (const t of w){ c.push(t); if (/[،:؛.؟!]["”]?$/.test(t) && c.length >= 3){ out.push(c.join(' ')); c = []; } }
  if (c.length){ if (c.length < 3 && out.length) out[out.length - 1] += ' ' + c.join(' '); else out.push(c.join(' ')); }
  return out;
}
function nextQ(){
  stopAudio();
  if (ses.i >= ses.total) return results();
  ses.i++;
  if (ses.chunks){ // révision du plan : une portion complète par question
    const refs = chunkRefs(ses.chunks[ses.i - 1]); cur = {m: 'cont', r: refs[0], done: false};
    return startPassage(refs, passageLabel(refs), ses.planKind === 'manzil' ? tr('Révision ancienne : récite de mémoire ce passage.') : tr('Révision récente : récite de mémoire ce passage.'));
  }
  const hasQ = ses.pool.some(r => isQ(r.s)), hasM = ses.pool.some(r => !isQ(r.s));
  let m = cfg.mode; if (ses.goal && !['next', 'cloze', 'mcq'].includes(m)) m = ['next', 'cloze', 'mcq'][rnd(3)];
  if (m === 'tajweed' && (ses.fixed || !hasQ)) m = 'mix';
  if (HFMODES.includes(m)){
    if (!ses.fixed){ cur = {m, r: null, done: false, audio: [], hf: true, label: tr(m === 'makharij' ? 'Makhārij' : m === 'ahkam' ? 'Aḥkām' : m === 'madd' ? 'Madd' : 'Ṣifāt')}; return m === 'makharij' ? qMakharij() : m === 'ahkam' ? qAhkam() : m === 'madd' ? qMadd() : qSifat(); }
    m = 'mix';                            // révisions guidées : pas d'exercice de makhārij / ṣifāt
  }   // révisions guidées (plan, versets dus…) : pas d'exercice de tajwīd
  if (m === 'mix'){
    const L = ['next', 'cloze', 'which', 'mcq'];
    if (hasQ) L.push('mutash', 'mwhich', 'start', 'order', 'end', 'link');
    if (hasM) L.push('half', 'phrase');
    m = L[rnd(L.length)];
  }
  let cands = ses.pool.filter(r => !ses.used.has(key(r)));
  if (!cands.length){ ses.used.clear(); cands = ses.pool; }
  const only = (f, fb) => { const c = cands.filter(f); if (c.length) cands = c; else m = fb; };
  if (m === 'tajweed') only(r => isQ(r.s), 'cloze');
  if (m === 'half') only(r => !isQ(r.s), 'cloze');
  if (m === 'phrase') only(r => !isQ(r.s) && book(r.s).kind === 'prose' && clausesOf(r).length >= 2, 'half');
  if (m === 'half') only(r => !isQ(r.s), 'cloze');
  if (m === 'mutash') only(r => isQ(r.s) && mutashOk(r), 'mcq');
  if (m === 'mwhich') only(r => isQ(r.s) && msUniq(r) && sibsOf(r).length, 'which');
  if (m === 'order') only(r => isQ(r.s) && r.s < 114, 'cloze');
  if (m === 'start') only(r => isQ(r.s) && slen(r.s) >= 2, 'cloze');
  if (m === 'next' || m === 'mcq') only(r => r.a < slen(r.s), 'cloze');
  let r;
  if (m === 'end' || m === 'link'){ // on tire une sourate, pas un verset : on pèse sur son dernier verset
    let ss = [...new Set(cands.filter(x => isQ(x.s) && (m === 'end' || x.s < 114)).map(x => x.s))];
    const fresh = ss.filter(s => !ses.used.has(s + ':' + slen(s))); if (fresh.length) ss = fresh;
    if (ss.length) r = pickWeighted(ss.map(s => ({s, a: slen(s)}))); else m = 'cloze';
  }
  if (!r) r = pickWeighted(cands);
  ses.used.add(key(r));
  cur = {m, r, done: false};
  ({next: qNext, cloze: qCloze, which: qWhich, mcq: qMcq, half: qHalf, phrase: qPhrase, mutash: qMutash, mwhich: qMswhich, start: qStart, order: qOrder, cont: qCont, end: qEnd, link: qLink, tajweed: qTajweed})[m]();
}
function logError(r, score, info = {}){
  const e = {t: Date.now(), k: key(r), m: cur.m, sc: score};
  if (info.ans) e.ans = String(info.ans).slice(0, 400);
  if (info.bad && info.bad.length) e.bad = info.bad.slice(0, 40);
  errors.push(e);
  if (errors.length > 2000) errors = errors.slice(-2000);
  store.set('tathbit.errors', errors);
}
function finish(score, extra = ''){
  if (cur.done) return; cur.done = true; stopMic();      // la solution s'affiche : le micro est coupé
  if (cur.m === 'tajweed' || cur.hf){ days[today()] = (days[today()] || 0) + 1; store.set('tathbit.days', days); }   // l'entraînement au tajwīd compte pour l'objectif du jour mais ne touche ni la révision espacée ni l'historique d'erreurs
  else if (cur.perRef) cur.perRef.forEach(([x, sc], v) => { if (x.bas) return; record(x, sc); if (sc < 1){ ses.missed.push(x); logError(x, sc, {bad: cur.badV && cur.badV[v]}); } });
  else { record(cur.r, score); if (score < 1){ ses.missed.push(cur.r); logError(cur.r, score, cur.info); } }
  ses.score += score;
  const cls = score === 1 ? 'ok' : score >= 0.5 ? 'mid' : 'ko';
  const label = score === 1 ? tr('Excellent ✓') : score >= 0.5 ? tr('Presque') : tr('À revoir');
  $('fb').innerHTML =
    `<div class="fb ${cls}"><b>${label}</b> · <span class="ref">${cur.label || rlabel(cur.r)}</span>${extra}</div>${audioHtml()}
     <button class="pri big" style="margin-top:8px" data-act="nextq">${ses.i >= ses.total ? tr('Voir le résultat') : tr('Question suivante')}</button>`;
}
const gradeUI = () => `<div class="grades">
  <button data-act="grade" data-v="1">${tr('✓ Je savais')}</button>
  <button data-act="grade" data-v="0.5">${tr("~ J'ai hésité")}</button>
  <button data-act="grade" data-v="0">${tr('✗ Raté')}</button></div>`;

/* indices affichés avec la question, selon les réglages */
function qref(r){
  const sh = cfg.show, p = [];
  if (isQ(r.s)){
    if (sh.s) p.push(tr('Sourate {n} – {name}', {n: r.s, name: SN(r.s)}));
    if (sh.v) p.push(tr('verset {a}', {a: r.a}));
    if (sh.p) p.push(tr('page {p}', {p: Q[r.s-1].a[r.a-1].p}));
  } else {
    if (sh.s) p.push(MN(r.s));
    if (sh.v) p.push(`${UNIT(MT[r.s].unit)} ${r.a}`);
  }
  return p.length ? `<p class="ref">${p.join(' · ')}</p>` : '';
}
const useStrict = () => isQ(cur.r.s) && cfg.corr !== 'soft';
const kbd = () => useStrict() && cfg.input === 'type'
  ? `<div class="kbd">${['َ', 'ُ', 'ِ', 'ْ', 'ّ', 'ً', 'ٌ', 'ٍ'].map(c => `<button data-act="ins" data-v="${c}">◌${c}</button>`).join('')}</div>` : '';

/* texte attendu : une ou plusieurs unités (versets), aplati en mots */
function setExpected(units){
  cur.units = units;
  cur.flat = [];
  units.forEach((u, v) => { const T = tokenize(u.text);
    T.tok.forEach((w, i) => cur.flat.push({w, v, first: i === 0, ok: !!T.nw[i], nw: T.nw[i], sk: T.sk[i]})); });
}
function workUI(l = {}){
  const rev = tr(l.rev || 'Révéler la suite'), voice = tr(l.voice || '🎤 Réciter la suite'), ph = l.ph || 'اكتب التكملة…', rows = l.rows || 3;
  return cfg.input === 'type'
    ? `<textarea id="ans" dir="rtl" lang="ar" rows="${rows}" placeholder="${ph}"></textarea>${kbd()}
       <button class="pri" style="margin-top:8px" data-act="check">${tr('Vérifier')}</button>`
    : cfg.input === 'voice' && SR
    ? `<button class="pri big" data-act="listen">${voice}</button>
       <p class="ref" style="margin:10px 0 2px">${tr("Ce que j'entends :")}</p><div class="ar heard" id="heard" dir="rtl" lang="ar" aria-live="off"></div><p class="ref" id="hmsg"></p>
       <button class="link" data-act="reveal">${tr("Je préfère m'auto-évaluer")}</button>`
    : `<button class="pri big" data-act="reveal">${rev}</button>`;
}
function flatHtml(mark){ // mark(x, i) -> classe ou ''
  const multi = cur.units.length > 1;
  return cur.flat.map((x, i) => {
    const sep = multi && x.first && cur.refs && x.v > 0 && cur.refs[x.v].s !== cur.refs[x.v - 1].s
      ? `<br><span class="ref">— ${esc(sname(cur.refs[x.v].s))} —</span><br>` : '';
    const vn = multi && x.first ? `<sup class="vn">${cur.refs ? (cur.refs[x.v].bas ? tr('basmala') : cur.refs[x.v].a) : x.v + 1}</sup>` : '';
    return sep + vn + (x.ok ? mark(x, i) : esc(x.w));
  }).join(' ');
}

/* 1. Verset suivant */
function qNext(){
  const {r} = cur;
  setExpected([{text: verse(nextOf(r))}]);
  cur.audio = [r, nextOf(r)];
  shell(`<p class="ref">${isQ(r.s) ? tr('Quel est le verset qui suit ?') : tr('Quelle est la suite ?')}</p>
    <div class="ar">${esc(verse(r))}</div>${qref(r)}
    <div id="work">${workUI()}</div><div id="fb"></div>`);
}
function qHalf(){ // moutoun : première moitié donnée, on complète la seconde
  const {r} = cur, w = verse(r).split(/\s+/), m = book(r.s).a[r.a - 1].m || Math.ceil(w.length / 2);
  setExpected([{text: w.slice(m).join(' ')}]);
  shell(`<p class="ref">${tr('Complète la seconde moitié.')}</p>
    <div class="ar">${esc(w.slice(0, m).join(' '))} …</div>${qref(r)}
    <div id="work">${workUI()}</div><div id="fb"></div>`);
}
function qPhrase(){ // prose : on donne la phrase précédente, on complète la suivante
  const {r} = cur, C = clausesOf(r), k = 1 + rnd(C.length - 1);
  setExpected([{text: C[k]}]);
  cur.label = `${rlabel(r)} ${tr('(partie {a}/{b})', {a: k + 1, b: C.length})}`;
  shell(`<p class="ref">${tr('Quelle est la phrase suivante ?')}</p>
    <div class="ar">${esc(C.slice(Math.max(0, k - 2), k).join(' '))} …</div>${qref(r)}
    <div id="work">${workUI()}</div><div id="fb"></div>`);
}
function qStart(){ // début de sourate
  const {r} = cur, first = {s: r.s, a: 1};
  cur.r = first; cur.audio = [first];
  setExpected([{text: verse(first)}]);
  shell(`<p class="ref">${tr('Quel est le premier verset de la sourate…')}</p>
    <div class="ar" style="text-align:center">${esc(Q[r.s-1].ar)}</div>
    <p class="ref" style="text-align:center">${r.s}. ${esc(SN(r.s))}${cfg.show.v ? ' · ' + trp(Q[r.s-1].a.length, '{n} verset|{n} versets') : ''}</p>
    <div id="work">${workUI({rev: 'Révéler le verset', voice: '🎤 Réciter le verset', ph: 'اكتب الآية الأولى…'})}</div><div id="fb"></div>`);
}
function startPassage(refs, label, intro, hint = ''){ // passage de plusieurs versets à réciter d'une traite
  cur.r = refs[0]; cur.refs = refs; cur.label = label;
  cur.audio = refs.map(x => x.bas ? {s: 1, a: 1} : x); // la basmala se lit comme le verset 1 de la Fatiha
  setExpected(refs.map(x => ({text: x.bas ? verse({s: 1, a: 1}) : verse(x)})));
  shell(`<p class="ref">${intro}</p><p><b>${esc(label)}</b></p>${hint}
    <div id="work">${workUI({rev: 'Révéler le passage', voice: '🎤 Réciter le passage', ph: 'اكتب المقطع كاملا…', rows: 6})}</div><div id="fb"></div>`);
}
const range = (s, a, n) => Array.from({length: n}, (_, i) => ({s, a: a + i}));
function qCont(){ // passage continu
  const {r} = cur, n = slen(r.s), L = Math.min(cfg.contLen, n), a = Math.min(r.a, n - L + 1);
  const lbl = isQ(r.s) ? tr('Sourate {n} – {name}, versets {a} à {b}', {n: r.s, name: SN(r.s), a, b: a + L - 1})
    : tr('{name}, {u} {a} à {b}', {name: MN(r.s), u: trp(L, ({vers: 'vers|vers', hadith: 'hadith|hadiths', passage: 'passage|passages'})[MT[r.s].unit] || 'passage|passages'), a, b: a + L - 1});
  const first = book(r.s).a[a - 1].t.split(/\s+/).slice(0, 2).join(' ');
  startPassage(range(r.s, a, L), lbl, tr("Récite de mémoire ce passage, d'une traite :"),
    cfg.show.v ? `<p class="ref">${tr('Il commence par :')} <span class="ar" style="font-size:calc(1.3rem*var(--arz,1))">${esc(first)} …</span></p>` : '');
}
function qEnd(){ // fin de sourate
  const {r} = cur, S = Q[r.s - 1], L = Math.min(cfg.endLen, S.a.length), a = S.a.length - L + 1;
  startPassage(range(r.s, a, L), tr('Sourate {n} – {name}, versets {a} à {b}', {n: r.s, name: SN(r.s), a, b: S.a.length}),
    trp(L, 'Récite la fin de la sourate <b>{ar}</b> ({sn}. {name}) : son dernier verset.|Récite la fin de la sourate <b>{ar}</b> ({sn}. {name}) : ses {n} derniers versets.', {ar: esc(S.ar), sn: r.s, name: esc(SN(r.s))}));
}
function qLink(){ // fin d'une sourate + début de la suivante
  const {r} = cur, S = Q[r.s - 1], N = Q[r.s], L1 = Math.min(cfg.endLen, S.a.length), L2 = Math.min(cfg.begLen, N.a.length);
  const a = S.a.length - L1 + 1;
  const bas = N.n !== 9; // la sourate At-Tawba (9) est la seule à ne pas commencer par la basmala
  startPassage([...range(S.n, a, L1), ...(bas ? [{s: N.n, a: 0, bas: true}] : []), ...range(N.n, 1, L2)],
    `${S.n}. ${SN(S.n)} ${a}–${S.a.length} → ${N.n}. ${SN(N.n)} 1${L2 > 1 ? '–' + L2 : ''}`,
    tr('Récite la fin de la sourate <b>{a}</b> ({x}) puis le début de la sourate suivante, <b>{b}</b> ({y}). {z}', {a: esc(S.ar), x: trp(L1, '{n} verset|{n} versets'), b: esc(N.ar), y: trp(L2, '{n} verset|{n} versets'),
      z: bas ? tr("N'oublie pas la basmala entre les deux.") : tr('La sourate 9 commence sans basmala : enchaîne directement.')}));
}
function lcsMatch(exp, got, eq = same){ // indices de exp retrouvés dans l'ordre
  const n = exp.length, m = got.length, d = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    d[i][j] = eq(exp[i], got[j]) ? d[i+1][j+1] + 1 : Math.max(d[i+1][j], d[i][j+1]);
  const hit = new Set(); let i = 0, j = 0;
  while (i < n && j < m){
    if (eq(exp[i], got[j])){ hit.add(i); i++; j++; }
    else if (d[i+1][j] >= d[i][j+1]) i++; else j++;
  }
  return hit;
}

/* 2. Mots manquants */
function qCloze(){
  const {r} = cur, T = tokenize(verse(r));
  const k = Math.max(1, Math.round(T.idx.length * cfg.level / 100));
  const hidden = new Set(shuffle(T.idx).slice(0, k));
  cur.T = T; cur.hidden = hidden; cur.audio = [r];
  const html = T.tok.map((w, i) => !hidden.has(i) ? esc(w)
    : cfg.input === 'type' ? `<input class="blankin" data-i="${i}" dir="rtl" lang="ar" autocomplete="off" aria-label="${tr('Mot manquant {n}', {n: [...hidden].sort((x, y) => x - y).indexOf(i) + 1})}">`
    : `<span class="blank" data-act="blank" data-i="${i}">${esc(w)}</span>`).join(' ');
  shell(`<p class="ref">${tr('Complète le verset ({x}).', {x: trp(k, '{n} mot caché|{n} mots cachés')})}</p>
    <div class="ar">${html}</div>${qref(r)}
    <div id="work">${cfg.input === 'type'
      ? `${kbd()}<button class="pri" data-act="checkcloze">${tr('Vérifier')}</button>`
      : `<button class="pri big" data-act="revealall">${tr('Tout révéler')}</button>`}</div>
    <div id="fb"></div>`);
}

/* 3. Quelle sourate ? */
function qWhich(){
  const {r} = cur; cur.audio = [r];
  let others = ses.pool.map(x => x.s).filter((s, i, a) => s !== r.s && a.indexOf(s) === i && isQ(s) === isQ(r.s));
  if (others.length < 3) others = (isQ(r.s) ? Q.map(s => s.n) : Object.keys(MT)).filter(s => s !== r.s);
  cur.opts = shuffle([r.s, ...shuffle(others).slice(0, 3)]);
  cur.correct = r.s;
  shell(`<p class="ref">${isQ(r.s) ? tr('De quelle sourate vient ce verset ?') : tr('De quel matn vient ce passage ?')}</p>
    <div class="ar">${esc(verse(r))}</div>
    ${cur.opts.map(s => `<button class="opt" data-act="opt" data-v="${s}">${esc(sname(s))}</button>`).join('')}
    <div id="fb"></div>`);
}

/* 3 bis. Versets proches : de quelle sourate ? Seuls les versets dont le texte est unique dans le Coran sont posés (sinon la réponse serait ambiguë) ;
   les mauvaises réponses sont les sourates des versets qui ressemblent. */
const msUniq = (() => { let cnt = null; return r => {
  if (!cnt){ cnt = new Map(); for (const S of Q) for (const a of S.a){ const k = norm(a.t); cnt.set(k, (cnt.get(k) || 0) + 1); } }
  return cnt.get(norm(verse(r))) === 1; }; })();
function qMswhich(){
  const {r} = cur; cur.audio = [r]; cur.sibs = sibsOf(r);
  const ss = [...new Set(cur.sibs.map(x => x.s).filter(s => s !== r.s))].slice(0, 3);
  const rest = Q.map(x => x.n).filter(n => n !== r.s && !ss.includes(n));
  while (ss.length < 3) ss.push(rest.splice(rnd(rest.length), 1)[0]);
  cur.opts = shuffle([r.s, ...ss]); cur.correct = r.s;
  shell(`<p class="ref">${tr("Attention, ce verset ressemble à d'autres. De quelle sourate vient-il ?")}</p>
    <div class="ar">${esc(verse(r))}</div>
    ${cur.opts.map(n => `<button class="opt" data-act="opt" data-v="${n}">${esc(sname(n))}</button>`).join('')}
    <div id="fb"></div>`);
}

/* 4. QCM suite */
function distractors(good, r, n){
  let src = ses.pool.length >= 12 ? ses.pool : buildPool(isQ(r.s) ? {type: 'all'} : {type: 'matn', id: 'all'});
  src = src.filter(x => isQ(x.s) === isQ(r.s));
  const L = good.length;
  return shuffle(src).slice(0, 40).map(x => verse(x)).filter(t => t !== good && t !== verse(r))
    .sort((a, b) => Math.abs(a.length - L) - Math.abs(b.length - L)).slice(0, n);
}
function qMcq(){
  const {r} = cur, good = verse(nextOf(r));
  cur.audio = [r, nextOf(r)];
  cur.opts = shuffle([good, ...distractors(good, r, 3)]); cur.good = good;
  shell(`<p class="ref">${isQ(r.s) ? tr('Quel verset suit celui-ci ?') : tr('Quelle est la suite ?')}</p>
    <div class="ar">${esc(verse(r))}</div>${qref(r)}
    ${cur.opts.map((t, i) => `<button class="opt ar" data-act="opt" data-v="${i}">${esc(t)}</button>`).join('')}
    <div id="fb"></div>`);
}

/* 5. Versets proches : les mauvaises réponses sont les suites des versets qui ressemblent */
function qMutash(){
  const {r} = cur, good = verse(nextOf(r)); cur.audio = [r, nextOf(r)];
  const sibs = sibsOf(r).filter(x => x.a < slen(x.s)); cur.sibs = sibs;
  const dis = [...new Set(sibs.map(x => verse(nextOf(x))).filter(t => t !== good))].slice(0, 3);
  if (dis.length < 3) for (const t of distractors(good, r, 6)) if (dis.length < 3 && !dis.includes(t)) dis.push(t);
  cur.opts = shuffle([good, ...dis]); cur.good = good;
  shell(`<p class="ref">${tr("Attention, ce verset ressemble à d'autres. Quelle est sa vraie suite ?")}</p>
    <div class="ar">${esc(verse(r))}</div>${qref(r)}
    ${cur.opts.map((t, i) => `<button class="opt ar" data-act="opt" data-v="${i}">${esc(t)}</button>`).join('')}
    <div id="fb"></div>`);
}
const sibHtml = () => cur.sibs && cur.sibs.length ? `<div class="sib"><span class="ref">${tr('Versets proches à ne pas confondre :')}</span>${cur.sibs.map(x =>
  `<div class="ref" style="margin-top:6px">${tr('Sourate {n} – {name}, verset {a} ({p} % de ressemblance)', {n: x.s, name: esc(SN(x.s)), a: x.a, p: x.p})}</div><div class="ar">${esc(verse(x))}</div>`).join('')}</div>` : '';

/* 6. Ordre des sourates */
/* TJ:begin — exercice de tajwīd : fonctions pures, testées dans tests/node.test.mjs */
const TJFAM = {h: 'h', l: 'l', s: 'l', n: 'n', p: 'p', m: 'm', o: 'o', q: 'q', c: 'c', f: 'f', w: 'w', i: 'i', a: 'a', u: 'u', d: 'd', b: 'd', g: 'g'}; // code de la source -> famille de règle (comme sa légende)
const TJGROUP = {n: 'madd', p: 'madd', m: 'madd', o: 'madd', f: 'nun', a: 'nun', u: 'nun', i: 'nun', d: 'nun', c: 'mim', w: 'mim', h: 'x', l: 'x', q: 'x', g: 'x'};
function tjSegs(str){ // « abc[n[ـٰ]def » -> [{t: 'abc', c: ''}, {t: 'ـٰ', c: 'n'}, {t: 'def', c: ''}]
  const re = /\[([a-z])\[([^\]]*)\]/g, out = []; let i = 0, m;
  while ((m = re.exec(str))){ if (m.index > i) out.push({t: str.slice(i, m.index), c: ''}); out.push({t: m[2], c: TJFAM[m[1]] || ''}); i = re.lastIndex; }
  if (i < str.length) out.push({t: str.slice(i), c: ''});
  return out;
}
const TJ_LETTER = /[\u0621-\u064A\u0671-\u06D3]/, TJ_LAST = /([\u0621-\u064A\u0671-\u06D3][\u064B-\u065F\u0670\u06D6-\u06ED\u0640]*)$/;
function tjMulti(segs, picks){ // morceaux {t, c, k} : k = numéro (1…) de la partie surlignée, 0 sinon. Une partie réduite à un signe reçoit sa lettre porteuse
  const out = [];
  segs.forEach((x, i) => {
    const k = picks.indexOf(i) + 1;
    if (k && !TJ_LETTER.test(x.t) && out.length){
      const last = out[out.length - 1], m = last.k ? null : TJ_LAST.exec(last.t);
      if (m){ last.t = last.t.slice(0, m.index); out.push({t: m[1], c: last.c, k}); }
    }
    out.push({t: x.t, c: x.c, k});
  });
  return out.filter(x => x.t);
}
function tjParts(pieces, o = {}){ // HTML : parties surlignées (<mark>), numéros facultatifs, couleurs facultatives
  const seg = p => o.colorFam && p.k ? `<span class="tj-${o.colorFam}">${esc(p.t)}</span>` : o.colors && p.c ? `<span class="tj-${p.c}">${esc(p.t)}</span>` : esc(p.t);
  let out = '', i = 0;
  while (i < pieces.length){
    const p = pieces[i];
    if (!p.k){ out += seg(p); i++; continue; }
    let inner = ''; while (i < pieces.length && pieces[i].k === p.k){ inner += seg(pieces[i]); i++; }
    out += `<mark class="tjq">${inner}</mark>` + (o.numbers ? `<sup class="tjn">${p.k}</sup>` : '');
  }
  return out;
}
function tjFindPicks(segs, fam, rnd, shuf){ // 1 partie de la règle demandée + 3 parties d'autres règles (de familles différentes si possible), dans l'ordre du texte
  const mine = [], others = [];
  segs.forEach((x, i) => { if (x.c === fam) mine.push(i); else if (x.c) others.push(i); });
  if (!mine.length || others.length < 3) return null;
  const target = mine[rnd(mine.length)], byFam = {}; others.forEach(i => (byFam[segs[i].c] ||= []).push(i));
  const chosen = []; for (const f of shuf(Object.keys(byFam))) if (chosen.length < 3) chosen.push(byFam[f][rnd(byFam[f].length)]);
  for (const i of shuf(others)) if (chosen.length < 3 && !chosen.includes(i)) chosen.push(i);
  return {picks: [...chosen, target].sort((x, y) => x - y), target};
}
function tjFalseFam(fam, names, shuf){ // une autre règle, de préférence de la même famille (madd, noon sākina…)
  const ids = Object.keys(names).filter(c => c !== fam), same = ids.filter(c => TJGROUP[c] === TJGROUP[fam]);
  return shuf(same.length ? same : ids)[0];
}
function tjOptions(fam, names, shuf){ // 4 propositions : la bonne, 2 de la même famille de règles si possible, puis d'autres
  const ids = Object.keys(names).filter(c => c !== fam), same = shuf(ids.filter(c => TJGROUP[c] === TJGROUP[fam])), other = shuf(ids.filter(c => TJGROUP[c] !== TJGROUP[fam]));
  return shuf([fam, ...same.slice(0, 2), ...other, ...same.slice(2)].slice(0, 4));
}
/* TJ:end */
/* HF:begin — makhārij et ṣifāt al-ḥurūf : constructeurs de questions (fonctions pures, testées dans tests/node.test.mjs ; données : huruf.js) */
const HF_AMBIG = ['و', 'ي'];   // un point différent selon qu'ils sont consonnes ou lettres de madd : jamais interrogés seuls
const hfPick = (a, rnd) => a[rnd(a.length)];
const hfPointOf = (H, c) => H.points.find(p => p.area !== 'jawf' && p.letters.includes(c));
const hfSafe = (p) => !p.letters.some(c => HF_AMBIG.includes(c));
function mkBuild(kind, H, rnd, shuf){
  const pts = H.points.filter(p => p.area !== 'jawf' && p.letters.length), askable = H.letters.filter(c => !HF_AMBIG.includes(c));
  if (kind === 'zone'){
    const c = hfPick(askable, rnd), a = hfPointOf(H, c).area;
    return {kind, letter: c, correct: a, options: shuf([a, ...shuf(['halq', 'lisan', 'shafatan', 'khayshum', 'jawf'].filter(x => x !== a)).slice(0, 3)]).map(v => ({t: 'area', v}))};
  }
  if (kind === 'same'){
    const multi = pts.filter(p => p.letters.length >= 2), c = hfPick(multi.flatMap(p => p.letters.filter(x => !HF_AMBIG.includes(x))), rnd), p = hfPointOf(H, c);
    return {kind, letter: c, correct: p.id, point: p, options: shuf([p, ...shuf(multi.filter(q => q !== p)).slice(0, 3)]).map(q => ({t: 'group', v: q.id, letters: q.letters}))};
  }
  if (kind === 'odd'){
    const safe = pts.filter(hfSafe), p = hfPick(safe.filter(q => q.letters.length >= 2), rnd), q = hfPick(safe.filter(x => x !== p), rnd), x = hfPick(q.letters, rnd);
    const shown = shuf([...shuf(p.letters).slice(0, 2), x]);
    return {kind, shown, correct: x, point: p, other: q, options: shown.map(v => ({t: 'letter', v}))};
  }
  if (kind === 'halq'){
    const th = H.points.filter(p => p.area === 'halq'), p = hfPick(th, rnd), c = hfPick(p.letters, rnd);
    return {kind, letter: c, correct: p.id, point: p, options: th.map(q => ({t: 'throat', v: q.id, ar: q.ar}))};
  }
  const truth = rnd(2) === 0, safe = pts.filter(hfSafe), A = hfPick(safe.filter(q => q.letters.length >= 2), rnd);   // tf
  const a = hfPick(A.letters, rnd), b = truth ? hfPick(A.letters.filter(x => x !== a), rnd) : hfPick(hfPick(safe.filter(q => q !== A && (q.area === A.area || rnd(3) === 0)).concat(safe.filter(q => q !== A)), rnd).letters, rnd);
  return {kind: 'tf', a, b, same: truth, correct: truth ? 't' : 'f', point: A, options: [{t: 'tf', v: 't'}, {t: 'tf', v: 'f'}]};
}
const HF_SETS = ['hams', 'shidda', 'tawassut', 'istila', 'itbaq', 'idhlaq', 'safir', 'qalqala', 'inhiraf', 'takrir', 'tafashshi', 'istitala'];
function sfBuild(kind, H, rnd, shuf){
  const L = H.letters, per = H.per;
  if (kind === 'pair'){
    const c = hfPick(L, rnd), fam = hfPick(['p1', 'p2', 'p3', 'p4', 'p5'], rnd), members = H.attrs.filter(a => a.pair === fam), ok = members.find(a => per[c].includes(a.id));
    return {kind, letter: c, correct: ok.id, options: members.map(a => ({t: 'attr', v: a.id}))};
  }
  if (kind === 'which'){
    const id = hfPick(HF_SETS, rnd), set = H.sets[id], c = hfPick(set, rnd);
    return {kind, attr: id, correct: c, options: shuf([c, ...shuf(L.filter(x => !set.includes(x))).slice(0, 3)]).map(v => ({t: 'letter', v}))};
  }
  if (kind === 'mnemo'){
    const m = hfPick(H.mnemonics, rnd);
    return {kind, word: m.ar, attr: m.attr, correct: m.attr, options: shuf([m, ...shuf(H.mnemonics.filter(x => x.attr !== m.attr)).slice(0, 3)]).map(x => ({t: 'attr', v: x.attr}))};
  }
  const c = hfPick(L, rnd), truth = rnd(2) === 0, ids = H.attrs.map(a => a.id), mine = per[c];     // tf
  const fam = hfPick(mine, rnd), same = H.attrs.find(a => a.id === fam).pair, notMine = ids.filter(x => !mine.includes(x));
  const falseOnes = notMine.filter(x => same && H.attrs.find(a => a.id === x).pair === same), attr = truth ? fam : hfPick(falseOnes.length ? falseOnes : notMine, rnd);
  return {kind: 'tf', letter: c, attr, correct: truth ? 't' : 'f', options: [{t: 'tf', v: 't'}, {t: 'tf', v: 'f'}]};
}
const HF_MARK = /[ً-ٰٟۖ-ۭ]/, HF_SUK = /[ْۡ]/, HF_VOW = /[ً-ِ]/;
function hfClusters(t){ // lettres avec leurs signes (et leur position dans le texte)
  const out = []; let o = 0;
  for (const ch of t){
    if (/[ء-يٱ-ۓ]/.test(ch)) out.push({c: ch, m: '', s: o, e: o + ch.length});
    else if (out.length && HF_MARK.test(ch)){ out[out.length - 1].m += ch; out[out.length - 1].e = o + ch.length; }
    o += ch.length;
  }
  return out;
}
/* Qualités qui dépendent du contexte (règles données par les sources : qalqala = ق ط ب ج د sakina — ou à l'arrêt, en fin de verset ;
   līn = و ou ي sakina après une fatḥa). Renvoie null quand le cas n'est pas tranché : une telle question n'est jamais posée. */
function hfCond(cl, k, attr){
  const x = cl[k], prev = cl[k - 1];
  if (attr === 'qalqala'){
    if (!'قطبجد'.includes(x.c)) return null;
    if (HF_SUK.test(x.m)) return {has: true, why: 'sukun'};
    if (k === cl.length - 1) return /ٓ/.test(x.m) ? null : {has: true, why: 'waqf'};
    if (/ّ/.test(x.m)) return {has: false, why: 'shadda'};
    return HF_VOW.test(x.m) ? {has: false, why: 'voyelle'} : null;
  }
  if (!'وي'.includes(x.c)) return null;
  if (HF_SUK.test(x.m) && prev && /َ/.test(prev.m) && !/ّ/.test(x.m)) return {has: true, why: 'lin'};
  if (HF_VOW.test(x.m) || /ّ/.test(x.m)) return {has: false, why: 'voyelle'};
  if (!x.m && prev && ((x.c === 'و' && /ُ/.test(prev.m)) || (x.c === 'ي' && /ِ/.test(prev.m)))) return {has: false, why: 'madd'};
  return null;
}
function condBuild(Q, rnd, shuf){ // « la lettre surlignée a-t-elle cette qualité ici ? » sur un vrai verset du Coran
  const attr = rnd(2) ? 'qalqala' : 'lin', want = rnd(2) === 0;
  for (let tries = 0; tries < 400; tries++){
    const s = Q[rnd(Q.length)], a = rnd(s.a.length), t = s.a[a].t;
    if (t.split(/\s+/).length > 14) continue;
    const cl = hfClusters(t), cands = [];
    cl.forEach((x, k) => { const r = hfCond(cl, k, attr); if (r && r.has === want) cands.push({k, r}); });
    if (!cands.length) continue;
    const pk = hfPick(cands, rnd), x = cl[pk.k];
    return {kind: 'cond', attr, ref: {s: s.n, a: a + 1}, before: t.slice(0, x.s), mark: t.slice(x.s, x.e), after: t.slice(x.e), letter: x.c, why: pk.r.why,
      correct: want ? 't' : 'f', options: [{t: 'yn', v: 't'}, {t: 'yn', v: 'f'}]};
  }
  return null;
}
/* HF:end */
/* AH:begin — règles du nūn sākin / tanwīn et du mīm sākin : constructeurs de questions (purs, testés en Node ; données : data/ahkam.js) */
const AH_NOON = ['H', 'G', 'N', 'Q', 'K'], AH_MIM = ['mH', 'mK', 'mG'];
const ahLetterRule = (A, c) => AH_NOON.find(r => A.sets[r].includes(c));
function ahIndex(A){ // règle -> [[verset, position du nūn / tanwīn / mīm, position de la lettre suivante]] (calculé une fois)
  if (A._idx) return A._idx;
  const idx = {}; for (const [key, v] of Object.entries(A.occ)) for (const o of v.split(',')){ const [k, j, r] = o.split('.'); (idx[r] ||= []).push([key, +k, +j]); }
  return (A._idx = idx);
}
function ahVerse(A, Q, kind, rnd, shuf){ // une occurrence réelle : la règle demandée est tirée parmi toutes (pas parmi les occurrences : chaque règle revient)
  const idx = ahIndex(A), fam = kind === 'mim' ? AH_MIM : AH_NOON, rules = fam.filter(r => idx[r] && idx[r].length);
  const want = hfPick(rules, rnd);
  for (let t = 0; t < 60; t++){
    const [key, k, j] = hfPick(idx[want === 'H' && rnd(25) === 0 && idx.M ? 'M' : want], rnd), [sn, an] = key.split(':').map(Number), text = Q[sn - 1].a[an - 1].t;
    if (t < 40 && text.length > 170) continue;
    const cl = hfClusters(text), a = cl[k], b = cl[j]; if (!a || !b) continue;
    const muttlaq = want === 'H' && (idx.M || []).some(x => x[0] === key && x[1] === k && x[2] === j);
    return {kind, ref: {s: sn, a: an}, text, a, b, correct: want, muttlaq, letter: b.c, options: fam.map(r => ({t: 'rule', v: r}))};
  }
  return null;
}
function ahBuild(kind, A, Q, rnd, shuf){
  if (kind === 'nun' || kind === 'mim') return ahVerse(A, Q, kind, rnd, shuf);
  if (kind === 'ghunna'){
    const keys = Object.keys(A.gh), want = rnd(2) === 0;
    for (let t = 0; t < 200; t++){
      const key = hfPick(keys, rnd), [sn, an] = key.split(':').map(Number), text = Q[sn - 1].a[an - 1].t, cl = hfClusters(text);
      const ks = want ? A.gh[key].split(',').map(Number) : cl.map((x, k) => k).filter(k => 'نم'.includes(cl[k].c) && /[َُِ]/.test(cl[k].m) && !/ّ/.test(cl[k].m));
      if (!ks.length || text.length > 170) continue;
      const k = hfPick(ks, rnd), x = cl[k];
      return {kind, ref: {s: sn, a: an}, text, a: x, b: null, letter: x.c, correct: want ? 't' : 'f', options: [{t: 'yn', v: 't'}, {t: 'yn', v: 'f'}]};
    }
    return null;
  }
  const letters = Object.keys(A.sets).flatMap(r => [...A.sets[r]]);
  if (kind === 'letter'){ const c = hfPick(letters, rnd); return {kind, letter: c, correct: ahLetterRule(A, c), options: AH_NOON.map(r => ({t: 'rule', v: r}))}; }
  if (kind === 'group'){ const r = hfPick(AH_NOON, rnd); return {kind, rule: r, correct: r, options: shuf(AH_NOON).slice(0, 5).map(x => ({t: 'letters', v: x, letters: A.sets[x]}))}; }
  const truth = rnd(2) === 0, c = hfPick(letters, rnd), real = ahLetterRule(A, c), shown = truth ? real : hfPick(AH_NOON.filter(r => r !== real), rnd);   // tf
  return {kind: 'tf', letter: c, rule: shown, correct: truth ? 't' : 'f', options: [{t: 'tf', v: 't'}, {t: 'tf', v: 'f'}]};
}
/* AH:end */
const AHKINDS = [['nun', 'Règle du nūn sākin ou du tanwīn dans un verset'], ['mim', 'Règle du mīm sākin dans un verset'], ['letter', "Règle d'une lettre (après nūn sākin / tanwīn)"], ['group', "Lettres d'une règle"], ['ghunna', 'Ghunna (nūn et mīm avec chadda)'], ['tf', 'Vrai ou faux ?'], ['mix', 'Mélange des types']];
const AH_NAME = {gh: 'الغنة · ghunna', H: 'الإظهار · idhhār', G: 'الإدغام بغنة · idghām bi-ghunna', N: 'الإدغام بغير غنة · idghām bi-ghayri ghunna', Q: 'الإقلاب · iqlāb', K: 'الإخفاء · ikhfāʾ',
  mH: 'الإظهار الشفوي · idhhār shafawī', mK: 'الإخفاء الشفوي · ikhfāʾ shafawī', mG: 'الإدغام الشفوي · idghām shafawī'};
/* MD:begin — madd : type déduit du contexte du texte ET recoupé avec la marque de la source de tajwīd (fonctions pures, testées en Node) */
const MD_CODE = {tabii: 'n', muttasil: 'o', munfasil: 'o', lazim: 'm', arid: 'p'};
const MD_SUKSH = /[ّْ۟]/;
function mdFollow(after){ // lettres (avec leurs signes) qui suivent la partie ; sp = début d'un nouveau mot
  const cl = []; let sp = false;
  for (const ch of after){
    if (ch === ' ') sp = true;
    else if (/[ء-يٱ-ۓ]/.test(ch)){ cl.push({c: ch, m: '', sp}); sp = false; }
    else if (cl.length && /[ً-ٰٟۖ-ۭ]/.test(ch)) cl[cl.length - 1].m += ch;
  }
  return cl;
}
function mdKind(code, after){ // null quand le contexte ne permet pas de trancher ou ne concorde pas avec la source : la question n'est alors jamais posée
  let cl = mdFollow(after);
  while (cl.length && 'اى'.includes(cl[0].c) && MD_SUKSH.test(cl[0].m) && !cl[0].sp) cl = cl.slice(1);   // alif muet du pluriel
  if (!cl.length) return null;
  const n = cl[0], type = 'ءأإؤئ'.includes(n.c) ? (n.sp ? 'munfasil' : 'muttasil') : (!n.sp && MD_SUKSH.test(n.m)) ? 'lazim' : (!n.sp && cl.length === 1) ? 'arid' : 'tabii';
  return MD_CODE[type] === code ? {type, next: n.c} : null;
}
function mdBuild(kind, T, rnd, shuf){ // T : annotations de tajwīd (tableau par sourate puis par verset) ; une partie surlignée parmi 5 types de madd
  const types = ['tabii', 'muttasil', 'munfasil', 'lazim', 'arid'], want = hfPick(types, rnd);
  for (let t = 0; t < 600; t++){
    const si = rnd(T.length), vi = rnd(T[si].length), raw = T[si][vi]; if (raw.length > 260) continue;
    const segs = tjSegs(raw), cands = [];
    segs.forEach((x, i) => { if ('npmo'.includes(x.c) && x.c){ const r = mdKind(x.c, segs.slice(i + 1).map(y => y.t).join('')); if (r && r.type === want) cands.push({i, r}); } });
    if (!cands.length) continue;
    const pk = hfPick(cands, rnd);
    return {kind, type: want, ref: {s: si + 1, a: vi + 1}, raw, segs, pick: pk.i, next: pk.r.next};
  }
  return null;
}
/* MD:end */
const MDKINDS = [['type', 'Type de madd dans un verset'], ['count', 'Durée du madd (en temps)'], ['cause', 'Cause du madd (règle du matn)'], ['tf', 'Vrai ou faux ?'], ['mix', 'Mélange des types']];
const MD_NAME = {tabii: 'المد الطبيعي · madd ṭabīʿī', muttasil: 'المد المتصل · madd muttaṣil', munfasil: 'المد المنفصل · madd munfaṣil', lazim: 'المد اللازم · madd lāzim', arid: 'المد العارض للسكون · madd ʿāriḍ lil-sukūn'};
const MD_COUNT = {tabii: '2', muttasil: '4-5', munfasil: '4-5', lazim: '6', arid: '2-4-6'};
const MD_COUNTLABEL = {'2': '2 temps', '4-5': '4 à 5 temps', '6': '6 temps', '2-4-6': '2, 4 ou 6 temps'};
const MD_CAUSE = {tabii: "Aucune hamza ni sukūn n'accompagne la lettre de madd.", muttasil: 'Une hamza suit la lettre de madd dans le même mot.',
  munfasil: 'La lettre de madd termine un mot et le mot suivant commence par une hamza.', lazim: "Un sukūn (ou une chadda) stable suit la lettre de madd, à l'enchaînement comme à l'arrêt.",
  arid: "Le sukūn qui suit la lettre de madd vient de l'arrêt (waqf) sur la dernière lettre."};
const MKKINDS = [['zone', 'Zone de sortie (gorge, langue, lèvres…)'], ['same', 'Lettres du même point'], ['odd', "Trouver l'intruse"], ['halq', 'Partie de la gorge'], ['tf', 'Vrai ou faux ?'], ['mix', 'Mélange des types']];
const SFKINDS = [['pair', "Qualité d'une lettre"], ['which', "Trouver la lettre d'une qualité"], ['mnemo', 'Mots mnémotechniques du matn'], ['cond', 'Qualités conditionnelles (qalqala, līn)'], ['tf', 'Vrai ou faux ?'], ['mix', 'Mélange des types']];
const AREAGLOSS = {halq: 'gorge', lisan: 'langue', shafatan: 'lèvres', khayshum: 'cavité nasale', jawf: 'cavité buccale (voyelles longues)'};
const hfAttr = id => window.HURUF.attrs.find(a => a.id === id);
const hfAttrL = id => `${hfAttr(id).ar} · ${hfAttr(id).tr}`;
const hfLet = c => `<span class="ar" style="font-size:1.25em">${c}</span>`;
const hfGroup = a => a.map(hfLet).join(' ');
function hfKeyLabel(k){ const [t, v] = k.split(':'); if (t === 'md') return `${tr('Madd')} · ${esc(MD_NAME[v] || v)}`; if (t === 'ah') return `${tr('Aḥkām')} · ${esc(AH_NAME[v] || v)}`; return t === 'mk' ? `${tr('Makhārij')} · ${hfLet(v)}` : `${tr('Ṣifāt')} · ${esc(hfAttrL(v))}`; }
function hfStat(key, ok){ const x = hfs[key] || [0, 0]; hfs[key] = [x[0] + (ok ? 1 : 0), x[1] + (ok ? 0 : 1)]; store.set('tathbit.hf', hfs);
  const y = ((ses.hf ||= {})[key] ||= [0, 0]); y[ok ? 0 : 1]++; }
const HFNOTE = () => { const S = window.HURUF.sources, a = (x, t) => `<a href="${x.url}" target="_blank" rel="noopener">${t}</a>`;
  return `<p class="ref" style="margin:8px 0 0">${tr("Sources : le texte d'Ibn al-Jazarī (« al-Jazariyya ») et deux articles de Wikipédia arabe, dont les listes de lettres concordent. Les 28 lettres de ء à ي sont traitées (l'alif est exclu).")} ${a(S[0], 'Wikisource')} · ${a(S[1], 'Wikipédia (makhārij)')} · ${a(S[2], 'Wikipédia (ṣifāt)')}</p>`; };
function hfOpt(o){
  const H = window.HURUF;
  if (o.t === 'area') return `<b>${H.areas[o.v]}</b> · ${esc(tr(AREAGLOSS[o.v]))}`;
  if (o.t === 'group') return `<span class="ar" style="font-size:calc(1.4rem*var(--arz,1))">${o.letters.join(' ')}</span>`;
  if (o.t === 'letter') return `<span class="ar" style="font-size:calc(1.6rem*var(--arz,1))">${o.v}</span>`;
  if (o.t === 'throat') return `<span class="ar" style="font-size:calc(1.25rem*var(--arz,1))">${o.ar}</span>`;
  if (o.t === 'attr') return esc(hfAttrL(o.v));
  if (o.t === 'rule') return esc(AH_NAME[o.v]);
  if (o.t === 'mtype') return esc(MD_NAME[o.v]);
  if (o.t === 'mcount') return esc(tr(MD_COUNTLABEL[o.v]));
  if (o.t === 'letters') return `<span class="ar" style="font-size:calc(1.4rem*var(--arz,1))">${[...o.letters].join(' ')}</span>`;
  if (o.t === 'yn') return o.v === 't' ? tr('Oui') : tr('Non');
  return o.v === 't' ? tr('Vrai') : tr('Faux');
}
function hfShow(q, stem, bigHtml, explain, stat, note = HFNOTE()){
  cur.correct = q.correct; cur.stat = stat; cur.explain = explain + note;
  shell(`<p class="ref">${stem}</p>${bigHtml ? `<div class="ar" style="text-align:center;font-size:calc(2.6rem*var(--arz,1));line-height:1.6">${bigHtml}</div>` : ''}
    ${q.options.map(o => `<button class="opt" data-act="opt" data-v="${o.v}">${hfOpt(o)}</button>`).join('')}<div id="fb"></div>`);
}
function qMakharij(){
  const H = window.HURUF, kinds = ['zone', 'same', 'odd', 'halq', 'tf'];
  const q = mkBuild(cfg.mkKind === 'mix' ? kinds[rnd(kinds.length)] : cfg.mkKind || 'zone', H, rnd, shuffle);
  const grp = p => `${hfGroup(p.letters)} (${esc(p.ar)})`;
  if (q.kind === 'zone') return hfShow(q, tr('De quelle zone sort la lettre ci-dessous ?'), q.letter, `${hfLet(q.letter)} → <b>${H.areas[q.correct]}</b> (${esc(tr(AREAGLOSS[q.correct]))}) · ${tr('même point :')} ${hfGroup(hfPointOf(H, q.letter).letters)}`, 'mk:' + q.letter);
  if (q.kind === 'same') return hfShow(q, tr('Avec quelles lettres cette lettre partage-t-elle son point de sortie ?'), q.letter, `${tr('Même point :')} ${grp(q.point)}`, 'mk:' + q.letter);
  if (q.kind === 'odd') return hfShow(q, tr("Deux de ces lettres sortent du même point. Laquelle sort d'un autre point ?"), q.shown.join(' '), `${tr('Même point :')} ${hfGroup(q.point.letters)} · ${hfLet(q.correct)} ${tr('sort de')} ${hfGroup(q.other.letters)}`, 'mk:' + q.correct);
  if (q.kind === 'halq') return hfShow(q, tr('De quelle partie de la gorge sort la lettre ci-dessous ?'), q.letter, `${hfLet(q.letter)} → <b>${esc(q.point.ar)}</b> (${hfGroup(q.point.letters)})`, 'mk:' + q.letter);
  const real = hfPointOf(H, q.b), same = real === q.point;
  hfShow(q, tr('Vrai ou faux : ces deux lettres sortent du même point.'), `${q.a} · ${q.b}`, same ? `${tr('Vrai :')} ${hfGroup(q.point.letters)}` : `${tr('Faux :')} ${hfLet(q.a)} ${tr('sort de')} ${hfGroup(q.point.letters)}, ${hfLet(q.b)} ${tr('sort de')} ${hfGroup(real.letters)}`, 'mk:' + q.a);
}
const CONDRULE = () => `<p class="ref" style="margin:8px 0 0">${tr("Rappel : qalqala = ق ط ب ج د quand la lettre est sakina (ou à l'arrêt, en fin de verset) ; līn = و ou ي sakina après une fatḥa. Règle appliquée au texte du verset.")} ${AI()}</p>`;
function condWhy(q){
  const l = hfLet(q.letter);
  return ({
    sukun: tr('{l} porte un sukūn : qalqala.', {l}), waqf: tr("{l} est la dernière lettre du verset : à l'arrêt elle devient sakina, qalqala.", {l}),
    shadda: tr('{l} porte une chadda : pas de qalqala ici (elle ne devient sakina qu\'à l\'arrêt).', {l}), voyelle: q.attr === 'qalqala' ? tr('{l} porte une voyelle : pas de qalqala.', {l}) : tr('{l} porte une voyelle : pas de līn.', {l}),
    lin: tr('{l} est sakina et précédée d\'une fatḥa : līn.', {l}), madd: tr('{l} est une lettre de madd (sans sukūn, après une ḍamma ou une kasra) : pas de līn.', {l})})[q.why];
}
function qCond(){
  const q = condBuild(Q, rnd, shuffle);
  if (!q) return qSifat(true);
  cur.r = q.ref; cur.label = tr('Ṣifāt');
  const attrAr = q.attr === 'qalqala' ? 'القلقلة · qalqala' : 'اللين · līn';
  cur.correct = q.correct; cur.stat = 'sf:' + q.attr; cur.explain = condWhy(q) + CONDRULE() + HFNOTE();
  shell(`<p class="ref">${tr('La lettre surlignée a-t-elle cette qualité ici : « {a} » ?', {a: attrAr})}</p>
    <div class="rd tj" style="font-size:${cfg.rdSize}rem">${esc(q.before)}<mark class="tjq">${esc(q.mark)}</mark>${esc(q.after)}</div>${qref(q.ref)}
    ${q.options.map(o => `<button class="opt" data-act="opt" data-v="${o.v}">${hfOpt(o)}</button>`).join('')}<div id="fb"></div>${CONDRULE()}`);
}
const AHNOTE = () => { const S = window.AHKAM.sources, a = (x, t) => `<a href="${x.url}" target="_blank" rel="noopener">${t}</a>`;
  return `<p class="ref" style="margin:8px 0 0">${tr("Sources : deux articles de Wikipédia arabe et le texte d'Ibn al-Jazarī (Wikisource). Les occurrences viennent du texte du Coran, contrôlées une à une contre l'annotation du tajwīd : seuls les versets où tout concorde sont utilisés.")} ${a(S[0], 'Wikipédia (nūn)')} · ${a(S[1], 'Wikipédia (mīm)')} · ${a(S[2], 'Wikisource')} ${AI()}</p>`; };
function qAhkam(){
  const A = window.AHKAM, kinds = ['nun', 'mim', 'letter', 'group', 'ghunna', 'tf'];
  const q = ahBuild(cfg.ahKind === 'mix' ? kinds[rnd(kinds.length)] : cfg.ahKind || 'nun', A, Q, rnd, shuffle) || ahBuild('letter', A, Q, rnd, shuffle);
  const set = r => hfGroup([...A.sets[r]]), nm = r => `<b>${esc(AH_NAME[r])}</b>`, opts = () => q.options.map(o => `<button class="opt" data-act="opt" data-v="${o.v}">${hfOpt(o)}</button>`).join('');
  let stem, view = '', explain, stat = 'ah:' + q.correct;
  if (q.kind === 'nun' || q.kind === 'mim' || q.kind === 'ghunna'){
    const t = q.text, a = q.a, b = q.b, mk = x => `<mark class="tjq">${esc(t.slice(x.s, x.e))}</mark>`;
    view = esc(t.slice(0, a.s)) + mk(a) + (b ? esc(t.slice(a.e, b.s)) + mk(b) + esc(t.slice(b.e)) : esc(t.slice(a.e)));
    cur.r = q.ref;
    if (q.kind === 'ghunna'){ stem = tr('Cette lettre surlignée a-t-elle une ghunna de chadda (nūn ou mīm avec chadda) ?'); stat = 'ah:gh';
      explain = q.correct === 't' ? tr('{l} porte une chadda : ghunna complète (2 temps).', {l: hfLet(q.letter)}) : tr('{l} porte une voyelle sans chadda : pas de ghunna de chadda.', {l: hfLet(q.letter)}); }
    else if (q.kind === 'nun'){ stem = tr('Quelle règle pour le nūn sākin ou le tanwīn surligné, devant la lettre surlignée ?');
      explain = `${hfLet(q.b.c)} → ${nm(q.correct)} · ${set(q.correct)}` + (q.muttlaq ? `<br>${tr("Idhhār muṭlaq : le ي ou le و est dans le même mot (دنيا، بنيان، قنوان، صنوان), pas d'idghām.")}` : ''); }
    else { stem = tr('Quelle règle pour le mīm sākin surligné, devant la lettre surlignée ?');
      explain = `${hfLet(q.b.c)} → ${nm(q.correct)} (${tr('ب : ikhfāʾ shafawī ; م : idghām shafawī ; les autres lettres : idhhār shafawī')})`; }
    cur.correct = q.correct; cur.stat = stat; cur.explain = explain + AHNOTE();
    return shell(`<p class="ref">${stem}</p><div class="rd tj" style="font-size:${cfg.rdSize}rem">${view}</div>${qref(q.ref)}${opts()}<div id="fb"></div>`);
  }
  if (q.kind === 'letter'){ stem = tr('Quelle règle pour cette lettre quand elle suit un nūn sākin ou un tanwīn ?'); view = q.letter; explain = `${hfLet(q.letter)} → ${nm(q.correct)} · ${set(q.correct)}`; }
  else if (q.kind === 'group'){ stem = tr('Quelles lettres déclenchent cette règle après un nūn sākin ou un tanwīn ? {r}', {r: nm(q.rule)}); explain = `${nm(q.rule)} : ${set(q.rule)}`; stat = 'ah:' + q.rule; }
  else { const real = ahLetterRule(A, q.letter); stem = tr('Vrai ou faux : après un nūn sākin ou un tanwīn, la lettre ci-dessous entraîne « {r} ».', {r: nm(q.rule)}); view = q.letter;
    explain = `${q.correct === 't' ? tr('Vrai :') : tr('Faux :')} ${hfLet(q.letter)} → ${nm(real)} · ${set(real)}`; stat = 'ah:' + real; }
  hfShow(q, stem, view, explain, stat, AHNOTE());
}
const MDNOTE = () => { const T = window.QX.tajweed, a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  return `<p class="ref" style="margin:8px 0 0">${tr("Durées et marques : légende du tajwīd d'Islamic Network (annotation automatique, non relue par un enseignant). Causes : texte d'Ibn al-Jazarī sur Wikisource. Le type de madd est déduit du texte du verset et n'est posé que s'il concorde avec la marque de la source.")} ${a(T.legend, tr('Légende officielle'))} · ${a(window.HURUF.sources[0].url, 'Wikisource')} ${AI()}</p>`; };
function qMadd(){
  const T = window.QX.tajweed.s, kinds = ['type', 'count', 'cause', 'tf'];
  let kind = cfg.mdKind === 'mix' ? kinds[rnd(kinds.length)] : cfg.mdKind || 'type';
  const nm = t => `<b>${esc(MD_NAME[t])}</b>`, cnt = t => esc(tr(MD_COUNTLABEL[MD_COUNT[t]])), why = t => esc(tr(MD_CAUSE[t]));
  const q = kind === 'cause' ? null : mdBuild(kind, T, rnd, shuffle);
  if (!q){ // règle du matn, sans verset : « quel madd quand… ? »
    const t = hfPick(['lazim', 'muttasil', 'munfasil', 'arid'], rnd), qq = {correct: t, options: ['lazim', 'muttasil', 'munfasil', 'arid'].map(v => ({t: 'mtype', v}))};
    cur.reveal = ''; return hfShow(qq, tr('Quel madd correspond à cette règle : {c}', {c: `<b>${esc(tr(MD_CAUSE[t]))}</b>`}), '', `${nm(t)} · ${cnt(t)}<br>${why(t)}`, 'md:' + t, MDNOTE());
  }
  const pieces = tjMulti(q.segs, [q.pick]), view = tjParts(pieces), full = tjParts(pieces, {colors: true});
  cur.r = q.ref; cur.reveal = full;
  const expl = `${nm(q.type)} · ${cnt(q.type)}<br>${why(q.type)}`;
  let stem, options, correct = q.type;
  if (q.kind === 'count'){ stem = tr('Quelle durée pour le madd surligné ?'); options = ['2', '4-5', '6', '2-4-6'].map(v => ({t: 'mcount', v})); correct = MD_COUNT[q.type]; }
  else if (q.kind === 'tf'){ const truth = rnd(2) === 0, shown = truth ? q.type : hfPick(['tabii', 'muttasil', 'munfasil', 'lazim', 'arid'].filter(x => x !== q.type), rnd);
    stem = tr('Ce madd surligné est-il un « {t} » ?', {t: esc(MD_NAME[shown])}); options = [{t: 'tf', v: 't'}, {t: 'tf', v: 'f'}]; correct = truth ? 't' : 'f'; }
  else { stem = tr('Quel type de madd pour la partie surlignée ?'); options = shuffle(['tabii', 'muttasil', 'munfasil', 'lazim', 'arid']).map(v => ({t: 'mtype', v})); }
  cur.correct = correct; cur.stat = 'md:' + q.type; cur.explain = expl + MDNOTE();
  shell(`<p class="ref">${stem}</p><div class="rd tj" id="tjv" style="font-size:${cfg.rdSize}rem">${view}</div>${qref(q.ref)}
    ${options.map(o => `<button class="opt" data-act="opt" data-v="${o.v}">${hfOpt(o)}</button>`).join('')}<div id="fb"></div>`);
}
function qSifat(noCond){
  const H = window.HURUF, kinds = noCond ? ['pair', 'which', 'mnemo', 'tf'] : ['pair', 'which', 'mnemo', 'cond', 'tf'];
  const kind = cfg.sfKind === 'mix' || (noCond && cfg.sfKind === 'cond') ? kinds[rnd(kinds.length)] : cfg.sfKind || 'pair';
  if (kind === 'cond') return qCond();
  const q = sfBuild(kind, H, rnd, shuffle), per = c => H.per[c].map(hfAttrL).join(' · ');
  if (q.kind === 'pair') return hfShow(q, tr('Quelle qualité a la lettre ci-dessous ?'), q.letter, `${hfLet(q.letter)} : ${esc(per(q.letter))}`, 'sf:' + q.correct);
  if (q.kind === 'which') return hfShow(q, tr('Quelle lettre a la qualité « {a} » ?', {a: esc(hfAttrL(q.attr))}), '', `${esc(hfAttrL(q.attr))} : ${hfGroup(H.sets[q.attr])}`, 'sf:' + q.attr);
  if (q.kind === 'mnemo') return hfShow(q, tr("Quelle qualité rassemblent les lettres de ce mot du matn d'Ibn al-Jazarī ?"), q.word, `${q.word} = ${esc(hfAttrL(q.attr))} : ${hfGroup(H.sets[q.attr])}`, 'sf:' + q.attr);
  const has = H.per[q.letter].includes(q.attr);
  hfShow(q, tr('Vrai ou faux : la lettre ci-dessous a la qualité « {a} ».', {a: esc(hfAttrL(q.attr))}), q.letter, `${has ? tr('Vrai :') : tr('Faux :')} ${hfLet(q.letter)} : ${esc(per(q.letter))}`, 'sf:' + q.attr);
}

function tjStat(code, ok){ const x = tjs[code] || [0, 0]; tjs[code] = [x[0] + (ok ? 1 : 0), x[1] + (ok ? 0 : 1)]; store.set('tathbit.tj', tjs); (ses.tj ||= {})[code] = [((ses.tj[code] || [0, 0])[0]) + (ok ? 1 : 0), ((ses.tj[code] || [0, 0])[1]) + (ok ? 0 : 1)]; }
const TJNOTE = () => `<p class="ref" style="margin:8px 0 0">${tr("Entraînement : les règles viennent d'une annotation automatique (Islamic Network), non relue par un enseignant. En cas de doute, fie-toi à ton professeur.")} ${AI()}</p>`;
const TJUNIQ = 'npmoqcfwiaug';   // familles dont la couleur est unique dans la légende (h/l et d/b partagent un gris)
const TJKINDS = [['rule', 'Reconnaître la règle'], ['color', 'Reconnaître la règle (avec les couleurs, plus facile)'], ['find', "Trouver la partie d'une règle"], ['tf', 'Vrai ou faux ?'], ['read', 'Lire la couleur (retrouver la règle avec la légende)'], ['mix', 'Mélange des types']];
function qTajweed(){
  const {r} = cur, raw = window.QX.tajweed.s[r.s - 1][r.a - 1], segs = tjSegs(raw);
  const fams = [...new Set(segs.filter(x => x.c).map(x => x.c))];
  if (!fams.length){ cur.m = 'cloze'; return qCloze(); }
  let kind = cfg.tjKind === 'mix' ? ['rule', 'color', 'find', 'tf', 'read'][rnd(5)] : cfg.tjKind || 'rule';
  const fam = fams[rnd(fams.length)], idx = segs.map((x, i) => x.c === fam ? i : -1).filter(i => i >= 0), pick = idx[rnd(idx.length)];
  cur.raw = raw; cur.segs = segs; cur.audio = [r]; cur.stat = fam;
  const nm = c => esc(tr(TJNAME[c])), body = (q, view, answers) => shell(`<p class="ref">${q}</p><div class="rd tj" id="tjv" style="font-size:${cfg.rdSize}rem">${view}</div>${qref(r)}${answers}<div id="fb"></div>${TJNOTE()}`);
  if (kind === 'find'){
    const F = tjFindPicks(segs, fam, rnd, shuffle);
    if (F){
      cur.tjk = 'find'; cur.picks = F.picks; cur.pieces = tjMulti(segs, F.picks); cur.correct = String(F.picks.indexOf(F.target) + 1);
      return body(tr("Touche la partie qui suit cette règle : {r}", {r: `<b>${nm(fam)}</b>`}), tjParts(cur.pieces, {numbers: true}),
        F.picks.map((_, j) => `<button class="opt" data-act="opt" data-v="${j + 1}">${tr('Partie {n}', {n: j + 1})}</button>`).join(''));
    }
    kind = 'rule';                        // pas assez de parties dans ce verset : question simple
  }
  if (kind === 'tf'){
    const truth = rnd(2) === 0, shown = truth ? fam : tjFalseFam(fam, TJNAME, shuffle);
    cur.tjk = 'tf'; cur.pieces = tjMulti(segs, [pick]); cur.correct = truth ? 't' : 'f';
    return body(tr('Cette partie suit-elle la règle « {r} » ?', {r: `<b>${nm(shown)}</b>`}), tjParts(cur.pieces),
      `<button class="opt" data-act="opt" data-v="t">${tr('Vrai')}</button><button class="opt" data-act="opt" data-v="f">${tr('Faux')}</button>`);
  }
  if (kind === 'read'){                    // seule la partie surlignée est colorée : on retrouve la règle avec la légende (familles à couleur unique)
    const uniq = fams.filter(c => TJUNIQ.includes(c));
    if (uniq.length){
      const f = uniq[rnd(uniq.length)], ix = segs.map((x, i) => x.c === f ? i : -1).filter(i => i >= 0), pk0 = ix[rnd(ix.length)];
      cur.tjk = 'read'; cur.stat = f; cur.pieces = tjMulti(segs, [pk0]); cur.correct = f; cur.opts = tjOptions(f, TJNAME, shuffle);
      return body(tr('Quelle règle correspond à la couleur de la partie surlignée ? Aide-toi de la légende.'), tjParts(cur.pieces, {colorFam: f}),
        cur.opts.map(c => `<button class="opt" data-act="opt" data-v="${c}">${nm(c)}</button>`).join('') + `<details open style="margin-top:8px"><summary class="ref">${tr('Légende des couleurs')}</summary>${tjLegendHtml()}</details>`);
    }
    kind = 'rule';
  }
  cur.tjk = kind; cur.pieces = tjMulti(segs, [pick]); cur.correct = fam; cur.opts = tjOptions(fam, TJNAME, shuffle);
  body(tr('Quelle est la règle de tajwīd de la partie surlignée ?'), tjParts(cur.pieces, {colors: kind === 'color'}),
    cur.opts.map(c => `<button class="opt" data-act="opt" data-v="${c}">${nm(c)}</button>`).join(''));
}
function qOrder(){
  const {r} = cur; cur.r = {s: r.s, a: 1}; cur.correct = r.s + 1; cur.label = `${r.s}. ${SN(r.s)} → ${r.s + 1}. ${SN(r.s + 1)}`;
  const others = shuffle(Q.map(s => s.n).filter(n => n !== r.s + 1 && n !== r.s)).slice(0, 3);
  cur.opts = shuffle([r.s + 1, ...others]);
  shell(`<p class="ref">${tr('Quelle sourate vient juste après…')}</p>
    <div class="ar" style="text-align:center">${esc(Q[r.s-1].ar)}</div><p class="ref" style="text-align:center">${r.s}. ${esc(SN(r.s))}</p>
    ${cur.opts.map(s => `<button class="opt" data-act="opt" data-v="${s}">${esc(sname(s))}</button>`).join('')}
    <div id="fb"></div>`);
}

/* ---------- actions ---------- */
function onOpt(el){
  if (cur.done) return;
  const btns = [...document.querySelectorAll('.opt')];
  let ok, extra = '';
  if (cur.hf){ // makhārij / ṣifāt
    ok = el.dataset.v === cur.correct;
    btns.forEach(b => { const c = b.dataset.v === cur.correct ? 'c' : b === el ? 'w' : ''; if (c) b.classList.add(c); });
    cur.info = {ans: el.textContent}; hfStat(cur.stat, ok);
    if (cur.reveal && $('tjv')) $('tjv').innerHTML = cur.reveal;      // le verset se colore une fois la réponse donnée
    finish(ok ? 1 : 0, `<br>${cur.explain}`); return;
  }
  if (cur.m === 'tajweed'){
    ok = el.dataset.v === cur.correct;
    btns.forEach(b => { const c = b.dataset.v === cur.correct ? 'c' : b === el ? 'w' : ''; if (c) b.classList.add(c); });
    $('tjv').innerHTML = tjParts(cur.pieces, {colors: true, numbers: cur.tjk === 'find'});   // la phrase se colore une fois la réponse donnée
    const name = c => `<b>${esc(tr(TJNAME[c]))}</b>`;
    extra = cur.tjk === 'find' ? `<br>${cur.picks.map((i, j) => `${tr('Partie {n}', {n: j + 1})} : ${name(cur.segs[i].c)}`).join('<br>')}`
      : `<br>${tr('Règle selon la source :')} ${name(cur.stat)}`;
    cur.info = {ans: el.textContent}; tjStat(cur.stat, ok);
    finish(ok ? 1 : 0, extra); return;
  }
  if (cur.m === 'which' || cur.m === 'order' || cur.m === 'mwhich'){
    const pv = x => isQ(cur.correct) ? +x : x;
    ok = pv(el.dataset.v) === cur.correct;
    btns.forEach(b => { const c = pv(b.dataset.v) === cur.correct ? 'c' : b === el ? 'w' : ''; if (c) b.classList.add(c); });
    extra = (ok ? '' : `<br>${tr('Bonne réponse :')} ${esc(sname(cur.correct))}`) + (cur.m === 'mwhich' ? sibHtml() : '');
    cur.info = {ans: sname(pv(el.dataset.v))};
  } else {
    ok = cur.opts[+el.dataset.v] === cur.good;
    btns.forEach(b => { const c = cur.opts[+b.dataset.v] === cur.good ? 'c' : b === el ? 'w' : ''; if (c) b.classList.add(c); });
    if (cur.m === 'mutash') extra = sibHtml();
    cur.info = {ans: cur.opts[+el.dataset.v]};
  }
  finish(ok ? 1 : 0, extra);
}
/* correction d'un texte tapé ou entendu */
function evaluate(text, lenient){
  const strict = useStrict() && !lenient; // la voix ne donne pas les voyelles : jamais stricte
  const S = cur.flat.filter(x => x.ok), multi = cur.units.length > 1;
  const got = text.split(/\s+/).map(strict ? ck : norm).filter(Boolean);
  const hit = lcsMatch(S.map(x => strict ? x.sk : x.nw), got, strict ? (a, b) => a === b : same);
  S.forEach((x, i) => { x.hit = hit.has(i); });
  cur.info = {ans: text, bad: S.filter(x => !x.hit).map(x => x.w)};
  cur.badV = cur.units.map((_, v) => S.filter(x => x.v === v && !x.hit).map(x => x.w));
  const ratio = hit.size / S.length, perfect = hit.size === S.length && got.length === S.length;
  const score = strict ? (perfect ? 1 : 0)
    : multi ? (ratio === 1 ? 1 : ratio >= 0.85 ? 0.5 : 0)
    : ratio >= (lenient ? 0.8 : 0.9) ? 1 : ratio >= (lenient ? 0.5 : 0.6) ? 0.5 : 0;
  $('work').innerHTML = `<div class="ar">${flatHtml(x => `<span class="${x.hit ? 'w-ok' : 'w-ko'}">${esc(x.w)}</span>`)}</div>`;
  let extra = lenient ? `<br><span class="ref">${tr('Entendu :')} ${esc(text)}</span>` : '';
  if (multi){
    const per = cur.units.map((_, v) => { const w = S.filter(x => x.v === v), h = w.filter(x => x.hit).length;
      return h === w.length ? 1 : (!strict && h / w.length >= 0.85) ? 0.5 : 0; });
    cur.perRef = cur.refs.map((x, v) => [x, per[v]]);
    const bad = per.findIndex(s => s < 1);
    if (bad >= 0){
      const rb = cur.refs[bad], where = rb.bas ? tr('la basmala') : (rb.s !== cur.refs[0].s ? tr('sourate {n}', {n: rb.s}) + ', ' : '') + tr('verset {a}', {a: rb.a});
      extra += `<br><span class="ref">${tr('Premier écart : {w}', {w: where})} · ${trp(per.filter(s => s < 1).length, '{n} partie à revoir|{n} parties à revoir')}.</span>`;
    }
  } else if (strict && !score) extra += `<br><span class="ref">${tr('Correction stricte : tout doit être exact (en rouge : mots faux ou manquants).')}</span>`;
  finish(score, extra);
}
function onCheckCloze(){
  let good = 0; const strict = useStrict(), bad = [], given = [];
  document.querySelectorAll('.blankin').forEach(inp => {
    const i = +inp.dataset.i, ok = strict ? ck(inp.value) === cur.T.sk[i] : same(norm(inp.value), cur.T.nw[i]);
    if (ok) good++; else { bad.push(cur.T.tok[i]); given.push(inp.value.trim() || '∅'); }
    inp.outerHTML = `<span class="${ok ? 'w-ok' : 'w-ko'}">${esc(cur.T.tok[i])}</span>`;
  });
  $('work').innerHTML = '';
  cur.info = {ans: given.join(' | '), bad};
  finish(strict ? (good === cur.hidden.size ? 1 : 0) : good / cur.hidden.size);
}
/* récitation puis marquage mot à mot des erreurs */
function markUI(){
  return `<div class="ar" id="marks">${flatHtml((x, i) => `<span class="wd" data-act="wd" data-i="${i}">${esc(x.w)}</span>`)}</div>
    <p class="ref">${tr('Touche les mots que tu as faux ou oubliés.')}</p>
    <div class="grades"><button data-act="mark-ok">${tr('✓ Tout juste')}</button><button data-act="mark-mid">${tr("~ J'ai hésité")}</button>
    <button class="pri" id="mark-go" data-act="mark-go">${trp(0, 'Valider ({n} erreur)|Valider ({n} erreurs)')}</button></div>`;
}
function markGo(){
  const bad = [...document.querySelectorAll('.wd.bad')].map(e => +e.dataset.i), tot = cur.flat.filter(x => x.ok).length;
  const strict = useStrict();
  const score = bad.length === 0 ? 1 : strict ? 0 : bad.length / tot <= 0.1 ? 0.5 : 0;
  cur.info = {bad: bad.map(i => cur.flat[i].w)};
  cur.badV = cur.units.map((_, v) => bad.filter(i => cur.flat[i].v === v).map(i => cur.flat[i].w));
  if (cur.units.length > 1){
    cur.perRef = cur.refs.map((x, v) => { const w = cur.flat.map((f, i) => [f, i]).filter(([f]) => f.v === v && f.ok), b = w.filter(([, i]) => bad.includes(i)).length;
      return [x, b === 0 ? 1 : (!strict && b / w.length <= 0.1) ? 0.5 : 0]; });
  }
  $('work').innerHTML = `<div class="ar">${flatHtml((x, i) => `<span class="${bad.includes(i) ? 'w-ko' : 'w-ok'}">${esc(x.w)}</span>`)}</div>`;
  finish(score);
}

/* ---------- voix (Web Speech API, arabe) ---------- */
/* Le micro ne reste jamais ouvert indéfiniment : il se coupe (1) dès que la solution s'affiche (réponse corrigée, « Je préfère m'auto-évaluer », question suivante, sortie),
   (2) quand tu appuies sur « J'ai fini de réciter » (récitation d'un verset comme d'un passage), (3) si le navigateur coupe lui-même l'écoute, (4) au plus tard au bout de MIC_MAX secondes. */
/* MH:begin — message d'aide quand le micro ne s'ouvre pas : renvoie le texte (français) à traduire, selon le code d'erreur du navigateur et l'appareil */
function micHelp(code, platform, standalone){
  const how = platform === 'ios' ? (standalone ? "Sur iPhone, la reconnaissance vocale ne marche pas toujours dans l'application installée : ouvre le site dans Safari. Vérifie aussi Réglages > Safari > Microphone et Réglages > Général > Clavier > Activer la dictée."
                : "Sur iPhone : Réglages > Safari > Microphone > Autoriser, et Réglages > Général > Clavier > Activer la dictée.")
    : platform === 'android' ? "Sur Android : touche le cadenas à côté de l'adresse, puis Autorisations > Microphone > Autoriser."
    : "Clique sur le cadenas à côté de l'adresse, choisis Microphone > Autoriser, puis recharge la page.";
  if (code === 'not-allowed' || code === 'service-not-allowed') return {text: "Le micro est bloqué ou refusé.", how};
  if (code === 'audio-capture') return {text: "Aucun micro détecté : branche ou active un micro.", how: ''};
  if (code === 'network') return {text: "La reconnaissance vocale a besoin d'une connexion internet.", how: ''};
  if (code === 'language-not-supported') return {text: "La reconnaissance vocale en arabe n'est pas disponible sur cet appareil.", how: ''};
  if (code === 'no-speech') return {text: "Rien entendu, réessaie.", how: ''};
  return {text: '', how: ''};
}
/* MH:end */
const micPlatform = () => IOS ? 'ios' : /Android/i.test(navigator.userAgent) ? 'android' : 'desktop';
const micError = code => { const h = micHelp(code, micPlatform(), IOS_APP); return h.text ? tr(h.text) + (h.how ? ' ' + tr(h.how) : '') : tr('Micro indisponible ({e}).', {e: code}); };
let MIC_MAX = {one: 45, cont: 180}, MIC_SILENCE = 4000, MIC_GRACE = 1500;   // MIC_SILENCE : pause (ms) après laquelle, une fois du texte entendu, la récitation est considérée finie ; MIC_GRACE : attente (ms) de la fin d'écoute après l'arrêt, avant de corriger de force
let micRec = null;
function stopMic(){
  const mo = $('mic-on'); if (mo) mo.remove();
  if (!micRec) return; const r = micRec; micRec = null; r.aborted = true; clearTimeout(r.cap); clearTimeout(r.silence); clearTimeout(r.grace); clearInterval(r.tick);
  try { r.abort(); } catch { try { r.stop(); } catch { /* déjà arrêté */ } }
}
function listen(){
  if (cur.done) return;
  stopMic();
  const cont = cur.m === 'cont';
  const btn = document.querySelector('[data-act="listen"]'), heard = $('heard'), msg = $('hmsg');
  const rec = new SR(); rec.lang = 'ar-SA'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;   // résultats provisoires : on voit le texte au fur et à mesure ; écoute continue : une pause au milieu du verset ne coupe plus le micro, c'est toi qui termines
  let text = '', stopping = false, ended = false, left = cont ? MIC_MAX.cont : MIC_MAX.one;
  rec.onresult = ev => {
    const R = [...ev.results]; text = R.map(r => r[0].transcript).join(' ');
    heard.innerHTML = R.map(r => `<span class="${r.isFinal ? '' : 'interim'}">${esc(r[0].transcript)}</span>`).join(' ');   // les mots encore provisoires sont estompés
    clearTimeout(rec.silence); if (text.trim() && !stopping) rec.silence = setTimeout(stopNow, MIC_SILENCE);          // une pause assez longue après avoir récité = terminé
  };
  rec.onerror = ev => { if (ev.error === 'aborted') return; msg.dataset.err = '1'; msg.textContent = micError(ev.error); };
  rec.onstart = () => { rec.started = true; if (!msg.dataset.err) tick(); };
  const finish = () => {
    if (ended) return; ended = true;
    clearTimeout(rec.cap); clearTimeout(rec.silence); clearTimeout(rec.grace); clearInterval(rec.tick); if (micRec === rec) micRec = null;
    if (rec.aborted) return;                                  // coupé par l'application (solution affichée) : rien à corriger
    btn.disabled = false; btn.classList.remove('rec-stop'); btn.textContent = tr('🎤 Réessayer'); btn.onclick = null; const mo = $('mic-on'); if (mo) mo.remove();
    heard.querySelectorAll('.interim').forEach(e => e.classList.remove('interim'));
    if (text.trim()){
      evaluate(text, true);
      const w = $('work'); if (w) w.insertAdjacentHTML('beforeend', `<p class="ref" style="margin:12px 0 2px">${tr("Ce que j'ai entendu :")}</p><div class="ar heard" dir="rtl" lang="ar">${esc(text)}</div>`);   // la correction remplace la zone : on garde ce qui a été entendu
    } else if (rec.capped) msg.textContent = tr('Micro coupé automatiquement après {n} s.', {n: cont ? MIC_MAX.cont : MIC_MAX.one});
    else if (!msg.dataset.err) msg.textContent = tr('Rien entendu, réessaie.');
  };
  rec.onend = finish;
  // terminer : on demande l'arrêt ; si le navigateur ne signale jamais la fin (cas vu sur certains appareils), on corrige quand même après MIC_GRACE ms
  function stopNow(){ if (stopping) return; stopping = true; clearTimeout(rec.silence); btn.disabled = true; try { rec.stop(); } catch { /* déjà arrêté */ } rec.grace = setTimeout(() => { try { rec.abort(); } catch { /* déjà arrêté */ } finish(); }, MIC_GRACE); }
  heard.textContent = ''; delete msg.dataset.err;
  const tick = () => { if (!msg.dataset.err) msg.textContent = tr('Micro ouvert : il se coupe tout seul dans {n} s.', {n: left}); };
  msg.textContent = tr("Si ton navigateur demande l'autorisation du micro, accepte. Touche « J'ai fini de réciter » quand tu as terminé."); rec.tick = setInterval(() => { left--; if (left > 0 && rec.started) tick(); }, 1000);
  rec.cap = setTimeout(() => { rec.capped = true; stopNow(); }, left * 1000);
  btn.classList.add('rec-stop'); btn.innerHTML = `⏹ ${esc(tr("J'ai fini de réciter"))}<small>${esc(tr('Touche ici dès que tu as terminé le verset'))}</small>`;
  const old = $('mic-on'); if (old) old.remove(); btn.insertAdjacentHTML('beforebegin', `<div class="mic-on" id="mic-on" role="status"><span class="dot" aria-hidden="true"></span>${esc(tr('Micro ouvert : récite maintenant'))}</div>`);
  btn.onclick = ev => { ev.stopPropagation(); stopNow(); };   // c'est toi qui décides quand le verset est récité : le micro se coupe et la réponse est corrigée
  micRec = rec;
  try { rec.start(); } catch (e){ btn.classList.remove('rec-stop'); const mo2 = $('mic-on'); if (mo2) mo2.remove(); btn.disabled = false; btn.textContent = tr('🎤 Réessayer'); micRec = null; clearTimeout(rec.cap); clearInterval(rec.tick); msg.dataset.err = '1'; msg.textContent = micError((e && e.name === 'NotAllowedError') ? 'not-allowed' : (e && e.name) || 'start'); }
}

/* FR:begin — récitation libre : aligne, dans l'ordre, les mots entendus sur les mots attendus */
function frAlign(exp, start, heard, same, look = 4, raw = heard){   // raw : les mots entendus tels que le téléphone les a écrits (même ordre que heard)
  let p = start; const miss = [], said = []; let pending = [];
  for (let i = 0; i < heard.length; i++){
    const hw = heard[i]; let k = -1;
    for (let d = 0; d <= look && p + d < exp.length; d++){ const e = exp[p + d]; if (same(e, hw) && (d === 0 || e.length >= 3)){ k = p + d; break; } }   // sauter un mot n'est permis que vers un mot d'au moins 3 lettres (les petits mots se répètent trop)
    if (k < 0){ pending.push(raw[i]); continue; }   // mot non reconnu (bruit, mauvaise écoute) : on l'ignore, on n'avance pas ; on le garde pour l'afficher
    for (let q = p; q < k; q++) miss.push(q);        // mots sautés : à revoir
    if (k > p) said.push([p, pending]);              // ce que le téléphone a entendu à la place du premier mot sauté
    pending = []; p = k + 1;
  }
  return {p, miss, said};
}
/* FR:end */
