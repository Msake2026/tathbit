/* Tathbīt — Audio hors ligne, rappels (Web Push), cloche, conversation enseignant-élève.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- audio hors ligne : sourates téléchargées dans le cache de l'appareil (lues ensuite sans connexion) ---------- */
const AUDIO_CACHE = 'tathbit-audio-v1';
let audioUI = {plan: null, busy: false, ctl: null};
const audioSurahs = () => { const a = Math.min(cfg.audFrom, cfg.audTo), b = Math.max(cfg.audFrom, cfg.audTo); return Array.from({length: b - a + 1}, (_, i) => a + i); };
const audioOk = () => 'caches' in window && 'serviceWorker' in navigator && !!AU_EA[cfg.reciter];
function audioCard(){
  const rec = cfg.reciter, got = audioSet(rec), list = Object.keys(got).map(Number).sort((a, b) => a - b), total = list.reduce((t, s) => t + auEntry(got[s]).b, 0), P = audioUI.plan, hasHQ = !!AU_EA128[rec], q = auQ(rec, cfg.audQ);
  const name = (RECITERS.find(x => x[0] === rec) || RECITERS[0])[1];
  if (!audioOk()) return `<div class="card"><h2>${tr('Audio hors ligne')}</h2><p class="ref" style="margin:0">${tr("Ce navigateur ou ce récitateur ne permet pas le téléchargement hors ligne.")}</p></div>`;
  return `<div class="card"><h2>${tr('Audio hors ligne')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr("Télécharge des sourates pour les écouter sans connexion (métro, avion). L'audio est lourd : choisis peu de sourates et un plafond de taille. Récitateur : {r} (celui choisi ci-dessus).", {r: esc(name)})}</p>
    <div class="row"><div><label class="f" for="aud-from">${tr('De la sourate')}</label><select id="aud-from">${surahOpts(cfg.audFrom)}</select></div>
      <div><label class="f" for="aud-to">${tr('À la sourate')}</label><select id="aud-to">${surahOpts(cfg.audTo)}</select></div></div>
    <div class="row"><div><label class="f" for="aud-q">${tr('Qualité')}</label><select id="aud-q"><option value="64" ${q === 64 ? 'selected' : ''}>${tr('64 kbps (léger)')}</option>${hasHQ ? `<option value="128" ${q === 128 ? 'selected' : ''}>${tr('128 kbps (qualité, 3 fois plus lourd)')}</option>` : ''}</select>
      ${hasHQ ? '' : `<p class="ref" style="margin:4px 0 0">${tr('Ce récitateur n\'existe qu\'en 64 kbps pour le téléchargement.')}</p>`}</div></div>
    <div class="row" style="align-items:end"><div><label class="f" for="aud-cap">${tr('Taille maximale')}</label><select id="aud-cap">${[50, 100, 200, 500].map(n => `<option value="${n}" ${n === cfg.audCap ? 'selected' : ''}>${n} Mo</option>`).join('')}</select></div>
      <button data-act="aud-scope">${tr('Utiliser ma portée')}</button></div>
    <div class="row" style="margin-top:10px"><button data-act="aud-est" ${audioUI.busy ? 'disabled' : ''}>${tr('Calculer la taille')}</button>
      <button class="pri" data-act="aud-dl" ${!P || !P.take.length || audioUI.busy ? 'disabled' : ''}>${ic('download')} ${P && P.take.length ? tr('Télécharger ({n})', {n: auMo(P.used)}) : tr('Télécharger')}</button></div>
    ${plan ? `<div class="row" style="margin-top:10px"><button data-act="aud-plan" ${audioUI.busy ? 'disabled' : ''}>${ic('calendar')} ${tr("Télécharger l'audio du plan du jour")}</button></div>
      <label class="consent"><input type="checkbox" id="aud-auto" ${cfg.audAuto ? 'checked' : ''} ${navigator.connection && navigator.connection.type !== undefined ? '' : 'disabled'}><span>${tr('Télécharger automatiquement le plan du jour quand je suis en Wi-Fi')}</span></label>
      ${navigator.connection && navigator.connection.type !== undefined ? '' : `<p class="ref" style="margin:0">${tr("Ce navigateur ne permet pas de savoir si tu es en Wi-Fi (c'est le cas de l'iPhone) : utilise le bouton ci-dessus quand tu es en Wi-Fi.")}</p>`}` : ''}
    <div class="goal" style="margin-top:8px"><i id="aud-bar" style="width:0%"></i></div>
    <p class="ref" id="aud-msg" style="margin:6px 0 0" aria-live="polite">${P ? audioPlanText(P) : ''}</p>
    ${audioUI.busy ? `<button class="link" data-act="aud-cancel">${tr('Annuler')}</button>` : ''}
    ${list.length ? `<h3 style="margin:14px 0 4px;font-size:1rem">${tr('Sur cet appareil')} · ${auMo(total)}</h3>${list.map(s => `<div class="weak"><span>${s}. ${esc(SN(s))}</span><span>${auMo(auEntry(got[s]).b)} · ${auEntry(got[s]).q} kbps <button class="link" data-act="aud-del" data-v="${s}" aria-label="${tr('Supprimer')}">🗑</button></span></div>`).join('')}
      <button class="link" style="margin-top:6px;color:var(--ko)" data-act="aud-delall">${tr('Tout supprimer')}</button>` : ''}
    <p class="ref" id="aud-space" style="margin:8px 0 0"></p>
    <p class="ref" style="margin:6px 0 0">${tr("Les fichiers viennent d'everyayah.com et restent sur ton appareil. Le système peut les effacer si l'espace manque : retélécharge-les alors.")} <a href="https://everyayah.com/" target="_blank" rel="noopener">everyayah.com</a></p></div>`;
}
const audioPlanText = P => `${tr('Estimation : {s} sourates, environ {m}.', {s: P.take.length + P.skip.length, m: auMo(P.used + P.skipBytes)})}${P.skip.length ? ' ' + tr('Plafond atteint : {n} sourate(s) ne tiendraient pas et sont laissées de côté.', {n: P.skip.length}) : ''}`;
function audioSpace(){ const e = $('aud-space'); if (!e || !(navigator.storage && navigator.storage.estimate)) return;
  navigator.storage.estimate().then(x => { if ($('aud-space') && x.quota) $('aud-space').textContent = tr('Espace utilisé : {u} sur environ {q} disponibles.', {u: auMo(x.usage || 0), q: auMo(x.quota)}); }).catch(() => {}); }
