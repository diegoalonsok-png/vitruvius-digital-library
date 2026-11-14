#!/usr/bin/env python3
"""Synchronize derived classical coverage metadata from registered editions.

Only local, existing files count as hosted texts. Remote R2 declarations are
not assumed verified. Does not alter source passages or editorial provenance.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
CATALOG = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
COVERAGE = ROOT / "data/classics-corpus/translation-availability-222.json"
TRANSLATIONS = {"en", "es", "fr"}

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def main():
    registry = load(REGISTRY)
    catalog = load(CATALOG)["works"]
    coverage = load(COVERAGE)
    indexed = {}
    for edition in registry["entries"]:
        path = edition["path"]
        if path.startswith(("https://", "http://")):
            # R2 URLs must be checked separately, not counted as local holdings.
            continue
        if not (ROOT / path).is_file():
            raise SystemExit("Missing locally registered text: " + path)
        indexed.setdefault(edition["workId"], set()).add(edition["language"])
    by_id = {w["id"]: w for w in catalog}
    assert len(by_id) == len(catalog), "Duplicated catalog identifiers"
    assert set(indexed) <= set(by_id), "Uncatalogued local edition"
    rows = {w["id"]: w for w in coverage["works"]}
    assert len(rows) == len(coverage["works"]), "Duplicated coverage identifiers"
    assert set(rows) == set(by_id), "Coverage rows and catalog must match"
    for work_id, item in rows.items():
        languages = indexed.get(work_id, set())
        original = by_id[work_id]["language"]
        item["originalIndexed"] = original in languages
        item["translationLanguages"] = sorted(languages & TRANSLATIONS)
        item["localEditionLanguages"] = sorted(languages)
    totals = coverage["totals"]
    totals["cataloguedWorks"] = len(catalog)
    totals["locallyIndexedWorks"] = len(indexed)
    totals["translatedWorksLocal"] = sum(bool(w["translationLanguages"]) for w in coverage["works"])
    totals["worksWithoutHostedTranslation"] = len(catalog) - totals["translatedWorksLocal"]
    totals["originalTextIndexed"] = sum(bool(w["originalIndexed"]) for w in coverage["works"])
    totals["originalTextNotIndexed"] = len(catalog) - totals["originalTextIndexed"]
    totals["localTranslationLanguages"] = {
        language: sum(language in w["translationLanguages"] for w in coverage["works"])
        for language in ("es", "en", "fr")
    }
    COVERAGE.write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(totals, ensure_ascii=False))

if __name__ == "__main__":
    main()
