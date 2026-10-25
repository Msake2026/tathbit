#!/usr/bin/env python3
"""Écrit NOMS-SOURATES.md : les 114 noms arabes tels qu'ils sont affichés dans l'application (lus dans quran.js), pour relecture."""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
s = open(os.path.join(root, "quran.js"), encoding="utf8").read()
Q = json.loads(s[s.index("{"):s.rindex("}") + 1])
out = ["# Noms arabes des sourates, tels qu'ils sont dans l'application\n",
       "Source : api.alquran.cloud (Tanzil), identique aux noms des fichiers du Complexe du Roi Fahd. Les lettres sont identiques à la liste de noms de Tanzil (vérifié) ; **seules les voyelles ont été retouchées** pour les sourates 5, 55, 58 et 60 (relecture du 25 oct. 2026).\n",
       "Écriture ʿuthmānī : un nūn sans sukūn devant ف ك ب ش س (ikhfāʾ, iqlāb) est voulu, comme sur le mushaf.\n",
       "| N° | Nom affiché | Translittération |", "|---|---|---|"]
for t in Q["surahs"]:
    out.append(f"| {t['n']} | {t['ar']} | {t['en']} |")
open(os.path.join(root, "NOMS-SOURATES.md"), "w", encoding="utf8").write("\n".join(out) + "\n")
print(len(Q["surahs"]))
