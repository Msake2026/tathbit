/* Tathbīt — Écrans des onglets : accueil, navigation, installation, plan, réviser, progrès, réglages.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- écran d'accueil ---------- */
const MODES = [
  ['mix',    'Mélange',            'Tous les exercices'],
  ['next',   'Verset suivant',     'Donne la suite du verset'],
  ['cloze',  'Mots manquants',     'Complète le verset'],
  ['which',  'Quelle sourate ?',   'Identifie d\'où vient le verset'],
  ['mcq',    'Suite en QCM',       'Choisis le bon verset suivant'],
  ['mutash', 'Versets proches',    'Ne confonds pas les versets qui se ressemblent', 'q'],
  ['mwhich', 'Versets proches : quelle sourate ?', 'Retrouve la sourate d\'un verset qui ressemble à d\'autres', 'q'],
  ['start',  'Début de sourate',   'Récite le premier verset', 'q'],
  ['order',  'Ordre des sourates', 'Quelle sourate vient après ?', 'q'],
  ['end',    'Fin de sourate',     'Récite les derniers versets', 'q'],
  ['link',   'Fin + début suivant','Enchaîne la fin d\'une sourate et le début de la suivante', 'q'],
  ['tajweed','Tajwīd (entraînement)','Plusieurs types de questions : règle, couleurs, vrai ou faux', 'q'],
  ['makharij','Makhārij (points de sortie)','Reconnais d\'où sortent les lettres'],
  ['sifat',  'Ṣifāt (qualités des lettres)','Reconnais les qualités des lettres'],
  ['ahkam',  'Aḥkām (nūn, mīm, tanwīn)','Idhhār, idghām, iqlāb, ikhfāʾ…'],
  ['madd',   'Madd (prolongations)','Reconnais le type de madd'],
  ['cont',   'Récitation continue','Un passage entier d\'une traite'],
  ['half',   'Demi-vers',          'Complète la 2e moitié', 'm'],
  ['phrase', 'Phrase suivante',    'Prose : complète la phrase suivante', 'm']
];
function opts(n, sel){ let h = ''; for (let i = 1; i <= n; i++) h += `<option value="${i}" ${i === sel ? 'selected' : ''}>${i}</option>`; return h; }
function surahOpts(sel){ return Q.map(s => `<option value="${s.n}" ${s.n === sel ? 'selected' : ''}>${s.n}. ${SN(s.n)}</option>`).join(''); }
function srcNote(sc){
  const L = (sc.id === 'all' ? Object.values(MT) : [MT[sc.id]]).filter(Boolean);
  return L.map(t => `<p class="ref" style="margin:8px 0 0"><b>${esc(MN(t.id))}</b>${t.author ? ` (${esc(tr(t.author))})` : ''} — ${tr('source')} : ${t.source.url
    ? `<a href="${t.source.url}" target="_blank" rel="noopener">${esc(tr(t.source.name))}</a>` : esc(tr(t.source.name))}. ${esc(tr(t.source.note))}.${t.custom
    ? ` <button class="link" data-act="delcustom" data-v="${t.id}">${tr('Supprimer')}</button>` : ''}</p>`).join('');
}

/* progression par sourate / page / matn */
function levelOf(e, len){
  if (!e) return 0;
  const m = (e.ok / ((e.ok + e.ko) || 1)) * (e.seen / len);
  return m < .15 ? 1 : m < .4 ? 2 : m < .7 ? 3 : 4;
}
function mapHtml(){
  const by = {}; // id -> {seen, ok, ko}
  for (const [k, [ok, ko]] of Object.entries(stats)){
    const r = pk(k); if (!book(r.s)) continue;
    const id = cfg.map === 'p' ? (isQ(r.s) ? Q[r.s-1].a[r.a-1].p : null) : cfg.map === 's' ? (isQ(r.s) ? r.s : null) : (isQ(r.s) ? null : r.s);
    if (id === null) continue;
    const e = (by[id] ||= {seen: 0, ok: 0, ko: 0}); e.seen++; e.ok += ok; e.ko += ko;
  }
  const tabs = `<div class="seg" style="margin-bottom:10px">${[['s', 'Sourates'], ['p', 'Pages'], ['m', 'Moutoun']]
    .map(([k, t]) => `<button class="${cfg.map === k ? 'sel' : ''}" data-act="maptab" data-v="${k}">${tr(t)}</button>`).join('')}</div>`;
  let body;
  if (cfg.map === 's') body = Q.map(S => { const lv = levelOf(by[S.n], S.a.length), e = by[S.n];
    return `<button class="cell named l${lv}" data-act="cell" data-v="${S.n}" title="${S.n}. ${SN(S.n)}${e ? ' · ' + Math.round(100 * e.ok / (e.ok + e.ko)) + ' % · ' + e.seen + '/' + S.a.length + ' ' + tr('versets vus') : ''}"><b>${S.n}</b><small>${esc(SN(S.n))}</small></button>`; }).join('');
  else if (cfg.map === 'p') body = Array.from({length: 30}, (_, j) => {
    const ps = Array.from({length: 604}, (_, i) => i + 1).filter(p => PAGE_JUZ[p] === j + 1);
    return `<div class="juzhead">${tr("Juz' {a}", {a: j + 1})}</div>` + ps.map(p => { const lv = levelOf(by[p], PAGE_LEN[p] || 1), e = by[p];
      return `<button class="cell pg l${lv}" data-act="pcell" data-v="${p}" title="${tr('page {p}', {p})}${e ? ' · ' + Math.round(100 * e.ok / (e.ok + e.ko)) + ' %' : ''}">${p}</button>`; }).join(''); }).join('');
  else body = Object.values(MT).map(t => { const e = by[t.id], lv = levelOf(e, t.a.length);
    return `<div class="weak" style="width:100%"><span>${esc(MN(t.id))}</span><span>${e ? Math.round(100 * e.ok / (e.ok + e.ko)) + ' % · ' + e.seen + '/' + t.a.length : tr('pas commencé')}</span></div>`; }).join('');
  return `${tabs}<div class="grid${cfg.map === 's' ? ' named' : ''}">${body}</div>
    <div class="legend">${tr('pas vu')} <i class="cell" style="width:14px;height:14px"></i><i class="cell l1" style="width:14px;height:14px"></i><i class="cell l2" style="width:14px;height:14px"></i><i class="cell l3" style="width:14px;height:14px"></i><i class="cell l4" style="width:14px;height:14px"></i> ${tr('maîtrisé')}</div>
    <p class="ref" style="margin:4px 0 0">${tr('Maîtrise = réussite × part des versets déjà vus.')}${cfg.map === 'm' ? '' : ' ' + tr('Touche une case pour réviser.')}</p>`;
}
function weekHtml(){
  const out = []; let tot = 0, act = 0;
  for (let i = 6; i >= 0; i--){ const d = new Date(); d.setDate(d.getDate() - i); const n = days[today(d)] || 0; tot += n; if (n) act++; out.push([d.toLocaleDateString(LOCALE(), {weekday: 'narrow'}), n]); }
  const mx = Math.max(cfg.goal, ...out.map(x => x[1]));
  return `<div class="week">${out.map(([l, n]) => `<div title="${trp(n, '{n} réponse|{n} réponses')}"><i style="height:${Math.round(70 * n / mx)}px"></i>${l}</div>`).join('')}</div>
    <p class="ref" style="margin:4px 0 0">${tr('7 derniers jours')} : ${trp(tot, '{n} réponse|{n} réponses')}, ${trp(act, '{n} jour actif|{n} jours actifs')}.</p>`;
}

