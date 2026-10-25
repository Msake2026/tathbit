// Edge Function « send-reminders » : envoie les rappels de révision (notifications Web Push).
// Appelée toutes les 5 minutes par pg_cron (voir supabase/README.md). Secrets requis (Edge Functions → Secrets) :
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), CRON_SECRET. SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
// Déployer avec « Verify JWT » désactivé : l'accès est protégé par CRON_SECRET.
// Même passage toutes les 5 minutes : prévient les administrateurs (notification + e-mail) d'une nouvelle demande pour devenir enseignant.
// Le dimanche en fin d'après-midi (UTC) : résumé de la semaine par e-mail aux personnes qui l'ont activé (Réglages → Compte).
// Nouvelle version annoncée par l'administrateur (Réglages → Compte → Espace admin) : cloche + notification sur les appareils + e-mail (40 par passage ; sauf pour qui l'a désactivé).
// L'e-mail est facultatif : il demande les secrets SMTP_USER (adresse Gmail d'envoi) et SMTP_PASS (mot de passe d'application Google) ; sans eux, seule la notification part.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

type Sub = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string; remind_time: string; remind_time2: string | null; tz: string; lang: string; last_sent: string | null; last_sent2: string | null };

const MSG: Record<string, { title: string; plain: string; due: (n: number) => string; late: string }> = {
  fr: { title: 'Tathbīt', plain: "C'est l'heure de ta révision 📖", due: (n) => `${n} verset${n > 1 ? 's' : ''} à revoir aujourd'hui 📖`, late: "Il n'est pas trop tard pour ta révision du jour 🌙" },
  en: { title: 'Tathbīt', plain: 'Time for your review 📖', due: (n) => `${n} verse${n !== 1 ? 's' : ''} to review today 📖`, late: "It's not too late for today's review 🌙" },
  ar: { title: 'تثبيت', plain: 'حان وقت مراجعتك 📖', due: (n) => `${n} ${n === 1 ? 'آية' : 'آيات'} للمراجعة اليوم 📖`, late: 'لم يفت الأوان بعد لمراجعة اليوم 🌙' },
};

// date (AAAA-MM-JJ) et minutes écoulées dans la journée, dans le fuseau de l'appareil
function localParts(now: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

// chaque rappel (1er et 2e) part une seule fois par jour local, à partir de son heure (et jusqu'à 3 h plus tard si un passage a été manqué)
function decide(sub: Sub, now: Date) {
  let lp;
  try { lp = localParts(now, sub.tz); } catch { lp = localParts(now, 'UTC'); }
  const due = (t: string | null, last: string | null) => {
    if (!t) return false;
    const [h, m] = t.split(':').map(Number), target = h * 60 + m;
    return last !== lp.date && lp.minutes >= target && lp.minutes < target + 180;
  };
  // si les deux sont dans la fenêtre (passage manqué), seul le dernier compte
  const second = due(sub.remind_time2, sub.last_sent2);
  return { first: !second && due(sub.remind_time, sub.last_sent), second, date: lp.date };
}

const REQ = {
  fr: (e: string) => ({ title: 'Tathbīt · demande enseignant', body: `${e} demande à devenir enseignant.` }),
  en: (e: string) => ({ title: 'Tathbīt · teacher request', body: `${e} asks to become a teacher.` }),
  ar: (e: string) => ({ title: 'تثبيت · طلب معلّم', body: `${e} يطلب أن يصبح معلّماً.` }),
};

// demandes d'enseignant pas encore signalées : notification aux appareils des admins + e-mail aux admins (si SMTP configuré)
async function notifyRequests(db: ReturnType<typeof createClient>) {
  const { data: rows, error } = await db.from('teacher_requests').select('user_id').is('notified_at', null);
  if (error || !rows?.length) return 0;      // table ou colonne absente (teacher.sql pas relancé) : on ignore
  const { data: profs } = await db.from('profiles').select('id, email, blocked').in('id', rows.map((r: { user_id: string }) => r.user_id));
  const reqs = (profs ?? []).map((p: { id: string; email: string; blocked: boolean }) => ({ user_id: p.id, profiles: { email: p.email, blocked: p.blocked } }));
  const { data: admins } = await db.from('profiles').select('id, email').eq('role', 'admin').eq('blocked', false);
  const ids = (admins ?? []).map((a: { id: string }) => a.id);
  if (!ids.length) return 0;
  const { data: subs } = await db.from('push_subs').select('id, endpoint, p256dh, auth, lang').in('user_id', ids);
  const smtpUser = Deno.env.get('SMTP_USER'), smtpPass = Deno.env.get('SMTP_PASS');
  let done = 0;
  for (const r of reqs) {
    if (r.profiles.blocked) continue;
    const email = r.profiles.email;
    let ok = false;
    for (const sub of subs ?? []) {
      const m = (REQ[sub.lang as keyof typeof REQ] ?? REQ.fr)(email);
      try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ ...m, url: './', tag: 'demande-' + r.user_id }), { TTL: 24 * 3600, urgency: 'normal' }); ok = true; }
      catch (e) { const c = (e as { statusCode?: number }).statusCode; if (c === 404 || c === 410) await db.from('push_subs').delete().eq('id', sub.id); else console.error('push admin', c, (e as Error).message); }
    }
    if (smtpUser && smtpPass) {
      try {
        const c = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: smtpUser, password: smtpPass } } });
        await c.send({ from: smtpUser, to: (admins ?? []).map((a: { email: string }) => a.email), subject: 'Tathbīt : demande pour devenir enseignant',
          content: `${email} demande à devenir enseignant.\n\nPour accepter ou refuser : Tathbīt → Réglages → Compte → Espace admin → « Demandes d'enseignant ».` });
        await c.close(); ok = true;
      } catch (e) { console.error('mail admin', (e as Error).message); }
    }
    if (ok) { await db.from('teacher_requests').update({ notified_at: new Date().toISOString() }).eq('user_id', r.user_id); done++; }
  }
  return done;
}

