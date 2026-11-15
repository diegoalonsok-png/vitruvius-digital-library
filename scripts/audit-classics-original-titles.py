#!/usr/bin/env python3
"""Control documental de denominaciones originales en Bibliotheca.

No convierte títulos españoles a latín/griego, ni convierte un título uniforme
en una rúbrica manuscrita. Produce una lista de registros que exigen
verificación contra fuente bibliográfica; no silencia lagunas.
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAT = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
CRIT = ROOT / "data/classics-corpus/critical-authorities-222.json"
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")
HEBREW = re.compile(r"[\u0590-\u05ff]")
ACCENTED_SPANISH = re.compile(r"[áéíóúñ¿¡]", re.I)
MODERN = {"vitruvio-v514-pdf", "vitruvio-v554-pdf", "theory-v297-pdf", "krohn-1912-pdf"}

def norm(s):
    return str(s or "").strip()

def check():
    cat = json.loads(CAT.read_text(encoding="utf-8"))
    crit = json.loads(CRIT.read_text(encoding="utf-8")) if CRIT.exists() else {}
    records = {r.get("workId"): r.get("authority", {}) for r in crit.get("records", [])}
    problems, counts = [], Counter()
    for w in cat.get("works", []):
        wid = norm(w.get("id"))
        if wid in MODERN:
            counts["ediciones_modernas"] += 1
            continue
        lang = w.get("originalLanguage") or w.get("language")
        counts[lang or "sin_lengua"] += 1
        bibliog = w.get("bibliography") or {}
        authority = records.get(wid) or {}
        variants = [
            norm(bibliog.get("originalTitle")),
            norm(bibliog.get("titleOriginal")),
            norm(w.get("originalTitle")),
            norm(authority.get("uniformTitle")),
            norm(w.get("title")).split(" · ")[0],
        ]
        variants = [v for v in variants if v]
        if lang == "grc":
            supported = [v for v in variants if GREEK.search(v)]
        elif lang in ("he", "hbo", "heb"):
            supported = [v for v in variants if HEBREW.search(v)]
        elif lang == "la":
            supported = [v for v in variants if re.fullmatch(r"[A-Za-zÀ-ÿ\s,;:'().-]+", v) and not ACCENTED_SPANISH.search(v)]
        else:
            supported = []
        if not supported:
            problems.append({"workId": wid, "titleDisplayed": w.get("title"),
                             "language": lang, "reason": "titulo_original_sin_testimonio_documentado"})
        if not norm(w.get("author")):
            problems.append({"workId": wid, "reason": "autor_no_identificado_en_ficha"})
        if lang not in ("grc", "la", "he", "hbo", "heb"):
            problems.append({"workId": wid, "language": lang, "reason": "lengua_original_fuera_del_control"})
    return {
        "scope": "Auditoría de metadatos: NO equivale a cotejo del documento original",
        "records": len(cat.get("works", [])),
        "languages": dict(counts),
        "issues": problems,
        "issueCount": len(problems),
        "rule": "No sustituir incertidumbre documental por atribuciones inferidas",
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = check()
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"Obras del catálogo: {report['records']}; incidencias documentales: {report['issueCount']}")
        for issue in report["issues"]:
            print(issue.get("workId"), issue["reason"], issue.get("language", ""))
    raise SystemExit(1 if report["issues"] else 0)
