/* Tathbīt — Accessibilité et démarrage.
   Scripts classiques chargés dans l'ordre par index.html (même portée globale) : ne pas les réordonner. */
/* ---------- accessibilité : lie chaque étiquette à son champ, déclare la langue du texte arabe, annonce les retours ---------- */
function fixA11y(){
  $app.querySelectorAll('label:not([for])').forEach(l => { const c = l.closest('.card, div, form') || $app; const f = [...c.querySelectorAll('select, input:not([type=checkbox]):not([type=file]), textarea')].find(x => (l.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING) && !l.contains(x)); if (f && f.id && !l.querySelector('input,select')) l.setAttribute('for', f.id); });
  $app.querySelectorAll('.ar:not([lang]), .rd:not([lang]), .rv:not([lang])').forEach(e => e.setAttribute('lang', 'ar'));
  ['fb', 'aud-msg', 'rem-msg', 'acc-msg', 'cm-status', 'hmsg'].forEach(id => { const e = document.getElementById(id); if (e && !e.hasAttribute('aria-live')) e.setAttribute('aria-live', 'polite'); });
}
if (window.MutationObserver) new MutationObserver(() => { clearTimeout(fixA11y.t); fixA11y.t = setTimeout(fixA11y, 30); }).observe($app, {childList: true, subtree: true});

/* ---------- démarrage ---------- */
applyA11y(); applyTheme();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
(async function init(){
  MT = Object.fromEntries((window.MOUTOUN?.texts || []).map(t => [t.id, t]));
  custom.forEach(t => { MT[t.id] = t; });
  if (cloudOn()) loadSupabase().catch(() => {});   // téléchargée en même temps que le Coran, pas après
  try { await loadQuran(); dropBadRefs(); if (cloudOn()){ renderLoading(); await cloudInit(); } else home(); }
  catch (err){
    $app.innerHTML = `<h1>${tr('Chargement impossible')}</h1>
      <p class="sub">${tr('Une connexion internet est nécessaire au premier lancement ({e}).', {e: esc(err.message)})}</p>
      <button class="pri" onclick="location.reload()">${tr('Réessayer')}</button>`;
  }
})();
