#!/usr/bin/env python3
"""Synchronize derived classical coverage metadata from registered editions.

Registry counts include separately declared R2 index entries for compatibility.
Verified local files are counted separately; remote availability is NOT assumed.
Does not alter source passages or editorial provenance.
"""
import json
from collections import Counter
from datetime import datetime, timezone
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
    verified_local = {}
    declared_remote = {}
    for edition in registry["entries"]:
        path = edition["path"]
        remote = path.startswith(("https://", "http://"))
        if not remote and not (ROOT / path).is_file():
            raise SystemExit("Missing locally registered text: " + path)
        indexed.setdefault(edition["workId"], set()).add(edition["language"])
        if not remote:
            verified_local.setdefault(edition["workId"], set()).add(edition["language"])
        else:
            declared_remote.setdefault(edition["workId"], set()).add(edition["language"])
    by_id = {w["id"]: w for w in catalog}
    assert len(by_id) == len(catalog), "Duplicated catalog identifiers"
    assert set(indexed) <= set(by_id), "Uncatalogued local edition"
    rows = {w["id"]: w for w in coverage["works"]}
    assert len(rows) == len(coverage["works"]), "Duplicated coverage identifiers"
    assert set(rows) == set(by_id), "Coverage rows and catalog must match"
    for work_id, item in rows.items():
        languages = indexed.get(work_id, set())
        local_languages = verified_local.get(work_id, set())
        remote_languages = declared_remote.get(work_id, set())
        original = by_id[work_id]["language"]
        item["originalIndexed"] = original in {"la", "grc"} and original in local_languages
        item["originalR2Registered"] = original in {"la", "grc"} and original in remote_languages
        item["registeredOriginal"] = original in {"la", "grc"} and original in languages
        item["translationLanguages"] = sorted(local_languages & TRANSLATIONS)
        # Compatibility field consumed by existing readers: project-registered
        # languages include own R2. Keep actual local files explicit separately.
        item["localEditionLanguages"] = sorted(languages)
        item["verifiedLocalEditionLanguages"] = sorted(local_languages)
        item["registeredEditionLanguages"] = sorted(languages)
        item["remoteEditionLanguages"] = sorted(remote_languages)
        for source_key, target_key in [("author", "author"), ("title", "title"),
                                       ("language", "originalLanguage"), ("publicStatus", "readingStatus")]:
            item[target_key] = by_id[work_id].get(source_key, item.get(target_key))
    totals = coverage["totals"]
    totals["cataloguedWorks"] = len(catalog)
    totals["locallyIndexedWorks"] = len(indexed)
    totals["verifiedLocalFileWorks"] = len(verified_local)
    totals["declaredRemoteOnlyWorks"] = len(set(indexed) - set(verified_local))
    totals["translatedWorksLocal"] = sum(bool(w["translationLanguages"]) for w in coverage["works"])
    totals["worksWithoutHostedTranslation"] = len(catalog) - totals["translatedWorksLocal"]
    totals["originalTextIndexed"] = sum(bool(w["originalIndexed"]) for w in coverage["works"])
    totals["originalTextNotIndexed"] = len(catalog) - totals["originalTextIndexed"]
    totals["declaredR2OriginalWorks"] = sum(w["originalR2Registered"] for w in coverage["works"])
    totals["registeredOriginalWorks"] = sum(w["registeredOriginal"] for w in coverage["works"])
    totals["registeredTextVersions"] = len(registry["entries"])
    totals["verifiedLocalTextVersions"] = sum(not e["path"].startswith(("https://", "http://")) for e in registry["entries"])
    totals["verifiedLocalOriginalTextIndexed"] = sum(
        by_id[wid]["language"] in languages for wid, languages in verified_local.items()
    )
    totals["localTranslationLanguages"] = {
        language: sum(language in w["translationLanguages"] for w in coverage["works"])
        for language in ("es", "en", "fr")
    }
    coverage["generated"] = datetime.now(timezone.utc).date().isoformat()
    coverage["basis"] = (
        "Cálculo a partir de works[] y search-registry.json. Los campos de compatibilidad "
        "locallyIndexedWorks y localEditionLanguages incluyen índices registrados en R2. "
        "originalIndexed y verifiedLocalEditionLanguages solo cuentan archivos locales. "
        "originalR2Registered identifica declaraciones remotas; no certifica disponibilidad HTTP ni cotejo."
    )
    COVERAGE.write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    audit_path = ROOT / "data/classics-corpus/coverage-audit.json"
    audit = load(audit_path)
    witnesses = load(ROOT / "data/bibliotheca-testimonia-verified.json")["records"]
    for row in audit["works"]:
        work_id = row["id"]
        row["catalogueStatus"] = by_id[work_id]["publicStatus"]
        row["title"] = by_id[work_id]["title"]
        row["author"] = by_id[work_id]["author"]
        row["originalLanguage"] = by_id[work_id]["language"]
        row["indexedTextLanguages"] = sorted(indexed.get(work_id, set()))
        row["indexedTextFiles"] = sorted({e["path"] for e in registry["entries"] if e["workId"] == work_id})
        row["manuscriptRecords"] = sum(work_id in r.get("workIds", []) for r in witnesses)
        row["hasManuscriptRecord"] = bool(row["manuscriptRecords"])
    audit["counts"].update(cataloguedWorks=len(catalog),
        catalogueStatuses=dict(Counter(w["publicStatus"] for w in catalog)),
        locallyReadableClaims=sum(w["publicStatus"].startswith("lectura-local-") for w in catalog),
        indexedTextVersions=len(registry["entries"]), indexedDistinctWorks=len(indexed),
        manuscriptWitnesses=len(witnesses))
    audit["date"] = coverage["generated"]
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(totals, ensure_ascii=False))

if __name__ == "__main__":
    main()