// WK:begin — résumé de la semaine (fonction pure, testée en Node)
function weekSummary(days: Record<string, number>, now: Date) {
  let total = 0, active = 0, streak = 0, run = true;
  for (let i = 0; i < 7; i++) {
    const n = days[new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10)] ?? 0;
    total += n; if (n > 0) active++;
    if (run && n > 0) streak++; else if (i > 0) run = false;
  }
  return { total, active, streak };
}
const WK = {
  fr: { subject: 'Tathbīt : ta semaine', body: (w: { total: number; active: number; streak: number }) => `Cette semaine : ${w.total} réponse${w.total > 1 ? 's' : ''}, ${w.active} jour${w.active > 1 ? 's' : ''} actif${w.active > 1 ? 's' : ''} sur 7.\n${w.active === 0 ? "Une petite révision aujourd'hui relancera la régularité." : 'Continue comme ça, la régularité fait la mémorisation.'}\n\nPour ne plus recevoir ce résumé : Tathbīt → Réglages → Compte.` },
  en: { subject: 'Tathbīt: your week', body: (w: { total: number; active: number; streak: number }) => `This week: ${w.total} answer${w.total !== 1 ? 's' : ''}, ${w.active} active day${w.active !== 1 ? 's' : ''} out of 7.\n${w.active === 0 ? 'A short review today will restart your routine.' : 'Keep going: regularity builds memorisation.'}\n\nTo stop receiving this summary: Tathbīt → Settings → Account.` },
  ar: { subject: 'تثبيت: أسبوعك', body: (w: { total: number; active: number; streak: number }) => `هذا الأسبوع: ${w.total} إجابة، و${w.active} أيام نشطة من 7.\n${w.active === 0 ? 'مراجعة قصيرة اليوم تعيد لك انتظامك.' : 'واصل: الانتظام يصنع الحفظ.'}\n\nلإيقاف هذا الملخص: تثبيت ← الإعدادات ← الحساب.` },
};
// WK:end

