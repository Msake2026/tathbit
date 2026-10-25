/* Tathbīt — Lecteur (Coran, matns, tajwīd, traductions), historique des erreurs, résultats.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- lecteur : le Coran entier, une sourate, un matn ou tous les moutoun ---------- */
let rd = null, rdObs = null;
const arNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const ALLQ = Array.from({length: 114}, (_, i) => i + 1);
/* ---------- contenus facultatifs du lecteur : tajwīd, traductions, tafsir (data/*.js, générés par tools/build_extras.py) ---------- */
const XFILES = {tajweed: 'data/tajweed.js', fr: 'data/tr-fr.js', en: 'data/tr-en.js', muyassar: 'data/tafsir-ar.js'};
const XPROMISE = {};
const xOk = x => x && Array.isArray(x.s) && x.s.length === 114 && x.s.every((a, i) => a.length === Q[i].a.length && a.every(Boolean)) && x.verses === 6236;
function loadX(name){ // charge un fichier à la demande, le contrôle (nombre de versets, empreinte SHA-256) puis le garde
  if (window.QX && window.QX[name]) return Promise.resolve(window.QX[name]);
  return XPROMISE[name] ||= new Promise((ok, ko) => {
    const el = document.createElement('script'); el.src = XFILES[name];
    el.onload = async () => {
      const x = window.QX && window.QX[name];
      try {
        if (!xOk(x)) throw new Error('données incomplètes');
        if (window.crypto && crypto.subtle && await sha256hex(x.s.flatMap(a => a).join('\n')) !== x.sha256) throw new Error('empreinte incorrecte');
        ok(x);
      } catch (e){ delete window.QX[name]; delete XPROMISE[name]; ko(e); }
    };
    el.onerror = () => { delete XPROMISE[name]; ko(new Error('hors ligne')); };
    document.head.appendChild(el);
  });
}
const rdNeeds = () => [cfg.rdTaj && 'tajweed', cfg.rdTr, cfg.rdTf && 'muyassar'].filter(Boolean);
const rdReady = () => rdNeeds().every(n => window.QX && window.QX[n]);
const TJ = /\[([a-z])\[([^\]]*)\]/g;
function tjHtml(t){ // « [n[ـٰ] » -> <span class="tj-n">…</span> ; le texte hors balise est échappé
  let out = '', i = 0, m; TJ.lastIndex = 0;
  while ((m = TJ.exec(t))){ out += esc(t.slice(i, m.index)) + `<span class="tj-${m[1]}">${esc(m[2])}</span>`; i = TJ.lastIndex; }
  return out + esc(t.slice(i));
}
const TJLEG = [['h', '#AAAAAA', 'Hamzat al-waṣl'], ['l', '#AAAAAA', 'Lām solaire / lettre muette'], ['n', '#537FFF', 'Madd normal (2 temps)'], ['p', '#4050FF', 'Madd permis (2, 4 ou 6 temps)'],
  ['m', '#000EBC', 'Madd nécessaire (6 temps)'], ['o', '#2144C1', 'Madd obligatoire (4-5 temps)'], ['q', '#DD0008', 'Qalqala'], ['c', '#D500B7', 'Ikhfāʾ shafawī'], ['f', '#9400A8', 'Ikhfāʾ'],
  ['w', '#58B800', 'Idghām shafawī'], ['i', '#26BFFD', 'Iqlāb'], ['a', '#169777', 'Idghām avec ghunna'], ['u', '#169200', 'Idghām sans ghunna'], ['d', '#A1A1A1', 'Idghām mutajānisayn / mutaqāribayn'], ['g', '#FF7E1E', 'Ghunna (2 temps)']];