function audioScope(){ // sourates de la portée actuelle
  const ss = [...new Set(buildPool(cfg.scope.type === 'matn' ? DEF.scope : cfg.scope).map(r => r.s))].sort((a, b) => a - b);
  if (ss.length){ cfg.audFrom = ss[0]; cfg.audTo = ss[ss.length - 1]; saveCfg(); audioUI.plan = null; home(); }
}
const audioMsg = (t, ok) => { const e = $('aud-msg'); if (e){ e.textContent = t; e.style.color = ok === false ? 'var(--ko)' : ''; } };
async function audioCompute(ss){ // taille estimée (6 fichiers mesurés, puis proportion au nombre de lettres) et sourates qui tiennent dans le plafond
  const rec = cfg.reciter, q = auQ(rec, cfg.audQ), chars = ss.map(s => Q[s - 1].a.reduce((t, v) => t + auChars(v.t), 0)), all = ss.flatMap(s => Q[s - 1].a.map((v, i) => ({s, a: i + 1, c: auChars(v.t)})));
  const pick = Array.from({length: Math.min(6, all.length)}, (_, i) => all[Math.floor((i + 0.5) * all.length / Math.min(6, all.length))]);
  const samples = await Promise.all(pick.map(async x => { const r = await fetch(auUrl(rec, x.s, x.a, q), {method: 'HEAD', mode: 'cors'}); if (!r.ok) throw new Error('HTTP ' + r.status);
    return {bytes: +r.headers.get('content-length'), chars: x.c}; }));
  if (samples.some(x => !x.bytes)) throw new Error('taille inconnue');
  const items = ss.map((s, i) => ({s, bytes: auEstimate(samples, chars[i])})), plan = auPlan(items, cfg.audCap * 1e6);
  plan.skipBytes = items.filter(x => plan.skip.includes(x.s)).reduce((t, x) => t + x.bytes, 0); plan.items = items;
  return plan;
}
async function audioEst(){
  audioMsg(tr('Calcul…'));
  try { audioUI.plan = await audioCompute(audioSurahs()); home(); }
  catch (e){ audioMsg(tr('Impossible de calculer la taille ({e}). Vérifie ta connexion.', {e: e.message}), false); }
}
async function audioPlanToday(auto){ // télécharge l'audio des sourates du plan du jour (bouton, ou automatiquement en Wi-Fi)
  if (!plan || audioUI.busy || !audioOk()) return;
  const need = auMissing(auPlanSurahs(planToday()), audioSet(cfg.reciter));
  if (!need.length){ if (!auto) audioMsg(tr("L'audio du plan du jour est déjà sur cet appareil."), true); return; }
  try {
    const P = await audioCompute(need);
    if (!P.take.length){ if (!auto) audioMsg(tr('Plafond atteint : {n} sourate(s) ne tiendraient pas et sont laissées de côté.', {n: P.skip.length}), false); return; }
    if (!auto && !confirm(tr('Télécharger {n} sourate(s) du plan du jour (environ {m}) ?', {n: P.take.length, m: auMo(P.used)}))) return;
    audioUI.plan = P; await audioGo();
  } catch (e){ if (!auto) audioMsg(tr('Impossible de calculer la taille ({e}). Vérifie ta connexion.', {e: e.message}), false); }
}
function maybeAutoAudio(){ // une fois par jour et par récitateur, seulement si le navigateur confirme le Wi-Fi
  if (!cfg.audAuto || !plan || audioUI.busy || !audioOk() || !auWifi(navigator.connection)) return;
  const k = today() + cfg.reciter, last = store.get('tathbit.audioAuto', '');
  if (last === k && !auMissing(auPlanSurahs(planToday()), audioSet(cfg.reciter)).length) return;
  store.set('tathbit.audioAuto', k); audioPlanToday(true);
}
async function audioGo(){
  const rec = cfg.reciter, q = auQ(rec, cfg.audQ), P = audioUI.plan; if (!P || !P.take.length || audioUI.busy) return;
  audioUI.busy = true; audioUI.ctl = new AbortController(); const sig = audioUI.ctl.signal; home();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch {}
  const cache = await caches.open(AUDIO_CACHE), cap = cfg.audCap * 1e6, sum = () => Object.values(audioSet(rec)).reduce((t, x) => t + auEntry(x).b, 0);
  const totalV = P.take.reduce((t, s) => t + Q[s - 1].a.length, 0); let doneV = 0, stopped = '';
  try {
    for (const s of P.take){
      const urls = Q[s - 1].a.map((_, i) => auUrl(rec, s, i + 1, q)); let bytes = 0, old = audioSet(rec)[s] ? auEntry(audioSet(rec)[s]) : null;
      try {
        for (let i = 0; i < urls.length; i += 3){
          await Promise.all(urls.slice(i, i + 3).map(async u => {
            let b = null, hit = await cache.match(u);
            if (hit) b = await hit.blob();
            else { const r = await fetch(u, {mode: 'cors', signal: sig}); if (!r.ok) throw new Error('HTTP ' + r.status); b = await r.blob(); await cache.put(u, new Response(b, {headers: {'Content-Type': 'audio/mpeg'}})); }
            bytes += b.size; doneV++;
          }));
          if (sum() + bytes > cap * 1.1) throw Object.assign(new Error('plafond'), {cap: true});   // plus gros que prévu : on s'arrête proprement
          const bar = $('aud-bar'); if (bar) bar.style.width = Math.round(100 * doneV / totalV) + '%';
          audioMsg(tr('Téléchargement… {a} / {b} versets', {a: doneV, b: totalV}));
        }
        audioOff[rec] = {...audioSet(rec), [s]: {b: bytes, q}}; store.set('tathbit.audio', audioOff);
        if (old && old.q !== q) await Promise.all(Q[s - 1].a.map((_, i) => cache.delete(auUrl(rec, s, i + 1, old.q)).catch(() => {})));   // l'autre qualité n'est plus utile
      } catch (e){ await Promise.all(urls.map(u => cache.delete(u).catch(() => {}))); throw e; }   // sourate incomplète : on ne garde rien
    }
    stopped = 'ok';
  } catch (e){ stopped = e.cap ? 'cap' : sig.aborted ? 'cancel' : 'err:' + e.message; }
  audioUI.busy = false; audioUI.ctl = null; audioUI.plan = null; home();
  audioMsg(stopped === 'ok' ? tr('Terminé : disponible sans connexion.') : stopped === 'cap' ? tr('Plafond de taille atteint : la sourate en cours n\'a pas été gardée.') : stopped === 'cancel' ? tr('Téléchargement annulé.') : tr('Échec du téléchargement ({e}). Les sourates terminées sont gardées.', {e: stopped.slice(4)}), stopped === 'ok' ? true : false);
}
async function audioDel(s){ const rec = cfg.reciter, cache = await caches.open(AUDIO_CACHE), q = auEntry(audioSet(rec)[s] || 64).q; await Promise.all(Q[s - 1].a.map((_, i) => cache.delete(auUrl(rec, s, i + 1, q)))); const o = {...audioSet(rec)}; delete o[s]; audioOff[rec] = o; store.set('tathbit.audio', audioOff); home(); }
async function audioDelAll(){ if (!confirm(tr("Supprimer tout l'audio téléchargé de ce récitateur ?"))) return; for (const s of Object.keys(audioSet(cfg.reciter))) await audioDel(+s); }
/* ---------- rappels : notifications Web Push (envoyées par la fonction Supabase « send-reminders ») ---------- */
const remState = () => Object.assign({on: false, time: '20:00', two: false, time2: '21:30'}, store.get('tathbit.remind', {}));
const PUSH_OK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const urlB64 = x => Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const remMsg = (m, ok) => { const e = $('rem-msg'); if (e){ e.textContent = m || ''; e.style.color = ok === false ? 'var(--ko)' : ''; } };
const remOnMsg = r => r.two ? tr('Rappels activés à {t} et {t2}.', {t: r.time, t2: r.time2}) : tr('Rappels activés à {t}.', {t: r.time});
function remOfferHtml(){ // 1re ouverture de l'application installée : proposer d'activer les rappels (une seule fois, geste de l'utilisateur requis pour la permission)
  if (!IS_STANDALONE() || !cloudOn() || !me || !CLOUD.vapidPublicKey || !PUSH_OK() || remState().on || store.get('tathbit.remAsked', 0) || Notification.permission === 'denied') return '';
  const r = remState();
  return `<div class="card" id="rem-offer"><h2>${ic('bell')} ${tr('Activer les rappels de révision ?')}</h2><p class="sub" style="margin:0 0 8px">${tr("Une notification par jour à {t}, seulement si tu n'as pas encore révisé. Tu pourras changer l'heure dans Réglages.", {t: esc(r.time)})}</p>
    <div class="row"><button class="pri" data-act="rem-offer-on">${tr('Activer à {t}', {t: esc(r.time)})}</button><button data-act="rem-offer-later">${tr('Pas maintenant')}</button></div></div>`;
}
async function remOfferAct(on){
  store.set('tathbit.remAsked', Date.now());   // on ne redemande pas : les rappels restent dans Réglages
  if (on){ const r = remState(); try { await pushEnable(r.time, r.two, r.time2); homeNotice = remOnMsg(remState()); } catch (e){ homeNotice = friendly(e); } }
  home();
}
function remindCard(){
  if (!cloudOn() || !me || !CLOUD.vapidPublicKey) return '';
  const r = remState(), ok = PUSH_OK(), needInstall = IOS && !IOS_APP;
  return `<div class="card"><h2>${tr('Rappels')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr("Reçois une notification chaque jour à l'heure choisie, seulement si tu n'as pas encore révisé ce jour-là.")}</p>
    ${needInstall ? `<p class="ref" style="margin:0 0 8px">${tr("Sur iPhone, les rappels ne marchent que si l'application est installée sur l'écran d'accueil.")}</p><button class="pri" data-act="tile-install">${ic('phone')} ${tr("Voir comment installer l'application")}</button>`   // avant « !ok » : Safari (hors application installée) n'expose pas les notifications
    : !ok ? `<p class="ref" style="margin:0">${tr('Ton navigateur ne gère pas les notifications.')}</p>`
    : `<label class="f" for="rem-time">${tr('Heure du rappel')}</label><input type="time" id="rem-time" value="${esc(r.time)}">
       <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="rem-two"${r.two ? ' checked' : ''}>${tr("Un 2e rappel plus tard, si je n'ai toujours pas révisé")}</label>
       <input type="time" id="rem-time2" value="${esc(r.time2)}"${r.two ? '' : ' disabled'} aria-label="${tr('Heure du 2e rappel')}">
       <div class="row" style="margin-top:10px">${r.on
        ? `<button data-act="rem-save">${tr("Enregistrer l'heure")}</button><button data-act="rem-test">${tr('Tester une notification')}</button><button data-act="rem-off">${tr('Désactiver les rappels')}</button>`
        : `<button class="pri" data-act="rem-on">${tr('Activer les rappels sur cet appareil')}</button>`}</div>
       <p id="rem-msg" class="ref" style="margin:8px 0 0">${r.on ? remOnMsg(r) : ''}</p>`}
  </div>`;
}
async function pushSubscribeServer(sub, time, time2){
  const j = sub.toJSON(), {error} = await sb.rpc('push_subscribe', {p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_time: time,
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', p_lang: LANG, p_time2: time2 || null});
  if (error) throw error;
}
async function pushEnable(time, two, time2){
  if (!me || !sb) throw new Error(tr('Connecte-toi pour activer les rappels.'));
  if (!CLOUD.vapidPublicKey) throw new Error(tr('Les rappels ne sont pas encore activés sur ce site.'));
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(tr("Heure invalide."));
  if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') throw new Error(tr('Notifications refusées : autorise-les dans les réglages de ton téléphone.'));
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: urlB64(CLOUD.vapidPublicKey)});
  if (two && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time2)) throw new Error(tr("Heure invalide."));
  if (two && time2 <= time) throw new Error(tr("Le 2e rappel doit être après le 1er."));
  await pushSubscribeServer(sub, time, two ? time2 : null);
  store.set('tathbit.remind', {on: true, time, two: !!two, time2: two ? time2 : remState().time2});
}
async function pushDrop(){ // retire l'abonnement (serveur + appareil)
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub){ if (sb) await sb.rpc('push_unsubscribe', {p_endpoint: sub.endpoint}); await sub.unsubscribe(); }
  } catch {}
  store.set('tathbit.remind', Object.assign(remState(), {on: false}));
}
async function pushResync(){ // change la langue/l'heure sans redemander la permission
  const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
  const r = remState(); if (sub) await pushSubscribeServer(sub, r.time, r.two ? r.time2 : null);
}
async function remAction(act){
  const r = remState(), time = $('rem-time') ? $('rem-time').value : r.time;
  const two = $('rem-two') ? $('rem-two').checked : r.two, time2 = $('rem-time2') ? $('rem-time2').value : r.time2;
  try {
    if (act === 'rem-on' || act === 'rem-save'){ await pushEnable(time, two, time2); home(); remMsg(remOnMsg(remState()), true); }
    else if (act === 'rem-off'){ await pushDrop(); home(); remMsg(tr('Rappels désactivés.'), true); }
    else if (act === 'rem-test'){
      if (Notification.permission !== 'granted') throw new Error(tr('Notifications refusées : autorise-les dans les réglages de ton téléphone.'));
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('Tathbīt', {body: tr("C'est l'heure de ta révision 📖"), icon: 'icons/icon-192.png', tag: 'tathbit-test'});
      remMsg(tr('Notification de test envoyée.'), true);
    }
  } catch (e){ remMsg(friendly(e), false); }
}