async function sendWeekly(db: ReturnType<typeof createClient>, now: Date) {
  const smtpUser = Deno.env.get('SMTP_USER'), smtpPass = Deno.env.get('SMTP_PASS');
  if (!smtpUser || !smtpPass || now.getUTCDay() !== 0 || now.getUTCHours() < 16 || now.getUTCHours() > 18) return 0;
  const today = now.toISOString().slice(0, 10);
  const { data: prefs, error } = await db.from('mail_prefs').select('user_id, lang, last_sent').eq('weekly', true).limit(100);
  if (error || !prefs?.length) return 0;
  const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: smtpUser, password: smtpPass } } });
  let n = 0;
  try {
    for (const p of prefs as { user_id: string; lang: string; last_sent: string | null }[]) {
      if (p.last_sent === today) continue;
      const { data: prof } = await db.from('profiles').select('email, blocked').eq('id', p.user_id).maybeSingle();
      if (!prof || prof.blocked) continue;
      const { data: ud } = await db.from('user_data').select('data').eq('user_id', p.user_id).maybeSingle();
      const m = WK[p.lang as keyof typeof WK] ?? WK.fr, w = weekSummary((ud?.data?.days ?? {}) as Record<string, number>, now);
      try { await client.send({ from: smtpUser, to: prof.email, subject: m.subject, content: m.body(w) }); await db.from('mail_prefs').update({ last_sent: today }).eq('user_id', p.user_id); n++; }
      catch (e) { console.error('mail hebdo', (e as Error).message); }
    }
  } finally { await client.close().catch(() => {}); }
  return n;
}

const MSGN = {
  fr: (e: string) => ({ title: 'Tathbīt · nouveau message', body: `Message de ${e}` }),
  en: (e: string) => ({ title: 'Tathbīt · new message', body: `Message from ${e}` }),
  ar: (e: string) => ({ title: 'تثبيت · رسالة جديدة', body: `رسالة من ${e}` }),
};

// messages enseignant ↔ élève pas encore signalés : notification au destinataire (sans le texte du message)
async function notifyMessages(db: ReturnType<typeof createClient>) {
  const { data: msgs, error } = await db.from('teacher_messages').select('id, teacher_id, student_id, from_student').is('notified_at', null).limit(50);
  if (error || !msgs?.length) return 0;
  let n = 0;
  for (const m of msgs as { id: number; teacher_id: string; student_id: string; from_student: boolean }[]) {
    const to = m.from_student ? m.teacher_id : m.student_id, from = m.from_student ? m.student_id : m.teacher_id;
    const { data: prof } = await db.from('profiles').select('email').eq('id', from).maybeSingle();
    const { data: subs } = await db.from('push_subs').select('id, endpoint, p256dh, auth, lang').eq('user_id', to);
    for (const sub of subs ?? []) {
      const t = (MSGN[sub.lang as keyof typeof MSGN] ?? MSGN.fr)(prof?.email ?? '');
      try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ ...t, url: './', tag: 'message-' + m.id }), { TTL: 24 * 3600, urgency: 'normal' }); n++; }
      catch (e) { const c = (e as { statusCode?: number }).statusCode; if (c === 404 || c === 410) await db.from('push_subs').delete().eq('id', sub.id); else console.error('push message', c, (e as Error).message); }
    }
    await db.from('teacher_messages').update({ notified_at: new Date().toISOString() }).eq('id', m.id);
  }
  return n;
}

