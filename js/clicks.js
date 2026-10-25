/* Tathbīt — Gestionnaire de clics : tous les boutons (data-act) de l'application.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- clics ---------- */
let lastField = null;
document.addEventListener('focusin', e => { if (e.target.matches('textarea, .blankin')) lastField = e.target; });
const onClick = e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const v = el.dataset.v;
  switch (el.dataset.act){
    case 'mode': cfg.mode = v; saveCfg(); home(); break;
    case 'corpus': {
      const m = cfg.scope.type === 'matn';
      if (v === 'matn' && !m){ cfg.lastQ = cfg.scope; cfg.scope = {type: 'matn', id: cfg.lastM || 'all'}; if (['mutash', 'mwhich', 'start', 'order', 'end', 'link', 'tajweed'].includes(cfg.mode)) cfg.mode = 'mix'; }
      if (v === 'quran' && m){ cfg.lastM = cfg.scope.id; cfg.scope = cfg.lastQ || DEF.scope; if (['half', 'phrase'].includes(cfg.mode)) cfg.mode = 'mix'; }
      saveCfg(); home(); break;
    }
    case 'ins':
      if (lastField && document.contains(lastField)){ lastField.focus(); lastField.setRangeText(v, lastField.selectionStart, lastField.selectionEnd, 'end'); }
      break;
    case 'corr': cfg.corr = v; saveCfg(); home(); break;
    case 'show': cfg.show[v] = !cfg.show[v]; saveCfg(); home(); break;
    case 'input': cfg.input = v; saveCfg(); home(); break;
    case 'maptab': cfg.map = v; saveCfg(); home(); break;
    case 'mapseen': cfg.mapSeen = !cfg.mapSeen; saveCfg(); home(); break;
    case 'cell': cfg.scope = {type: 'surah', from: +v, to: +v}; go('train'); break;
    case 'pcell': cfg.scope = {type: 'page', from: +v, to: +v}; go('train'); break;
    case 'start': {
      const pool = buildPool(cfg.scope);
      if (cfg.mode === 'half' && !pool.some(r => !isQ(r.s))) return alert(tr('Le mode demi-vers concerne les moutoun.'));
      if (cfg.mode === 'phrase' && !pool.some(r => !isQ(r.s) && book(r.s).kind === 'prose')) return alert(tr('Le mode phrase concerne les textes en prose (ex. les Arbaʿūn).'));
      start(); break;
    }
    case 'review': start(shuffle(reviewPick(15))); break;
    case 'day-go': dayStart(); break;
    case 'wz-next': case 'wz-back': case 'wz-skip': case 'wz-kind': case 'wz-first': case 'wz-recite': welcomeAct(el.dataset.act, v); break;
    case 'day-next': if (ses && ses.day){ ses.day.i++; dayRun(ses.day); } break;
    case 'tile-install': if (deferredInstall && !IS_STANDALONE()) installNow(); else renderInstall(); break;   // Android/Chrome : un toucher lance l'installation
    case 'install-now': installNow(); break;
    case 'tile-tajwid': setCat('tajwid'); saveCfg(); go('train'); break;
    case 'tile-backup': cfg.setTab = 'data'; saveCfg(); go('settings'); break;
    case 'tile-matn': cfg.scope = {type: 'matn', id: cfg.lastM && MT[cfg.lastM] ? cfg.lastM : 'all'}; saveCfg(); go('train'); break;
    case 'strengthen': { const W = weakNow().slice(0, 10); if (W.length) start(shuffle(W.map(w => pk(w.k)))); } break;
    case 'ics': exportIcs(); break;
    case 'export': exportData(); if (cfg.tab === 'home') home(); break;
    case 'export-later': store.set('tathbit.exportSnooze', Date.now() + 7 * 864e5); home(); break;
    case 'import': $('impfile').click(); break;
    case 'addcustom': addCustom(); break;
    case 'delcustom':
      if (confirm(tr('Supprimer ce matn ?'))){ custom = custom.filter(t => t.id !== v); store.set('tathbit.custom', custom); delete MT[v]; cfg.scope = {type: 'matn', id: 'all'}; saveCfg(); home(); } break;
    case 'listen': listen(); break;
    case 'fr-setup': frSetup(); break;
    case 'fr-start': frStart(); break;
    case 'fr-resume': { const [a, b] = String(v).split(':').map(Number), e = frHist()[a]; frStart({s: a, a: b, to: e ? e.rt : a}); } break;
    case 'fr-stop': frFinish('stop'); break;
    case 'fr-hint': frHint(); break;
    case 'fr-heard': frHeard(v); break;
    case 'fr-skip': frSkip(); break;
    case 'fr-quit': frQuit(); break;
    case 'fr-again': frSetup(); break;
    case 'fr-err': frErrors(); break;
    case 'fr-vow': frVowels(); break;
    case 'fr-vow-back': frShowSummary(); break;
    case 'fr-vow-save': frVowelsSave(); break;
    case 'fr-wd': { el.classList.toggle('bad'); const n = document.querySelectorAll('.wd.bad').length, b = $('fr-vow-go'); if (b) b.textContent = trp(n, 'Valider ({n} mot marqué)|Valider ({n} mots marqués)'); break; }
    case 'fr-reveal': { const b = el.closest('.sib'); if (b) b.classList.toggle('open'); break; }
    case 'play': playUrls(cur.audio.map(audioUrl)); break;
    case 'stopaudio': stopAudio(); break;
    case 'lsopen': lsOpen(); break;
    case 'ls-prev': if (ls.i > 0){ ls.i--; } lsPlay(); break;
    case 'ls-next': if (ls.i < ls.refs.length - 1){ ls.i++; } lsPlay(); break;
    case 'ls-toggle': if (player.paused && player.src) player.play(); else player.pause(); break;
    case 'ls-hide': ls.hide = !ls.hide; lsRender(); break;
    case 'home': home(); break;
    case 'tab': if (v === 'settings') { cfg.setTab = 'hub'; setQ = ''; } go(v); break;   // en touchant « Réglages », on retrouve toujours les 6 blocs

    case 'upd': forceUpdate(el); break;
    case 'aud-scope': audioScope(); break;
    case 'aud-plan': audioPlanToday(false); break;
    case 'aud-est': audioEst(); break;
    case 'aud-dl': audioGo(); break;
    case 'aud-cancel': if (audioUI.ctl) audioUI.ctl.abort(); break;
    case 'aud-del': audioDel(+v); break;
    case 'aud-delall': audioDelAll(); break;
    case 'rem-offer-on': remOfferAct(true); break;
    case 'rem-offer-later': remOfferAct(false); break;
    case 'rem-on': case 'rem-save': case 'rem-off': case 'rem-test': remAction(el.dataset.act); break;
    case 'cm-cam': $('cm-f-cam').click(); break;
    case 'cm-img': $('cm-f-img').click(); break;
    case 'cm-doc': $('cm-f-doc').click(); break;
    case 'cm-clear': cmHist.push($('cm-text').value); $('cm-text').value = ''; cmStatus(''); break;
    case 'cm-undo': if (cmHist.length){ $('cm-text').value = cmHist.pop(); cmStatus(tr('Dernier ajout annulé.')); } else cmStatus(tr('Rien à annuler.')); break;
    case 'cm-up': case 'cm-down': { const i = +v, j = el.dataset.act === 'cm-up' ? i - 1 : i + 1; if (cmQueue[j]){ [cmQueue[i], cmQueue[j]] = [cmQueue[j], cmQueue[i]]; renderQueue(); } break; }
    case 'cm-rm': cmQueue.splice(+v, 1); renderQueue(); break;
    case 'cm-qclear': cmQueue = []; renderQueue(); break;
    case 'cm-run': runQueue(); break;
    case 'cm-rev': { const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter('ar', {granularity: 'grapheme'}) : null;
      $('cm-text').value = $('cm-text').value.split('\n').map(l => (seg ? [...seg.segment(l)].map(x => x.segment) : Array.from(l)).reverse().join('')).join('\n'); break; }
    case 'plan-save': {
      const d = $('pf-from') ? pfRead() : (pdraft || {}); plan = {v: 1, from: d.from, to: d.to, order: d.order, amt: d.amt, recent: d.recent, cycle: d.cycle,
        log: plan ? plan.log : [], mptr: plan ? plan.mptr || 0 : 0, done: plan ? plan.done || {} : {}};
      savePlan(); planEditing = false; pdraft = null; home(); window.scrollTo(0, 0); break;
    }
    case 'plan-edit': planEditing = true; pdraft = null; home(); break;
    case 'plan-cancel': planEditing = false; pdraft = null; home(); break;
    case 'plan-del': if (confirm(tr("Supprimer ton plan et sa progression d'apprentissage ?"))){ plan = null; savePlan(); planEditing = false; pdraft = null; home(); } break;
    case 'plan-sabaq': openSabaq(); break;
    case 'plan-sabqi': startChunks(planToday().rec, 'sabqi'); break;
    case 'plan-manzil': { const T = planToday(); startChunks(T.man, 'manzil', T.rot); } break;
    case 'plan-learned': learnChunk(sab && sab.ch); break;
    case 'sab-back': sab = null; go('plan'); break;
    case 'sab-play': playUrls(Array.from({length: sab.rep}).flatMap(() => chunkRefs(sab.ch).map(audioUrl))); break;
    case 'sab-hide': stopAudio(); sab.hide = !sab.hide; renderSabaq(); break;
    case 'sab-test': sabTest(); break;
    case 'rv-sab': el.classList.toggle('hid'); break;
    case 'legal': renderLegal(); break;
    case 'contact': renderContact(); break;
    case 'contact-copy': copyContact(); break;
    case 'diag-copy': copyDiag(); break;
    case 'legal-back': case 'contact-back': if (cloudOn() && !me) renderAccount(); else go('settings'); break;
    case 'lang': setLang(v); break;
    case 'pw-eye': { const i = $(v), show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.innerHTML = show ? EYE_OFF : EYE;
      el.setAttribute('aria-pressed', String(show)); el.setAttribute('aria-label', show ? tr('Masquer le mot de passe') : tr('Afficher le mot de passe')); i.focus(); break; }
    case 'acc-open': openAccount(v); break;
    case 'acc-back': go('settings'); break;
    case 'acc-mode': keepEmail(); acc.d.pass = acc.d.pass2 = ''; acc.mode = v; acc.msg = ''; acc.auto = false; renderAccount(); break;
    case 'acc-login': doLogin(); break;
    case 'acc-resend': doResend(); break;
    case 'acc-code': doCode(); break;
    case 'acc-signup': doSignup(); break;
    case 'acc-reset': doReset(); break;
    case 'acc-newpass': doNewPass(); break;
    case 'acc-logout': doLogout(); break;
    case 'acc-sync': doSync(); break;
    case 'acc-delete': doDeleteMe(); break;
    case 'adm-open': openAdmin(); break;
    case 'adm-refresh': adminLoad(); break;
    case 'set-grp': cfg.setTab = v; setQ = ''; saveCfg(); home(); window.scrollTo(0, 0); break;
    case 'news-open': openNews(); break;
    case 'news-dismiss': if (news) store.set('tathbit.newsSeen', +news.v); newsSlot(); break;
    case 'news-back': go('home'); break;
    case 'news-go': newsGo(v); break;
    case 'adm-announce': {
      const ver = Math.round(+$('adm-ver').value), note = ($('adm-note').value || '').trim();
      if (!(ver >= 1)) { adm.msg = tr('Numéro de version invalide.'); renderAdmin(); break; }
      if (confirm(tr('Prévenir tous les utilisateurs de la version {v} (cloche, notification, e-mail) ?', {v: ver}))) adminAct(() => sb.rpc('admin_announce_update', {p_version: ver, p_label: ver === APP_BUILD ? APP_VERSION : 'v' + ver, p_note: note || null}));
      break; }
    case 'adm-detail': adminDetail(v); break;
    case 'adm-role': adminRole(v); break;
    case 'adm-teacher': adminTeacher(v); break;
    case 'tch-add': tchAdd(); break;
    case 'tch-detail': tchDetail(v); break;
    case 'tch-del': tchDrop(v); break;
    case 'tch-add-toggle': tch.addOpen = !tch.addOpen; renderTeacher(); break;
    case 'tch-invite': tchInvite(); break;
    case 'tch-cancel': tchCancel(v); break;
    case 'tch-copy': tchCopy(); break;
    case 'tch-msg-del': tchMsgDel(v); break;
    case 'tch-reply-send': tchReply(); break;
    case 'bell': nfToggle(); break;
    case 'goal-go': startGoal(v); break;
    case 'nf-open': nfOpen(+v); break;
    case 'nf-done': nfRead(+v); break;
    case 'nf-all': nfAll(); break;
    case 'nf-close': nfClose(); break;
    case 'tch-all': tchAll(); break;
    case 'tch-join-go': tchJoin(); break;
    case 'tch-class-new': tchClassNew(); break;
    case 'tch-class-close': tchClassClose(v); break;
    case 'tch-send': tchSend(v); break;
    case 'tch-goal-add': tchGoalAdd(v); break;
    case 'tch-goal-del': tchGoalDel(v); break;
    case 'tch-req': tchAct(() => sb.rpc('teacher_request'), tr('Demande envoyée.')).then(tchLoadStudent); break;
    case 'tch-req-cancel': tchAct(() => sb.rpc('teacher_request_cancel'), tr('Demande annulée.')).then(tchLoadStudent); break;
    case 'adm-req-ok': adminAct(() => sb.rpc('admin_set_role', {target: v, new_role: 'teacher'})); break;
    case 'adm-req-no': adminAct(() => sb.rpc('admin_teacher_decline', {target: v})); break;
    case 'adm-block': adminBlock(v); break;
    case 'adm-del': adminDelete(v); break;
    case 'rdopen': { const r = pk(v); openReader((isQ(r.s) ? 'q:' : 'm:') + r.s, r.a); break; }
    case 'rdscope': {
      const sc = cfg.scope;
      if (sc.type === 'matn') openReader('m:' + sc.id);
      else if (sc.type === 'all') openReader('q:all');
      else { const ss = [...new Set(buildPool(sc).map(r => r.s))]; if (ss.length === 1) openReader('q:' + ss[0]); else openReader('q:sel', 0, ss); }
      break;
    }
    case 'rd-back': rdStop(); home(); break;
    case 'rd-taj': case 'rd-tf': { const k = el.dataset.act === 'rd-taj' ? 'rdTaj' : 'rdTf'; cfg[k] = !cfg[k]; saveCfg(); rd.err = ''; const y = scrollY; rdStop(); rd.focus = 0; renderReader(); scrollTo(0, y); } break;
    case 'rd-fold': { // replier / déplier tous les blocs
      rd.closed.clear(); if (v === '1') rd.secs.forEach(id => (MT[id].sec || []).forEach((_, k) => rd.closed.add(id + ':' + k)));
      const y = scrollY; rdStop(); rd.focus = 0; renderReader(); scrollTo(0, y); break; }
    case 'rd-hide': cfg.rdHide = !cfg.rdHide; saveCfg(); { const y = scrollY; rdStop(); rd.focus = 0; renderReader(); scrollTo(0, y); } break;
    case 'ar-size': cfg.rdSize = v === 'reset' ? AR_DEF : Math.min(3.2, Math.max(1.1, +((cfg.rdSize || AR_DEF) + 0.2 * +v).toFixed(2))); saveCfg(); applyArSize(); home(); break;
    case 'rd-size': cfg.rdSize = Math.min(3.2, Math.max(1.1, +(cfg.rdSize + 0.2 * +v).toFixed(2))); saveCfg(); applyArSize(); { const y = scrollY; rdStop(); rd.focus = 0; renderReader(); scrollTo(0, y); } break;
    case 'rd-prev': case 'rd-next': {
      const k = rd.spec.slice(0, 1), id = rd.secs[0], ids = k === 'q' ? Array.from({length: 114}, (_, i) => i + 1) : Object.keys(MT);
      rdStop(); openReader(k + ':' + ids[ids.indexOf(id) + (el.dataset.act === 'rd-next' ? 1 : -1)]); break;
    }
    case 'rd-more-up': rdStop(); rd.i0 = Math.max(0, rd.i0 - 3); rd.focus = 0; renderReader(); window.scrollTo(0, 0); break;
    case 'rd-play': if (rd.playing) rdStop(); else rdPlay(rd.secs[rd.i0], 1); break;
    case 'rv':
      if (el.classList.contains('hid')) el.classList.remove('hid');
      else if (rd.spec.startsWith('q')){ rdStop(); rdPlay(+el.dataset.s, +el.dataset.i); }
      break;
    case 'hist': go('errors'); break;
    case 'hfilter': hf = v; home(); break;
    case 'hreview': if (hrefs.length) start(shuffle(hrefs)); break;
    case 'hclear': if (confirm(tr("Effacer tout l'historique des erreurs ?"))){ errors = []; store.set('tathbit.errors', errors); home(); } break;
    case 'nextq': nextQ(); break;
    case 'reveal': stopMic(); $('work').innerHTML = markUI(); break;
    case 'wd': el.classList.toggle('bad'); { const n = document.querySelectorAll('.wd.bad').length; $('mark-go').textContent = trp(n, 'Valider ({n} erreur)|Valider ({n} erreurs)'); } break;
    case 'mark-ok': case 'mark-mid': {
      const sc = el.dataset.act === 'mark-ok' ? 1 : 0.5;
      if (cur.refs) cur.perRef = cur.refs.map(x => [x, sc]);
      $('work').innerHTML = ''; finish(sc); break;
    }
    case 'mark-go': markGo(); break;
    case 'blank': el.classList.toggle('rev'); break;
    case 'revealall':
      document.querySelectorAll('.blank').forEach(b => b.classList.add('rev'));
      $('work').innerHTML = gradeUI(); break;
    case 'grade': finish(+v); $('work').innerHTML = ''; break;
    case 'check': evaluate($('ans').value); break;
    case 'checkcloze': onCheckCloze(); break;
    case 'opt': onOpt(el); break;
    case 'retry': start(ses.missed.slice()); break;
    case 'again': start(); break;
    case 'reset': if (confirm(tr("Effacer toutes tes statistiques et ton historique d'erreurs ?"))){ stats = {}; sched = {}; days = {}; errors = []; tjs = {}; hfs = {}; store.set('tathbit.tj', tjs); store.set('tathbit.hf', hfs); store.set('tathbit.errors', errors); store.set('tathbit.stats', stats); store.set('tathbit.sched', sched); store.set('tathbit.days', days); home(); } break;
  }
};
$app.addEventListener('click', onClick);
$('nav').addEventListener('click', onClick);