/* confidentialité et conditions : décrit le fonctionnement réel du site (voir supabase/schema.sql, config.js) */
const LEGAL_DATE = '2026-10-25';
function contactAddr(){ return (Object.assign({contact: ''}, window.TATHBIT_LEGAL || {})).contact; }
async function copyContact(){ const a = contactAddr(), m = $('contact-msg'); let ok = false; try { await navigator.clipboard.writeText(a); ok = true; } catch { /* presse-papiers refusé */ } if (m) m.textContent = ok ? tr('Adresse copiée.') : tr('Copie impossible : recopie l\'adresse à la main.'); }
/* diagnostic à copier : version, appareil, navigateur, langue, état. Aucune donnée personnelle (ni e-mail, ni progression, ni mot de passe, ni jeton) */
function diagText(){
  const oui = b => b ? 'oui' : 'non', n = navigator, nav = n.connection && n.connection.effectiveType ? ' (' + n.connection.effectiveType + ')' : '';
  let perm = 'n/a'; try { perm = 'Notification' in window ? Notification.permission : 'n/a'; } catch {}
  return [
    'Tathbīt – diagnostic',
    'Version : ' + (typeof APP_VERSION === 'string' ? APP_VERSION : '?'),
    'Installée (écran d’accueil) : ' + oui(IS_STANDALONE()),
    'Appareil / navigateur : ' + n.userAgent,
    'Écran : ' + (window.screen ? window.screen.width + '×' + window.screen.height : '?') + ' @' + (window.devicePixelRatio || 1),
    'Langue de l’application : ' + LANG + ' · du navigateur : ' + (n.language || '?'),
    'En ligne : ' + oui(n.onLine) + nav,
    'Compte connecté : ' + oui(!!me) + (acc.syncErr ? ' · erreur de synchronisation : ' + acc.syncErr : ''),
    'Mode hors ligne (service worker) : ' + oui('serviceWorker' in n && !!n.serviceWorker.controller),
    'Reconnaissance vocale : ' + oui(!!SR) + ' · notifications : ' + perm + ' · rappels : ' + oui(remState().on),
    'Erreurs récentes : ' + (JSERR.length ? JSERR.join(' | ') : 'aucune')].join('\n');
}
async function copyDiag(){ const m = $('diag-msg'); let ok = false; try { await navigator.clipboard.writeText(diagText()); ok = true; } catch { /* presse-papiers refusé */ } if (m) m.textContent = ok ? tr('Diagnostic copié : colle-le dans ton message.') : tr('Copie impossible : sélectionne le texte ci-dessus et copie-le à la main.'); }
function renderContact(){
  setNav(false); screen = 'contact';
  const a = contactAddr(), v = typeof APP_VERSION === 'string' ? APP_VERSION : '';
  const ver = tr('(Version de l\'application : {v})', {v}), nl = '\n';
  const topics = [
    ['📖', 'Signaler une erreur dans un texte (verset, vers, traduction)', 'Tathbīt – erreur dans un texte',
      [tr('Texte (sourate ou matn) :'), tr('Numéro du verset ou du vers :'), tr('Mot ou passage concerné :'), tr('Ce que dit mon édition (titre, éditeur, page) :')]],
    ['🛠️', "Un problème avec l'application ou mon compte", 'Tathbīt – problème',
      [tr("Ce que j'ai fait :"), tr("Ce qui s'est passé :"), diagText()]],
    ['💡', 'Une idée ou une remarque', 'Tathbīt – idée ou remarque', [tr('Mon message :')]],
    ['🔒', 'Une demande sur mes données (accès, rectification, suppression)', 'Tathbīt – mes données', [tr('Mon adresse e-mail de compte :'), tr('Ma demande :')]],
    ['✉️', 'Autre sujet', 'Tathbīt – autre sujet', [tr('Mon message :')]]];
  const link = ([ic, label, subj, lines]) => `<a class="btnlink" href="mailto:${esc(a)}?subject=${encodeURIComponent(subj)}&amp;body=${encodeURIComponent(lines.join(nl + nl) + nl + nl + ver)}">${ic} ${tr(label)}</a>`;
  $app.innerHTML = `<div class="top"><button class="link" data-act="contact-back">${tr('← Retour')}</button><span>${tr('Contact')}</span></div>
    <h1 style="margin-top:8px">${tr('Nous contacter')}</h1>
    <div class="card"><p style="margin:0 0 8px">${tr("Une question, une erreur dans un texte, un problème avec ton compte, une idée ? Écris-nous par e-mail : choisis un sujet, le message s'ouvre dans ton application de messagerie avec un modèle à compléter.")}</p>
      ${a ? topics.map(link).join('') : `<p class="ref">${tr('(adresse à compléter)')}</p>`}</div>
    <div class="card"><h2>${tr('Adresse e-mail')}</h2>
      <p style="margin:0 0 8px"><a href="mailto:${esc(a)}">${esc(a)}</a></p>
      <button data-act="contact-copy">${ic('clipboard')} ${tr("Copier l'adresse")}</button> <span class="ref" id="contact-msg" role="status"></span>
      <p class="ref" style="margin:10px 0 0">${tr("Si ton application de messagerie ne s'ouvre pas, copie l'adresse et écris depuis ta boîte mail.")}</p></div>
    <div class="card"><h2>${tr('Diagnostic')}</h2>
      <p class="ref" style="margin:0 0 8px">${tr("Pour un problème, copie ces informations et colle-les dans ton message : elles nous évitent de te poser dix questions. Elles ne contiennent ni ton e-mail, ni ta progression, ni ton mot de passe.")}</p>
      <pre class="diag" tabindex="0" aria-label="${tr('Diagnostic')}">${esc(diagText())}</pre>
      <button data-act="diag-copy">${ic('clipboard')} ${tr('Copier le diagnostic')}</button> <span class="ref" id="diag-msg" role="status"></span></div>
    <div class="card"><h2>${tr('À savoir')}</h2>
      <p class="ref" style="margin:0 0 6px">${tr("Tathbīt est un projet personnel et gratuit : les réponses peuvent prendre du temps.")}</p>
      <p class="ref" style="margin:0 0 6px">${tr("Pour une erreur dans un texte, dis dans quelle édition tu l'as vérifiée : une correction ne se fait qu'à partir d'une source fiable.")}</p>
      <p class="ref" style="margin:0">${tr("N'écris jamais ton mot de passe dans un message.")}</p></div>`;
  window.scrollTo(0, 0);
}
function renderLegal(){
  setNav(false); screen = 'legal';
  const L = Object.assign({contact: '', region: ''}, window.TATHBIT_LEGAL || {});
  const contact = L.contact ? `<a href="mailto:${esc(L.contact)}">${esc(L.contact)}</a>` : tr('(adresse à compléter)');
  const cnil = '<a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">cnil.fr/fr/plaintes</a>';
  const region = L.region ? ', ' + tr('région : {r}', {r: esc(L.region)}) : '';
  const date = new Date(LEGAL_DATE).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'long', year: 'numeric'});
  const sec = (h, ps) => `<div class="card"><h2>${tr(h)}</h2>${ps.map(p => `<p style="margin:0 0 8px">${p}</p>`).join('')}</div>`;
  $app.innerHTML = `<div class="top"><button class="link" data-act="legal-back">${tr('← Retour')}</button><span>${tr('Confidentialité')}</span></div>
    <h1 style="margin-top:8px">${tr("Confidentialité et conditions d'utilisation")}</h1>
    <p class="sub">${tr('Dernière mise à jour : {d}', {d: date})}</p>
    ${sec('Qui est responsable ?', [tr("Tathbīt est un site personnel et gratuit d'aide à la révision du Coran et des moutoun. Responsable du site : contact par e-mail uniquement ({contact}).", {contact})])}
    ${sec('Quelles données ?', [tr("Compte : ton adresse e-mail, ton mot de passe (transmis au service d'authentification Supabase, qui le stocke de façon sécurisée ; ce site ne le conserve pas), la date d'inscription, ta dernière activité et ton rôle."),
      tr("Progression : tes statistiques, ton historique d'erreurs (y compris les réponses que tu saisis), ton plan de révision, tes réglages et les textes que tu ajoutes toi-même."),
      tr("Rappels (facultatif) : si tu actives les notifications, l'adresse technique de ton appareil pour les notifications (fournie par Apple, Google ou Mozilla), l'heure choisie, ton fuseau horaire et ta langue sont enregistrés pour t'envoyer le rappel, qui transite par le service de notifications de ton système. Tu peux les désactiver à tout moment dans Réglages."),
      tr("Enseignant (facultatif) : si tu invites un enseignant, il voit ton e-mail, ton total de réponses, ta progression par sourate, tes jours d'activité et tes erreurs (sans les réponses que tu as tapées, sans tes réglages ni les textes que tu ajoutes). Tu génères un code d'invitation valable 7 jours et à usage unique ; seul ton enseignant peut mettre fin au suivi (tu peux aussi supprimer ton compte à tout moment) ; chaque consultation d'un détail est enregistrée et visible dans ton compte. Seul un compte auquel l'administrateur a donné le rôle enseignant peut utiliser un code."),
      tr("Messages, objectifs et classe (facultatif) : un enseignant que tu as invité (ou dont tu as saisi le code de classe) peut t'envoyer des messages de 280 caractères au plus et te fixer des objectifs (sourate, date limite) ; tu peux supprimer les messages. Si ton enseignant met fin au suivi, tu ne les vois plus."),
      tr("Nouvelles versions : ton e-mail sert aussi à t'avertir quand une nouvelle version de l'application est disponible (par défaut ; tu peux le désactiver dans Réglages, Compte). Une notification s'affiche aussi dans la cloche, et sur tes appareils si tu as activé les rappels."),
      tr("Résumé hebdomadaire (facultatif) : si tu l'actives, ton e-mail, ta langue et le jour du dernier envoi sont utilisés pour t'envoyer chaque dimanche, via Gmail (Google), le nombre de tes réponses et de tes jours actifs de la semaine."),
      tr("Données techniques : comme sur tout site, les hébergeurs et services utilisés peuvent enregistrer des informations de connexion, par exemple l'adresse IP.")])}
    ${sec('Pourquoi ?', [tr("Pour créer ton compte, te connecter et synchroniser ta progression entre tes appareils. L'administrateur peut consulter la liste des comptes et la progression pour gérer le service. Les données ne sont ni vendues ni utilisées pour de la publicité.")])}
    ${sec('Sur quelle base ?', [tr("Ton consentement, donné en cochant la case à l'inscription. Tu peux le retirer à tout moment en supprimant ton compte.")])}
    ${sec('Qui reçoit les données ?', [tr("L'administrateur du site, et les services techniques utilisés : Supabase (comptes et base de données{region}), GitHub (hébergement du site), jsDelivr (bibliothèque du site), AlQuran Cloud (texte du Coran et audio) et, si tu télécharges de l'audio hors ligne, everyayah.com (fichiers audio). Certains de ces services sont situés hors de l'Union européenne.", {region})])}
    ${sec('Combien de temps ?', [tr("Tant que ton compte existe. Tu peux le supprimer à tout moment (Réglages, puis Mon compte) : ton compte et ta progression enregistrée sont alors effacés.")])}
    ${sec('Tes droits', [tr("Tu peux demander l'accès à tes données, leur rectification, leur effacement, leur portabilité, la limitation de leur traitement, ou t'opposer à certains usages. Tu peux déjà supprimer ton compte et exporter ta progression toi-même dans l'application ; pour toute autre demande, écris à {contact}. Tu peux aussi saisir la CNIL : {cnil}.", {contact, cnil})])}
    ${sec('Stockage sur ton appareil', [tr("Ce site n'utilise ni cookies publicitaires ni outil de mesure d'audience. Il garde sur ton appareil (stockage local et cache du navigateur) ta session, ta progression, les fichiers de l'application pour fonctionner hors ligne et, si tu les télécharges, les fichiers audio des sourates choisies."),
      tr("Les photos et fichiers que tu importes pour ajouter un matn sont lus directement sur ton appareil : ils ne sont pas envoyés à un serveur.")])}
    ${sec('Sécurité', [tr("Les échanges sont chiffrés (HTTPS) et l'accès aux données est limité par des règles de la base de données : chacun ne voit que ses propres données, seul l'administrateur voit l'ensemble.")])}
    ${sec("Conditions d'utilisation", [tr("Tathbīt est un outil d'aide à la révision, fourni gratuitement et sans garantie. Les textes (Coran, moutoun) viennent de sources publiques citées dans l'application et peuvent contenir des erreurs : vérifie toujours avec ton mushaf et ton enseignant. Tu es responsable de l'usage de ton compte et de la confidentialité de ton mot de passe. Un compte peut être suspendu en cas d'abus.")])}
    ${sec('Modifications', [tr("Cette page peut évoluer ; la date de dernière mise à jour est indiquée en haut.")])}`;
  window.scrollTo(0, 0);
}

/* espace admin : l'interface n'est qu'un affichage, les droits sont vérifiés par la base (voir supabase/schema.sql) */
const when = t => t ? fdate(Date.parse(t)) : '—';
function summarize(d){
  const st = d.stats || {}; let ok = 0, tot = 0; const per = {};
  for (const [k, [o, e]] of Object.entries(st)){ ok += o; tot += o + e; const s = k.split(':')[0]; (per[s] ||= [0, 0]); per[s][0] += o; per[s][1] += e; }
  const weak = Object.entries(per).filter(([, [o, e]]) => o + e >= 3).map(([s, [o, e]]) => [s, o / (o + e)]).sort((a, b) => a[1] - b[1]).slice(0, 5);
  const wk = Object.entries(d.days || {}).filter(([k]) => Date.parse(k) >= Date.now() - 7 * 864e5).reduce((a, [, n]) => a + n, 0);
  return {tot, ok, seen: Object.keys(st).length, weak, wk, last: (d.errors || []).slice(-5).reverse()};
}
async function openAdmin(){ if (!isAdmin()) return; adm.detail = null; adm.users = null; renderAdmin(); window.scrollTo(0, 0); await adminLoad(); }
async function adminLoad(){
  adm.msg = '';
  try { const {data, error} = await sb.rpc('admin_users'); if (error) throw error; adm.users = data; } catch (e){ adm.msg = friendly(e); }
  try { const r = await sb.rpc('admin_teacher_requests'); adm.reqs = r.error ? [] : (r.data || []); } catch { adm.reqs = []; }
  try { const r = await sb.rpc('admin_announcements'); adm.anns = r.error ? null : (r.data || []); } catch { adm.anns = null; }
  renderAdmin();
}
/* WA:begin — surveillance des e-mails d'inscription (fonction pure, testée en Node). Seuils indicatifs : limite d'envoi de Supabase 30 e-mails/heure (valeur par défaut),
   plafond d'un compte Gmail ≈ 500 e-mails/jour (sources tierces) ; seules les inscriptions sont comptées (pas les « mot de passe oublié » ni les renvois). */