const TJNAME = Object.fromEntries(TJLEG.map(([c, , n]) => [c, n]));   // famille de règle -> nom (légende officielle)
const TRSRC = {fr: 'Hamidullah', en: 'Saheeh International'};
const tjLegendHtml = () => `<p style="margin:6px 0 0">${TJLEG.map(([c, col, n]) => `<span class="tjkey"><i style="background:var(--tjc-${c},${col})"></i><span class="tjpat rd tj" lang="ar"><span class="tj-${c}">ـبـ</span></span>${esc(tr(n))}</span>`).join('')}</p><p class="ref" style="margin:4px 0 0">${AI()}</p>`;
function rdSources(){
  const L = [], a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  if (cfg.rdTaj) L.push(`<p class="ref" style="margin:8px 0 0">${tr("Couleurs du tajwīd : annotation automatique d'Islamic Network (api.alquran.cloud), non relue par un enseignant. Vérifie avec ton professeur ; elle suit une écriture légèrement différente du texte des exercices.")} ${a('https://1x.ax/islamic-network/alquran/tools/~files/master/docs/tajweed.md', tr('Légende officielle'))}.
    <details><summary>${tr('Légende des couleurs')}</summary>${tjLegendHtml()}</details></p>`);
  if (cfg.rdTr) L.push(`<p class="ref" style="margin:8px 0 0">${tr('Traduction : {n} (texte de Tanzil, usage non commercial). Elle rend le sens approché, ce n\'est pas le Coran lui-même.', {n: TRSRC[cfg.rdTr]})} ${a('https://tanzil.net/trans/', 'tanzil.net/trans')}.</p>`);
  if (cfg.rdTf) L.push(`<p class="ref" style="margin:8px 0 0">${tr("Tafsir : at-Tafsir al-Muyassar, Complexe du Roi Fahd (texte arabe, via api.alquran.cloud).")} ${a('https://alquran.cloud/', 'alquran.cloud')}.</p>`);
  return L.join('');
}
function readerSecs(spec){ // 'q:all' | 'q:12' | 'q:sel' | 'm:all' | 'm:<id>'
  const k = spec.slice(0, 1), v = spec.slice(2);
  if (k === 'q') return v === 'all' ? ALLQ : v === 'sel' ? rd.sel : [+v];
  return v === 'all' ? Object.keys(MT) : [v];
}
function openReader(spec, focus = 0, sel = null){
  stopAudio(); if (rdObs){ rdObs.disconnect(); rdObs = null; }
  rd = {spec, sel, focus, playing: false, i0: 0, blk: null, closed: new Set()};   // blk : bloc affiché seul (null = matn entier) ; closed : blocs repliés (« id:k »)
  rd.secs = readerSecs(spec);
  if (focus && spec === 'q:all') rd.i0 = 0;
  rd.upto = Math.min(rd.secs.length, rd.i0 + (rd.secs.length > 1 ? 3 : 1));
  renderReader(); window.scrollTo(0, 0);
}
const rvSpan = (id, a) => `<span class="rv${cfg.rdHide ? ' hid' : ''}" data-act="rv" data-s="${id}" data-i="${a}">${cfg.rdTaj ? tjHtml(window.QX.tajweed.s[id - 1][a - 1]) : esc(verse({s: id, a}))} <span class="vend">﴿${arNum(a)}﴾</span></span>`;
function secHtml(id){
  const q = isQ(id), B = book(id), n = B.a.length, siz = cfg.rdSize;
  if (q){
    const bas = id !== 1 && id !== 9 ? `<div class="ar" style="text-align:center;font-size:calc(1.5rem*var(--arz,1))">${esc(verse({s: 1, a: 1}))}</div>` : '';
    return `<section class="rsec" id="rs-${id}"><h2 class="rtitle"><span class="ar">${esc(B.ar)}</span><small>${id}. ${esc(SN(id))} · ${trp(n, '{n} verset|{n} versets')} · ${tr('pages {a}–{b}', {a: B.a[0].p, b: B.a[n - 1].p})}</small></h2>${bas}
      ${cfg.rdTr || cfg.rdTf ? B.a.map((_, i) => `<div class="rvb"><div class="rd${cfg.rdTaj ? ' tj' : ''}" style="font-size:${siz}rem">${rvSpan(id, i + 1)}</div>
        ${cfg.rdTr ? `<p class="rtr" lang="${cfg.rdTr}" dir="ltr">${esc(window.QX[cfg.rdTr].s[id - 1][i])}</p>` : ''}${cfg.rdTf ? `<p class="rtf" lang="ar">${esc(window.QX.muyassar.s[id - 1][i])}</p>` : ''}</div>`).join('')
      : `<div class="rd${cfg.rdTaj ? ' tj' : ''}" style="font-size:${siz}rem">${B.a.map((_, i) => rvSpan(id, i + 1)).join(' ')}</div>`}</section>`;
  }
  const unit = {vers: '{n} vers|{n} vers', hadith: '{n} hadith|{n} hadiths', passage: '{n} passage|{n} passages'}[B.unit] || '{n}';
  const line = (u, i) => {
    const w = u.t.split(/\s+/), h = B.kind === 'poem' && u.m ? u.m : 0;
    const txt = h ? `<span>${esc(w.slice(0, h).join(' '))}</span><span class="psep">✦</span><span>${esc(w.slice(h).join(' '))}</span>` : esc(u.t);
    return `<div class="${h ? 'pl' : 'pp'} rd rv${cfg.rdHide ? ' hid' : ''}" style="font-size:${siz * 0.78}rem;line-height:2.1" data-act="rv" data-s="${id}" data-i="${i + 1}"><span class="pn">${i + 1}</span>${txt}</div>`;
  };
  let body;
  if (B.sec && B.sec.length){ // blocs (chapitres de la source) : un seul bloc au choix, ou tout le matn avec blocs repliables
    const one = rd.spec === 'm:' + id && rd.blk != null && B.sec[rd.blk] ? rd.blk : null;
    body = B.sec.map((b, k) => {
      if (one != null && one !== k) return '';
      const [f, t] = secRange(id, k), to = Math.min(t, n), title = `${esc(secName(b))} <small>(${trp(to - f + 1, unit)})</small>`;
      const verses = B.a.slice(f - 1, to).map((u, j) => line(u, f - 1 + j)).join('');
      return one != null ? `<h3 class="rblk">${title}</h3>${verses}`
        : `<details class="rblkd" data-k="${id}:${k}" ${rd.closed.has(id + ':' + k) ? '' : 'open'}><summary class="rblk">${title}</summary>${verses}</details>`;
    }).join('');
  } else body = B.a.map(line).join('');
  return `<section class="rsec" id="rs-${id}"><h2 class="rtitle"><span class="ar">${esc(B.ar)}</span><small>${esc(MN(id))} · ${trp(n, unit)}${B.author ? ' · ' + esc(tr(B.author)) : ''}</small></h2>${srcNote({id})}
    ${body}</section>`;
}
function renderReader(){
  setNav(false);
  const spec = rd.spec, k = spec.slice(0, 1), q = k === 'q', multi = rd.secs.length > 1;
  if (q && !rdReady()){ // tajwīd / traduction / tafsir demandés : on charge (et contrôle) les fichiers avant d'afficher
    $app.innerHTML = `<div class="top"><button class="link" data-act="rd-back">${tr('← Retour')}</button><span>${tr('Coran')}</span></div><p class="sub" style="margin-top:30vh;text-align:center">${tr('Chargement…')}</p>`;
    const mine = rd;
    Promise.all(rdNeeds().map(loadX)).then(() => { if (rd === mine) renderReader(); }, e => {
      cfg.rdTaj = false; cfg.rdTr = ''; cfg.rdTf = false; saveCfg(); mine.err = tr('Impossible de charger ce contenu ({e}). Vérifie ta connexion puis réessaie.', {e: e.message});
      if (rd === mine) renderReader();
    });
    return;
  }
  const optSel = v => v === spec ? 'selected' : '';
  const sel = `<label class="f" for="rdsel">${tr('Texte à lire')}</label><select id="rdsel">
    <optgroup label="${tr('Coran')}"><option value="q:all" ${optSel('q:all')}>📖 ${tr('Tout le Coran (114 sourates)')}</option>${rd.sel ? `<option value="q:sel" ${optSel('q:sel')}>${tr('Ma sélection ({n} sourates)', {n: rd.sel.length})}</option>` : ''}
      ${Q.map(x => `<option value="q:${x.n}" ${optSel('q:' + x.n)}>${x.n}. ${esc(SN(x.n))}</option>`).join('')}</optgroup>
    <optgroup label="${tr('Moutoun')}"><option value="m:all" ${optSel('m:all')}>📜 ${tr('Tous les moutoun')}</option>
      ${Object.values(MT).map(t => `<option value="m:${t.id}" ${optSel('m:' + t.id)}>${esc(MN(t.id))}</option>`).join('')}</optgroup></select>`;
  const MB = !q && !multi && MT[rd.secs[0]] && MT[rd.secs[0]].sec;    // un seul matn qui a des blocs
  const blkSel = MB ? `<label class="f" for="rdblk">${tr('Bloc (chapitre du matn)')}</label><select id="rdblk"><option value="">📜 ${tr('Tout le matn')} (${MT[rd.secs[0]].a.length})</option>${MB.map((b, k) => `<option value="${k}" ${rd.blk === k ? 'selected' : ''}>${k + 1}. ${esc(secName(b))} (${secSize(rd.secs[0], k)})</option>`).join('')}</select>` : '';
  const foldable = !q && rd.blk == null && rd.secs.some(id => MT[id] && MT[id].sec);
  const jump = multi ? `<label class="f" for="rdjump">${tr('Aller à…')}</label><select id="rdjump">${rd.secs.map(id => `<option value="${id}" ${id === rd.secs[rd.i0] ? 'selected' : ''}>${q ? id + '. ' + esc(SN(id)) : esc(MN(id))}</option>`).join('')}</select>` : '';
  const first = q ? 1 : Object.keys(MT)[0], last = q ? 114 : Object.keys(MT).slice(-1)[0];
  const id0 = rd.secs[0];
  const total = q ? rd.secs.reduce((a, id) => a + slen(id), 0) : 0;
  const info = multi ? (q ? `${trp(rd.secs.length, '{n} sourate|{n} sourates')} · ${trp(total, '{n} verset|{n} versets')}` : `${trp(rd.secs.length, '{n} matn|{n} moutoun')}`) : '';
  $app.innerHTML = `
  <h1 class="sr-only">${tr('Lecteur')}</h1>
  <div class="top"><button class="link" data-act="rd-back">${tr('← Retour')}</button><span>${q ? tr('Coran') : tr('Moutoun')}</span></div>
  <div class="card" style="margin-top:8px">${sel}${jump}${blkSel}
    ${info ? `<p class="ref" style="margin:8px 0 0">${info}</p>` : ''}
    ${multi ? '' : `<div class="grades">
      <button data-act="rd-prev" ${id0 === first ? 'disabled' : ''}>${tr('‹ Précédent')}</button>
      <button data-act="rd-next" ${id0 === last ? 'disabled' : ''}>${tr('Suivant ›')}</button></div>`}
    <div class="grades">
      <button data-act="rd-size" data-v="-1" aria-label="${tr('Réduire le texte')}">A−</button>
      <button data-act="rd-size" data-v="1" aria-label="${tr('Agrandir le texte')}">A+</button>
      <button data-act="rd-hide">${cfg.rdHide ? '👁 ' + tr('Tout afficher') : '🙈 ' + tr('Masquer le texte')}</button>
      ${q ? `<button id="rdplay" data-act="rd-play">▶ ${tr('Écouter')}</button>` : ''}
    </div>
    ${foldable ? `<div class="grades"><button data-act="rd-fold" data-v="1">⏫ ${tr('Tout replier')}</button><button data-act="rd-fold" data-v="0">⏬ ${tr('Tout déplier')}</button></div>` : ''}
    ${q ? `<div class="grades">
      <button data-act="rd-taj" aria-pressed="${!!cfg.rdTaj}">🎨 ${cfg.rdTaj ? tr('Couleurs du tajwīd : oui') : tr('Couleurs du tajwīd : non')}</button>
      <button data-act="rd-tf" aria-pressed="${!!cfg.rdTf}">📚 ${cfg.rdTf ? tr('Tafsir al-Muyassar : oui') : tr('Tafsir al-Muyassar : non')}</button></div>
      <label class="f" for="rdtr">${tr('Traduction')}</label><select id="rdtr"><option value="">${tr('Aucune')}</option>
        <option value="fr" ${cfg.rdTr === 'fr' ? 'selected' : ''}>Français · Hamidullah</option><option value="en" ${cfg.rdTr === 'en' ? 'selected' : ''}>English · Saheeh International</option></select>
      ${rd.err ? `<p class="ref" style="margin:8px 0 0;color:var(--ko)">${esc(rd.err)}</p>` : ''}${rdSources()}` : ''}
    <p class="ref" style="margin:8px 0 0">${cfg.rdHide ? tr('Touche un passage pour le dévoiler.') : q ? tr("Touche un verset pour l'écouter à partir de là.") : ''}</p>
    <p class="ref" id="audio-msg" style="margin:0"></p>
  </div>
  ${rd.i0 > 0 ? `<button class="big" style="margin-bottom:12px" data-act="rd-more-up">⬆ ${tr('Sections précédentes')}</button>` : ''}
  <div class="card" id="rbody">${rd.secs.slice(rd.i0, rd.upto).map(secHtml).join('')}</div>
  <div id="rmore" class="rsentinel" ${rd.upto >= rd.secs.length ? 'hidden' : ''}>…</div>`;
  if ($('rdblk')) $('rdblk').onchange = e => { rdStop(); rd.blk = e.target.value === '' ? null : +e.target.value; rd.focus = 0; renderReader(); scrollTo(0, 0); };
  $app.querySelectorAll('details.rblkd').forEach(d => d.addEventListener('toggle', () => { rd.closed[d.open ? 'delete' : 'add'](d.dataset.k); }));
  if ($('rdtr')) $('rdtr').onchange = e => { cfg.rdTr = e.target.value; saveCfg(); rd.err = ''; const y = scrollY; rdStop(); rd.focus = 0; renderReader(); scrollTo(0, y); };
  $('rdsel').onchange = e => { const v = e.target.value; rdStop(); openReader(v, 0, v === 'q:sel' ? rd.sel : null); };
  if ($('rdjump')) $('rdjump').onchange = e => { rdStop(); const id = rd.secs.find(x => String(x) === e.target.value); rd.i0 = rd.secs.indexOf(id); rd.upto = Math.min(rd.secs.length, rd.i0 + 3); rd.focus = 0; renderReader(); window.scrollTo(0, 0); };
  if (rdObs){ rdObs.disconnect(); rdObs = null; }
  if ($('rmore') && 'IntersectionObserver' in window){ rdObs = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) rdMore(); }, {rootMargin: '1500px'}); rdObs.observe($('rmore')); }
  if (rd.focus){
    const el = document.querySelector(`.rv[data-s="${rd.secs[0]}"][data-i="${rd.focus}"]`);
    if (el){ el.classList.remove('hid'); el.classList.add('focus'); setTimeout(() => el.scrollIntoView({block: 'center'}), 50); }
  }
}
function rdMore(n = 4){ // charge la suite au défilement
  if (!rd || rd.upto >= rd.secs.length) return false;
  const to = Math.min(rd.secs.length, rd.upto + n);
  $('rbody').insertAdjacentHTML('beforeend', rd.secs.slice(rd.upto, to).map(secHtml).join(''));
  rd.upto = to;
  if (rd.upto >= rd.secs.length){ if (rdObs){ rdObs.disconnect(); rdObs = null; } if ($('rmore')) $('rmore').hidden = true; }
  return true;
}
function rdStop(){ stopAudio(); if (rd) rd.playing = false; document.querySelectorAll('.rv.playing').forEach(e => e.classList.remove('playing')); const b = $('rdplay'); if (b) b.textContent = '▶ ' + tr('Écouter'); }
function rdPlay(id, i){
  document.querySelectorAll('.rv.playing').forEach(e => e.classList.remove('playing'));
  if (!rd || !rd.spec.startsWith('q')) return rdStop();
  if (i > slen(id)){ const nx = rd.secs[rd.secs.indexOf(id) + 1]; if (nx === undefined) return rdStop(); id = nx; i = 1; }
  let el = document.querySelector(`.rv[data-s="${id}"][data-i="${i}"]`);
  while (!el && rdMore()) el = document.querySelector(`.rv[data-s="${id}"][data-i="${i}"]`);
  if (!el) return rdStop();
  rd.playing = true; const b = $('rdplay'); if (b) b.textContent = '⏹ ' + tr('Arrêter');
  el.classList.remove('hid'); el.classList.add('playing'); el.scrollIntoView({block: 'center', behavior: 'smooth'});
  playUrls([audioUrl({s: id, a: i})], () => rdPlay(id, i + 1));
}

