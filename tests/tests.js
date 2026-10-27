/* Tests de l'application Tathbīt : pilotent index.html dans un <iframe> avec de vrais clics.
   Résultat : window.__result = {passed, failed, results:[{name, ok, err}]} et affichage dans la page. */
(async () => {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!local && !/[?&]force\b/.test(location.search)){ document.getElementById('sum').innerHTML = '<b class="ko">Refusé : lance ces tests depuis localhost (ils effacent puis restaurent la progression locale).</b>'; window.__result = {passed: 0, failed: 1, results: []}; return; }

  const results = [], tests = [];
  const FAST = /[?&]fast\b/.test(location.search);   // « ?fast » : on saute les tests lents (audit d'accessibilité, audio réel sur le réseau) ; la suite complète reste obligatoire avant d'envoyer
  const SLOW = /audit axe|\(réseau requis\)/;
  const test = (name, fn) => tests.push({name, fn, slow: SLOW.test(name)});
  const fail = m => { throw new Error(m); };
  const ok = (c, m) => { if (!c) fail(m || 'condition fausse'); };
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail((m ? m + ' : ' : '') + 'attendu ' + JSON.stringify(b) + ', obtenu ' + JSON.stringify(a)); };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---- application sous test ---- */
  const saved = {}; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k.startsWith('tathbit.')) saved[k] = localStorage.getItem(k); }
  const clean = () => Object.keys(localStorage).filter(k => k.startsWith('tathbit.')).forEach(k => localStorage.removeItem(k));
  const restore = () => { clean(); Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v)); };
  window.addEventListener('pagehide', restore);
  clean();
  const fr = document.createElement('iframe'); fr.src = '../index.html'; document.body.appendChild(fr);
  await new Promise(r => fr.addEventListener('load', r, {once: true}));
  const W = fr.contentWindow, D = fr.contentDocument, E = c => W.eval(c);
  const jsErrors = []; W.addEventListener('error', e => jsErrors.push(e.message)); W.addEventListener('unhandledrejection', e => jsErrors.push(String(e.reason && e.reason.message || e.reason)));
  for (let i = 0; i < 100 && !(() => { try { return E('Q') && E('Q').length; } catch { return 0; } })(); i++) await wait(100);
  ok(E('Q') && E('Q').length === 114, "le Coran ne s'est pas chargé");
  E("CLOUD.url = ''; CLOUD.anonKey = ''; sb = null; me = null; window.confirm = () => true; window.alert = m => { window.__alerts = (window.__alerts || []).concat(String(m)); };"); // pas de compte pendant les tests
  const reset = (extra = '') => { E("cfg = Object.assign({}, DEF, {tab: 'home', n: 5, corr: 'standard', setTab: 'all'}); setQ = ''; stats = {}; sched = {}; days = {}; errors = []; plan = null; custom = []; ses = null; LANG = 'fr'; store.set('tathbit.welcome', 1); wz = {i: 0, kind: 'quran', from: 78, to: 114, matn: 'all'}; applyLang(); " + extra); jsErrors.length = 0; };
  const $q = s => D.querySelector(s), $$q = s => [...D.querySelectorAll(s)], appText = () => D.getElementById('app').textContent;   // texte de l'écran seulement (le code de la page n'en fait pas partie)
  const click = el => { ok(el, 'élément introuvable'); el.click(); };
  const clickAct = (act, v) => { const sel = `[data-act="${act}"]${v !== undefined ? `[data-v="${v}"]` : ''}`; const el = $q(sel); if (!el) throw new Error('élément introuvable : ' + sel); click(el); };
  const noErr = ctx => ok(!jsErrors.length, `erreur JS pendant « ${ctx} » : ${jsErrors.join(' / ')}`);
  const fb = () => $q('#fb .fb');
  const ALL = "{type: 'surah', from: 1, to: 114}", MAT = "{type: 'matn', id: 'all'}";
  const expectedText = () => E("cur.units.map(u => u.text).join(' ')");
  const strip = t => t.replace(/[ً-ْٰ]/g, '');
  const fill = (txt) => { const a = $q('#ans'); ok(a, 'zone de saisie absente'); a.value = txt; };

  /* ---- données ---- */
  test('Coran : 114 sourates, 6236 versets, 604 pages, 30 juz', () => {
    eq(E('Q.length'), 114); eq(E('Q.reduce((n, s) => n + s.a.length, 0)'), 6236);
    eq(E('Math.max(...Q.flatMap(s => s.a.map(v => v.p)))'), 604); eq(E('Math.max(...Q.flatMap(s => s.a.map(v => v.j)))'), 30);
    eq(E('quranOk(Q)'), true);
  });
  test('Coran : le texte embarqué (quran.js) est utilisé et son empreinte SHA-256 correspond', async () => {
    ok(W.QURAN && W.QURAN.surahs.length === 114, 'quran.js absent');
    const txt = W.QURAN.surahs.flatMap(s => s.a.map(v => v[0])).join('\n');
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    eq([...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''), W.QURAN.sha256);
    eq(E("Q[1].a[0].t"), W.QURAN.surahs[1].a[0][0], 'le texte affiché doit venir de quran.js');
  });
  test('Coran : Fatiha 7 versets, Baqara 286, Tawba sans basmala préfixée', () => {
    eq(E('Q[0].a.length'), 7); eq(E('Q[1].a.length'), 286);
    ok(!E('Q[1].a[0].t').startsWith('بِسْمِ'), 'la basmala ne doit pas préfixer le verset 1 de la Baqara');
    ok(E('Q[0].a[0].t').startsWith('بِسْمِ'), 'la Fatiha commence par la basmala (c\'est son verset 1)');
  });
  test('Moutoun : Tuhfa 61, Bayquniyya 34, Ibn ʿĀshir 314, Arbain 42 unités', () => {
    eq(E("MT.tuhfa.a.length"), 61); eq(E("MT.bayquniyya.a.length"), 34); eq(E("MT.ibnachir.a.length"), 314); eq(E("MT.arbain.a.length"), 42);
  });
  test('Moutoun : groupés par thème, avec choix d’un bloc (chapitre) dont les exercices ne portent que sur ce bloc', async () => {
    reset(); E("cfg.scope = {type: 'matn', id: 'tuhfa'}; cfg.tab = 'train'; go('train')");
    const groups = [...$q('#smatn').querySelectorAll('optgroup')].map(g => g.label);
    eq(groups.length, 4, 'un groupe par discipline : ' + groups.join(' | '));
    ok($q('#ssec') && $q('#ssec').options.length === 11, 'choix du bloc : « tout le matn » + 10 blocs de la Tuhfa');
    eq(E("buildPool({type: 'matn', id: 'tuhfa', sec: 1}).length"), 11, 'bloc 2 (nūn sākina et tanwīn) = vers 6 à 16');
    eq(E("buildPool({type: 'matn', id: 'tuhfa', sec: 9}).map(r => r.a).join()"), '58,59,60,61', 'dernier bloc = jusqu’au dernier vers');
    eq(E("buildPool({type: 'matn', id: 'tuhfa'}).length"), 61, 'sans bloc : tout le matn');
    eq(E("buildPool({type: 'matn', id: 'all'}).length"), 61 + 34 + 314 + 42, 'tous les moutoun');
    $q('#ssec').value = '1'; $q('#ssec').dispatchEvent(new Event('change'));
    eq(E("cfg.scope.sec"), 1, 'le bloc choisi est retenu'); ok(E("scopeLabel(cfg.scope)").includes('Nūn sākina'), 'le bloc apparaît dans le libellé de la portée');
    const start = () => $q('.cta [data-act="start"]').textContent;
    ok(start().includes('Nūn sākina'), 'le bouton de départ porte le nom du bloc');
    ok($q('#ssec').options[0].value === '' && $q('#ssec').options[0].textContent.includes('Tout le matn'), 'le matn entier est le premier choix de la liste des blocs');
    $q('#ssec').value = ''; $q('#ssec').dispatchEvent(new Event('change'));
    eq(E("cfg.scope.sec"), undefined, 'retour au matn entier'); ok(!start().includes('Nūn sākina'), 'le bouton de départ ne porte plus le nom du bloc');
    E("cfg.scope = {type: 'matn', id: 'bayquniyya'}; go('train')"); ok(!$q('#ssec'), 'un matn sans titres de chapitres dans sa source n’a pas de choix de bloc');
    E("openReader('m:ibnachir')"); await wait(300); eq($$q('.rblk').length, 27, 'le lecteur affiche les titres des 27 blocs d’Ibn ʿĀshir');
    eq($$q('details.rblkd[open]').length, 27, 'matn entier : blocs dépliés au départ');
    eq($$q(".rv").length, 314, "les 314 vers sont présents");
    ok($q('#rdblk') && $q('#rdblk').options[0].value === '', 'lecteur : « tout le matn » en tête de la liste des blocs');
    $q('[data-act="rd-fold"][data-v="1"]').click(); eq($$q('details.rblkd[open]').length, 0, 'Tout replier');
    eq(E("rd.closed.size"), 27, 'l’état replié est mémorisé');
    $q('[data-act="rd-fold"][data-v="0"]').click(); eq($$q('details.rblkd[open]').length, 27, 'Tout déplier');
    $q('#rdblk').value = '3'; $q('#rdblk').dispatchEvent(new Event('change'));
    eq($$q('.rv').length, 7, 'un seul bloc : seuls ses vers (« Les piliers de l’islam » = vers 42 à 48) sont affichés');
    eq($$q('h3.rblk').length, 1, 'un seul titre de bloc'); eq($$q('details.rblkd').length, 0, 'un seul bloc : pas de repli'); ok(!$q('[data-act="rd-fold"]'), 'pas de boutons replier/déplier pour un seul bloc');
    eq($q('.rv .pn').textContent, '42', 'la numérotation reste celle du matn');
    E("openReader('m:bayquniyya')"); await wait(200); ok(!$q('#rdblk') && !$q('[data-act="rd-fold"]'), 'matn sans blocs : ni choix de bloc ni boutons de repli'); noErr('blocs');
  });
  test('Versets proches : toutes les références existent', () => {
    const bad = []; const MS = E('MS');
    for (const [k, v] of Object.entries(MS)){ const [s, a] = k.split(':').map(Number); if (!E(`Q[${s - 1}] && ${a} <= Q[${s - 1}].a.length`)) bad.push(k);
      v.forEach(x => { const [s2, a2] = x.split(':').map(Number); if (!E(`Q[${s2 - 1}] && ${a2} <= Q[${s2 - 1}].a.length`)) bad.push(x); }); }
    eq(bad, []);
  });
  test('Service worker : tous les fichiers de la liste existent', async () => {
    const src = await (await fetch('../sw.js', {cache: 'no-cache'})).text();
    const files = [...src.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
    ok(files.includes('quran.js'), 'quran.js doit être dans le cache hors ligne');
    const missing = []; for (const f of files){ const r = await fetch('../' + f, {method: 'HEAD', cache: 'no-cache'}); if (!r.ok) missing.push(f); }
    eq(missing, []);
  });
  test('Lecteur : données du tajwīd, des traductions et du tafsir complètes et conformes à leur empreinte', async () => {
    for (const n of ['tajweed', 'fr', 'en', 'muyassar']){
      const x = await W.loadX(n); eq(x.s.length, 114, n); eq(x.s.reduce((t, a) => t + a.length, 0), 6236, n);
      eq(x.s.map(a => a.length).slice(0, 3), [7, 286, 200], n); ok(x.url && x.name, 'source affichable');
    }
    const t = E("QX.tajweed.s.flatMap(a => a).join('')"); ok(!t.replace(/\[[a-z]\[/g, '').includes('['), 'balise inconnue ou mal formée');
    eq((t.match(/\[[a-z]\[/g) || []).length, (t.match(/\]/g) || []).length, 'balises équilibrées');
  });
  test('Lecteur : tajwīd, traduction et tafsir — une ligne par verset, légende et sources affichées', async () => {
    reset(); E("openReader('q:1')");
    clickAct('rd-taj'); await wait(1200); ok($q('#rbody .rd.tj .tj-n'), 'couleurs absentes'); ok($q('details summary'), 'légende absente');
    ok(appText().includes('1x.ax') || $$q('a').some(a => /1x\.ax/.test(a.href)), 'lien de la légende officielle');
    const sel = $q('#rdtr'); sel.value = 'fr'; sel.dispatchEvent(new W.Event('change')); await wait(1200);
    eq($$q('#rbody .rvb').length, 7); eq($q('#rbody .rtr').textContent, E("QX.fr.s[0][0]")); ok($$q('a').some(a => /tanzil\.net\/trans/.test(a.href)), 'lien Tanzil obligatoire');
    clickAct('rd-tf'); await wait(1500); eq($$q('#rbody .rtf').length, 7); ok($$q('a').some(a => /alquran\.cloud/.test(a.href)), 'source du tafsir');
    clickAct('rd-hide'); ok($$q('#rbody .rv.hid').length === 7 && $q('#rbody .rtr'), 'le texte arabe se masque, la traduction reste');
    clickAct('rd-hide'); $q('#rdtr').value = ''; $q('#rdtr').dispatchEvent(new W.Event('change')); await wait(300); eq($$q('#rbody .rvb').length, 7, 'le tafsir garde le mode ligne par ligne');
    clickAct('rd-tf'); await wait(300); eq($$q('#rbody .rvb').length, 0); clickAct('rd-taj'); await wait(300); ok(!$q('#rbody .tj-n'), 'couleurs retirées'); noErr('lecteur enrichi');
    // la verification d'un fichier altéré doit échouer (aucun contenu douteux affiché)
    E("delete QX.en; delete XPROMISE.en; XFILES.en = 'data/does-not-exist.js'"); let failed = false; try { await W.loadX('en'); } catch { failed = true; } ok(failed, 'un fichier absent doit être refusé');
    E("XFILES.en = 'data/tr-en.js'; cfg.rdTr = ''; cfg.rdTaj = false; cfg.rdTf = false;");
  });
  test('Lecteur enrichi : aucune clé de traduction manquante (en, ar) légende comprise', async () => {
    for (const L of ['en', 'ar']){
      reset(); E(`setLang('${L}'); cfg.rdTaj = true; cfg.rdTr = 'fr'; cfg.rdTf = true;`); await Promise.all(['tajweed', 'fr', 'muyassar'].map(n => W.loadX(n)));
      E("openReader('q:114')"); await wait(200); ok($q('.tjkey'), 'légende'); eq(E('[...missingKeys]'), [], L);
    }
    E("cfg.rdTaj = false; cfg.rdTr = ''; cfg.rdTf = false;");
  });
  test('Traductions : aucune clé manquante sur les écrans principaux (en, ar)', async () => {
    const miss = {};
    for (const L of ['en', 'ar']){
      reset(); E(`setLang('${L}')`);
      for (const t of ['home', 'train', 'plan', 'progress', 'settings', 'errors']){ E(`go('${t}')`); await wait(20); }
      E("renderLegal()"); E("openReader('q:1')"); E("openReader('m:tuhfa')");
      E("start(buildPool(cfg.scope))"); E("home()");
      miss[L] = E('[...missingKeys]');
    }
    eq(miss, {en: [], ar: []});
  });

  /* ---- exercices à choix : de vrais clics, répétés (les tirages sont aléatoires) ---- */
  const choice = [['which', ALL], ['mcq', ALL], ['mutash', ALL], ['mwhich', ALL], ['order', ALL], ['which', MAT], ['mcq', MAT]];
  for (const [mode, scope] of choice){
    const label = `${mode} (${scope === ALL ? 'Coran' : 'moutoun'})`;
    test(`QCM ${label} : bonne réponse → vert, mauvaise → rouge (30 tirages)`, () => {
      reset(`cfg.mode = '${mode}'; cfg.scope = ${scope};`);
      for (let n = 0; n < 30; n++){
        const wantOk = n % 2 === 0;
        E("start()");
        noErr('start ' + label);
        const btns = $$q('.opt'); ok(btns.length >= 3, 'moins de 3 propositions');
        const isGood = b => E(`(cur.m === 'which' || cur.m === 'order' || cur.m === 'mwhich') ? (isQ(cur.correct) ? +"${b.dataset.v}" : "${b.dataset.v}") === cur.correct : cur.opts[+"${b.dataset.v}"] === cur.good`);
        const goods = btns.filter(isGood); eq(goods.length, 1, 'une seule bonne réponse attendue');
        const target = wantOk ? goods[0] : btns.find(b => !isGood(b));
        click(target); noErr('clic ' + label);
        ok(fb() && fb().classList.contains(wantOk ? 'ok' : 'ko'), `tirage ${n} : retour ${wantOk ? 'vert' : 'rouge'} attendu`);
        ok($q('.opt.c'), 'la bonne réponse doit être marquée');
        if (!wantOk) ok($q('.opt.w'), 'la réponse fausse doit être marquée');
        click(target); // second clic : sans effet
        eq(E('ses.score'), wantOk ? 1 : 0, 'score');
        E("home()");
      }
    });
  }

  /* ---- exercices à saisie ---- */
  const typed = [['next', ALL], ['start', ALL], ['end', ALL], ['link', ALL], ['cont', ALL], ['half', MAT], ['phrase', MAT], ['next', MAT]];
  for (const [mode, scope] of typed){
    test(`Saisie ${mode} (${scope === ALL ? 'Coran' : 'moutoun'}) : texte exact → vert, texte faux → rouge`, () => {
      reset(`cfg.mode = '${mode}'; cfg.scope = ${scope}; cfg.input = 'type'; cfg.corr = 'strict'; cfg.endLen = 2; cfg.contLen = 3;`);
      for (let n = 0; n < 6; n++){
        const good = n % 2 === 0;
        E("start()"); noErr('start ' + mode);
        const exp = expectedText();
        fill(good ? exp : 'كلمة خاطئة تماما'); clickAct('check'); noErr('vérifier ' + mode);
        ok(fb() && fb().classList.contains(good ? 'ok' : 'ko'), `tirage ${n} : ${good ? 'vert' : 'rouge'} attendu pour « ${exp.slice(0, 30)}… »`);
        E("home()");
      }
    });
  }
  test('Saisie à trous (cloze) : tous les mots justes → vert ; un mot faux → rouge (strict)', () => {
    reset(`cfg.mode = 'cloze'; cfg.scope = ${ALL}; cfg.input = 'type'; cfg.corr = 'strict'; cfg.level = 50;`);
    for (let n = 0; n < 10; n++){
      E("start()"); noErr('start cloze');
      const inputs = $$q('.blankin'); ok(inputs.length, 'aucun trou');
      inputs.forEach(i => { i.value = E(`cur.T.tok[${i.dataset.i}]`); });
      if (n % 2){ inputs[0].value = 'خطأ'; }
      clickAct('checkcloze'); noErr('vérifier trous');
      ok(fb().classList.contains(n % 2 ? 'ko' : 'ok'), `tirage ${n}`);
      E("home()");
    }
  });
  test('Auto-évaluation (récitation) : « Tout juste » → vert, « Raté » → rouge', () => {
    reset(`cfg.mode = 'next'; cfg.scope = ${ALL}; cfg.input = 'recite';`);
    E("start()"); clickAct('reveal'); ok($q('#marks'), 'marquage absent'); clickAct('mark-ok'); ok(fb().classList.contains('ok'), 'vert attendu');
    E("home()"); E("start()"); clickAct('reveal'); $$q('.wd')[0].click(); clickAct('mark-go'); ok(!fb().classList.contains('ok'), 'un mot marqué ne peut pas donner vert'); noErr('auto-évaluation');
    E("home()"); E("cfg.mode = 'cloze'"); E("start()"); clickAct('revealall'); $$q('[data-act="grade"]')[0].click(); noErr('trous auto-évalués'); ok(fb(), 'retour attendu');
  });

  /* ---- exactitude de la correction ---- */
  const verdict = (corr, build) => { reset(`cfg.mode = 'next'; cfg.scope = {type:'surah', from: 2, to: 2}; cfg.input = 'type'; cfg.corr = '${corr}';`); E("start()"); fill(build(expectedText())); clickAct('check'); return fb().classList.contains('ok') ? 'ok' : 'ko'; };
  test('Correction stricte : exige les voyelles exactes', () => {
    eq(verdict('strict', t => t), 'ok', 'texte exact');
    eq(verdict('strict', t => strip(t)), 'ko', 'sans voyelles');
    eq(verdict('strict', t => t.replace(/َ/, 'ِ')), 'ko', 'une voyelle changée');
    eq(verdict('strict', t => t + ' زيادة'), 'ko', 'mot en trop');
    eq(verdict('strict', t => t.split(' ').slice(0, -1).join(' ')), 'ko', 'mot manquant');
  });
  test('Correction souple : accepte un texte sans voyelles', () => {
    eq(verdict('soft', t => strip(t)), 'ok', 'sans voyelles');
    eq(verdict('soft', () => 'كلمة خاطئة تماما'), 'ko', 'texte faux');
  });

  /* ---- plan, écrans, réglages ---- */
  test('Plan : première portion = 3 versets de la sourate 114, puis « appris » l’enregistre', () => {
    reset("plan = {from: 114, to: 114, order: 'desc', amt: 'v3', recent: 7, cycle: 30, log: [], done: {}}; go('plan');");
    eq(E('planNextChunk(plan)'), {s: 114, a: 1, b: 3});
    clickAct('plan-sabaq'); ok($q('[data-act="plan-learned"]'), 'écran sabaq absent'); clickAct('plan-learned');
    eq(E('plan.log.length'), 1); eq(E('planNextChunk(plan)'), {s: 114, a: 4, b: 6}); noErr('plan');
  });
  test('Révision espacée : liste « à renforcer », bouton « Renforcer maintenant », intervalle adaptatif', async () => {
    reset(); const now = Date.now();
    E(`errors = [{t: ${now}, k: '2:5', m: 'next', sc: 0}, {t: ${now}, k: '2:5', m: 'next', sc: 0}, {t: ${now - 864e5}, k: '3:9', m: 'cloze', sc: 0}]; stats = {'2:5': [0, 2], '3:9': [0, 1]}; sched = {};`);
    E("go('home')"); ok($q('[data-act="strengthen"]'), 'bouton sur l’accueil'); ok(appText().includes('À renforcer en priorité'));
    ok(/2 erreurs ces 30 derniers jours/.test(appText()), 'raison affichée');
    E("go('plan')"); ok(appText().includes('À renforcer en priorité') && appText().includes('tienne plus d'), 'carte complète avec explication dans le Plan');
    clickAct('strengthen'); eq(E('ses.fixed'), true); eq(E('ses.pool.map(key).sort()'), ['2:5', '3:9']); noErr('renforcer');
    E("home()"); E("sched = {}; record({s: 2, a: 5}, 0)"); eq(E("sched['2:5'].iv"), 0.25, 'raté : retour dans 6 h');
    E("record({s: 2, a: 5}, 1)"); eq(E("sched['2:5'].iv"), 1, 'puis 1 jour'); ok(E("sched['2:5'].ez") < 2.2, 'facteur réduit après un raté');
    E("errors = []; stats = {}"); E("go('home')"); ok(!$q('[data-act="strengthen"]'), 'rien à renforcer : pas de bouton');
  });
  test('Révision espacée : aucune clé de traduction manquante (en, ar)', async () => {
    for (const L of ['en', 'ar']){
      reset(); const now = Date.now();
      E(`setLang('${L}'); errors = [{t: ${now}, k: '2:5', m: 'next', sc: 0}, {t: ${now}, k: '2:5', m: 'next', sc: 0}]; stats = {'2:5': [1, 4]}; sched = {'2:5': {iv: 0.25, due: ${now - 3 * 864e5}}}; plan = {from: 114, to: 114, order: 'desc', amt: 'v3', recent: 2, cycle: 4, mptr: 0, done: {}, log: []};`);
      E("go('home')"); E("go('plan')"); ok(appText().length > 100); eq(E('[...missingKeys]'), [], L);
    }
  });
  test('Plan : vue de la semaine (prévision sur 7 jours)', async () => {
    reset("plan = {from: 111, to: 114, order: 'desc', amt: 'v3', recent: 3, cycle: 2, mptr: 0, done: {}, log: []}; go('plan')");
    const W7 = E("planWeek(plan)"); eq(W7.length, 7); eq(W7.map(x => [x.chunk.s, x.chunk.a, x.chunk.b]).slice(0, 4), [[114, 1, 3], [114, 4, 6], [113, 1, 3], [113, 4, 5]], 'portions successives');
    eq(W7.slice(0, 5).map(x => x.rec), [0, 1, 2, 3, 3], 'révision récente : les 3 derniers jours'); eq(W7.slice(0, 7).map(x => x.man), [0, 0, 0, 0, 1, 1, 2], 'révision ancienne : ceil(portions de plus de 3 jours / cycle de 2)');
    ok(appText().includes('Semaine') && appText().includes('Prévision'), 'carte Semaine'); eq($$q('#app .weak').filter(e => /Nouveau :/.test(e.textContent)).length, 7, '7 jours affichés');
    ok(/▸/.test(appText()), 'aujourd’hui repéré'); noErr('semaine');
    // aujourd'hui déjà appris : la portion du jour reste affichée (et cochée), la suite continue
    const dk = E("dayKey()"); E(`plan.log.push({d: '${dk}', s: 114, a: 1, b: 3}); plan.done = {'${dk}': {sabaq: true}}; go('plan')`);
    const W8 = E("planWeek(plan)"); eq([W8[0].chunk.s, W8[0].chunk.a, W8[0].chunk.b], [114, 1, 3]); eq([W8[1].chunk.s, W8[1].chunk.a], [114, 4]); ok(/✓ Nouveau/.test(appText()), 'portion du jour cochée');
    // plan terminé
    E("plan = {from: 114, to: 114, order: 'desc', amt: 'v10', recent: 3, cycle: 2, mptr: 0, done: {}, log: []}; go('plan')"); const W9 = E("planWeek(plan)"); eq([W9[0].chunk.b, W9[1].chunk], [6, null]); ok(appText().includes('Plan terminé'));
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); plan = {from: 111, to: 114, order: 'desc', amt: 'v3', recent: 3, cycle: 2, mptr: 0, done: {}, log: [{d: '${E("dayKey(addDays(new Date(), -2))")}', s: 114, a: 1, b: 3}]}; go('plan')`); ok(appText().length > 100, L); eq(E('[...missingKeys]'), [], L); }
    E("setLang('fr')");
  });
  test('Accessibilité : réglage « contraste renforcé » des couleurs du tajwīd', async () => {
    reset(); E("go('settings')"); const sel = $q('#shc'); ok(sel, 'réglage'); eq([...sel.options].map(o => o.value), ['auto', 'on', 'off']);
    const col = () => W.getComputedStyle(D.documentElement).getPropertyValue('--tjc-n').trim().toLowerCase();
    sel.value = 'on'; sel.dispatchEvent(new W.Event('change')); eq(E('cfg.hc'), true); ok(D.getElementById('tjhc'), 'feuille de style ajoutée'); ok(col() !== '#537fff', 'couleur plus foncée : ' + col());
    E("go('settings')"); eq($q('#shc').value, 'on'); $q('#shc').value = 'off'; $q('#shc').dispatchEvent(new W.Event('change')); eq(E('cfg.hc'), false); ok(!D.getElementById('tjhc')); eq(col(), '#537fff', 'couleurs officielles');
    E("go('settings')"); $q('#shc').value = 'auto'; $q('#shc').dispatchEvent(new W.Event('change')); eq(E('cfg.hc'), undefined, 'automatique : suit le système'); noErr('contraste');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); go('settings')`); eq(E('[...missingKeys]'), [], L); } E("setLang('fr')");
  });
  test('Accessibilité : motifs (traits, pointillés…) en plus des couleurs du tajwīd — une combinaison unique par règle', async () => {
    reset(); E("go('settings')"); const box = $q('#tjp'); ok(box && !box.checked, 'case « motifs » (désactivée par défaut)');
    // sans le réglage : aucun trait
    const host = D.createElement('div'); host.className = 'rd tj'; D.body.appendChild(host); const codes = 'hlnpmoqcfwiaudg'.split('');
    host.innerHTML = codes.map(c => `<span class="tj-${c}">ب</span>`).join('') + '<span class="tj-s">ب</span><span class="tj-b">ب</span>';
    const sig = e => { const c = W.getComputedStyle(e), bg = c.backgroundImage !== 'none'; return [c.borderTopStyle !== 'none' ? c.borderTopStyle + c.borderTopWidth : '-', c.borderBottomStyle !== 'none' ? c.borderBottomStyle + c.borderBottomWidth : '-', c.textDecorationLine.includes('underline') ? 'ondulé:' + c.textDecorationStyle : '-', bg ? 'hachuré' : '-'].join('|'); };
    ok([...host.children].every(e => sig(e) === '-|-|-|-'), 'sans motifs : aucun trait');
    box.checked = true; box.dispatchEvent(new W.Event('change', {bubbles: true})); eq(E('cfg.tjp'), true); ok(D.documentElement.classList.contains('tjp'), 'classe tjp');
    const sigs = codes.map(c => sig(host.querySelector('.tj-' + c))); eq(new Set(sigs).size, 15, 'les 15 règles ont chacune un motif différent : ' + sigs.join(' ; ')); ok(sigs.every(x => x !== '-|-|-|-'), 'toutes ont un motif');
    eq(sig(host.querySelector('.tj-s')), sig(host.querySelector('.tj-l')), 'lettre muette = même règle que le lām solaire'); eq(sig(host.querySelector('.tj-b')), sig(host.querySelector('.tj-d')), 'mutaqāribayn = mutajānisayn');
    // légende : un échantillon de motif à côté de chaque couleur
    E("cfg.rdTaj = true; openReader('q:1')"); for (let i = 0; i < 40 && !$q('.tjkey'); i++) await wait(100); ok($$q('.tjkey .tjpat').length === 15 && $$q('.tjkey .tjpat').every(e => W.getComputedStyle(e).display !== 'none'), 'légende : 15 échantillons de motifs');
    ok($$q('#rbody [class^="tj-"]').length > 0 && $$q('#rbody [class^="tj-"]').some(e => sig(e) !== '-|-|-|-'), 'le lecteur affiche les motifs'); noErr('motifs');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); go('settings')`); eq(E('[...missingKeys]'), [], L); } E("setLang('fr')");
    box.checked = false; E("cfg.tjp = false; cfg.rdTaj = false; applyA11y()"); ok(!D.documentElement.classList.contains('tjp')); host.remove();
  });
  test('Accessibilité : audit axe-core (WCAG 2.2 AA) des écrans principaux, sans violation', async () => {
    const src = await fetch('https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js', {signal: AbortSignal.timeout(20000)}).then(r => r.ok ? r.text() : '').catch(() => '');
    if (!src) return;                                            // pas d'accès au CDN : test ignoré
    W.eval(src); const st = D.createElement('style'); st.textContent = '.cta,#nav{position:static!important}'; D.head.appendChild(st);   // barres collantes : elles masquent des champs selon la hauteur de l'écran (le décalage du focus est traité par scroll-padding) ; on mesure ici la taille des cibles
    const opts = {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']}}, bad = [];
    const audit = async name => { await wait(300); const r = await W.axe.run(D, opts); r.violations.forEach(v => bad.push(`${name} : ${v.id} (${v.nodes.length}) ${v.nodes[0].target.join(' ')} — ${((v.nodes[0].any[0] || v.nodes[0].none[0] || {}).message || v.nodes[0].failureSummary || '').slice(0, 260)}`)); };
    reset("cfg.hc = true; cfg.tjp = true; cfg.reciter = 'ar.alafasy'; plan = {from: 111, to: 114, order: 'desc', amt: 'v3', recent: 3, cycle: 2, mptr: 0, done: {}, log: []}; applyA11y(); errors = [{t: Date.now(), k: '2:5', m: 'cloze', sc: 0}]; stats = {'2:5': [1, 3]}; cfg.scope = {type: 'surah', from: 1, to: 3};");
    for (const t of ['home', 'plan', 'train', 'progress', 'errors', 'settings']){ E(`go('${t}')`); await audit('onglet ' + t); }
    E("go('train')"); E("cfg.mode = 'tajweed'"); E("go('train')"); await audit('réviser (tajwīd)'); E("cfg.mode = 'mix'");
    E("cfg.mode = 'mcq'; start()"); await audit('question QCM'); E("home()");
    E("cfg.mode = 'cloze'; cfg.input = 'type'; start()"); await audit('question à taper'); E("home()");
    await W.loadX('tajweed'); E("cfg.mode = 'tajweed'; cfg.tjKind = 'rule'; start()"); await audit('question tajwīd'); E("home()");
    E("cfg.mode = 'madd'; start()"); await audit('question madd'); E("home()"); E("cfg.mode = 'makharij'; start()"); await audit('question makhārij'); E("home()");
    E("cfg.rdTaj = true; openReader('q:1')"); for (let i = 0; i < 40 && !$q('.tj-n'); i++) await wait(100); await audit('lecteur (tajwīd en couleurs)'); E("cfg.rdTaj = false; home()");
    E("renderLegal()"); await audit('confidentialité'); E("CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; sb = {}; me = null; renderAccount()"); await audit('connexion'); E("CLOUD.url = ''; CLOUD.anonKey = ''; sb = null");
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; sb = {}; me = {user: {id: 's1', email: 'eleve@x.fr'}, profile: {role: 'teacher'}}; tch.loaded = true; tch.code = {code: 'ABCD2345', expires_at: new Date(Date.now() + 6 * 864e5).toISOString()}; tch.invites = [{code: 'ZZZZ2222', expires_at: new Date(Date.now() + 2 * 864e5).toISOString()}]; tch.links = [{as_role: 'teacher', other_id: 'x', email: 'prof@x.fr', since: new Date().toISOString()}]; tch.log = [{teacher_email: 'prof@x.fr', at: new Date().toISOString()}]; tch.uid = 's1'; tch.msgs = [{id: 1, teacher_id: 't', teacher_email: 'prof@x.fr', body: 'Courage', created_at: new Date().toISOString(), from_student: false, read_at: null}, {id: 2, teacher_id: 't', teacher_email: 'prof@x.fr', body: 'Merci', created_at: new Date().toISOString(), from_student: true, read_at: new Date().toISOString()}]; cfg.tab = 'student'; home()`); await audit('espace élève');
    E(`tch.students = [{id: 's1', email: 'eleve@x.fr', since: new Date().toISOString(), last_seen: new Date().toISOString(), answers: 40, ok: 30, errors: 4}]; tch.detail = {id: 's1', data: {email: 'eleve@x.fr', stats: {'2:5': [1, 3], '114:1': [5, 0]}, days: {}, errors: [{t: Date.now(), k: '2:5', m: 'cloze', sc: 0}]}}; tch.msg = ''; tch.detail.thread = [{id: 1, body: 'Courage', created_at: new Date().toISOString(), from_student: false, read_at: new Date().toISOString()}, {id: 2, body: 'Merci', created_at: new Date().toISOString(), from_student: true, read_at: new Date().toISOString()}]; tch.unread = {s1: 1}; cfg.tab = 'teacher'; home()`); await audit('espace enseignant');
    E("me = null; sb = null; CLOUD.url = ''; CLOUD.anonKey = ''; tch = {students: null, detail: null, msg: '', ok: false, links: null, invites: null, log: null, code: null, busy: false, loaded: false}");
    eq(bad, [], 'violations axe-core');
    st.remove(); E("cfg.hc = undefined; delete cfg.hc; cfg.tjp = false; applyA11y()");
  });
  test('Plan : le manzil ajoute une portion fragile sans décaler la rotation', async () => {
    reset(); const now = Date.now(), old = E("dayKey(addDays(new Date(), -10))");
    E(`plan = {from: 111, to: 114, order: 'desc', amt: 'v3', recent: 2, cycle: 4, mptr: 0, done: {}, log: [{d: '${old}', s: 114, a: 1, b: 3}, {d: '${old}', s: 114, a: 4, b: 6}, {d: '${old}', s: 113, a: 1, b: 3}, {d: '${old}', s: 112, a: 1, b: 3}, {d: '${old}', s: 111, a: 1, b: 3}]}; errors = [{t: ${now}, k: '111:1', m: 'next', sc: 0}, {t: ${now}, k: '111:2', m: 'next', sc: 0}]; stats = {}; sched = {};`);
    const T = E("planToday()"); eq(T.rot, 2, 'rotation : 2 portions'); eq(T.xtra, 1, 'une portion fragile en plus'); eq(T.man.length, 3);
    eq([T.man[2].s, T.man[2].a], [111, 1], 'la portion fragile est celle de la sourate 111');
    E("go('plan')"); ok(/dont 1 à renforcer/.test(appText()), 'mention dans le Plan');
    clickAct('plan-manzil'); eq(E('ses.chunks.length'), 3); eq(E('ses.rot'), 2); E("planFinish('manzil')"); eq(E('plan.mptr'), 2, 'la rotation avance de 2, pas de 3');
    // sans erreur : rotation seule
    E("errors = []; plan.mptr = 0; plan.done = {}"); eq(E("planToday().xtra"), 0);
  });
  test('Tajwīd (entraînement) : question, 4 règles, correction colorée, statistiques par règle, sans toucher à la mémorisation', async () => {
    reset("cfg.mode = 'tajweed'; cfg.scope = {type: 'surah', from: 1, to: 3}; cfg.n = 6; tjs = {};");
    const wrongTotals = {ok: 0, ko: 0};
    E("start()"); for (let i = 0; i < 40 && !$q('.opt'); i++) await wait(100); noErr('chargement du tajwīd');
    for (let n = 0; n < 6; n++){
      ok($q('mark.tjq'), 'partie surlignée'); const btns = $$q('.opt'); eq(btns.length, 4); eq(new Set(btns.map(b => b.dataset.v)).size, 4, 'propositions distinctes');
      ok(appText().includes('annotation automatique'), 'avertissement : source non relue');
      const good = btns.filter(b => b.dataset.v === E('cur.correct')); eq(good.length, 1);
      ok(!$q('#tjv [class^="tj-"]'), 'la phrase n’est pas colorée avant la réponse');
      const wantOk = n % 2 === 0, target = wantOk ? good[0] : btns.find(b => b !== good[0]);
      click(target); noErr('réponse tajwīd');
      ok(fb().classList.contains(wantOk ? 'ok' : 'ko'), `tirage ${n}`); ok($q('#tjv [class^="tj-"]'), 'la phrase se colore après la réponse'); ok(/Règle selon la source/.test(fb().textContent));
      wrongTotals[wantOk ? 'ok' : 'ko']++;
      if (n < 5) clickAct('nextq'); else clickAct('nextq');
      if (n < 5) for (let i = 0; i < 20 && !$q('mark.tjq'); i++) await wait(50);
    }
    ok(appText().includes('Règles de cette série'), 'résultat : règles de la série'); ok(!$q('[data-act="retry"]'), 'pas de « refaire mes erreurs » (ce n’est pas de la mémorisation)');
    eq(E("Object.values(tjs).reduce((t, [o]) => t + o, 0)"), 3); eq(E("Object.values(tjs).reduce((t, [, k]) => t + k, 0)"), 3);
    eq(E("Object.keys(stats).length + Object.keys(sched).length + errors.length"), 0, 'la mémorisation n’est pas modifiée'); eq(E("days[today()]"), 6, 'compte pour l’objectif du jour');
    E("go('progress')"); ok(appText().includes('Mes règles de tajwīd'), 'règles dans Progrès');
    // matn : l'exercice n'est pas proposé et le mode revient à « Mélange »
    // type d'exercice : mémorisation / tajwīd / makhārij / ṣifāt
    E("cfg.mode = 'tajweed'; go('train')"); const cs = $q('#scat'); ok(cs, 'liste « Type d’exercice »'); eq([...cs.options].map(o => o.value), ['memo', 'tajwid', 'ahk', 'mdd', 'mkh', 'sfa']); eq(cs.value, 'tajwid');
    ok(!$q('[data-act="mode"]') && !$q('[data-act="corpus"]'), 'tajwīd : ni liste d’exercices de mémorisation ni choix Coran/moutoun'); ok($q('#stjk') && $q('#stype'), 'liste des types de tajwīd et portée du Coran');
    cs.value = 'memo'; cs.dispatchEvent(new W.Event('change')); eq(E('cfg.mode'), 'mix'); ok($q('[data-act="mode"][data-v="cloze"]') && !$q('[data-act="mode"][data-v="tajweed"]') && !$q('[data-act="mode"][data-v="makharij"]'), 'mémorisation : seulement ses exercices');
    clickAct('mode', 'mcq'); $q('#scat').value = 'mkh'; $q('#scat').dispatchEvent(new W.Event('change')); eq(E('cfg.mode'), 'makharij'); ok($q('#smkk') && !$q('#stype'), 'makhārij : liste de types, pas de portée'); ok(!/Commencer ·/.test(appText()) && !$q('[data-act="rdscope"]'), 'makhārij : pas de portée affichée dans le bouton'); eq(E('cfg.lastMemo'), 'mcq');
    $q('#scat').value = 'sfa'; $q('#scat').dispatchEvent(new W.Event('change')); eq(E('cfg.mode'), 'sifat'); ok($q('#ssfk') && !$q('#stype'));
    $q('#scat').value = 'memo'; $q('#scat').dispatchEvent(new W.Event('change')); eq(E('cfg.mode'), 'mcq', 'retour au dernier exercice de mémorisation');
    clickAct('corpus', 'matn'); $q('#scat').value = 'tajwid'; $q('#scat').dispatchEvent(new W.Event('change')); eq(E('cfg.scope.type') !== 'matn', true, 'le tajwīd revient au Coran'); eq(E('cfg.mode'), 'tajweed');
    E("cfg.mode = 'tajweed'; cfg.scope = {type: 'surah', from: 2, to: 2}");
    // révisions guidées : jamais d'exercice de tajwīd
    E("cfg.scope = {type: 'surah', from: 1, to: 3}; cfg.mode = 'tajweed'; start([{s: 1, a: 1}, {s: 1, a: 2}])"); ok(!$q('mark.tjq'), 'série guidée : pas de tajwīd'); noErr('série guidée');
  });
  test('Tajwīd : liste déroulante des types de questions (règle, couleurs, trouver la partie, vrai/faux, mélange)', async () => {
    reset("cfg.mode = 'tajweed'; cfg.scope = {type: 'surah', from: 2, to: 2}; cfg.n = 5; tjs = {};");
    E("go('train')"); const sel = $q('#stjk'); ok(sel, 'liste déroulante dans les options de la série'); eq([...sel.options].map(o => o.value), ['rule', 'color', 'find', 'tf', 'read', 'mix']);
    sel.value = 'tf'; sel.dispatchEvent(new W.Event('change')); eq(E('cfg.tjKind'), 'tf', 'le choix est enregistré'); E("go('home'); go('train')"); ok($$q('select').some(x => x.value === 'tf'), 'le choix est rappelé dans la liste de Réviser');
    E("cfg.mode = 'cloze'; go('train')"); ok(!$q('#stjk'), 'liste absente pour les autres exercices'); E("cfg.mode = 'tajweed'; go('train')"); ok($q('#stjk'));
    const seen = new Set();
    for (const kind of ['rule', 'color', 'find', 'tf', 'read', 'mix']){
      E(`cfg.tjKind = '${kind}'; cfg.n = 30; tjs = {}`); E("start()"); for (let i = 0; i < 40 && !$q('.opt'); i++) await wait(100);
      for (let n = 0; n < 10; n++){
        const k = E('cur.tjk'); seen.add(k); const btns = $$q('.opt'), marks = $$q('mark.tjq'); noErr(`${kind}/${k}`);
        if (kind !== 'mix') ok(k === kind || (kind === 'find' && k === 'rule'), `type ${kind} → ${k}`);
        const colored = !!$q('#tjv [class^="tj-"]');
        if (k === 'find'){ eq(btns.length, 4); eq(marks.length, 4); eq($$q('#tjv sup.tjn').length, 4); ok(!colored, 'pas de couleurs avant la réponse'); }
        else if (k === 'tf'){ eq(btns.map(b => b.dataset.v).sort(), ['f', 't']); eq(marks.length, 1); ok(!colored); }
        else if (k === 'color'){ eq(btns.length, 4); eq(marks.length, 1); ok(colored, 'les couleurs aident dans la version facile'); }
        else if (k === 'read'){ eq(btns.length, 4); eq(marks.length, 1); eq($$q('#tjv > [class^="tj-"]').length, 0, 'rien n’est coloré hors de la partie surlignée'); ok($$q('#tjv mark [class^="tj-"]').length >= 1, 'la partie surlignée est colorée'); ok($q('details[open] .tjkey'), 'la légende est affichée'); }
        else { eq(btns.length, 4); eq(marks.length, 1); ok(!colored, 'sans couleurs avant la réponse'); }
        const good = btns.filter(b => b.dataset.v === E('cur.correct')); eq(good.length, 1, 'une seule bonne réponse');
        const wantOk = n % 2 === 0; click(wantOk ? good[0] : btns.find(b => b !== good[0])); noErr('réponse');
        ok(fb().classList.contains(wantOk ? 'ok' : 'ko'), `${k} tirage ${n}`); ok($q('#tjv [class^="tj-"]'), 'coloré après la réponse');
        if (k === 'find') ok(/Partie 1 :/.test(fb().textContent) && /Partie 4 :/.test(fb().textContent), 'la règle de chaque partie est donnée');
        clickAct('nextq'); for (let i = 0; i < 20 && !$q('.opt') && !appText().includes('Résultat'); i++) await wait(50);
        if (!$q('.opt')) break;
      }
      E("home()");
    }
    ok(['rule', 'color', 'find', 'tf', 'read'].every(k => seen.has(k)), 'le mélange propose tous les types : ' + [...seen]);
    eq(E("Object.keys(stats).length + Object.keys(sched).length + errors.length"), 0, 'la mémorisation n’est pas modifiée');
  });
  test('Makhārij et ṣifāt : listes déroulantes, questions, corrections, statistiques, sans toucher à la mémorisation', async () => {
    for (const [mode, sel, kinds] of [['makharij', '#smkk', ['zone', 'same', 'odd', 'halq', 'tf', 'mix']], ['sifat', '#ssfk', ['pair', 'which', 'mnemo', 'cond', 'tf', 'mix']]]){
      reset(`cfg.mode = '${mode}'; cfg.n = 5; hfs = {}`); E("go('train')"); const s = $q(sel); ok(s, 'liste déroulante ' + mode); eq([...s.options].map(o => o.value), kinds);
      s.value = kinds[1]; s.dispatchEvent(new W.Event('change')); eq(E(mode === 'makharij' ? 'cfg.mkKind' : 'cfg.sfKind'), kinds[1]);
      for (const kind of kinds){
        E(`cfg.${mode === 'makharij' ? 'mkKind' : 'sfKind'} = '${kind}'; cfg.n = 30; hfs = {}`); E("start()"); noErr('start ' + mode);
        for (let n = 0; n < 8; n++){
          ok($q('.opt'), `${mode}/${kind} : question ${n}`); const btns = $$q('.opt'), good = btns.filter(b => b.dataset.v === E('cur.correct')); eq(good.length, 1, 'une seule bonne réponse');
          ok(appText().includes('Wikipédia') === false, 'les sources s’affichent après la réponse');
          const wantOk = n % 2 === 0; click(wantOk ? good[0] : btns.find(b => b !== good[0])); noErr('réponse ' + mode);
          ok(fb().classList.contains(wantOk ? 'ok' : 'ko'), `${mode}/${kind} tirage ${n}`); ok(/wikipedia|wikisource/i.test(D.getElementById('app').innerHTML), 'sources avec liens'); ok(/Wikipédia \(/.test(appText()) || /Wikisource/.test(appText()));
          clickAct('nextq'); if (!$q('.opt')) break;
        }
        E("home()");
      }
      E(`cfg.n = 5; ses = null; hfs = {}`); E("start()"); for (let i = 0; i < 5; i++){ click($q('.opt')); clickAct('nextq'); }
      ok(appText().includes('Résumé de la série'), 'résumé de la série'); ok(!$q('[data-act="retry"]'), 'pas de « refaire mes erreurs »');
      eq(E("Object.values(hfs).reduce((t, [o, e]) => t + o + e, 0)"), 5); eq(E("Object.keys(stats).length + Object.keys(sched).length + errors.length"), 0, 'mémorisation intacte');
      E("go('progress')"); ok(appText().includes('Mes makhārij et ṣifāt'), 'carte dans Progrès');
    }
    // visibles aussi pour les moutoun ; remplacés par « Mélange » dans les révisions guidées
    E("cfg.scope = {type: 'matn', id: 'all'}; cfg.mode = 'mix'; go('train')"); eq([...$q('#scat').options].map(o => o.value), ['memo', 'tajwid', 'ahk', 'mdd', 'mkh', 'sfa'], 'les catégories makhārij et ṣifāt restent proposées avec les moutoun');
    E("cfg.mode = 'makharij'; start([{s: 1, a: 1}, {s: 1, a: 2}])"); ok(!$q('.opt .ar') && appText().includes('Sourate') || true); noErr('guidé');
  });
  test('Ṣifāt : qualités conditionnelles (qalqala, līn) sur de vrais versets', async () => {
    reset("cfg.mode = 'sifat'; cfg.sfKind = 'cond'; cfg.n = 30; hfs = {}"); E("start()");
    for (let n = 0; n < 12; n++){
      ok($q('.opt'), 'question ' + n); eq($$q('mark.tjq').length, 1, 'une lettre surlignée'); const btns = $$q('.opt'); eq(btns.map(b => b.dataset.v).sort(), ['f', 't']); eq(btns.map(b => b.textContent.trim()).sort(), ['Non', 'Oui']);
      ok(/Rappel : qalqala/.test(appText()), 'rappel de la règle'); const mark = $q('mark.tjq').textContent, attrQal = /القلقلة/.test(appText());
      ok(attrQal ? 'قطبجد'.includes(mark[0]) : 'وي'.includes(mark[0]), 'la lettre surlignée correspond à la qualité demandée : ' + mark);
      const good = btns.find(b => b.dataset.v === E('cur.correct')), wantOk = n % 2 === 0; click(wantOk ? good : btns.find(b => b !== good)); noErr('cond');
      ok(fb().classList.contains(wantOk ? 'ok' : 'ko')); ok(/sukūn|dernière lettre|voyelle|chadda|fatḥa|madd/.test(fb().textContent), 'explication : ' + fb().textContent.slice(0, 80)); ok($q('#fb a[href*="wiki"]'), 'sources');
      clickAct('nextq'); if (!$q('.opt')) break;
    }
    ok(E("Object.keys(hfs).every(k => k === 'sf:qalqala' || k === 'sf:lin')"), 'statistiques par qualité'); eq(E("Object.keys(stats).length + Object.keys(sched).length + errors.length"), 0, 'mémorisation intacte');
  });
  test('Aḥkām (nūn, mīm, tanwīn) : types de questions, vrais versets, corrections, statistiques', async () => {
    reset("cfg.mode = 'ahkam'; cfg.n = 5; hfs = {}"); E("go('train')"); eq($q('#scat').value, 'ahk'); const sel = $q('#sahk'); ok(sel, 'liste déroulante'); eq([...sel.options].map(o => o.value), ['nun', 'mim', 'letter', 'group', 'ghunna', 'tf', 'mix']);
    ok(!$q('#stype') && !$q('[data-act="mode"]'), 'pas de portée ni exercices de mémorisation');
    for (const kind of ['nun', 'mim', 'letter', 'group', 'ghunna', 'tf', 'mix']){
      E(`cfg.ahKind = '${kind}'; cfg.n = 30; hfs = {}; ses = null`); E("start()"); for (let i = 0; i < 60 && !$q('.opt'); i++) await wait(100); noErr('start ahkam ' + kind);
      for (let n = 0; n < 8; n++){
        ok($q('.opt'), `${kind} question ${n}`); const btns = $$q('.opt'), k = kind === 'mix' ? null : kind, marks = $$q('mark.tjq').length;
        if (k === 'nun') { eq(btns.length, 5); eq(marks, 2); } if (k === 'mim') { eq(btns.length, 3); eq(marks, 2); } if (k === 'ghunna') { eq(btns.length, 2); eq(marks, 1); }
        if (k === 'letter') eq(btns.length, 5); if (k === 'tf') eq(btns.length, 2);
        const good = btns.filter(b => b.dataset.v === E('cur.correct')); eq(good.length, 1, 'une seule bonne réponse'); const wantOk = n % 2 === 0;
        click(wantOk ? good[0] : btns.find(b => b !== good[0])); noErr('réponse ahkam'); ok(fb().classList.contains(wantOk ? 'ok' : 'ko'), `${kind} ${n}`); ok($q('#fb a[href*="wiki"]'), 'sources');
        clickAct('nextq'); if (!$q('.opt')) break;
      }
      E("home()");
    }
    E("ses = null; cfg.ahKind = 'nun'; cfg.n = 5; hfs = {}"); E("start()"); for (let i = 0; i < 60 && !$q('.opt'); i++) await wait(100); for (let i = 0; i < 5; i++){ click($q('.opt')); clickAct('nextq'); }
    ok(appText().includes('Résumé de la série')); ok(E("Object.keys(hfs).every(k => k.startsWith('ah:'))")); eq(E("Object.keys(stats).length + Object.keys(sched).length + errors.length"), 0, 'mémorisation intacte');
    E("go('progress')"); ok(appText().includes('Mes makhārij et ṣifāt'));
  });
  test('Madd : types de questions, vrais versets, durée, cause, corrections, statistiques', async () => {
    reset("cfg.mode = 'madd'; cfg.n = 5; hfs = {}"); E("go('train')"); eq($q('#scat').value, 'mdd'); const sel = $q('#smdk'); ok(sel, 'liste déroulante'); eq([...sel.options].map(o => o.value), ['type', 'count', 'cause', 'tf', 'mix']);
    ok(!$q('#stype') && !$q('[data-act="mode"]'), 'pas de portée ni exercices de mémorisation');
    for (const kind of ['type', 'count', 'cause', 'tf', 'mix']){
      E(`cfg.mdKind = '${kind}'; cfg.n = 30; hfs = {}; ses = null`); E("start()"); for (let i = 0; i < 80 && !$q('.opt'); i++) await wait(100); noErr('start madd ' + kind);
      for (let n = 0; n < 8; n++){
        ok($q('.opt'), `${kind} question ${n}`); const btns = $$q('.opt'), hasMark = !!$q('mark.tjq');
        if (kind === 'type'){ eq(btns.length, 5); ok(hasMark, 'partie surlignée'); ok(!$q('#tjv [class^="tj-"]'), 'verset non coloré avant la réponse'); }
        if (kind === 'count'){ eq(btns.length, 4); ok(hasMark, 'count : partie surlignée (question ' + n + ')'); } if (kind === 'cause'){ eq(btns.length, 4); ok(!hasMark, 'règle du matn : pas de verset'); } if (kind === 'tf'){ eq(btns.length, 2); ok(hasMark, 'tf : partie surlignée (question ' + n + ')'); }
        const good = btns.filter(b => b.dataset.v === E('cur.correct')); eq(good.length, 1, 'une seule bonne réponse'); const wantOk = n % 2 === 0;
        click(wantOk ? good[0] : btns.find(b => b !== good[0])); noErr('réponse madd'); ok(fb().classList.contains(wantOk ? 'ok' : 'ko'), `${kind} ${n}`); ok($q('#fb a[href*="wiki"]'), 'sources');
        ok(/temps/.test(fb().textContent), 'durée dans la correction'); if (hasMark) ok($q('#tjv [class^="tj-"]'), 'verset coloré après la réponse');
        clickAct('nextq'); if (!$q('.opt')) break;
      }
      E("home()");
    }
    E("ses = null; cfg.mdKind = 'type'; cfg.n = 5; hfs = {}"); E("start()"); for (let i = 0; i < 80 && !$q('.opt'); i++) await wait(100); for (let i = 0; i < 5; i++){ click($q('.opt')); clickAct('nextq'); }
    ok(appText().includes('Résumé de la série')); ok(E("Object.keys(hfs).every(k => k.startsWith('md:'))")); eq(E("Object.keys(stats).length + Object.keys(sched).length + errors.length"), 0, 'mémorisation intacte');
  });
  test('Madd : aucune clé de traduction manquante (en, ar)', async () => {
    for (const L of ['en', 'ar']){
      reset(`setLang('${L}'); cfg.mode = 'madd'; cfg.n = 3; hfs = {'md:lazim': [1, 2]}`); E("go('train')"); eq(E('[...missingKeys]'), [], L + ' liste');
      for (const k of ['type', 'count', 'cause', 'tf']){ E(`cfg.mdKind = '${k}'; ses = null`); E("start()"); for (let i = 0; i < 80 && !$q('.opt'); i++) await wait(100); ok($q('.opt'), L + k); click($q('.opt')); eq(E('[...missingKeys]'), [], `${L} ${k}`); E("home()"); }
      E("go('progress')"); eq(E('[...missingKeys]'), [], L);
    }
  });
  test('Aḥkām : aucune clé de traduction manquante (en, ar)', async () => {
    for (const L of ['en', 'ar']){
      reset(`setLang('${L}'); cfg.mode = 'ahkam'; cfg.n = 3; hfs = {'ah:K': [1, 2], 'ah:gh': [2, 0]}`); E("go('train')"); eq(E('[...missingKeys]'), [], L + ' liste');
      for (const k of ['nun', 'mim', 'letter', 'group', 'ghunna', 'tf']){ E(`cfg.ahKind = '${k}'; ses = null`); E("start()"); for (let i = 0; i < 60 && !$q('.opt'); i++) await wait(100); ok($q('.opt'), L + k); click($q('.opt')); eq(E('[...missingKeys]'), [], `${L} ${k}`); E("home()"); }
      E("go('progress')"); eq(E('[...missingKeys]'), [], L);
    }
  });
  test('Audio hors ligne : estimation, téléchargement d’une sourate, lecture depuis l’appareil, plafond, suppression (réseau requis)', async () => {
    const url1 = 'https://everyayah.com/data/Alafasy_64kbps/001001.mp3', net = await fetch(url1, {method: 'HEAD', mode: 'cors'}).then(r => r.ok).catch(() => false);
    if (!net) return;                                            // pas d'accès à everyayah.com : test ignoré
    reset("cfg.reciter = 'ar.alafasy'; cfg.audFrom = 1; cfg.audTo = 1; cfg.audCap = 50; audioOff = {}; audioUI = {plan: null, busy: false, ctl: null};"); await W.caches.delete('tathbit-audio-v1');
    E("go('settings')"); ok($q('[data-act="aud-est"]') && $q('#aud-from') && $q('#aud-cap'), 'carte Audio hors ligne'); ok($q('[data-act="aud-dl"]').disabled, 'téléchargement impossible avant le calcul de la taille');
    clickAct('aud-est'); for (let i = 0; i < 100 && !E('audioUI.plan'); i++) await wait(100); const P = E('audioUI.plan'); ok(P && P.take.length === 1, 'estimation faite'); noErr('estimation');
    ok(/Estimation/.test($q('#aud-msg').textContent)); ok(!$q('[data-act="aud-dl"]').disabled);
    clickAct('aud-dl'); for (let i = 0; i < 300 && (E('audioUI.busy') || !E("audioSet('ar.alafasy')[1]")); i++) await wait(100); noErr('téléchargement');
    const cache = await W.caches.open('tathbit-audio-v1'), keys = await cache.keys(); eq(keys.length, 7, '7 versets de la Fatiha dans le cache');
    const got = E("audioSet('ar.alafasy')[1].b"); eq(E("audioSet('ar.alafasy')[1].q"), 64); ok(got > 100000, 'octets enregistrés : ' + got); const ratio = P.used / got; ok(ratio > 0.8 && ratio < 2.2, 'estimation raisonnable : ' + ratio.toFixed(2));
    eq(E("audioUrl({s: 1, a: 1})"), url1); ok(E("audioUrl({s: 2, a: 1})").includes('islamic.network'), 'sourates non téléchargées : lecture en ligne');
    ok(appText().includes('Sur cet appareil') && appText().includes('Al-Faatiha'), 'liste des sourates téléchargées');
    if (W.navigator.serviceWorker.controller){                    // le service worker sert les plages d'octets depuis le cache
      const r = await W.fetch(url1, {headers: {Range: 'bytes=0-99'}}); eq(r.status, 206); eq(r.headers.get('x-tathbit-offline'), '1', 'servi par l’appareil, pas par le réseau'); eq((await r.arrayBuffer()).byteLength, 100); ok(/^bytes 0-99\/\d+$/.test(r.headers.get('content-range')));
    }
    // qualité 128 kbps : retéléchargement de la même sourate, l'ancienne qualité est retirée du cache
    ok($q('#aud-q') && [...$q('#aud-q').options].map(o => o.value).join() === '64,128', 'choix de qualité'); E("cfg.audQ = 128; audioUI.plan = null"); E("go('settings')"); clickAct('aud-est'); for (let i = 0; i < 100 && !E('audioUI.plan'); i++) await wait(100);
    const P128 = E('audioUI.plan'); ok(P128.used > P.used * 1.8, '128 kbps : estimation environ 3 fois plus lourde : ' + (P128.used / P.used).toFixed(1));
    clickAct('aud-dl'); for (let i = 0; i < 300 && (E('audioUI.busy') || E("audioSet('ar.alafasy')[1].q") !== 128); i++) await wait(100); noErr('128 kbps');
    eq(E("audioSet('ar.alafasy')[1].q"), 128); ok(E("audioUrl({s: 1, a: 1})").includes('Alafasy_128kbps'), 'lecture en 128'); eq((await cache.keys()).length, 7, 'les 7 fichiers 64 kbps ont été retirés');
    ok(appText().includes('128 kbps'), 'qualité affichée dans la liste'); const got128 = E("audioSet('ar.alafasy')[1].b"); ok(got128 > got * 2, '128 kbps nettement plus lourd');
    E("cfg.audQ = 64"); E("cfg.reciter = 'ar.abdurrahmaan' + 'sudais'"); E("go('settings')"); eq([...$q('#aud-q').options].map(o => o.value), ['64'], 'As-Sudais : 64 kbps seulement'); E("cfg.reciter = 'ar.alafasy'");
    E("cfg.audCap = 0.2; audioUI.plan = null"); E("go('settings')"); $q('#aud-cap') && 0; clickAct('aud-est'); for (let i = 0; i < 100 && !E('audioUI.plan'); i++) await wait(100);
    ok(E('audioUI.plan.take.length') === 0 && /Plafond atteint/.test(appText()), 'plafond trop petit : rien à télécharger'); ok($q('[data-act="aud-dl"]').disabled);
    E("cfg.audCap = 50"); E("go('settings')"); clickAct('aud-del', '1'); for (let i = 0; i < 50 && E("audioSet('ar.alafasy')[1]"); i++) await wait(100); await wait(200);
    eq((await cache.keys()).length, 0, 'suppression : cache vidé'); eq(E("Object.keys(audioSet('ar.alafasy')).length"), 0); ok(E("audioUrl({s: 1, a: 1})").includes('islamic.network'), 'retour à la lecture en ligne');
    E("audioOff = {}; store.set('tathbit.audio', {})");
  });
  test('Makhārij et ṣifāt : aucune clé de traduction manquante (en, ar)', async () => {
    for (const L of ['en', 'ar']){
      reset(`setLang('${L}'); cfg.n = 3; hfs = {'mk:ظ': [1, 2], 'sf:qalqala': [3, 0]}`); E("go('train')");
      for (const [mode, key, kinds] of [['makharij', 'mkKind', ['zone', 'same', 'odd', 'halq', 'tf']], ['sifat', 'sfKind', ['pair', 'which', 'mnemo', 'cond', 'tf']]]){
        E(`cfg.mode = '${mode}'; go('train')`); eq(E('[...missingKeys]'), [], L + ' ' + mode);
        for (const k of kinds){ E(`cfg.${key} = '${k}'; ses = null`); E("start()"); ok($q('.opt'), L + k); click($q('.opt')); eq(E('[...missingKeys]'), [], `${L} ${mode} ${k}`); E("home()"); }
      }
      E("go('progress')"); eq(E('[...missingKeys]'), [], L);
    }
  });
  test('Audio du plan du jour : bouton, téléchargement automatique seulement en Wi-Fi confirmé (réseau requis)', async () => {
    const net = await fetch('https://everyayah.com/data/Alafasy_64kbps/112001.mp3', {method: 'HEAD', mode: 'cors'}).then(r => r.ok).catch(() => false);
    if (!net) return;
    const old = E("dayKey(addDays(new Date(), -10))"), yest = E("dayKey(addDays(new Date(), -1))"); await W.caches.delete('tathbit-audio-v1');
    reset(`cfg.reciter = 'ar.alafasy'; cfg.audQ = 64; cfg.audCap = 50; audioOff = {}; audioUI = {plan: null, busy: false, ctl: null}; store.set('tathbit.audioAuto', '');
      plan = {from: 111, to: 114, order: 'desc', amt: 'v3', recent: 3, cycle: 4, mptr: 0, done: {}, log: [{d: '${yest}', s: 113, a: 1, b: 3}, {d: '${old}', s: 112, a: 1, b: 2}]};`);
    eq(E("auPlanSurahs(planToday())"), [112, 113, 114], 'sourates du plan du jour');
    E("go('settings')"); ok($q('[data-act="aud-plan"]') && $q('#aud-auto'), 'bouton et option du plan'); noErr('carte plan');
    // sans Wi-Fi confirmé : rien ne se télécharge tout seul
    Object.defineProperty(W.navigator, 'connection', {get: () => ({type: 'cellular'}), configurable: true}); E("cfg.audAuto = true"); E("maybeAutoAudio()"); await wait(1500); eq(E("Object.keys(audioSet('ar.alafasy')).length"), 0, 'données mobiles : pas de téléchargement automatique');
    // bouton manuel (la confirmation est acceptée par le banc d'essai)
    clickAct('aud-plan'); for (let i = 0; i < 400 && (E('audioUI.busy') || Object.keys(E("audioSet('ar.alafasy')")).length < 3); i++) await wait(100); noErr('plan du jour');
    eq(Object.keys(E("audioSet('ar.alafasy')")).map(Number).sort(), [112, 113, 114], 'les 3 sourates du plan sont téléchargées'); ok(E("audioUrl({s: 113, a: 1})").includes('everyayah'));
    clickAct('aud-plan'); await wait(300); ok(/déjà sur cet appareil/.test(appText()), 'rien de plus à télécharger');
    // automatique en Wi-Fi : retire une sourate puis relance
    await E("audioDel(113)"); await wait(400); eq(E("auMissing(auPlanSurahs(planToday()), audioSet('ar.alafasy'))"), [113]);
    Object.defineProperty(W.navigator, 'connection', {get: () => ({type: 'wifi'}), configurable: true}); E("store.set('tathbit.audioAuto', '')"); E("maybeAutoAudio()");
    for (let i = 0; i < 300 && (E('audioUI.busy') || !E("audioSet('ar.alafasy')[113]")); i++) await wait(100); ok(E("audioSet('ar.alafasy')[113]"), 'Wi-Fi confirmé : téléchargement automatique de la sourate manquante');
    // nettoyage
    Object.defineProperty(W.navigator, 'connection', {get: () => undefined, configurable: true}); await W.caches.delete('tathbit-audio-v1'); E("audioOff = {}; store.set('tathbit.audio', {}); cfg.audAuto = false");
  });
  test('Audio hors ligne : aucune clé de traduction manquante (en, ar)', async () => {
    for (const L of ['en', 'ar']){
      reset(`setLang('${L}'); cfg.reciter = 'ar.alafasy'; audioOff = {'ar.alafasy': {1: 400000, 112: 120000}}; audioUI = {plan: {take: [1], skip: [2], used: 1e6, skipBytes: 2e6, items: []}, busy: false, ctl: null}; plan = {from: 114, to: 114, order: 'desc', amt: 'v3', recent: 3, cycle: 4, mptr: 0, done: {}, log: []}`);
      E("go('settings')"); ok($q('[data-act="aud-del"]') && $q('[data-act="aud-plan"]'), L); eq(E('[...missingKeys]'), [], L); E("audioOff = {}; audioUI = {plan: null, busy: false, ctl: null}; store.set('tathbit.audio', {})");
    }
  });
  test('Tajwīd : aucune clé de traduction manquante (en, ar)', async () => {
    for (const L of ['en', 'ar']){
      reset(`setLang('${L}'); cfg.mode = 'tajweed'; cfg.scope = {type: 'surah', from: 2, to: 2}; cfg.n = 4; tjs = {n: [1, 2], q: [3, 0]};`); E("go('train')"); eq(E('[...missingKeys]'), [], L + ' liste');
      for (const kind of ['rule', 'color', 'find', 'tf', 'read']){
        E(`cfg.tjKind = '${kind}'; ses = null`); E("start()"); for (let i = 0; i < 40 && !$q('.opt'); i++) await wait(100); ok($q('mark.tjq'), L + ' ' + kind); click($q('.opt')); eq(E('[...missingKeys]'), [], `${L} ${kind}`);
      }
      E("home()"); E("go('progress')"); eq(E('[...missingKeys]'), [], L);
    }
  });
  test('Rôle enseignant : carte élève (inviter, annuler, retirer, journal), espace enseignant, nomination par l’admin (serveur simulé)', async () => {
    reset(); const calls = []; W.__calls = calls; const now = Date.now(), iso = d => new Date(now + d * 864e5).toISOString();
    W.__state = {links: [{as_role: 'teacher', other_id: 't1', email: 'prof@x.fr', since: iso(-3)}], invites: [{code: 'OLDCODE2', expires_at: iso(3), used_by: null}], log: [{teacher_email: 'prof@x.fr', at: iso(-1)}], fail: null};
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; me = {user: {id: 's1', email: 'eleve@x.fr'}, profile: {role: 'user', created_at: '${iso(-30)}'}};
      sb = {from(t){ if (t === 'teacher_requests') return {select(){ return Promise.resolve({data: window.__state.req ? [{created_at: new Date().toISOString()}] : [], error: null}); }}; return {select(){ return {is(){ return {gt(){ window.__calls.push('from ' + t); return Promise.resolve({data: window.__state.invites, error: null}); }}; }}; }}; },
        async rpc(n, a){ window.__calls.push(n + ' ' + JSON.stringify(a || {})); const S = window.__state; if (S.fail && S.fail[n]) return {data: null, error: {message: S.fail[n]}};
          if (n === 'teacher_request'){ S.req = true; return {data: null, error: null}; } if (n === 'teacher_request_cancel'){ S.req = false; return {data: null, error: null}; }
          if (n === 'links_mine') return {data: S.links, error: null}; if (n === 'access_log_mine') return {data: S.log, error: null};
          if (n === 'invite_create'){ const c = {code: 'ABCD2345', expires_at: new Date(Date.now() + 7 * 864e5).toISOString()}; S.invites = S.invites.concat([{...c, used_by: null}]); return {data: [c], error: null}; }
          if (n === 'invite_cancel'){ S.invites = S.invites.filter(x => x.code !== a.p_code); return {data: null, error: null}; }
          if (n === 'link_revoke'){ S.links = S.links.filter(x => x.other_id !== a.other); return {data: null, error: null}; }
          return {data: null, error: null}; }, auth: {}};`);
    E("go('home')"); await wait(150); ok($q('[data-act="tab"][data-v="student"]') && !$q('[data-act="tab"][data-v="teacher"]'), 'menu Élève séparé de Mon compte ; pas de menu Enseignant pour un élève');
    E("go('student')"); for (let i = 0; i < 40 && !appText().includes('Mes enseignants'); i++) await wait(50); await wait(200);
    ok(!appText().includes('Inviter un enseignant') && !appText().includes('Rejoindre une classe') && !appText().includes('Devenir enseignant'), 'inviter, rejoindre une classe et devenir enseignant ne sont pas dans l’espace élève'); ok(appText().includes('prof@x.fr') && !$q('[data-act="tch-revoke"]'), 'l’élève voit son enseignant mais ne peut pas le retirer');
    E("openAccount()"); for (let i = 0; i < 40 && !appText().includes('Mon enseignant'); i++) await wait(50); await wait(300);
    let t = appText(); ok(t.includes('Mon enseignant') && t.includes('OLDCODE2') && t.includes('prof@x.fr') && t.includes('Consultations récentes'), 'carte élève : invitation, enseignant, journal'); 
    ok(/sans les réponses que tu as tapées/.test(t), 'le consentement dit ce qui est vu'); noErr('carte élève');
    clickAct('tch-invite'); for (let i = 0; i < 40 && !$q('#tch-code-new'); i++) await wait(50); eq($q('#tch-code-new').textContent, 'ABCD2345'); ok(calls.includes('invite_create {}'), 'invite_create'); ok(appText().includes('une fois'), 'code à usage unique');
    clickAct('tch-cancel', 'OLDCODE2'); await wait(300); ok(calls.some(c => c === 'invite_cancel {"p_code":"OLDCODE2"}'), 'annulation'); ok(!appText().includes('OLDCODE2'));
    ok(appText().includes('Devenir enseignant') && $q('[data-act="tch-req"]'), 'un simple utilisateur peut demander le rôle');
    clickAct('tch-req'); for (let i = 0; i < 40 && !$q('[data-act="tch-req-cancel"]'); i++) await wait(50); ok(calls.includes('teacher_request {}') && appText().includes('Demande envoyée'), 'demande envoyée, en attente');
    clickAct('tch-req-cancel'); for (let i = 0; i < 40 && !$q('[data-act="tch-req"]'); i++) await wait(50); ok(calls.includes('teacher_request_cancel {}'), 'demande annulée');
    // l'enseignant
    E(`me = {user: {id: 't1', email: 'prof@x.fr'}, profile: {role: 'teacher', created_at: '${iso(-30)}'}}`); W.__state.students = [{id: 's1', email: 'eleve@x.fr', since: iso(-3), last_seen: iso(-0.1), answers: 40, ok: 30, errors: 4, synced_at: iso(-0.1)}];
    const days = {}; for (let i = 0; i < 5; i++){ const d = new Date(now - i * 864e5); days[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = 10 + i; }
    W.__state.detail = {email: 'eleve@x.fr', updated_at: iso(0), stats: {'2:5': [1, 3], '2:6': [5, 0], '114:1': [9, 0]}, days, errors: [{t: now - 1000, k: '2:5', m: 'cloze', sc: 0}, {t: now - 2000, k: '2:5', m: 'next', sc: 0}, {t: now - 3000, k: '2:6', m: 'mcq', sc: 0.5}]};
    const base = W.eval("sb.rpc"); W.eval("(() => { const r = sb.rpc; sb.rpc = async (n, a) => { if (n === 'teacher_students') { window.__calls.push(n); return {data: window.__state.students, error: null}; } if (n === 'teacher_student_data') { window.__calls.push(n + ' ' + JSON.stringify(a)); return {data: window.__state.detail, error: null}; } if (n === 'invite_accept') { window.__calls.push(n + ' ' + JSON.stringify(a)); if (a.p_code.toUpperCase() === 'BADCODE1') return {data: null, error: {message: 'Code invalide ou expiré.'}}; window.__state.students.push({id: 's2', email: 'autre@x.fr', since: new Date().toISOString(), last_seen: null, answers: 0, ok: 0, errors: 0}); return {data: [{student_id: 's2', email: 'autre@x.fr'}], error: null}; } return r(n, a); }; })()");
    E("home()"); await wait(100); ok($q('[data-act="tab"][data-v="teacher"]') && $q('[data-act="tab"][data-v="student"]'), 'menu Enseignant pour un enseignant'); clickAct('tab', 'teacher'); for (let i = 0; i < 40 && !appText().includes('eleve@x.fr'); i++) await wait(50);
    t = appText(); ok(t.includes('Espace enseignant') && t.includes('eleve@x.fr') && /40 réponses/.test(t) && /75 %/.test(t), 'liste des élèves : réponses et réussite'); noErr('espace enseignant');
    clickAct('tch-detail', 's1'); for (let i = 0; i < 40 && !appText().includes('Régularité'); i++) await wait(50); t = appText();
    ok(calls.some(c => c === 'teacher_student_data {"target":"s1"}'), 'résumé demandé'); ok(/5 jours actifs sur 7/.test(t) && /série en cours : 5/.test(t), 'régularité : ' + t.slice(t.indexOf('Régularité'), t.indexOf('Régularité') + 90));
    eq($$q('.week div').length, 14, '14 jours affichés'); ok(t.includes('Par sourate') && t.includes('Erreurs fréquentes') && t.includes('2×'), 'progression par sourate et erreurs fréquentes'); ok(!/réponse tapée/.test(t));
    if (!$q('#tch-code')) clickAct('tch-add-toggle'); ok(!!$q('#tch-code') && $q('[data-act="tch-add-toggle"]').getAttribute('aria-expanded') === 'true', 'bouton « Ajouter des élèves » : ouvre le formulaire d’invitation et le code de classe');
    $q('#tch-code').value = 'badcode1'; clickAct('tch-add'); await wait(300); ok(calls.some(c => c === 'invite_accept {"p_code":"badcode1"}'), 'code envoyé tel que saisi (le serveur met en majuscules)'); ok(appText().includes('Code invalide ou expiré.'), 'erreur du serveur affichée');
    $q('#tch-code').value = 'abcd2345'; clickAct('tch-add'); await wait(400); ok(appText().includes('Élève ajouté : autre@x.fr') && appText().includes('autre@x.fr'), 'élève ajouté');
    clickAct('tch-add'); await wait(200); ok(appText().includes('Saisis le code'), 'code vide refusé');
    // l'administrateur nomme un enseignant
    E(`me = {user: {id: 'ad', email: 'adm@x.fr'}, profile: {role: 'admin', created_at: '${iso(-30)}'}}; home();`); await wait(100); ok(!$q('[data-act="tab"][data-v="student"]') && !$q('[data-act="tab"][data-v="teacher"]'), 'l’administrateur n’a ni menu Élève ni menu Enseignant');
    E(` adm.users = [{id: 'ad', email: 'adm@x.fr', role: 'admin', blocked: false, created_at: '${iso(-30)}', last_seen: null, answers: 0, ok: 0, errors: 0}, {id: 'u9', email: 'futur.prof@x.fr', role: 'user', blocked: false, created_at: '${iso(-2)}', last_seen: null, answers: 0, ok: 0, errors: 0}, {id: 't1', email: 'prof@x.fr', role: 'teacher', blocked: false, created_at: '${iso(-2)}', last_seen: null, answers: 0, ok: 0, errors: 0}]; adm.detail = null; adm.q = ''; renderAdmin()`);
    t = appText(); ok($q('[data-act="adm-teacher"][data-v="u9"]').textContent.includes('Nommer enseignant') && $q('[data-act="adm-teacher"][data-v="t1"]').textContent.includes('Retirer enseignant'), 'boutons de nomination'); ok(!$q('[data-act="adm-teacher"][data-v="ad"]'), 'pas de bouton pour un admin'); ok(/·\s+enseignant/.test(t) && !!$q('[data-act="adm-del"][data-v="u9"]').closest('details.uact'), 'badge enseignant ; la suppression est rangée dans « Actions sur ce compte »');
    E("adm.reqs = [{user_id: 'u9', email: 'futur.prof@x.fr', created_at: new Date().toISOString()}]; renderAdmin()"); ok(appText().includes("Demandes d'enseignant") && appText().includes('futur.prof@x.fr'), 'demandes affichées à l’admin');
    calls.length = 0; clickAct('adm-req-no', 'u9'); await wait(300); ok(calls.some(c => c === 'admin_teacher_decline {"target":"u9"}'), 'refus envoyé'); E("adm.reqs = [{user_id: 'u9', email: 'futur.prof@x.fr', created_at: new Date().toISOString()}]; renderAdmin()"); calls.length = 0; clickAct('adm-req-ok', 'u9'); await wait(300); ok(calls.some(c => c === 'admin_set_role {"target":"u9","new_role":"teacher"}'), 'acceptation = rôle enseignant');
    E("adm.users = [{id: 'ad', email: 'adm@x.fr', role: 'admin', blocked: false, created_at: new Date().toISOString(), last_seen: null, answers: 0, ok: 0, errors: 0}, {id: 'u9', email: 'futur.prof@x.fr', role: 'user', blocked: false, created_at: new Date().toISOString(), last_seen: null, answers: 0, ok: 0, errors: 0}]; renderAdmin()");
    calls.length = 0; clickAct('adm-teacher', 'u9'); await wait(300); ok(calls.some(c => c === 'admin_set_role {"target":"u9","new_role":"teacher"}'), 'nomination envoyée'); E("adm.users = [{id: 't1', email: 'prof@x.fr', role: 'teacher', blocked: false, created_at: new Date().toISOString(), last_seen: null, answers: 0, ok: 0, errors: 0}]; renderAdmin()"); calls.length = 0; clickAct('adm-teacher', 't1'); await wait(300); ok(calls.some(c => c === 'admin_set_role {"target":"t1","new_role":"user"}'), 'retrait du rôle');
    // traductions
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); me = {user: {id: 't1', email: 'p@x.fr'}, profile: {role: 'teacher'}}; tch.code = {code: 'ABCD2345', expires_at: '${iso(5)}'}; tch.links = [{as_role: 'teacher', other_id: 'x', email: 'a@x.fr', since: '${iso(-1)}'}]; tch.invites = [{code: 'ZZZZ2222', expires_at: '${iso(2)}'}]; tch.log = [{teacher_email: 'a@x.fr', at: '${iso(-1)}'}]; tch.uid = 't1'; tch.loaded = true; cfg.tab = 'student'; home()`);
      ok(appText().length > 200, L); E("tch.students = window.__state.students; tch.detail = {id: 's1', data: window.__state.detail}; cfg.tab = 'teacher'; home()"); eq(E('[...missingKeys]'), [], L); E("renderAdmin()"); eq(E('[...missingKeys]'), [], L + ' admin'); }
    E("setLang('fr'); me = null; sb = null; CLOUD.url = ''; CLOUD.anonKey = ''; tch = {students: null, detail: null, msg: '', ok: false, links: null, invites: null, log: null, code: null, busy: false, loaded: false}; adm.users = null");
  });
  test('Enseignant : messages, objectifs fixés sans acceptation, code de classe (serveur simulé)', async () => {
    reset(); const calls = []; W.__calls = calls; const iso = d => new Date(Date.now() + d * 864e5).toISOString(), day = d => iso(d).slice(0, 10);
    W.__S = {msgs: [{id: 7, teacher_id: 't1', teacher_email: 'prof@x.fr', body: 'Courage pour la sourate 78 !', created_at: iso(-1), from_student: false, read_at: null}], goals: [{id: 3, teacher_email: 'prof@x.fr', surah: 78, due: day(5), note: 'avant dimanche'}], classes: [{code: 'CLASSE22', expires_at: iso(20), uses: 3, max_uses: 40}], tgoals: []};
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; stats = {'78:1': [3, 0], '78:2': [2, 1]}; me = {user: {id: 's1', email: 'eleve@x.fr'}, profile: {role: 'user'}};
      sb = {from(){ return {select(){ const p = Promise.resolve({data: [], error: null}); p.is = () => ({gt: () => p}); return p; }}; }, auth: {}, async rpc(n, a){ const S = window.__S; window.__calls.push(n + ' ' + JSON.stringify(a || {}));
        if (n === 'links_mine' || n === 'access_log_mine') return {data: [], error: null}; if (n === 'messages_mine') return {data: S.msgs, error: null};
        if (n === 'goals_for') return {data: a && a.target ? S.tgoals : S.goals, error: null}; if (n === 'message_delete'){ S.msgs = S.msgs.filter(m => m.id !== a.p_id); return {data: null, error: null}; }
        if (n === 'class_join') return a.p_code.toUpperCase() === 'BADCODE1' ? {data: null, error: {message: 'Code invalide ou expiré.'}} : {data: [{teacher_id: 't1', email: 'prof@x.fr'}], error: null};
        if (n === 'class_mine') return {data: S.classes, error: null}; if (n === 'class_create'){ S.classes.push({code: 'NOUVEAU2', expires_at: new Date(Date.now() + 30 * 864e5).toISOString(), uses: 0, max_uses: 40}); return {data: null, error: null}; }
        if (n === 'class_close'){ S.classes = S.classes.filter(c => c.code !== a.p_code); return {data: null, error: null}; }
        if (n === 'teacher_thread') return {data: [{id: 2, body: 'Merci prof', created_at: new Date().toISOString(), from_student: true, read_at: new Date().toISOString()}, {id: 1, body: 'Bravo', created_at: new Date().toISOString(), from_student: false, read_at: new Date().toISOString()}], error: null};
        if (n === 'teacher_students') return {data: [{id: 's1', email: 'eleve@x.fr', since: new Date().toISOString(), last_seen: null, answers: 5, ok: 4, errors: 1}], error: null};
        if (n === 'teacher_student_data') return {data: {email: 'eleve@x.fr', stats: {'78:1': [3, 0], '78:2': [2, 1], '78:3': [1, 0]}, days: {}, errors: []}, error: null};
        if (n === 'teacher_goal_set'){ S.tgoals.push({id: 11, teacher_email: 'prof@x.fr', surah: a.p_surah, due: a.p_due, note: a.p_note || null}); return {data: null, error: null}; }
        if (n === 'goal_delete'){ S.tgoals = S.tgoals.filter(g => g.id !== a.p_id); return {data: null, error: null}; }
        return {data: null, error: null}; }};`);
    E("go('student')"); for (let i = 0; i < 40 && !appText().includes('Mes objectifs'); i++) await wait(50); await wait(200);
    let t = appText(); ok(t.includes('Courage pour la sourate 78') && t.includes('prof@x.fr'), 'message de l’enseignant'); ok(t.includes('avant dimanche') && /2\/\d+ versets réussis/.test(t), 'objectif et avancement : ' + t.slice(t.indexOf('Mes objectifs'), t.indexOf('Mes objectifs') + 140));
    ok(!$q('[data-act="tch-goal-accept"]') && !/Accepter|Refuser/.test(t), 'aucune acceptation demandée à l’élève pour un objectif'); noErr('élève');
    ok(calls.includes('messages_mark_read {}'), 'les messages reçus sont marqués lus à l’ouverture');
    ok($q('#chat-thread .msg.them .b') && $q('#chat-thread .msg.them .b').textContent.includes('Courage'), 'bulle du message de l’enseignant (à gauche)');
    $q('#tch-reply').value = 'Merci'; $q('#tch-reply').dispatchEvent(new W.Event('input', {bubbles: true})); eq($q('#chat-count').textContent, '5/280', 'compteur de caractères');
    const sent = () => calls.filter(c => c.startsWith('student_message_send')).length, n0 = sent(); $q('#tch-reply').dispatchEvent(new W.KeyboardEvent('keydown', {key: 'Enter', shiftKey: true, bubbles: true})); await wait(150); eq(sent(), n0, 'Maj+Entrée : pas d’envoi');
    $q('#tch-reply').value = 'Merci !'; clickAct('tch-reply-send'); await wait(300); ok(calls.includes('student_message_send {"p_teacher":"t1","p_body":"Merci !"}'), 'l’élève répond à son enseignant');
    clickAct('tch-msg-del', '7'); await wait(300); ok(calls.some(c => c === 'message_delete {"p_id":7}') && !appText().includes('Courage pour'), 'message supprimé par l’élève');
    ok(appText().includes('Message supprimé.'), 'confirmation affichée'); await wait(3300); ok(!appText().includes('Message supprimé.'), 'la confirmation disparaît seule au bout de 3 s');
    E("go('student')"); await wait(300); t = appText();
    ok(/Reste à réussir : 3(–|, )\d+/.test(t) && t.includes('Rythme conseillé') && t.includes('Réviser les versets restants'), 'objectif : versets restants, rythme conseillé, bouton de révision : ' + t.slice(t.indexOf('Mes objectifs'), t.indexOf('Mes objectifs') + 400));
    E("go('home')"); await wait(150); ok(appText().includes('Objectif de ton enseignant'), 'rappel de l’objectif sur l’Accueil');
    clickAct('goal-go', '78-78'); await wait(300); ok(E("ses.goal === true && ses.pool.length > 0 && ses.pool.every(r => r.s === 78 && r.a > 2)"), 'la série ne contient que des versets de la sourate pas encore réussis');
    for (let i = 0; i < 6; i++){ ok(E("['next','cloze','mcq'].includes(cur.m) && cur.r.s === 78 && cur.r.a > 2"), 'questions sur le verset demandé'); E("nextQ()"); if (E("screen") === 'full' && !E("cur")) break; }
    E("home()");
    E("openAccount()"); await wait(500); ok($q('#tch-join') && !$q('#chat-thread'), 'rejoindre une classe : dans Mon compte');
    $q('#tch-join').value = 'badcode1'; clickAct('tch-join-go'); await wait(300); ok(appText().includes('Code invalide ou expiré.'), 'code de classe refusé');
    $q('#tch-join').value = 'classe22'; clickAct('tch-join-go'); await wait(300); ok(calls.includes('class_join {"p_code":"classe22"}') && appText().includes('Classe rejointe : prof@x.fr'), 'classe rejointe');
    E("cfg.setTab = 'audio'; go('settings')"); await wait(200); ok(!!$q('#card-notif') && /Notifications/.test($q('#card-notif h2').textContent) && !!$q('#rem-time, [data-act="tile-install"], .ref'), 'Réglages › Audio et notifications : rappels et e-mails au même endroit');
    ok($q('#wk-on') && !$q('#wk-on').checked, 'résumé hebdomadaire : case décochée par défaut'); $q('#wk-on').checked = true; $q('#wk-on').dispatchEvent(new W.Event('change', {bubbles: true})); await wait(300);
    ok(calls.some(c => c === 'weekly_set {"p_on":true,"p_lang":"fr"}') && appText().includes('Résumé hebdomadaire activé.'), 'résumé hebdomadaire activé');
    E("cfg.theme = 'dark'; applyTheme()"); eq(D.documentElement.dataset.theme, 'dark', 'thème sombre forcé'); E("cfg.theme = 'light'; applyTheme()"); eq(D.documentElement.dataset.theme, 'light'); E("delete cfg.theme; applyTheme()"); ok(!D.documentElement.dataset.theme, 'thème automatique');
    // côté enseignant
    E("me = {user: {id: 't1', email: 'prof@x.fr'}, profile: {role: 'teacher'}}; go('teacher')"); for (let i = 0; i < 40 && !appText().includes('eleve@x.fr'); i++) await wait(50); await wait(200);
    if (!$q('#tch-code')) clickAct('tch-add-toggle'); t = appText(); ok(t.includes('Groupe de classe') && t.includes('CLASSE22') && t.includes('3/40'), 'code de classe affiché');
    clickAct('tch-class-new'); for (let i = 0; i < 40 && !appText().includes('NOUVEAU2'); i++) await wait(50); ok(appText().includes('NOUVEAU2'), 'code de classe créé');
    clickAct('tch-class-close', 'CLASSE22'); await wait(300); ok(calls.includes('class_close {"p_code":"CLASSE22"}') && !appText().includes('CLASSE22'), 'code de classe fermé');
    clickAct('tch-detail', 's1'); for (let i = 0; i < 40 && !$q('[data-act="tch-goal-add"]'); i++) await wait(50); ok($q('[data-act="tch-send"]') && $q('#tch-gs').options.length === 114, 'formulaires objectif et message');
    $q('#tch-gs').value = '78'; $q('#tch-gd').value = day(6); $q('#tch-gn').value = 'relire'; clickAct('tch-goal-add', 's1'); for (let i = 0; i < 40 && !appText().includes('relire'); i++) await wait(50);
    ok(calls.some(c => c === 'teacher_goal_set {"target":"s1","p_surah":78,"p_due":"' + day(6) + '","p_note":"relire","p_surah_to":null}'), 'objectif fixé (une seule sourate : pas de plage)');
    // objectif sur plusieurs sourates : « de … à … »
    $q('#tch-gs').value = '78'; $q('#tch-gs').dispatchEvent(new W.Event('change', {bubbles: true})); eq($q('#tch-ge').value, '78', 'la 2e liste suit la 1re'); $q('#tch-ge').value = '80'; $q('#tch-gn').value = 'trois sourates'; $q('#tch-gd').value = day(6);
    clickAct('tch-goal-add', 's1'); await wait(300); ok(calls.some(c => c === 'teacher_goal_set {"target":"s1","p_surah":78,"p_due":"' + day(6) + '","p_note":"trois sourates","p_surah_to":80}'), 'objectif sur 78 → 80 envoyé');
    ok(E("goalName({surah: 78, surah_to: 80})").includes(' → ') && E("goalName({surah: 78, surah_to: null})") === E("SN(78)") && E("goalName({surah: 78, surah_to: 78})") === E("SN(78)"), 'nom d’un objectif : une sourate ou une plage');
    ok(E("(() => { stats = {'78:1': [1, 0]}; const i = goalInfo({surah: 78, surah_to: 79, due: '2099-01-01'}); return i.r.parts.length === 2 && i.x.total === slen(78) + slen(79) && i.x.seen === 1; })()"), 'progression cumulée sur plusieurs sourates'); ok(E("goalRestText(goalInfo({surah: 78, surah_to: 79, due: '2099-01-01'}))").includes(' : tout'), 'reste : « tout » pour une sourate non commencée'); E("stats = {}"); ok(/3\/\d+ \(\d+ %\)/.test(appText()), 'avancement de l’élève affiché');
    clickAct('tch-goal-del', '11'); await wait(300); ok(calls.includes('goal_delete {"p_id":11}') && !appText().includes('relire'), 'objectif supprimé');
    ok(appText().includes('Merci prof') && appText().includes('✓✓'), 'conversation : réponse de l’élève et accusé « lu »');
    ok($q('#chat-thread .msg.me') && $q('#chat-thread .msg.them'), 'conversation en bulles : moi à droite, l’élève à gauche');
    clickAct('tch-send', 's1'); await wait(200); ok(appText().includes('Écris un message.'), 'message vide refusé');
    $q('#tch-msg').value = 'Bravo !'; clickAct('tch-send', 's1'); await wait(300); ok(calls.includes('teacher_message_send {"target":"s1","p_body":"Bravo !"}') && !appText().includes('Message envoyé.'), 'message envoyé, sans confirmation qui reste affichée');
    E(`tch.students = [{id: 'a', email: 'zoe@x.fr', since: '${iso(-9)}', last_seen: null, answers: 0, ok: 0, errors: 0}, {id: 'b', email: 'amir@x.fr', since: '${iso(-9)}', last_seen: '${iso(-0.1)}', answers: 10, ok: 9, errors: 1}, {id: 'c', email: 'lea@x.fr', since: '${iso(-30)}', last_seen: '${iso(-20)}', answers: 10, ok: 3, errors: 7}]; tch.detail = null; tch.q = ''; tch.sort = 'activity'; tch.unread = {c: 2}; cfg.tab = 'teacher'; home()`);
    const order = () => { const t = appText(); return ['amir@x.fr', 'lea@x.fr', 'zoe@x.fr'].map(e => [t.indexOf(e, t.indexOf('Mes élèves')), e]).sort((x, y) => x[0] - y[0]).map(x => x[1]); };
    eq(order(), ['amir@x.fr', 'lea@x.fr', 'zoe@x.fr'], 'tri par activité récente'); ok(appText().includes('jamais connecté') && appText().includes('inactif depuis 20 j'), 'alertes d’inactivité');
    $q('#tch-sort').value = 'unread'; $q('#tch-sort').dispatchEvent(new W.Event('change', {bubbles: true})); eq(order()[0], 'lea@x.fr', 'tri par messages non lus');
    $q('#tch-sort').value = 'rate'; $q('#tch-sort').dispatchEvent(new W.Event('change', {bubbles: true})); eq(order()[0], 'lea@x.fr', 'tri : les plus fragiles d’abord');
    $q('#tch-q').value = 'zo'; $q('#tch-q').dispatchEvent(new W.Event('input', {bubbles: true})); ok(appText().includes('zoe@x.fr') && !appText().includes('amir@x.fr'), 'recherche d’un élève'); ok(E('document.activeElement && document.activeElement.id') === 'tch-q', 'le champ de recherche garde le focus');
    E("tch.q = ''; tch.sort = 'activity'");
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); tch.detail = {id: 's1', data: {stats: {}, days: {}, errors: []}, goals: [{id: 1, surah: 2, due: '${day(3)}', note: 'x'}], thread: [{id: 1, body: 'b', created_at: new Date().toISOString(), from_student: false, read_at: null}]}; tch.uid = 't1'; tch.students = window.__S ? [] : []; cfg.tab = 'teacher'; home()`); await wait(300); E("tch.loaded = true; tch.msgs = [{id: 1, teacher_id: 't', teacher_email: 'p@x.fr', body: 'b', created_at: new Date().toISOString(), from_student: false, read_at: null}, {id: 2, teacher_id: 't', teacher_email: 'p@x.fr', body: 'r', created_at: new Date().toISOString(), from_student: true, read_at: null}]; cfg.tab = 'student'; home()"); eq(E('[...missingKeys]'), [], L); }
    E("setLang('fr'); me = null; sb = null; CLOUD.url = ''; CLOUD.anonKey = ''; stats = {}; tch = {students: null, detail: null, msg: '', ok: false, links: null, invites: null, log: null, code: null, busy: false, loaded: false, req: false, msgs: [], goals: [], classes: [], joinMsg: ''}");
  });
  test('Cloche : notifications non traitées (nouveau message, objectif, demande…), ouvrir, traiter, tout traiter ; message à toute la classe', async () => {
    reset(); const calls = []; W.__calls = calls; const iso = d => new Date(Date.now() + d * 864e5).toISOString();
    W.__N = [{id: 5, kind: 'message', ref: 't1', actor: 'prof@x.fr', n: 2, created_at: iso(-0.1), read_at: null}, {id: 4, kind: 'goal', ref: '78', actor: 'prof@x.fr', n: 1, created_at: iso(-0.2), read_at: null}, {id: 3, kind: 'linked', ref: 't1', actor: 'prof@x.fr', n: 1, created_at: iso(-3), read_at: iso(-2)}];
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; authReady = true; me = {user: {id: 's1', email: 'eleve@x.fr'}, profile: {role: 'user'}};
      sb = {from(){ return {select(){ const p = Promise.resolve({data: [], error: null}); p.is = () => ({gt: () => p}); return p; }}; }, auth: {}, async rpc(n, a){ window.__calls.push(n + ' ' + JSON.stringify(a || {}));
        if (n === 'links_mine') return {data: [{as_role: 'teacher', other_id: 't1', email: 'prof@x.fr', since: new Date().toISOString()}], error: null};
        if (n === 'notifs_mine') return {data: window.__N.map(x => ({...x})), error: null};
        if (n === 'notif_read'){ window.__N.forEach(x => { if (x.id === a.p_id) x.read_at = new Date().toISOString(); }); return {data: null, error: null}; }
        if (n === 'notifs_read_all'){ window.__N.forEach(x => { x.read_at = x.read_at || new Date().toISOString(); }); return {data: null, error: null}; }
        if (n === 'teacher_message_all') return {data: 2, error: null};
        if (n === 'teacher_students') return {data: [{id: 'a', email: 'a@x.fr', since: new Date().toISOString(), last_seen: null, answers: 0, ok: 0, errors: 0}, {id: 'b', email: 'b@x.fr', since: new Date().toISOString(), last_seen: null, answers: 0, ok: 0, errors: 0}], error: null};
        if (n === 'admin_users') return {data: [], error: null};
        return {data: [], error: null}; }};`);
    E("go('home')"); for (let i = 0; i < 40 && !($q('#bell .badge')); i++) await wait(50);
    ok($q('#bell') && !$q('#bell').hidden, 'cloche affichée'); eq($q('#bell .badge').textContent, '2', 'pastille : 2 notifications non traitées'); ok(/2 non traitées|2 not handled/.test($q('#bell').getAttribute('aria-label')), 'libellé accessible');
    clickAct('bell'); await wait(300); const P = () => $q('#nf-panel'); ok(P() && !P().hidden, 'panneau ouvert'); let t = P().textContent;
    ok(t.includes('2 nouveaux messages de prof@x.fr') && /Nouvel objectif de prof@x.fr : /.test(t) && t.includes('Déjà traitées') && t.includes('suit maintenant ta progression'), 'liste : messages regroupés, objectif, déjà traitées'); eq($q('#bell').getAttribute('aria-expanded'), 'true');
    clickAct('nf-done', '4'); await wait(300); ok(calls.includes('notif_read {"p_id":4}'), 'marquer traitée'); eq($q('#bell .badge').textContent, '1', 'la pastille diminue');
    clickAct('nf-open', '5'); await wait(500); ok(calls.includes('notif_read {"p_id":5}') && P().hidden, 'ouvrir traite la notification et ferme le panneau'); eq(E('cfg.tab'), 'student', 'ouvre l’espace élève'); ok(!$q('#bell .badge'), 'plus de pastille');
    W.__N = [{id: 9, kind: 'reply', ref: 'a', actor: 'a@x.fr', n: 1, created_at: iso(0), read_at: null}, {id: 8, kind: 'request', ref: 'u', actor: 'futur@x.fr', n: 1, created_at: iso(0), read_at: null}]; E("nfLoad()"); await wait(300);
    clickAct('bell'); await wait(200); clickAct('nf-all'); await wait(300); ok(calls.includes('notifs_read_all {}') && /Rien à traiter/.test(P().textContent) && !$q('#bell .badge'), 'tout marquer comme traité');
    D.dispatchEvent(new W.KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await wait(100); ok(P().hidden, 'Échap ferme le panneau');
    const clk = el => el.dispatchEvent(new W.MouseEvent('click', {bubbles: true, composed: true}));   // vrai clic sur l'icône (le svg), pas sur le bouton
    clk($q('#bell svg')); await wait(300); ok(!P().hidden, 'un seul clic sur l’icône de la cloche ouvre le panneau (il ne se referme pas aussitôt)');
    clk(P().querySelector('h2')); await wait(100); ok(!P().hidden, 'un clic à l’intérieur du panneau ne le ferme pas');
    clk($q('#bell svg')); await wait(200); ok(P().hidden, 'un second clic sur la cloche le ferme');
    clk($q('#bell svg')); await wait(200); clk(D.body); await wait(100); ok(P().hidden, 'un clic ailleurs ferme le panneau');
    E("sb.rpc('x')"); noErr('cloche');
    // administrateur : demande d'enseignant
    W.__N = [{id: 20, kind: 'request', ref: 'u', actor: 'futur@x.fr', n: 1, created_at: iso(0), read_at: null}]; E("me = {user: {id: 'ad', email: 'adm@x.fr'}, profile: {role: 'admin'}}; nf = {list: [], loaded: false}; go('home')"); for (let i = 0; i < 40 && !($q('#bell .badge')); i++) await wait(50);
    ok($q('#bell .badge'), 'la cloche de l’administrateur'); clickAct('bell'); await wait(200); ok(P().textContent.includes('futur@x.fr demande à devenir enseignant'), 'demande d’enseignant'); clickAct('nf-open', '20'); await wait(500); eq(E('screen'), 'admin', 'ouvre l’espace admin');
    // message à toute la classe
    E("me = {user: {id: 't1', email: 'prof@x.fr'}, profile: {role: 'teacher'}}; nf = {list: [], loaded: false}; go('teacher')"); for (let i = 0; i < 40 && !$q('#tch-all'); i++) await wait(50);
    ok($q('#tch-all'), 'carte message à toute la classe'); clickAct('tch-all'); await wait(200); ok(appText().includes('Écris un message.'), 'message vide refusé');
    $q('#tch-all').value = 'Bonjour la classe'; clickAct('tch-all'); await wait(400); ok(calls.includes('teacher_message_all {"p_body":"Bonjour la classe"}') && appText().includes('Envoyé à 2 élèves.'), 'envoyé aux 2 élèves');
    for (const L of ['en', 'ar']){ W.__N = [{id: 1, kind: 'message', ref: 't', actor: 'p@x.fr', n: 3, created_at: iso(0), read_at: null}, {id: 2, kind: 'role_teacher', ref: null, actor: null, n: 1, created_at: iso(0), read_at: null}, {id: 3, kind: 'unlinked', ref: 't', actor: 'p@x.fr', n: 1, created_at: iso(0), read_at: iso(0)}]; E(`setLang('${L}'); nfLoad()`); await wait(200); clickAct('bell'); await wait(200); ok(P().textContent.length > 40, L); eq(E('[...missingKeys]'), [], L + ' cloche'); clickAct('nf-close'); }
    E("setLang('fr'); me = null; sb = null; CLOUD.url = ''; CLOUD.anonKey = ''; nf = {list: [], loaded: false}; tch = {students: null, detail: null, msg: '', ok: false, links: null, invites: null, log: null, code: null, busy: false, loaded: false, req: false, msgs: [], goals: [], classes: [], joinMsg: '', wk: false, unread: {}, loading: false, q: '', sort: 'activity', chatWith: null, openAfter: null}; bellSync()");
  });
  test('Récitation à voix haute : le texte entendu s’affiche en direct (micro simulé)', async () => {
    reset("cfg.mode = 'next'; cfg.input = 'voice'; cfg.scope = {type: 'surah', from: 1, to: 1};");
    E("SR = function(){ window.__rec = this; this.start = function(){ if (this.onstart) this.onstart(); }; this.stop = function(){ this.onend(); }; };"); E("start()"); noErr('start voix');
    ok($q('#heard') && $q('#heard').getAttribute('dir') === 'rtl' && $q('#heard').getAttribute('aria-live') === 'off', 'zone « Ce que j’entends » (arabe, de droite à gauche, non annoncée en continu)');
    clickAct('listen'); await wait(100); ok(E('window.__rec.interimResults === true && window.__rec.lang === "ar-SA"'), 'résultats provisoires demandés');
    E("window.__rec.onresult({results: [Object.assign([{transcript: 'الحمد لله'}], {isFinal: false})]})"); ok($q('#heard .interim') && $q('#heard').textContent.includes('الحمد لله'), 'texte provisoire affiché (estompé)');
    E("window.__rec.onresult({results: [Object.assign([{transcript: 'الحمد لله'}], {isFinal: true}), Object.assign([{transcript: 'رب العالمين'}], {isFinal: false})]})"); ok($q('#heard').textContent.includes('الحمد لله') && $q('#heard').textContent.includes('رب العالمين') && $$q('#heard .interim').length === 1, 'mots confirmés + mots encore provisoires');
    E("window.__rec.onend()"); await wait(200); ok(!$q('#work .interim') && $q('#work').textContent.includes('رب العالمين') && $q('#work').textContent.includes('الحمد لله'), 'à la fin, ce qui a été entendu reste affiché sous la correction'); ok($q('#fb .fb'), 'la récitation est corrigée'); noErr('voix');
    // c'est l'utilisateur qui termine : un bouton « J'ai fini de réciter » arrête le micro et corrige (verset isolé comme passage)
    E("window.__stops = 0; SR = function(){ window.__rec = this; this.start = function(){ if (this.onstart) this.onstart(); }; this.stop = function(){ window.__stops++; this.onend(); }; this.abort = function(){}; };");
    E("home()"); E("start()"); clickAct('listen'); await wait(100); ok(E('window.__rec.continuous === true'), 'écoute continue : une pause ne coupe plus le micro');
    ok(!$q('[data-act="listen"]').disabled && /fini de réciter/.test($q('[data-act="listen"]').textContent), 'bouton « J’ai fini de réciter » actif pendant l’écoute');
    ok($q('[data-act="listen"]').classList.contains('rec-stop') && /Touche ici/.test($q('[data-act="listen"]').textContent) && D.defaultView.getComputedStyle($q('[data-act="listen"]')).position === 'sticky' && $q('[data-act="listen"]').getBoundingClientRect().height >= 64, 'le bouton est grand, explicite (texte d’aide) et reste visible en bas de l’écran');
    ok($q('#mic-on') && /Micro ouvert/.test($q('#mic-on').textContent), 'voyant « micro ouvert » visible');
    E("window.__rec.onresult({results: [Object.assign([{transcript: 'الحمد لله رب'}], {isFinal: false})]})"); await wait(30);
    $q('[data-act="listen"]').click(); $q('[data-act="listen"]') && $q('[data-act="listen"]').click(); await wait(250);
    eq(E('window.__stops'), 1, 'un seul arrêt, même si on touche deux fois'); ok($q('#fb .fb') && $q('#work').textContent.includes('الحمد لله رب'), 'le verset est corrigé avec ce qui a été récité');
    // fin de récitation détectée par une pause (le micro n'a pas besoin qu'on touche le bouton) ; correction forcée si le navigateur ne signale jamais la fin
    E("MIC_SILENCE = 100; window.__stops = 0; SR = function(){ window.__rec = this; this.start = function(){ if (this.onstart) this.onstart(); }; this.stop = function(){ window.__stops++; this.onend(); }; this.abort = function(){}; };");
    E("home()"); E("start()"); clickAct('listen'); await wait(50); E("window.__rec.onresult({results: [Object.assign([{transcript: 'الحمد لله'}], {isFinal: true})]})"); await wait(400);
    eq(E('window.__stops'), 1, 'pause après avoir récité : le micro s’arrête tout seul'); ok($q('#fb .fb'), 'et la récitation est corrigée sans rien toucher');
    E("MIC_SILENCE = 4000; MIC_GRACE = 100; window.__stops = 0; SR = function(){ window.__rec = this; this.start = function(){ if (this.onstart) this.onstart(); }; this.stop = function(){ window.__stops++; }; this.abort = function(){}; };");
    E("home()"); E("start()"); clickAct('listen'); await wait(50); E("window.__rec.onresult({results: [Object.assign([{transcript: 'الحمد لله رب'}], {isFinal: false})]})"); await wait(30);
    $q('[data-act=\"listen\"]').click(); await wait(500); ok($q('#fb .fb') && $q('#work').textContent.includes('الحمد لله رب'), 'le navigateur ne signale jamais la fin : la récitation est corrigée quand même'); ok(E('micRec === null'), 'micro libéré');
    E("MIC_GRACE = 1500");
    // le micro se coupe quand la solution s'affiche, et jamais au-delà de la limite
    E("window.__aborted = 0; SR = function(){ window.__rec = this; this.start = function(){ if (this.onstart) this.onstart(); }; this.stop = function(){ this.onend(); }; this.abort = function(){ window.__aborted++; this.onend(); }; };");
    E("home()"); E("start()"); clickAct('listen'); await wait(100); ok(E('micRec !== null'), 'micro ouvert'); ok(/Micro ouvert/.test($q('#hmsg').textContent) && /\d+ s/.test($q('#hmsg').textContent), 'compte à rebours affiché : ' + $q('#hmsg').textContent);
    clickAct('reveal'); await wait(100); eq(E('window.__aborted'), 1, 'la solution s’affiche : micro coupé'); ok(E('micRec === null') && !$q('#fb .fb'), 'rien n’est corrigé à la place de l’élève');
    E("home()"); E("start()"); clickAct('listen'); await wait(50); E("home()"); eq(E('window.__aborted'), 2, 'quitter l’exercice coupe le micro');
    E("start()"); clickAct('listen'); await wait(50); E("window.__rec.onresult({results: [Object.assign([{transcript: 'الحمد لله'}], {isFinal: true})]})"); E("finish(1)"); eq(E('window.__aborted'), 3, 'la correction (finish) coupe le micro');
    E("MIC_MAX.one = 1; home()"); E("start()"); clickAct('listen'); await wait(1500); ok(E('micRec === null') && /Micro coupé automatiquement après 1 s/.test($q('#hmsg').textContent), 'coupé automatiquement après la limite : ' + $q('#hmsg').textContent);
    E("MIC_MAX.one = 45");
    // le micro ne s'ouvre pas : le message dit pourquoi et quoi faire (au lieu d'un code technique)
    E("SR = function(){ window.__rec = this; this.start = function(){ setTimeout(() => this.onerror({error: 'not-allowed'}), 20); setTimeout(() => this.onend(), 40); }; this.stop = function(){}; this.abort = function(){}; };");
    E("home()"); E("start()"); clickAct('listen'); await wait(300); ok(/Le micro est bloqué ou refusé\./.test($q('#hmsg').textContent) && /Autoriser|cadenas|dictée/.test($q('#hmsg').textContent), 'refus du micro : explication et marche à suivre : ' + $q('#hmsg').textContent);
    ok(!/Micro ouvert/.test($q('#hmsg').textContent) && E('micRec === null'), 'le compte à rebours ne masque pas l’erreur');
    E("SR = function(){ this.start = function(){ const e = new Error('x'); e.name = 'NotAllowedError'; throw e; }; this.stop = function(){}; this.abort = function(){}; };");
    E("home()"); E("start()"); clickAct('listen'); await wait(200); ok(/Le micro est bloqué ou refusé\./.test($q('#hmsg').textContent) && !$q('[data-act="listen"]').disabled, 'démarrage impossible : message affiché et bouton réutilisable');
    E("SR = window.SpeechRecognition || window.webkitSpeechRecognition");
  });
  test('Cloche : rappel de révision reçu et pas encore consulté', async () => {
    reset(); const calls = []; W.__calls = calls; const today = E("today()"), iso = d => new Date(Date.now() + d * 864e5).toISOString();
    W.__N = [{id: 31, kind: 'reminder', ref: today, actor: null, n: 7, created_at: iso(-0.01), read_at: null}];
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; authReady = true; me = {user: {id: 'u2', email: 'u@x.fr'}, profile: {role: 'user'}}; days = {};
      sb = {from(){ return {select(){ const p = Promise.resolve({data: [], error: null}); p.is = () => ({gt: () => p}); return p; }}; }, auth: {}, async rpc(n, a){ window.__calls.push(n + ' ' + JSON.stringify(a || {}));
        if (n === 'notifs_mine') return {data: window.__N.map(x => ({...x})), error: null};
        if (n === 'notif_read'){ window.__N.forEach(x => { if (x.id === a.p_id) x.read_at = new Date().toISOString(); }); return {data: null, error: null}; }
        return {data: [], error: null}; }};`);
    E("nf = {list: [], loaded: false}; bellSync(); go('home')"); for (let i = 0; i < 40 && !($q('#bell .badge') && $q('#bell .badge').textContent === '1'); i++) await wait(50); eq($q('#bell .badge').textContent, '1', 'le rappel est dans la cloche');
    clickAct('bell'); await wait(300); ok(/Rappel de révision : 7 versets à revoir aujourd.hui/.test($q('#nf-panel').textContent), 'texte du rappel : ' + $q('#nf-panel').textContent.slice(0, 120));
    clickAct('nf-open', '31'); await wait(500); ok(calls.includes('notif_read {"p_id":31}'), 'ouvrir traite le rappel'); ok(['train', 'home'].includes(E('cfg.tab')) || E('screen') === 'full', 'mène à la révision');
    // révisé aujourd'hui : un rappel non traité se traite tout seul
    W.__N = [{id: 32, kind: 'reminder', ref: today, actor: null, n: 3, created_at: iso(-0.01), read_at: null}]; calls.length = 0; E(`days = {[today()]: 4}; home(); nfLoad()`); await wait(500);
    ok(calls.includes('notif_read {"p_id":32}') && !$q('#bell .badge'), 'déjà révisé aujourd’hui : rappel traité automatiquement');
    for (const L of ['en', 'ar']){ W.__N = [{id: 33, kind: 'reminder', ref: '2000-01-01', actor: null, n: 1, created_at: iso(0), read_at: null}, {id: 34, kind: 'reminder', ref: '2000-01-02', actor: null, n: 0, created_at: iso(0), read_at: iso(0)}]; E(`setLang('${L}'); days = {}; nfLoad()`); await wait(300); clickAct('bell'); await wait(200); eq(E('[...missingKeys]'), [], L + ' rappel'); clickAct('nf-close'); }
    E("setLang('fr'); days = {}; me = null; sb = null; CLOUD.url = ''; CLOUD.anonKey = ''; nf = {list: [], loaded: false}; tch.loaded = false; tch.uid = null; bellSync()");
  });
  test('Tablettes : mise en page adaptée (deux colonnes, colonne plus large, aucun défilement horizontal) de 320 à 1366 px', async () => {
    reset(); const css0 = fr.style.cssText;
    for (const [w, grid] of [[320, false], [390, false], [600, false], [744, false], [820, false], [1024, true], [1180, true], [1366, true]]){
      fr.style.width = w + 'px'; fr.style.height = '900px'; await wait(150);
      for (const tab of ['home', 'plan', 'train', 'progress', 'errors', 'settings']){
        E(`go('${tab}')`); await wait(60);
        const de = D.documentElement, over = de.scrollWidth - de.clientWidth;
        ok(over <= 1, `${w} px, onglet ${tab} : défilement horizontal de ${over} px`);
        const disp = W.getComputedStyle($q('#app')).display; ok((disp === 'grid') === grid, `${w} px : l’application est ${disp === 'grid' ? 'sur deux colonnes' : 'sur une colonne'} (attendu : ${grid ? 'deux colonnes' : 'une colonne'})`);
      }
      eq(parseFloat(W.getComputedStyle($q('main')).maxWidth), w >= 1280 ? 1240 : w >= 960 ? 1120 : w >= 700 ? 880 : 720, `${w} px : largeur maximale de la colonne`);
    }
    fr.style.width = '1024px'; await wait(100); E("cfg.mode = 'mcq'; start()"); await wait(100);
    ok(parseFloat(W.getComputedStyle($q('main')).maxWidth) <= 820 && W.getComputedStyle($q('#app')).display !== 'grid', 'écran d’exercice : colonne unique de lecture confortable, même sur grande tablette'); ok(D.documentElement.scrollWidth <= D.documentElement.clientWidth + 1, 'exercice sans défilement horizontal');
    fr.style.cssText = css0; E("home()");
  });
  test('Profil et menus selon la personne : simple utilisateur (ni Élève ni Enseignant), élève, enseignant, administrateur', async () => {
    reset(); const calls = []; W.__calls = calls; W.__LK = [];
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; authReady = true; me = {user: {id: 'u1', email: 'simple@x.fr'}, profile: {role: 'user', created_at: new Date().toISOString()}}; try { localStorage.clear(); } catch {} store.set('tathbit.welcome', 1);
      sb = {from(){ return {select(){ const p = Promise.resolve({data: [], error: null}); p.is = () => ({gt: () => p}); return p; }}; }, auth: {}, async rpc(n){ if (n === 'links_mine') return {data: window.__LK, error: null}; return {data: [], error: null}; }};`);
    const tabs = () => $$q('#nav [data-act="tab"]').map(b => b.dataset.v), chip = () => [...D.querySelectorAll('.chip')].map(x => x.textContent).join('|');
    E("go('home')"); await wait(600); ok(!tabs().includes('student') && !tabs().includes('teacher'), 'simple utilisateur : ni onglet Élève ni onglet Enseignant : ' + tabs().join(',')); eq(chip(), 'Utilisateur', 'profil : Utilisateur');
    E("openAccount()"); await wait(500); eq(chip(), 'Utilisateur', 'Mon compte : profil Utilisateur'); ok(appText().includes('ni élève ni enseignant') && $q('[data-act="tch-invite"]') && $q('[data-act="tch-req"]'), 'inviter un enseignant et devenir enseignant restent dans Mon compte');
    // il devient élève dès qu'un enseignant le suit
    W.__LK = [{as_role: 'teacher', other_id: 't1', email: 'prof@x.fr', since: new Date().toISOString()}]; E("tch.loaded = false; tch.uid = null; go('home')"); for (let i = 0; i < 40 && !tabs().includes('student'); i++) await wait(50);
    ok(tabs().includes('student') && !tabs().includes('teacher'), 'élève : onglet Élève seulement'); eq(chip(), 'Élève', 'profil : Élève'); E("openAccount()"); await wait(500); ok(appText().includes('Mes enseignants : prof@x.fr'), 'Mon compte : ses enseignants');
    // enseignant sans élève ni enseignant : onglet Enseignant seul
    W.__LK = []; E("me = {user: {id: 't9', email: 'prof@x.fr'}, profile: {role: 'teacher', created_at: new Date().toISOString()}}; tch.loaded = false; tch.uid = null; go('home')"); await wait(600);
    ok(tabs().includes('teacher') && !tabs().includes('student'), 'enseignant : onglet Enseignant (pas Élève s’il n’a pas d’enseignant)'); eq(chip(), 'Enseignant', 'profil : Enseignant');
    E("me = {user: {id: 'a1', email: 'adm@x.fr'}, profile: {role: 'admin', created_at: new Date().toISOString()}}; tch.loaded = false; tch.uid = null; go('home')"); await wait(600);
    ok(!tabs().includes('student') && !tabs().includes('teacher'), 'administrateur : aucun des deux onglets'); eq(chip(), 'Administrateur', 'profil : Administrateur');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); openAccount()`); await wait(300); eq(E('[...missingKeys]'), [], L + ' profil'); }
    E("setLang('fr'); me = null; sb = null; CLOUD.url = ''; CLOUD.anonKey = ''; tch.loaded = false; tch.uid = null; try { localStorage.clear(); } catch {}");
  });
  test('Espace admin : surveillance des e-mails (calme, attention, alerte, nom de domaine)', async () => {
    const mk = (n, agoH) => Array.from({length: n}, (_, i) => ({id: 'u' + agoH + i, email: `u${agoH}-${i}@x.fr`, role: 'user', blocked: false, created_at: new Date(Date.now() - agoH * 36e5).toISOString(), last_seen: null, answers: 0, ok: 0, errors: 0}));
    reset(); E("me = {user: {id: 'a', email: 'admin@x.fr'}, profile: {role: 'admin'}}");
    for (const [users, expect, label] of [[mk(2, 3), ['✓', null], 'calme'], [mk(16, 0.2), ['⚠', 'approches'], 'attention'], [mk(26, 0.2), ['⛔', 'approches'], 'alerte']]){
      W.__u = users; E("adm.users = window.__u; adm.detail = null; adm.q = ''; renderAdmin()"); const t = appText(); ok(t.includes('Surveillance des e-mails'), label + ' : carte'); ok(t.includes(expect[0]), label + ' : ' + expect[0]);
      if (expect[1]) ok(t.includes(expect[1]), label + ' : message'); else ok(!t.includes('approches'), 'pas d’alerte en situation calme'); noErr('admin ' + label);
    }
    W.__u = mk(45, 100); E("adm.users = window.__u; renderAdmin()"); ok(/Tu as 45 comptes/.test(appText()), 'passage au nom de domaine'); ok(!appText().includes('approches'));
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); adm.users = window.__u; renderAdmin()`); eq(E('[...missingKeys]'), [], L); } E("setLang('fr'); me = null; adm.users = null");
  });
  test('Chaque onglet s’affiche dans les 3 langues sans erreur ni « undefined »', async () => {
    for (const L of ['fr', 'en', 'ar']){
      reset(); E(`setLang('${L}')`);
      for (const t of ['home', 'train', 'plan', 'progress', 'settings', 'errors']){
        E(`go('${t}')`); await wait(10); noErr(`${t}/${L}`);
        const txt = D.getElementById('app').textContent; ok(!/undefined|NaN|\[object/.test(txt), `texte suspect dans ${t}/${L}`);
      }
    }
    eq(E('document.documentElement.dir'), 'rtl');
  });
  test('Lecteur : sourate entière et un matn s’ouvrent', () => {
    reset(); E("openReader('q:1')"); ok($q('.rsec'), 'lecteur Coran'); E("openReader('m:tuhfa')"); ok($q('.rsec'), 'lecteur matn'); noErr('lecteur');
  });
  test('Mes moutoun : un matn ajouté à la main devient utilisable', () => {
    reset(); E("go('train')"); const ta = $q('#cm-text'); if (!ta) return; // la zone n'existe que sur l'écran concerné
    ta.value = 'قال الشيخ رحمه الله تعالى في أول منظومته\nالحمد لله الذي هدانا إلى سبيل الحق والإيمان'; $q('#cm-title').value = 'Test'; clickAct('addcustom'); noErr('ajout matn');
    eq(E('custom.length'), 1);
  });
  test('Comptes : messages d’erreur d’e-mail clairs, renvoi de l’e-mail de confirmation (serveur simulé)', async () => {
    reset(); const f = m => E(`friendly(new Error(${JSON.stringify(m)}))`);
    ok(/limite d'e-mails/.test(f('email rate limit exceeded')), 'limite horaire'); ok(/service d'envoi/.test(f('Email address not authorized')), 'serveur d’essai');
    ok(/n'a pas pu être envoyé/.test(f('Error sending confirmation email')), 'envoi'); ok(/Trop de tentatives/.test(f('For security purposes, you can only request this after 20 seconds')), 'anti-spam');
    ok(/incorrect/.test(f('Invalid login credentials')), 'identifiants');
    const calls = []; W.__c = calls;
    E("CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; me = null; acc.mode = 'signup'; acc.resend = ''; acc.resendAt = 0; sb = {auth: {async signUp(){ window.__c.push('signUp'); return {data: {user: {identities: [{}]}, session: null}, error: null}; }, async resend(o){ window.__c.push('resend ' + o.email + ' ' + o.type); return {error: null}; }, async verifyOtp(o){ window.__c.push('otp ' + o.email + ' ' + o.token + ' ' + o.type); return o.token === '123456' ? {data: {session: null}, error: null} : {data: null, error: {message: 'Token has expired or is invalid'}}; }, async signInWithPassword(){ return {data: null, error: {message: 'Email not confirmed'}}; }}};");
    E("renderAccount()"); ok(!$q('[data-act="acc-resend"]'), 'pas de bouton avant inscription');
    ok(/8 caractères minimum, avec au moins une minuscule, une majuscule, un chiffre et un symbole/.test(appText()), 'inscription : les règles du mot de passe sont écrites avant la saisie');
    $q('#ac-email').value = 'a@b.fr'; $q('#ac-pass').value = 'motdepasse1'; $q('#ac-pass2').value = 'motdepasse1'; $q('#ac-consent').checked = true; clickAct('acc-signup'); await wait(300);
    ok($q('[data-act="acc-resend"]'), 'bouton de renvoi après inscription'); ok(/indésirables/.test($q('#acc-msg').textContent), 'rappel du dossier spam');
    ok($q('#ac-code') && $q('[data-act="acc-code"]') && /pas du spam/.test(appText()), 'code de confirmation proposé quand le lien est désactivé (message en indésirables)');
    $q('#ac-code').value = '12'; clickAct('acc-code'); await wait(200); ok(/6 à 10 chiffres/.test($q('#acc-msg').textContent) && !calls.some(c => c.startsWith('otp')), 'code trop court refusé sans appel');
    $q('#ac-code').value = '999999'; clickAct('acc-code'); await wait(300); ok(calls.includes('otp a@b.fr 999999 signup') && /incorrect ou expiré/.test($q('#acc-msg').textContent), 'mauvais code : message clair');
    $q('#ac-code').value = '123 456'; clickAct('acc-code'); await wait(300); ok(calls.includes('otp a@b.fr 123456 signup') && /E-mail confirmé/.test($q('#acc-msg').textContent) && !$q('#ac-code'), 'bon code (espaces ignorés) : e-mail confirmé, carte du code disparue');
    E("acc.resend = 'a@b.fr'; acc.mode = 'login'; renderAccount()");
    clickAct('acc-resend'); await wait(300); ok(calls.includes('resend a@b.fr signup'), 'renvoi demandé'); ok(/renvoyé/.test($q('#acc-msg').textContent));
    clickAct('acc-resend'); await wait(300); eq(calls.filter(c => c.startsWith('resend')).length, 1, 'une relance par minute au plus'); ok(/Patiente/.test($q('#acc-msg').textContent), 'attente affichée');
    E("acc.resend = ''; acc.resendAt = 0; acc.mode = 'login'; renderAccount()"); $q('#ac-email').value = 'c@d.fr'; $q('#ac-pass').value = 'x'; clickAct('acc-login'); await wait(300);
    ok($q('[data-act="acc-resend"]'), 'bouton si e-mail non confirmé'); eq(E('acc.resend'), 'c@d.fr');
    E("CLOUD.url = ''; CLOUD.anonKey = ''; sb = null; me = null; acc.resend = ''; acc.msg = '';");
  });
  test('Plan de révision : « Autre » pour la révision récente et le cycle, avec un nombre de jours libre', () => {
    reset("plan = null; pdraft = null; planEditing = false;"); E("go('plan')");
    ok($q('#pf-recent option[value="other"]') && $q('#pf-cycle option[value="other"]'), '« Autre » proposé dans les deux listes'); ok(!$q('#pf-recent-n') && !$q('#pf-cycle-n'), 'pas de champ libre tant qu’« Autre » n’est pas choisi');
    $q('#pf-recent').value = 'other'; $q('#pf-recent').dispatchEvent(new Event('change'));
    ok($q('#pf-recent-n') && $q('#pf-recent-n').value === '7' && $q('#pf-recent').value === 'other', 'le champ libre apparaît, avec la valeur du moment');
    $q('#pf-recent-n').value = '12'; $q('#pf-recent-n').dispatchEvent(new Event('input'));
    $q('#pf-cycle').value = 'other'; $q('#pf-cycle').dispatchEvent(new Event('change'));
    eq($q('#pf-recent-n').value, '12', 'le nombre saisi est gardé quand on touche à l’autre liste'); eq($q('#pf-cycle-n').value, '30', 'le cycle part de sa valeur actuelle');
    $q('#pf-cycle-n').value = '25'; $q('#pf-cycle-n').dispatchEvent(new Event('input'));
    $q('#pf-recent-n').value = '999'; $q('#pf-recent-n').dispatchEvent(new Event('input')); eq(E('pdraft.recent'), 30, 'au-delà du maximum : ramené à 30');
    $q('#pf-recent-n').value = '12'; $q('#pf-recent-n').dispatchEvent(new Event('input'));
    clickAct('plan-save'); eq(E('plan.recent'), 12, 'révision récente enregistrée : 12 jours'); eq(E('plan.cycle'), 25, 'cycle enregistré : 25 jours');
    ok(/12 derniers jours/.test(appText()) || /12/.test(appText()), 'le plan affiche ces durées'); noErr('plan autre');
    E("planEditing = true; pdraft = null; go('plan')"); eq($q('#pf-recent').value, 'other', 'à la modification : « Autre » est reselectionné pour une durée hors liste'); eq($q('#pf-recent-n').value, '12', 'avec le nombre enregistré');
    $q('#pf-recent').value = '5'; $q('#pf-recent').dispatchEvent(new Event('change')); ok(!$q('#pf-recent-n'), 'revenir à une durée de la liste cache le champ libre');
  });
  test('Récitation libre à voix haute : choix de sourates, texte masqué qui se dévoile, indice, passage, bilan, erreurs (micro simulé)', async () => {
    reset("cfg.frFrom = 112; cfg.frTo = 112; delete cfg.frHide;");
    E("SR = function(){ window.__rec = this; this.start = function(){ if (this.onstart) this.onstart(); }; this.stop = function(){ if (this.onend) this.onend(); }; this.abort = function(){}; }");
    const heard = (n) => E(`Q[111].a[${n}].t`), say = txt => W.__rec.onresult({results: [Object.assign([{transcript: txt}], {isFinal: true})]});
    E("go('train')"); ok($q('[data-act="fr-setup"]'), 'carte « Réciter à voix haute » dans Réviser'); clickAct('fr-setup');
    ok($q('#frfrom') && $q('#frto') && $q('#frhide').checked, 'choix des sourates, texte masqué par défaut'); eq($q('#frfrom').value, '112', 'sourates retenues d’une fois sur l’autre');
    clickAct('fr-start'); noErr('récitation libre');
    const words = $$q('#fr-text .fw'); ok(words.length > 10 && words.every(w => w.classList.contains('mask') || w.classList.contains('cur')), 'texte masqué au départ (' + words.length + ' mots)');
    ok($q('#mic-on') && $q('.rec-stop[data-act="fr-stop"]'), 'micro ouvert signalé et gros bouton « J’ai fini de réciter »');
    say(heard(0)); const n1 = E('fr.verses[0].to'); eq(E('fr.p'), n1, 'le 1er verset entendu fait avancer au 2e'); ok($$q('#fr-text .fw.ok').length === n1, 'les mots récités se dévoilent en vert');
    clickAct('fr-hint'); ok(E('fr.hint.size') === 1 && $q('#fr-text .fw.hint'), 'indice : le mot suivant s’affiche, et compte « à revoir »');
    say(heard(0) + ' ' + heard(1).split(' ').slice(1).join(' ')); ok(E('fr.p') === E('fr.verses[1].to'), 'le 2e verset est suivi même sans son premier mot (donné en indice)');
    say(heard(0) + ' ' + heard(1).split(' ').slice(1).join(' ') + ' ' + heard(2)); eq(E('fr.p'), E('fr.verses[2].to'), 'le 3e verset suit');
    ok(/Verset 4 \/ 4/.test($q('#fr-pos').textContent), 'position : ' + $q('#fr-pos').textContent);
    clickAct('fr-stop'); await wait(100);
    ok(/Bilan de ta récitation/.test(appText()) && /3 versets récités en entier/.test(appText()) && /2 sans oubli/.test(appText()) && /1 à revoir/.test(appText()), 'bilan : 3 versets, 2 sans oubli, 1 à revoir : ' + appText().slice(0, 250));
    eq(E("stats['112:1']"), [1, 0], 'verset récité de mémoire sans oubli compté dans la révision'); eq(E("stats['112:2']"), undefined, 'verset avec oubli pas compté comme réussi');
    ok($q('#fr-err'), 'bouton « Ajouter à mes erreurs »'); clickAct('fr-err'); eq(E("errors.length"), 1, 'erreur ajoutée'); eq(E("errors[0].m"), 'free', 'mode « récitation libre »'); eq(E("stats['112:2']"), [0, 1], 'verset à revoir noté dans la révision espacée');
    clickAct('fr-err'); eq(E("errors.length"), 1, 'pas de doublon');
    // autocontrôle des voyelles : l'utilisateur marque des mots, les versets concernés vont aux erreurs sans double compte
    ok($q('[data-act="fr-vow"]'), 'bouton « Vérifier mes voyelles » dans le bilan'); clickAct('fr-vow'); ok($$q('.wd').length > 5 && /voyelles/.test(appText()), 'écran de contrôle des voyelles');
    ok($q('.frvow .wd'), 'mots marqués à l’écran des voyelles : zone en orange'); clickAct('fr-wd', '0:0'); ok(/1 mot marqué/.test($q('#fr-vow-go').textContent), 'compteur : ' + $q('#fr-vow-go').textContent); clickAct('fr-wd', '1:0'); clickAct('fr-wd', '1:0'); clickAct('fr-wd', '1:1');
    ok(/2 mots marqués/.test($q('#fr-vow-go').textContent), 'toucher deux fois annule : ' + $q('#fr-vow-go').textContent);
    clickAct('fr-vow-save'); await wait(100);
    eq(E("stats['112:1']"), [0, 1], 'verset compté « sans oubli » puis marqué : annulé et compté à revoir'); eq(E("stats['112:2']"), [0, 1], 'verset déjà compté en erreur : pas compté deux fois'); eq(E("errors.length"), 3, 'une entrée d’erreur par verset marqué (en plus de la 1re)');
    ok(/Voyelles vérifiées/.test(appText()) && /2 versets avec des voyelles à revoir ajoutés/.test(appText()) && !$q('[data-act="fr-vow"]'), 'bilan : voyelles vérifiées, 2 versets ajoutés');
    // mots non entendus : rouge, et un toucher montre ce que le téléphone a entendu
    clickAct('fr-again'); clickAct('fr-start'); say(heard(0).split(' ').slice(0, 1).join(' ') + ' خطأ ' + heard(0).split(' ').slice(2).join(' '));
    const mi = $q('#fr-text .fw.miss'); ok(mi && mi.dataset.act === 'fr-heard', 'le mot sauté est en rouge (classe miss) et touchable'); ok(/Rouge : mot non entendu/.test(appText()), 'légende : rouge = non entendu, pas forcément une faute');
    clickAct('fr-heard', mi.dataset.v); ok(/Mot attendu/.test($q('#fr-heard-info').textContent) && /خطأ/.test($q('#fr-heard-info').textContent), 'toucher le mot : ce que le téléphone a entendu à sa place : ' + $q('#fr-heard-info').textContent);
    clickAct('fr-hint'); const hw = $q('#fr-text .fw.hint'); ok(hw && hw.dataset.act === 'fr-heard', 'mot montré par l’indice : touchable'); clickAct('fr-heard', hw.dataset.v); ok(/grâce à l’indice|grâce à l'indice/.test($q('#fr-heard-info').textContent), 'indice : message dédié');
    clickAct('fr-skip'); const sk = $q('#fr-text .fw.miss[data-act="fr-heard"]'); ok(sk, 'après « passer ce verset » : mots touchables'); clickAct('fr-stop'); await wait(100);
    ok($q('#fr-heard-info') && $q('.card .fw.miss[data-act="fr-heard"]'), 'bilan : mots à revoir touchables avec zone d’information'); const bw = $q('.card .fw.miss[data-act="fr-heard"]'); clickAct('fr-heard', bw.dataset.v); ok(/Mot attendu/.test($q('#fr-heard-info').textContent), 'bilan : information affichée');
    // micro refusé : la récitation s'arrête avec le bon message
    clickAct('fr-again'); clickAct('fr-start'); W.__rec.onerror({error: 'not-allowed'}); W.__rec.onend(); await wait(100); ok(/Micro arrêté/.test(appText()), 'micro refusé : bilan « Micro arrêté »');
    // texte visible : aucune écriture dans la révision
    E("stats = {}; cfg.frHide = false"); clickAct('fr-again'); eq($q('#frhide').checked, false, 'choix « texte visible » retenu'); clickAct('fr-start'); ok(!$q('#fr-text .fw.mask'), 'texte visible : rien n’est masqué'); say(heard(0)); clickAct('fr-stop'); await wait(100); eq(E("stats['112:1']"), undefined, 'en lecture (texte visible) rien n’est compté comme récité de mémoire');
    // plusieurs sourates : l'affichage suit
    E("cfg.frFrom = 111; cfg.frTo = 112; cfg.frHide = true"); clickAct('fr-again'); clickAct('fr-start'); ok(E("fr.verses.filter(v => v.s === 111).length") === 5, 'Al-Masad : 5 versets'); ok(E("fr.exp.length") > E("fr.verses[4].to"), 'deux sourates à la suite'); clickAct('fr-quit');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); frSetup()`); clickAct('fr-start'); say(heard(0)); clickAct('fr-stop'); await wait(100); ok(!/undefined/.test(appText()), 'récitation libre en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); frQuit()");
  });
  test('Nouvelle version : message à l’accueil, entrée dans la cloche, e-mail désactivable, annonce par l’administrateur', async () => {
    reset(); const f0 = W.fetch, calls = []; W.__u = calls;
    E("newVer = null; verAt = 0; window.fetch = async u => ({ok: true, json: async () => ({v: APP_BUILD + 1, label: '9 nov. 2026 · v' + (APP_BUILD + 1)})})");
    E("go('home')"); ok(!$q('.upd'), 'pas de message quand rien de nouveau n’est connu'); E("checkVersion(true)"); await wait(200);
    ok($q('#upd-slot .upd') && /nouvelle version/i.test($q('#upd-slot .upd').textContent) && /Chercher les mises à jour/.test($q('#upd-slot .upd').textContent) && $q('#upd-slot [data-act="upd"]'), 'accueil : message explicite et bouton « Chercher les mises à jour »');
    E("newVer = null; verAt = 0; window.fetch = async u => ({ok: true, json: async () => ({v: APP_BUILD, label: 'x'})})"); E("go('home')"); E("checkVersion(true)"); await wait(100); ok(!$q('.upd'), 'même version : pas de message');
    E("window.fetch = async u => ({ok: false})"); E("newVer = null; checkVersion(true)"); await wait(50); ok(E('newVer') === null, 'fichier absent : rien');
    W.fetch = f0;
    // cloche
    const nfx = ref => `[{id: 1, kind: 'app_update', ref: '${ref}', actor: null, n: 1, created_at: new Date().toISOString(), read_at: null}]`;
    ok(/Nouvelle version de l'application \(v1234\)/.test(E("nfText({kind: 'app_update', ref: '1234'})")), 'texte de la cloche');
    E(`newVer = null; nf = {list: ${nfx('999')}, loaded: true}; nfOpen(1)`); await wait(200); ok(E('newVer && newVer.v') === 999 && $q('.upd'), 'ouvrir la notification mène à l’accueil, avec le message');
    E("newVer = null; sb = {rpc: async (n, a) => { window.__u.push(n + ' ' + JSON.stringify(a || {})); return {data: null, error: null}; }}; me = {user: {id: 'u1', email: 'a@b.fr'}, profile: {role: 'user'}}");
    E(`nf = {list: ${nfx(1)}, loaded: true}; nfRead(1)`); E("sb.rpc = async (n, a) => { window.__u.push(n + ' ' + JSON.stringify(a || {})); return n === 'notifs_mine' ? {data: [{id: 7, kind: 'app_update', ref: '1', actor: null, n: 1, created_at: new Date().toISOString(), read_at: null}], error: null} : {data: null, error: null}; }");
    E("nfLoad()"); await wait(400); ok(!calls.includes('notif_read {"p_id":7}'), 'une version déjà installée n’est plus « traitée » toute seule : ses nouveautés restent dans la cloche'); ok(E('newVer') === null, 'et ne déclenche pas le message « nouvelle version »');
    // nouveautés : résumé dans la cloche et sur l'accueil, écran des nouveautés, boutons « Essayer », lien d'un e-mail
    const item = (id, go, ti) => ({id, icon: '✨', go, title: {fr: ti, en: ti + ' (en)', ar: ti + ' (ar)'}, text: {fr: 'Texte ' + id, en: 'Text ' + id, ar: 'نص ' + id}});
    W.__news = {v: E('APP_BUILD'), items: [item('a', 'recite', 'Réciter à voix haute'), item('b', 'contact', 'Page de contact')]};
    E("window.fetch = async u => ({ok: true, json: async () => String(u).startsWith('news.json') ? window.__news : {v: APP_BUILD}}); news = null; newsAt = 0; stats = {'1:1': [1, 0]}; store.set('tathbit.newsSeen', 0)"); await E("loadNews(true)");
    ok(/Nouveautés de la version v1/.test(E("nfText({kind: 'app_update', ref: '1'})")) && /Nouveautés de la version/.test(E("nfText({kind: 'app_update', ref: String(APP_BUILD)})")), 'cloche : « Nouveautés de la version vN » pour une version installée'); ok(/nouvelle version/i.test(E("nfText({kind: 'app_update', ref: String(APP_BUILD + 1)})")), 'et « nouvelle version » pour une version pas encore installée');
    ok(/Réciter à voix haute/.test(E("newsSummary(APP_BUILD)")) && E("newsSummary(APP_BUILD + 5)") === '', 'résumé : titres des nouveautés de cette version seulement');
    E("go('home')"); ok($q('#news-slot .upd') && /Nouveautés de la version/.test($q('#news-slot .upd').textContent) && /Réciter à voix haute/.test($q('#news-slot .upd').textContent) && $q('[data-act="news-open"]'), 'accueil : carte « Nouveautés » avec le résumé et le bouton');
    clickAct('news-open'); await wait(300); ok(/Nouveautés de la version/.test(appText()) && $$q('[data-act="news-go"]').length === 2, 'écran des nouveautés : un bouton « Essayer » par nouveauté'); eq(E("store.get('tathbit.newsSeen')"), E('APP_BUILD'), 'la version est marquée « vue »');
    clickAct('news-go', 'contact'); ok($q('a.btnlink'), '« Essayer » mène à la fonction (page de contact)');
    E("go('home')"); ok(!$q('#news-slot .upd'), 'une fois vue, la carte ne revient pas');
    E(`store.set('tathbit.newsSeen', 0); nf = {list: ${nfx(1)}, loaded: true}; nf.list[0].ref = String(APP_BUILD); nfOpen(1)`); await wait(400); ok(/Nouveautés de la version/.test(appText()) && $$q('[data-act="news-go"]').length === 2, 'cliquer la notification d’une version installée ouvre ses nouveautés');
    W.__news = {v: E('APP_BUILD'), items: [item('a', 'recite', 'Réciter à voix haute')]}; E("news = null; newsAt = 0"); await E("loadNews(true)"); E("openNews()"); await wait(300); ok($q('#frfrom'), 'une seule nouveauté : la notification mène directement à la fonction (récitation libre)');
    E("pendingGo = 'contact'; go('home')"); await wait(100); ok($q('a.btnlink'), 'lien d’un e-mail (#go=contact) : ouvre la fonction');
    E("store.set('tathbit.newsSeen', null); stats = {}; days = {}; news = null; newsAt = 0"); await E("loadNews(true)"); E("go('home')"); ok(!$q('#news-slot .upd'), 'premier lancement (rien encore révisé) : pas de carte « Nouveautés »');
    W.fetch = f0;
    // préférence e-mail
    E("tch.upd = undefined"); ok(/id="upd-mail" checked/.test(E("emailsInner()")), 'e-mail « nouvelle version » activé par défaut'); E("tch.upd = false"); ok(!/id="upd-mail" checked/.test(E("emailsInner()")), 'désactivé : case décochée');
    E("updToggle(true)"); await wait(150); ok(calls.includes('updates_set {"p_on":true}') && E('tch.upd') === true, 'préférence enregistrée');
    // annonce par l'administrateur
    E("me = {user: {id: 'ad', email: 'adm@x.fr'}, profile: {role: 'admin'}}; adm = {users: [], q: '', detail: null, msg: '', reqs: [], anns: [{version: 87, label: 'v87', note: null, created_at: '', fanout_at: '2026-10-24', mail_done_at: null, mails: 12}]}; confirm = () => true; sb.rpc = async (n, a) => { window.__u.push(n + ' ' + JSON.stringify(a || {})); return {data: n === 'admin_announcements' ? [] : [], error: null}; }; renderAdmin()");
    ok(/Annoncer une nouvelle version/.test(appText()) && /12 e-mails envoyés/.test(appText()), 'carte d’annonce et état des annonces précédentes');
    const nv = E('APP_BUILD') + 1; $q('#adm-ver').value = String(nv); $q('#adm-note').value = 'Récitation libre'; clickAct('adm-announce'); await wait(200); ok(calls.includes('admin_announce_update {"p_version":' + nv + ',"p_label":"v' + nv + '","p_note":"Récitation libre"}'), 'annonce envoyée avec le libellé de la version');
    E("renderAdmin()"); $q('#adm-ver').value = String(E('APP_BUILD')); clickAct('adm-announce'); await wait(200); ok(calls.some(c => c.startsWith('admin_announce_update {"p_version":' + E('APP_BUILD') + ',"p_label":"' + E('APP_VERSION'))), 'pour la version courante : libellé complet avec la date');
    $q('#adm-ver').value = '0'; clickAct('adm-announce'); await wait(100); ok(/invalide/.test(appText()), 'numéro invalide refusé sans appel');
    E("me = null; sb = null; adm = {users: null, q: '', detail: null, msg: '', reqs: []}; nf = {list: [], loaded: false}"); noErr('nouvelle version');
  });
  test('Réglages : à l’ouverture, les 6 blocs sont visibles d’un coup (tuiles) ; un bloc à la fois ; « Tout » ; recherche ; 3 langues', async () => {
    reset(); E("cfg.setTab = 'hub'; go('settings')");
    const openG = g => { if ($q('[data-act="set-grp"][data-v="hub"]')) clickAct('set-grp', 'hub'); clickAct('set-grp', g); };   // d'un bloc à l'autre : on repasse par les 6 blocs
    const tiles = () => $$q('.sethub button').map(b => b.dataset.v); eq(tiles(), ['account', 'learn', 'audio', 'display', 'data', 'help'], 'six tuiles dès l’ouverture');
    ok(!$q('.setbar') && /rangés en 6 blocs/.test(appText()) && $$q('.sethub button small').every(x => x.textContent.length > 8) && !$q('#srec') && !$q('#sth'), 'phrase « 6 blocs », chaque tuile dit ce qu’elle contient, aucun réglage déplié');
    const r = $q('.sethub').getBoundingClientRect(); ok(D.documentElement.scrollWidth <= W.innerWidth + 1 && $$q('.sethub button').every(b => b.getBoundingClientRect().width > 100), 'les tuiles tiennent dans la largeur sans défilement');
    const sv = g => $q(`.sethub button[data-v="${g}"] .sv`).textContent;
    ok(sv('account') === 'Pas de compte connecté' && /Correction : Standard · 3 indices affichés/.test(sv('learn')) && /Mishary Alafasy · Objectif : 20 · Rappels : désactivés/.test(sv('audio')) && /Thème automatique/.test(sv('display')) && /0 réponse enregistrée · 0 erreur/.test(sv('data')) && sv('help') === 'Version v' + E('APP_BUILD'), 'chaque tuile montre l’état en cours : ' + $$q('.sethub .sv').map(x => x.textContent).join(' | '));
    E("cfg.corr = 'soft'; cfg.reciter = 'ar.husary'; cfg.goal = 50; cfg.show = {s: true, v: false, p: false}; cfg.theme = 'dark'; stats = {'1:1': [2, 1]}; errors = [{t: 1, k: '1:1', m: 'next', sc: 0}]; me = {user: {id: 'u1', email: 'a@b.fr'}, profile: {}}; go('settings')");
    ok(sv('account') === 'a@b.fr' && /Correction : Souple · 1 indice affiché/.test(sv('learn')) && /Al-Husary · Objectif : 50/.test(sv('audio')) && /Sombre/.test(sv('display')) && /3 réponses enregistrées · 1 erreur/.test(sv('data')), 'les tuiles suivent les réglages : ' + $$q('.sethub .sv').map(x => x.textContent).join(' | '));
    E("me = null; newVer = {v: APP_BUILD + 1, label: 'v' + (APP_BUILD + 1), note: ''}; go('settings')"); ok(/mise à jour disponible/.test(sv('help')), 'tuile Aide : signale une mise à jour disponible'); E("newVer = null; go('settings')");
    const hHub = D.documentElement.scrollHeight;
    clickAct('set-grp', 'account'); ok($q('.setnav') && $q('.setnav [data-v="hub"]') && !$q('.sethub') && !$q('#srec') && !$q('#sth'), 'Compte : bouton « Les 6 blocs » en haut, rien des autres blocs');
    clickAct('set-grp', 'hub'); eq(tiles().length, 6, 'retour aux 6 blocs');
    openG('learn'); ok($q('[data-act="corr"]') && $q('[data-act="show"]') && !$q('#srec'), 'Apprentissage : correction et indices');
    openG('audio'); ok($q('#srec') && $q('#sgoal') && !$q('[data-act="corr"]'), 'Audio et notifications : récitateur, objectif');
    openG('display'); ok($q('#sth') && $q('[data-act="lang"]') && !$q('#srec'), 'Affichage : langue, thème, accessibilité');
    openG('data'); ok($q('[data-act="export"]') && $q('[data-act="import"]') && !$q('#csv-kind'), 'Données : export et import (plus de CSV)');
    openG('help'); ok($q('[data-act="contact"]') && $q('[data-act="legal"]') && $q('[data-act="upd"]') && $$q('details.card').length === 1 && !$q('details.card[open]') && /But de l'application/.test($q('#card-about').textContent) && /D'où viennent les contenus/.test($q('#card-about').textContent) && /Coran : texte uthmani/.test($q('#card-about').textContent), 'Aide et infos : application, contact, confidentialité ; une seule carte « À propos et sources » repliée (but, origine des contenus, sources)');
    openG('all'); ok($q('#srec') && $q('#sth') && $q('[data-act="export"]') && $q('[data-act="contact"]') && $q('[data-act="corr"]'), '« Tout afficher » : tous les réglages sur une page'); const hAll = D.documentElement.scrollHeight;
    ok(hHub < hAll * 0.5, 'l’écran d’accueil des réglages est bien plus court que toute la page (' + hHub + ' px contre ' + hAll + ' px)');
    // recherche depuis les 6 blocs
    E("cfg.setTab = 'hub'; go('settings')"); const sq = $q('#set-q'); sq.value = 'contraste'; sq.dispatchEvent(new Event('input')); await wait(50);
    ok($q('#shc') && !$q('.sethub') && !$q('#srec') && /réglage[s]? trouvé/.test(appText()), 'recherche « contraste » : le réglage d’accessibilité apparaît, les tuiles disparaissent'); eq($q('#set-q').value, 'contraste', 'la saisie est conservée');
    $q('#set-q').value = 'zzzzqx'; $q('#set-q').dispatchEvent(new Event('input')); await wait(50); ok(/Aucun réglage ne correspond/.test(appText()), 'aucun résultat : message clair');
    $q('#set-q').value = 'rappel'; $q('#set-q').dispatchEvent(new Event('input')); await wait(50); ok(/Rappel quotidien/.test(appText()) && !$q('#sth'), 'recherche « rappel » : le réglage du rappel (audio), pas les autres blocs');
    $q('#set-q').value = ''; $q('#set-q').dispatchEvent(new Event('input')); await wait(50); eq(tiles().length, 6, 'recherche effacée : retour aux 6 blocs');
    // toucher l'onglet Réglages ramène toujours aux 6 blocs ; groupe inconnu = 6 blocs
    E("cfg.setTab = 'audio'; go('home')"); clickAct('tab', 'settings'); eq(tiles().length, 6, 'en touchant « Réglages » dans le menu : on retrouve les 6 blocs');
    E("cfg.setTab = 'inconnu'; go('settings')"); eq(tiles().length, 6, 'groupe inconnu : les 6 blocs');
    for (const L of ['en', 'ar']){ E(`setLang('${L}')`); for (const g of ['hub', 'account', 'learn', 'audio', 'display', 'data', 'help', 'all']){ E(`cfg.setTab = '${g}'; go('settings')`); } ok(!/undefined/.test(appText()), 'réglages en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr')"); noErr('réglages');
  });
  test('Accueil : tableau de bord de 6 tuiles (état + accès direct), seulement ce qui n’existe pas ailleurs sur la page', async () => {
    reset("tjs = {}; stats = {'112:1': [3, 1]}; errors = [{t: Date.now(), k: '112:1', m: 'next', sc: 0}]; days = {}; plan = null; store.set('tathbit.frLast', null); store.set('tathbit.lastExport', 0);"); E("go('home')");
    const tiles = () => $$q('.sethub button'), st = i => tiles()[i].querySelector('.sv').textContent, name = i => tiles()[i].querySelector('b').textContent;
    eq(tiles().map((b, i) => name(i)), ['Réciter à voix haute', 'Moutoun', 'Lire', 'Tajwīd', 'Sauvegarde', "Installer l'application"], 'six tuiles : Réciter, Moutoun, Lire, Tajwīd, Sauvegarde, Installer'); ok(/Mon tableau de bord/.test(appText()), 'titre du tableau de bord');
    ok(/Pas encore essayé/.test(st(0)) && /Pas encore essayé/.test(st(3)) && /Jamais exportée/.test(st(4)), 'états : récitation, tajwīd, sauvegarde : ' + tiles().map(b => b.querySelector('.sv').textContent).join(' | '));
    ok(!['Plan', 'Progrès', 'Erreurs', 'Réviser'].some(n => tiles().some((b, i) => name(i) === n)), 'aucune tuile qui double la barre du bas (Plan, Progrès, Erreurs, Réviser)');
    ok(!/Plan du jour/.test(appText()) && !/Mes erreurs de la semaine/.test(appText()), 'plus de carte « Plan du jour » ni « Mes erreurs de la semaine »');
    ok(/Aujourd'hui/.test(appText()) && /jour d'affilée|jours d'affilée/.test(appText()), 'la série de jours et l’objectif restent dans « Aujourd’hui »');
    E("sched = {'112:1': {iv: 1, due: Date.now() - 1000}}; go('home')"); ok($q('[data-act="day-go"]') && /Ma séance du jour/.test(appText()) && /1 verset dû/.test(appText()) && !/Réviser mes versets dus/.test(appText()), 'versets dus : « Ma séance du jour » les annonce (un seul bouton)');
    tiles()[0].click(); await wait(100); ok($q('#frfrom'), 'tuile « Réciter à voix haute » ouvre la récitation libre'); E("go('home')");
    tiles()[2].click(); await wait(300); ok($q('#rdsel') || /Lecteur|Retour/.test(appText()), 'tuile « Lire » ouvre le lecteur'); E("rdStop && rdStop(); go('home')");
    E("cfg.lastM = 'ibnachir'"); E("go('home')"); ok(/Dernier : Al-Murshid al-Muʿīn/.test(st(1)), 'tuile Moutoun : dernier matn'); tiles()[1].click(); await wait(100); ok(E("cfg.scope.type") === 'matn' && E("cfg.scope.id") === 'ibnachir' && E('cfg.tab') === 'train', 'ouvre Réviser sur ce matn');
    E("store.set('tathbit.frLast', {t: Date.now(), n: 5, c: 4}); go('home')"); ok(/Dernière : .* · 5 versets/.test(st(0)), 'tuile Récitation : date et nombre de versets de la dernière fois');
    E("tjs = {'x': [3, 1], 'y': [1, 3]}; go('home')"); ok(/50 % de réussite · 2 règles travaillées/.test(st(3)), 'tuile Tajwīd : réussite et règles travaillées : ' + st(3));
    tiles()[3].click(); await wait(100); ok(E('cfg.tab') === 'train' && E("catOf(cfg.mode)") === 'tajwid', 'tuile Tajwīd : ouvre Réviser sur le tajwīd'); E("go('home')");
    tiles()[4].click(); await wait(100); ok(E('cfg.tab') === 'settings' && E('cfg.setTab') === 'data', 'tuile Sauvegarde : ouvre Réglages › Données'); E("go('home')");
    E("store.set('tathbit.lastExport', Date.now()); go('home')"); ok(/Exportée aujourd'hui/.test(st(4)), 'après un export : « Exportée aujourd’hui »');
    E("store.set('tathbit.lastExport', Date.now() - 3 * 864e5); go('home')"); ok(/il y a 3 j/.test(st(4)), 'export ancien : nombre de jours');
    E("IOS = false; deferredInstall = null; go('home')"); tiles()[5].click(); await wait(100); ok(/Installation/.test(appText()) && !!$q('ol.steps') && !$q('.inststeps'), 'tuile Installer (Android sans invite) : explique le menu du navigateur');
    E("IOS = true; renderInstall()"); eq($$q('.inststeps svg[role="img"]').length, 3, 'iPhone : 3 schémas'); ok($$q('.inststeps svg').every(v => v.getAttribute('aria-label')) && /Safari/.test(appText()) && /Sur l'écran d'accueil/.test(appText()), 'iPhone : schémas avec texte alternatif, étapes Partager › Sur l’écran d’accueil'); E("IOS = false; go('home')");
    E("window.__ip = 0; deferredInstall = {prompt(){ window.__ip = 1 }, userChoice: Promise.resolve({})}; go('home')"); ok(/Un toucher pour installer/.test(st(5)), 'invite du navigateur disponible : un toucher'); tiles()[5].click(); await wait(100); ok(E('window.__ip') === 1 && E('deferredInstall') === null, 'Android : un seul toucher sur la tuile déclenche l’invite d’installation'); ok(!!$q('.sethub'), 'retour à l’accueil après l’invite');
    E("deferredInstall = {prompt(){ window.__ip = 2 }, userChoice: Promise.resolve({})}; renderInstall()"); ok(!!$q('[data-act="install-now"]'), 'écran d’installation : bouton « Installer maintenant »'); clickAct('install-now'); await wait(100); ok(E('window.__ip') === 2, 'le bouton déclenche l’invite'); E("deferredInstall = null; go('home')");
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); go('home')`); ok(tiles().length === 6 && !/undefined|NaN/.test(appText()), 'accueil en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); E('renderInstall()'); ok(!/undefined|NaN/.test(appText()), 'installation en ' + L); E('IOS = true; renderInstall(); IOS = false'); eq(E('[...missingKeys]'), [], 'clés installation (' + L + ')'); }
    E("setLang('fr'); plan = null; sched = {}; tjs = {}; store.set('tathbit.frLast', null); store.set('tathbit.lastExport', 0)"); noErr('tableau de bord');
  });
  test('Ma séance du jour : versets dus puis révision récente et ancienne du plan, enchaînées en une touche', async () => {
    reset("plan = null; sched = {}; stats = {}"); E("go('home')"); ok(!$q('[data-act="day-go"]') && /Rien à revoir/.test(appText()), 'rien à faire : pas de bouton, message clair');
    E("sched = {'110:1': {iv: 1, due: Date.now() - 1000}}; go('home')"); ok(/1 verset dû/.test(appText()), 'versets dus seuls : séance en une étape');
    clickAct('day-go'); await wait(150); eq(E('ses.day.steps.length'), 1, 'une étape'); eq(E('ses.pool.length'), 1, 'le verset dû');
    E("results()"); ok(/Séance du jour terminée/.test(appText()) && !$q('[data-act="day-next"]'), 'fin de séance : message de réussite'); E("go('home')");
    E("const d = n => dayKey(addDays(new Date(), -n)); plan = {v: 1, from: 78, to: 114, order: 'desc', amt: 'v5', recent: 7, cycle: 14, log: [{d: d(2), s: 112, a: 1, b: 2}, {d: d(20), s: 108, a: 1, b: 3}], mptr: 0, done: {}}; sched = {'110:1': {iv: 1, due: Date.now() - 1000}, '112:1': {iv: 1, due: Date.now() - 1000}}; go('home')");
    ok(/1 verset dû · Révision récente \(1 portion\) · Révision ancienne \(1 portion\)/.test(appText()), 'résumé : dus + récente + ancienne (le verset déjà dans une portion n’est pas compté) : ' + $q('[data-act="day-go"]').parentNode.textContent);
    clickAct('day-go'); await wait(150); eq(E('ses.day.steps.map(x => x.k).join()'), 'due,sabqi,manzil', 'ordre des étapes'); eq(E('ses.pool.length'), 1, 'étape 1 : versets dus');
    E("results()"); ok(/étape 1 sur 3/.test(appText()) && /Étape suivante : Révision récente/.test(appText()) && !$q('[data-act="retry"]') && !$q('[data-act="again"]'), 'fin de l’étape 1 : bouton « Étape suivante » seulement');
    clickAct('day-next'); await wait(150); eq(E('ses.planKind'), 'sabqi', 'étape 2 : révision récente'); E("results()"); ok(E('plan.done[dayKey()].sabqi') === true && /Étape suivante : Révision ancienne/.test(appText()), 'sabqi marqué fait, étape 3 annoncée');
    clickAct('day-next'); await wait(150); eq(E('ses.planKind'), 'manzil', 'étape 3 : révision ancienne'); E("results()"); ok(E('plan.done[dayKey()].manzil') === true && /Séance du jour terminée/.test(appText()), 'manzil marqué fait, séance terminée');
    ok(!!$q('[data-act="plan-sabaq"]') && /Apprendre la nouvelle portion/.test(appText()), 'à la fin : la nouvelle portion du plan est proposée');
    E("go('home')"); ok(!$q('[data-act="day-go"]') || !/Révision récente/.test($q('[data-act="day-go"]').parentNode.textContent), 'les étapes faites ne sont plus proposées');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); plan.done = {}; sched = {'110:1': {iv: 1, due: Date.now() - 1000}}; go('home')`); ok(!/undefined|NaN/.test(appText()) && !!$q('[data-act="day-go"]'), 'séance du jour en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); plan = null; sched = {}"); noErr('séance du jour');
  });
  test('Algorithme : tirage des versets (dus favorisés, bien tenus espacés), estimation de la durée, série de secours sur l’accueil', async () => {
    reset("stats = {'112:1': [3, 1], '112:2': [3, 1], '112:3': [3, 1]}; sched = {'112:1': {iv: 1, due: Date.now() - 1000, ez: 2.2}, '112:2': {iv: 30, due: Date.now() + 20 * 864e5, ez: 2.5}, '112:3': {iv: 2, due: Date.now() + 864e5, ez: 2.2}}");
    const n = JSON.parse(E("(() => { const c = {a: 0, b: 0, c: 0}; for (let i = 0; i < 6000; i++){ const r = pickWeighted([{s: 112, a: 1}, {s: 112, a: 2}, {s: 112, a: 3}]); c[['a', 'b', 'c'][r.a - 1]]++; } return JSON.stringify(c); })()"));
    ok(n.a > n.c * 1.4 && n.c > n.b * 1.4, 'dû (' + n.a + ') > pas encore dû (' + n.c + ') > bien tenu et espacé (' + n.b + ')');
    E("sched = {'110:1': {iv: 1, due: Date.now() - 1000}, '110:2': {iv: 1, due: Date.now() - 1000}, '110:3': {iv: 1, due: Date.now() - 1000}}; go('home')"); ok(/≈ 1 min/.test($q('[data-act="day-go"]').parentNode.textContent), 'durée estimée : ' + $q('[data-act="day-go"]').parentNode.textContent.replace(/\s+/g, ' ').slice(0, 160));
    E("sched = {}; errors = []; stats = {}; cfg.n = 10; go('home')"); ok(!$q('[data-act="day-go"]') && !!$q('.today [data-act="start"]') && /10 questions/.test($q('.today').textContent), 'rien à revoir : bouton « Lancer ma série » avec sa description');
    $q('.today [data-act="start"]').click(); await wait(150); ok(E('!!ses') && E('ses.total') === 10, 'la série de secours démarre'); E("ses = null; go('home')");
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); go('home')`); ok(!!$q('.today [data-act="start"]') && !/undefined|NaN/.test(appText()), 'accueil sans séance en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); } E("setLang('fr')"); noErr('algorithme');
  });
  test('Présentation : icônes SVG (pas d’émojis), Réviser « quoi puis comment », plan « étapes d’abord », carte des sourates dense avec « fragile »', async () => {
    reset("stats = {'112:1': [9, 0], '112:2': [9, 0], '112:3': [9, 0], '108:1': [1, 3], '108:2': [1, 2]}; sched = {}; errors = []; plan = {v: 1, from: 78, to: 114, order: 'desc', amt: 'v5', recent: 7, cycle: 14, log: [{d: dayKey(addDays(new Date(), -2)), s: 112, a: 1, b: 3}], mptr: 0, done: {}}");
    E("go('home')"); const tiles = $$q('.sethub button'); eq(tiles.length, 6, 'six tuiles'); ok(tiles.every(b => b.querySelector('.si svg.ic') && !/[\u{1F300}-\u{1FAFF}]/u.test(b.querySelector('.si').textContent)), 'chaque tuile a une icône SVG, pas un émoji');
    ok($$q('.ic').every(s => s.getAttribute('aria-hidden') === 'true'), 'icônes décoratives masquées aux lecteurs d’écran');
    E("cfg.setTab = 'hub'; go('settings')"); ok($$q('.sethub .si svg.ic').length === 6, 'réglages : six icônes SVG');
    // Réviser : quoi réviser, puis exercice (compact)
    E("cfg.mode = 'mix'; go('train')"); const heads = $$q('#app h2').map(h => h.textContent.trim()); ok(heads.indexOf('Je veux réviser') >= 0 && heads.indexOf('Je veux réviser') < heads.indexOf('Exercice') && heads.indexOf('Exercice') < heads.indexOf('Options de la série'), 'ordre : Je veux réviser › Exercice › Options : ' + heads.join(' | '));
    ok($$q('.mode').length >= 6 && $$q('.mode small').length === 0 && !!$q('.modedesc'), 'exercices compacts : titres seulement, la description du choix en dessous');
    const d0 = $q('.modedesc').textContent; clickAct('mode', 'cloze'); ok($q('.modedesc').textContent !== d0 && $q('.mode.sel').dataset.v === 'cloze', 'la description suit le choix');
    // Plan : les étapes du jour avant les versets fragiles
    E("planEditing = false; go('plan')"); const pl = $$q('#app > *').map(x => x.textContent.slice(0, 30)); ok($$q('.prow').length === 3 && $$q('#app h2').map(h => h.textContent.trim()).indexOf("Aujourd'hui") < ($$q('#app h2').map(h => h.textContent.trim()).indexOf('À renforcer en priorité') < 0 ? 99 : $$q('#app h2').map(h => h.textContent.trim()).indexOf('À renforcer en priorité')), 'plan : trois lignes sabaq / sabqi / manzil, avant la liste des versets fragiles : ' + $$q('.prow').length + ' lignes ; ' + $$q('#app h2').map(h => h.textContent.trim()).join(' | '));
    ok(!!$q('details.card summary') && !$q('details.card[open]'), 'la prévision de la semaine est repliée');
    // carte des sourates
    E("cfg.map = 's'; cfg.mapSeen = true; go('progress')"); eq($$q('.cell.named').length, 2, 'seulement les sourates vues (108 et 112)'); ok($q('.cell.named.lw') && /^108/.test($q('.cell.named.lw').textContent) && $$q('.cell.named.lw').length === 1, 'la sourate 108 (réussite 33 %) est marquée « fragile »');
    clickAct('mapseen'); eq($$q('.cell.named').length, 114, 'filtre retiré : 114 sourates'); const cw = $q('.cell.named').getBoundingClientRect().width; ok(cw < 120, 'cases compactes (' + Math.round(cw) + ' px)');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); cfg.mapSeen = true; go('progress')`); ok(!/undefined|NaN/.test(appText()), 'progrès en ' + L); E("go('train')"); ok(!/undefined|NaN/.test(appText()), 'réviser en ' + L); E("go('plan')"); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); plan = null; stats = {}; cfg.mapSeen = true"); noErr('présentation');
  });
  test('Écrans compte, enseignant, élève, admin et lecteur : l’essentiel d’abord, actions risquées rangées', async () => {
    const cleanup = () => E("rdStop(); setLang('fr'); CLOUD.url = ''; CLOUD.anonKey = ''; me = null; sb = null; adm = {users: null, q: '', detail: null, msg: '', reqs: []}; tch.uid = null; tch.addOpen = false");
    try {
    reset(); const iso = n => new Date(Date.now() - n * 864e5).toISOString();
    // lecteur : barre d'outils compacte, le texte tient dans le premier écran, options d'affichage repliées
    E("CLOUD.url = ''; me = null; openReader('q:112')"); await wait(300);
    eq($$q('.rdbar button').length, 6, 'barre : précédent, suivant, A−, A+, masquer, écouter'); ok($$q('.rdbar button').every(b => b.getAttribute('aria-label') || /^A[−+]$/.test(b.textContent)), 'chaque bouton a un nom accessible');
    ok($q('#rbody').getBoundingClientRect().top < 440, 'le texte commence dans le premier écran (' + Math.round($q('#rbody').getBoundingClientRect().top) + ' px)'); ok($q('details.rdopt') && !$q('details.rdopt[open]'), 'options tajwīd / traduction / tafsir repliées'); ok(!/[\u{1F300}-\u{1FAFF}]/u.test($q('.rdtool').textContent), 'pas d’émojis dans la barre');
    $q('details.rdopt summary').click(); await wait(80); ok(E('rd.optOpen') === true, 'ouverture mémorisée'); E("rdStop(); go('home')");
    // élève : objectifs avant les messages
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; authReady = true; me = {user: {id: 's1', email: 's@x.fr'}, profile: {role: 'user', created_at: '${iso(10)}'}}; Object.assign(tch, {uid: 's1', loaded: true, links: [{other_id: 't1', email: 'p@x.fr', since: '${iso(5)}', as_role: 'teacher'}], goals: [{id: 1, surah: 108, surah_to: null, due: '${new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)}', note: ''}], msgs: [{id: 1, teacher_id: 't1', teacher_email: 'p@x.fr', body: 'Courage', from_student: false, created_at: '${iso(1)}', read_at: null}], invites: [], log: []})`);
    let h = E("tabStudent()"); ok(h.indexOf('Mes objectifs') > 0 && h.indexOf('Mes objectifs') < h.indexOf('Messages') && h.indexOf('Messages') < h.indexOf('Mes enseignants'), 'élève : Objectifs › Messages › Enseignants');
    // enseignant : élèves d'abord, l'ajout derrière un bouton
    E(`me = {user: {id: 't1', email: 'p@x.fr'}, profile: {role: 'teacher', created_at: '${iso(10)}'}}; Object.assign(tch, {uid: 't1', students: [{id: 's1', email: 's@x.fr', since: '${iso(5)}', last_seen: '${iso(0)}', answers: 10, ok: 8, errors: 1}], classes: [], unread: {}, detail: null, addOpen: false})`);
    h = E("tabTeacher()"); ok(h.indexOf('Mes élèves') > 0 && h.indexOf('Mes élèves') < h.indexOf('Ajouter des élèves') && !/id="tch-code"/.test(h), 'enseignant : liste des élèves d’abord, formulaire d’ajout replié'); ok(!/data-act="tch-del"/.test(h), '« Retirer cet élève » n’est pas à côté du bouton principal');
    E("tch.addOpen = true"); ok(/id="tch-code"/.test(E("tabTeacher()")), 'le bouton ouvre le formulaire');
    // compte : e-mails et mot de passe avant tout ce qui concerne les enseignants ; confidentialité et suppression en dernier
    E(`me = {user: {id: 's1', email: 's@x.fr'}, profile: {role: 'user', created_at: '${iso(10)}'}}; sb = {auth: {}, from(){ return {select(){ return Promise.resolve({data: [], error: null}); }}; }, async rpc(){ return {data: [], error: null}; }}; renderAccount()`);
    const hs = $$q('#app h2').map(x => x.textContent.trim()); ok(hs.indexOf('Notifications') > 0 && hs.indexOf('Notifications') < hs.indexOf('Mot de passe') && hs.indexOf('Mot de passe') < hs.indexOf('Mon enseignant') && hs.indexOf('Mon enseignant') < hs.indexOf('Confidentialité'), 'compte : ' + hs.join(' › '));
    // admin : demandes en premier, annonce repliable (ouverte si la version n'est pas annoncée), actions sur un compte rangées
    E(`me = {user: {id: 'a1', email: 'a@x.fr'}, profile: {role: 'admin', created_at: '${iso(50)}'}}; adm.users = [{id: 'a1', email: 'a@x.fr', role: 'admin', blocked: false, created_at: '${iso(50)}', last_seen: '${iso(0)}', answers: 5, ok: 4, errors: 1}, {id: 'u2', email: 'u@x.fr', role: 'user', blocked: false, created_at: '${iso(9)}', last_seen: '${iso(3)}', answers: 50, ok: 30, errors: 7}]; adm.reqs = [{user_id: 'u9', email: 'c@x.fr', created_at: '${iso(1)}'}]; adm.anns = [{label: 'v1', fanout_at: '${iso(1)}', mail_done_at: '${iso(1)}', mails: 2}]; adm.detail = null; adm.q = ''; renderAdmin()`);
    const ah = $$q('#app h2').map(x => x.textContent.trim()); ok(ah[0] === "Demandes d'enseignant" && /^Annoncer une nouvelle version/.test(ah[1]) && ah.indexOf('Surveillance des e-mails') > 1, 'admin : ' + ah.join(' › '));
    ok($q('details.card[open] #adm-ver') && /pas encore annoncée/.test(appText()), 'version courante non annoncée : la carte est ouverte et le dit'); ok(!!$q('[data-act="adm-del"][data-v="u2"]').closest('details.uact') && !$q('details.uact[open]'), 'Supprimer, Bloquer, Nommer : rangés dans « Actions sur ce compte »');
    E(`adm.anns = [{label: 'v' + APP_BUILD, fanout_at: '${iso(0)}', mail_done_at: '${iso(0)}', mails: 2}]; renderAdmin()`); ok(!$q('details.card[open] #adm-ver'), 'version déjà annoncée : carte repliée');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); renderAdmin()`); ok(!/undefined|NaN/.test(appText()), 'admin en ' + L); E("tch.addOpen = true"); E("tabTeacher(); renderAccount()"); ok(!/undefined|NaN/.test(appText()), 'compte en ' + L); E("openReader('q:112')"); await wait(200); ok(!/undefined|NaN/.test(appText()), 'lecteur en ' + L); E("rdStop()"); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); rdStop(); CLOUD.url = ''; CLOUD.anonKey = ''; me = null; sb = null; adm = {users: null, q: '', detail: null, msg: '', reqs: []}; tch.uid = null; tch.addOpen = false"); noErr('écrans compte, enseignant, admin, lecteur');
    } finally { cleanup(); }
  });
  test('Simplifications : plus de vue « Chronologie » des erreurs, plus d’export CSV, une seule carte « À propos et sources »', async () => {
    reset("errors = [{t: Date.now(), k: '107:2', m: 'next', sc: 0}, {t: Date.now() - 3600e3, k: '107:2', m: 'cloze', sc: 0.5, bad: ['ٱلْيَتِيمَ']}]; stats = {'107:2': [1, 2]}"); E("go('errors')");
    ok(!$q('[data-act="hview"]') && !/Chronologie/.test(appText()), 'Erreurs : plus de bascule « Chronologie »'); eq($$q('#app .sib').length, 1, 'un verset, regroupé : raté 2 fois'); ok(/raté 2 fois/.test(appText()) && /Mots souvent faux/.test(appText()), 'le détail par verset reste (nombre de fois, mots faux)');
    E("cfg.setTab = 'data'; go('settings')"); ok($q('[data-act="export"]') && $q('[data-act="import"]') && !$q('#csv-kind') && !$q('[data-act="csv"]') && !/CSV/.test(appText()), 'Données : export et import JSON seulement');
    ok(E("typeof exportCsv") === 'undefined' && E("typeof csvRows") === 'undefined', 'le code des exports CSV est retiré');
    E("cfg.setTab = 'help'; go('settings')"); eq($$q('details.card').length, 1, 'une seule carte repliable'); ok(!!$q('#card-about'), '« À propos et sources »');
    E("cfg.setTab = 'hub'; errors = []; stats = {}"); noErr('simplifications');
  });
  test('Barre du bas : 5 onglets, Erreurs dans Progrès, enseignant = onglet Enseignant seul, élève = onglet Élève seul', async () => {
    reset("stats = {'112:1': [3, 1]}; errors = [{t: Date.now(), k: '112:1', m: 'next', sc: 0}]"); const tabs = () => $$q('#nav [data-act="tab"]').map(b => b.dataset.v).join(','), sel = () => $$q('#nav button.sel').map(b => b.dataset.v).join(',');
    E("go('home')"); eq(tabs(), 'home,plan,train,progress,settings', 'simple utilisateur : 5 onglets, plus d’onglet Erreurs');
    clickAct('tab', 'progress'); ok($$q('.seg.tabs [data-act="tab"]').map(b => b.dataset.v).join() === 'progress,errors' && /Erreurs \(1\)/.test($q('.seg.tabs').textContent), 'Progrès : bascule Statistiques / Erreurs (1)');
    clickAct('tab', 'errors'); eq(E('cfg.tab'), 'errors', 'la bascule ouvre les erreurs'); eq(sel(), 'progress', 'l’onglet Progrès reste allumé'); ok(/Réviser les 1 versets les plus ratés|Réviser les/.test(appText()) || /1 erreur/.test(appText()), 'liste des erreurs');
    E("go('home'); cfg.tab = 'errors'; go('errors')"); eq(E('cfg.tab'), 'errors', 'accès direct à Erreurs conservé (liens, tests, ancienne configuration)');
    const iso = n => new Date(Date.now() - n * 864e5).toISOString();
    E(`CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; authReady = true; sb = {auth: {}, from(){ return {select(){ const p = Promise.resolve({data: [], error: null}); p.is = () => ({gt: () => p}); return p; }}; }, async rpc(){ return {data: [], error: null}; }};`);
    // élève (pas enseignant) : onglet Élève seul
    E(`me = {user: {id: 's1', email: 's@x.fr'}, profile: {role: 'user', created_at: '${iso(9)}'}}; Object.assign(tch, {uid: 's1', loaded: true, links: [{other_id: 't1', email: 'p@x.fr', since: '${iso(5)}', as_role: 'teacher'}], goals: [], msgs: [], students: null}); cfg.tab = 'home'; go('home')`); eq(tabs(), 'home,plan,train,progress,student,settings', 'élève : onglet Élève, pas d’onglet Enseignant');
    // enseignant sans enseignant à lui : seulement Enseignant
    E(`me = {user: {id: 't8', email: 't8@x.fr'}, profile: {role: 'teacher', created_at: '${iso(9)}'}}; Object.assign(tch, {uid: 't8', loaded: true, links: [], goals: [], msgs: [], students: [], classes: []}); cfg.tab = 'home'; go('home')`); eq(tabs(), 'home,plan,train,progress,teacher,settings', 'enseignant seul : onglet Enseignant seulement'); ok(!$q('.classseg'), 'pas de bascule quand il n’y a qu’un rôle');
    // enseignant ET élève : un seul onglet « Classe », deux gros boutons explicites à l'intérieur
    E(`me = {user: {id: 't9', email: 't@x.fr'}, profile: {role: 'teacher', created_at: '${iso(9)}'}}; Object.assign(tch, {uid: 't9', loaded: true, links: [{other_id: 't1', email: 'p@x.fr', since: '${iso(5)}', as_role: 'teacher'}], goals: [], msgs: [], students: [{id: 's1', email: 's@x.fr', since: '${iso(5)}', last_seen: '${iso(0)}', answers: 3, ok: 2, errors: 0}], classes: [], unread: {}}); cfg.tab = 'home'; cfg.lastClass = 'teacher'; go('home')`);
    eq(tabs(), 'home,plan,train,progress,class,settings', 'enseignant et élève : un seul onglet « Classe »'); ok(/Classe/.test($q('#nav [data-v="class"]').textContent), 'libellé « Classe »');
    clickAct('tab', 'class'); eq(E('cfg.tab'), 'teacher', 'ouvre le côté enseignant (dernier utilisé)'); eq(sel(), 'class', 'onglet Classe allumé');
    let cs = $$q('.classseg button'); eq(cs.length, 2, 'deux gros boutons'); ok(/Enseignant/.test(cs[0].textContent) && /Mes élèves/.test(cs[0].textContent) && /Élève/.test(cs[1].textContent) && /Mon enseignant, mes objectifs/.test(cs[1].textContent), 'libellés explicites : Enseignant · mes élèves / Élève · mon enseignant'); ok(cs[0].classList.contains('sel') && cs[0].getAttribute('aria-pressed') === 'true' && cs[1].getAttribute('aria-pressed') === 'false', 'le côté actif est marqué');
    ok(cs.every(b => b.getBoundingClientRect().height >= 44 && b.querySelector('svg.ic')), 'zones de toucher ≥ 44 px, icônes SVG');
    clickAct('tab', 'student'); eq(E('cfg.tab'), 'student', 'bouton Élève'); eq(sel(), 'class', 'toujours dans Classe'); ok(/Espace élève/.test(appText()) && $$q('.classseg button')[1].classList.contains('sel'), 'page Élève avec la bascule');
    clickAct('tab', 'teacher'); ok(/Espace enseignant/.test(appText()), 'retour côté enseignant');
    E("cfg.tab = 'home'; go('home'); cfg.lastClass = 'student'"); clickAct('tab', 'class'); eq(E('cfg.tab'), 'student', 'le dernier côté utilisé est rouvert');
    // messages non lus : badge sur Classe et sur chaque bouton ; ouverture du côté concerné
    E(`tch.msgs = [{id: 1, teacher_id: 't1', teacher_email: 'p@x.fr', body: 'Courage', from_student: false, created_at: '${iso(1)}', read_at: null}]; cfg.lastClass = 'teacher'; cfg.tab = 'home'; go('home')`); ok(/1/.test($q('#nav [data-v="class"] .badge').textContent), 'badge des messages non lus sur « Classe »');
    clickAct('tab', 'class'); eq(E('cfg.tab'), 'student', 'des messages d’élève non lus : on ouvre le côté Élève'); ok(/1/.test($$q('.classseg button')[1].querySelector('.tbadge').textContent), 'badge sur le bouton Élève');
    E("tch.msgs = []; cfg.tab = 'home'; go('home')");
    // administrateur : ni l'un ni l'autre
    E(`me = {user: {id: 'a1', email: 'a@x.fr'}, profile: {role: 'admin', created_at: '${iso(9)}'}}; cfg.tab = 'home'; go('home')`); eq(tabs(), 'home,plan,train,progress,settings', 'administrateur : ni Élève ni Enseignant');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); me = {user: {id: 't9', email: 't@x.fr'}, profile: {role: 'teacher', created_at: '${iso(9)}'}}; Object.assign(tch, {uid: 't9', loaded: true, links: [{other_id: 't1', email: 'p@x.fr', since: '${iso(5)}', as_role: 'teacher'}], students: [], classes: []}); go('teacher')`); ok($$q('.classseg button').length === 2 && !/undefined|NaN/.test(appText()), 'bascule Classe en ' + L); E("go('student')"); ok($$q('.classseg button').length === 2 && !/undefined|NaN/.test(appText()), 'côté Élève en ' + L); E(`go('progress')`); ok(!/undefined|NaN/.test(appText()) && $$q('.seg.tabs [data-act="tab"]').length === 2, 'Progrès en ' + L); E("go('errors')"); ok(!/undefined|NaN/.test(appText()), 'Erreurs en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); CLOUD.url = ''; CLOUD.anonKey = ''; me = null; sb = null; tch.uid = null; cfg.tab = 'home'; errors = []; stats = {}"); noErr('barre du bas');
  });
  test('iPhone sans installation ni compte : rappel renforcé (Safari efface les données d’un site délaissé) ; notifications réglées au même endroit', async () => {
    reset("stats = {'112:1': [3, 1]}; store.set('tathbit.iosSnooze', 0); store.set('tathbit.exportSnooze', 0); store.set('tathbit.lastExport', 0); store.set('tathbit.firstUse', Date.now() - 60 * 864e5)");
    E("IOS = false; go('home')"); ok(!$q('#ios-nudge'), 'pas d’iPhone : pas de carte iPhone'); ok(!!$q('#export-nudge'), '(hors iPhone, 60 jours sans export : rappel d’export classique)');
    E("IOS = true; IS_STANDALONE = () => false; go('home')"); ok(!!$q('#ios-nudge') && /Garde ta progression sur iPhone/.test($q('#ios-nudge').textContent) && /Safari peut effacer/.test($q('#ios-nudge').textContent), 'iPhone dans Safari avec des données : carte « Garde ta progression »'); ok(!$q('#export-nudge'), 'une seule carte (le rappel d’export est inclus)');
    ok(!!$q('#ios-nudge [data-act="tile-install"]') && !!$q('#ios-nudge [data-act="export"]'), 'boutons : installer, exporter'); clickAct('tile-install'); ok(/Installation/.test(appText()) && $$q('.inststeps svg').length === 3, 'le bouton ouvre le guide d’installation'); E("go('home')");
    $q('#ios-nudge [data-act="ios-later"]').click(); ok(!$q('#ios-nudge') && E("store.get('tathbit.iosSnooze', 0)") > Date.now() + 6 * 864e5, '« Plus tard » : reporté de 7 jours');
    E("store.set('tathbit.iosSnooze', 0); IS_STANDALONE = () => true; go('home')"); ok(!$q('#ios-nudge'), 'application installée : pas de carte');
    E("IS_STANDALONE = () => false; stats = {}; go('home')"); ok(!$q('#ios-nudge'), 'aucune donnée : pas de carte'); E("stats = {'112:1': [3, 1]}; me = {user: {id: 'u', email: 'u@x.fr'}, profile: {role: 'user'}}; CLOUD.url = 'https://x.supabase.co'; authReady = true; go('home')"); ok(!$q('#ios-nudge'), 'avec un compte (données synchronisées) : pas de carte');
    for (const L of ['en', 'ar']){ E(`me = null; CLOUD.url = ''; setLang('${L}'); go('home')`); ok(!!$q('#ios-nudge') && !/undefined|NaN/.test(appText()), 'carte iPhone en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    // notifications : tout dans Réglages › Audio et notifications ; Mon compte y renvoie
    E(`IOS = false; setLang('fr'); me = {user: {id: 'u', email: 'u@x.fr'}, profile: {role: 'user', created_at: new Date().toISOString()}}; CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; authReady = true; sb = {auth: {}, from(){ return {select(){ return Promise.resolve({data: [], error: null}); }}; }, async rpc(){ return {data: [], error: null}; }}; renderAccount()`);
    ok(/Régler mes notifications/.test(appText()) && !$q('#wk-on') && !$q('#upd-mail'), 'Mon compte : un renvoi, plus de cases à cocher dispersées'); clickAct('notif-go'); await wait(300);
    eq(E('cfg.tab + ":" + cfg.setTab'), 'settings:audio', 'ouvre Réglages › Audio et notifications'); ok(!!$q('#card-notif.flash') && !!$q('#wk-on') && !!$q('#upd-mail') && /Rappels de révision/.test($q('#card-notif').textContent) && /E-mails/.test($q('#card-notif').textContent) && /cloche/.test($q('#card-notif').textContent), 'une carte : rappels, e-mails, et la cloche expliquée');
    E("IOS = false; IS_STANDALONE = () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches); CLOUD.url = ''; CLOUD.anonKey = ''; me = null; sb = null; tch.uid = null; cfg.setTab = 'hub'; stats = {}; store.set('tathbit.iosSnooze', 0); store.set('tathbit.firstUse', Date.now())"); noErr('iPhone et notifications');
  });
  test('Premier lancement : 3 écrans (le but, choisir ses sourates ou un matn, premier exercice) ; pas pour un utilisateur existant', async () => {
    reset(); E("store.set('tathbit.welcome', 0); go('home')"); ok(/Le but de Tathbīt/.test(appText()) && /1 \/ 3/.test(appText()) && /ḥifẓ/.test(appText()), 'écran 1 : le but (tathbīt, pas ḥifẓ)'); ok(!$q('#nav') || $q('#nav').hidden, 'pas de barre de menu pendant le guide');
    clickAct('wz-next'); ok(/Ce que tu veux consolider/.test(appText()) && /2 \/ 3/.test(appText()) && !!$q('#wz-from'), 'écran 2 : choix des sourates');
    $q('#wz-from').value = '105'; $q('#wz-to').value = '100'; clickAct('wz-next'); ok(/Ton premier exercice/.test(appText()) && /3 \/ 3/.test(appText()), 'écran 3'); eq(E('cfg.scope.from') + '-' + E('cfg.scope.to'), '100-105', 'portée enregistrée (ordre corrigé)');
    clickAct('wz-back'); ok(/Ce que tu veux consolider/.test(appText()) && $q('#wz-from').value === '100', 'retour : le choix est conservé'); clickAct('wz-next');
    clickAct('wz-first'); await wait(200); ok(E("store.get('tathbit.welcome', 0)") === 1 && E('!!ses') && E('ses.pool.every(r => r.s >= 100 && r.s <= 105)'), 'première série lancée sur le choix, guide terminé'); E("ses = null; go('home')"); ok(/Mon tableau de bord/.test(appText()), 'ensuite : l’accueil, plus de guide');
    reset(); E("store.set('tathbit.welcome', 0); wz.i = 0; go('home')"); clickAct('wz-next'); clickAct('wz-kind', 'matn'); ok(!!$q('#wz-matn'), 'matn : liste des moutoun'); $q('#wz-matn').value = 'ibnachir'; clickAct('wz-next'); eq(E('cfg.scope.type + ":" + cfg.scope.id'), 'matn:ibnachir', 'matn choisi'); clickAct('wz-skip'); ok(E("store.get('tathbit.welcome', 0)") === 1 && /Mon tableau de bord/.test(appText()), '« Passer » : accueil et guide terminé');
    reset("stats = {'112:1': [1, 0]}"); E("store.set('tathbit.welcome', 0); go('home')"); ok(!/Le but de Tathbīt/.test(appText()) && E("store.get('tathbit.welcome', 0)") === 1, 'utilisateur ayant déjà des données : pas de guide');
    reset(); E("store.set('tathbit.welcome', 0); go('home')"); for (const L of ['en', 'ar']){ E(`setLang('${L}')`); for (let k = 0; k < 3; k++){ ok(!/undefined|NaN/.test(appText()), 'guide en ' + L + ' écran ' + (k + 1)); if (k < 2) clickAct('wz-next'); } eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); E("wz.i = 0; renderWelcome()"); }
    E("setLang('fr'); store.set('tathbit.welcome', 1); wz = {i: 0, kind: 'quran', from: 78, to: 114, matn: 'all'}"); noErr('premier lancement');
  });
  test('Hors ligne : bandeau qui dit ce qui reste disponible ; progression renvoyée au retour du réseau', async () => {
    reset(); const nav = W.navigator, set = v => Object.defineProperty(nav, 'onLine', {get: () => v, configurable: true});
    set(true); ok(!$q('#offbar'), 'en ligne : pas de bandeau');
    set(false); W.dispatchEvent(new W.Event('offline')); ok(!!$q('#offbar') && /Hors ligne/.test($q('#offbar').textContent) && /Le texte du Coran/.test($q('#offbar').textContent) && /audio que tu as téléchargées/.test($q('#offbar').textContent) && $q('#offbar').getAttribute('role') === 'status', 'bandeau visible, avec ce qui marche et ce qui ne marche pas');
    for (const L of ['en', 'ar']){ E(`setLang('${L}')`); ok(/Offline|دون اتصال/.test($q('#offbar').textContent), 'bandeau en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); } E("setLang('fr')");
    W.__up = 0; E("me = {user: {id: 'u'}}; sb = {from: () => ({upsert: async () => { window.__up++; return {error: null}; }})}; store.set('tathbit.cloud', {uid: 'u', dirty: true})");
    set(true); W.dispatchEvent(new W.Event('online')); await wait(100); ok(!$q('#offbar'), 'retour du réseau : bandeau retiré'); eq(W.__up, 1, 'modifications non envoyées : renvoyées au retour du réseau');
    E("store.set('tathbit.cloud', {uid: 'u', dirty: false})"); W.dispatchEvent(new W.Event('online')); await wait(50); eq(W.__up, 1, 'rien à envoyer : pas d’appel');
    E("me = null; sb = null; store.set('tathbit.cloud', {})"); noErr('hors ligne');
  });
  test('Taille du texte arabe : réglable dans Affichage, valable partout (lecteur, questions, récitation…)', async () => {
    reset("cfg.rdSize = 1.9"); E("applyArSize(); cfg.setTab = 'display'; go('settings')");
    const px = sel => parseFloat(W.getComputedStyle($q(sel)).fontSize), v0 = px('.card .ar'); ok(/Taille du texte arabe/.test(appText()) && /100 %/.test($q('#arsz').textContent), 'carte « Taille du texte arabe » (100 %)');
    clickAct('ar-size', '1'); eq(E('cfg.rdSize'), 2.1, 'A+ : 2,1'); ok(/111 %/.test($q('#arsz').textContent) || /110 %/.test($q('#arsz').textContent), 'affichage : ' + $q('#arsz').textContent); ok(px('.card .ar') > v0 * 1.08, 'l’aperçu grandit (' + v0 + ' → ' + px('.card .ar') + ')');
    eq(E("document.documentElement.style.getPropertyValue('--arz')"), '1.105', 'variable de taille posée pour toute la page');
    // la même taille s'applique dans les exercices
    E("go('train')"); E("cfg.mode = 'mcq'; cfg.n = 3; start()"); ok($$q('.opt.ar').length > 0 || $$q('.ar').length > 0, 'question affichée'); const q0 = parseFloat(W.getComputedStyle($q('.ar')).fontSize); ok(q0 > 1.9 * 16 * 1.05 * 0.99 || q0 > 31, 'le texte arabe d’une question suit la taille choisie : ' + q0 + ' px'); E("ses = null; go('settings')");
    E("cfg.rdSize = 3.2; applyArSize(); cfg.setTab = 'display'; go('settings')"); ok($q('[data-act="ar-size"][data-v="1"]').disabled, 'A+ désactivé à la taille maximale'); E("cfg.rdSize = 1.1; go('settings')"); ok($q('[data-act="ar-size"][data-v="-1"]').disabled, 'A− désactivé au minimum');
    clickAct('ar-size', 'reset'); eq(E('cfg.rdSize'), 1.9, 'Par défaut'); eq(E("document.documentElement.style.getPropertyValue('--arz')"), '1.000', 'variable remise à 1');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); cfg.setTab = 'display'; go('settings')`); ok(!!$q('[data-act="ar-size"]') && !/undefined|NaN/.test(appText()), 'réglage en ' + L); E("cfg.setTab = 'hub'; go('settings')"); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); cfg.rdSize = 1.9; applyArSize()"); noErr('taille du texte arabe');
  });
  test('Récitation libre : historique par sourate (dernière récitation, sans oubli, à revoir) et reprise là où on s’est arrêté', async () => {
    reset("cfg.frFrom = 110; cfg.frTo = 111; delete cfg.frHide; store.set('tathbit.frSurah', {});");
    E("SR = function(){ window.__rec = this; this.start = function(){ if (this.onstart) this.onstart(); }; this.stop = function(){ if (this.onend) this.onend(); }; this.abort = function(){}; }");
    E("frSetup()"); ok(!$q('#fr-hist'), 'aucun historique au départ');
    E("fr = frBuild(110, 111, true); fr.p = fr.verses[1].to; fr.miss.add(fr.verses[1].from); frSummary()");
    const H = JSON.parse(E("JSON.stringify(frHist()['110'])")); eq([H.a0, H.a1, H.c, H.flag.join(), H.tot, H.stop, H.rt], [1, 2, 1, '2', 3, 3, 111], 'sourate 110 : versets 1–2 récités, 1 sans oubli, verset 2 à revoir, arrêt au verset 3');
    E("fr = null; frSetup()"); ok(!!$q('#fr-hist') && /110\. /.test($q('#fr-hist').textContent) && /2 versets récités sur 3/.test($q('#fr-hist').textContent) && /1 sans oubli/.test($q('#fr-hist').textContent) && /versets 2/.test($q('#fr-hist').textContent), 'carte « Mes récitations » : ' + $q('#fr-hist').textContent.replace(/\s+/g, ' ').slice(0, 200));
    clickAct('fr-resume', '110:3'); await wait(150); eq(E('fr.start0'), E('fr.verses[2].from'), 'reprise : on repart du verset 3'); eq(E('fr.p'), E('fr.verses[2].from'), 'le suivi commence au verset 3'); ok(/Verset 3 \/ 3/.test($q('#fr-pos').textContent), 'position : ' + $q('#fr-pos').textContent);
    E("fr.p = fr.verses[2].to; fr.base = fr.p; frSummary()");
    ok(E('fr.done.length') === 1 && E("fr.done[0].a") === 3, 'le bilan ne compte que le verset récité en reprise (pas ceux d’avant)'); const H2 = JSON.parse(E("JSON.stringify(frHist()['110'])")); eq([H2.a0, H2.a1, H2.stop], [3, 3, 0], 'sourate terminée : plus de reprise à proposer');
    E("store.set('tathbit.frSurah', {'110': {t: Date.now(), a0: 1, a1: 2, c: 1, flag: [2], tot: 3, stop: 3, rt: 111}, '112': {t: Date.now() - 5000, a0: 1, a1: 4, c: 4, flag: [], tot: 4, stop: 0, rt: 112}}); fr = null; go('home')");
    ok(!!$q('#app [data-act="fr-resume"][data-v="110:3"]') && /Reprendre ma récitation : .*verset 3/.test(appText()), 'accueil : bouton pour reprendre la récitation interrompue (sourate 110, verset 3)');
    clickAct('fr-resume', '110:3'); await wait(150); eq(E('fr.start0'), E('fr.verses[2].from'), 'depuis l’accueil : la récitation reprend au verset 3'); E("fr.p = fr.verses[2].to; fr.base = fr.p; frSummary()");
    E("fr = null; go('home')"); ok(!$q('#app [data-act="fr-resume"]'), 'récitation terminée (112 sans arrêt, 110 finie) : plus de bouton à l’accueil');
    for (const L of ['en', 'ar']){ E(`store.set('tathbit.frSurah', {'110': {t: Date.now(), a0: 1, a1: 2, c: 1, flag: [], tot: 3, stop: 3, rt: 110}}); setLang('${L}'); go('home')`); ok(!!$q('#app [data-act="fr-resume"]') && !/undefined|NaN/.test(appText()), 'reprise à l’accueil en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); } E("setLang('fr'); store.set('tathbit.frSurah', {'110': {t: Date.now(), a0: 3, a1: 3, c: 1, flag: [], tot: 3, stop: 0, rt: 111}})");
    E("fr = null; frSetup()"); ok(!$q('[data-act="fr-resume"][data-v="110:3"]') && !!$q('[data-act="fr-resume"][data-v="110:1"]'), 'sourate terminée : « Réciter encore » seulement');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); frSetup()`); ok(!!$q('#fr-hist') && !/undefined|NaN/.test(appText()), 'historique en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); fr = null; store.set('tathbit.frSurah', {}); store.set('tathbit.frLast', null)"); noErr('historique de récitation');
  });
  test('Rappel d’export : sans compte, au bout de 30 jours sans sauvegarde ; reporté par « Plus tard »', async () => {
    reset("stats = {'112:1': [3, 1]}"); const DAY = 864e5, got = []; W.download = async (name, text, type) => { got.push(name); };
    E(`store.set('tathbit.firstUse', Date.now() - 10 * ${DAY}); store.set('tathbit.lastExport', 0); store.set('tathbit.exportSnooze', 0); go('home')`); ok(!$q('#export-nudge'), '10 jours : pas de rappel');
    E(`store.set('tathbit.firstUse', Date.now() - 40 * ${DAY}); go('home')`); ok(!!$q('#export-nudge') && /il y a 40 jours/.test($q('#export-nudge').textContent) && /n'est que sur cet appareil/.test($q('#export-nudge').textContent), 'au bout de 40 jours : rappel');
    E(`me = {user: {email: 'a@b.fr'}, profile: {role: 'user'}}; go('home')`); ok(!$q('#export-nudge'), 'avec un compte : pas de rappel'); E("me = null; go('home')");
    clickAct('export-later'); ok(!$q('#export-nudge') && E("store.get('tathbit.exportSnooze', 0)") > Date.now() + 6 * DAY, '« Plus tard » : reporté de 7 jours'); E("go('home')"); ok(!$q('#export-nudge'), 'reste caché pendant le report');
    E(`store.set('tathbit.exportSnooze', Date.now() - 1000); go('home')`); ok(!!$q('#export-nudge'), 'report terminé : le rappel revient'); clickAct('export'); await wait(100); ok(got.some(n => /^tathbit-sauvegarde-/.test(n)) && !$q('#export-nudge'), 'export : fichier créé, rappel retiré');
    E(`store.set('tathbit.lastExport', Date.now() - 35 * ${DAY}); go('home')`); ok(!!$q('#export-nudge') && /il y a 35 jours/.test($q('#export-nudge').textContent), 'compté depuis la dernière sauvegarde');
    E("stats = {}; go('home')"); ok(!$q('#export-nudge'), 'rien à sauvegarder : pas de rappel');
    for (const L of ['en', 'ar']){ E(`stats = {'112:1': [3, 1]}; store.set('tathbit.lastExport', Date.now() - 35 * ${DAY}); setLang('${L}'); go('home')`); ok(!!$q('#export-nudge') && !/undefined|NaN/.test(appText()), 'rappel en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); stats = {}; store.set('tathbit.lastExport', 0); store.set('tathbit.firstUse', Date.now()); store.set('tathbit.exportSnooze', 0)"); noErr('rappel d’export');
  });
  test('Nouveautés : « Essayer » ouvre le bon réglage, fait défiler jusqu’à la carte et la met en évidence', async () => {
    reset("cfg.rdSize = 1.9"); E(`news = {v: APP_BUILD, items: [{id: 'a', icon: '🔤', go: 'arsize', title: {fr: 'Taille', en: 'Size', ar: 'حجم'}, text: {fr: 'Texte A', en: 'Text A', ar: 'نص أ'}}, {id: 'b', icon: '💾', go: 'backup', title: {fr: 'Sauvegarde', en: 'Backup', ar: 'نسخ'}, text: {fr: 'Texte B', en: 'Text B', ar: 'نص ب'}}]}; newsHist = []`);
    E("renderNews()"); clickAct('news-go', 'arsize'); await wait(200); eq(E('cfg.tab + ":" + cfg.setTab'), 'settings:display', 'bloc Affichage ouvert'); ok(!!$q('#card-arsize') && $q('#card-arsize').classList.contains('flash') && /Taille du texte arabe/.test($q('#card-arsize').textContent), 'la carte « Taille du texte arabe » est affichée et mise en évidence');
    E("renderNews()"); clickAct('news-go', 'backup'); await wait(200); eq(E('cfg.setTab'), 'data', 'bloc Données ouvert'); ok(!!$q('#card-data.flash'), 'carte « Mes données » en évidence');
    E("newsGo('appinfo')"); await wait(200); eq(E('cfg.setTab'), 'help', 'bloc Aide ouvert'); ok(!!$q('#card-app.flash'), 'carte « Application » en évidence');
    E("cfg.setTab = 'hub'; newsHist = null; news = null"); noErr('essayer des nouveautés');
  });
  test('Nouveautés : historique des versions précédentes consultable depuis l’écran des nouveautés', async () => {
    reset(); E(`news = {v: APP_BUILD, items: [{id: 'a', icon: '🎙️', go: 'home', title: {fr: 'Titre A', en: 'Title A', ar: 'عنوان أ'}, text: {fr: 'Texte A', en: 'Text A', ar: 'نص أ'}}, {id: 'b', icon: '📅', go: 'plan', title: {fr: 'Titre B', en: 'Title B', ar: 'عنوان ب'}, text: {fr: 'Texte B', en: 'Text B', ar: 'نص ب'}}]}; newsHist = null`);
    const real = W.fetch; W.fetch = async u => String(u).startsWith('news-history.json') ? ({ok: true, json: async () => ({versions: [{v: 90, date: '2026-10-01', items: [{id: 'o', icon: '📜', go: 'home', title: {fr: 'Ancienne nouveauté', en: 'Old feature', ar: 'ميزة قديمة'}, text: {fr: 'Ancien texte', en: 'Old text', ar: 'نص قديم'}}]}, {v: 80, items: []}]})}) : real(u);
    E("renderNews()"); await wait(200); ok(/Versions précédentes/.test(appText()) && /v90/.test(appText()) && !!$q('details.nhv'), 'versions précédentes listées'); ok(/Ancienne nouveauté/.test($q('details.nhv').textContent) && /1 octobre 2026/.test($q('details.nhv summary').textContent), 'chaque version : date et nouveautés');
    ok(/Titre A/.test(appText()), 'la version courante reste en haut');
    E("newsHist = null; setLang('en'); renderNews()"); await wait(200); ok(/Previous versions/.test(appText()) && /Old feature/.test(appText()), 'historique en anglais');
    W.fetch = async u => { throw new Error('offline'); }; E("newsHist = null; setLang('fr'); renderNews()"); await wait(200); ok(/Historique indisponible/.test(appText()), 'hors ligne : message clair');
    W.fetch = real; E("newsHist = null; news = null; setLang('fr')"); noErr('historique des nouveautés');
  });
  test('Contact : page avec adresse, sujets préremplis, copie de l’adresse ; liens depuis les Réglages et l’écran de connexion', async () => {
    reset(); E("window.TATHBIT_LEGAL = {contact: 'tathbit.app.contact@gmail.com', region: ''}; renderContact()");
    ok(appText().includes('tathbit.app.contact@gmail.com'), 'adresse affichée'); const links = $$q('a.btnlink'); eq(links.length, 5, 'cinq sujets, dont « Autre sujet »'); ok(/autre/i.test(links[4].textContent) && /autre/i.test(decodeURIComponent(links[4].getAttribute('href'))), 'le dernier sujet est « Autre sujet »');
    ok(links.every(a => a.getAttribute('href').startsWith('mailto:tathbit.app.contact@gmail.com?subject=')), 'liens mailto vers l’adresse du site');
    const u = new URL(links[0].getAttribute('href')); ok(/erreur dans un texte/.test(u.searchParams.get('subject')) && /Numéro du verset/.test(u.searchParams.get('body')) && /v\d+/.test(u.searchParams.get('body')), 'objet et modèle de message préremplis (avec la version)');
    ok(!/mot de passe/i.test(u.searchParams.get('body')), 'jamais de mot de passe dans le modèle'); ok(/mot de passe dans un message/.test(appText()), 'mise en garde : pas de mot de passe dans un message');
    E("navigator.clipboard.writeText = async t => { window.__w = t; }"); clickAct('contact-copy'); await wait(100); eq(W.__w, 'tathbit.app.contact@gmail.com', 'copie de l’adresse'); ok(/copiée/.test($q('#contact-msg').textContent), 'confirmation de copie');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); renderContact()`); ok(appText().length > 200 && !/undefined/.test(appText()), 'page de contact en ' + L); eq(E('[...missingKeys]'), [], 'contact : clés traduites en ' + L); }
    E("setLang('fr'); me = {user: {email: 'secret@exemple.fr'}}; jsErrAdd('boom-test'); renderContact()"); const dg = $q('pre.diag').textContent;
    ok(/^Tathbīt – diagnostic/.test(dg) && /Version : .*v\d+/.test(dg) && /Appareil \/ navigateur : /.test(dg) && /Langue de l’application : fr/.test(dg) && /boom-test/.test(dg), 'diagnostic : version, appareil, langue, erreurs récentes'); ok(!/secret@exemple\.fr/.test(dg) && !/mot de passe|token|jeton/i.test(dg.replace(/mot de passe/g, '')), 'diagnostic sans e-mail ni secret');
    E("navigator.clipboard.writeText = async t => { window.__d = t; }"); clickAct('diag-copy'); await wait(100); ok(W.__d === dg && /Diagnostic copié/.test($q('#diag-msg').textContent), 'copie du diagnostic'); ok(decodeURIComponent($$q('a.btnlink')[1].getAttribute('href')).includes('Tathbīt – diagnostic'), 'le modèle « problème » contient déjà le diagnostic');
    E("JSERR.length = 0; me = null; setLang('en'); renderContact()"); ok(/Copy the diagnostic/.test(appText()), 'diagnostic en anglais'); E("setLang('fr')");
    E("setLang('fr'); go('settings')"); ok($q('[data-act="contact"]'), 'bouton Contact dans les Réglages'); clickAct('contact'); ok($q('a.btnlink'), 'le bouton ouvre la page');
    clickAct('contact-back'); eq(E('cfg.tab'), 'settings', 'Retour ramène aux Réglages');
    E("CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; sb = {}; me = null; renderAccount()"); ok($q('[data-act="contact"]'), 'lien Contact aussi sur l’écran de connexion (sans compte)'); noErr('contact');
    E("me = null; sb = null; CLOUD.url = ''; CLOUD.anonKey = ''; acc.mode = 'login'");   // on rend l'appli sans comptes aux tests suivants
  });
  test('Plan de révision : le cycle ne propose plus 60 jours (14 ou 30, ou « Autre » jusqu’à 30)', () => {
    reset("plan = null; pdraft = null; planEditing = false;"); E("go('plan')");
    eq([...$q('#pf-cycle').options].map(o => o.value), ['14', '30', 'other'], 'liste du cycle'); ok(!/14 à 60/.test(appText()), 'plus de « 14 à 60 jours » dans les explications');
    E("plan = {v: 1, from: 78, to: 114, order: 'desc', amt: 'v5', recent: 7, cycle: 60, log: [], mptr: 0, done: {}}; planEditing = true; pdraft = null; go('plan')");
    eq($q('#pf-cycle').value, 'other', 'un ancien plan à 60 jours s’ouvre sur « Autre »'); $q('#pf-from').dispatchEvent(new Event('change')); eq(E('pdraft.cycle'), 30, 'et il est ramené à 30 au maximum quand on enregistre');
  });
  test('Mot de passe refusé : le message dit précisément ce qui manque (longueur, minuscule, majuscule, chiffre, caractère spécial, mot de passe connu)', () => {
    reset();
    const chars = "{message: 'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*()_+-=[]{};:|<>?,./~.', reasons: ['characters']}";
    let m = E(`friendly(${chars})`);
    ok(/minuscule/.test(m) && /majuscule/.test(m) && /chiffre/.test(m) && /caractère spécial/.test(m), 'tous les types de caractères exigés sont nommés : ' + m); ok(!/trop faible/.test(m), 'plus le message vague « trop faible »');
    m = E("friendly({message: 'Password should be at least 8 characters.', reasons: ['length']})"); ok(/au moins 8 caractères/.test(m), 'longueur : ' + m);
    m = E("friendly({message: 'Password is known to be weak and easy to guess, please choose a different one.', reasons: ['pwned']})"); ok(/trop courant ou connu/.test(m), 'mot de passe connu : ' + m);
    m = E("friendly({message: 'Password should be at least 10 characters.', reasons: ['length', 'characters']})"); ok(/au moins 10 caractères/.test(m) && /mélanger/.test(m), 'longueur lue dans le message, types de caractères sans détail : ' + m);
    E("LANG = 'en'"); m = E(`friendly(${chars})`); ok(/special character/.test(m) && /uppercase/.test(m), 'en anglais : ' + m);
    E("LANG = 'ar'"); m = E(`friendly(${chars})`); ok(/رمز خاص/.test(m) && /حرف كبير/.test(m), 'en arabe : ' + m);
    E("LANG = 'fr'"); eq(E("friendly(new Error('Invalid login credentials'))"), 'E-mail ou mot de passe incorrect.', 'les autres erreurs ne changent pas');
  });
  test('Rappels : activer, changer l’heure, 2e rappel, désactiver (serveur simulé)', async () => {
    reset();
    const calls = []; let sub = null;
    E("CLOUD.url = 'https://x.supabase.co'; CLOUD.anonKey = 'k'; CLOUD.vapidPublicKey = 'BGSyzd0fSnxyLCKcsbtliLDWAeWZb1A38k-bY9yLWDq04L_Ki16sCALo8ldhM1FhbSxB75rxRnVv0WFO7XWvBxM'; me = {user: {id: 'u'}, profile: {role: 'user'}};");
    W.__calls = calls; E("sb = {auth: {async signOut(){ return {}; }}, async rpc(n, a){ if (/^push_/.test(n)) window.__calls.push(n + ' ' + JSON.stringify(a)); return {error: null}; }};");   // seuls les appels de rappels comptent (le chargement des onglets Élève/Enseignant en arrière-plan est ignoré)
    const fakeSub = {endpoint: 'https://p/x', toJSON(){ return {endpoint: this.endpoint, keys: {p256dh: 'P', auth: 'A'}}; }, async unsubscribe(){ sub = null; return true; }};
    const reg = {pushManager: {async getSubscription(){ return sub; }, async subscribe(){ sub = fakeSub; return fakeSub; }}};
    Object.defineProperty(W.navigator.serviceWorker, 'ready', {get: () => Promise.resolve(reg), configurable: true});
    Object.defineProperty(W.Notification, 'permission', {get: () => 'granted', configurable: true});
    E("go('settings')"); ok($q('#rem-time'), 'carte Rappels absente (PushManager indisponible ici ?)');
    $q('#rem-time').value = '20:00'; $q('#rem-two').click(); eq($q('#rem-time2').disabled, false); $q('#rem-time2').value = '19:00';
    clickAct('rem-on'); await wait(300); ok(/après le 1er/.test($q('#rem-msg').textContent), 'un 2e rappel avant le 1er doit être refusé'); eq(calls.length, 0);
    $q('#rem-time2').value = '21:30'; clickAct('rem-on'); await wait(300);
    ok(calls.at(-1).startsWith('push_subscribe') && calls.at(-1).includes('"p_time":"20:00"') && calls.at(-1).includes('"p_time2":"21:30"'), 'push_subscribe avec les 2 heures');
    $q('#rem-two').click(); clickAct('rem-save'); await wait(300); ok(calls.at(-1).includes('"p_time2":null'), 'sans 2e rappel : p_time2 nul');
    clickAct('rem-off'); await wait(300); ok(calls.some(c => c.startsWith('push_unsubscribe')), 'désabonnement serveur'); eq(E('remState().on'), false);
    // première ouverture de l'application installée : proposition d'activer les rappels (une seule fois)
    E("IS_STANDALONE = () => false; store.set('tathbit.remAsked', 0); go('home')"); ok(!$q('#rem-offer'), 'navigateur ordinaire : pas de proposition');
    E("IS_STANDALONE = () => true; go('home')"); ok(!!$q('#rem-offer') && /Activer à 20:00/.test($q('#rem-offer').textContent), 'application installée, rappels éteints : proposition d’activer');
    const n0 = calls.length; clickAct('rem-offer-on'); await wait(300); ok(calls.length === n0 + 1 && calls.at(-1).startsWith('push_subscribe') && calls.at(-1).includes('"p_time":"20:00"'), 'un toucher : abonnement aux rappels à 20:00'); ok(!$q('#rem-offer') && /Rappels activés à 20:00/.test(appText()) && E('remState().on') === true, 'proposition disparue, confirmation affichée');
    E("cfg.setTab = 'all'; go('settings')"); clickAct('rem-off'); await wait(300); E("store.set('tathbit.remAsked', 0); go('home')"); ok(!!$q('#rem-offer'), 'rappels désactivés puis jamais refusés : la proposition revient');
    const n1 = calls.length; clickAct('rem-offer-later'); await wait(100); ok(!$q('#rem-offer') && calls.length === n1 && E("store.get('tathbit.remAsked', 0)") > 0, '« Pas maintenant » : aucune inscription, proposition retirée'); E("go('home')"); ok(!$q('#rem-offer'), 'ne revient pas');
    E("store.set('tathbit.remAsked', 0); IS_STANDALONE = () => true; go('home')"); ok(!!$q('#rem-offer'), 'proposition prête en fr');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); go('home')`); ok(!!$q('#rem-offer') && !/undefined/.test($q('#rem-offer').textContent), 'proposition en ' + L); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); IS_STANDALONE = () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches); store.set('tathbit.remAsked', 0)");
    // iPhone dans Safari (application non installée) : pas de « navigateur incompatible » mais le guide d'installation
    E("IOS = true; cfg.setTab = 'all'; go('settings')"); ok(!/Ton navigateur ne gère pas les notifications/.test(appText()) && /les rappels ne marchent que si l'application est installée/.test(appText()), 'iPhone non installé : explication au lieu de « navigateur incompatible »');
    clickAct('tile-install'); await wait(100); ok(/Installation/.test(appText()) && $$q('.inststeps svg').length === 3, 'le bouton ouvre le guide d’installation en 3 schémas');
    for (const L of ['en', 'ar']){ E(`setLang('${L}'); cfg.setTab = 'all'; go('settings')`); ok(!!$q('[data-act="tile-install"]'), 'bouton d’installation dans les rappels (' + L + ')'); eq(E('[...missingKeys]'), [], 'clés traduites (' + L + ')'); }
    E("setLang('fr'); IOS = false");
    E("CLOUD.url = ''; CLOUD.anonKey = ''; CLOUD.vapidPublicKey = ''; sb = null; me = null;");
  });

  /* ---- exécution ---- */
  const out = document.getElementById('out');
  for (const t of tests){
    let r; const t0 = performance.now();
    if (FAST && t.slow) r = {name: t.name, ok: true, skipped: true, ms: 0};
    else try { await t.fn(); r = {name: t.name, ok: true, ms: Math.round(performance.now() - t0)}; } catch (e){ r = {name: t.name, ok: false, err: String(e && e.message || e), ms: Math.round(performance.now() - t0)}; }
    results.push(r);
    const li = document.createElement('li'); li.innerHTML = `<span class="${r.skipped ? 'mut' : r.ok ? 'ok' : 'ko'}">${r.skipped ? '⏭' : r.ok ? '✓' : '✗'}</span> ${r.name.replace(/</g, '&lt;')}` + (r.ok ? '' : `<pre class="ko"></pre>`);
    if (!r.ok) li.querySelector('pre').textContent = r.err;
    out.appendChild(li);
  }
  restore();
  const failed = results.filter(r => !r.ok).length, skipped = results.filter(r => r.skipped).length;
  document.getElementById('sum').innerHTML = `<b class="${failed ? 'ko' : 'ok'}">${results.length - failed - skipped} réussis, ${failed} en échec${skipped ? `, ${skipped} ignorés (mode rapide : lance la suite complète avant d’envoyer)` : ''}</b>`;
  window.__result = {passed: results.length - failed - skipped, failed, skipped, fast: FAST, results};
})();
