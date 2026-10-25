/* Tathbīt — Compte (Supabase), nouveautés, premier lancement, contact, confidentialité, espace admin.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- compte (Supabase) : inscription, connexion, synchronisation, espace admin ---------- */
const APP_VERSION = '25 oct. 2026 · v97';
const APP_BUILD = +((/v(\d+)/.exec(APP_VERSION) || [])[1]) || 0;   // numéro de la version qui tourne ; version.json (à jour à chaque publication) donne le dernier numéro publié
let newVer = null, verAt = 0;
function updBannerHtml(){
  if (!newVer || newVer.v <= APP_BUILD) return '';
  return `<div class="card upd" role="status"><h2>🆕 ${tr('Nouvelle version disponible')}</h2>
    <p style="margin:0 0 8px">${tr("Une nouvelle version de Tathbīt est disponible ({v}). Pour la récupérer, touche « Chercher les mises à jour ».", {v: esc(newVer.label)})}</p>
    ${newVer.note ? `<p class="ref" style="margin:0 0 8px">${esc(newVer.note)}</p>` : ''}
    <button class="pri big" data-act="upd">🔄 ${tr('Chercher les mises à jour')}</button></div>`;
}
/* ---------- nouveautés d'une version (news.json, mis à jour à chaque publication) ---------- */
let news = null, newsAt = 0;
const NEWS_GO = {news: () => openNews(), recite: () => frSetup(), moutoun: () => { cfg.scope = {type: 'matn', id: 'ibnachir'}; saveCfg(); go('train'); }, plan: () => go('plan'), contact: () => renderContact(), settings: () => go('settings'), home: () => go('home'), install: () => renderInstall()};
async function loadNews(force){
  if (!force && news && Date.now() - newsAt < 30 * 60e3) return news;
  try { const r = await fetch('news.json?t=' + Date.now(), {cache: 'no-store'}); if (r.ok){ const j = await r.json(); if (j && Array.isArray(j.items)){ news = j; newsAt = Date.now(); } } } catch { /* hors ligne ou fichier absent */ }
  return news;
}
const newsText = o => (o && (o[LANG] || o.fr)) || '';
const newsGo = g => { const f = NEWS_GO[g]; if (f) f(); else go('home'); };
function newsSummary(v){ if (!news || +news.v !== +v) return ''; return news.items.slice(0, 3).map(i => (i.icon || '') + ' ' + esc(newsText(i.title))).join(' · ') + (news.items.length > 3 ? ' …' : ''); }
function newsCardHtml(){ // carte d'accueil : une fois la version installée, résumé des nouveautés (jusqu'à ce qu'on la ferme)
  if (!news || +news.v > APP_BUILD || !news.items.length) return '';
  const seen = store.get('tathbit.newsSeen', null);
  if (seen === null && !Object.keys(stats).length && !Object.keys(days).length){ store.set('tathbit.newsSeen', +news.v); return ''; }   // premier lancement : rien à « découvrir »
  if (seen !== null && +seen >= +news.v) return '';
  return `<div class="card upd" role="status"><h2>✨ ${tr('Nouveautés de la version v{v}', {v: news.v})}</h2><p style="margin:0 0 8px">${newsSummary(news.v)}</p>
    <div class="grades"><button class="pri" data-act="news-open">${tr('Voir les nouveautés')}</button><button data-act="news-dismiss">${tr('Plus tard')}</button></div></div>`;
}
function newsSlot(){ const el = $('news-slot'); if (el) el.innerHTML = newsCardHtml(); }
async function openNews(v){ // une seule nouveauté : on va directement à la fonction ; sinon, l'écran des nouveautés
  await loadNews(); if (!news || !news.items.length) return go('home');
  if (news.items.length === 1) { store.set('tathbit.newsSeen', +news.v); return newsGo(news.items[0].go); }
  renderNews();
}
/* historique : news-history.json = les versions précédentes (la plus récente d'abord) ; la publication y archive les nouveautés de chaque version */
let newsHist = null;
async function loadNewsHist(){
  if (newsHist) return newsHist;
  try { const r = await fetch('news-history.json?t=' + Date.now(), {cache: 'no-store'}); if (r.ok){ const j = await r.json(); if (j && Array.isArray(j.versions)) newsHist = j.versions.filter(x => x && Array.isArray(x.items)); } } catch { /* hors ligne ou fichier absent */ }
  return newsHist;
}
const newsItemHtml = i => `<div class="card"><h2>${i.icon || ''} ${esc(newsText(i.title))}</h2><p style="margin:0 0 8px">${esc(newsText(i.text))}</p>${NEWS_GO[i.go] ? `<button class="pri" data-act="news-go" data-v="${esc(i.go)}">${tr('Essayer')}</button>` : ''}</div>`;
function newsHistHtml(H){
  if (!H) return `<p class="ref" role="status">${tr("Historique indisponible (hors ligne ?).")}</p>`;
  if (!H.length) return '';
  return `<h2 style="margin:18px 0 6px">${tr('Versions précédentes')}</h2>${H.map(x => `<details class="card nhv"><summary><b>v${esc(String(x.v))}</b>${x.date ? ' · ' + esc(new Date(x.date).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'long', year: 'numeric'})) : ''} · ${trp(x.items.length, '{n} nouveauté|{n} nouveautés')}</summary><div style="margin-top:8px">${x.items.map(newsItemHtml).join('')}</div></details>`).join('')}`;
}
function renderNews(){
  setNav(false); screen = 'news'; store.set('tathbit.newsSeen', +news.v);
  $app.innerHTML = `<div class="top"><button class="link" data-act="news-back">${tr('← Retour')}</button><span>${tr('Nouveautés')}</span></div>
    <h1 style="margin-top:8px">✨ ${tr('Nouveautés de la version v{v}', {v: news.v})}</h1>
    <p class="sub">${tr("Touche « Essayer » pour aller directement à la fonction.")} ${AI()}</p>
    ${news.items.map(newsItemHtml).join('')}
    <div id="news-hist">${newsHist ? newsHistHtml(newsHist) : `<p class="ref" role="status">${tr('Chargement…')}</p>`}</div>`;
  window.scrollTo(0, 0);
  if (!newsHist) loadNewsHist().then(H => { const el = $('news-hist'); if (el && screen === 'news') el.innerHTML = newsHistHtml(H); });
}
function updSlot(){ const el = $('upd-slot'); if (el) el.innerHTML = updBannerHtml(); }
async function checkVersion(force){
  if (!navigator.onLine || (!force && Date.now() - verAt < 30 * 60e3)) return; verAt = Date.now();
  try {
    const r = await fetch('version.json?t=' + Date.now(), {cache: 'no-store'}); if (!r.ok) return;
    const j = await r.json();
    if (j && +j.v > APP_BUILD && (!newVer || +j.v > newVer.v)){ newVer = {v: +j.v, label: String(j.label || 'v' + j.v).slice(0, 60), note: ''}; updSlot(); }
  } catch { /* hors ligne ou fichier absent : on réessaiera */ }
}
async function forceUpdate(el){
  if (!navigator.onLine) return alert(tr('Pas de connexion : connecte-toi à internet pour mettre à jour.'));
  el.disabled = true; el.textContent = tr('Mise à jour…');
  try { // vide uniquement les fichiers de l'application en cache : la progression (localStorage) n'est pas touchée
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map(r => r.unregister()));
    await Promise.all((await caches.keys()).map(k => caches.delete(k)));
  } catch {}
  location.reload();
}
const CLOUD = window.TATHBIT_CLOUD || {};
const cloudOn = () => !!(CLOUD.url && CLOUD.anonKey);
let sb = null, me = null, screen = 'tab', loadingMe = false;
let acc = {mode: 'login', msg: '', ok: false, busy: false, resend: '', resendAt: 0, last: '', syncErr: '', d: {email: '', pass: '', pass2: '', consent: false}}; // d : brouillon du formulaire (gardé en mémoire seulement)
let adm = {users: null, q: '', detail: null, msg: '', reqs: []};
const SYNC_KEYS = ['tathbit.cfg', 'tathbit.stats', 'tathbit.sched', 'tathbit.days', 'tathbit.errors', 'tathbit.custom', 'tathbit.plan', 'tathbit.tj', 'tathbit.hf'];
let syncPause = false, pushTimer = null;
const cmeta = () => store.get('tathbit.cloud', {});
const isAdmin = () => !!(me && me.profile && me.profile.role === 'admin');
const REDIRECT = () => location.origin + location.pathname;