/* ---------- historique des erreurs ---------- */
let hf = 'all', hv = 'v', hrefs = [];
const MODE_NAME = new Proxy({}, {get: (_o, id) => { if (id === 'free') return tr('Récitation libre'); const m = MODES.find(x => x[0] === id); return m ? tr(m[1]) : undefined; }}); // nom traduit de chaque exercice
const fdate = t => new Date(t).toLocaleString(LOCALE(), {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
function aggErrors(list){
  const agg = new Map();
  for (const e of list){
    const r = pk(e.k); if (!book(r.s)) continue;
    const a = agg.get(e.k) || {k: e.k, r, n: 0, last: 0, modes: new Set(), bad: []};
    a.n++; a.last = Math.max(a.last, e.t); a.modes.add(MODE_NAME[e.m] || e.m);
    (e.bad || []).forEach(w => { if (!a.bad.includes(w)) a.bad.push(w); });
    agg.set(e.k, a);
  }
  return [...agg.values()].sort((x, y) => y.n - x.n || y.last - x.last);
}
function tabErrors(){
  const lim = Date.now() - 7 * 864e5;
  const L = errors.filter(e => { const r = pk(e.k); return book(r.s) && (hf === 'all' || (hf === 'q' && isQ(r.s)) || (hf === 'm' && !isQ(r.s)) || (hf === '7' && e.t >= lim)); });
  const rows = aggErrors(L); hrefs = rows.slice(0, 15).map(a => a.r);
  const chip = (id, cur_, t, act) => `<button class="${cur_ === id ? 'sel' : ''}" data-act="${act}" data-v="${id}">${t}</button>`;
  const body = hv === 'v'
    ? rows.slice(0, 80).map(a => `<div class="sib"><p class="ref" style="margin:0">${rlabel(a.r)}</p>
        <p class="ref" style="margin:0"><b>${tr('raté {n} fois', {n: a.n})}</b> · ${tr('dernière :')} ${fdate(a.last)} · ${esc([...a.modes].join(', '))}</p>
        <div class="ar" style="font-size:calc(1.35rem*var(--arz,1));line-height:2">${esc(verse(a.r))}</div>
        <button class="link" data-act="rdopen" data-v="${a.k}">📖 ${tr('Lire tout le texte')}</button>
        ${a.bad.length ? `<p class="ref" style="margin:0">${tr('Mots souvent faux :')} <span class="ar" style="font-size:calc(1.2rem*var(--arz,1));display:inline">${esc(a.bad.slice(0, 12).join(' · '))}</span></p>` : ''}</div>`).join('')
    : L.slice().reverse().slice(0, 100).map(e => { const r = pk(e.k);
        return `<div class="sib"><p class="ref" style="margin:0">${fdate(e.t)} · ${esc(MODE_NAME[e.m] || e.m)} · ${e.sc === 0.5 ? tr('hésité') : tr('raté')}</p>
        <p class="ref" style="margin:0"><b>${rlabel(r)}</b></p>
        ${e.bad ? `<p class="ref" style="margin:0">${tr('Mots faux ou oubliés :')} <span class="ar" style="font-size:calc(1.2rem*var(--arz,1));display:inline">${esc(e.bad.join(' · '))}</span></p>` : ''}
        ${e.ans ? `<p class="ref" style="margin:0">${tr('Ta réponse :')} <span class="ar" style="font-size:calc(1.2rem*var(--arz,1));display:inline">${esc(e.ans)}</span></p>` : ''}</div>`; }).join('');
  return `
  <h1>${tr('Erreurs')}</h1>
  <p class="sub">${trp(L.length, '{n} erreur|{n} erreurs')} · ${trp(rows.length, '{n} verset concerné|{n} versets concernés')}</p>
  <div class="chips" style="margin-bottom:8px">${chip('all', hf, tr('Tout'), 'hfilter')}${chip('7', hf, tr('7 derniers jours'), 'hfilter')}${chip('q', hf, tr('Coran'), 'hfilter')}${chip('m', hf, tr('Moutoun'), 'hfilter')}</div>
  <div class="chips" style="margin-bottom:12px">${chip('v', hv, tr('Par verset'), 'hview')}${chip('t', hv, tr('Chronologie'), 'hview')}</div>
  ${rows.length ? `<button class="pri big" data-act="hreview">${tr('Réviser les {n} versets les plus ratés', {n: hrefs.length})}</button>` : ''}
  <div class="card" style="margin-top:12px">${body || `<p class="sub" style="margin:0">${tr('Aucune erreur enregistrée pour ce filtre. Chaque erreur apparaîtra ici avec les mots faux et ta réponse.')}</p>`}</div>
  ${errors.length ? `<p style="text-align:end"><button class="link" data-act="hclear">${tr("Effacer l'historique")}</button></p>` : ''}`;
}

/* fin d'une étape de la séance du jour : étape suivante, ou séance terminée (et la nouvelle portion du plan si elle n'est pas faite) */
function dayEndHtml(){
  const d = ses.day, last = d.i >= d.steps.length - 1, T = plan ? planToday() : null;
  if (!last) return `<p class="ref" style="margin:0 0 8px">${tr('Séance du jour : étape {i} sur {n}', {i: d.i + 1, n: d.steps.length})}</p><button class="pri big" data-act="day-next">${tr('Étape suivante : {s}', {s: tr(DAY_NAME[d.steps[d.i + 1].k])})}</button>`;
  return `<div class="fb ok" role="status">🎉 ${tr('Séance du jour terminée, machaa Allah.')}</div>${T && T.next && !T.d.sabaq ? `<button class="pri big" style="margin-top:8px" data-act="plan-sabaq">${tr('Apprendre la nouvelle portion du plan')}</button>` : ''}`;
}
/* ---------- résultats ---------- */
function results(){
  const pct = Math.round(100 * ses.score / ses.total);
  const msg = pct >= 90 ? tr('Machaa Allah, excellente mémorisation !') : pct >= 70 ? tr('Très bien, continue ainsi.') : pct >= 50 ? tr('Pas mal, quelques versets à consolider.') : tr('Courage : relis puis réessaie.');
  const missed = [...new Map(ses.missed.map(r => [key(r), r])).values()];
  if (ses.planKind === 'sabqi' || ses.planKind === 'manzil') planFinish(ses.planKind);
  ses.missed = missed; setNav(false);
  $app.innerHTML = `
  <h1>${tr('Résultat')}</h1>
  <div class="card"><div class="big-score">${pct} %</div>
    <p class="sub" style="text-align:center">${ses.score % 1 ? ses.score.toFixed(1) : ses.score} / ${ses.total} · ${msg}</p></div>
  ${ses.hf ? `<div class="card"><h2>${tr('Résumé de la série')}</h2>${Object.entries(ses.hf).sort((a, b) => b[1][1] - a[1][1]).map(([k, [o, e]]) => `<div class="weak"><span>${hfKeyLabel(k)}</span><span>${o} ✓ · ${e} ✗</span></div>`).join('')}${HFNOTE()}</div>` : ''}
  ${ses.tj ? `<div class="card"><h2>${tr('Règles de cette série')}</h2>${Object.entries(ses.tj).sort((a, b) => b[1][1] - a[1][1]).map(([c, [o, k]]) => `<div class="weak"><span>${esc(tr(TJNAME[c]))}</span><span>${o} ✓ · ${k} ✗</span></div>`).join('')}${TJNOTE()}</div>` : ''}
  ${missed.length ? `<div class="card"><h2>${tr('À revoir ({n})', {n: missed.length})}</h2>
    ${missed.map(r => `<p class="ref" style="margin:10px 0 0">${rlabel(r)}</p><div class="ar" style="font-size:calc(1.5rem*var(--arz,1))">${esc(verse(r))}</div>`).join('')}</div>` : ''}
  ${missed.length && !(ses.day && ses.day.i < ses.day.steps.length - 1) ? `<button class="pri big" data-act="retry">${tr('Refaire mes erreurs')}</button>` : ''}
  ${ses.day ? dayEndHtml() : ''}
  ${ses.planKind === 'sabaq' ? `<button class="pri big" style="margin-top:8px" data-act="plan-learned">✓ ${tr('Marquer cette portion comme apprise')}</button>` : ''}
  ${ses.day ? '' : ses.planKind ? `<button class="big" style="margin-top:8px" data-act="tab" data-v="plan">${tr('Retour au plan')}</button>`
    : `<button class="big" style="margin-top:8px" data-act="again">${tr('Nouvelle série')}</button>`}
  <button class="big" style="margin-top:8px" data-act="tab" data-v="home">${tr('Accueil')}</button>`;
}

