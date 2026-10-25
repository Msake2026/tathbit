#!/usr/bin/env python3
"""Publie une nouvelle version de Tathbīt d'un seul coup, sans rien oublier.

  python3 tools/release.py --init        crée news-next.json (modèle des nouveautés à rédiger)
  python3 tools/release.py               publie : numéro de version, version.json, news.json (+ archive dans news-history.json),
                                         cache du service worker, tests complets, commit et envoi sur GitHub
  options : --dry-run (montre ce qui serait fait, n'écrit rien) · --fast (tests rapides, pour un essai) · --no-push (s'arrête après le commit)
            --no-tests (déconseillé) · --co-author "Nom <adresse>" (ligne ajoutée au message de commit)

Avant de lancer : rédige les nouveautés de la version dans news-next.json (3 langues par texte ; « go » = fonction vers laquelle mène « Essayer »).
Si un test échoue, tout est remis comme avant et rien n'est envoyé. Reste à faire à la main : quand le site est à jour, espace admin →
« Annoncer une nouvelle version » (le script ne touche jamais à la base ni aux e-mails).
"""
import json, os, re, subprocess, sys, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
os.chdir(ROOT)
ARGS = sys.argv[1:]
DRY, FAST, NOPUSH, NOTESTS = "--dry-run" in ARGS, "--fast" in ARGS, "--no-push" in ARGS, "--no-tests" in ARGS
CO = ARGS[ARGS.index("--co-author") + 1] if "--co-author" in ARGS else ""
MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
JS = "js/account.js"   # contient APP_VERSION et NEWS_GO
LANGS = ("fr", "en", "ar")

def die(msg):
    print("✗ " + msg); sys.exit(1)

def read(f): return open(f, encoding="utf8").read()
def write(f, s): open(f, "w", encoding="utf8").write(s)
def jread(f): return json.loads(read(f))
def jwrite(f, d): write(f, json.dumps(d, ensure_ascii=False, indent=1) + "\n")
def run(cmd, **k): return subprocess.run(cmd, cwd=ROOT, text=True, **k)

def news_targets():
    m = re.search(r"const NEWS_GO = \{([^\n]*)\};", read(JS))
    if not m: die("NEWS_GO introuvable dans " + JS)
    return {t for t in re.findall(r"(\w+): \(\) =>", m.group(1))}

def check_news(d, targets):
    items = d.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 8: die("news-next.json : 1 à 8 nouveautés dans « items »")
    ids = set()
    for it in items:
        i = it.get("id", "?")
        if not it.get("id") or it["id"] in ids: die(f"news-next.json : « id » manquant ou en double ({i})")
        ids.add(it["id"])
        if not it.get("icon"): die(f"news-next.json : « icon » manquant ({i})")
        if it.get("go") not in targets or it.get("go") == "news": die(f"news-next.json : « go » de {i} doit être l'un de : {', '.join(sorted(targets - {'news'}))}")
        for k in ("title", "text"):
            for l in LANGS:
                v = (it.get(k) or {}).get(l, "")
                if len(v) < 4 or "À RÉDIGER" in v: die(f"news-next.json : {i} › {k} › {l} à rédiger")

def main():
    if "--init" in ARGS:
        if os.path.exists("news-next.json"): die("news-next.json existe déjà")
        t = {"items": [{"id": "exemple", "icon": "✨", "go": "home", "title": {l: "À RÉDIGER" for l in LANGS}, "text": {l: "À RÉDIGER" for l in LANGS}}]}
        jwrite("news-next.json", t); print("✓ news-next.json créé : rédige les nouveautés (3 langues), puis relance sans option."); return
    if not os.path.exists("news-next.json"): die("news-next.json absent : lance « python3 tools/release.py --init » puis rédige les nouveautés de cette version.")
    code = read(JS)
    m = re.search(r"const APP_VERSION = '([^']+)'", code)
    if not m: die("APP_VERSION introuvable dans " + JS)
    cur = int(re.search(r"v(\d+)", m.group(1)).group(1)); new = cur + 1
    news = jread("news.json")
    if news.get("v") != cur: die(f"news.json (v{news.get('v')}) ne correspond pas à l'application (v{cur}) : corrige d'abord")
    nxt = jread("news-next.json"); check_news(nxt, news_targets())
    today = datetime.date.today(); label = f"{today.day} {MONTHS[today.month - 1]} {today.year} · v{new}"
    sw = read("sw.js"); ms = re.search(r"tathbit-shell-v(\d+)", sw)
    if not ms: die("numéro de cache introuvable dans sw.js")
    cache = int(ms.group(1)) + 1
    title = " ; ".join(it["title"]["fr"] for it in nxt["items"])
    print(f"Version v{cur} → v{new} ({label}) · cache du service worker v{cache-1} → v{cache}\nNouveautés : " + " · ".join(it["icon"] + " " + it["title"]["fr"] for it in nxt["items"]))
    if DRY: print("(essai à blanc : rien n'est écrit)"); return
    touched = [JS, "sw.js", "version.json", "news.json", "news-history.json", "news-next.json"]
    backup = {f: read(f) for f in touched if os.path.exists(f)}
    def restore():
        for f, s in backup.items(): write(f, s)
        print("↩ fichiers remis comme avant.")
    try:
        H = jread("news-history.json") if os.path.exists("news-history.json") else {"versions": []}
        if not any(x.get("v") == cur for x in H["versions"]):
            e = {"v": cur}; 
            if news.get("date"): e["date"] = news["date"]
            e["items"] = news["items"]; H["versions"].insert(0, e)
        H["versions"].sort(key=lambda x: -x["v"]); jwrite("news-history.json", H)
        jwrite("news.json", {"v": new, "date": today.isoformat(), "items": nxt["items"]})
        os.remove("news-next.json")
        write("version.json", json.dumps({"v": new, "label": label}, ensure_ascii=False) + "\n")
        write(JS, code.replace(m.group(0), f"const APP_VERSION = '{label}'", 1))
        write("sw.js", re.sub(r"tathbit-(shell|runtime)-v\d+", lambda x: f"tathbit-{x.group(1)}-v{cache}", sw))
        if not NOTESTS:
            print("→ tests Node…"); r = run(["node", "--test", "tests/node.test.mjs"], capture_output=True)
            if r.returncode: print(r.stdout[-3000:]); raise RuntimeError("les tests Node échouent")
            print("→ tests navigateur " + ("rapides" if FAST else "complets") + " (quelques minutes)…")
            r = run(["node", "tests/run-local.mjs"] + (["--fast"] if FAST else []), capture_output=True)
            out = r.stdout or ""; print("\n".join(l for l in out.splitlines() if not l.startswith("✓"))[-2500:])
            if r.returncode: raise RuntimeError("les tests navigateur échouent")
    except Exception as e:
        restore()
        if os.path.exists("news-next.json") is False and "news-next.json" in backup: write("news-next.json", backup["news-next.json"])
        die(str(e) + " : rien n'a été publié.")
    msg = f"v{new} : {title}" + (f"\n\nCo-Authored-By: {CO}" if CO else "")
    run(["git", "add", "-A"], check=True); run(["git", "commit", "-q", "-m", msg], check=True)
    print(f"✓ commit v{new}")
    if NOPUSH: print("(--no-push : rien envoyé. Envoie avec « git push »)"); return
    r = run(["git", "push", "-q"]); 
    if r.returncode: die("l'envoi a échoué : lance « git push » à la main")
    print(f"✓ v{new} envoyée. Quand le site est à jour (une minute ou deux) : espace admin → « Annoncer une nouvelle version ».")

main()