cloudDirty = k => {
  if (syncPause || !me || !SYNC_KEYS.includes(k)) return;
  store.set('tathbit.cloud', {...cmeta(), dirty: true});
  clearTimeout(pushTimer); pushTimer = setTimeout(cloudPush, 3000);
};
const PWRULE = () => `<p class="ref" style="margin:4px 0 0">${tr('Règles du mot de passe : 8 caractères minimum, avec au moins une minuscule, une majuscule, un chiffre et un symbole (par exemple ! ? # $ % & *).')}</p>`;
function pwHelp(e, m){ // mot de passe refusé par le serveur : dit précisément ce qui manque (règles réglées dans Supabase, lues dans son message)
  const R = (e && Array.isArray(e.reasons)) ? e.reasons : [], out = [], sep = LANG === 'ar' ? '، ' : ', ';
  const len = /at least (\d+) characters/i.exec(m);
  if (R.includes('length') || len) out.push(tr('Le mot de passe doit faire au moins {n} caractères.', {n: len ? len[1] : 8}));
  const miss = [];
  if (/abcdefghijklmnopqrstuvwxyz/.test(m)) miss.push(tr('une lettre minuscule'));
  if (/ABCDEFGHIJKLMNOPQRSTUVWXYZ/.test(m)) miss.push(tr('une lettre majuscule'));
  if (/0123456789/.test(m)) miss.push(tr('un chiffre'));
  if (/[!@#$%^&*(]/.test(m)) miss.push(tr('un caractère spécial (par exemple ! ? # $ % & *)'));
  if (miss.length) out.push(tr('Le mot de passe doit contenir au moins : {liste}.', {liste: miss.join(sep)}));
  else if (R.includes('characters')) out.push(tr('Le mot de passe doit mélanger lettres minuscules et majuscules, chiffres et un caractère spécial.'));
  if (R.includes('pwned') || /known to be weak|pwned/i.test(m)) out.push(tr('Ce mot de passe est trop courant ou connu (fuites de données) : choisis-en un autre.'));
  return out.join(' ');
}
function friendly(e){
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return tr('E-mail ou mot de passe incorrect.');
  if (/Email not confirmed/i.test(m)) return tr("Confirme d'abord ton e-mail : clique le lien reçu par mail.");
  if (/already registered|already been registered/i.test(m)) return tr('Un compte existe déjà avec cet e-mail : connecte-toi.');
  if (/email rate limit|over_email_send_rate_limit/i.test(m)) return tr("Le site a atteint sa limite d'e-mails pour le moment : réessaie dans une heure, ou préviens l'administrateur.");
  if (/not authorized/i.test(m) && /email/i.test(m)) return tr("L'envoi d'e-mails n'est pas encore ouvert à tout le monde sur ce site : l'administrateur doit brancher un service d'envoi (voir supabase/README.md).");
  if (/sending (confirmation|recovery|magic link|email)|error sending/i.test(m)) return tr("L'e-mail n'a pas pu être envoyé : réessaie plus tard ou préviens l'administrateur.");
  if (/token has expired|otp.*(expired|invalid)|invalid.*(token|otp)/i.test(m)) return tr('Code incorrect ou expiré : demande un nouvel e-mail et utilise le dernier code reçu.');
  if (/rate limit|too many|security purposes/i.test(m)) return tr('Trop de tentatives : réessaie dans quelques minutes.');
  if (/Password should|weak.password|known to be weak|pwned/i.test(m) || (e && Array.isArray(e.reasons) && e.reasons.length)) return pwHelp(e, m) || tr('Mot de passe refusé : choisis-en un plus long, avec majuscules, minuscules, chiffres et un caractère spécial.');
  if (/does not exist|schema cache|Could not find/i.test(m)) return tr("La base n'est pas prête : exécute supabase/schema.sql dans Supabase.");
  if (/Failed to fetch|NetworkError|Load failed|hors ligne|offline/i.test(m)) return tr('Connexion impossible : vérifie ta connexion internet.');
  if (/accès refusé|42501|permission denied|row-level security/i.test(m)) return tr('Action refusée (droits insuffisants).');
  return m || tr('Erreur inconnue.');
}
function loadSupabase(){
  return new Promise((res, rej) => {
    if (window.supabase) return res();
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.min.js';
    sc.integrity = 'sha384-JBR+x8blGwjDRO63aHCGiZMD4VNiTR4ZUGA+N6ZKLf3zNt1fK8IBpcgPaMrxqWBp'; sc.crossOrigin = 'anonymous';
    sc.onload = res; sc.onerror = () => rej(new Error(tr('Bibliothèque de compte indisponible (hors ligne ?)')));
    document.head.appendChild(sc);
  });
}
/* AL:begin — lien reçu par e-mail : Supabase renvoie vers le site avec « #access_token=…&type=signup » (succès) ou « #error=…&error_code=otp_expired&error_description=… » (lien expiré, déjà utilisé ou refusé) */
function authLinkNotice(hash, search){
  const p = new URLSearchParams(String(hash || '').replace(/^#/, '') + '&' + String(search || '').replace(/^\?/, ''));
  const code = p.get('error_code') || p.get('error');
  if (code){ const d = p.get('error_description') || code; return {err: /expired|otp|used|invalid/i.test(code + ' ' + d) ? 'expired' : 'other', detail: d.replace(/\+/g, ' ')}; }
  if (p.get('access_token') || p.get('code') || p.get('token_hash')) return {ok: p.get('type') || 'link'};
  return null;
}
/* AL:end */
const LINK_NOTICE = authLinkNotice(location.hash, location.search);   // lu avant que la bibliothèque de comptes n'efface l'adresse
let homeNotice = '';
let authReady = !cloudOn(); // sans comptes configurés, l'accès est libre ; sinon on attend de savoir si une session existe
async function cloudInit(){
  try { await loadSupabase(); } catch (e){ acc.msg = friendly(e); authReady = true; return home(); }
  sb = window.supabase.createClient(CLOUD.url, CLOUD.anonKey, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}});
  sb.auth.onAuthStateChange((ev, sess) => setTimeout(async () => { // jamais d'appel Supabase directement dans ce rappel
    if (!authReady) return;
    if (ev === 'SIGNED_OUT'){ me = null; refreshAccount(); return; }
    if (ev === 'PASSWORD_RECOVERY'){ await loadMe(sess); acc.mode = 'newpass'; openAccount('newpass'); return; }
    if (sess && ev === 'SIGNED_IN' && !me){ await loadMe(sess); if (me && LINK_NOTICE && LINK_NOTICE.ok === 'signup'){ homeNotice = tr('Adresse e-mail confirmée, bienvenue !'); if (screen === 'tab') home(); } }
  }, 0));
  try { const {data: {session}} = await sb.auth.getSession(); if (session) await loadMe(session); } catch {}
  authReady = true;
  if (LINK_NOTICE && LINK_NOTICE.err){   // lien de confirmation inutilisable : on l'explique au lieu de ne rien afficher
    try { history.replaceState(null, '', location.pathname); } catch { /* sans effet */ }
    acc.ok = false; acc.mode = 'login';
    acc.msg = LINK_NOTICE.err === 'expired' ? tr("Ce lien n'est plus valable : il a déjà été utilisé ou il a expiré (certaines messageries l'ouvrent à ta place pour le vérifier). Connecte-toi avec ton e-mail et ton mot de passe ; si ton adresse n'est pas encore confirmée, demande un nouvel e-mail de confirmation.")
      : tr("Le lien n'a pas pu être validé ({e}). Demande un nouvel e-mail de confirmation.", {e: LINK_NOTICE.detail});
    openAccount('login');
  } else home();
  setTimeout(() => loadNews().then(newsSlot), 2600); setTimeout(checkVersion, 2500); document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
  setTimeout(maybeAutoAudio, 4000); if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', () => setTimeout(maybeAutoAudio, 1500));
}
/* ---------- premier lancement guidé : le but, choisir ses sourates (ou un matn), premier exercice ---------- */
let wz = {i: 0, kind: 'quran', from: 78, to: 114, matn: 'all'};
function welcomeNeeded(){
  if (store.get('tathbit.welcome', 0)) return false;
  if (Object.keys(stats).length || Object.keys(days).length || Object.keys(sched).length || errors.length || plan){ store.set('tathbit.welcome', 1); return false; }   // utilisateur déjà installé : pas de guide
  return true;
}
function welcomeApply(){   // applique le choix de l'écran 2 à la série et à la récitation libre
  const f = +($('wz-from') ? $('wz-from').value : wz.from), t = +($('wz-to') ? $('wz-to').value : wz.to);
  if (wz.kind === 'matn'){ if ($('wz-matn')) wz.matn = $('wz-matn').value; cfg.scope = {type: 'matn', id: wz.matn}; }
  else { wz.from = Math.min(f, t); wz.to = Math.max(f, t); cfg.scope = {type: 'surah', from: wz.from, to: wz.to}; cfg.audFrom = wz.from; cfg.audTo = wz.to; }
  if (cfg.mode === 'ahkam' || catOf(cfg.mode) !== 'memo') cfg.mode = 'mix';
  saveCfg();
}
function welcomeEnd(then){ store.set('tathbit.welcome', 1); if (then) then(); else go('home'); }
function renderWelcome(){
  setNav(false); screen = 'welcome';
  const i = wz.i, dots = [0, 1, 2].map(k => `<span class="wdot${k === i ? ' on' : ''}" aria-hidden="true"></span>`).join('');
  const body = i === 0 ? `<div class="card"><h2>${tr('Le but de Tathbīt')}</h2>
      <p style="margin:0 0 8px">${tr("Tathbīt (تثبيت) sert à consolider ce que tu as déjà mémorisé du Coran et des moutoun : c'est le tathbīt, et non le ḥifẓ (la première mémorisation).")}</p>
      <p class="ref" style="margin:0">${tr("Tu choisis ce que tu connais déjà, l'application te le fait réciter, te montre où tu hésites et te le repose au bon moment.")}</p></div>
      <button class="pri big" data-act="wz-next">${tr('Suivant')}</button>`
    : i === 1 ? `<div class="card"><h2>${tr('Ce que tu veux consolider')}</h2>
      <div class="chips" style="margin-bottom:8px"><button class="${wz.kind === 'quran' ? 'sel' : ''}" data-act="wz-kind" data-v="quran" aria-pressed="${wz.kind === 'quran'}">${tr('Coran')}</button><button class="${wz.kind === 'matn' ? 'sel' : ''}" data-act="wz-kind" data-v="matn" aria-pressed="${wz.kind === 'matn'}">${tr('Moutoun')}</button></div>
      ${wz.kind === 'quran' ? `<div class="row"><div><label class="f" for="wz-from">${tr('De')}</label><select id="wz-from">${surahOpts(wz.from)}</select></div><div><label class="f" for="wz-to">${tr('À')}</label><select id="wz-to">${surahOpts(wz.to)}</select></div></div>
        <p class="ref" style="margin:8px 0 0">${tr("Choisis les sourates que tu sais déjà. Par défaut : de la sourate 78 à la sourate 114.")}</p>`
      : `<label class="f" for="wz-matn">${tr('Matn')}</label><select id="wz-matn">${matnOpts(wz.matn)}</select>
        <p class="ref" style="margin:8px 0 0">${tr("Tu pourras en ajouter d'autres et changer ce choix à tout moment dans « Réviser ».")}</p>`}</div>
      <div class="row"><button data-act="wz-back">${tr('← Retour')}</button><button class="pri" data-act="wz-next">${tr('Suivant')}</button></div>`
    : `<div class="card"><h2>${tr('Ton premier exercice')}</h2>
      <p style="margin:0 0 8px">${tr("Lance une première série de questions sur ce que tu as choisi : suite du verset, mots manquants, choix de la suite…")}</p>
      <p class="ref" style="margin:0">${tr("Chaque jour, « Ma séance du jour » à l'accueil te propose ce qui est à réviser, en une touche.")}</p></div>
      <button class="pri big" data-act="wz-first">${tr('Commencer ma première série')}</button>
      ${SR && wz.kind === 'quran' ? `<button class="big" style="margin-top:8px" data-act="wz-recite">🎙️ ${tr('Plutôt réciter à voix haute')}</button>` : ''}
      <div class="row" style="margin-top:8px"><button data-act="wz-back">${tr('← Retour')}</button><button data-act="wz-skip">${tr("Aller à l'accueil")}</button></div>`;
  $app.innerHTML = `<div class="top"><span>${tr('Bienvenue')} · ${i + 1} / 3</span>${i < 2 ? `<button class="link" data-act="wz-skip">${tr('Passer')}</button>` : '<span></span>'}</div>
    <div class="hero" style="margin-top:8px"><div class="logo"><span class="lg">تثبيت</span></div><div><h1>${tr('Bienvenue sur Tathbīt')}</h1><div class="wdots" role="img" aria-label="${tr('Étape {i} sur {n}', {i: i + 1, n: 3})}">${dots}</div></div></div>
    ${body}`;
  window.scrollTo(0, 0);
}
function welcomeAct(act, v){
  if (act === 'wz-skip') return welcomeEnd();
  if (wz.i === 1) welcomeApply();   // lit les listes avant de quitter l'écran 2
  if (act === 'wz-kind'){ wz.kind = v; return renderWelcome(); }
  if (act === 'wz-next'){ if (wz.i === 1 && wz.kind === 'matn' && $('wz-matn')) wz.matn = $('wz-matn').value; wz.i = Math.min(2, wz.i + 1); if (wz.i === 2) welcomeApply(); return renderWelcome(); }
  if (act === 'wz-back'){ wz.i = Math.max(0, wz.i - 1); return renderWelcome(); }
  if (act === 'wz-first') return welcomeEnd(() => { cfg.tab = 'home'; saveCfg(); start(); });
  if (act === 'wz-recite') return welcomeEnd(() => { cfg.tab = 'home'; saveCfg(); frSetup(); });
}
function renderLoading(){ setNav(false); $app.innerHTML = `<p class="sub" style="margin-top:40vh;text-align:center">${tr('Chargement…')}</p>`; }
function refreshAccount(){
  if (screen === 'legal' || screen === 'contact' || screen === 'news' || screen === 'install') return;
  if (screen === 'account' && me && acc.fromGate){ acc.fromGate = false; return go('home'); } // connexion réussie depuis l'écran d'accueil protégé
  if (screen === 'account') renderAccount(); else if (screen === 'admin') renderAdmin(); else if (screen === 'tab' || !me) home();
}
async function loadMe(sess){
  if (!sess || loadingMe) return; loadingMe = true;
  try {
    const u = sess.user, {data: prof, error} = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
    if (error) throw error;
    if (!prof) throw new Error('relation profiles does not exist (profil introuvable)');
    if (prof.blocked){ await sb.auth.signOut(); me = null; acc.msg = tr('Ce compte est suspendu.'); acc.ok = false; return; }
    me = {user: {id: u.id, email: u.email}, profile: prof}; store.set('tathbit.me', me);
    sb.rpc('touch');
    await cloudSyncOnLogin();
  } catch (e){
    const c = store.get('tathbit.me', null); // hors ligne : on reprend le dernier profil connu de cette session
    if (c && sess && c.user.id === sess.user.id && /Failed to fetch|NetworkError|Load failed/i.test(String(e && e.message))) me = c;
    else { acc.msg = friendly(e); acc.ok = false; }
  }
  finally { loadingMe = false; refreshAccount(); }
}

/* synchronisation : un document JSON par utilisateur */
function snap(){ const c = {...cfg}; delete c.tab; return {v: 1, cfg: c, stats, sched, days, errors, custom, plan, tj: tjs, hf: hfs}; }
const hasLocal = () => Object.keys(stats).length > 0 || errors.length > 0 || custom.length > 0 || !!plan || Object.keys(tjs).length > 0 || Object.keys(hfs).length > 0;
function applyRemote(d){
  syncPause = true;
  try {
    stats = d.stats || {}; sched = d.sched || {}; days = d.days || {}; errors = d.errors || [];
    custom.forEach(t => { delete MT[t.id]; }); custom = d.custom || []; custom.forEach(t => { MT[t.id] = t; });
    if (d.cfg){ const keep = cfg.tab; Object.assign(cfg, d.cfg); cfg.tab = keep; }
    store.set('tathbit.stats', stats); store.set('tathbit.sched', sched); store.set('tathbit.days', days);
    plan = d.plan || null; store.set('tathbit.plan', plan); tjs = d.tj || {}; store.set('tathbit.tj', tjs); hfs = d.hf || {}; store.set('tathbit.hf', hfs);
    store.set('tathbit.errors', errors); store.set('tathbit.custom', custom); saveCfg();
  } finally { syncPause = false; }
}
function mergeData(a, b){ // a = cet appareil, b = compte : on ne perd rien
  const st = {...(b.stats || {})};
  for (const [k, [o, e]] of Object.entries(a.stats || {})){ const x = st[k] || [0, 0]; st[k] = [Math.max(o, x[0]), Math.max(e, x[1])]; }
  const sc = {...(b.sched || {})}; for (const [k, v] of Object.entries(a.sched || {})) if (!sc[k] || v.due > sc[k].due) sc[k] = v;
  const dy = {...(b.days || {})}; for (const [k, n] of Object.entries(a.days || {})) dy[k] = Math.max(n, dy[k] || 0);
  const seen = new Set();
  const er = [...(b.errors || []), ...(a.errors || [])].filter(e => { const id = e.t + ':' + e.k; if (seen.has(id)) return false; seen.add(id); return true; })
    .sort((x, y) => x.t - y.t).slice(-2000);
  const cu = new Map(); [...(b.custom || []), ...(a.custom || [])].forEach(t => cu.set(t.id, t));
  let pl = b.plan || a.plan || null; // plan : on garde celui du compte et on y ajoute les portions apprises ailleurs
  if (b.plan && a.plan){ const seenC = new Set((b.plan.log || []).map(c => [c.d, c.s, c.a, c.b].join())); pl = {...b.plan, log: [...(b.plan.log || []), ...(a.plan.log || []).filter(c => !seenC.has([c.d, c.s, c.a, c.b].join()))]}; }
  const tj = {...(b.tj || {})}; for (const [k, [o, e]] of Object.entries(a.tj || {})){ const x = tj[k] || [0, 0]; tj[k] = [Math.max(o, x[0]), Math.max(e, x[1])]; }
  const hf = {...(b.hf || {})}; for (const [k, [o, e]] of Object.entries(a.hf || {})){ const x = hf[k] || [0, 0]; hf[k] = [Math.max(o, x[0]), Math.max(e, x[1])]; }
  return {...b, cfg: a.cfg || b.cfg, stats: st, sched: sc, days: dy, errors: er, custom: [...cu.values()], plan: pl, tj, hf};
}
async function cloudPush(){
  if (!me || !sb) return;
  try {
    const t = new Date().toISOString();
    const {error} = await sb.from('user_data').upsert({user_id: me.user.id, data: snap(), updated_at: t});
    if (error) throw error;
    store.set('tathbit.cloud', {uid: me.user.id, t, dirty: false}); acc.last = t; acc.syncErr = '';
  } catch (e){ acc.syncErr = friendly(e); }
  if (screen === 'account') renderAccount();
}
async function cloudSyncOnLogin(){
  const meta = cmeta(), uid = me.user.id;
  const {data: remote, error} = await sb.from('user_data').select('data,updated_at').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  const stamp = () => { acc.last = new Date().toISOString(); store.set('tathbit.cloud', {uid, t: acc.last, dirty: false}); };
  if (!remote){ if (hasLocal()) await cloudPush(); else stamp(); return; }
  if (meta.uid === uid){
    if (meta.dirty) await cloudPush();                                                // modifications locales non envoyées : elles gagnent
    else if (!meta.t || Date.parse(remote.updated_at) > Date.parse(meta.t)){ applyRemote(remote.data); stamp(); }
    else acc.last = meta.t;
  } else if (!hasLocal()){ applyRemote(remote.data); stamp(); }
  else { applyRemote(mergeData(snap(), remote.data)); await cloudPush(); acc.msg = tr('La progression de cet appareil a été fusionnée avec celle de ton compte.'); acc.ok = true; }
}

/* écran Compte */
function accountCard(){
  if (!cloudOn()) return `<div class="card"><h2>${tr('Compte')}</h2><p class="ref" style="margin:0 0 8px">${tr('Les comptes ne sont pas encore activés sur ce site.')}</p><button data-act="acc-open">${tr('En savoir plus')}</button></div>`;
  if (me) return `<div class="card"><h2>${tr('Compte')}</h2><p style="margin:0 0 8px">${tr('Connecté :')} <b>${esc(me.user.email)}</b> ${isAdmin() ? `<span class="ref">· ${tr('administrateur')}</span>` : ''}</p>
    <div class="row"><button data-act="acc-open">${tr('Mon compte')}</button>${isAdmin() ? `<button class="pri" data-act="adm-open">🛡 ${tr('Espace admin')}</button>` : ''}</div></div>`;
  return `<div class="card"><h2>${tr('Compte')}</h2><p class="ref" style="margin:0 0 8px">${tr('Sauvegarde ta progression et retrouve-la sur tous tes appareils.')}</p>
    <div class="row"><button class="pri" data-act="acc-open" data-v="signup">${tr('Créer un compte')}</button><button data-act="acc-open" data-v="login">${tr('Se connecter')}</button></div></div>`;
}
function openAccount(mode){ if (mode) acc.mode = mode; if (!me && acc.mode === 'newpass') acc.mode = 'login'; renderAccount(); window.scrollTo(0, 0); if (me) tchLoadStudent(); }
function renderAccount(){
  setNav(false); screen = 'account';
  const dk = {'ac-email': 'email', 'ac-pass': 'pass', 'ac-pass2': 'pass2'};
  const inp = (id, type, ac, extra) => `<input id="${id}" type="${type}" autocomplete="${ac}" value="${esc(acc.d[dk[id]] || '')}" ${extra}>`;
  const f = (id, label, type, ac, extra = '') => `<label class="f" for="${id}">${label}</label>` + (type === 'password'
    ? `<div class="pw">${inp(id, type, ac, extra)}<button type="button" class="eye" data-act="pw-eye" data-v="${id}" aria-label="${tr('Afficher le mot de passe')}" aria-pressed="false">${EYE}</button></div>`
    : inp(id, type, ac, extra));
  let body;
  if (!cloudOn()) body = `<div class="card"><h2>${tr('Comptes non activés')}</h2><p class="sub" style="margin:0">${tr("Le propriétaire du site doit encore relier une base Supabase (voir <code>supabase/README.md</code> dans le dépôt). Ta progression reste pour l'instant sur cet appareil.")}</p></div>`;
  else if (!sb) body = `<div class="card"><p class="sub" style="margin:0 0 10px">${esc(acc.msg || tr('Chargement…'))}</p><button class="pri" onclick="location.reload()">${tr('Réessayer')}</button></div>`;
  else if (me){
    body = `<div class="card"><h2>${esc(me.user.email)}</h2>
      <p style="margin:0 0 6px">${roleChips()}</p>
      <p class="ref" style="margin:0 0 4px">${tr('inscrit le {d}', {d: esc(new Date(me.profile.created_at).toLocaleDateString(LOCALE()))})}</p>
      ${isStudent() && (tch.links || []).length ? `<p class="ref" style="margin:0 0 4px">${tr('Mes enseignants :')} ${(tch.links || []).map(x => esc(x.email)).join(', ')}</p>` : ''}
      ${isTeacher() ? `<p class="ref" style="margin:0 0 4px">${tr('Tu peux suivre des élèves (onglet Enseignant).')}</p>` : isAdmin() ? `<p class="ref" style="margin:0 0 4px">${tr("Tu administres le site (ni élève, ni enseignant).")}</p>` : !isStudent() ? `<p class="ref" style="margin:0 0 4px">${tr("Tu n'es ni élève ni enseignant : invite un enseignant ou demande à en devenir un plus bas.")}</p>` : ''}
      <p class="ref" style="margin:0 0 10px">${acc.last ? tr('Dernière synchronisation :') + ' ' + fdate(Date.parse(acc.last)) : tr('Synchronisation automatique active')}${acc.syncErr ? ' · <span style="color:var(--ko)">' + esc(acc.syncErr) + '</span>' : ''}</p>
      <div class="row"><button class="pri" data-act="acc-sync">🔄 ${tr('Synchroniser maintenant')}</button>${isAdmin() ? `<button data-act="adm-open">🛡 ${tr('Espace admin')}</button>` : ''}</div></div>
      ${flashHtml()}
      ${tchStudentCard()}
      ${roleCard()}
      ${wkCard()}
      <div class="card"><h2>${tr('Mot de passe')}</h2>${f('ac-pass', tr('Nouveau mot de passe (8 caractères minimum)'), 'password', 'new-password', 'data-enter="ac-go"')}${PWRULE()}
      <button id="ac-go" class="pri" style="margin-top:8px" data-act="acc-newpass">${tr('Changer le mot de passe')}</button></div>
      <div class="card"><h2>${tr('Confidentialité')}</h2><p class="ref" style="margin:0">${tr("Sont enregistrés : ton e-mail, ta date d'inscription, ta dernière activité et ta progression (statistiques, erreurs, historique). L'administrateur du site peut les consulter. Tu peux tout supprimer à tout moment.")}</p>
      <p style="margin:10px 0 0"><button class="link" data-act="legal">${tr('Confidentialité et conditions')}</button> · <button class="link" data-act="contact">${tr('Contact')}</button></p>
      <p style="margin:10px 0 0"><button class="link" data-act="acc-delete" style="color:var(--ko)">${tr('Supprimer mon compte et mes données')}</button></p></div>
      <button class="big" data-act="acc-logout">${tr('Se déconnecter')}</button>`;
  } else if (acc.mode === 'newpass'){
    body = `<div class="card"><h2>${tr('Nouveau mot de passe')}</h2>${f('ac-pass', tr('Mot de passe (8 caractères minimum)'), 'password', 'new-password', 'data-enter="ac-go"')}${PWRULE()}
      <button id="ac-go" class="pri big" style="margin-top:10px" data-act="acc-newpass">${tr('Enregistrer')}</button></div>`;
  } else {
    const su = acc.mode === 'signup', rs = acc.mode === 'reset';
    body = `<div class="seg" style="margin-bottom:10px"><button class="${!su && !rs ? 'sel' : ''}" data-act="acc-mode" data-v="login">${tr('Connexion')}</button>
      <button class="${su ? 'sel' : ''}" data-act="acc-mode" data-v="signup">${tr('Créer un compte')}</button></div>
      <div class="card"><h2>${su ? tr('Créer un compte') : rs ? tr('Mot de passe oublié') : tr('Se connecter')}</h2>
      ${f('ac-email', tr('Adresse e-mail'), 'email', 'email', `data-enter="ac-go"`)}
      ${rs ? '' : f('ac-pass', su ? tr('Mot de passe (8 caractères minimum)') : tr('Mot de passe'), 'password', su ? 'new-password' : 'current-password', 'data-enter="ac-go"')}${su ? PWRULE() : ''}
      ${su ? f('ac-pass2', tr('Confirmer le mot de passe'), 'password', 'new-password', 'data-enter="ac-go"')
        + `<label class="consent"><input type="checkbox" id="ac-consent" ${acc.d.consent ? 'checked' : ''}>
        <span>${tr("J'accepte que mon e-mail et ma progression soient enregistrés pour la synchronisation, et consultables par l'administrateur du site.")}</span></label>` : ''}
      <button id="ac-go" class="pri big" style="margin-top:12px" data-act="${su ? 'acc-signup' : rs ? 'acc-reset' : 'acc-login'}">${su ? tr('Créer mon compte') : rs ? tr('Envoyer le lien') : tr('Me connecter')}</button>
      ${!su && !rs ? `<p style="margin:10px 0 0;text-align:center"><button class="link" data-act="acc-mode" data-v="reset">${tr('Mot de passe oublié ?')}</button></p>` : ''}
      ${rs ? `<p style="margin:10px 0 0;text-align:center"><button class="link" data-act="acc-mode" data-v="login">${tr('← Retour à la connexion')}</button></p>` : ''}</div>
      <p style="text-align:center"><button class="link" data-act="legal">${tr('Confidentialité et conditions')}</button> · <button class="link" data-act="contact">${tr('Contact')}</button></p>`;
  }
  const gate = cloudOn() && !me; acc.fromGate = gate;
  const langBar = `<div class="langs">${Object.entries(LANGS).map(([k, n]) => `<button class="${LANG === k ? 'sel' : ''}" data-act="lang" data-v="${k}" lang="${k}">${n}</button>`).join('')}</div>`;
  $app.innerHTML = `${gate ? langBar : `<div class="top"><button class="link" data-act="acc-back">${tr('← Retour')}</button><span>${tr('Compte')}</span></div>`}
    ${gate ? `<div class="hero" style="margin-top:8px"><div class="logo"><span class="lg">تثبيت</span></div><div><h1>Tathbīt</h1><p class="tag">${tr('Coran et moutoun')}</p><p>${tr("Crée un compte ou connecte-toi pour accéder à l'application.")}</p><p class="ref" style="margin:2px 0 0">${tr('Consolider ce que tu as déjà mémorisé (tathbīt), pas le mémoriser pour la première fois (ḥifẓ).')}</p></div></div>` : `<h1 style="margin-top:8px">${tr('Mon compte')}</h1>`}
    ${acc.msg && cloudOn() && sb ? `<div id="acc-msg" class="fb ${acc.ok ? 'ok' : 'ko'}">${esc(acc.msg)}</div>` : ''}
    ${acc.resend && !me && sb && !acc.mode.startsWith('newp') ? `<div class="card"><h2>🔢 ${tr("J'ai un code de confirmation")}</h2>
      <p class="ref" style="margin:0 0 6px">${tr("Le message de confirmation contient aussi un code. S'il est classé dans les indésirables, ses liens ne sont pas cliquables : ouvre-le, touche « Ce n'est pas du spam » (les liens redeviennent cliquables), ou tape le code ici.")}</p>
      ${f('ac-code', tr('Code reçu par e-mail'), 'text', 'one-time-code', 'inputmode="numeric" maxlength="12" data-enter="ac-codego"')}
      <button id="ac-codego" class="pri" style="margin-top:8px" data-act="acc-code">${tr('Valider le code')}</button></div>
    <p style="margin:0 0 10px;text-align:center"><button class="link" data-act="acc-resend">✉ ${tr("Renvoyer l'e-mail de confirmation")}</button></p>` : ''}${body}`;
  clearTimeout(msgTimer);
  if (acc.msg && acc.auto) msgTimer = setTimeout(clearMsg, 3500); // « Déconnecté. », « Synchronisé. »… disparaissent seuls
}
let msgTimer = null;
function clearMsg(){ acc.msg = ''; acc.auto = false; const m = $('acc-msg'); if (m) m.remove(); }
$app.addEventListener('change', e => { if (e.target.id === 'tch-reply-to'){ tch.chatWith = e.target.value; chatPaint(chatHtml(chThread(), m => m.from_student, true)); chatBottom(); } if (e.target.id === 'tch-gs' && $('tch-ge') && +$('tch-ge').value < +e.target.value) $('tch-ge').value = e.target.value;
  if (e.target.id === 'tch-sort'){ tch.sort = e.target.value; tchRefresh(); } if (e.target.id === 'wk-on') wkToggle(e.target.checked); if (e.target.id === 'upd-mail') updToggle(e.target.checked); if (e.target.id === 'rem-two') $('rem-time2').disabled = !e.target.checked; if (e.target.id === 'tjp'){ cfg.tjp = e.target.checked; saveCfg(); applyA11y(); }
  if (e.target.id === 'aud-auto'){ cfg.audAuto = e.target.checked; saveCfg(); if (cfg.audAuto) maybeAutoAudio(); } });
$app.addEventListener('input', () => { if (screen === 'account' && acc.msg && acc.ok) clearMsg(); }); // un message de confirmation s'efface dès qu'on tape
const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.1M6.5 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const val = id => ($(id)?.value || '').trim();
const okEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
async function busy(fn){ if (acc.busy) return; acc.busy = true; acc.msg = ''; acc.auto = false; try { await fn(); acc.d.pass = acc.d.pass2 = ''; acc.d.consent = false; } catch (e){ acc.msg = friendly(e); acc.ok = false; } finally { acc.busy = false; if (screen === 'account') renderAccount(); } }
const keepEmail = () => { acc.d = {email: val('ac-email') || acc.d.email, pass: $('ac-pass')?.value ?? acc.d.pass, pass2: $('ac-pass2')?.value ?? acc.d.pass2, consent: !!$('ac-consent')?.checked}; };
const doLogin = () => busy(async () => {
  keepEmail(); const email = val('ac-email'), password = $('ac-pass').value;
  if (!okEmail(email) || !password) throw new Error(tr('Indique ton e-mail et ton mot de passe.'));
  const {data, error} = await sb.auth.signInWithPassword({email, password});
  if (error){ if (/not confirmed/i.test(error.message || '')) acc.resend = email; throw error; }
  acc.resend = '';
  await loadMe(data.session);
});
const doSignup = () => busy(async () => {
  keepEmail(); const email = val('ac-email'), pw = $('ac-pass').value;
  if (!okEmail(email)) throw new Error(tr('Adresse e-mail invalide.'));
  if (pw.length < 8) throw new Error(tr('Le mot de passe doit faire 8 caractères au moins.'));
  if (pw !== $('ac-pass2').value) throw new Error(tr('Les deux mots de passe ne correspondent pas.'));
  if (!$('ac-consent').checked) throw new Error(tr("Coche la case pour accepter l'enregistrement de tes données."));
  const {data, error} = await sb.auth.signUp({email, password: pw, options: {emailRedirectTo: REDIRECT()}}); if (error) throw error;
  if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error(tr('Un compte existe déjà avec cet e-mail : connecte-toi.'));
  if (data.session){ await loadMe(data.session); acc.msg = tr('Compte créé.'); acc.ok = true; return; }
  acc.mode = 'login'; acc.ok = true; acc.resend = email;
  acc.msg = tr('Compte créé. Un e-mail de confirmation a été envoyé à {email} : clique le lien ou tape le code, puis connecte-toi.', {email}) + ' ' + tr('Regarde aussi dans les courriers indésirables.');
});
const doCode = () => busy(async () => { // confirmation par code (le lien du message peut être désactivé quand il est classé en indésirable)
  const code = (val('ac-code') || '').replace(/\s+/g, ''); if (!/^\d{6,10}$/.test(code)) throw new Error(tr('Le code contient 6 à 10 chiffres.'));
  if (!okEmail(acc.resend)) throw new Error(tr('Adresse e-mail invalide.'));
  const {data, error} = await sb.auth.verifyOtp({email: acc.resend, token: code, type: 'signup'}); if (error) throw error;
  acc.resend = ''; acc.ok = true;
  if (data && data.session){ await loadMe(data.session); acc.msg = tr('E-mail confirmé : bienvenue !'); } else { acc.mode = 'login'; acc.msg = tr('E-mail confirmé : connecte-toi.'); }
});
const doResend = () => busy(async () => {
  const wait = Math.ceil((acc.resendAt + 60000 - Date.now()) / 1000);
  if (wait > 0) throw new Error(tr('Patiente {s} secondes avant de redemander un e-mail.', {s: wait}));
  if (!okEmail(acc.resend)) throw new Error(tr('Adresse e-mail invalide.'));
  const {error} = await sb.auth.resend({type: 'signup', email: acc.resend, options: {emailRedirectTo: REDIRECT()}}); if (error) throw error;
  acc.resendAt = Date.now(); acc.ok = true; acc.msg = tr('E-mail de confirmation renvoyé à {email}. Regarde aussi dans les courriers indésirables.', {email: acc.resend});
});
const doReset = () => busy(async () => {
  keepEmail(); const email = val('ac-email'); if (!okEmail(email)) throw new Error(tr('Adresse e-mail invalide.'));
  const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: REDIRECT()}); if (error) throw error;
  acc.mode = 'login'; acc.ok = true; acc.msg = tr("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
});
const doNewPass = () => busy(async () => {
  const pw = $('ac-pass').value; if (pw.length < 8) throw new Error(tr('Le mot de passe doit faire 8 caractères au moins.'));
  const {error} = await sb.auth.updateUser({password: pw}); if (error) throw error;
  acc.mode = 'login'; acc.ok = true; acc.auto = true; acc.msg = tr('Mot de passe mis à jour.');
});
const doSync = () => busy(async () => { await cloudSyncOnLogin(); await cloudPush(); if (!acc.syncErr){ acc.ok = true; acc.auto = true; acc.msg = tr('Synchronisé.'); } });
const doLogout = async () => {
  if (!confirm(tr('Te déconnecter ? La progression de cet appareil sera effacée (elle reste dans ton compte).'))) return;
  clearTimeout(pushTimer); await cloudPush();
  if (remState().on) await pushDrop();
  if (acc.syncErr && !confirm(tr('La dernière synchronisation a échoué : te déconnecter perdra les changements non envoyés. Continuer ?'))) return;
  await sb.auth.signOut(); me = null; try { localStorage.removeItem('tathbit.me'); } catch {}
  syncPause = true; stats = {}; sched = {}; days = {}; errors = []; plan = null; tjs = {}; hfs = {}; custom.forEach(t => { delete MT[t.id]; }); custom = [];
  ['tathbit.stats', 'tathbit.sched', 'tathbit.days', 'tathbit.errors', 'tathbit.custom', 'tathbit.plan', 'tathbit.tj', 'tathbit.hf', 'tathbit.cloud'].forEach(k => { try { localStorage.removeItem(k); } catch {} });
  syncPause = false; acc.msg = tr('Déconnecté.'); acc.ok = true; acc.auto = true; acc.mode = 'login'; renderAccount();
};
const doDeleteMe = () => busy(async () => {
  if (!confirm(tr('Supprimer définitivement ton compte et ta progression enregistrée ? Cette action est irréversible.'))) return;
  const {error} = await sb.rpc('delete_me'); if (error) throw error;
  await sb.auth.signOut(); me = null; try { localStorage.removeItem('tathbit.cloud'); localStorage.removeItem('tathbit.me'); } catch {}
  acc.mode = 'login'; acc.ok = true; acc.msg = tr('Compte supprimé. La progression de cet appareil est conservée.');
});

