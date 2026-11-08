#!/usr/bin/env python3
"""Auditar las 222 obras sin confundir fichas con textos originales ni traducciones.

El roadmap se deriva del registro local, sin descargar ni editar fuentes.
Los enlaces bibliográficos a Perseus son CANDIDATOS, no pruebas de disponibilidad,
licencia o cobertura del texto remoto.
"""
from __future__ import annotations
from collections import Counter
from datetime import date
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/classics-corpus"
TARGET = BASE / "indexation-roadmap-222.json"


def read(p):
    return json.loads((ROOT / p).read_text(encoding="utf-8"))


def classify(work, mapping, langs):
    original = work.get("language")
    has_original = original in langs
    has_translation = any(x not in ("la", "grc") for x in langs)
    candidates = mapping.get(work["id"], [])
    urns = [item.get("obra", "") for item in candidates]
    canonical = [s for s in urns if re.fullmatch(
        r"(?:tlg\d{4}|phi\d{4}|stoa\d{4})\.(?:tlg\d{3}|phi\d{3}|stoa\d{3}|abo\d{3})", s)]
    if has_original:
        source_reason = "original_local_documentado"
    elif len(candidates) > 1:
        source_reason = "correspondencia_bibliografica_ambigua"
    elif len(candidates) == 1 and len(canonical) == 1:
        source_reason = "tei_perseus_candidato_por_verificar"
    elif candidates:
        source_reason = "requiere_fuente_no_canonica_o_edicion_especifica"
    else:
        source_reason = "sin_fuente_en_mapa_perseus"

    if has_original and has_translation:
        state = "original_y_traduccion_local"
    elif has_original:
        state = "original_sin_traduccion_local"
    else:
        state = "original_pendiente"

    return dict(id=work["id"], author=work.get("author"), title=work.get("title"),
                originalLanguage=original, dating=work.get("dating"),
                indexedLanguages=sorted(langs),
                originalIndexed=has_original, translationHosted=has_translation,
                state=state, sourceReadiness=source_reason,
                bibliographyCandidateUrns=urns,
                translationSourceClaim=bool(any(c.get("translation") for c in candidates)))


def main():
    catalog = read("data/bibliotheca-graeca-latina-I-bce-I-ce.json")["works"]
    registry = read("data/classics-corpus/search-registry.json")["entries"]
    mapping = read("data/bibliotheca-perseus.json")["links"]
    source_coverage = read("data/classics-corpus/translation-availability-222.json")
    langs_by_id = {}
    for e in registry:
        langs_by_id.setdefault(e["workId"], set()).add(e["language"])
    ids = {w["id"] for w in catalog}
    assert len(ids) == len(catalog) == 222, "Catalog must contain exactly 222 unique works"
    assert set(langs_by_id) <= ids, "Search registry has an unlisted work"
    entries = [classify(w, mapping, langs_by_id.get(w["id"], set())) for w in catalog]
    counts = Counter(w["state"] for w in entries)
    readiness = Counter(w["sourceReadiness"] for w in entries if not w["originalIndexed"])
    indexed = sum(w["originalIndexed"] for w in entries)
    translated = sum(w["translationHosted"] for w in entries)
    public = source_coverage["totals"]
    assert indexed == public["originalTextIndexed"], (indexed, public["originalTextIndexed"])
    assert translated == public["translatedWorksLocal"], (translated, public["translatedWorksLocal"])
    assert indexed == len(langs_by_id), "Registry claims inconsistent original-language coverage"
    doc = {
        "schema": "vitruvius-classics-indexation-roadmap-v1",
        "updated": date.today().isoformat(),
        "method": ("Counts from hosted edition paths only. A catalogue entry or external Perseus "
                   "mapping never counts as indexed text or a hosted translation. "
                   "No AI-supplied passages, unverified OCR, or assumed cross-language alignment."),
        "targetWorks": 222,
        "counts": {
            "originalsIndexed": indexed,
            "originalsMissing": len(entries)-indexed,
            "worksWithHostedTranslation": translated,
            "worksMissingTranslation": len(entries)-translated,
            "textVersions": len(registry),
            "states": dict(sorted(counts.items())),
            "sourceReadinessForMissingOriginals": dict(sorted(readiness.items())),
        },
        "items": entries,
    }
    TARGET.write_text(json.dumps(doc, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(doc["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