/* UH:begin — e-mail « nouvelle version » en HTML (logo, couleurs de l'application) ; testé en Node */
const SITE = 'https://msake2026.github.io/tathbit/', LOGO = SITE + 'icons/icon-192.png';
const escH = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const UH = {
  fr: { h: 'Une nouvelle version de Tathbīt est disponible', ver: 'Version', tip: "Ouvre l'application : un message « Nouvelle version disponible » apparaît à l'accueil. Touche « Chercher les mises à jour » (aussi dans Réglages) pour la récupérer.", btn: 'Ouvrir Tathbīt', news: 'Voir les nouveautés', head: 'Au programme', tail: 'Tu peux ne plus recevoir ces e-mails : Tathbīt → Réglages → Compte.' },
  en: { h: 'A new version of Tathbīt is available', ver: 'Version', tip: 'Open the app: a “New version available” message appears on the home screen. Tap “Check for updates” (also in Settings) to get it.', btn: 'Open Tathbīt', news: 'See what’s new', head: 'What’s new', tail: 'You can stop these e-mails: Tathbīt → Settings → Account.' },
  ar: { h: 'يتوفر إصدار جديد من «تثبيت»', ver: 'الإصدار', tip: 'افتح التطبيق: تظهر في الصفحة الرئيسية رسالة «إصدار جديد متاح». اضغط «البحث عن التحديثات» (وهي أيضاً في الإعدادات) للحصول عليه.', btn: 'افتح تثبيت', news: 'اطّلع على الجديد', head: 'الجديد', tail: 'يمكنك إيقاف هذه الرسائل: تثبيت ← الإعدادات ← الحساب.' },
};
function updHtml(langs: string[], label: string, note: string | null, items: { icon?: string; go: string; title: Record<string, string>; text: Record<string, string> }[]): string {
  const part = (k: string, i: number) => {
    const t = (UH as Record<string, typeof UH.fr>)[k], rtl = k === 'ar', side = rtl ? 'right' : 'left';
    return `${i ? '<tr><td style="padding:0 28px"><hr style="border:0;border-top:1px solid #decfa9;margin:6px 0 0"></td></tr>' : ''}
<tr><td dir="${rtl ? 'rtl' : 'ltr'}" style="padding:22px 28px 8px;text-align:${side}">
<h2 style="margin:0 0 10px;font:700 21px/1.35 Georgia,'Times New Roman',serif;color:#0f5d46">${t.h}</h2>
<p style="margin:0 0 12px"><span style="display:inline-block;background:#b58a2c;color:#fffdf6;font:700 13px Arial,sans-serif;padding:4px 12px;border-radius:999px">${t.ver} · <bdi dir="ltr">${escH(label)}</bdi></span></p>
${note ? `<div style="margin:0 0 12px;padding:10px 14px;background:#f3ead6;border-${side}:4px solid #b58a2c;border-radius:8px;font:15px/1.6 Arial,sans-serif;color:#2b2218">${escH(note)}</div>` : ''}
${items.length ? `<p style="margin:14px 0 4px;font:700 14px Arial,sans-serif;color:#b58a2c;text-transform:uppercase;letter-spacing:.5px">${t.head}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px">${items.map((it) => `<tr><td valign="top" style="width:34px;padding:8px 0;font-size:22px;line-height:1.3">${it.icon ?? ''}</td><td valign="top" style="padding:8px 0;font:15px/1.55 Arial,sans-serif;color:#2b2218"><a href="${SITE}#go=${escH(it.go)}" style="color:#0f5d46;font-weight:700;text-decoration:none">${escH(it.title[k] ?? it.title.fr)}</a><br>${escH(it.text[k] ?? it.text.fr)}</td></tr>`).join('')}</table>` : ''}
<p style="margin:0 0 16px;font:15px/1.65 Arial,sans-serif;color:#2b2218">${t.tip}</p>
<p style="margin:0 0 18px;text-align:center"><a href="${items.length ? SITE + '#go=news' : SITE}" style="display:inline-block;background:#0f5d46;color:#fff8e6;text-decoration:none;font:700 16px Arial,sans-serif;padding:13px 28px;border-radius:12px">${items.length ? t.news : t.btn}</a></p>
<p style="margin:0 0 6px;font:12px/1.5 Arial,sans-serif;color:#6f6049;text-align:${side}">${t.tail}</p>
</td></tr>`;
  };
  return `<!doctype html><html lang="${langs[0]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:24px 12px;background:#f3ead6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fcf7ea;border:1px solid #decfa9;border-radius:16px;overflow:hidden">
<tr><td align="center" style="background:#0f5d46;padding:26px 20px">
<img src="${LOGO}" width="84" height="84" alt="تثبيت" style="display:block;margin:0 auto 10px;border:0;border-radius:20px">
<div style="font:700 26px Georgia,'Times New Roman',serif;color:#fff8e6;letter-spacing:.5px">Tathbīt</div>
<div style="font:14px Arial,sans-serif;color:#e3cf98;margin-top:2px">تثبيت · Coran et moutoun</div></td></tr>
${langs.map(part).join('')}
<tr><td style="padding:10px 28px 22px;text-align:center;font:12px Arial,sans-serif;color:#6f6049"><a href="${SITE}" style="color:#6f6049">msake2026.github.io/tathbit</a></td></tr>
</table></td></tr></table></body></html>`;
}
/* UH:end */

const UPD = {
  fr: { title: 'Tathbīt · nouvelle version', subject: 'Tathbīt : nouvelle version disponible',
        body: (l: string, n: string | null) => `Une nouvelle version de Tathbīt est disponible (${l}).${n ? '\n' + n : ''}\n\nOuvre l'application, puis touche « Chercher les mises à jour » (Réglages) pour la récupérer.`,
        tail: "Tu peux ne plus recevoir ces e-mails : Tathbīt → Réglages → Compte." },
  en: { title: 'Tathbīt · new version', subject: 'Tathbīt: a new version is available',
        body: (l: string, n: string | null) => `A new version of Tathbīt is available (${l}).${n ? '\n' + n : ''}\n\nOpen the app, then tap “Check for updates” (Settings) to get it.`,
        tail: 'You can stop these e-mails: Tathbīt → Settings → Account.' },
  ar: { title: 'تثبيت · إصدار جديد', subject: 'تثبيت: إصدار جديد متاح',
        body: (l: string, n: string | null) => `يتوفر إصدار جديد من تثبيت (${l}).${n ? '\n' + n : ''}\n\nافتح التطبيق ثم اضغط «البحث عن التحديثات» (الإعدادات) للحصول عليه.`,
        tail: 'يمكنك إيقاف هذه الرسائل: تثبيت ← الإعدادات ← الحساب.' },
};