const WA = {HOUR_LIMIT: 30, DAY_LIMIT: 500, WARN: 0.5, ALERT: 0.8, DOMAIN_USERS: 40};
function admWatch(users, now){
  const t = u => Date.parse(u.created_at) || 0, h1 = users.filter(u => t(u) > now - 36e5).length, h24 = users.filter(u => t(u) > now - 864e5).length;
  const lvl = (n, lim) => n >= lim * WA.ALERT ? 2 : n >= lim * WA.WARN ? 1 : 0;
  return {h1, h24, total: users.length, hourLevel: lvl(h1, WA.HOUR_LIMIT), dayLevel: lvl(h24, WA.DAY_LIMIT), level: Math.max(lvl(h1, WA.HOUR_LIMIT), lvl(h24, WA.DAY_LIMIT)), domain: users.length >= WA.DOMAIN_USERS};
}
/* WA:end */
function watchHtml(){
  if (!adm.users) return '';
  const w = admWatch(adm.users, Date.now()), mark = ['✓', '⚠', '⛔'][w.level], col = ['', 'var(--gold)', 'var(--ko)'][w.level];
  return `<div class="card"><h2>${tr('Surveillance des e-mails')}</h2>
    <p class="sub" style="margin:0 0 6px;${col ? 'color:' + col : ''}"><b>${mark}</b> ${trp(w.h1, '{n} inscription cette heure|{n} inscriptions cette heure')} · ${trp(w.h24, '{n} inscription sur 24 h|{n} inscriptions sur 24 h')}</p>
    <p class="ref" style="margin:0">${tr("Repères : limite d'envoi de Supabase (30 e-mails par heure par défaut) et plafond d'un compte Gmail (environ 500 e-mails par jour). Seules les inscriptions sont comptées : les mots de passe oubliés et les renvois s'y ajoutent.")}</p>
    ${w.level ? `<p class="fb ${w.level > 1 ? 'ko' : 'mid'}" style="margin:8px 0 0">${tr("Tu approches des limites d'envoi : prévois un nom de domaine avec Resend (supabase/README.md) avant d'inviter beaucoup de monde.")}</p>` : ''}
    ${w.domain ? `<p class="ref" style="margin:8px 0 0">${tr("Tu as {n} comptes : c'est le moment de prévoir un nom de domaine avec Resend pour que les e-mails restent fiables.", {n: w.total})}</p>` : ''}</div>`;
}
/* TC:begin — suivi par un enseignant : statistiques calculées sur le résumé reçu (fonctions pures, testées en Node) */
function tcRegularity(days, now){ // 14 derniers jours (le plus ancien d'abord), jours actifs sur 7 et 30 jours, série en cours
  const key = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const n = i => Number((days || {})[key(now - i * 864e5)]) || 0;
  const bars = Array.from({length: 14}, (_, j) => ({d: key(now - (13 - j) * 864e5), n: n(13 - j)}));
  const active = k => Array.from({length: k}, (_, i) => n(i)).filter(x => x > 0).length;
  let streak = 0; for (let i = n(0) > 0 ? 0 : 1; i < 400 && n(i) > 0; i++) streak++;
  return {bars, active7: active(7), active30: active(30), streak, total14: bars.reduce((t, x) => t + x.n, 0)};
}
function tcPerSurah(stats){ // par sourate ou matn : réussites, ratés, versets vus ; la plus faible d'abord
  const per = {};
  for (const [k, v] of Object.entries(stats || {})){ const s = k.split(':')[0], x = per[s] ||= {s, ok: 0, ko: 0, seen: 0}; x.ok += v[0]; x.ko += v[1]; x.seen++; }
  return Object.values(per).map(x => ({...x, rate: x.ok + x.ko ? x.ok / (x.ok + x.ko) : 0})).sort((a, b) => a.rate - b.rate || b.ko - a.ko);
}
function tcFrequent(errors, n = 10){ // versets les plus souvent ratés
  const c = {}; for (const e of errors || []){ const x = c[e.k] ||= {k: e.k, n: 0, last: 0}; x.n++; x.last = Math.max(x.last, e.t); }
  return Object.values(c).sort((a, b) => b.n - a.n || b.last - a.last).slice(0, n);
}
function tcGoal(stats, surah, total){ // avancement d'un objectif : versets de la sourate réussis au moins une fois (une tentative ratée ne compte pas)
  let seen = 0; for (const [k, v] of Object.entries(stats || {})) if (k.split(':')[0] === String(surah) && v && v[0] > 0) seen++;
  return {seen, total, pct: total ? Math.min(100, Math.round(100 * seen / total)) : 0};
}
function tcRemaining(stats, surah, total){ // numéros des versets de la sourate pas encore réussis
  const out = []; for (let a = 1; a <= total; a++){ const v = (stats || {})[surah + ':' + a]; if (!(v && v[0] > 0)) out.push(a); } return out;
}
function tcGoalR(stats, from, to, len){ // objectif sur une ou plusieurs sourates (from..to) : versets réussis, total, et ce qui reste par sourate ; len(n) = nombre de versets de la sourate n
  let seen = 0, total = 0; const parts = [];
  for (let s = from; s <= (to || from); s++){ const t = len(s), rest = tcRemaining(stats, s, t); seen += t - rest.length; total += t; parts.push({s, total: t, rest}); }
  return {seen, total, left: total - seen, pct: total ? Math.min(100, Math.round(100 * seen / total)) : 0, parts};
}
function tcRanges(list, max = 12){ // [1,2,3,5,7,8] -> « 1–3, 5, 7–8 » (au plus `max` groupes, puis « … »)
  const g = []; for (const n of list){ const l = g[g.length - 1]; if (l && n === l[1] + 1) l[1] = n; else g.push([n, n]); }
  const t = g.map(([a, b]) => a === b ? String(a) : b === a + 1 ? a + ', ' + b : a + '–' + b);
  return t.length > max ? t.slice(0, max).join(', ') + ' …' : t.join(', ');
}
function tcPace(remaining, due, now){ // jours restants (inclus aujourd'hui) et nombre de versets à réussir par jour ; days < 1 : échéance dépassée
  const days = Math.floor((Date.parse(due + 'T23:59:59') - now) / 864e5) + 1;
  return {days, perDay: days >= 1 && remaining ? Math.ceil(remaining / days) : 0};
}
/* TC:end */
const isTeacher = () => !!(me && me.profile && me.profile.role === 'teacher');
let tch = {students: null, detail: null, msg: '', ok: false, links: null, invites: null, log: null, code: null, busy: false, loaded: false, req: false, msgs: [], goals: [], classes: [], joinMsg: '', wk: false, unread: {}, loading: false, q: '', sort: 'activity', chatWith: null, openAfter: null};
const tchErr = e => { tch.msg = friendly(e); tch.ok = false; };
async function tchLoadStudent(){ // ce que l'élève voit : ses invitations, ses enseignants, les consultations, les messages
  if (!me || !sb || isAdmin() || tch.loading) return;
  tch.loading = true;
  try {
    const [a, b, c] = await Promise.all([sb.rpc('links_mine'), sb.from('teacher_invites').select('code, expires_at, used_by').is('used_by', null).gt('expires_at', new Date().toISOString()), sb.rpc('access_log_mine')]);
    for (const r of [a, b, c]) if (r.error) throw r.error;
    const q = await sb.from('teacher_requests').select('created_at'); tch.req = !q.error && !!(q.data && q.data.length);
    const safe = async f => { try { const r = await f(); return r.error ? [] : (r.data || []); } catch { return []; } };   // messages et objectifs : absents tant que teacher.sql n'est pas relancé
    try { const w = await sb.from('mail_prefs').select('weekly, updates'); tch.wk = !w.error && !!(w.data && w.data[0] && w.data[0].weekly); tch.upd = w.error || !w.data || !w.data[0] ? true : w.data[0].updates !== false; } catch { tch.wk = false; tch.upd = true; }
    [tch.msgs, tch.goals] = await Promise.all([safe(() => sb.rpc('messages_mine')), safe(() => sb.rpc('goals_for'))]);
    tch.links = (a.data || []).filter(x => x.as_role === 'teacher'); tch.invites = b.data || []; tch.log = c.data || [];
    if (isTeacher()){ const u = await safe(() => sb.rpc('teacher_unread')); tch.unread = Object.fromEntries(u.map(x => [x.student_id, Number(x.n)])); }
  } catch (e){ tchErr(e); }
  const wasStudent = me ? store.get(stuKey(), false) : false;
  tch.loading = false; tch.loaded = true; if (me) store.set(stuKey(), isStudent());
  const unseen = unreadStudent();
  if (screen === 'tab' && cfg.tab === 'student'){ home(); if (unseen){ sb.rpc('messages_mark_read').then(() => { nfLoad(); tch.msgs.forEach(m => { if (!m.from_student && !m.read_at) m.read_at = new Date().toISOString(); }); if (screen === 'tab') setNav(true); }); } }
  else if (screen === 'tab'){ if (me && wasStudent !== isStudent()) home(); else setNav(true); }       // le profil a changé (devenu élève ou plus élève) : on redessine ; sinon, simple mise à jour des pastilles du menu
  else if (screen === 'account') renderAccount();
  tchFlash();
}
// refait l'écran courant après une action (onglets Élève et Enseignant, ou Compte)
// un message de réussite disparaît seul au bout de 3 s (les erreurs restent affichées)
const tchFlash = () => { clearTimeout(tch.t); if (tch.msg && tch.ok) tch.t = setTimeout(() => { if (tch.ok){ tch.msg = ''; document.querySelectorAll('.tch-flash').forEach(e => e.remove()); } }, 3000); };
const tchRefresh = () => { if (screen === 'tab' && (cfg.tab === 'student' || cfg.tab === 'teacher')) home(); else if (screen === 'account') renderAccount(); tchFlash(); };
/* ---------- cloche : notifications reçues et pas encore traitées ---------- */
let nf = {list: [], loaded: false};
const nfUnread = () => nf.list.filter(x => !x.read_at);
const BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
function nfText(x){
  const e = esc(x.actor || ''), n = x.n || 1, s_ = esc(+x.ref && book(+x.ref) ? SN(+x.ref) : (x.ref || ''));
  return ({
    message: n > 1 ? tr('{n} nouveaux messages de {e}', {n, e}) : tr('Nouveau message de {e}', {e}),
    reply: n > 1 ? tr('{n} réponses de {e}', {n, e}) : tr('Réponse de {e}', {e}),
    goal: tr('Nouvel objectif de {e} : {s}', {e, s: esc(goalRefName(x.ref))}),
    request: tr('{e} demande à devenir enseignant', {e}),
    role_teacher: tr('Tu es maintenant enseignant.'),
    request_declined: tr("Ta demande pour devenir enseignant n'a pas été acceptée."),
    linked: tr('{e} suit maintenant ta progression.', {e}),
    unlinked: tr('{e} a mis fin au suivi.', {e}),
    student_joined: tr('{e} a rejoint ta classe.', {e}),
    app_update: +x.ref > APP_BUILD ? tr("Nouvelle version de l'application (v{v}) : touche « Chercher les mises à jour ».", {v: esc(x.ref || '')}) : tr('Nouveautés de la version v{v}', {v: esc(x.ref || '')}),
    reminder: n > 0 ? trp(n, 'Rappel de révision : {n} verset à revoir aujourd\'hui|Rappel de révision : {n} versets à revoir aujourd\'hui') : tr("Rappel de révision : c'est l'heure de ta révision.")
  })[x.kind] || esc(x.kind);
}
function bellSync(){
  let b = $('bell');
  const show = !!me && cloudOn() && ['tab', 'account', 'admin'].includes(screen);
  if (!show){ if (b) b.hidden = true; const p = $('nf-panel'); if (p) p.hidden = true; return; }
  if (!b){ b = document.createElement('button'); b.id = 'bell'; b.className = 'bell'; b.dataset.act = 'bell'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); document.body.appendChild(b); b.addEventListener('click', onClick); }
  b.hidden = false; const n = nfUnread().length;
  b.setAttribute('aria-label', n ? trp(n, 'Notifications : {n} non traitée|Notifications : {n} non traitées') : tr('Notifications'));
  b.innerHTML = BELL + (n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : '');
}
function nfPanel(){
  let p = $('nf-panel');
  if (!p){ p = document.createElement('div'); p.id = 'nf-panel'; p.className = 'card nfp'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', tr('Notifications')); document.body.appendChild(p); p.addEventListener('click', onClick); }
  return p;
}
function nfPaint(){
  bellSync();
  const p = nfPanel(); if (p.hidden) return;
  const U = nfUnread(), R = nf.list.filter(x => x.read_at).slice(0, 8);
  const item = (x, done) => `<div class="nf${done ? ' done' : ''}"><div>${nfText(x)}${x.kind === 'app_update' && newsSummary(x.ref) ? `<br><span class="ref">${newsSummary(x.ref)}</span>` : ''}<br><span class="ref">${fdate(Date.parse(x.created_at))}</span></div>${done ? '' : `<div class="grades"><button data-act="nf-open" data-v="${x.id}">${tr('Ouvrir')}</button><button class="link" data-act="nf-done" data-v="${x.id}">✓ ${tr('Traité')}</button></div>`}</div>`;
  p.setAttribute('aria-label', tr('Notifications'));
  p.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">${tr('Notifications')}</h2><button class="link" data-act="nf-close" aria-label="${tr('Fermer')}">✕</button></div>
    ${U.length ? U.map(x => item(x)).join('') + `<button data-act="nf-all" style="margin-top:8px">${tr('Tout marquer comme traité')}</button>` : `<p class="ref" style="margin:8px 0">${tr('Rien à traiter pour le moment.')}</p>`}
    ${R.length ? `<h3 style="margin:12px 0 4px;font-size:.95rem">${tr('Déjà traitées')}</h3>${R.map(x => item(x, true)).join('')}` : ''}`;
}
async function nfLoad(){
  if (!me || !sb || !sb.rpc) return;
  try { const r = await sb.rpc('notifs_mine'); if (!r.error) nf.list = r.data || []; } catch { /* hors ligne ou base pas à jour : la cloche reste vide */ }
  // un rappel de révision est traité dès qu'on a révisé le jour où il a été envoyé (ou après)
  for (const x of nf.list) if (x.kind === 'reminder' && !x.read_at && (days[x.ref] || 0) > 0) nfRead(x.id);
  for (const x of nf.list) if (x.kind === 'app_update' && !x.read_at && +x.ref > APP_BUILD && (!newVer || +x.ref > newVer.v)){ newVer = {v: +x.ref, label: 'v' + x.ref, note: ''}; updSlot(); }   // pas encore installée : l'accueil affiche le message
  if (nf.list.some(x => x.kind === 'app_update')) await loadNews();   // résumé des nouveautés dans la cloche
  nfPaint();
}
function nfToggle(){ const p = nfPanel(); if (!p.hidden) return nfClose(); p.hidden = false; const bl = $('bell'); if (bl) bl.setAttribute('aria-expanded', 'true'); nfPaint(); nfLoad(); const f = p.querySelector('button'); if (f) f.focus(); }
function nfClose(){ const p = $('nf-panel'); if (p && !p.hidden){ p.hidden = true; const b = $('bell'); if (b){ b.setAttribute('aria-expanded', 'false'); b.focus(); } } }
async function nfRead(id){ try { await sb.rpc('notif_read', {p_id: id}); } catch { /* sans effet : on le verra au prochain chargement */ } const x = nf.list.find(y => y.id === id); if (x && !x.read_at) x.read_at = new Date().toISOString(); nfPaint(); }
async function nfAll(){ try { await sb.rpc('notifs_read_all'); } catch { /* idem */ } nf.list.forEach(x => { if (!x.read_at) x.read_at = new Date().toISOString(); }); nfPaint(); }
async function refreshProfile(){ try { const {data} = await sb.from('profiles').select('*').eq('id', me.user.id).maybeSingle(); if (data){ me.profile = data; store.set('tathbit.me', me); } } catch { /* on garde le profil connu */ } }
async function nfOpen(id){
  const x = nf.list.find(y => y.id === id); if (!x) return;
  nfClose(); await nfRead(id);
  if (x.kind === 'message'){ tch.chatWith = x.ref; go('student'); }
  else if (x.kind === 'reply'){ tch.openAfter = x.ref; go('teacher'); }
  else if (x.kind === 'request') openAdmin();
  else if (x.kind === 'role_teacher'){ await refreshProfile(); go('teacher'); }
  else if (x.kind === 'student_joined') go('teacher');
  else if (x.kind === 'reminder'){ if (dueRefs().length) start(shuffle(reviewPick(15))); else go('train'); }
  else if (x.kind === 'unlinked' || x.kind === 'request_declined') openAccount();
  else if (x.kind === 'app_update'){
    if (+x.ref > APP_BUILD){ if (!newVer || +x.ref > newVer.v) newVer = {v: +x.ref, label: 'v' + x.ref, note: ''}; go('home'); }   // pas encore installée : « Chercher les mises à jour »
    else openNews(x.ref);                                                                                                            // installée : les nouveautés, et les boutons pour les essayer
  }
  else go('student');
}
document.addEventListener('click', e => { // clic hors du panneau ou de la cloche : on ferme. composedPath() : la cible a pu être remplacée par le rafraîchissement de la cloche (innerHTML) pendant le clic, closest() la croirait alors « dehors »
  const p = $('nf-panel'); if (p && !p.hidden && !e.composedPath().some(n => n === p || n.id === 'bell')) nfClose(); });
document.addEventListener('keydown', e => { const p = $('nf-panel'); if (e.key === 'Escape' && p && !p.hidden) nfClose(); });

// toutes les 20 s : nouveaux messages (conversation ouverte : mise à jour douce ; sinon : pastilles du menu seulement)
let chatBusy = false;
async function chatPoll(){
  if (chatBusy || document.hidden || !me || !sb || !sb.rpc) return;
  chatBusy = true;
  try {
    if (!isAdmin() && screen === 'tab' && tch.loaded){
      const r = await sb.rpc('messages_mine');
      if (!r.error){
        tch.msgs = r.data || [];
        if (cfg.tab === 'student' && $('chat-thread')){ chatPaint(chatHtml(chThread(), m => m.from_student, true)); if (unreadStudent()){ sb.rpc('messages_mark_read'); tch.msgs.forEach(m => { if (!m.from_student && !m.read_at) m.read_at = new Date().toISOString(); }); } }
      }
      if (isTeacher()){
        const u = await sb.rpc('teacher_unread'); if (!u.error) tch.unread = Object.fromEntries((u.data || []).map(x => [x.student_id, Number(x.n)]));
        if (cfg.tab === 'teacher' && tch.detail && $('chat-thread')){ const t = await sb.rpc('teacher_thread', {target: tch.detail.id}); if (!t.error){ tch.detail.thread = t.data || []; chatPaint(chatHtml(tch.detail.thread.slice().reverse(), m => !m.from_student, false)); delete tch.unread[tch.detail.id]; } }
      }
      if (screen === 'tab') setNav(true);
    }
    await nfLoad();
  } catch { /* hors ligne : on réessaiera */ }
  chatBusy = false;
}
setInterval(chatPoll, 20000);
// à l'ouverture d'un onglet : chargement des données (une seule fois par visite)
function tchEnter(){
  if (!me || !sb) return;
  if (tch.uid !== me.user.id){ Object.assign(tch, {uid: me.user.id, students: null, detail: null, links: null, invites: null, log: null, code: null, msgs: [], goals: [], classes: [], unread: {}, req: false, wk: false, loaded: false, msg: ''}); nf = {list: [], loaded: false}; }       // autre personne connectée : on repart de zéro
  if (!nf.loaded){ nf.loaded = true; nfLoad(); }
  if (!tch.loaded && !tch.loading) tchLoadStudent();
  if (cfg.tab === 'teacher' && isTeacher() && tch.students === null && !tch.loadingT){ tch.loadingT = true; Promise.all([tchLoadStudents(), tchLoadClasses()]).finally(() => { tch.loadingT = false; }); }
}
/* ----- conversation (bulles) ----- */
const chDay = t => new Date(t).toLocaleDateString(LOCALE(), {weekday: 'short', day: 'numeric', month: 'short'});
const chTime = t => new Date(t).toLocaleTimeString(LOCALE(), {hour: '2-digit', minute: '2-digit'});
// list : messages du plus ancien au plus récent ; mine(m) : vrai si le message est de moi ; del : bouton de suppression (élève)
function chatHtml(list, mine, del){
  if (!list.length) return `<p class="ref" style="margin:0;text-align:center">${tr("Aucun message pour l'instant.")}</p>`;
  let last = '';
  return list.map(m => {
    const d = chDay(m.created_at), me_ = mine(m), head = d !== last ? `<div class="day">${esc(d)}</div>` : ''; last = d;
    const fresh = !me_ && !m.read_at ? '● ' : '';
    return `${head}<div class="msg ${me_ ? 'me' : 'them'}"><div class="b">${esc(m.body)}</div><div class="t">${fresh}${chTime(m.created_at)}${me_ ? ` · ${m.read_at ? '✓✓ ' + tr('lu') : '✓ ' + tr('envoyé')}` : ''}${del ? ` <button class="link" data-act="tch-msg-del" data-v="${m.id}" aria-label="${tr('Supprimer le message')}">✕</button>` : ''}</div></div>`;
  }).join('');
}
const chatBottom = () => { const c = $('chat-thread'); if (c) c.scrollTop = c.scrollHeight; };
// actualisation douce : on ne remplace que la conversation (le texte en cours de saisie n'est jamais touché)
function chatPaint(html){ const c = $('chat-thread'); if (!c || c.innerHTML === html) return; const near = c.scrollHeight - c.scrollTop - c.clientHeight < 60; c.innerHTML = html; if (near) chatBottom(); }
const chTeachers = () => { const m = new Map(); for (const l of tch.links || []) m.set(l.other_id, l.email); for (const x of tch.msgs || []) if (!m.has(x.teacher_id)) m.set(x.teacher_id, x.teacher_email); return [...m]; };
const chWith = () => { const T = chTeachers(); if (!T.length) return null; if (!T.some(x => x[0] === tch.chatWith)) tch.chatWith = (T.find(x => (tch.msgs || []).some(m => m.teacher_id === x[0] && !m.from_student && !m.read_at)) || T[0])[0]; return tch.chatWith; };
const chThread = () => (tch.msgs || []).filter(m => m.teacher_id === chWith()).slice().reverse();   // messages_mine renvoie les plus récents d'abord
function chatCard(){
  const T = chTeachers(); if (!T.length) return '';
  const w = chWith(), th = chThread(), canReply = th.some(m => !m.from_student);
  return `<div class="card"><h2>${tr('Messages')}</h2>
    ${T.length > 1 ? `<label class="f" for="tch-reply-to">${tr('Répondre à')}</label><select id="tch-reply-to">${T.map(([id, e]) => `<option value="${id}" ${id === w ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select>` : `<p class="ref" style="margin:0 0 6px">${esc(T[0][1])}</p><input type="hidden" id="tch-reply-to" value="${T[0][0]}">`}
    <div class="chat" id="chat-thread" role="log" aria-live="polite" aria-label="${tr('Conversation')}" tabindex="0">${chatHtml(th, m => m.from_student, true)}</div>
    ${canReply ? `<div class="compose"><textarea id="tch-reply" maxlength="280" rows="3" aria-label="${tr('Ta réponse')}" placeholder="${tr('Écris ta réponse…')}" data-enter="tch-reply-send" data-count="chat-count"></textarea><button class="pri" id="tch-reply-send" data-act="tch-reply-send">${tr('Envoyer')}</button></div><span class="cnt" id="chat-count">0/280</span>`
      : `<p class="ref" style="margin:0">${tr("Tu pourras répondre quand ton enseignant t'aura écrit.")}</p>`}</div>`;
}
const dueLabel = due => { const n = Math.ceil((new Date(due + 'T23:59:59') - Date.now()) / 864e5); return n < 0 ? `<span class="warn">${tr('en retard de {n} j', {n: -n})}</span>` : n === 0 ? tr("aujourd'hui") : tr('dans {n} j', {n}); };
const gTo = g => g.surah_to || g.surah;
const goalName = g => gTo(g) > g.surah ? `${SN(g.surah)} → ${SN(gTo(g))}` : SN(g.surah);
const goalRefName = ref => { const [a, b] = String(ref || '').split('-').map(Number); return a && book(a) ? goalName({surah: a, surah_to: b || null}) : String(ref || ''); };
const goalInfo = g => { const r = tcGoalR(stats, g.surah, gTo(g), slen); return {x: {seen: r.seen, total: r.total, pct: r.pct}, r, rest: r.left, pace: tcPace(r.left, g.due, Date.now())}; };
// « Reste à réussir » : les numéros pour une sourate ; par sourate (« tout » si rien n'est réussi) pour plusieurs
function goalRestText(info){
  const P = info.r.parts.filter(p => p.rest.length);
  if (P.length === 1 && info.r.parts.length === 1) return tcRanges(P[0].rest);
  return P.slice(0, 6).map(p => `${SN(p.s)} : ${p.rest.length === p.total ? tr('tout') : tcRanges(p.rest, 6)}`).join(' · ') + (P.length > 6 ? ' …' : '');
}
function goalsCard(){
  if (!tch.goals || !tch.goals.length) return '';
  const fd = t => new Date(t + 'T00:00:00').toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short'});
  return `<div class="card"><h2>${tr('Mes objectifs')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr("Comment atteindre 100 % : lance « Réviser les versets restants ». Chaque verset que tu réussis (récitation, mots manquants, question…) est validé ; une réponse fausse ne le valide pas, il reste à faire.")}</p>
    ${tch.goals.map(g => { const info = goalInfo(g), {x, rest, pace} = info;
      const plan = x.pct >= 100 ? `<b>${tr('Objectif atteint, machaa Allah 🎉')}</b>`
        : pace.days < 1 ? `<span class="warn">${tr("Échéance dépassée : réussis les {n} versets restants dès que possible.", {n: rest})}</span>`
        : `${tr('Rythme conseillé : {n} par jour', {n: trp(pace.perDay, '{n} verset|{n} versets')})}`;
      return `<div class="sib"><p style="margin:0"><b>${esc(goalName(g))}</b> · ${tr('pour le {d}', {d: fd(g.due)})} · ${dueLabel(g.due)}</p>
      <div class="bar" role="img" aria-label="${x.pct} %"><i style="width:${x.pct}%"></i></div>
      <p class="ref" style="margin:0">${x.seen}/${x.total} ${tr('versets réussis')} (${x.pct} %)${g.note ? ` · ${esc(g.note)}` : ''}</p>
      ${rest ? `<p class="ref" style="margin:4px 0 0">${tr('Reste à réussir : {l}', {l: esc(goalRestText(info))})}</p>` : ''}
      <p style="margin:4px 0 6px">${plan}</p>
      ${rest ? `<button class="pri" data-act="goal-go" data-v="${g.surah}-${gTo(g)}">${tr('Réviser les versets restants')} (${Math.min(rest, cfg.n)})</button>` : ''}</div>`; }).join('')}</div>`;
}
/* lance une série sur les versets de l'objectif pas encore réussis (les premiers de la sourate, au plus cfg.n) ; les questions portent
   sur le verset lui-même (suite, mots manquants, choix de la suite) pour que chaque réussite valide bien le verset demandé */
let goalSession = false;
function startGoal(v){
  const [a, b] = String(v).split('-').map(Number), r = tcGoalR(stats, a, b || a, slen), refs = [];
  for (const p of r.parts) for (const n of p.rest) refs.push({s: p.s, a: n});
  if (!refs.length) return;
  goalSession = true; start(refs.slice(0, cfg.n));
}
// rappel sur l'Accueil : l'objectif le plus proche
function goalHomeCard(){
  if (!me || !tch.goals || !tch.goals.length) return '';
  const g = tch.goals.map(g => ({g, i: goalInfo(g)})).filter(o => o.i.x.pct < 100).sort((a, b) => a.g.due.localeCompare(b.g.due))[0]; if (!g) return '';
  return `<div class="card"><h2>${tr('Objectif de ton enseignant')}</h2>
    <p style="margin:0"><b>${esc(goalName(g.g))}</b> · ${dueLabel(g.g.due)} · ${g.i.x.pct} %</p><div class="bar" role="img" aria-label="${g.i.x.pct} %"><i style="width:${g.i.x.pct}%"></i></div>
    <div class="row"><button class="pri" data-act="goal-go" data-v="${g.g.surah}-${gTo(g.g)}">${tr('Réviser les versets restants')}</button><button data-act="tab" data-v="student">${tr('Voir mes objectifs')}</button></div></div>`;
}
function teachersCard(){
  const L = tch.links || [], fd = t => new Date(t).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short', year: 'numeric'});
  return `<div class="card"><h2>${tr('Mes enseignants')}</h2>
    ${L.length ? L.map(x => `<div class="weak"><span>${esc(x.email)} · ${tr('depuis le {d}', {d: fd(x.since)})}</span></div>`).join('') : `<p class="ref" style="margin:0 0 6px">${tr("Tu n'as pas encore d'enseignant.")}</p>`}
    <p class="ref" style="margin:8px 0">${tr("Pour inviter un enseignant, rejoindre une classe ou voir qui a consulté tes données : ouvre Mon compte.")}</p>
    <button data-act="acc-open">${tr('Mon compte')}</button></div>`;
}
function tabStudent(){
  const unseen = unreadStudent(), nT = (tch.links || []).length, nG = (tch.goals || []).length;
  const sum = tch.loaded ? [trp(nT, '{n} enseignant|{n} enseignants'), trp(nG, '{n} objectif en cours|{n} objectifs en cours'), unseen ? `<b>${trp(unseen, '{n} message non lu|{n} messages non lus')}</b>` : ''].filter(Boolean).join(' · ') : '';
  return `<h1 style="margin-top:8px">${tr('Espace élève')}</h1><p class="sub">${sum || tr('Ton enseignant, tes objectifs et tes messages.')}</p>
    ${tch.msg && cfg.tab === 'student' ? `<p class="fb tch-flash ${tch.ok ? 'ok' : 'ko'}">${esc(tch.msg)}</p>` : ''}
    ${tch.loaded ? chatCard() + goalsCard() + teachersCard() : `<p class="sub">${tr('Chargement…')}</p>`}`;
}
const flashHtml = () => tch.msg ? `<p class="fb tch-flash ${tch.ok ? 'ok' : 'ko'}">${esc(tch.msg)}</p>` : '';
function roleCard(){   // demande du rôle enseignant : une affaire de compte (pas pour l'administrateur ni pour un enseignant)
  if (!me || isAdmin() || !(me.profile && me.profile.role === 'user')) return '';
  return `<div class="card"><h2>${tr('Devenir enseignant')}</h2>${tch.req
    ? `<p class="ref" style="margin:0 0 6px">${tr("Demande envoyée : l'administrateur doit la valider.")}</p><button class="link" data-act="tch-req-cancel">${tr('Annuler ma demande')}</button>`
    : `<p class="ref" style="margin:0 0 6px">${tr("Tu veux suivre des élèves ? Envoie une demande : l'administrateur la valide ou la refuse.")}</p><button data-act="tch-req" ${tch.busy ? 'disabled' : ''}>🎓 ${tr('Demander à devenir enseignant')}</button>`}</div>`;
}
function wkCard(){
  if (!me) return '';
  return `<div class="card"><h2>${tr('Résumé de la semaine')}</h2>
    <label class="consent"><input type="checkbox" id="wk-on" ${tch.wk ? 'checked' : ''}><span>${tr("Recevoir chaque dimanche, par e-mail, un résumé de ma semaine (réponses, jours actifs). Je peux le désactiver à tout moment.")}</span></label>
    <label class="consent" style="margin-top:8px"><input type="checkbox" id="upd-mail" ${tch.upd !== false ? 'checked' : ''}><span>${tr("Être prévenu par e-mail quand une nouvelle version de l'application est disponible. Je peux le désactiver à tout moment.")}</span></label></div>`;
}
async function updToggle(on){ try { const {error} = await sb.rpc('updates_set', {p_on: on}); if (error) throw error; tch.upd = on; tch.ok = true; tch.msg = on ? tr('E-mails de nouvelle version activés.') : tr('E-mails de nouvelle version désactivés.'); } catch (e){ tchErr(e); const c = $('upd-mail'); if (c) c.checked = tch.upd !== false; } if (screen === 'account') renderAccount(); tchFlash(); }
async function wkToggle(on){ try { const {error} = await sb.rpc('weekly_set', {p_on: on, p_lang: LANG}); if (error) throw error; tch.wk = on; tch.ok = true; tch.msg = on ? tr('Résumé hebdomadaire activé.') : tr('Résumé hebdomadaire désactivé.'); } catch (e){ tchErr(e); const c = $('wk-on'); if (c) c.checked = tch.wk; } if (screen === 'account') renderAccount(); tchFlash(); }
function tchStudentCard(){
  if (!me) return '';
  const I = tch.invites, G = tch.log, fd = t => new Date(t).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short', year: 'numeric'});
  return `<div class="card"><h2>${tr('Mon enseignant')}</h2>
    <p class="ref" style="margin:0 0 8px">${tr("Tu peux inviter un enseignant à suivre ta progression. Il verra ton e-mail, ton total de réponses, tes statistiques par sourate, tes jours d'activité et tes erreurs (sans les réponses que tu as tapées). Il ne voit ni tes réglages, ni les textes que tu ajoutes. Tu génères un code, tu le lui donnes ; seul ton enseignant peut mettre fin au suivi (tu peux aussi supprimer ton compte à tout moment).")}</p>
    <button data-act="tch-invite" ${tch.busy ? 'disabled' : ''}>${ic('mail')} ${tr('Inviter un enseignant')}</button>
    ${tch.code ? `<div class="fb ok" style="margin-top:8px"><b style="font-size:1.4rem;letter-spacing:.15em" id="tch-code-new">${esc(tch.code.code)}</b><br><span class="ref">${tr('Valable jusqu\'au {d}. Donne ce code à ton enseignant : il ne sert qu\'une fois.', {d: fd(tch.code.expires_at)})}</span>
      <br><button class="link" data-act="tch-copy">${tr('Copier le code')}</button></div>` : ''}
    ${I && I.length ? `<h3 style="margin:12px 0 4px;font-size:1rem">${tr('Invitations en attente')}</h3>${I.map(x => `<div class="weak"><span><b>${esc(x.code)}</b> · ${tr("jusqu'au {d}", {d: fd(x.expires_at)})}</span><button class="link" data-act="tch-cancel" data-v="${esc(x.code)}">${tr('Annuler')}</button></div>`).join('')}` : ''}
    ${G && G.length ? `<h3 style="margin:12px 0 4px;font-size:1rem">${tr('Consultations récentes de mes données')}</h3>${G.slice(0, 8).map(x => `<p class="ref" style="margin:0">${fdate(Date.parse(x.at))} · ${esc(x.teacher_email)}</p>`).join('')}` : ''}
    <h3 style="margin:12px 0 4px;font-size:1rem">${tr('Rejoindre une classe')}</h3>
    <p class="ref" style="margin:0 0 6px">${tr("Ton enseignant peut te donner un code de classe : en le saisissant, tu lui donnes accès à ta progression (comme avec une invitation).")}</p>
    <div class="row"><input type="text" id="tch-join" aria-label="${tr('Code de classe')}" autocomplete="off" autocapitalize="characters" maxlength="12" style="text-transform:uppercase" data-enter="tch-join-go"><button class="pri" data-act="tch-join-go" id="tch-join-go" style="flex:0 0 auto">${tr('Rejoindre')}</button></div>
</div>`;
}
async function tchAct(fn, okMsg){
  tch.busy = true; tch.msg = ''; tchRefresh();
  try { const r = await fn(); if (r && r.error) throw r.error; tch.ok = true; tch.msg = okMsg || ''; } catch (e){ tchErr(e); }
  tch.busy = false; tch.loaded = false; await tchLoadStudent();
}
const tchMsgDel = id => tchAct(() => sb.rpc('message_delete', {p_id: +id}), tr('Message supprimé.'));
async function tchJoin(){
  const c = ($('tch-join') ? $('tch-join').value : '').trim();
  if (!c){ tch.ok = false; tch.msg = tr('Saisis le code de classe.'); return tchRefresh(); }
  await tchAct(async () => { const {data, error} = await sb.rpc('class_join', {p_code: c}); if (error) throw error; const r = Array.isArray(data) ? data[0] : data; tch.msg = ''; tch.joinMsg = tr('Classe rejointe : {e}', {e: r.email}); return {}; }, '');
  if (tch.joinMsg){ tch.ok = true; tch.msg = tch.joinMsg; tch.joinMsg = ''; tchRefresh(); }
}
const tchInvite = () => tchAct(async () => { const {data, error} = await sb.rpc('invite_create'); if (error) throw error; tch.code = Array.isArray(data) ? data[0] : data; }, '');
const tchCancel = code => tchAct(() => sb.rpc('invite_cancel', {p_code: code}), tr('Invitation annulée.'));
async function tchCopy(){ try { await navigator.clipboard.writeText(tch.code.code); tch.ok = true; tch.msg = tr('Code copié.'); } catch { tch.ok = false; tch.msg = tr('Copie impossible : recopie le code à la main.'); } tchRefresh(); }
/* espace enseignant */
async function tchLoadClasses(){ try { const {data, error} = await sb.rpc('class_mine'); tch.classes = error ? [] : (data || []); } catch { tch.classes = []; } tchRefresh(); }
async function tchClassNew(){ try { const {error} = await sb.rpc('class_create'); if (error) throw error; tch.ok = true; tch.msg = ''; } catch (e){ tchErr(e); } await tchLoadClasses(); }
async function tchClassClose(code){ if (!confirm(tr('Fermer ce code de classe ? Les élèves déjà liés restent liés.'))) return; try { const {error} = await sb.rpc('class_close', {p_code: code}); if (error) throw error; tch.ok = true; tch.msg = ''; } catch (e){ tchErr(e); } await tchLoadClasses(); }
async function tchLoadStudents(){
  try { const {data, error} = await sb.rpc('teacher_students'); if (error) throw error; tch.students = data || []; } catch (e){ tchErr(e); tch.students = tch.students || []; }
  try { const u = await sb.rpc('teacher_unread'); if (!u.error) tch.unread = Object.fromEntries((u.data || []).map(x => [x.student_id, Number(x.n)])); } catch { /* messages : absents tant que teacher.sql n'est pas relancé */ }
  renderTeacher();
  if (tch.openAfter){ const id = tch.openAfter; tch.openAfter = null; if ((tch.students || []).some(u => u.id === id) && !(tch.detail && tch.detail.id === id)) tchDetail(id); }
}
async function tchAdd(){
  const code = ($('tch-code') ? $('tch-code').value : '').trim();
  if (!code){ tch.ok = false; tch.msg = tr("Saisis le code donné par ton élève."); return renderTeacher(); }
  try { const {data, error} = await sb.rpc('invite_accept', {p_code: code}); if (error) throw error; const r = Array.isArray(data) ? data[0] : data; tch.ok = true; tch.msg = tr('Élève ajouté : {e}', {e: r.email}); }
  catch (e){ tchErr(e); }
  await tchLoadStudents();
}
async function tchDetail(id){
  if (tch.detail && tch.detail.id === id){ tch.detail = null; return renderTeacher(); }
  try { const {data, error} = await sb.rpc('teacher_student_data', {target: id}); if (error) throw error; tch.detail = {id, data, goals: [], thread: []}; tch.msg = ''; await Promise.all([tchLoadGoals(id), tchLoadThread(id)]); nfLoad(); } catch (e){ tchErr(e); }
  renderTeacher();
}
async function tchLoadGoals(id){ try { const {data, error} = await sb.rpc('goals_for', {target: id}); if (tch.detail && tch.detail.id === id) tch.detail.goals = error ? [] : (data || []); } catch { if (tch.detail) tch.detail.goals = []; } }
async function tchLoadThread(id){ try { const {data, error} = await sb.rpc('teacher_thread', {target: id}); if (tch.detail && tch.detail.id === id) tch.detail.thread = error ? [] : (data || []); if (!error && tch.unread) delete tch.unread[id]; } catch { if (tch.detail) tch.detail.thread = []; } }
async function tchReply(){
  const t = ($('tch-reply') ? $('tch-reply').value : '').trim(), to = $('tch-reply-to') ? $('tch-reply-to').value : '';
  if (!t){ tch.ok = false; tch.msg = tr('Écris un message.'); return tchRefresh(); }
  try { const {error} = await sb.rpc('student_message_send', {p_teacher: to, p_body: t}); if (error) throw error; tch.ok = true; tch.msg = ''; } catch (e){ tchErr(e); }
  tch.loaded = false; await tchLoadStudent();
}
async function tchAll(){
  const t = ($('tch-all') ? $('tch-all').value : '').trim(); if (!t){ tch.ok = false; tch.msg = tr('Écris un message.'); return renderTeacher(); }
  const n = (tch.students || []).length; if (!confirm(trp(n, 'Envoyer ce message à {n} élève ?|Envoyer ce message à {n} élèves ?'))) return;
  try { const {data, error} = await sb.rpc('teacher_message_all', {p_body: t}); if (error) throw error; tch.ok = true; tch.msg = trp(+data || 0, 'Envoyé à {n} élève.|Envoyé à {n} élèves.'); } catch (e){ tchErr(e); }
  renderTeacher();
}
async function tchSend(id){
  const t = ($('tch-msg') ? $('tch-msg').value : '').trim(); if (!t){ tch.ok = false; tch.msg = tr('Écris un message.'); return renderTeacher(); }
  try { const {error} = await sb.rpc('teacher_message_send', {target: id, p_body: t}); if (error) throw error; tch.ok = true; tch.msg = ''; await tchLoadThread(id); } catch (e){ tchErr(e); }
  renderTeacher();
}
async function tchGoalAdd(id){
  const su = +($('tch-gs') ? $('tch-gs').value : 0), to = +($('tch-ge') ? $('tch-ge').value : 0) || su, due = $('tch-gd') ? $('tch-gd').value : '', note = $('tch-gn') ? $('tch-gn').value : '';
  if (!due){ tch.ok = false; tch.msg = tr('Choisis une date.'); return renderTeacher(); }
  try { const {error} = await sb.rpc('teacher_goal_set', {target: id, p_surah: su, p_due: due, p_note: note, p_surah_to: to > su ? to : null}); if (error) throw error; tch.ok = true; tch.msg = tr('Objectif ajouté.'); await tchLoadGoals(id); } catch (e){ tchErr(e); }
  renderTeacher();
}
async function tchGoalDel(gid){
  const id = tch.detail && tch.detail.id; if (!id) return;
  try { const {error} = await sb.rpc('goal_delete', {p_id: +gid}); if (error) throw error; tch.ok = true; tch.msg = ''; await tchLoadGoals(id); } catch (e){ tchErr(e); }
  renderTeacher();
}
async function tchDrop(id){ if (!confirm(tr('Retirer cet élève de ta liste ? Tu ne verras plus sa progression.'))) return; try { const {error} = await sb.rpc('link_revoke', {other: id}); if (error) throw error; tch.detail = null; tch.ok = true; tch.msg = tr('Élève retiré.'); } catch (e){ tchErr(e); } await tchLoadStudents(); }
function tchDetailHtml(d){
  const R = tcRegularity(d.days, Date.now()), P = tcPerSurah(d.stats), F = tcFrequent(d.errors, 8), last = (d.errors || []).slice(0, 5), mx = Math.max(10, ...R.bars.map(x => x.n));
  const nm = s => /^\d+$/.test(s) ? SN(+s) : (MT[s] ? MN(s) : s);
  return `<div class="sib"><p class="ref" style="margin:0 0 4px"><b>${tr('Régularité')}</b> : ${trp(R.active7, '{n} jour actif sur 7|{n} jours actifs sur 7')} · ${trp(R.active30, '{n} jour actif sur 30|{n} jours actifs sur 30')} · ${tr('série en cours : {n}', {n: R.streak})}</p>
    <div class="week">${R.bars.map(x => `<div title="${x.d} : ${trp(x.n, '{n} réponse|{n} réponses')}"><i style="height:${Math.round(70 * x.n / mx)}px"></i>${x.d.slice(8)}</div>`).join('')}</div>
    ${P.length ? `<p class="ref" style="margin:8px 0 2px"><b>${tr('Par sourate (les plus fragiles d\'abord)')}</b></p>${P.slice(0, 8).map(x => `<div class="weak"><span>${esc(nm(x.s))} · ${trp(x.seen, '{n} verset vu|{n} versets vus')}</span><span>${Math.round(100 * x.rate)} %</span></div>`).join('')}` : `<p class="ref">${tr('Pas encore de progression enregistrée.')}</p>`}
    ${F.length ? `<p class="ref" style="margin:8px 0 2px"><b>${tr('Erreurs fréquentes')}</b></p>${F.map(x => { const r = pk(x.k); return book(r.s) ? `<div class="weak"><span>${rlabel(r)}</span><span>${x.n}×</span></div>` : ''; }).join('')}` : ''}
    ${last.length ? `<p class="ref" style="margin:8px 0 2px"><b>${tr('Dernières erreurs :')}</b></p>${last.map(e => { const r = pk(e.k); return book(r.s) ? `<p class="ref" style="margin:0">${fdate(e.t)} · ${rlabel(r)} · ${esc(MODE_NAME[e.m] || e.m)}</p>` : ''; }).join('')}` : ''}</div>`;
}
function tchActionsHtml(id){
  const D = tch.detail, goals = D.goals || [], fd = t => new Date(t + 'T00:00:00').toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short'}), soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  return `<div class="sib"><p class="ref" style="margin:0 0 2px"><b>${tr('Objectifs')}</b></p>
    ${goals.map(g => { const x = tcGoalR(D.data.stats, g.surah, gTo(g), slen); return `<div class="weak" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(goalName(g))} · ${tr('pour le {d}', {d: fd(g.due)})} · ${dueLabel(g.due)}${g.note ? ` · ${esc(g.note)}` : ''}</span><button class="link" style="color:var(--ko)" data-act="tch-goal-del" data-v="${g.id}">${tr('Supprimer')}</button></div><div class="bar" role="img" aria-label="${x.pct} %"><i style="width:${x.pct}%"></i></div><span class="ref">${x.seen}/${x.total} (${x.pct} %)</span></div>`; }).join('') || `<p class="ref" style="margin:0">${tr("Aucun objectif en cours.")}</p>`}
    <div class="row" style="margin-top:6px"><label class="f" for="tch-gs" style="flex:1 1 100%;margin:0">${tr('De la sourate')}</label><select id="tch-gs">${Q.map(x => `<option value="${x.n}">${x.n}. ${esc(SN(x.n))}</option>`).join('')}</select><label class="f" for="tch-ge" style="flex:1 1 100%;margin:0">${tr('à la sourate (pour plusieurs sourates)')}</label><select id="tch-ge">${Q.map(x => `<option value="${x.n}">${x.n}. ${esc(SN(x.n))}</option>`).join('')}</select><label class="f" for="tch-gd" style="flex:1 1 100%;margin:0">${tr('Date limite')}</label><input type="date" id="tch-gd" value="${soon}"></div>
    <div class="row"><input type="text" id="tch-gn" maxlength="140" placeholder="${tr('Remarque (facultatif)')}" aria-label="${tr('Remarque (facultatif)')}"><button data-act="tch-goal-add" data-v="${id}" style="flex:0 0 auto">${tr('Fixer l\'objectif')}</button></div>
    <p class="ref" style="margin:10px 0 4px"><b>${tr('Conversation')}</b></p>
    <div class="chat" id="chat-thread" role="log" aria-live="polite" aria-label="${tr('Conversation')}" tabindex="0">${chatHtml((D.thread || []).slice().reverse(), m => !m.from_student, false)}</div>
    <div class="compose"><textarea id="tch-msg" maxlength="280" rows="3" aria-label="${tr('Message à l\'élève')}" placeholder="${tr('Un mot d\'encouragement (280 caractères)')}" data-enter="tch-send-btn" data-count="chat-count"></textarea><button class="pri" id="tch-send-btn" data-act="tch-send" data-v="${id}">${tr('Envoyer')}</button></div><span class="cnt" id="chat-count">0/280</span></div>`;
}
const renderTeacher = () => tchRefresh();
const tchSorted = () => {
  const U = tch.unread || {}, q = (tch.q || '').toLowerCase(), act = u => u.last_seen ? Date.parse(u.last_seen) : 0, rate = u => Number(u.answers) ? u.ok / u.answers : 2;
  const by = {activity: (a, b) => act(b) - act(a), unread: (a, b) => (U[b.id] || 0) - (U[a.id] || 0) || act(b) - act(a), rate: (a, b) => rate(a) - rate(b), name: (a, b) => a.email.localeCompare(b.email)}[tch.sort] || (() => 0);
  return (tch.students || []).filter(u => !q || u.email.toLowerCase().includes(q)).sort(by);
};
function tabTeacher(){
  const S = tch.students, fdd = t => new Date(t).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short', year: 'numeric'}), idle = u => !u.last_seen ? Infinity : Math.floor((Date.now() - Date.parse(u.last_seen)) / 864e5);
  const row = u => { const open = tch.detail && tch.detail.id === u.id, pct = Number(u.answers) ? Math.round(100 * u.ok / u.answers) : null, d = idle(u);
    return `<div class="sib"><p style="margin:0"><b>${esc(u.email)}</b>${(tch.unread || {})[u.id] ? ` <span class="tbadge">${ic('mail')} ${tch.unread[u.id]}</span>` : ''}${d > 7 ? ` <span class="warn">${ic('alert')} ${d === Infinity ? tr('jamais connecté') : tr('inactif depuis {n} j', {n: d})}</span>` : ''}</p>
      <p class="ref" style="margin:0">${tr('depuis le {d}', {d: fdd(u.since)})} · ${tr('actif {b}', {b: when(u.last_seen)})} · ${trp(Math.round(u.answers), '{n} réponse|{n} réponses')} · ${trp(u.errors, '{n} erreur|{n} erreurs')}</p>
      ${pct === null ? '' : `<div class="bar" role="img" aria-label="${tr('réussite {p} %', {p: pct})}"><i style="width:${pct}%"></i></div><p class="ref" style="margin:0">${tr('réussite {p} %', {p: pct})}</p>`}
      <div class="grades"><button data-act="tch-detail" data-v="${u.id}">${open ? tr('Masquer') : tr('Progression et messages')}</button><button data-act="tch-del" data-v="${u.id}" style="color:var(--ko)">${tr('Retirer')}</button></div>
      ${open ? (tch.detail.data ? tchDetailHtml(tch.detail.data) + tchActionsHtml(u.id) : '') : ''}</div>`; };
  const list = tchSorted();
  return `<h1 style="margin-top:8px">${tr('Espace enseignant')}</h1>
    <p class="sub">${S ? trp(S.length, '{n} élève|{n} élèves') : tr('Chargement…')}</p>
    ${tch.msg ? `<div class="fb tch-flash ${tch.ok ? 'ok' : 'ko'}">${esc(tch.msg)}</div>` : ''}
    <div class="card"><h2>${tr('Ajouter un élève')}</h2><p class="ref" style="margin:0 0 6px">${tr("L'élève génère un code dans son onglet Élève → Inviter un enseignant. Saisis-le ici : tu ne vois que les élèves qui t'ont invité, tant qu'ils le souhaitent.")}</p>
      <label class="f" for="tch-code">${tr("Code d'invitation")}</label><div class="row"><input type="text" id="tch-code" autocomplete="off" autocapitalize="characters" maxlength="12" style="text-transform:uppercase" data-enter="tch-go"><button id="tch-go" class="pri" data-act="tch-add" style="flex:0 0 auto">${tr('Ajouter')}</button></div></div>
    <div class="card"><h2>${tr('Groupe de classe')}</h2><p class="ref" style="margin:0 0 6px">${tr("Un code réutilisable (40 élèves, 30 jours) à donner à toute la classe. Chaque élève le saisit lui-même : il t'ouvre ainsi l'accès à sa progression.")}</p>
      ${(tch.classes || []).map(c => `<div class="weak"><span><b style="letter-spacing:.12em">${esc(c.code)}</b> · ${c.uses}/${c.max_uses} ${tr('élèves')} · ${tr("jusqu'au {d}", {d: new Date(c.expires_at).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short'})})}</span><button class="link" style="color:var(--ko)" data-act="tch-class-close" data-v="${esc(c.code)}">${tr('Fermer')}</button></div>`).join('')}
      <button data-act="tch-class-new">${tr('Créer un code de classe')}</button></div>
    ${S && S.length ? `<div class="card"><h2>${tr('Message à toute la classe')}</h2><div class="compose"><textarea id="tch-all" maxlength="280" rows="3" aria-label="${tr('Message à toute la classe')}" placeholder="${tr('Un mot pour tous tes élèves (280 caractères)')}" data-enter="tch-all-btn" data-count="all-count"></textarea><button class="pri" id="tch-all-btn" data-act="tch-all">${tr('Envoyer à tous')}</button></div><span class="cnt" id="all-count">0/280</span></div>` : ''}
    <div class="card"><h2>${tr('Mes élèves')}</h2>${S && S.length > 1 ? `<div class="row"><input type="text" id="tch-q" style="flex:1 1 100%" placeholder="${tr('Rechercher un élève')}" aria-label="${tr('Rechercher un élève')}" value="${esc(tch.q || '')}" autocomplete="off"><select id="tch-sort" aria-label="${tr('Trier par')}">${[['activity', 'Activité récente'], ['unread', 'Messages non lus'], ['rate', 'Réussite (les plus fragiles d\'abord)'], ['name', 'Nom']].map(([k, t]) => `<option value="${k}" ${tch.sort === k ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select></div>` : ''}
      ${S ? (list.map(row).join('') || `<p class="sub" style="margin:0">${S.length ? tr('Aucun résultat.') : tr("Aucun élève pour l'instant.")}</p>`) : ''}</div>`;
}
function renderAdmin(){
  setNav(false); screen = 'admin';
  const list = (adm.users || []).filter(u => !adm.q || u.email.toLowerCase().includes(adm.q.toLowerCase()));
  const active = (adm.users || []).filter(u => u.last_seen && Date.parse(u.last_seen) > Date.now() - 7 * 864e5).length;
  const row = u => {
    const self = me && u.id === me.user.id, rate = Number(u.answers) ? Math.round(100 * u.ok / u.answers) + ' %' : '—';
    const d = adm.detail && adm.detail.id === u.id ? adm.detail.data : null;
    let det = '';
    if (d === false) det = `<p class="ref">${tr('Pas encore de progression enregistrée.')}</p>`;
    else if (d){ const x = summarize(d); det = `<div class="sib"><p class="ref" style="margin:0">${trp(Math.round(x.tot), '{n} réponse|{n} réponses')} · ${x.tot ? Math.round(100 * x.ok / x.tot) : 0} % · ${x.seen} ${tr('versets vus')} · ${tr('{n} réponses sur 7 jours', {n: Math.round(x.wk)})}</p>
      ${x.weak.length ? `<p class="ref" style="margin:4px 0 0"><b>${tr('À retravailler :')}</b> ${x.weak.map(([s, r]) => `${esc(book(/^\d+$/.test(s) ? +s : s) ? sname(/^\d+$/.test(s) ? +s : s) : s)} (${Math.round(r * 100)} %)`).join(' · ')}</p>` : ''}
      ${x.last.length ? `<p class="ref" style="margin:4px 0 0"><b>${tr('Dernières erreurs :')}</b></p>${x.last.map(e => { const r = pk(e.k); return book(r.s) ? `<p class="ref" style="margin:0">${fdate(e.t)} · ${rlabel(r)}</p>` : ''; }).join('')}` : ''}</div>`; }
    return `<div class="sib"><p style="margin:0"><b>${esc(u.email)}</b> ${u.role === 'admin' ? `<span class="ref">· ${ic('shield')} ${tr('admin')}</span>` : u.role === 'teacher' ? `<span class="ref">· 🎓 ${tr('enseignant')}</span>` : ''}${u.blocked ? `<span class="ref" style="color:var(--ko)"> · ${tr('suspendu')}</span>` : ''}${self ? `<span class="ref"> · ${tr('toi')}</span>` : ''}</p>
      <p class="ref" style="margin:0">${tr('Inscrit le {a} · actif {b} · {c} · réussite {d} · {e}', {a: when(u.created_at), b: when(u.last_seen), c: trp(Math.round(u.answers), '{n} réponse|{n} réponses'), d: rate, e: trp(u.errors, '{n} erreur|{n} erreurs')})}</p>
      <div class="grades"><button data-act="adm-detail" data-v="${u.id}">${adm.detail && adm.detail.id === u.id ? tr('Masquer') : tr('Progression')}</button>
        <button data-act="adm-role" data-v="${u.id}" ${self ? 'disabled' : ''}>${u.role === 'admin' ? tr('Retirer admin') : tr('Nommer admin')}</button>
        ${u.role === 'admin' ? '' : `<button data-act="adm-teacher" data-v="${u.id}">${u.role === 'teacher' ? tr('Retirer enseignant') : tr('Nommer enseignant')}</button>`}
        <button data-act="adm-block" data-v="${u.id}" ${self ? 'disabled' : ''}>${u.blocked ? tr('Débloquer') : tr('Bloquer')}</button>
        <button data-act="adm-del" data-v="${u.id}" style="color:var(--ko)" ${self ? 'disabled' : ''}>${tr('Supprimer')}</button></div>${det}</div>`;
  };
  $app.innerHTML = `<div class="top"><button class="link" data-act="acc-back">${tr('← Retour')}</button><span>${tr('Administration')}</span></div>
    <h1 style="margin-top:8px">${tr('Espace admin')}</h1>
    <p class="sub">${adm.users ? `${trp(adm.users.length, '{n} compte|{n} comptes')} · ${trp(active, '{n} actif sur 7 jours|{n} actifs sur 7 jours')}` : tr('Chargement…')}</p>
    ${adm.msg ? `<div class="fb ko">${esc(adm.msg)}</div>` : ''}
    ${watchHtml()}
    ${adm.anns ? `<div class="card"><h2>🆕 ${tr('Annoncer une nouvelle version')}</h2>
      <p class="ref" style="margin:0 0 8px">${tr("Après avoir publié une version : tous les comptes reçoivent une notification dans la cloche, une notification sur les appareils qui ont activé les rappels, et un e-mail (sauf s'ils l'ont désactivé). Une seule annonce par numéro de version.")}</p>
      <div class="row"><div><label class="f" for="adm-ver">${tr('Numéro de version')}</label><input type="number" id="adm-ver" min="1" step="1" value="${APP_BUILD}" inputmode="numeric"></div></div>
      <label class="f" for="adm-note">${tr('Ce qui change (facultatif, 200 caractères)')}</label><input type="text" id="adm-note" maxlength="200" autocomplete="off">
      <button class="pri" style="margin-top:8px" data-act="adm-announce">${tr('Annoncer')}</button>
      ${adm.anns.length ? `<p class="ref" style="margin:10px 0 2px"><b>${tr('Annonces déjà faites :')}</b></p>${adm.anns.map(a => `<p class="ref" style="margin:0">${esc(a.label)} · ${a.fanout_at ? tr('cloche et notifications envoyées') : tr('en attente du prochain passage (5 min)')} · ${a.mail_done_at ? tr('e-mails terminés') : trp(Number(a.mails), '{n} e-mail envoyé|{n} e-mails envoyés')}</p>`).join('')}` : ''}</div>` : ''}
    ${(adm.reqs || []).length ? `<div class="card"><h2>🎓 ${tr("Demandes d'enseignant")}</h2>${adm.reqs.map(r => `<div class="weak"><span>${esc(r.email)} · ${when(r.created_at)}</span><span><button class="link" data-act="adm-req-ok" data-v="${r.user_id}">${tr('Accepter')}</button> <button class="link" style="color:var(--ko)" data-act="adm-req-no" data-v="${r.user_id}">${tr('Refuser')}</button></span></div>`).join('')}</div>` : ''}
    <div class="row" style="margin-bottom:10px"><input type="text" id="adm-q" placeholder="${tr('Rechercher un e-mail')}" value="${esc(adm.q)}" autocomplete="off"><button data-act="adm-refresh" style="flex:0 0 auto">${ic('refresh')} ${tr('Actualiser')}</button></div>
    <div class="card">${adm.users ? (list.map(row).join('') || `<p class="sub" style="margin:0">${tr('Aucun compte.')}</p>`) : ''}</div>`;
  const q = $('adm-q'); if (q) q.oninput = () => { adm.q = q.value; const pos = q.selectionStart; renderAdmin(); const n = $('adm-q'); n.focus(); n.setSelectionRange(pos, pos); };
}
async function adminDetail(id){
  if (adm.detail && adm.detail.id === id){ adm.detail = null; return renderAdmin(); }
  try { const {data, error} = await sb.rpc('admin_user_data', {target: id}); if (error) throw error; adm.detail = {id, data: data || false}; adm.msg = ''; }
  catch (e){ adm.msg = friendly(e); }
  renderAdmin();
}
async function adminAct(fn, okMsg){
  try { const {error} = await fn(); if (error) throw error; adm.msg = ''; } catch (e){ adm.msg = friendly(e); }
  await adminLoad();
}
const userOf = id => (adm.users || []).find(u => u.id === id);
function adminTeacher(id){ const u = userOf(id); if (!u || u.role === 'admin') return;
  const to = u.role === 'teacher' ? 'user' : 'teacher';
  if (confirm(tr(to === 'teacher' ? 'Nommer enseignant {u} ? Il pourra voir la progression des élèves qui l\'invitent.' : 'Retirer le rôle enseignant à {u} ?', {u: u.email}))) adminAct(() => sb.rpc('admin_set_role', {target: id, new_role: to})); }
function adminRole(id){ const u = userOf(id); if (!u) return;
  const to = u.role === 'admin' ? 'user' : 'admin';
  if (confirm(tr(to === 'admin' ? 'Nommer administrateur {u} ?' : 'Retirer le rôle admin à {u} ?', {u: u.email}))) adminAct(() => sb.rpc('admin_set_role', {target: id, new_role: to})); }
function adminBlock(id){ const u = userOf(id); if (!u) return;
  if (confirm(tr(u.blocked ? 'Débloquer {u} ?' : 'Bloquer {u} ?', {u: u.email}))) adminAct(() => sb.rpc('admin_set_blocked', {target: id, b: !u.blocked})); }
function adminDelete(id){ const u = userOf(id); if (!u) return;
  if (confirm(tr('Supprimer définitivement le compte {u} et toute sa progression ? Irréversible.', {u: u.email}))) adminAct(() => sb.rpc('admin_delete_user', {target: id})); }
$app.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && e.target.dataset && e.target.dataset.enter){ e.preventDefault(); $(e.target.dataset.enter)?.click(); } });   // Maj+Entrée : retour à la ligne dans un message
$app.addEventListener('input', e => {
  const c = e.target.dataset && e.target.dataset.count; if (c && $(c)) $(c).textContent = e.target.value.length + '/280';
  if (e.target.id === 'tch-q'){ tch.q = e.target.value; const pos = e.target.selectionStart; tchRefresh(); const n = $('tch-q'); if (n){ n.focus(); n.setSelectionRange(pos, pos); } }
});

