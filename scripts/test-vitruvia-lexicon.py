#!/usr/bin/env python3
"""Pruebas de integridad de Vitruvia Lexicon.
- Los JSON de data/lexicon/ cargan y tienen los campos obligatorios.
- Toda cita de las fichas y sententiae atribuida a una obra del corpus local
  aparece literalmente (sin diacríticos ni puntuación) en ese corpus.
Uso: python3 scripts/test-vitruvia-lexicon.py"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / "data" / "lexicon"


def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = s.replace("ς", "σ").replace("j", "i").replace("v", "u")
    return " ".join(re.findall(r"[^\W\d_]+", s))


fail = 0
corpus = {}
for l in ("la", "grc"):
    c = json.loads((D / f"corpus-{l}.json").read_text())
    f = json.loads((D / f"forms-{l}.json").read_text())
    assert c["passages"] and f["forms"] and f["lemmas"], l
    for p in c["passages"]:
        corpus.setdefault(p[0], []).append(fold(p[2]))
PREFIX = {"Vitr.": "vitruvius", "Lucr.": "lucretius", "Cic. Off.": "cicero-officiis", "Catull.": "catullus-carmina",
          "Verg. A.": "virgil-aeneid", "Verg. G.": "virgil-georgica", "Caes. Gal.": "caesar-gallico", "Hom. Il.": "homer-iliad",
          "Hom. Od.": "homer-odyssey", "Pl. Ap.": "plato-apology", "Arist. Po.": "aristotle-poetics", "Epict. Ench.": "epictetus-enchiridion"}


def check(cite, text, where):
    global fail
    for pre, work in PREFIX.items():
        if cite.startswith(pre) and not cite.startswith("Prov") and work in corpus:
            ft = fold(text)
            if not any(ft in x for x in corpus[work]):
                print(f"FALTA en el corpus [{work}] {where}: {cite} · {text[:70]}")
                fail += 1
            return


E = json.loads((D / "etymologicum.json").read_text())
for e in E["entries"]:
    for k in ("id", "l", "lemma", "head", "etym"):
        if not e.get(k):
            print("ficha sin", k, e.get("id")); fail += 1
    for L in e.get("loci", []):
        if L.get("lang") != "he":
            check(L["c"], L["t"], e["id"])
ids = [e["id"] for e in E["entries"]]
if len(ids) != len(set(ids)):
    print("ids duplicados"); fail += 1
S = json.loads((D / "sententiae.json").read_text())
for s in S["sententiae"]:
    if s["lang"] != "he":
        check(s["cite"], s["text"], s["id"])
P = json.loads((D / "philologia.json").read_text())
for k in ("signa", "abbreviationes", "errores", "principia", "codicologia", "hermeneutica", "exegesis_template"):
    if not P.get(k):
        print("philologia sin", k); fail += 1
print(f"{len(E['entries'])} fichas · {len(S['sententiae'])} sententiae · {fail} fallos")
sys.exit(1 if fail else 0)
