/* Tathbīt — Récitation libre à voix haute, écoute, rappel .ics, sauvegarde, import d'un matn, mes moutoun.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- récitation libre à voix haute (sans exercice) : une ou plusieurs sourates, de mémoire ---------- */
const FR_MAX = 1800;   // durée maximale d'une récitation libre (secondes)
let fr = null;
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');   // compteur de temps de la récitation
function frTick(){ const el = $('fr-time'); if (fr && fr.t0 && el) el.textContent = mmss(Math.floor((Date.now() - fr.t0) / 1000)) + ' / ' + mmss(FR_MAX); }
function frQuit(){ if (fr){ clearInterval(fr.tick); clearTimeout(fr.timer); clearTimeout(fr.cap); clearTimeout(fr.grace); if (fr.rec){ fr.rec.onend = null; fr.rec.onresult = null; try { fr.rec.abort(); } catch { /* déjà arrêté */ } } fr = null; } go('train'); }
/* historique de la récitation libre, par sourate (sur cet appareil) : date, versets récités, sans oubli, à revoir, et où reprendre */
const frHist = () => store.get('tathbit.frSurah', {});
function frRemember(done, clean, flagged, open){
  const H = frHist(), now = Date.now(), by = {};
  for (const v of done){ const e = (by[v.s] ||= {a0: v.a, a1: v.a, c: 0, flag: []}); e.a0 = Math.min(e.a0, v.a); e.a1 = Math.max(e.a1, v.a); }
  clean.forEach(v => { by[v.s].c++; }); flagged.forEach(f => by[f.v.s].flag.push(f.v.a));
  for (const [k, e] of Object.entries(by)) H[k] = {t: now, a0: e.a0, a1: e.a1, c: e.c, flag: e.flag.sort((x, y) => x - y), tot: slen(+k), stop: open && open.s === +k ? open.a : 0, rt: fr.to};
  store.set('tathbit.frSurah', H);
}
function frResumeHtml(){ // accueil : la dernière récitation interrompue, à reprendre d'un toucher
  const E_ = Object.entries(frHist()).filter(([k, e]) => Q[k - 1] && e.stop > 0).sort((a, b) => b[1].t - a[1].t)[0];
  if (!E_) return '';
  const [k, e] = E_;
  return `<button class="big" style="margin-top:8px" data-act="fr-resume" data-v="${k}:${e.stop}">${ic('mic')} ${tr('Reprendre ma récitation : {s}, verset {a}', {s: esc(SN(+k)), a: e.stop})}</button>`;
}
function frHistHtml(){ // « Mes récitations » : dernière récitation de chaque sourate, ce qui est à revoir, et le bouton pour reprendre
  const E_ = Object.entries(frHist()).filter(([k]) => Q[k - 1]).sort((a, b) => b[1].t - a[1].t).slice(0, 8);
  if (!E_.length) return '';
  const fd = t => new Date(t).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short'});
  return `<div class="card" id="fr-hist"><h2>${tr('Mes récitations')}</h2>${E_.map(([k, e]) => { const n = e.a1 - e.a0 + 1;
    return `<div class="weak" style="display:block"><div><b>${k}. ${esc(SN(+k))}</b> · <span class="ref">${fd(e.t)}</span></div>
      <div class="ref" style="margin:2px 0 4px">${tr('{n} versets récités sur {t}', {n, t: e.tot})} · ${trp(e.c, '{n} sans oubli|{n} sans oubli')}${e.flag.length ? ' · ' + tr('à revoir : versets {l}', {l: e.flag.slice(0, 8).join(', ') + (e.flag.length > 8 ? '…' : '')}) : ''}</div>
      <div class="row">${e.stop ? `<button class="pri" data-act="fr-resume" data-v="${k}:${e.stop}">${ic('play')} ${tr('Reprendre au verset {a}', {a: e.stop})}</button>` : ''}<button data-act="fr-resume" data-v="${k}:1">${e.stop ? tr('Depuis le début') : tr('Réciter encore')}</button></div></div>`; }).join('')}
    <p class="ref" style="margin:8px 0 0">${tr('Enregistré sur cet appareil. Le suivi se fait aux mots entendus : il peut se tromper.')}</p></div>`;
}
function frSetup(){
  if (fr && fr.rec){ fr.rec.onend = null; try { fr.rec.abort(); } catch { /* déjà arrêté */ } } fr = null; stopMic(); setNav(false);
  const from = cfg.frFrom || 78, to = cfg.frTo || 114, hide = cfg.frHide !== false;
  $app.innerHTML = `<div class="top"><button class="link" data-act="fr-quit">✕ ${tr('Quitter')}</button><span>${tr('Récitation libre')}</span></div>
    <h1 style="margin-top:8px">${ic('mic')} ${tr('Réciter à voix haute')}</h1>
    <p class="sub">${tr("Sans exercice : choisis tes sourates et récite-les d'une traite. L'application suit ta récitation.")}</p>
    <div class="card"><h2>${tr('Sourates')}</h2>
      <div class="row"><div><label class="f" for="frfrom">${tr('De')}</label><select id="frfrom">${surahOpts(from)}</select></div>
        <div><label class="f" for="frto">${tr('À')}</label><select id="frto">${surahOpts(to)}</select></div></div>
      <label class="consent" style="margin-top:10px"><input type="checkbox" id="frhide" ${hide ? 'checked' : ''}><span>${tr('Réciter de mémoire : le texte reste masqué et se dévoile au fur et à mesure.')}</span></label></div>
    ${frHistHtml()}
    <div class="card"><p class="ref" style="margin:0 0 6px">${tr("Le micro reste ouvert jusqu'à ce que tu touches « J'ai fini de réciter » (30 minutes au plus).")}</p>
      <p class="ref" style="margin:0 0 6px">${tr("L'application suit les mots que tu dis. Elle ne vérifie ni les voyelles ni le tajwīd, et elle peut se tromper : un mot non reconnu n'est pas forcément une erreur.")}</p>
      ${SR ? '' : `<p class="ref" style="margin:0;color:var(--ko)">${tr("La reconnaissance vocale n'est pas disponible sur ce navigateur.")}</p>`}</div>
    <button class="pri big" data-act="fr-start" ${SR ? '' : 'disabled'}>${ic('mic')} ${tr('Commencer à réciter')}</button>`;
}
function frBuild(from, to, hide){
  const exp = [], meta = [], verses = [];
  for (let s = from; s <= to; s++) Q[s - 1].a.forEach((v, i) => {
    const tok = v.t.replace(/﻿/g, '').trim().split(/\s+/), start = exp.length;
    tok.forEach((w, j) => { const n = norm(w); if (n){ exp.push(n); meta.push({s, a: i + 1, j}); } });
    verses.push({s, a: i + 1, from: start, to: exp.length, tok});
  });
  return {from, to, hide, exp, meta, verses, p: 0, base: 0, start0: 0, miss: new Set(), sess: new Set(), hint: new Set(), sec: 0, quick: 0, undo: {}, koDone: new Set(), said: {}, sessSaid: {}};
}
const frVerse = p => { const V = fr.verses; let lo = 0, hi = V.length - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (V[m].from <= p) lo = m; else hi = m - 1; } return lo; };
function frStart(res){ // res = {s, a, to} : reprise au verset a de la sourate s (sinon, la plage choisie depuis son début)
  let from = res ? res.s : +$('frfrom').value, to = res ? Math.max(res.s, res.to || res.s) : +$('frto').value; if (from > to) [from, to] = [to, from];
  cfg.frFrom = from; cfg.frTo = to; if ($('frhide')) cfg.frHide = $('frhide').checked; saveCfg();
  fr = frBuild(from, to, cfg.frHide !== false); stopMic(); setNav(false);
  if (res && res.a > 1){ const v = fr.verses.find(x => x.s === res.s && x.a === res.a); if (v){ fr.p = fr.base = fr.start0 = v.from; } }
  $app.innerHTML = `<div class="top"><button class="link" data-act="fr-quit">✕ ${tr('Quitter')}</button><span id="fr-time" class="frtime" role="timer" aria-label="${esc(tr('Temps écoulé'))}">0:00 / ${mmss(FR_MAX)}</span><span id="fr-pos"></span></div>
    <div class="bar"><i id="fr-bar" style="width:0%"></i></div>
    <h2 class="rtitle" id="fr-title" style="margin-top:8px"></h2>
    <div class="card frtext rd" id="fr-text" dir="rtl" lang="ar" style="font-size:${cfg.rdSize || 1.7}rem"></div>
    <div class="mic-on" id="mic-on" role="status"><span class="dot" aria-hidden="true"></span>${esc(tr('Micro ouvert : récite maintenant'))}</div>
    <p class="ref" style="margin:6px 0 0">${tr("Rouge : mot non entendu ou sauté ; touche-le pour voir ce que le téléphone a entendu. Ce n'est pas forcément une faute : l'application n'entend pas les voyelles.")}</p>
    <p class="ref" style="margin:4px 0 0;font-weight:600" id="fr-heard-info" role="status"></p>
    <p class="ref" style="margin:8px 0 2px" id="fr-msg" role="status"></p>
    <div class="ar heard" id="heard" dir="rtl" lang="ar" aria-live="off"></div>
    <div class="grades"><button data-act="fr-hint" ${fr.hide ? '' : 'hidden'}>${ic('bulb')} ${tr('Montrer le mot suivant')}</button><button data-act="fr-skip">${ic('skip')} ${tr('Passer ce verset')}</button></div>
    <button class="rec-stop" data-act="fr-stop">${ic('stop')} ${esc(tr("J'ai fini de réciter"))}<small>${esc(tr('Touche ici pour terminer et voir le bilan'))}</small></button>`;
  frDraw(fr.meta[Math.min(fr.p, fr.exp.length - 1)].s); frPaint();
  fr.cap = setTimeout(() => frFinish('time'), FR_MAX * 1000); fr.t0 = Date.now(); fr.tick = setInterval(frTick, 1000);
  frListen();
}
function frDraw(s){ // affiche le texte de la sourate s ; chaque mot est un <span data-w=n° du mot dans toute la récitation>
  fr.sec = s; const box = $('fr-text'); if (!box) return;
  box.innerHTML = fr.verses.filter(v => v.s === s).map(v => { let w = v.from;
    return `<span class="frv">${v.tok.map(t => norm(t) ? `<span class="fw" data-w="${w++}">${esc(t)}</span>` : esc(t)).join(' ')} <span class="vend">﴿${arNum(v.a)}﴾</span></span> `; }).join('');
  fr.spans = [...box.querySelectorAll('.fw')]; fr.cv = -1;
  const t = $('fr-title'); if (t) t.innerHTML = `<span class="ar">${esc(Q[s - 1].ar)}</span><small>${s}. ${esc(SN(s))}</small>`;
}
function frPaint(){
  if (!fr || !fr.spans) return;
  const p = fr.p, last = fr.exp.length - 1, at = Math.min(p, last), m = fr.meta[at];
  if (m.s !== fr.sec) frDraw(m.s);
  for (const el of fr.spans){
    const w = +el.dataset.w, bad = fr.miss.has(w) || fr.sess.has(w) || fr.hint.has(w);
    const c = w < p ? (bad ? 'fw miss' : 'fw ok') : (fr.hint.has(w) ? 'fw hint' : (w === p ? 'fw cur' : 'fw') + (fr.hide ? ' mask' : ''));
    if (el.className !== c) el.className = c;
    const tap = c === 'fw miss' || c === 'fw hint';   // un mot à revoir se touche pour voir ce que le téléphone a entendu
    if (tap && !el.dataset.act){ el.dataset.act = 'fr-heard'; el.dataset.v = w; el.setAttribute('role', 'button'); el.tabIndex = 0; } else if (!tap && el.dataset.act){ delete el.dataset.act; delete el.dataset.v; el.removeAttribute('role'); el.removeAttribute('tabindex'); }
  }
  const vi = frVerse(at), v = fr.verses[vi], n = Q[v.s - 1].a.length;
  const pos = $('fr-pos'); if (pos) pos.textContent = tr('Verset {a} / {n}', {a: Math.min(v.a, n), n});
  const bar = $('fr-bar'); if (bar) bar.style.width = (100 * Math.min(p, fr.exp.length) / fr.exp.length) + '%';
  if (vi !== fr.cv){ fr.cv = vi; const el = fr.spans.find(e => +e.dataset.w >= v.from); if (el && el.scrollIntoView) try { el.scrollIntoView({block: 'center'}); } catch { /* ancien navigateur */ } }
}
function frCommit(){ fr.sess.forEach(i => fr.miss.add(i)); Object.assign(fr.said, fr.sessSaid); fr.sessSaid = {}; fr.sess = new Set(); fr.base = fr.p; }
function frListen(){
  if (!fr || fr.finishing) return;
  const rec = new SR(); rec.lang = 'ar-SA'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
  fr.rec = rec; fr.base = fr.p; fr.sess = new Set(); fr.sessSaid = {}; const t0 = Date.now(); let got = false; const msg = $('fr-msg');
  rec.onstart = () => { if (msg) msg.textContent = ''; };
  rec.onresult = ev => {
    if (fr.rec !== rec) return; got = true;
    const R = [...ev.results], raws = R.map(r => r[0].transcript).join(' ').split(/\s+/).filter(w => norm(w)), words = raws.map(norm);
    const h = $('heard'); if (h) h.innerHTML = R.slice(-3).map(r => `<span class="${r.isFinal ? '' : 'interim'}">${esc(r[0].transcript)}</span>`).join(' ');
    const a = frAlign(fr.exp, fr.base, words, same, 4, raws); fr.p = a.p; fr.sess = new Set(a.miss); fr.sessSaid = Object.fromEntries(a.said); frPaint();
    if (fr.p >= fr.exp.length) frFinish('done');
  };
  rec.onerror = ev => { if (fr.rec !== rec || ev.error === 'no-speech' || ev.error === 'aborted') return; fr.fatal = ev.error; };
  rec.onend = () => {
    if (fr.rec !== rec || fr.finishing) return;
    frCommit(); fr.quick = !got && Date.now() - t0 < 1500 ? fr.quick + 1 : 0;
    if (fr.fatal || fr.quick >= 4){ if (msg) msg.textContent = micError(fr.fatal || 'audio-capture'); return frFinish('error'); }
    fr.timer = setTimeout(frListen, 250);   // le navigateur coupe l'écoute après un moment de silence : on la rouvre, sans rien perdre
  };
  try { rec.start(); } catch (e){ fr.fatal = e && e.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture'; if (msg) msg.textContent = micError(fr.fatal); frFinish('error'); }
}
function frHeard(w){ // ce que le téléphone a entendu à la place du mot attendu
  w = +w; const tok = fr.verses[frVerse(w)].tok[fr.meta[w].j], said = fr.sessSaid[w] || fr.said[w];
  const msg = fr.hint.has(w) ? tr("Mot attendu : {w}. Tu l'as vu grâce à l'indice.", {w: tok})
    : said === 'skip' ? tr("Mot attendu : {w}. Tu as passé ce verset : rien n'a été entendu.", {w: tok})
    : said && said.length ? tr('Mot attendu : {w}. Le téléphone a entendu : « {h} ».', {w: tok, h: said.join(' ')})
    : tr("Mot attendu : {w}. Le téléphone n'a rien entendu de reconnaissable à cet endroit.", {w: tok});
  const box = $('fr-heard-info'); if (box) box.textContent = msg;
}
function frHint(){ // révèle le prochain mot ; il compte comme « à revoir »
  if (!fr || fr.finishing || fr.p >= fr.exp.length) return; fr.hint.add(fr.p); frPaint();
}
function frSkip(){ // passe au verset suivant : les mots restants du verset sont « à revoir »
  if (!fr || fr.finishing) return; const v = fr.verses[frVerse(Math.min(fr.p, fr.exp.length - 1))];
  frCommit(); for (let w = fr.p; w < v.to; w++){ fr.miss.add(w); fr.said[w] = 'skip'; }
  fr.p = v.to; fr.base = v.to; if (fr.rec){ fr.rec.onend = null; fr.rec.onresult = null; try { fr.rec.abort(); } catch { /* déjà arrêté */ } fr.rec = null; }
  frPaint(); if (fr.p >= fr.exp.length) frFinish('done'); else { clearTimeout(fr.timer); fr.timer = setTimeout(frListen, 150); }
}
function frFinish(reason){
  if (!fr || fr.finishing) return; fr.finishing = true; fr.reason = reason; clearTimeout(fr.timer); clearTimeout(fr.cap); clearInterval(fr.tick); if (fr.t0) fr.dur = Math.round((Date.now() - fr.t0) / 1000);
  const rec = fr.rec, go = () => { if (!fr || fr.summarized) return; fr.summarized = true; clearTimeout(fr.grace); frSummary(); };
  if (!rec) return go();
  rec.onend = go; fr.grace = setTimeout(go, 1200); try { rec.stop(); } catch { go(); }   // on laisse le dernier résultat arriver avant le bilan
}
function frSummary(){
  if (fr.rec){ fr.rec.onend = null; try { fr.rec.abort(); } catch { /* déjà arrêté */ } fr.rec = null; }
  frCommit(); const mo = $('mic-on'); if (mo) mo.remove();
  const done = fr.verses.filter(v => v.from >= fr.start0 && v.to <= fr.p), clean = [], flagged = [];   // start0 : en reprise, les versets d'avant ne comptent pas
  for (const v of done){ const bad = []; for (let w = v.from; w < v.to; w++) if (fr.miss.has(w) || fr.hint.has(w)) bad.push(w); (bad.length ? flagged.push({v, bad}) : clean.push(v)); }
  fr.clean = clean; fr.flagged = flagged;
  const open0 = fr.p < fr.exp.length ? fr.verses[frVerse(fr.p)] : null;
  if (done.length){ store.set('tathbit.frLast', {t: Date.now(), n: done.length, c: clean.length}); frRemember(done, clean, flagged, open0); }   // tuile de l'accueil + historique par sourate
  if (fr.hide && clean.length && !fr.recorded){ // récités de mémoire, sans oubli : comptent dans la révision (une seule écriture pour tout)
    fr.recorded = true; const now = Date.now();
    for (const v of clean){ const k = v.s + ':' + v.a, [ok, ko] = stats[k] || [0, 0]; fr.undo[k] = {st: [ok, ko], sc: sched[k]}; stats[k] = [ok + 1, ko]; sched[k] = srsNext(sched[k], 1, now); }
    days[today()] = (days[today()] || 0) + clean.length; store.set('tathbit.stats', stats); store.set('tathbit.sched', sched); store.set('tathbit.days', days);
  }
  fr.done = done; frShowSummary();
}
function frShowSummary(){
  const done = fr.done, clean = fr.clean, flagged = fr.flagged;
  const title = {done: tr('Récitation terminée'), stop: tr('Bilan de ta récitation'), time: tr('Temps maximal atteint'), error: tr('Micro arrêté')}[fr.reason] || tr('Bilan de ta récitation');
  const open = fr.p < fr.exp.length ? fr.verses[frVerse(fr.p)] : null;
  const wtxt = f => f.v.tok.map((t, j) => { const wi = f.bad.find(w => fr.meta[w].j === j); return wi != null ? `<span class="fw miss" data-act="fr-heard" data-v="${wi}" role="button" tabindex="0">${esc(t)}</span>` : esc(t); }).join(' ');
  $app.innerHTML = `<div class="top"><button class="link" data-act="fr-quit">✕ ${tr('Quitter')}</button><span>${tr('Récitation libre')}</span></div>
    <h1 style="margin-top:8px">${title}</h1>
    <div class="card"><p style="margin:0 0 6px"><b>${trp(done.length, '{n} verset récité en entier|{n} versets récités en entier')}</b> · ${trp(clean.length, '{n} sans oubli|{n} sans oubli')}${flagged.length ? ' · ' + trp(flagged.length, '{n} à revoir|{n} à revoir') : ''}</p>
      ${fr.dur ? `<p class="ref" style="margin:0 0 6px">${tr('Durée : {d}', {d: mmss(fr.dur)})}</p>` : ''}
      ${open ? `<p class="ref" style="margin:0 0 6px">${tr('Verset en cours quand tu as terminé : {s}, verset {a}.', {s: SN(open.s), a: open.a})}</p>` : ''}
      ${fr.hide && clean.length ? `<p class="ref" style="margin:0 0 6px">${trp(clean.length, '{n} verset récité de mémoire sans oubli est compté dans ta révision.|{n} versets récités de mémoire sans oubli sont comptés dans ta révision.')}</p>` : ''}
      ${!done.length ? `<p class="ref" style="margin:0">${tr("Aucun verset n'a été suivi jusqu'au bout : vérifie le micro, parle près de l'appareil, et réessaie.")}</p>` : ''}
      <p class="ref" style="margin:6px 0 0">${tr("L'application suit les mots entendus : elle peut se tromper. Vérifie avec ton mushaf ou ton enseignant.")}</p></div>
    ${done.length ? `<div class="card"><h2>${tr('Vérifier mes voyelles')}</h2>
      <p class="ref" style="margin:0 0 8px">${tr("La reconnaissance vocale n'entend pas les voyelles. Compare ta récitation avec ton mushaf : touche les mots dont tu n'es pas sûr des voyelles, ou que tu as mal prononcés.")}</p>
      ${fr.vowSaved ? `<p class="ref" style="margin:0">✓ ${tr('Voyelles vérifiées')}</p>` : `<button data-act="fr-vow">${ic('pen')} ${tr('Vérifier mes voyelles')}</button>`}</div>` : ''}
    ${flagged.length ? `<div class="card"><h2>${tr('À revoir')}</h2><p class="ref" style="margin:0 0 6px">${tr("Rouge : mot non entendu ou sauté ; touche-le pour voir ce que le téléphone a entendu. Ce n'est pas forcément une faute : l'application n'entend pas les voyelles.")}</p><p class="ref" style="margin:0 0 6px;font-weight:600" id="fr-heard-info" role="status"></p>${flagged.map(f => `<div class="sib"><p class="ref" style="margin:0">${esc(SN(f.v.s))} · ${f.v.a}</p><div class="ar" dir="rtl" lang="ar" style="font-size:calc(1.4rem*var(--arz,1));line-height:2;margin:4px 0 0">${wtxt(f)}</div></div>`).join('')}
      <button style="margin-top:8px" data-act="fr-err" id="fr-err">${tr('Ajouter ces versets à mes erreurs')}</button><p class="ref" id="fr-errmsg" role="status" style="margin:6px 0 0"></p></div>` : ''}
    <button class="pri big" data-act="fr-again">${ic('mic')} ${tr('Réciter encore')}</button>
    <button class="big" style="margin-top:8px" data-act="fr-quit">${tr('Terminer')}</button>`;
  window.scrollTo(0, 0);
}
function frVowels(){ // autocontrôle : l'application n'entend pas les voyelles, c'est toi qui marques les mots douteux
  setNav(false);
  $app.innerHTML = `<div class="top"><button class="link" data-act="fr-vow-back">${tr('← Retour au bilan')}</button><span>${tr('Vérifier mes voyelles')}</span></div>
    <h1 style="margin-top:8px">${ic('pen')} ${tr('Vérifier mes voyelles')}</h1>
    <p class="sub">${tr("Touche les mots dont tu n'es pas sûr des voyelles, ou que tu as mal prononcés (touche encore pour annuler).")} ${tr('Les mots que tu marques passent en orange.')}</p>
    ${fr.done.map(v => { const vi = fr.verses.indexOf(v);
      return `<div class="card frvow"><p class="ref" style="margin:0">${esc(SN(v.s))} · ${v.a}</p><div class="ar" dir="rtl" lang="ar" style="font-size:${cfg.rdSize || 1.7}rem;line-height:2.2">${v.tok.map((t, j) => norm(t) ? `<span class="wd" data-act="fr-wd" data-v="${vi}:${j}">${esc(t)}</span>` : esc(t)).join(' ')}</div></div>`; }).join('')}
    <button class="pri big" id="fr-vow-go" data-act="fr-vow-save" style="position:sticky;bottom:calc(12px + env(safe-area-inset-bottom));z-index:15">${trp(0, 'Valider ({n} mot marqué)|Valider ({n} mots marqués)')}</button>`;
  window.scrollTo(0, 0);
}
function frVowelsSave(){ // les versets où des mots sont marqués : erreurs + révision espacée (un « sans oubli » déjà compté est corrigé)
  const marks = {}; document.querySelectorAll('.wd.bad').forEach(e => { const [vi, j] = e.dataset.v.split(':').map(Number); (marks[vi] ||= []).push(j); });
  const now = Date.now(); let n = 0;
  for (const [vi, js] of Object.entries(marks)){
    const v = fr.verses[vi], k = v.s + ':' + v.a;
    if (!fr.koDone.has(k)){
      const u = fr.undo[k]; if (u){ stats[k] = [u.st[0], u.st[1] + 1]; sched[k] = srsNext(u.sc, 0, now); delete fr.undo[k]; }   // verset compté « sans oubli » : on annule et on le compte à revoir
      else { const [ok, ko] = stats[k] || [0, 0]; stats[k] = [ok, ko + 1]; sched[k] = srsNext(sched[k], 0, now); }
      fr.koDone.add(k);
    }
    errors.push({t: now, k, m: 'free', sc: 0, bad: [...new Set(js.sort((a, b) => a - b).map(j => v.tok[j]))].slice(0, 40)}); n++;
  }
  if (errors.length > 2000) errors = errors.slice(-2000);
  store.set('tathbit.stats', stats); store.set('tathbit.sched', sched); store.set('tathbit.errors', errors);
  fr.vowSaved = true; fr.vowN = n; frShowSummary();
  const c = $app.querySelector('.card'); if (c) c.insertAdjacentHTML('beforeend', `<p class="ref" style="margin:6px 0 0" role="status">${n ? trp(n, '{n} verset avec des voyelles à revoir ajouté à tes erreurs.|{n} versets avec des voyelles à revoir ajoutés à tes erreurs.') : tr('Aucun mot marqué : rien à ajouter.')}</p>`);
}
function frErrors(){ // les versets à revoir entrent dans l'historique d'erreurs et dans la révision espacée
  if (!fr || !fr.flagged || fr.errAdded) return; fr.errAdded = true; const now = Date.now();
  for (const f of fr.flagged){ const k = f.v.s + ':' + f.v.a, [ok, ko] = stats[k] || [0, 0]; fr.koDone.add(k); stats[k] = [ok, ko + 1]; sched[k] = srsNext(sched[k], 0, now);
    errors.push({t: now, k, m: 'free', sc: 0, bad: [...new Set(f.bad.map(w => f.v.tok[fr.meta[w].j]))].slice(0, 40)}); }
  if (errors.length > 2000) errors = errors.slice(-2000);
  store.set('tathbit.stats', stats); store.set('tathbit.sched', sched); store.set('tathbit.errors', errors);
  const b = $('fr-err'); if (b) b.disabled = true; const m = $('fr-errmsg'); if (m) m.textContent = tr('Ajoutés à tes erreurs.');
}

/* ---------- écoute d'une portée ---------- */
function lsOpen(){
  if (cfg.scope.type === 'matn') return alert(tr("L'écoute audio est disponible pour le Coran."));
  const refs = buildPool(cfg.scope); if (!refs.length) return;
  ls = {refs, i: 0, hide: false}; lsPlay();
}
function lsPlay(){ lsRender(); playUrls([audioUrl(ls.refs[ls.i])], () => { if (ls && ls.i < ls.refs.length - 1){ ls.i++; lsPlay(); } else lsRender(); }); }
function lsRender(){
  setNav(false);
  const r = ls.refs[ls.i];
  $app.innerHTML = `
  <div class="top"><button class="link" data-act="home">✕ ${tr('Quitter')}</button><span>${ls.i + 1} / ${ls.refs.length}</span></div>
  <div class="bar"><i style="width:${100 * (ls.i + 1) / ls.refs.length}%"></i></div>
  <div class="card"><p class="ref">${rlabel(r)}</p>
    <div class="ar">${ls.hide ? '• • • • •' : esc(verse(r))}</div>
    <div class="grades"><button data-act="ls-prev">⏮</button><button data-act="ls-toggle">⏯</button><button data-act="ls-next">⏭</button>
    <button data-act="ls-hide">${ls.hide ? ic('eye') + ' ' + tr('Afficher') : ic('eyeoff') + ' ' + tr('Masquer le texte')}</button></div>
    <p class="ref" id="audio-msg">${tr("Récitateur : {r}. Masque le texte pour t'entraîner à suivre de mémoire.", {r: (RECITERS.find(x => x[0] === cfg.reciter) || RECITERS[0])[1]})}</p></div>`;
}

/* ---------- rappel quotidien : fichier .ics récurrent ---------- */
function exportIcs(){
  const [h, m] = ($('rtime').value || '20:00').split(':');
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const ymd = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  const url = location.protocol.startsWith('http') ? '\\n' + location.href : '';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tathbit//FR', 'BEGIN:VEVENT', 'UID:tathbit-rappel-quotidien',
    'DTSTAMP:' + ymd + 'T000000Z', `DTSTART:${ymd}T${p(h)}${p(m)}00`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY',
    'SUMMARY:' + tr('Révision du Coran (Tathbīt)'), 'DESCRIPTION:' + tr('Fais ta révision du jour.') + url,
    'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:' + tr('Révision du Coran'), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download('rappel-tathbit.ics', ics, 'text/calendar');
}
let IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let IS_STANDALONE = () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);   // application installée
let deferredInstall = null;   // invite d'installation proposée par Chrome/Android
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { deferredInstall = null; });
const IOS_APP = navigator.standalone === true; // application installée sur l'écran d'accueil de l'iPhone
async function download(name, text, type){
  if (IOS){ // iPhone/iPad : le téléchargement direct est peu fiable (surtout dans l'application installée) → feuille de partage
    try {
      const f = new File([text], name, {type});
      if (navigator.canShare && navigator.canShare({files: [f]})){ await navigator.share({files: [f], title: name}); return; }
    } catch (e){ if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; a.click();
}

/* A11Y:begin — contrastes WCAG 2.x (fonctions pures testées en Node) */
const a11yLum = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const a11yContrast = (a, b) => { const x = a11yLum(a), y = a11yLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function a11yHsl(hex){ const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l]; const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function a11yHex(h, s, l){ const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
function a11yDarken(hex, bg, min = 4.5){ // même teinte, plus sombre, jusqu'à atteindre le contraste demandé sur le fond bg
  let [h, s, l] = a11yHsl(hex), c = hex; while (a11yContrast(c, bg) < min && l > 0){ l = Math.max(0, l - 0.01); c = a11yHex(h, s, l); } return c;
}
/* A11Y:end */
const TJ_PAGE = '#fbf6e8';                                          // fond clair des textes colorés (.rd.tj)
const tjHcStyle = () => `:root{${TJLEG.map(([c, col]) => `--tjc-${c}:${a11yDarken(col, TJ_PAGE)}`).join(';')};--tjc-s:${a11yDarken('#AAAAAA', TJ_PAGE)};--tjc-b:${a11yDarken('#A1A1A1', TJ_PAGE)}}`;
function applyTheme(){ const t = cfg.theme === 'dark' || cfg.theme === 'light' ? cfg.theme : ''; if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
function applyA11y(){ // contraste renforcé des couleurs du tajwīd (réglage, ou préférence du système « plus de contraste »), motifs en plus des couleurs
  document.documentElement.classList.toggle('tjp', !!cfg.tjp);
  const on = cfg.hc !== undefined ? !!cfg.hc : !!(window.matchMedia && matchMedia('(prefers-contrast: more)').matches);
  let st = document.getElementById('tjhc'); if (on){ if (!st){ st = document.createElement('style'); st.id = 'tjhc'; document.head.appendChild(st); } st.textContent = tjHcStyle(); } else if (st) st.remove();
}
/* ---------- sauvegarde / restauration ---------- */
function exportData(){
  const compte = me ? {email: me.user.email, role: me.profile && me.profile.role, enseignants: tch.links, invitations: tch.invites, messages: tch.msgs, objectifs: tch.goals, consultations: tch.log, resume_hebdo: tch.wk} : undefined;   // données de compte enregistrées sur le serveur (droit d'accès)
  store.set('tathbit.lastExport', Date.now());
  download('tathbit-sauvegarde-' + today() + '.json', JSON.stringify({app: 'tathbit', v: 1, cfg, stats, sched, days, custom, errors, plan, compte}), 'application/json');
}
async function importFile(f){
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.app !== 'tathbit' || typeof d.stats !== 'object') throw new Error('format');
    if (!confirm(tr('Remplacer ta progression actuelle par cette sauvegarde ?'))) return;
    store.set('tathbit.cfg', d.cfg || {}); store.set('tathbit.stats', d.stats); store.set('tathbit.sched', d.sched || {});
    store.set('tathbit.days', d.days || {}); store.set('tathbit.custom', d.custom || []); store.set('tathbit.errors', d.errors || []); store.set('tathbit.plan', d.plan || null);
    location.reload();
  } catch { alert(tr('Fichier non reconnu : choisis une sauvegarde exportée depuis Tathbīt.')); }
}

/* OCRF:begin — lecture d'une page : ne garder que les vers (fonctions pures, testées en Node) */
const OCR_AR = /[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF]/g, OCR_DIG = /^[\s\d\u0660-\u0669\u06F0-\u06F9()\[\]{}.\-–—:،,؛;|*]+$/;
const ocrAr = s => (String(s).match(OCR_AR) || []).length;
const ocrMedian = a => { const b = a.slice().sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : 0; };
/* Ordonnée (en pixels) du filet qui sépare le texte des notes de bas de page : une rangée de pixels foncés sur au moins 22 % de la largeur, fine, dans la moitié basse. g = niveaux de gris, w × h. null s'il n'y en a pas. */
function ocrRuleY(g, w, h){
  const rows = [];
  for (let y = Math.floor(h * 0.35); y < h * 0.97; y++){
    let run = 0, best = 0; const o = y * w;
    for (let x = 0; x < w; x++){ if (g[o + x] < 130){ run++; if (run > best) best = run; } else run = 0; }
    if (best >= w * 0.22) rows.push(y);
  }
  if (!rows.length) return null;
  const groups = []; let s = rows[0], p = rows[0];
  for (let i = 1; i < rows.length; i++){ if (rows[i] - p > 2){ groups.push([s, p]); s = rows[i]; } p = rows[i]; }
  groups.push([s, p]);
  const f = groups.find(([a, b]) => b - a + 1 <= Math.max(10, h * 0.012));   // un filet est fin ; un bloc épais est du texte ou une image
  return f ? Math.round((f[0] + f[1]) / 2) : null;
}
/* lines : [{text, x0, y0, x1, y1, words?: [{text, x0, x1}]}] ; o : {notes: false pour tout garder, ruleY, pageH, sep: false pour de la prose, titles: false}.
   Écarte : les lignes sans texte arabe (numéros de page, mots latins), les notes (caractères nettement plus petits que ceux des vers, numéro d'appel « (1) », ligne entre parenthèses, sous le filet),
   les en-têtes (courtes lignes tout en haut de la page) et tout ce qui est en MARGE : à gauche ou à droite de la colonne des vers (mots ou lignes hors de la colonne).
   Les TITRES de chapitres (باب، فصل، كتاب، مقدمة، خاتمة) sont gardés, sur leur propre ligne précédée de « # ».
   Les deux hémistiches d'un vers (grand blanc au milieu de la ligne ; o.sep: false pour de la prose) sont séparés par « * ». Renvoie {text, kept, dropped: [{text, why}]}. */
function ocrFilter(lines, o = {}){
  const L = (lines || []).filter(l => l && typeof l.text === 'string'), kept = [], dropped = [], strict = o.notes !== false;
  const AR = L.filter(l => ocrAr(l.text) >= 2), drop = (text, why) => dropped.push({text: String(text).replace(/\s+/g, ' ').trim(), why});
  L.forEach(l => { if (ocrAr(l.text) < 2 && l.text.trim()) drop(l.text, 'num'); });
  const hs = AR.map(l => l.y1 - l.y0).filter(h => h > 0).sort((a, b) => b - a), H = hs.length ? ocrMedian(hs.slice(0, Math.max(1, Math.ceil(hs.length * 0.6)))) : 0;   // hauteur « normale » d'un vers : médiane des 60 % de lignes les plus hautes
  let below = new Set();
  if (strict && o.ruleY != null){ const b = AR.filter(l => l.y0 > o.ruleY), a = AR.length - b.length; if (b.length && a >= 2 && b.length <= 0.6 * a) below = new Set(b); }   // filet décoratif au milieu des vers : on ne coupe pas
  const flat = t => t.replace(/\s+/g, ' ').trim(), nWords = t => flat(t).split(' ').length;
  const isTitle = t => nWords(t) <= 6 && /^(ال)?(باب|فصل|كتاب|مقدمة|خاتمة)(\s|$)/.test(flat(t).replace(/^[#\s]+/, '').replace(/[\u064B-\u065F\u0670]/g, ''));   // titre de chapitre : il est gardé (« # titre »), car il range le matn en blocs
  const why = l => {   // pourquoi cette ligne n'est pas un vers (null : c'est un vers)
    const h = l.y1 - l.y0, t = flat(l.text), nw = nWords(t);
    if (o.pageH && l.y1 <= 0.08 * o.pageH && (nw <= 5 || (H > 0 && h < 0.85 * H))) return 'entete';       // titre courant tout en haut de la page
    if (H > 0 && h > 0 && h < 0.72 * H) return 'note';                                                   // petits caractères : note, commentaire, numéro de page
    if (below.has(l)) return 'note';                                                                     // sous le filet des notes
    if (/^[\(\[{]?\s*[\d\u0660-\u0669\u06F0-\u06F9]{1,3}\s*[\)\]}]/.test(t) && H > 0 && h < 0.9 * H) return 'note';   // numéro d'appel « (1) »
    if (/^[\(\[{«]/.test(t) && /[\)\]}»]\s*[.،]?$/.test(t) && H > 0 && h < 0.95 * H) return 'note';  // ligne entre parenthèses : renvoi, précision
    return null;
  };
  const verses = [], titles = new Set();
  for (const l of AR){ if (isTitle(l.text)){ titles.add(l); verses.push(l); continue; } const w = strict ? why(l) : null; if (w) drop(l.text, w); else verses.push(l); }
  // 1) mots isolés au bord d'une ligne : un vers a deux hémistiches d'au moins trois mots ; un ou deux mots séparés du reste par le plus grand blanc sont une note collée au vers (marge)
  const V = verses.map(l => {
    const h = l.y1 - l.y0; let words = null;
    if (!titles.has(l) && l.words && l.words.length >= 2) words = l.words.filter(w => w && String(w.text).trim()).sort((a, b) => (b.x0 + b.x1) - (a.x0 + a.x1));   // arabe : on lit de droite à gauche
    if (strict && words && words.length >= 5){
      for (let guard = 0; guard < 4 && words.length >= 5; guard++){
        const gaps = []; for (let i = 0; i + 1 < words.length; i++) gaps.push(words[i].x0 - words[i + 1].x1);
        const med = ocrMedian(gaps.filter(g => g > 0)), big = Math.max(...gaps), k = gaps.indexOf(big), right = k + 1, left = words.length - right;
        if (!(big > Math.max(0.4 * (h > 0 ? h : 20), 2.2 * med))) break;
        if (right <= 2 && left >= 4){ drop(words.slice(0, right).map(w => String(w.text).trim()).join(' '), 'marge'); words = words.slice(right); }
        else if (left <= 2 && right >= 4){ drop(words.slice(right).map(w => String(w.text).trim()).join(' '), 'marge'); words = words.slice(0, right); }
        else break;
      }
    }
    const x0 = words && words.length ? Math.min(...words.map(w => w.x0)) : l.x0, x1 = words && words.length ? Math.max(...words.map(w => w.x1)) : l.x1;
    return {l, words, x0, x1, h};
  });
  // 2) colonne des vers : bords médians des lignes de vers (sans les fragments de marge) ; une ligne ou des mots entièrement en dehors (à gauche ou à droite) sont des notes de marge
  let colL = null, colR = null, tol = 0;
  const body = V.filter(v => !titles.has(v.l));
  if (strict && body.length >= 3){
    colL = ocrMedian(body.map(v => v.x0)); colR = ocrMedian(body.map(v => v.x1));
    const hh = ocrMedian(body.map(v => v.h)); tol = Math.max(0.05 * (colR - colL), 0.6 * hh, 8);
    if (!(colR - colL > 4 * hh)) colL = colR = null;   // colonne trop étroite pour être fiable (texte très court) : pas de filtre de marge
  }
  const out = [];
  for (const v of V){
    const l = v.l, t = flat(l.text), h = v.h;
    if (titles.has(l)){ out.push('# ' + t.replace(/^[#\s]+/, '')); continue; }   // titre : ligne à part, sans séparateur
    if (colL != null && (v.x1 < colL - tol || v.x0 > colR + tol)){ drop(t, 'marge'); continue; }   // ligne entière dans la marge
    let words = v.words;
    if (words && colL != null){
      const inside = words.filter(w => { const c = (w.x0 + w.x1) / 2; return c >= colL - tol && c <= colR + tol; });
      if (inside.length < words.length){ drop(words.filter(w => !inside.includes(w)).map(w => String(w.text).trim()).join(' '), 'marge'); words = inside; }
    }
    let line = words ? words.map(w => String(w.text).trim()).join(' ') : t;
    if (words && words.length >= 4 && o.sep !== false){
      const gaps = []; for (let i = 0; i + 1 < words.length; i++) gaps.push(words[i].x0 - words[i + 1].x1);
      const med = ocrMedian(gaps.filter(g => g > 0)), big = Math.max(...gaps), thr = Math.max(0.4 * (h > 0 ? h : 20), 2.2 * med);   // le blanc entre hémistiches : au moins 2,2 fois l'espace entre deux mots, et 0,4 fois la hauteur de ligne
      if (big > thr && big > 0){ const k = gaps.indexOf(big); line = words.map((w, i) => String(w.text).trim() + (i === k ? ' *' : '')).join(' '); }
    }
    line = line.split(' ').filter(w => !OCR_DIG.test(w) || w === '*').join(' ').replace(/\s+/g, ' ').trim();   // numéros de vers en tête ou en fin, signes isolés
    if (ocrAr(line) >= 2) out.push(line);
  }
  return {text: out.join('\n'), kept: out, dropped};
}
/* OCRF:end */
/* ---------- import d'un matn depuis une photo, un PDF ou un fichier Word : tout est lu DANS le navigateur ---------- */
const loadScript = src => new Promise((res, rej) => {
  if (document.querySelector(`script[data-src="${src}"]`)) return res();
  const sc = document.createElement('script'); sc.src = src; sc.dataset.src = src; sc.onload = res; sc.onerror = () => rej(new Error(tr('Chargement impossible')));
  document.head.appendChild(sc);
});
const CM = {img: 15, doc: 20, txt: 2, pdfPages: 40, scanPages: 12, lines: 3000, queue: 15}; // limites : Mo, pages, lignes du matn, parties dans la liste
let cmQueue = [], cmHist = [];
const mb = n => (n / 1048576).toFixed(1);
const absUrl = p => new URL(p, location.href).href;
const cmStatus = (m, warn) => { const e = $('cm-status'); if (e){ e.textContent = m || ''; e.className = warn ? 'fb mid' : 'ref'; e.style.margin = warn ? '8px 0 0' : '6px 0 0'; e.style.whiteSpace = 'pre-line'; } };
let cmImported = false; // le texte vient d'un import : on rappelle de vérifier l'ordre avant d'enregistrer
const cmBusy = b => document.querySelectorAll('[data-act^="cm-"]').forEach(x => { x.disabled = b; });
const cleanText = t => t.replace(/[\u200e\u200f\ufeff]/g, '').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
async function imgToCanvas(file, max){
  let bmp;
  try { bmp = await createImageBitmap(file, {imageOrientation: 'from-image'}); }
  catch { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(tr("Impossible de lire l'image."))); im.src = URL.createObjectURL(file); }); }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, k = Math.min(1, max / Math.max(w, h));
  if (w * h > 80e6) throw new Error(tr('Image trop grande (plus de 80 millions de pixels) : réduis-la ou prends la photo plus loin.'));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
async function newOcr(){ // moteur de lecture de texte arabe (Tesseract), hébergé dans vendor/
  if (!window.Tesseract){ cmStatus(tr('Chargement du moteur de lecture (première fois seulement)…')); await loadScript('vendor/tesseract/tesseract.min.js'); }
  return Tesseract.createWorker('ara', 1, {
    workerPath: absUrl('vendor/tesseract/worker.min.js'), corePath: absUrl('vendor/tesseract/tesseract-core-lstm.wasm.js'), langPath: absUrl('vendor/tesseract'), gzip: true,
    logger: m => { if (m.status === 'recognizing text') cmStatus(tr('Lecture du texte… {p} %', {p: Math.round(m.progress * 100)})); else cmStatus(tr('Préparation…')); }
  });
}
function prepCanvas(c){ // photo : on efface les ombres et le fond inégal (division par le fond estimé sur une image réduite), le texte ressort plus nettement pour le moteur de lecture
  try {
    const w = c.width, h = c.height, k = Math.max(2, Math.round(Math.max(w, h) / 90)), sm = document.createElement('canvas');
    sm.width = Math.max(1, Math.round(w / k)); sm.height = Math.max(1, Math.round(h / k)); sm.getContext('2d').drawImage(c, 0, 0, sm.width, sm.height);
    const bg = document.createElement('canvas'); bg.width = w; bg.height = h; const bx = bg.getContext('2d'); bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = 'high'; bx.drawImage(sm, 0, 0, w, h);
    const a = c.getContext('2d').getImageData(0, 0, w, h), b = bx.getImageData(0, 0, w, h), A = a.data, B = b.data;
    for (let i = 0; i < A.length; i += 4){
      const g = 0.299 * A[i] + 0.587 * A[i + 1] + 0.114 * A[i + 2], f = 0.299 * B[i] + 0.587 * B[i + 1] + 0.114 * B[i + 2] + 8, v = Math.max(0, Math.min(255, 255 * g / (f * 1.05)));
      A[i] = A[i + 1] = A[i + 2] = v < 90 ? v * 0.7 : v;   // le texte s'assombrit un peu, le papier reste blanc
    }
    const o = document.createElement('canvas'); o.width = w; o.height = h; o.getContext('2d').putImageData(a, 0, 0); return o;
  } catch { return c; }   // mémoire insuffisante : on lit l'image telle quelle
}
function ocrGray(c){ // image réduite en niveaux de gris, pour repérer le filet des notes
  const k = Math.min(1, 1100 / c.width), w = Math.max(1, Math.round(c.width * k)), h = Math.max(1, Math.round(c.height * k)), s = document.createElement('canvas'); s.width = w; s.height = h;
  const x = s.getContext('2d'); x.drawImage(c, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = d[i * 4];
  return {g, w, h, k};
}
const cmOpt = () => ({notes: !$('cm-notes') || $('cm-notes').checked, sep: !$('cm-kind') || $('cm-kind').value !== 'prose'});   // « * » entre les hémistiches seulement pour un poème
let cmIgnored = [];   // lignes écartées pendant la lecture (affichées pour vérification)
async function ocrCanvas(w, canvas, label){ // lit une page et ne garde que les vers
  const data = (await w.recognize(canvas)).data, o = cmOpt();
  const lines = (data.lines || []).map(l => ({text: l.text || '', x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1, words: (l.words || []).map(x => ({text: x.text, x0: x.bbox.x0, x1: x.bbox.x1}))}));   // coordonnées de la page
  if (!lines.length) return data.text || '';
  let ruleY = null; if (o.notes){ const r = ocrGray(canvas), y = ocrRuleY(r.g, r.w, r.h); if (y != null) ruleY = y / r.k; }
  const f = ocrFilter(lines, {notes: o.notes, ruleY, sep: o.sep, pageH: canvas.height});
  f.dropped.forEach(d => cmIgnored.push({...d, from: label || ''}));
  return f.text;
}
async function ocrImage(file, label){
  const canvas = prepCanvas(await imgToCanvas(file, 2400)), w = await newOcr();
  try { return await ocrCanvas(w, canvas, label); } finally { await w.terminate(); }
}
async function readPdf(file){
  if (!window.pdfjsLib){ cmStatus(tr('Chargement du lecteur PDF…')); await loadScript('vendor/pdfjs/pdf.min.js'); pdfjsLib.GlobalWorkerOptions.workerSrc = absUrl('vendor/pdfjs/pdf.worker.min.js'); }
  const pdf = await pdfjsLib.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise;
  const a = Math.max(1, +($('cm-p1') && $('cm-p1').value) || 1), b = Math.min(pdf.numPages, +($('cm-p2') && $('cm-p2').value) || pdf.numPages), cnt = b - a + 1, pages = [];
  if (cnt < 1) throw new Error(tr('Plage de pages invalide.'));
  if (cnt > CM.pdfPages) throw new Error(tr("Ce PDF a {n} pages à lire (maximum {m} à la fois). Indique les pages à lire (ex. de 1 à {m}) ou découpe le PDF, puis ajoute la suite dans l'ordre.", {n: cnt, m: CM.pdfPages}));
  for (let i = a; i <= b; i++){
    cmStatus(tr('Lecture de la page {a} / {b}…', {a: i, b}));
    const tc = await (await pdf.getPage(i)).getTextContent(), lines = []; let line = '', lastY = null;
    for (const it of tc.items){
      if (!('str' in it)) continue;
      const y = it.transform[5]; if (lastY !== null && Math.abs(y - lastY) > 3){ lines.push(line); line = ''; }
      line += (line && !line.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str; lastY = y;
      if (it.hasEOL){ lines.push(line); line = ''; lastY = null; }
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }
  let text = pages.join('\n');
  if (text.replace(/\s/g, '').length < 30){ // PDF scanné (sans texte) : on lit les images des pages
    if (cnt > CM.scanPages) throw new Error(tr("Ce PDF est un scan de {n} pages (maximum {m} à la fois). Indique les pages à lire (ex. de 1 à {m}) ou découpe le PDF, puis ajoute la suite dans l'ordre.", {n: cnt, m: CM.scanPages}));
    const w = await newOcr(), all = [];
    try {
      for (let i = a; i <= b; i++){
        cmStatus(tr('Lecture de la page {a} / {b} (image)…', {a: i, b}));
        const page = await pdf.getPage(i), vp = page.getViewport({scale: 2.2}), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        await page.render({canvasContext: c.getContext('2d'), viewport: vp}).promise; all.push(await ocrCanvas(w, prepCanvas(c), tr('Page {n}', {n: i})));
      }
    } finally { await w.terminate(); }
    text = all.join('\n');
  }
  return text;
}
async function readDocx(file){ // un .docx est une archive ZIP : on lit word/document.xml sans bibliothèque
  const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer);
  let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error(tr('Fichier Word illisible.'));
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true), entry = null;
  for (let i = 0; i < n && dv.getUint32(p, true) === 0x02014b50; i++){
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    if (new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl)) === 'word/document.xml') entry = {method, csize, usize, off};
    p += 46 + nl + xl + cl;
  }
  if (!entry) throw new Error(tr('Fichier Word illisible.'));
  if (entry.usize > 40 * 1048576) throw new Error(tr('Ce fichier Word contient trop de texte : découpe-le en plusieurs fichiers et ajoute-les dans l\'ordre.'));
  const lh = entry.off, start = lh + 30 + dv.getUint16(lh + 26, true) + dv.getUint16(lh + 28, true), raw = buf.subarray(start, start + entry.csize);
  let xml;
  if (entry.method === 0) xml = new TextDecoder().decode(raw);
  else {
    if (!('DecompressionStream' in window)) throw new Error(tr('Ton navigateur ne peut pas ouvrir ce fichier Word : mets-le à jour ou utilise un PDF.'));
    xml = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  const doc = new DOMParser().parseFromString(xml, 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const ptext = para => [...para.getElementsByTagNameNS(W, '*')].filter(x => ['t', 'tab', 'br'].includes(x.localName)).map(x => x.localName === 't' ? x.textContent : x.localName === 'tab' ? ' ' : '\n').join('');
  const lines = [], body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error(tr('Fichier Word illisible.'));
  for (const ch of body.children){
    if (ch.localName === 'p') lines.push(ptext(ch));
    else if (ch.localName === 'tbl') for (const row of ch.getElementsByTagNameNS(W, 'tr')){ // tableau à deux colonnes = vers à deux moitiés
      const cells = [...row.children].filter(x => x.localName === 'tc').map(tc => [...tc.getElementsByTagNameNS(W, 'p')].map(ptext).join(' ').trim()).filter(Boolean);
      lines.push(cells.join(cells.length === 2 ? ' * ' : ' '));
    }
  }
  return lines.join('\n');
}
const fileKind = f => { const n = f.name || '', t = f.type || '';
  return t.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(n) ? 'img' : t === 'application/pdf' || /\.pdf$/i.test(n) ? 'pdf'
    : /\.docx$/i.test(n) || t.includes('wordprocessingml') ? 'docx' : /\.doc$/i.test(n) ? 'doc' : t.startsWith('text/') || /\.txt$/i.test(n) ? 'txt' : null; };
const cmName = f => f.name || tr('photo');
const cmLabels = () => { let n = 0; return new Map(cmQueue.map(f => [f, fileKind(f) === 'img' ? tr('Image {n}', {n: ++n}) : cmName(f)])); };   // les photos s'appellent « Image 1, Image 2… » dans l'ordre de la liste (l'appareil photo donne le même nom à chacune)
function queueAdd(files){ // on ajoute les parties à une liste ordonnée : elles seront lues l'une après l'autre
  const msgs = [];
  for (const f of files){
    const k = fileKind(f);
    if (!k){ msgs.push(`${cmName(f)} : ${tr('Type de fichier non pris en charge.')}`); continue; }
    if (k === 'doc'){ msgs.push(`${cmName(f)} : ${tr("Le format .doc (ancien Word) n'est pas pris en charge : enregistre le fichier en .docx ou en PDF.")}`); continue; }
    const lim = k === 'img' ? CM.img : k === 'txt' ? CM.txt : CM.doc;
    if (f.size > lim * 1048576){ msgs.push(`${cmName(f)} : ${tr("Fichier trop volumineux ({s} Mo, maximum {m} Mo). Découpe-le en plusieurs fichiers (ou prends plusieurs photos) et ajoute-les dans l'ordre du texte : chaque partie est ajoutée à la suite.", {s: mb(f.size), m: lim})}`); continue; }
    if (cmQueue.length >= CM.queue){ msgs.push(tr('La liste est pleine ({m} parties maximum) : lis-les d\'abord.', {m: CM.queue})); break; }
    cmQueue.push(f);
  }
  renderQueue(); cmStatus(msgs.join(' '));
}
function queueHtml(){
  if (!cmQueue.length) return '';
  const lab = cmLabels();
  const b = (act, i, label, txt) => `<button type="button" class="link" data-act="${act}" data-v="${i}" aria-label="${label}">${txt}</button>`;
  return `<p class="ref" style="margin:8px 0 4px"><b>${tr("Parties à lire, dans l'ordre")}</b></p>` + cmQueue.map((f, i) =>
    `<div class="weak" style="align-items:center"><span>${i + 1}. ${esc(lab.get(f))} <span class="ref">(${mb(f.size)} ${tr('Mo')})</span></span><span>${b('cm-up', i, tr('Monter'), '↑')}${b('cm-down', i, tr('Descendre'), '↓')}${b('cm-rm', i, tr('Retirer'), '✕')}</span></div>`).join('')
    + `<div class="row" style="margin-top:8px"><button type="button" class="pri" data-act="cm-run">${tr("Lire ces parties dans l'ordre")}</button><button type="button" data-act="cm-qclear">${tr('Vider la liste')}</button></div>`;
}
function renderQueue(){ const el = $('cm-queue'); if (el) el.innerHTML = queueHtml(); }
async function extractText(f, label){
  const k = fileKind(f);
  const text = k === 'img' ? await ocrImage(f, label) : k === 'pdf' ? await readPdf(f) : k === 'docx' ? await readDocx(f) : await f.text();
  const t = cleanText(text);
  if (!t) throw new Error(tr('Aucun texte trouvé dans ce fichier.'));
  return t;
}
function appendMatnText(text, name){   // name : nom du fichier pour proposer un titre (jamais pour une photo : l'appareil les nomme toutes « image ») // ajoute la partie à la suite du texte, dans l'ordre
  const ta = $('cm-text'), old = ta.value.trim(), have = old ? old.split('\n').length : 0, add = text.split('\n').length;
  if (have + add > CM.lines) throw new Error(tr('Ce matn devient trop long ({n} lignes, maximum {m}). Enregistre-le, puis crée un second matn pour la suite.', {n: have + add, m: CM.lines}));
  cmHist.push(ta.value); if (cmHist.length > 30) cmHist.shift();
  cmImported = true;
  ta.value = (old ? old + '\n' : '') + text;
  const ti = $('cm-title'); if (ti && !ti.value.trim() && name) ti.value = name.replace(/\.[^.]+$/, '');
  return {add, total: have + add};
}
async function runQueue(){
  if (!cmQueue.length) return;
  const n0 = cmQueue.length; let done = 0, last = null; const lab = cmLabels(); cmIgnored = [];
  cmBusy(true);
  try {
    while (cmQueue.length){
      const f = cmQueue[0], nm = lab.get(f);
      cmStatus(tr('Partie {i} / {n} : {name}…', {i: done + 1, n: n0, name: nm}));
      try { last = appendMatnText(await extractText(f, nm), fileKind(f) === 'img' ? '' : f.name); }
      catch (e){ cmStatus(tr("Import arrêté à « {name} » : {msg}", {name: nm, msg: e && e.message ? e.message : tr('Lecture impossible.')}) + (done ? ' ' + tr('Les parties précédentes ont été ajoutées.') : '')); return; }
      cmQueue.shift(); done++; renderQueue();
    }
    cmStatus(tr("Texte lu : vérifie-le et corrige-le avant d'enregistrer.") + (last ? ' ' + trp(last.total, '{n} ligne au total.|{n} lignes au total.') : '')
      + '\n⚠️ ' + tr("Vérifie que le texte est bien dans l'ordre du matn, de la première à la dernière ligne, surtout entre les parties importées : rien ne doit manquer ni se répéter."), true);
  } finally { cmBusy(false); renderQueue(); renderIgnored(); }
}
function renderIgnored(){ // ce que la lecture a écarté, pour que la personne puisse vérifier (et recopier une ligne écartée à tort)
  const el = $('cm-ignored'); if (!el) return;
  if (!cmIgnored.length){ el.innerHTML = ''; return; }
  const why = {note: tr('note'), num: tr('numéro ou texte non arabe'), entete: tr('en-tête'), marge: tr('note de marge')};
  el.innerHTML = `<details class="card" style="margin:8px 0 0"><summary>${trp(cmIgnored.length, '{n} ligne ignorée (notes, numéros)|{n} lignes ignorées (notes, numéros)')}</summary>
    ${cmIgnored.slice(0, 80).map(d => `<p class="ref" style="margin:6px 0 0"><b>${esc(d.from)}</b> · ${why[d.why] || ''}<br><span class="ar" dir="rtl" lang="ar" style="font-size:1.05rem;display:block;line-height:1.7;padding:0">${esc(d.text)}</span></p>`).join('')}
    <p class="ref" style="margin:8px 0 0">${tr("Si une ligne de vers a été écartée à tort, décoche « Ignorer les notes… » et relis la photo, ou recopie-la dans le texte.")}</p></details>`;
}

/* ---------- mes moutoun ---------- */
function cmVerse(l, kind){ // une ligne de texte -> un vers {t, m} (m : nombre de mots de la première moitié)
  if (kind === 'poem'){
    const parts = l.split(/\s*(?:\*|\/\/|\\\\)\s*/).map(x => x.trim()).filter(Boolean);
    if (parts.length >= 2){ const h2 = parts.slice(1).join(' '); return {t: (parts[0] + ' ' + h2).replace(/\s+/g, ' '), m: parts[0].split(/\s+/).length}; }
  }
  const w = l.split(/\s+/); return {t: w.join(' '), m: splitPoint(w)};
}
function addCustom(){
  const title = $('cm-title').value.trim(), kind = $('cm-kind').value;
  const lines = $('cm-text').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!title || !lines.length) return alert(tr('Indique un titre et colle le texte.'));
  if (!confirm(cmImported ? tr('Tu as importé ce texte depuis des fichiers ou des photos : as-tu vérifié que les vers sont dans le bon ordre ?') : tr("Avant d'enregistrer : as-tu vérifié que les vers sont dans l'ordre du matn, sans oubli ni répétition ?"))) return;
  cmImported = false;
  const a = [], sec = []; let pend = '';
  for (const l0 of lines){   // une ligne « # titre » (ou un titre court « باب… » sans séparateur) ouvre un bloc du matn ; elle n'est pas un vers
    const tl = /^#/.test(l0) ? l0.replace(/^[#\s]+/, '') : (kind === 'poem' && l0.split(/\s+/).length <= 4 && !/\*|\/\/|\\\\/.test(l0) && /^(ال)?(باب|فصل|كتاب|مقدمة|خاتمة)(\s|$)/.test(l0.replace(/[\u064B-\u065F\u0670]/g, ''))) ? l0 : '';
    if (tl){ pend = pend ? pend + ' — ' + tl : tl; continue; }
    if (pend){ if (!sec.length && a.length) sec.push({ar: 'البداية', fr: 'Début', from: 1}); sec.push({ar: pend, fr: pend, from: a.length + 1}); pend = ''; }
    a.push(cmVerse(l0, kind));
  }
  if (!a.length) return alert(tr('Indique un titre et colle le texte.'));
  const t = {id: 'u' + Date.now().toString(36), ar: title, fr: title, author: '', kind, unit: kind === 'poem' ? 'vers' : 'passage',
    source: {name: 'Saisi par toi', url: '', note: 'texte que tu as fourni : fais confiance à ton édition de référence'}, a, custom: true};
  if (sec.length) t.sec = sec;
  custom.push(t); store.set('tathbit.custom', custom); MT[t.id] = t;
  cfg.scope = {type: 'matn', id: t.id}; saveCfg(); home();
}