/* ---------- navigation : menu en bas, un écran à la fois ---------- */
const BASE_TABS = [
  ['home', 'Accueil', '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'],
  ['plan', 'Plan', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M9 16l2 2 4-4"/>'],
  ['train', 'Réviser', '<path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z"/><path d="M12 6.5v13"/>'],
  ['progress', 'Progrès', '<path d="M5 20V11M12 20V4M19 20v-6"/>'],
  ['errors', 'Erreurs', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  ['settings', 'Réglages', '<path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>']
];
const TAB_STUDENT = ['student', 'Élève', '<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/>'];
const TAB_TEACHER = ['teacher', 'Enseignant', '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 6h5M16 10h5M16 14h5"/>'];
// Qui est la personne ? administrateur, enseignant (rôle donné par l'admin), élève (au moins un enseignant, message ou objectif), sinon simple utilisateur.
// L'onglet Élève n'apparaît que pour un élève, l'onglet Enseignant que pour un enseignant ; un simple utilisateur n'a ni l'un ni l'autre (ses invitations sont dans Mon compte).
// Mention affichée près de tout texte d'explication écrit par l'IA qui a développé l'application : ce n'est pas une source officielle
const AI = () => `<span class="ai" role="note">🤖 ${tr('Texte rédigé par une IA, pas une source officielle')}</span>`;
const stuKey = () => 'tathbit.stu.' + (me ? me.user.id : '');
const isStudent = () => !!me && !isAdmin() && (tch.loaded ? !!((tch.links || []).length || (tch.msgs || []).length || (tch.goals || []).length) : !!store.get(stuKey(), false));
const hasStudentTab = () => cloudOn() && !!me && !isAdmin() && (isStudent() || (cfg.tab === 'student' && !tch.loaded));
const hasTeacherTab = () => cloudOn() && !!me && isTeacher();
const profileRoles = () => !me ? [] : isAdmin() ? [['admin', 'Administrateur']] : [...(isTeacher() ? [['teacher', 'Enseignant']] : []), ...(isStudent() ? [['student', 'Élève']] : []), ...(!isTeacher() && !isStudent() ? [['user', 'Utilisateur']] : [])];
const roleChips = () => profileRoles().map(([k, t]) => `<span class="chip role-${k}">${tr(t)}</span>`).join(' ');
const unreadStudent = () => (tch.msgs || []).filter(m => !m.from_student && !m.read_at).length;
const unreadTeacher = () => Object.values(tch.unread || {}).reduce((a, b) => a + b, 0);
const tabsNow = () => [...BASE_TABS.slice(0, 5), ...(hasStudentTab() ? [TAB_STUDENT] : []), ...(hasTeacherTab() ? [TAB_TEACHER] : []), BASE_TABS[5]];
function setNav(on){
  const n = $('nav'); n.hidden = !on; document.body.classList.toggle('has-nav', on); screen = on ? 'tab' : 'full'; queueMicrotask(bellSync);
  if (!on) return;
  const due = dueRefs().length;
  n.innerHTML = `<div class="in">${tabsNow().map(([id, t, ico]) => `<button class="${cfg.tab === id ? 'sel' : ''}" ${cfg.tab === id ? 'aria-current="page"' : ''} data-act="tab" data-v="${id}" aria-label="${tr(t)}"${cfg.tab === id ? ' aria-current="page"' : ''}>
    <svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg>${tr(t)}${id === 'home' && due ? `<span class="badge">${due > 99 ? '99+' : due}</span>` : ''}${id === 'student' && unreadStudent() ? `<span class="badge">${unreadStudent()}</span>` : ''}${id === 'teacher' && unreadTeacher() ? `<span class="badge">${unreadTeacher()}</span>` : ''}</button>`).join('')}</div>`;
}
const scopeLabel = sc => sc.type === 'matn' ? (sc.id === 'all' ? tr('Tous les moutoun') : (MT[sc.id] ? MN(sc.id) + (sc.sec != null && MT[sc.id].sec && MT[sc.id].sec[sc.sec] ? ' · ' + secName(MT[sc.id].sec[sc.sec]) : '') : tr('Matn')))
  : sc.type === 'all' ? tr('Tout le Coran')
  : sc.type === 'surah' ? (sc.from === sc.to ? tr('Sourate {n} · {name}', {n: sc.from, name: SN(sc.from)}) : tr('Sourates {a} {an} → {b} {bn}', {a: sc.from, an: SN(sc.from), b: sc.to, bn: SN(sc.to)}))
  : sc.type === 'juz' ? (sc.from === sc.to ? tr("Juz' {a}", {a: sc.from}) : tr("Juz' {a}–{b}", {a: sc.from, b: sc.to}))
  : (sc.from === sc.to ? tr('Page {a}', {a: sc.from}) : tr('Pages {a}–{b}', {a: sc.from, b: sc.to}));
const modeTitle = id => id === 'free' ? tr('Récitation libre') : tr((MODES.find(m => m[0] === id) || [])[1] || id);
const INPUTS = {recite: 'je récite', type: 'je tape', voice: 'à voix haute'};

let pendingGo = null;   // fonction à ouvrir après la connexion (lien d'un e-mail de nouveautés)
const GO_HASH = /^#go=([a-z]+)$/.exec(location.hash || '');   // lien d'un e-mail de nouveautés : https://…/tathbit/#go=recite
if (GO_HASH){ pendingGo = GO_HASH[1]; try { history.replaceState(null, '', location.pathname + location.search); } catch { /* sans effet */ } }
function home(){ // affiche l'écran du menu courant (accès réservé aux comptes connectés quand les comptes sont activés)
  stopAudio(); ls = null;
  if (cloudOn() && !authReady) return renderLoading();
  if (cloudOn() && !me) return renderAccount();
  if (cfg.tab === 'home' && welcomeNeeded()) return renderWelcome();
  if (!tabsNow().some(t => t[0] === cfg.tab)) cfg.tab = 'home';
  $app.innerHTML = ({home: tabHome, plan: tabPlan, train: tabTrain, progress: tabProgress, errors: tabErrors, settings: tabSettings, student: tabStudent, teacher: tabTeacher})[cfg.tab]();
  setNav(true); tchEnter(); chatBottom(); if (cfg.tab === 'settings') setTimeout(audioSpace, 0);
  if (pendingGo){ const g = pendingGo; pendingGo = null; setTimeout(() => newsGo(g), 0); }
  $app.querySelectorAll('select').forEach(el => { if (el.id.startsWith('cm-')) return;
    el.onchange = () => { syncCfg(); if (['stype', 'smatn', 'ssec', 'sgoal', 'scat', 'srec', 'aud-from', 'aud-to', 'aud-cap', 'aud-q'].includes(el.id) || el.id.startsWith('pf-')) home(); }; });
  ['pf-recent-n', 'pf-cycle-n'].forEach(id => { if ($(id)) $(id).oninput = () => { pdraft = pfRead(); }; });
  { const sq = $('set-q'); if (sq) sq.oninput = () => { setQ = sq.value; const pos = sq.selectionStart; home(); const n = $('set-q'); if (n){ n.focus(); n.setSelectionRange(pos, pos); } }; }
  if ($('impfile')) $('impfile').onchange = e => importFile(e.target.files[0]);
  ['cm-f-cam', 'cm-f-img', 'cm-f-doc'].forEach(id => { if ($(id)) $(id).onchange = e => { queueAdd([...e.target.files]); e.target.value = ''; }; });
}
function syncCfg(){
  const v = id => $(id) ? $(id).value : null;
  if ($('stype')){
    const isM = cfg.scope.type === 'matn', t = isM ? 'matn' : v('stype');
    if (t === 'matn'){
      const id = v('smatn') || 'all', k = id === cfg.scope.id && $('ssec') && v('ssec') !== '' ? +v('ssec') : null;
      cfg.scope = k != null && MT[id] && MT[id].sec && MT[id].sec[k] ? {type: 'matn', id, sec: k} : {type: 'matn', id};
    }
    else {
      let f = +v('sfrom'), e = +v('sto');
      if (t !== cfg.scope.type){ [f, e] = {surah: [78, 114], juz: [30, 30], page: [582, 604], all: [1, 114]}[t]; }
      if (f > e) [f, e] = [e, f];
      cfg.scope = {type: t, from: f || 1, to: e || 114};
    }
  }
  if ($('scat')) setCat(v('scat'));
  if ($('sn')) cfg.n = +v('sn');
  if ($('slevel')) cfg.level = +v('slevel');
  if ($('stjk')) cfg.tjKind = v('stjk');
  if ($('sth')){ const x = v('sth'); if (x === 'auto') delete cfg.theme; else cfg.theme = x; applyTheme(); }
  if ($('shc')){ const x = v('shc'); if (x === 'auto') delete cfg.hc; else cfg.hc = x === 'on'; applyA11y(); }
  if ($('smkk')) cfg.mkKind = v('smkk');
  if ($('sahk')) cfg.ahKind = v('sahk');
  if ($('aud-from')){ cfg.audFrom = +v('aud-from'); cfg.audTo = +v('aud-to'); cfg.audCap = +v('aud-cap'); cfg.audQ = +v('aud-q'); audioUI.plan = null; }
  if ($('smdk')) cfg.mdKind = v('smdk');
  if ($('ssfk')) cfg.sfKind = v('ssfk');
  if ($('scont')) cfg.contLen = +v('scont');
  if ($('send')) cfg.endLen = +v('send');
  if ($('sbeg')) cfg.begLen = +v('sbeg');
  if ($('srec')){ cfg.reciter = v('srec'); cfg.goal = +v('sgoal'); }
  if ($('pf-from')) pdraft = pfRead();
  if ($('sabrep') && sab) sab.rep = +v('sabrep');
  saveCfg();
}
function setLang(l){ // change la langue de l'interface (le texte du Coran ne change pas)
  if (!['fr', 'en', 'ar'].includes(l) || l === LANG) return;
  LANG = l; cfg.lang = l; saveCfg(); applyLang();
  if (me && sb && remState().on) pushResync().catch(() => {});
  if (screen === 'account') renderAccount(); else if (screen === 'admin') renderAdmin(); else home();
}
function go(tab){ homeNotice = ''; cfg.tab = tab; if (tab === 'student') tch.loaded = false; if (tab === 'teacher'){ tch.students = null; tch.detail = null; } tch.msg = ''; saveCfg(); home(); window.scrollTo(0, 0); }

/* -- Accueil : l'essentiel du jour -- */
function weakCard(full){
  const W = weakNow(), top = W.slice(0, full ? 10 : 3);
  if (!W.length) return full ? `<div class="card"><h2>${tr('À renforcer en priorité')}</h2><p class="sub" style="margin:0">${tr('Rien à renforcer pour le moment : continue ainsi.')}</p></div>` : '';
  const why = w => [w.n30 ? trp(w.n30, '{n} erreur ces 30 derniers jours|{n} erreurs ces 30 derniers jours') : '', w.lateD >= 1 ? tr('en retard de {n} j', {n: w.lateD}) : '',
    w.pct !== null && w.pct < 75 ? tr('réussite {p} %', {p: w.pct}) : ''].filter(Boolean).join(' · ');
  return `<div class="card"><h2>${tr('À renforcer en priorité')}</h2>
    ${top.map(w => `<div class="weak"><span>${rlabel(pk(w.k))}${why(w) ? `<br><span class="ref">${why(w)}</span>` : ''}</span></div>`).join('')}
    <button class="pri big" style="margin-top:8px" data-act="strengthen">${tr('Renforcer maintenant ({n})', {n: Math.min(10, W.length)})}</button>
    ${full ? `<p class="ref" style="margin:8px 0 0">${tr("Choisis chaque jour parmi tes versets les plus fragiles : erreurs récentes (les plus récentes comptent le plus), retard de révision et taux de réussite. Un verset reste dans la liste jusqu'à ce qu'il tienne plus d'une semaine sans erreur.")}</p>`
      : `<button class="list-btn" data-act="tab" data-v="plan"><span>${tr('Voir la liste')}</span><span>›</span></button>`}</div>`;
}
function homeTiles(){ // tableau de bord : seulement ce qui n'est pas déjà dans la barre du bas ni dans « Aujourd'hui » ; chaque tuile montre son état et mène à la fonction
  const tj = Object.values(tjs || {}).reduce((a, v) => [a[0] + (v[0] || 0), a[1] + (v[1] || 0), a[2] + 1], [0, 0, 0]), last = store.get('tathbit.frLast', null), exp = store.get('tathbit.lastExport', 0);
  const mt = cfg.lastM && MT[cfg.lastM] ? MN(cfg.lastM) : null, days_ = exp ? Math.floor((Date.now() - exp) / 864e5) : 0;
  const T = [
    ['fr-setup', '', '🎙️', 'Réciter à voix haute', 'Sourates de mémoire, au micro', last ? tr('Dernière : {d} · {n}', {d: new Date(last.t).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short'}), n: trp(last.n, '{n} verset|{n} versets')}) : tr("Pas encore essayé")],
    ['tile-matn', '', '📜', 'Moutoun', "Ibn ʿĀshir, Tuḥfa, Bayqūniyya…", mt ? tr('Dernier : {m}', {m: esc(mt)}) : trp(Object.keys(MT).length, '{n} matn|{n} moutoun')],
    ['rdscope', '', '📖', 'Lire', 'Texte complet, tajwīd, traductions', tr('Coran ({n} sourates) et moutoun', {n: 114})],
    ['tile-tajwid', '', '🕌', 'Tajwīd', 'Règles, couleurs, lettres, madd', tj[0] + tj[1] ? tr('{r} % de réussite · {n} règles travaillées', {r: Math.round(100 * tj[0] / (tj[0] + tj[1])), n: tj[2]}) : tr('Pas encore essayé')],
    ['tile-backup', '', '💾', 'Sauvegarde', 'Ta progression ne doit pas se perdre', me ? tr('Synchronisée avec ton compte') : exp ? (days_ < 1 ? tr("Exportée aujourd'hui") : tr('Dernier export : il y a {n} j', {n: days_})) : tr('Jamais exportée : exporte-la')],
    IS_STANDALONE() ? ['news-open', '', '✨', 'Nouveautés', 'Ce qui change dans l\'application', tr('Version {v}', {v: 'v' + APP_BUILD}) + (news && news.items ? ' · ' + trp(news.items.length, '{n} nouveauté|{n} nouveautés') : '')]
      : ['tile-install', '', '📲', "Installer l'application", 'Rappels, hors ligne, plein écran', deferredInstall ? tr('Un toucher pour installer') : IOS ? tr("Partager, puis « Sur l'écran d'accueil »") : tr('Depuis le menu du navigateur')]];
  return `<h2 style="margin:16px 0 0">${tr('Mon tableau de bord')}</h2><div class="sethub">${T.map(([a, v, ic, t, d, st]) => `<button data-act="${a}"${v ? ` data-v="${v}"` : ''}><span class="si" aria-hidden="true">${ic}</span><b>${tr(t)}</b><small>${tr(d)}</small><span class="sv">${st}</span></button>`).join('')}</div>`;
}
/* ---------- installation de l'application ---------- */
function instImg(n){ // mini-schémas de l'installation sur iPhone (sans texte : rien à traduire ; le texte est dans la légende)
  const ph = '<rect x="46" y="6" width="68" height="108" rx="10" fill="var(--card)" stroke="var(--ink)" stroke-width="2"/>', hi = 'fill="none" stroke="var(--accent)" stroke-width="2.5"';
  const share = (x, y, c) => `<g stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M${x - 5} ${y - 1}v7h10v-7M${x} ${y + 4}v-10M${x - 3} ${y - 3}l3-3 3 3"/></g>`;
  const lines = '<g stroke="var(--line)" stroke-width="3" stroke-linecap="round"><path d="M56 22h48M56 32h36M56 42h44M56 52h30"/></g>';
  const body = n === 1 ? `${lines}<rect x="47" y="90" width="66" height="23" fill="var(--bg)" stroke="var(--line)"/><path d="M58 102h-1M64 98l-4 4 4 4" stroke="var(--muted)" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${share(80, 102, 'var(--accent)')}<circle cx="80" cy="101" r="11" ${hi}/><rect x="98" y="97" width="9" height="9" rx="2" fill="none" stroke="var(--muted)" stroke-width="1.8"/>`
    : n === 2 ? `${lines}<rect x="47" y="44" width="66" height="70" rx="9" fill="var(--bg)" stroke="var(--line)"/><rect x="55" y="52" width="50" height="11" rx="3" fill="var(--line-soft)"/><rect x="55" y="68" width="50" height="14" rx="3" fill="var(--card)" ${hi}/><rect x="59" y="71" width="8" height="8" rx="2" fill="none" stroke="var(--accent)" stroke-width="1.8"/><path d="M63 73v4M61 75h4" stroke="var(--accent)" stroke-width="1.5"/><rect x="72" y="73" width="28" height="4" rx="2" fill="var(--accent)"/><rect x="55" y="87" width="50" height="11" rx="3" fill="var(--line-soft)"/>`
    : `<g fill="var(--line-soft)"><rect x="55" y="18" width="16" height="16" rx="4"/><rect x="72" y="18" width="16" height="16" rx="4"/><rect x="89" y="18" width="16" height="16" rx="4"/><rect x="55" y="42" width="16" height="16" rx="4"/><rect x="72" y="42" width="16" height="16" rx="4"/><rect x="55" y="66" width="16" height="16" rx="4"/><rect x="72" y="66" width="16" height="16" rx="4"/></g><rect x="89" y="42" width="16" height="16" rx="4" fill="var(--accent)"/><circle cx="97" cy="50" r="4.5" fill="none" stroke="var(--gold)" stroke-width="2"/><rect x="85" y="38" width="24" height="24" rx="7" ${hi}/>`;
  return `<svg viewBox="0 0 160 120" width="150" height="112" role="img" aria-label="${tr(['Schéma : le bouton Partager en bas de Safari', 'Schéma : la ligne « Sur l’écran d’accueil » dans le menu', 'Schéma : l’icône de Tathbīt sur l’écran d’accueil'][n - 1])}" focusable="false">${ph}${body}</svg>`;
}
function renderInstall(){
  setNav(false); screen = 'install';
  const ios = [tr('Dans Safari, touche le bouton Partager (le carré avec une flèche vers le haut).'), tr("Fais défiler le menu et touche « Sur l'écran d'accueil », puis « Ajouter »."), tr("Ouvre Tathbīt depuis son icône sur l'écran d'accueil.")];
  const steps = [tr('Ouvre le menu du navigateur (les trois points ⋮).'), tr("Touche « Installer l'application » (ou « Ajouter à l'écran d'accueil »)."), tr("Ouvre Tathbīt depuis son icône sur l'écran d'accueil.")];
  $app.innerHTML = `<div class="top"><button class="link" data-act="tab" data-v="home">${tr('← Retour')}</button><span>${tr('Installation')}</span></div>
    <h1 style="margin-top:8px">📲 ${tr("Installer l'application")}</h1>
    ${IS_STANDALONE() ? `<div class="fb ok" role="status">✓ ${tr("Tathbīt est déjà installée sur cet appareil.")}</div>` : ''}
    <div class="card"><p style="margin:0 0 8px">${tr("Installée, Tathbīt s'ouvre en plein écran, marche mieux hors ligne et peut t'envoyer tes rappels de révision.")}</p>
      ${deferredInstall ? `<button class="pri big" data-act="install-now">📲 ${tr('Installer maintenant')}</button>`
      : IOS ? `<p class="ref" style="margin:0 0 10px">${tr("Sur iPhone et iPad, l'installation se fait depuis Safari (pas depuis un autre navigateur).")}</p><div class="inststeps">${ios.map((x, k) => `<figure>${instImg(k + 1)}<figcaption><b>${k + 1}.</b> ${x}</figcaption></figure>`).join('')}</div>`
      : `<ol class="steps" style="margin:0;padding-inline-start:20px;line-height:1.7">${steps.map(x => `<li>${x}</li>`).join('')}</ol>`}</div>
    ${IOS ? `<div class="card"><p class="ref" style="margin:0">${tr("Sur iPhone, l'application installée peut démarrer sans ta progression : exporte-la d'abord (Réglages, Données) puis importe-la dans l'application installée, ou connecte-toi à ton compte.")}</p></div>` : ''}`;
  window.scrollTo(0, 0);
}
async function installNow(){ if (!deferredInstall) return renderInstall(); const e = deferredInstall; deferredInstall = null; let r = null; try { e.prompt(); r = await e.userChoice; } catch { /* refusé ou non pris en charge */ } if (r && r.outcome === 'accepted') alert(tr('Tathbīt est installée : ouvre-la depuis son icône sur ton écran d’accueil.')); home(); }
/* rappel d'export : sans compte, la progression n'est que sur l'appareil ; au bout de 30 jours sans sauvegarde on le dit (reporté de 7 jours par « Plus tard ») */
const EXPORT_DAYS = 30;
function exportNudgeDays(){
  if (me || !Object.keys(stats).length) return 0;
  let first = store.get('tathbit.firstUse', 0); if (!first){ first = Date.now(); store.set('tathbit.firstUse', first); }
  if (Date.now() < store.get('tathbit.exportSnooze', 0)) return 0;
  const d = Math.floor((Date.now() - Math.max(first, store.get('tathbit.lastExport', 0))) / 864e5);
  return d >= EXPORT_DAYS ? d : 0;
}
function exportNudgeHtml(){
  const d = exportNudgeDays(); if (!d) return '';
  return `<div class="card" id="export-nudge"><h2>💾 ${tr('Pense à sauvegarder ta progression')}</h2><p class="sub" style="margin:0 0 8px">${tr("Sans compte, ta progression n'est que sur cet appareil. Elle est perdue si tu effaces les données du navigateur ou si tu changes de téléphone. Dernière sauvegarde : il y a {n} jours.", {n: d})}</p>
    <div class="row"><button class="pri" data-act="export">${tr('Exporter maintenant')}</button><button data-act="export-later">${tr('Plus tard')}</button></div></div>`;
}
function tabHome(){
  const DS = daySteps(), td = days[today()] || 0, st = streak();
  return `
  <div id="upd-slot">${updBannerHtml()}</div>
  <div id="news-slot">${newsCardHtml()}</div>
  ${homeNotice ? `<div class="fb ok" role="status">${esc(homeNotice)}</div>` : ''}
  ${remOfferHtml()}
  <div class="hero"><div class="logo"><span class="lg">تثبيت</span></div><div><h1>Tathbīt</h1><p class="tag">${tr('Coran et moutoun')}</p><p>${me ? esc(me.user.email) + ' ' + roleChips() : tr('Que ta mémorisation soit bénie.')}</p></div></div>
  ${exportNudgeHtml()}
  ${cloudOn() && !me ? `<div class="card"><h2>${tr('Sauvegarde ta progression')}</h2><p class="sub" style="margin:0 0 8px">${tr('Crée un compte gratuit pour retrouver tes séries, tes erreurs et ton historique sur tous tes appareils.')}</p>
    <div class="row"><button class="pri" data-act="acc-open" data-v="signup">${tr('Créer un compte')}</button><button data-act="acc-open" data-v="login">${tr('Se connecter')}</button></div></div>` : ''}

  <div class="card"><h2>${tr("Aujourd'hui")}</h2>
    <p class="sub" style="margin:0 0 4px">🔥 ${trp(st, '{n} jour d\'affilée|{n} jours d\'affilée')} · ${tr('objectif : {a} / {b}', {a: Math.min(td, cfg.goal), b: cfg.goal})}</p>
    <div class="goal"><i style="width:${Math.min(100, 100 * td / cfg.goal)}%"></i></div>
    ${td >= cfg.goal ? `<p class="ref" style="margin:0 0 8px">${tr('Objectif atteint, machaa Allah 🎉')}</p>` : ''}
    ${DS.length ? `<button class="pri big" style="margin-top:8px" data-act="day-go">▶ ${tr('Ma séance du jour')}</button><p class="ref" style="margin:6px 0 0">${daySummary(DS)}</p>`
      : `<p class="sub" style="margin:8px 0 0">${tr("Rien à revoir pour l'instant. Lance une série : les versets à retravailler reviendront ici au bon moment.")}</p>`}
    ${frResumeHtml()}
  </div>

  ${homeTiles()}

  ${weakCard(false)}
  ${goalHomeCard()}
  <div class="card"><h2>${tr('Ma série')}</h2>
    <div class="sumline"><span>${cfg.scope.type === 'matn' ? '📜 ' + tr('Moutoun') : '📖 ' + tr('Coran')}</span><span>${esc(scopeLabel(cfg.scope))}</span>
      <span>${esc(modeTitle(cfg.mode))}</span>${cfg.mode === 'tajweed' ? `<span>${tr((TJKINDS.find(k => k[0] === cfg.tjKind) || TJKINDS[0])[1])}</span>` : cfg.mode === 'madd' ? `<span>${tr((MDKINDS.find(k => k[0] === cfg.mdKind) || MDKINDS[0])[1])}</span>` : cfg.mode === 'ahkam' ? `<span>${tr((AHKINDS.find(k => k[0] === cfg.ahKind) || AHKINDS[0])[1])}</span>` : cfg.mode === 'makharij' ? `<span>${tr((MKKINDS.find(k => k[0] === cfg.mkKind) || MKKINDS[0])[1])}</span>` : cfg.mode === 'sifat' ? `<span>${tr((SFKINDS.find(k => k[0] === cfg.sfKind) || SFKINDS[0])[1])}</span>` : ''}<span>${trp(cfg.n, '{n} question|{n} questions')}</span>${(MODE_OPTS[cfg.mode] || {}).input ? `<span>${tr(INPUTS[cfg.input] || '')}</span>` : ''}</div>
    <button class="pri big" data-act="start">${tr('Commencer')}</button>
    <div class="row" style="margin-top:8px"><button data-act="tab" data-v="train">${tr('Modifier')}</button><button data-act="lsopen">🎧 ${tr('Écouter')}</button></div>
  </div>`;
}

/* -- Plan de révision : sabaq (nouveau), sabqi (révision récente), manzil (révision ancienne) -- */
const PLAN_AMT = ['v3', 'v5', 'v10', 'v16', 'p0.25', 'p0.5', 'p1'];
const amtLabel = a => a[0] === 'v' ? tr('{n} versets', {n: a.slice(1)}) : ({'p0.25': tr('¼ page'), 'p0.5': tr('½ page'), 'p1': tr('1 page')})[a];
let pdraft = null, planEditing = false, sab = null;
const PF_PRESETS = {recent: [3, 5, 7, 10], cycle: [14, 30]}, PF_MAX = {recent: 30, cycle: 30};   // durées proposées ; « Autre » = nombre de jours libre (1 à 30)
function pfRead(){ // lit le formulaire du plan ; les durées viennent de la liste, ou du champ libre quand « Autre » est choisi
  const val = id => $(id) ? $(id).value : null, old = pdraft || {};
  const dur = k => { const sv = val('pf-' + k); if (sv !== 'other') return +sv; const n = Math.round(+val('pf-' + k + '-n')); return n >= 1 ? Math.min(n, PF_MAX[k]) : (old[k] || PF_PRESETS[k][0]); };
  return {from: +val('pf-from'), to: +val('pf-to'), order: val('pf-order'), amt: val('pf-amt'), recent: dur('recent'), cycle: dur('cycle'), other: {recent: val('pf-recent') === 'other', cycle: val('pf-cycle') === 'other'}};
}
const dayKey = d => today(d || new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const chunkRefs = c => range(c.s, c.a, c.b - c.a + 1);
const passageLabel = refs => refs.length === 1 ? rlabel(refs[0]) : tr('Sourate {n} – {name}, versets {a} à {b}', {n: refs[0].s, name: SN(refs[0].s), a: refs[0].a, b: refs[refs.length - 1].a});
function planUnits(pl){ // les versets du plan, dans l'ordre d'apprentissage
  const lo = Math.min(pl.from, pl.to), hi = Math.max(pl.from, pl.to), secs = [];
  for (let s = lo; s <= hi; s++) secs.push(s);
  if (pl.order === 'desc') secs.reverse();
  const out = []; secs.forEach(s => { for (let a = 1; a <= slen(s); a++) out.push({s, a}); });
  return out;
}
const learnedKeys = pl => { const set = new Set(); (pl.log || []).forEach(c => { for (let a = c.a; a <= c.b; a++) set.add(c.s + ':' + a); }); return set; };
function planNextChunk(pl){
  const L = learnedKeys(pl), u = planUnits(pl).find(x => !L.has(key(x)));
  if (!u) return null;
  const n = +pl.amt.slice(1), byVerse = pl.amt[0] === 'v'; let b = u.a, acc = 0;
  for (let v = u.a; v <= slen(u.s); v++){ // n versets, ou n pages (chaque verset pèse 1 / nombre de versets de sa page)
    if (L.has(u.s + ':' + v)) break;
    b = v; acc += byVerse ? 1 : 1 / (PAGE_LEN[Q[u.s - 1].a[v - 1].p] || 10);
    if (acc >= n - 1e-9) break;
  }
  // s'il ne reste qu'un petit bout de la sourate (≤ 35 % de la quantité du jour), on l'ajoute pour ne pas laisser un verset isolé
  let rest = 0; for (let v = b + 1; v <= slen(u.s); v++){ if (L.has(u.s + ':' + v)){ rest = Infinity; break; } rest += byVerse ? 1 : 1 / (PAGE_LEN[Q[u.s - 1].a[v - 1].p] || 10); }
  if (rest > 0 && rest <= n * 0.35 + 1e-9) b = slen(u.s);
  return {s: u.s, a: u.a, b};
}
function planSets(pl){ // portions apprises avant aujourd'hui : récentes (sabqi) ou anciennes (manzil)
  const t0 = dayKey(), lim = dayKey(addDays(new Date(), -pl.recent)), rec = [], old = [];
  (pl.log || []).forEach(c => { if (c.d >= t0) return; (c.d >= lim ? rec : old).push(c); });
  return {rec, old};
}
function manzilToday(pl, old){ // rotation régulière (chaque portion revient dans le cycle) + jusqu'à 2 portions fragiles en plus
  if (!old.length) return {man: [], rot: 0, xtra: 0};
  const k = Math.min(old.length, Math.max(1, Math.ceil(old.length / pl.cycle))), st = (pl.mptr || 0) % old.length;
  const base = Array.from({length: k}, (_, i) => old[(st + i) % old.length]).slice(0, 8);
  const P = {}; weakNow().forEach(w => { P[w.k] = w.pri; });
  const xtra = old.filter(c => !base.includes(c)).map(c => ({c, w: chunkRefs(c).reduce((t, r) => t + (P[key(r)] || 0), 0)}))
    .filter(x => x.w >= 1.2).sort((a, b) => b.w - a.w).slice(0, Math.min(2, 8 - base.length)).map(x => x.c);
  return {man: [...base, ...xtra], rot: base.length, xtra: xtra.length};
}
function planToday(){
  const {rec, old} = planSets(plan), M = manzilToday(plan, old);
  return {next: planNextChunk(plan), rec: rec.slice(-8), man: M.man, rot: M.rot, xtra: M.xtra, d: (plan.done || {})[dayKey()] || {}, nOld: old.length, nRec: rec.length};
}
function planMark(kind){
  plan.done ||= {}; (plan.done[dayKey()] ||= {})[kind] = true;
  Object.keys(plan.done).sort().slice(0, -60).forEach(k => delete plan.done[k]); // on ne garde que 60 jours
  savePlan();
}
function planFinish(kind){
  if (ses.planDone) return; ses.planDone = true;
  if (kind === 'manzil'){ const {old} = planSets(plan); plan.mptr = ((plan.mptr || 0) + (ses.rot ?? ses.chunks.length)) % Math.max(1, old.length); }
  planMark(kind);
}
function learnChunk(ch){
  if (!ch) return;
  const L = learnedKeys(plan); let dup = true; for (let a = ch.a; a <= ch.b; a++) if (!L.has(ch.s + ':' + a)) dup = false;
  if (!dup) (plan.log ||= []).push({d: dayKey(), s: ch.s, a: ch.a, b: ch.b});
  planMark('sabaq'); sab = null; go('plan');
}
function startChunks(chunks, kind, rot){
  const refs = chunks.flatMap(chunkRefs);
  ses = {pool: refs, fixed: true, i: 0, score: 0, missed: [], used: new Set(), total: chunks.length, chunks, planKind: kind, rot};
  nextQ();
}
/* « Ma séance du jour » : versets dus, puis révision récente et révision ancienne du plan (celles pas encore faites aujourd'hui), enchaînés en une seule séance */
function daySteps(){
  const T = plan ? planToday() : null, steps = [], inChunks = new Set();
  const ch = T ? [['sabqi', T.d.sabqi ? [] : T.rec], ['manzil', T.d.manzil ? [] : T.man]] : [];
  ch.forEach(([, L]) => L.forEach(c => chunkRefs(c).forEach(r => inChunks.add(key(r)))));
  const due = reviewPick(10).filter(r => !inChunks.has(key(r)));   // un verset déjà récité dans une portion n'est pas redemandé
  if (due.length) steps.push({k: 'due', refs: due});
  ch.forEach(([k, L]) => { if (L.length) steps.push({k, chunks: L, rot: k === 'manzil' ? T.rot : undefined}); });
  return steps;
}
const DAY_NAME = {due: 'Versets dus', sabqi: 'Révision récente', manzil: 'Révision ancienne'};
function daySummary(S){ return S.map(x => x.k === 'due' ? trp(x.refs.length, '{n} verset dû|{n} versets dus') : tr(DAY_NAME[x.k]) + ' (' + trp(x.chunks.length, '{n} portion|{n} portions') + ')').join(' · '); }
function dayRun(day){
  const s = day.steps[day.i];
  if (s.k === 'due') start(shuffle(s.refs.slice())); else startChunks(s.chunks, s.k, s.rot);
  if (ses) ses.day = day;
}
function dayStart(){ const S = daySteps(); if (S.length) dayRun({steps: S, i: 0}); }
function openSabaq(){ const ch = planNextChunk(plan); if (!ch) return; sab = {ch, rep: 3, hide: false}; renderSabaq(); window.scrollTo(0, 0); }
function renderSabaq(){
  setNav(false);
  const refs = chunkRefs(sab.ch);
  $app.innerHTML = `
  <div class="top"><button class="link" data-act="sab-back">${tr('← Retour')}</button><span>${tr('Nouveau (sabaq)')}</span></div>
  <div class="card" style="margin-top:8px"><h2>${tr('Nouveau à apprendre')}</h2>
    <p style="margin:0 0 4px"><b>${esc(passageLabel(refs))}</b></p>
    <p class="ref" style="margin:0 0 8px">${tr('Lis, écoute et répète. Quand tu penses savoir, masque le texte et teste-toi.')}</p>
    <div class="rd" style="font-size:${cfg.rdSize}rem">${refs.map(r => `<span class="rv${sab.hide ? ' hid' : ''}" data-act="rv-sab">${esc(verse(r))} <span class="vend">﴿${arNum(r.a)}﴾</span></span>`).join(' ')}</div>
    <label class="f">${tr('Répétitions audio')}</label>
    <select id="sabrep">${[1, 3, 5, 10].map(n => `<option ${n === sab.rep ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <div class="grades"><button data-act="sab-play">▶ ${tr('Écouter')}</button><button data-act="sab-hide">${sab.hide ? '👁 ' + tr('Tout afficher') : '🙈 ' + tr('Masquer le texte')}</button></div>
    <p class="ref" id="audio-msg" style="margin:8px 0 0"></p>
  </div>
  <button class="pri big" data-act="sab-test">${tr('Tester ma récitation')}</button>
  <button class="big" style="margin-top:8px" data-act="plan-learned">✓ ${tr("J'ai appris cette portion")}</button>`;
  $('sabrep').onchange = e => { sab.rep = +e.target.value; };
}
function sabTest(){
  const refs = chunkRefs(sab.ch);
  ses = {pool: refs, fixed: true, i: 1, score: 0, missed: [], used: new Set(), total: 1, planKind: 'sabaq', planChunk: sab.ch};
  cur = {m: 'cont', r: refs[0], done: false};
  startPassage(refs, passageLabel(refs), tr('Récite de mémoire la portion à apprendre :'));
}
function planDefsHtml(open){ // définitions des trois étapes du plan
  const ar = {Sabaq: 'السبق', Sabqi: 'السبقي', Manzil: 'المنزل'};
  const item = (k, d) => `<p style="margin:0 0 8px"><b>${tr(k)}${LANG === 'ar' ? '' : ' · <span class="ar" style="font-size:calc(1.15rem*var(--arz,1));line-height:1.4;padding:0">' + ar[k] + '</span>'}</b> — ${tr(d)}</p>`;
  return `<details class="card" ${open ? 'open' : ''}><summary>${tr('Comprendre sabaq, sabqi et manzil')}</summary><div style="margin-top:10px">
    ${item('Sabaq', "La leçon nouvelle : la portion que tu apprends aujourd'hui, par lecture, écoute et répétition jusqu'à pouvoir la réciter de mémoire.")}
    ${item('Sabqi', "La révision des leçons récentes : chaque jour, tu récites les portions apprises ces derniers jours pour les ancrer avant qu'elles ne s'effacent.")}
    ${item('Manzil', "La révision des anciennes leçons : tout ce que tu as déjà appris plus tôt, revu en rotation sur un cycle (de 14 à 30 jours dans le plan) pour que rien ne se perde.")}
    <p class="ref" style="margin:0">${tr('Ces termes viennent de la tradition de mémorisation du Coran ; les durées varient selon les écoles et les enseignants. Tu peux les régler dans « Modifier le plan ».')} ${AI()}</p></div></details>`;
}
function planSetupHtml(){
  const d = pdraft || (pdraft = plan ? {from: plan.from, to: plan.to, order: plan.order, amt: plan.amt, recent: plan.recent, cycle: plan.cycle} : {from: 78, to: 114, order: 'desc', amt: 'v5', recent: 7, cycle: 30});
  const total = planUnits(d).length, per = d.amt[0] === 'v' ? +d.amt.slice(1) : +d.amt.slice(1) * 10.3, days = Math.ceil(total / per);
  const durSel = (k, label) => { const id = 'pf-' + k, pre = PF_PRESETS[k], other = d.other ? d.other[k] : !pre.includes(d[k]);
    return `<div><label class="f" for="${id}">${label}</label><select id="${id}">${pre.map(n => `<option value="${n}" ${!other && d[k] === n ? 'selected' : ''}>${tr('{n} jours', {n})}</option>`).join('')}<option value="other" ${other ? 'selected' : ''}>${tr('Autre…')}</option></select>
      ${other ? `<input type="number" id="${id}-n" inputmode="numeric" min="1" max="${PF_MAX[k]}" step="1" value="${d[k]}" aria-label="${esc(label)} : ${tr('nombre de jours')}" style="margin-top:6px"><p class="ref" style="margin:4px 0 0">${tr('Écris un nombre de jours entre 1 et {max}.', {max: PF_MAX[k]})}</p>` : ''}</div>`; };
  const sel = (id, label, opts, val) => `<div><label class="f" for="${id}">${label}</label><select id="${id}">${opts.map(([v, t]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
  return `
  <h1>${tr('Mon plan de révision')}</h1>
  <p class="sub">${tr("Chaque jour, l'application te dit quoi réviser de ce que tu as déjà mémorisé.")}</p>
  ${planDefsHtml(true)}
  <div class="card"><h2>${tr('Sourates du plan')}</h2>
    <div class="row"><div><label class="f" for="pf-from">${tr('De')}</label><select id="pf-from">${surahOpts(d.from)}</select></div>
      <div><label class="f" for="pf-to">${tr('À')}</label><select id="pf-to">${surahOpts(d.to)}</select></div></div>
    ${sel('pf-order', tr("Ordre d'apprentissage"), [['desc', tr('À rebours : de la fin vers le début (ex. An-Nas → An-Naba)')], ['asc', tr("Dans l'ordre : du début vers la fin")]], d.order)}
  </div>
  <div class="card"><h2>${tr('Rythme')}</h2>
    ${sel('pf-amt', tr('Quantité de nouveau par jour'), PLAN_AMT.map(a => [a, amtLabel(a)]), d.amt)}
    <div class="row">${durSel('recent', tr('Révision récente sur'))}
      ${durSel('cycle', tr('Révision ancienne : cycle de'))}</div>
    <p class="ref" style="margin:10px 0 0">${tr('{v} versets au total, environ {d} jours à ce rythme.', {v: total, d: days})}</p>
  </div>
  <button class="pri big" data-act="plan-save">${plan ? tr('Enregistrer le plan') : tr('Créer mon plan')}</button>
  ${plan ? `<button class="big" style="margin-top:8px" data-act="plan-cancel">${tr('Annuler')}</button>` : ''}`;
}
function planWeek(pl, from = new Date()){ // prévision sur 7 jours : on suppose que la portion prévue est apprise chaque jour
  const log = (pl.log || []).slice(), out = [];
  for (let i = 0; i < 7; i++){
    const day = addDays(from, i), dk = dayKey(day), lim = dayKey(addDays(day, -pl.recent));
    const rec = log.filter(c => c.d < dk && c.d >= lim).length, old = log.filter(c => c.d < dk && c.d < lim).length;
    const man = old ? Math.min(old, Math.max(1, Math.ceil(old / pl.cycle))) : 0;
    const dn = i === 0 ? (pl.done || {})[dk] || {} : {};
    let chunk = null;
    if (i === 0 && dn.sabaq) chunk = log.slice().reverse().find(c => c.d === dk) || null;    // déjà appris aujourd'hui
    else { chunk = planNextChunk({...pl, log}); if (chunk) log.push({d: dk, s: chunk.s, a: chunk.a, b: chunk.b}); }
    out.push({day, key: dk, chunk, rec, man, done: dn});
  }
  return out;
}
function planWeekHtml(pl){
  const W = planWeek(pl), fmt = d => d.toLocaleDateString(LOCALE(), {weekday: 'long', day: 'numeric', month: 'short'});
  return `<div class="card"><h2>${tr('Semaine')}</h2>
    ${W.map((x, i) => `<div class="weak" style="display:block${i === 0 ? ';font-weight:600' : ''}"><div>${i === 0 ? '▸ ' : ''}${esc(fmt(x.day))}</div>
      <div class="ref" style="margin:2px 0 0">${x.chunk ? `${x.done.sabaq ? '✓ ' : ''}${tr('Nouveau :')} ${esc(passageLabel(chunkRefs(x.chunk)))}` : tr('Plan terminé 🎉')}${x.rec ? ` · ${x.done.sabqi ? '✓ ' : ''}${trp(x.rec, 'révision récente : {n} portion|révision récente : {n} portions')}` : ''}${x.man ? ` · ${x.done.manzil ? '✓ ' : ''}${trp(x.man, 'révision ancienne : {n} portion|révision ancienne : {n} portions')}` : ''}</div></div>`).join('')}
    <p class="ref" style="margin:8px 0 0">${tr("Prévision : elle suppose que tu apprends chaque jour la portion prévue. Les portions de révision sont celles de la règle sabqi / manzil de ton plan.")} ${AI()}</p></div>`;
}
function tabPlan(){
  if (!plan || planEditing) return planSetupHtml() + weakCard(true);
  const T = planToday(), units = planUnits(plan), L = learnedKeys(plan), nL = units.filter(u => L.has(key(u))).length, pct = Math.round(100 * nL / units.length), rem = units.length - nL;
  const dist = new Set((plan.log || []).map(c => c.d)).size, per = dist >= 3 ? nL / dist : (plan.amt[0] === 'v' ? +plan.amt.slice(1) : +plan.amt.slice(1) * 10.3), days = Math.ceil(rem / Math.max(per, 1));
  const end = addDays(new Date(), days).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'long', year: 'numeric'});
  const row = (title, sub, done, act, btn) => `<div class="card"><h2>${title}</h2><p class="sub" style="margin:0 0 8px">${sub}</p>
    ${done ? `<p class="ref" style="margin:0">✓ ${tr('Fait')}</p>` : act ? `<button class="pri big" data-act="${act}">${btn}</button>` : ''}</div>`;
  return `
  <h1>${tr('Plan')}</h1>
  <div class="card"><h2>${tr('Mon plan de révision')}</h2>
    <div class="goal"><i style="width:${pct}%"></i></div>
    <p style="margin:6px 0 0"><b>${tr('{a} / {b} versets appris', {a: nL, b: units.length})}</b> · ${pct} %</p>
    <p class="ref" style="margin:4px 0 0">${rem ? tr('À ce rythme : environ {d} jours (fin vers le {date}).', {d: days, date: end}) : tr('Plan terminé 🎉')}</p></div>
  ${weakCard(true)}
  ${T.next ? row(tr('Nouveau (sabaq)'), esc(passageLabel(chunkRefs(T.next))) + ' · ' + amtLabel(plan.amt), T.d.sabaq, 'plan-sabaq', tr('Apprendre'))
    : `<div class="card"><h2>${tr('Nouveau (sabaq)')}</h2><p class="sub" style="margin:0">${tr('Plan terminé 🎉')}</p></div>`}
  ${T.rec.length ? row(tr('Révision récente (sabqi)'), trp(T.rec.length, '{n} portion apprise ces {d} derniers jours|{n} portions apprises ces {d} derniers jours', {d: plan.recent}), T.d.sabqi, 'plan-sabqi', tr('Réviser'))
    : `<div class="card"><h2>${tr('Révision récente (sabqi)')}</h2><p class="sub" style="margin:0">${tr('Rien à réviser pour le moment.')}</p></div>`}
  ${T.man.length ? row(tr('Révision ancienne (manzil)'), trp(T.man.length, '{n} portion à revoir aujourd\'hui (cycle de {c} jours)|{n} portions à revoir aujourd\'hui (cycle de {c} jours)', {c: plan.cycle}) + (T.xtra ? ' · ' + tr('dont {n} à renforcer', {n: T.xtra}) : ''), T.d.manzil, 'plan-manzil', tr('Réviser'))
    : `<div class="card"><h2>${tr('Révision ancienne (manzil)')}</h2><p class="sub" style="margin:0">${tr('Rien à réviser pour le moment.')}</p></div>`}
  ${planWeekHtml(plan)}
  ${planDefsHtml(false)}
  <div class="row"><button data-act="plan-edit">${tr('Modifier le plan')}</button><button data-act="plan-del" style="color:var(--ko)">${tr('Supprimer le plan')}</button></div>`;
}

/* -- Réviser : tout pour préparer une série -- */
/* options utiles pour chaque exercice (n = nombre de questions : toujours) ; q = Coran seulement */
const MODE_OPTS = {
  mix: {level: 1, end: 'q', beg: 'q', input: 1}, next: {input: 1}, cloze: {level: 1, input: 1}, which: {}, mcq: {}, mutash: {}, mwhich: {}, start: {input: 1},
  order: {}, tajweed: {tj: 1}, ahkam: {ah: 1}, madd: {md: 1}, makharij: {mk: 1}, sifat: {sf: 1}, end: {end: 'q', input: 1}, link: {end: 'q', beg: 'q', input: 1}, cont: {cont: 1, input: 1}, half: {input: 1}, phrase: {input: 1}
};
const modeHelp = {
  madd: "Choisis le type de question : type de madd d'un verset, durée, cause, vrai ou faux. Cet exercice ne dépend pas de la portée choisie.",
  ahkam: "Choisis le type de question : règle d'un verset (nūn sākin / tanwīn ou mīm sākin), règle d'une lettre, lettres d'une règle, ghunna, vrai ou faux. Cet exercice ne dépend pas de la portée choisie.",
  makharij: "Choisis le type de question : zone de sortie, lettres du même point, intruse, partie de la gorge, vrai ou faux. Cet exercice ne dépend pas de la portée choisie.",
  sifat: "Choisis le type de question : qualité d'une lettre, lettre d'une qualité, mots mnémotechniques du matn, vrai ou faux. Cet exercice ne dépend pas de la portée choisie.",
  tajweed: 'Plusieurs types de questions de tajwīd au choix : reconnaître la règle d\'une partie surlignée, trouver la partie d\'une règle, vrai ou faux (entraînement : annotation automatique non relue par un enseignant).',
  mix: 'Un mélange de tous les exercices.', next: 'On te donne un verset, tu donnes la suite.', cloze: 'Des mots du verset sont cachés : retrouve-les.',
  which: 'Tu identifies la sourate (ou le matn) d\'un verset en touchant la bonne réponse.', mcq: 'Tu touches le bon verset suivant parmi quatre.',
  mutash: 'Tu touches la vraie suite d\'un verset qui ressemble à d\'autres.', mwhich: 'Tu touches la sourate d\'un verset qui ressemble à d\'autres versets (seuls les versets qui n\'apparaissent qu\'une fois dans le Coran sont posés).', start: 'Tu récites le premier verset d\'une sourate.',
  order: 'Tu touches la sourate qui vient juste après.', end: 'Tu récites les derniers versets d\'une sourate.',
  link: 'Tu récites la fin d\'une sourate puis le début de la suivante.', cont: 'Tu récites un passage entier d\'une traite.',
  half: 'On te donne la première moitié, tu complètes la seconde.', phrase: 'On te donne une phrase, tu donnes la suivante.'
};
const CATS = [['memo', 'Mémorisation (Coran ou moutoun)'], ['tajwid', 'Tajwīd (entraînement)'], ['ahk', 'Aḥkām (nūn, mīm, tanwīn)'], ['mdd', 'Madd (prolongations)'], ['mkh', 'Makhārij (points de sortie)'], ['sfa', 'Ṣifāt (qualités des lettres)']];
const CATMODE = {tajwid: 'tajweed', ahk: 'ahkam', mdd: 'madd', mkh: 'makharij', sfa: 'sifat'}, catOf = m => ({tajweed: 'tajwid', ahkam: 'ahk', madd: 'mdd', makharij: 'mkh', sifat: 'sfa'})[m] || 'memo';
const CATHELP = {memo: 'Teste ta mémoire du Coran ou des moutoun, avec les exercices ci-dessous.', tajwid: 'Entraîne-toi sur les règles de tajwīd des versets du Coran de ta portée.',
  ahk: "Apprends les règles du nūn sākin, du tanwīn et du mīm sākin sur de vrais versets. Cet exercice ne dépend pas de la portée.",
  mdd: 'Apprends à reconnaître les madd sur de vrais versets (naturel, muttaṣil, munfaṣil, lāzim, ʿāriḍ). Cet exercice ne dépend pas de la portée.',
  mkh: 'Apprends les points de sortie des lettres. Cet exercice ne dépend pas de la portée.', sfa: 'Apprends les qualités des lettres. Cet exercice ne dépend pas de la portée.'};
function setCat(c){ // change le type d'exercice : mémorisation, tajwīd, makhārij ou ṣifāt
  const from = catOf(cfg.mode); if (from === c || !CATS.some(x => x[0] === c)) return;
  if (from === 'memo') cfg.lastMemo = cfg.mode;
  if (c === 'memo') cfg.mode = cfg.lastMemo && catOf(cfg.lastMemo) === 'memo' ? cfg.lastMemo : 'mix';
  else cfg.mode = CATMODE[c];
  if (cfg.scope.type === 'matn' && (c === 'tajwid' || (c === 'memo' && ['mutash', 'mwhich', 'start', 'order', 'end', 'link'].includes(cfg.mode)))){ // le tajwīd ne porte que sur le Coran
    if (c === 'tajwid'){ cfg.lastM = cfg.scope.id; cfg.scope = cfg.lastQ || DEF.scope; } else cfg.mode = 'mix';
  }
}
function tabTrain(){
  const sc = cfg.scope, isM = sc.type === 'matn', o = MODE_OPTS[cfg.mode] || {}, cat = catOf(cfg.mode), showScope = cat === 'memo' || cat === 'tajwid';
  return `
  <h1>${tr('Réviser')}</h1>
  <p class="sub">${tr('Choisis ce que tu veux travailler, puis lance la série.')}</p>

  <div class="card"><h2>🎙️ ${tr('Réciter à voix haute')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr("Sans exercice : choisis une ou plusieurs sourates et récite-les d'une traite, de mémoire. L'application suit ta récitation.")}</p>
    <button class="pri" data-act="fr-setup">🎤 ${tr('Réciter une ou plusieurs sourates')}</button></div>

  <div class="card"><h2>${tr("Type d'exercice")}</h2>
    <select id="scat" aria-label="${tr("Type d'exercice")}">${CATS.map(([id, t]) => `<option value="${id}" ${id === cat ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select>
    <p class="ref" style="margin:8px 0 0">${tr(CATHELP[cat])}</p>
  </div>

  ${cat === 'memo' ? `<div class="card"><h2>${tr('Je veux réviser')}</h2>
    <div class="seg">
      <button class="${isM ? '' : 'sel'}" data-act="corpus" data-v="quran">📖 ${tr('Le Coran')}</button>
      <button class="${isM ? 'sel' : ''}" data-act="corpus" data-v="matn">📜 ${tr('Les moutoun')}</button>
    </div>
  </div>

  <div class="card"><h2>${tr('Exercice')}</h2>
    <div class="modes">${MODES.filter(([id, , , w]) => catOf(id) === 'memo' && (!w || (w === 'm') === isM)).map(([id, t, d]) =>
      `<button class="mode ${cfg.mode === id ? 'sel' : ''}" data-act="mode" data-v="${id}"><b>${tr(isM && id === 'which' ? 'Quel matn ?' : t)}</b><small>${tr(d)}</small></button>`).join('')}</div>
  </div>` : ''}

  ${showScope ? `<div class="card"><h2>${tr('Portée')}</h2>
    <label class="f" ${isM ? 'hidden' : ''}>${tr('Réviser…')}</label>
    <select id="stype" ${isM ? 'hidden' : ''}>
      <option value="surah" ${sc.type === 'surah' ? 'selected' : ''}>${tr('Une plage de sourates')}</option>
      <option value="juz" ${sc.type === 'juz' ? 'selected' : ''}>${tr("Un ou plusieurs juz'")}</option>
      <option value="page" ${sc.type === 'page' ? 'selected' : ''}>${tr('Des pages du Mushaf (1–604)')}</option>
      <option value="all" ${sc.type === 'all' ? 'selected' : ''}>${tr('Tout le Coran')}</option>
    </select>
    <div id="smatn-row" ${isM ? '' : 'hidden'}>
      <label class="f">${tr('Matn')}</label>
      <select id="smatn"><option value="all">${tr('Tous les moutoun')}</option>${matnOpts(sc.id)}</select>
      ${isM && MT[sc.id] && MT[sc.id].sec ? `<label class="f">${tr('Bloc (chapitre du matn)')}</label>
      <select id="ssec"><option value="" ${sc.sec == null ? 'selected' : ''}>📜 ${tr('Tout le matn')} (${MT[sc.id].a.length})</option>${MT[sc.id].sec.map((b, k) => `<option value="${k}" ${sc.sec === k ? 'selected' : ''}>${k + 1}. ${esc(secName(b))} (${secSize(sc.id, k)})</option>`).join('')}</select>
      <p class="ref" style="margin:4px 0 0">${tr("Titres des blocs : ceux de la source ; le français est traduit par l'IA, pas une source officielle.")}</p>` : ''}
      ${isM ? srcNote(sc) : ''}
      <details style="margin-top:12px"><summary>➕ ${tr('Ajouter mon propre matn')}</summary>
        <p class="ref" style="margin:10px 0 6px">${tr('Importer le texte depuis une photo, un PDF ou un fichier Word :')}</p>
        <div class="row"><button type="button" data-act="cm-cam">📷 ${tr('Prendre une photo')}</button><button type="button" data-act="cm-img">🖼️ ${tr('Image ou photo')}</button><button type="button" data-act="cm-doc">📄 ${tr('PDF, Word ou texte')}</button></div>
        <input type="file" id="cm-f-cam" accept="image/*" capture="environment" hidden>
        <input type="file" id="cm-f-img" accept="image/*" multiple hidden>
        <input type="file" id="cm-f-doc" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" multiple hidden>
        <p class="ref" style="margin:6px 0 0">${tr("Limites : image {a} Mo, PDF ou Word {b} Mo, texte {c} Mo, PDF {d} pages à la fois. Si c'est plus grand, découpe en plusieurs fichiers ou prends plusieurs photos : ajoute-les dans l'ordre du texte, elles sont lues l'une après l'autre.", {a: CM.img, b: CM.doc, c: CM.txt, d: CM.pdfPages})}</p>
        <div id="cm-queue">${queueHtml()}</div>
        <div class="row"><div><label class="f" for="cm-p1">${tr('Pages du PDF (facultatif) : de')}</label><input type="number" id="cm-p1" min="1" inputmode="numeric"></div>
          <div><label class="f" for="cm-p2">${tr('à')}</label><input type="number" id="cm-p2" min="1" inputmode="numeric"></div></div>
        <p id="cm-status" class="ref" aria-live="polite" style="margin:6px 0 0"></p>
        <label class="f">${tr('Titre')}</label><input type="text" id="cm-title" placeholder="${tr('ex. Alfiyya – Ibn Mālik')}">
        <label class="f">${tr('Type de texte')}</label>
        <select id="cm-kind"><option value="poem">${tr('Poème (un vers par ligne, les deux moitiés séparées par *)')}</option><option value="prose">${tr('Prose (un passage par ligne)')}</option></select>
        <label class="f">${tr('Texte (copie-le depuis ton édition de référence)')}</label>
        <textarea id="cm-text" dir="rtl" lang="ar" placeholder="الحمد لله ربي * ..."></textarea>
        <div class="row" style="margin-top:6px"><button type="button" data-act="cm-undo">↩ ${tr('Annuler le dernier ajout')}</button><button type="button" data-act="cm-rev">↔ ${tr("Inverser (texte à l'envers)")}</button><button type="button" data-act="cm-clear">🧹 ${tr('Effacer le texte')}</button></div>
        <button class="pri" style="margin-top:8px" data-act="addcustom">${tr('Enregistrer ce matn')}</button>
        <p class="fb mid" style="margin:8px 0 0">⚠️ ${tr("Vérifie que le texte est bien dans l'ordre du matn, de la première à la dernière ligne, surtout entre les parties importées : rien ne doit manquer ni se répéter.")}</p>
        <p class="ref">${tr("La lecture d'une photo ou d'un fichier se fait sur ton appareil : rien n'est envoyé. Vérifie et corrige le texte, surtout les voyelles : une photo ne les donne pas toujours.")}</p>
        <p class="ref">${tr("Le texte reste sur cet appareil. Si tu n'indiques pas de séparateur *, chaque vers est coupé au milieu.")}</p>
      </details>
    </div>
    <div class="row" id="srange" ${sc.type === 'all' || isM ? 'hidden' : ''}>
      <div><label class="f">${tr('De')}</label><select id="sfrom">${sc.type === 'juz' ? opts(30, sc.from) : sc.type === 'page' ? opts(604, sc.from) : surahOpts(sc.from)}</select></div>
      <div><label class="f">${tr('À')}</label><select id="sto">${sc.type === 'juz' ? opts(30, sc.to) : sc.type === 'page' ? opts(604, sc.to) : surahOpts(sc.to)}</select></div>
    </div>
  </div>` : ''}

  <div class="card"><h2>${tr('Options de la série')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr(modeHelp[cfg.mode] || '')}</p>
    <div class="row">
      <div><label class="f">${tr('Nombre de questions')}</label>
        <select id="sn">${[5, 10, 20, 30].map(n => `<option ${n === cfg.n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${o.md ? `<div><label class="f" for="smdk">${tr('Type de question de madd')}</label>
        <select id="smdk">${MDKINDS.map(([id, t]) => `<option value="${id}" ${id === cfg.mdKind ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select></div>` : ''}
      ${o.ah ? `<div><label class="f" for="sahk">${tr('Type de question d\'aḥkām')}</label>
        <select id="sahk">${AHKINDS.map(([id, t]) => `<option value="${id}" ${id === cfg.ahKind ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select></div>` : ''}
      ${o.mk ? `<div><label class="f" for="smkk">${tr('Type de question de makhārij')}</label>
        <select id="smkk">${MKKINDS.map(([id, t]) => `<option value="${id}" ${id === cfg.mkKind ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select></div>` : ''}
      ${o.sf ? `<div><label class="f" for="ssfk">${tr('Type de question de ṣifāt')}</label>
        <select id="ssfk">${SFKINDS.map(([id, t]) => `<option value="${id}" ${id === cfg.sfKind ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select></div>` : ''}
      ${o.tj ? `${cfg.tjKind === 'read' ? `<p class="ref" style="flex:1 1 100%;margin:0">${tr("Ce type de question repose sur les couleurs : choisis un autre type si tu distingues mal les couleurs, ou active les motifs (Réglages, Accessibilité) : ils s'affichent aussi dans la légende.")}</p>` : ''}<div><label class="f" for="stjk">${tr('Type de question de tajwīd')}</label>
        <select id="stjk">${TJKINDS.map(([id, t]) => `<option value="${id}" ${id === cfg.tjKind ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select></div>` : ''}
      ${o.level ? `<div><label class="f">${tr('Mots cachés (mots manquants)')}</label>
        <select id="slevel">${[20, 40, 60, 80].map(n => `<option value="${n}" ${n === cfg.level ? 'selected' : ''}>${n} %</option>`).join('')}</select></div>` : ''}
      ${o.cont ? `<div><label class="f">${tr("Versets à réciter d'une traite")}</label>
        <select id="scont">${[3, 5, 8, 10, 15].map(n => `<option ${n === cfg.contLen ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : ''}
      ${o.end && !isM ? `<div><label class="f">${tr('Versets de fin de sourate')}</label>
        <select id="send">${[1, 2, 3, 5].map(n => `<option ${n === cfg.endLen ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : ''}
      ${o.beg && !isM ? `<div><label class="f">${tr('Versets de début (sourate suivante)')}</label>
        <select id="sbeg">${[1, 2, 3].map(n => `<option ${n === cfg.begLen ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : ''}
    </div>
    ${o.input ? `<label class="f">${tr('Façon de répondre')}${SR ? '' : ' (' + tr("la voix n'est pas disponible dans ce navigateur : essaie Chrome ou Safari") + ')'}</label>
    <div class="seg">
      <button class="${cfg.input === 'recite' ? 'sel' : ''}" data-act="input" data-v="recite">${tr('Je récite, puis je marque mes erreurs')}</button>
      <button class="${cfg.input === 'type' ? 'sel' : ''}" data-act="input" data-v="type">${tr('Je tape en arabe')}</button>
      ${SR ? `<button class="${cfg.input === 'voice' ? 'sel' : ''}" data-act="input" data-v="voice">🎤 ${tr('Je récite à voix haute')}</button>` : ''}
    </div>${SR && IOS_APP ? `<p class="ref" style="margin:6px 0 0">${tr("Sur iPhone, la reconnaissance vocale peut ne pas marcher dans l'application installée : ouvre le site dans Safari pour l'utiliser.")}</p>` : ''}` : `<p class="ref" style="margin:10px 0 0">${tr('Pour cet exercice, tu réponds en touchant la bonne proposition.')}</p>`}
  </div>

  ${showScope ? `<div class="row"><button class="big" data-act="rdscope">📖 ${tr('Lire le texte complet')}</button><button class="big" data-act="lsopen">🎧 ${tr('Écouter ma portée')}</button></div>` : ''}
  <div class="cta"><button class="pri big" data-act="start">${tr('Commencer')}${showScope ? ' · ' + esc(scopeLabel(sc)) : ''}</button></div>`;
}

/* -- Progrès : statistiques et carte -- */
function tabProgress(){
  const tot = Object.values(stats).reduce((a, [o, k]) => [a[0] + o, a[1] + k], [0, 0]), answered = tot[0] + tot[1];
  const per = {};
  for (const [k, [o, ko]] of Object.entries(stats)){ const s = k.split(':')[0]; if (!book(pk(k).s)) continue; (per[s] ||= [0, 0]); per[s][0] += o; per[s][1] += ko; }
  const weak = Object.entries(per).filter(([, [o, k]]) => o + k >= 3)
    .map(([s, [o, k]]) => [s, o / (o + k), o + k]).sort((a, b) => a[1] - b[1]).slice(0, 5);
  return `
  <h1>${tr('Progrès')}</h1>
  <p class="sub">${tr('Où tu en es, sourate par sourate.')}</p>
  <div class="card">${answered ? `<div class="stat"><div><b>${Math.round(answered)}</b>${tr('réponses')}</div>
    <div><b>${Math.round(100 * tot[0] / answered)} %</b>${tr('réussite')}</div>
    <div><b>${Object.keys(stats).length}</b>${tr('versets vus')}</div></div>`
    : `<p class="sub" style="margin:0">${tr('Pas encore de statistiques : fais ta première série.')}</p>`}</div>
  <div class="card"><h2>${tr('Cette semaine')}</h2>${weekHtml()}</div>
  <div class="card"><h2>${tr('Carte de progression')}</h2>${mapHtml()}</div>
  ${weak.length ? `<div class="card">${weakHtml(weak)}</div>` : ''}
  ${Object.keys(hfs).length ? `<div class="card"><h2>${tr('Mes makhārij et ṣifāt')}</h2>${Object.entries(hfs).map(([k, [o, e]]) => [k, o, e, o / Math.max(1, o + e)]).sort((a, b) => a[3] - b[3]).slice(0, 8)
    .map(([k, o, e, r]) => `<div class="weak"><span>${hfKeyLabel(k)}</span><span>${Math.round(100 * r)} % · ${o + e}</span></div>`).join('')}${HFNOTE()}</div>` : ''}
  ${Object.keys(tjs).length ? `<div class="card"><h2>${tr('Mes règles de tajwīd')}</h2>${Object.entries(tjs).filter(([c]) => TJNAME[c]).map(([c, [o, k]]) => [c, o, k, o / Math.max(1, o + k)]).sort((a, b) => a[3] - b[3])
    .map(([c, o, k, r]) => `<div class="weak"><span>${esc(tr(TJNAME[c]))}</span><span>${Math.round(100 * r)} % · ${o + k}</span></div>`).join('')}${TJNOTE()}</div>` : ''}`;
}

/* -- Réglages -- */
let setQ = '';   // recherche dans les réglages (non enregistrée)
function tabSettings(){
  const corrTxt = {strict: 'Chaque lettre, chaque voyelle, soukoun et chadda compris : une seule faute = raté.',
    standard: 'Lettres et voyelles exactes ; soukoun et chadda d\'assimilation (idghām) tolérés comme dans l\'écriture courante.',
    soft: 'Les voyelles sont ignorées et une petite faute de frappe est tolérée.'}[cfg.corr];
  const C = {   // un réglage = une carte ; elles sont rangées en groupes juste en dessous
    account: `${accountCard()}`,
    lang: `<div class="card"><h2>${tr('Langue')}</h2>
    <div class="seg">${Object.entries(LANGS).map(([k, n]) => `<button class="${LANG === k ? 'sel' : ''}" data-act="lang" data-v="${k}" lang="${k}">${n}</button>`).join('')}</div>
  </div>`,
    arsize: `<div class="card"><h2>${tr('Taille du texte arabe')}</h2>
    <p class="ref" style="margin:0 0 6px">${tr("Valable partout : questions, lecteur, récitation, résultats et erreurs.")}</p>
    <div class="row" style="align-items:center"><button data-act="ar-size" data-v="-1" aria-label="${tr('Réduire le texte arabe')}" ${(cfg.rdSize || AR_DEF) <= 1.1 ? 'disabled' : ''}>A−</button><b id="arsz" style="flex:1;text-align:center" role="status">${Math.round(100 * (cfg.rdSize || AR_DEF) / AR_DEF)} %</b><button data-act="ar-size" data-v="1" aria-label="${tr('Agrandir le texte arabe')}" ${(cfg.rdSize || AR_DEF) >= 3.2 ? 'disabled' : ''}>A+</button><button data-act="ar-size" data-v="reset">${tr('Par défaut')}</button></div>
    <div class="ar" dir="rtl" lang="ar" style="text-align:center">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div></div>`,
    corr: `<div class="card"><h2>${tr('Correction de la saisie (Coran)')}</h2>
    <div class="seg">${[['strict', 'Stricte'], ['standard', 'Standard'], ['soft', 'Souple']].map(([k, t]) =>
      `<button class="${cfg.corr === k ? 'sel' : ''}" data-act="corr" data-v="${k}">${tr(t)}</button>`).join('')}</div>
    <p class="ref" style="margin:8px 0 0">${tr(corrTxt)}${cfg.corr === 'soft' ? '' : ' ' + tr('La voix ne peut pas vérifier les voyelles.')} ${tr('Les moutoun gardent une correction souple.')}</p>
  </div>`,
    hints: `<div class="card"><h2>${tr('Indices affichés avec le verset à compléter')}</h2>
    <div class="chips">${[['s', 'Sourate / titre du matn'], ['v', 'N° du verset'], ['p', 'N° de page']]
      .map(([k, t]) => `<button class="${cfg.show[k] ? 'sel' : ''}" data-act="show" data-v="${k}">${cfg.show[k] ? '✓ ' : ''}${tr(t)}</button>`).join('')}</div>
  </div>`,
    audio: `<div class="card"><h2>${tr('Audio et objectif')}</h2>
    <div class="row">
      <div><label class="f">${tr('Récitateur')}</label>
        <select id="srec">${RECITERS.map(([id, n]) => `<option value="${id}" ${id === cfg.reciter ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div><label class="f">${tr('Objectif quotidien (réponses)')}</label>
        <select id="sgoal">${[10, 20, 30, 50, 100].map(n => `<option ${n === cfg.goal ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="row" style="margin-top:12px;align-items:end"><div><label class="f">${tr('Rappel quotidien (calendrier)')}</label><input type="time" id="rtime" value="20:00"></div>
      <button data-act="ics">📅 ${tr('Ajouter au calendrier')}</button></div>
  </div>`,
    about: `<details class="card"><summary><h2>${tr("But de l'application")}</h2></summary>
    <p class="ref" style="margin:0">${tr("Tathbīt (تثبيت) sert à consolider ce que tu as déjà mémorisé du Coran et des moutoun : c'est le tathbīt, et non le ḥifẓ (la première mémorisation).")}</p></details>`,
    contents: `<details class="card"><summary><h2>${tr("D'où viennent les contenus ?")}</h2></summary>
    <p class="ref" style="margin:0 0 6px"><b>${tr('Sources citées et vérifiables :')}</b> ${tr('texte du Coran et traductions (Tanzil), tafsīr al-Muyassar, annotation du tajwīd (Islamic Network), moutoun (Wikisource, hadith-api ; Ibn ʿĀshir : deux transcriptions web non officielles), règles des lettres (Wikisource et Wikipédia arabe).')}</p>
    <p class="ref" style="margin:0 0 6px"><b>${tr('Rédigé par une IA, pas une source officielle :')}</b> ${tr("les textes d'explication, les consignes, les noms français des règles, les traductions anglaises et arabes de l'interface et le choix des questions. Ils sont signalés par la mention « 🤖 ». En cas de doute, demande à un enseignant qualifié.")}</p>
    <p class="ref" style="margin:0"><a href="https://github.com/Msake2026/tathbit/blob/main/AUDIT-CONTENU.md" target="_blank" rel="noopener">${tr('Voir le détail de la vérification des contenus')}</a></p></details>`,
    a11y: `<div class="card"><h2>${tr('Accessibilité')}</h2>
    <label class="f" for="sth">${tr('Thème')}</label>
    <select id="sth"><option value="auto" ${!cfg.theme ? 'selected' : ''}>${tr('Automatique (préférence du système)')}</option><option value="light" ${cfg.theme === 'light' ? 'selected' : ''}>${tr('Clair')}</option><option value="dark" ${cfg.theme === 'dark' ? 'selected' : ''}>${tr('Sombre')}</option></select>
    <label class="f" for="shc">${tr('Contraste renforcé des couleurs du tajwīd')}</label>
    <select id="shc"><option value="auto" ${cfg.hc === undefined ? 'selected' : ''}>${tr('Automatique (préférence du système)')}</option><option value="on" ${cfg.hc === true ? 'selected' : ''}>${tr('Oui')}</option><option value="off" ${cfg.hc === false ? 'selected' : ''}>${tr('Non')}</option></select>
    <label class="consent"><input type="checkbox" id="tjp" ${cfg.tjp ? 'checked' : ''}><span>${tr('Ajouter un motif (trait, pointillé…) à chaque règle du tajwīd, en plus de la couleur')}</span></label>
    <p class="ref" style="margin:6px 0 0">${tr("Les couleurs officielles du tajwīd ont un faible contraste sur fond clair (10 règles sur 15 ont une couleur sous la recommandation 4,5:1). Ce réglage les fonce, en gardant la même teinte.")}</p></div>`,
    audioOff: `${audioCard()}`,
    remind: `${remindCard()}`,
    data: `<div class="card"><h2>${tr('Mes données')}</h2>
    <div class="row"><button data-act="export">⬇ ${tr('Exporter ma progression')}</button><button data-act="import">⬆ ${tr('Importer')}</button></div>
    <input type="file" id="impfile" accept="application/json,.json" hidden>
    <label class="f" for="csv-kind">${tr('Exporter pour un tableur (CSV)')}</label>
    <div class="row" style="align-items:end"><select id="csv-kind">${CSVKINDS.map(([id, t]) => `<option value="${id}">${tr(t)}</option>`).join('')}</select><button data-act="csv" style="flex:0 0 auto">⬇ CSV</button></div>
    <p class="ref" style="margin:8px 0 0">${tr('Tout est stocké sur cet appareil. Exporte régulièrement pour ne rien perdre en changeant de téléphone.')}</p>
    <p style="margin:6px 0 0"><button class="link" data-act="reset" style="color:var(--ko)">${tr('Réinitialiser statistiques et historique')}</button></p>
  </div>`,
    app: `<div class="card"><h2>${tr('Application')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr("Version {v}. Une fois installée sur le téléphone, l'application se met à jour toute seule à l'ouverture quand tu es en ligne ; si tu ne vois pas les nouveautés, utilise ce bouton (ta progression n'est pas touchée).", {v: APP_VERSION})}</p>
    <button data-act="upd">🔄 ${tr('Chercher les mises à jour')}</button> <button data-act="news-open">✨ ${tr('Voir les nouveautés')}</button></div>`,
    contact: `<div class="card"><h2>${tr('Contact')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr('Une question, une erreur dans un texte, un problème, une idée : écris-nous.')}</p>
    <button data-act="contact">✉️ ${tr('Nous contacter')}</button></div>`,
    privacy: `<div class="card"><h2>${tr('Confidentialité')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr('Quelles données sont enregistrées, qui les voit, comment les supprimer.')}</p>
    <button data-act="legal">${tr('Lire la confidentialité et les conditions')}</button></div>`,
    sources: `<details class="card"><summary><h2>${tr('Sources')}</h2></summary>
    <p class="ref" style="margin:0">${tr("Coran : texte uthmani du projet Tanzil, embarqué dans le site et vérifié (lecture de Ḥafṣ). Audio : cdn.islamic.network (AlQuran Cloud). Lecteur : tajwīd en couleurs (Islamic Network), traductions (Tanzil : Hamidullah, Saheeh International) et tafsir al-Muyassar (Complexe du Roi Fahd). Moutoun : Wikisource arabe et hadith-api (voir l'écran Réviser pour chaque matn). Versets proches : calculés automatiquement.")}</p>
  </details>`,
  };
  const G = [['account', '👤', 'Compte', 'Connexion, rôle, mot de passe', ['account']], ['learn', '🎓', 'Apprentissage', 'Correction de la saisie, indices', ['corr', 'hints']],
    ['audio', '🔊', 'Audio et rappels', 'Récitateur, objectif, audio hors ligne, rappels', ['audio', 'audioOff', 'remind']], ['display', '🎨', 'Affichage', 'Langue, taille du texte arabe, thème, accessibilité', ['lang', 'arsize', 'a11y']],
    ['data', '💾', 'Données', 'Exporter, importer, effacer', ['data']], ['help', 'ℹ️', 'Aide et infos', 'Mises à jour, contact, confidentialité, sources', ['app', 'contact', 'privacy', 'about', 'contents', 'sources']]];
  const plain = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const q = setQ.trim().toLowerCase(), grp = G.some(g => g[0] === cfg.setTab) || cfg.setTab === 'all' ? cfg.setTab : 'hub';   // « hub » : les 6 blocs d'un coup d'œil (par défaut)
  const cards = G.flatMap(([g, , t, , ids]) => ids.map(id => ({g, id, t, html: C[id]})));
  const shown = q ? cards.filter(c => plain(c.html).includes(q) || tr(c.t).toLowerCase().includes(q)) : grp === 'all' ? cards : cards.filter(c => c.g === grp);
  const nAns = Object.values(stats).reduce((a, v) => a + (v[0] || 0) + (v[1] || 0), 0), nHint = Object.values(cfg.show || {}).filter(Boolean).length;
  const rm = remState(), theme = cfg.theme === 'light' ? tr('Clair') : cfg.theme === 'dark' ? tr('Sombre') : tr('Thème automatique');
  const ST = {   // l'état en cours de chaque bloc, pour le voir sans l'ouvrir
    account: me ? esc(me.user.email) : tr('Pas de compte connecté'),
    learn: tr('Correction : {c}', {c: tr({strict: 'Stricte', standard: 'Standard', soft: 'Souple'}[cfg.corr] || 'Standard')}) + ' · ' + trp(nHint, '{n} indice affiché|{n} indices affichés'),
    audio: esc((RECITERS.find(r => r[0] === cfg.reciter) || [])[1] || cfg.reciter) + ' · ' + tr('Objectif : {n}', {n: cfg.goal}) + ' · ' + (rm.on ? tr('Rappels : {t}', {t: rm.time}) : tr('Rappels : désactivés')),
    display: esc(LANGS[LANG]) + ' · ' + theme + ' · ' + tr('Texte arabe : {p} %', {p: Math.round(100 * (cfg.rdSize || AR_DEF) / AR_DEF)}),
    data: trp(Math.round(nAns), '{n} réponse enregistrée|{n} réponses enregistrées') + ' · ' + trp(errors.length, '{n} erreur|{n} erreurs'),
    help: tr('Version {v}', {v: 'v' + APP_BUILD}) + (newVer && newVer.v > APP_BUILD ? ' · 🆕 ' + tr('mise à jour disponible') : '')};
  const search = `<input type="search" id="set-q" value="${esc(setQ)}" placeholder="${tr('Chercher un réglage…')}" aria-label="${tr('Chercher un réglage…')}" autocomplete="off" style="margin-bottom:8px">`;
  const found = q ? `<p class="ref" style="margin:4px 0 8px">${shown.length ? trp(shown.length, '{n} réglage trouvé|{n} réglages trouvés') : tr('Aucun réglage ne correspond à « {q} ».', {q: esc(setQ.trim())})}</p>` : '';
  const g0 = G.find(g => g[0] === grp);
  if (!q && grp === 'hub') return `
  <h1>${tr('Réglages')}</h1>
  <p class="sub">${tr('Les réglages sont rangés en 6 blocs : touche-en un pour l\'ouvrir, ou cherche un réglage.')}</p>
  ${search}
  <div class="sethub">${G.map(([g, ic, t, d]) => `<button data-act="set-grp" data-v="${g}"><span class="si" aria-hidden="true">${ic}</span><b>${tr(t)}</b><small>${tr(d)}</small><span class="sv${g === 'account' ? ' one' : ''}">${ST[g]}</span></button>`).join('')}</div>
  <p style="text-align:center;margin:6px 0"><button class="link" data-act="set-grp" data-v="all">☰ ${tr('Tout afficher sur une seule page')}</button></p>`;
  return `
  <h1>${tr('Réglages')}</h1>
  ${search}
  ${q ? found : `<div class="top setnav"><button class="link" data-act="set-grp" data-v="hub">← ${tr('Les 6 blocs')}</button><span>${g0 ? g0[1] + ' ' + tr(g0[2]) : '☰ ' + tr('Tout')}</span></div>`}
  ${shown.map(c => c.html).join('\n')}
  ${!q ? `<p style="text-align:center;margin:10px 0"><button class="link" data-act="set-grp" data-v="hub">← ${tr('Les 6 blocs')}</button></p>` : ''}`;
}
const weakHtml = weak => weak.length ? `<h2 style="margin-top:14px">${tr('À retravailler')}</h2>` + weak.map(([s, r, n]) =>
  `<div class="weak"><span>${sname(pk(s + ':1').s)}</span><span>${Math.round(r * 100)} % · ${Math.round(n)} ${tr('rép.')}</span></div>`).join('') : '';

