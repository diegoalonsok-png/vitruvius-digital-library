#!/usr/bin/env python3
"""Integrity gate: historical scholarly translations added only where originals exist.

Usage: python scripts/test-classics-historical-translations.py
All full-text claims mean complete coverage OF THE ATTRIBUTED TEI file, not an
independent manuscript collation or verified Greek-to-English locus pairing.
"""
from collections import Counter
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/classics-corpus"
WORKS = {
    "hesiod-theogony": {"original": "grc", "units": 216, "notes": 32, "translator": "Evelyn-White", "last": "translation-tei-line-985-1020"},
    "hesiod-works-days": {"original": "grc", "units": 179, "notes": 41, "translator": "Evelyn-White", "last": "translation-tei-line-815-825"},
    "tacitus-agricola": {"original": "la", "units": 46, "notes": 1, "translator": "Church", "last": "translation-tei-chapter-46"},
}


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def verify():
    registry = read("data/classics-corpus/search-registry.json")
    catalog = read("data/bibliotheca-graeca-latina-I-bce-I-ce.json")
    coverage = read("data/classics-corpus/translation-availability-222.json")
    audit = read("data/classics-corpus/coverage-audit.json")
    backlog = read("data/classics-corpus/indexation-backlog.json")
    by_id = {w["id"]: w for w in catalog["works"]}
    translation_by_id = {w["id"]: w for w in coverage["works"]}
    audit_by_id = {w["id"]: w for w in audit["works"]}
    back_by_id = {w["id"]: w for w in backlog["entries"]}
    counted = Counter(x["workId"] for x in registry["entries"])

    assert len(registry["entries"]) == registry["count"] == audit["counts"]["indexedTextVersions"]
    assert len(counted) == registry["works"] == coverage["totals"]["locallyIndexedWorks"]
    assert coverage["totals"]["translatedWorksLocal"] == sum(
        bool(w["translationLanguages"]) for w in coverage["works"]
    )
    assert coverage["totals"]["worksWithoutHostedTranslation"] == (
        len(coverage["works"]) - coverage["totals"]["translatedWorksLocal"]
    )
    for language in ["en", "es", "fr"]:
        assert coverage["totals"]["localTranslationLanguages"][language] == sum(
            language in w["translationLanguages"] for w in coverage["works"]
        )
    for work_id, criterion in WORKS.items():
        path = f"data/classics-corpus/{work_id}-en.json"
        doc = read(path)
        assert doc["workId"] == work_id and doc["language"] == "en"
        assert doc["coverage"]["unitsVerified"] == criterion["units"]
        assert doc["coverage"]["editorialNotesPreserved"] == criterion["notes"]
        assert doc["coverage"]["characters"] == sum(len(p["text"]) for p in doc["passages"])
        assert doc["passages"][-1]["locus"] == criterion["last"]
        assert len({p["locus"] for p in doc["passages"]}) == len(doc["passages"])
        assert all(p["text"].strip() for p in doc["passages"])
        assert sum(len(p.get("editorialNotes", [])) for p in doc["passages"]) == criterion["notes"]
        assert criterion["translator"] in doc["translator"]
        assert doc["alignmentStatus"] == "unaligned"
        assert "No alineado" in doc["alignment"]
        assert "Chicago" in doc["citationStyle"]
        assert doc["isbn"] is None, "No invented ISBN for historical translations"
        assert "raw.githubusercontent.com/PerseusDL/" in doc["source"]
        assert doc["sourceGitBlobSha"] and len(doc["sourceGitBlobSha"]) == 40
        assert doc["license"].startswith("CC BY-SA 4.0")
        assert any(e["workId"] == work_id and e["language"] == "en" and e["path"] == path
                   for e in registry["entries"])
        assert any(e["workId"] == work_id and e["language"] == criterion["original"]
                   for e in registry["entries"])
        assert by_id[work_id]["corpusFiles"]["en"] == path
        assert any(v["language"] == "en" and v["kind"] == "translation"
                   for v in by_id[work_id]["localVersions"])
        assert "en" in translation_by_id[work_id]["translationLanguages"]
        assert "en" in translation_by_id[work_id]["localEditionLanguages"]
        assert "en" in audit_by_id[work_id]["indexedTextLanguages"]
        assert path in audit_by_id[work_id]["indexedTextFiles"]
        assert "en" not in back_by_id[work_id]["missing"]
        assert "en" in back_by_id[work_id]["indexed"]
    print("PASS historical translations: 3 previously untranslated classics, 74 editorial notes, original preserved, provenance and Chicago 18, all three search registries coherent.")


if __name__ == "__main__":
    verify()