// résumé des nouveautés de la version annoncée : fichier news.json du site (mis à jour à chaque publication) ; vide s'il ne correspond pas à la version
async function fetchNews(version: number) {
  try {
    const r = await fetch(SITE + 'news.json?t=' + Date.now()); if (!r.ok) return [];
    const j = await r.json(); return Number(j.v) === version && Array.isArray(j.items) ? j.items.slice(0, 8) : [];
  } catch { return []; }
}
// nouvelle version annoncée : 1) cloche + notification (une seule fois), 2) e-mails par paquets de 40 jusqu'à ce que tout le monde l'ait reçu
async function announceUpdates(db: ReturnType<typeof createClient>) {
  const { data: anns, error } = await db.from('app_announcements').select('id, version, label, note, fanout_at').is('mail_done_at', null).order('version', { ascending: true }).limit(2);
  if (error || !anns?.length) return { bell: 0, push: 0, mail: 0 };       // table absente (teacher.sql pas relancé) ou rien à annoncer
  let bell = 0, push = 0, mail = 0;
  const smtpUser = Deno.env.get('SMTP_USER'), smtpPass = Deno.env.get('SMTP_PASS');
  for (const a of anns as { id: number; version: number; label: string; note: string | null; fanout_at: string | null }[]) {
    if (!a.fanout_at) {
      const claim = await db.from('app_announcements').update({ fanout_at: new Date().toISOString() }).eq('id', a.id).is('fanout_at', null).select('id');
      if (!claim.data?.length) continue;                                  // un autre passage s'en occupe
      for (let from = 0; ; from += 1000) {                                 // cloche : une notification par compte actif
        const { data: ps } = await db.from('profiles').select('id').eq('blocked', false).order('id').range(from, from + 999);
        if (!ps?.length) break;
        await db.from('notifications').insert(ps.map((p: { id: string }) => ({ user_id: p.id, kind: 'app_update', ref: String(a.version) }))); bell += ps.length;
        if (ps.length < 1000) break;
      }
      const { data: subs } = await db.from('push_subs').select('id, endpoint, p256dh, auth, lang').limit(2000);
      for (const sub of subs ?? []) {                                      // notification sur les appareils qui ont activé les rappels
        const m = UPD[sub.lang as keyof typeof UPD] ?? UPD.fr;
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: m.title, body: m.body(a.label, a.note).split('\n\n')[0], url: './', tag: 'maj-' + a.version }), { TTL: 3 * 24 * 3600, urgency: 'normal' }); push++; }
        catch (e) { const c = (e as { statusCode?: number }).statusCode; if (c === 404 || c === 410) await db.from('push_subs').delete().eq('id', sub.id); else console.error('push maj', c, (e as Error).message); }
      }
    }
    if (!smtpUser || !smtpPass) continue;                                  // sans SMTP : cloche et notifications seulement
    const items = await fetchNews(a.version);
    const { data: sent } = await db.from('announce_mail').select('user_id').eq('announcement_id', a.id);
    const done = new Set((sent ?? []).map((r: { user_id: string }) => r.user_id));
    const { data: off } = await db.from('mail_prefs').select('user_id').eq('updates', false);
    const { data: langs } = await db.from('mail_prefs').select('user_id, lang');
    const skip = new Set((off ?? []).map((r: { user_id: string }) => r.user_id)), lang = new Map<string, string>((langs ?? []).map((r: { user_id: string; lang: string }): [string, string] => [r.user_id, r.lang]));
    const todo: { id: string; email: string }[] = [];
    for (let from = 0; todo.length < 40; from += 1000) {
      const { data: ps } = await db.from('profiles').select('id, email').eq('blocked', false).order('id').range(from, from + 999);
      if (!ps?.length) break;
      for (const p of ps as { id: string; email: string }[]) if (!done.has(p.id) && !skip.has(p.id) && p.email && todo.length < 40) todo.push(p);
      if (ps.length < 1000) break;
    }
    if (!todo.length) { await db.from('app_announcements').update({ mail_done_at: new Date().toISOString() }).eq('id', a.id); continue; }
    const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: smtpUser, password: smtpPass } } });
    try {
      for (const p of todo) {
        const l = lang.get(p.id) as keyof typeof UPD | undefined, one = l && UPD[l];
        const txt = (k: 'fr' | 'en' | 'ar') => `${UPD[k].body(a.label, a.note)}${items.length ? '\n\n' + items.map((it: { title: Record<string, string>; text: Record<string, string> }) => `• ${it.title[k] ?? it.title.fr} : ${it.text[k] ?? it.text.fr}`).join('\n') : ''}\n\n${UPD[k].tail}`;
        const content = one && l ? txt(l) : (['fr', 'en', 'ar'] as const).map(txt).join('\n\n———\n\n');
        try { await client.send({ from: `Tathbīt <${smtpUser}>`, to: p.email, subject: one ? one.subject : UPD.en.subject, content, html: updHtml(one && l ? [l] : ['fr', 'en', 'ar'], a.label, a.note, items) }); await db.from('announce_mail').insert({ announcement_id: a.id, user_id: p.id }); mail++; }
        catch (e) { console.error('mail maj', (e as Error).message); }
      }
    } finally { await client.close().catch(() => {}); }
  }
  return { bell, push, mail };
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`) return new Response('forbidden', { status: 403 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  const now = new Date();
  const { data: subs, error } = await db.from('push_subs').select('*');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  let messages = 0; try { messages = await notifyMessages(db); } catch (e) { console.error('messages', (e as Error).message); }
  let weekly = 0; try { weekly = await sendWeekly(db, new Date()); } catch (e) { console.error('hebdo', (e as Error).message); }
  let notified = 0; try { notified = await notifyRequests(db); } catch (e) { console.error('demandes', (e as Error).message); }
  let update = { bell: 0, push: 0, mail: 0 }; try { update = await announceUpdates(db); } catch (e) { console.error('maj', (e as Error).message); }
  let sent = 0, skipped = 0, removed = 0;
  for (const s of (subs ?? []) as Sub[]) {
    const d = decide(s, now);
    if (!d.first && !d.second) continue;
    const mark = d.second ? { last_sent: d.date, last_sent2: d.date } : { last_sent: d.date }; // le 2e rappel remplace le 1er s'il n'est pas encore parti
    const { data: ud } = await db.from('user_data').select('data').eq('user_id', s.user_id).maybeSingle();
    const days = (ud?.data?.days ?? {}) as Record<string, number>;
    if ((days[d.date] ?? 0) > 0) { // déjà révisé aujourd'hui : pas de rappel
      await db.from('push_subs').update(mark).eq('id', s.id); skipped++; continue;
    }
    const due = Object.values((ud?.data?.sched ?? {}) as Record<string, { due: number }>).filter((v) => v && v.due <= now.getTime()).length;
    const m = MSG[s.lang] ?? MSG.fr;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: m.title, body: d.second ? m.late : due > 0 ? m.due(due) : m.plain, url: './', tag: 'rappel-' + d.date + (d.second ? '-2' : '-1') }), { TTL: 6 * 3600, urgency: 'normal' });
      await db.from('push_subs').update(mark).eq('id', s.id); sent++;
      // même rappel dans la cloche de l'application, tant que la personne ne l'a pas traité (un seul rappel non traité à la fois)
      await db.from('notifications').delete().eq('user_id', s.user_id).eq('kind', 'reminder').is('read_at', null);
      await db.from('notifications').insert({ user_id: s.user_id, kind: 'reminder', ref: d.date, n: due });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await db.from('push_subs').delete().eq('id', s.id); removed++; } // appareil désinscrit
      else console.error('push', s.id, code, (e as Error).message);
    }
  }
  return new Response(JSON.stringify({ sent, skipped, removed, notified, weekly, messages, update }), { headers: { 'Content-Type': 'application/json' } });
});
