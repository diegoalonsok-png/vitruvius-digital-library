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
    # Auditar TODAS las traducciones nuevas de Perseus; no sólo los tres
    # ejemplos iniciales. Esto detecta archivos parciales y fichas infladas.
    automated = 0
    for edition in registry["entries"]:
        if edition.get("language") != "en" or edition.get("format") != "json-passages":
            continue
        document = read(edition["path"])
        source_type = document.get("sourceType")
        if source_type not in {"historical-english-perseus-tei", "historical-english-first1k-tei"}:
            continue
        work_id = edition["workId"]
        assert document["workId"] == work_id and document["language"] == "en"
        assert document["originalLanguage"] in {"grc", "la"}
        assert document.get("translator") and document.get("editionYear")
        prefix = ("https://raw.githubusercontent.com/OpenGreekAndLatin/First1KGreek/"
                  if source_type == "historical-english-first1k-tei" else
                  "https://raw.githubusercontent.com/PerseusDL/")
        assert document["source"].startswith(prefix), "Traducción sin procedencia válida: " + work_id
        assert len(document["sourceGitBlobSha"]) == 40
        assert len(document["sourceSha256"]) == 64
        assert document["license"].startswith("CC BY-SA 4.0")
        assert document["alignmentStatus"] == "unaligned"
        assert document.get("passages"), "No indexed text for " + work_id
        assert len(document["passages"]) == document["coverage"]["passages"]
        assert sum(len(p["text"]) for p in document["passages"]) == document["coverage"]["chars"]
        assert len({p["locus"] for p in document["passages"]}) == len(document["passages"])
        assert all(p["text"].strip() and p["locus"] for p in document["passages"])
        assert any(e["workId"] == work_id and e["language"] == document["originalLanguage"]
                   for e in registry["entries"]), "Missing original: " + work_id
        assert by_id[work_id]["corpusFiles"]["en"] == edition["path"]
        assert "en" in translation_by_id[work_id]["translationLanguages"]
        assert "en" in audit_by_id[work_id]["indexedTextLanguages"]
        assert edition["path"] in audit_by_id[work_id]["indexedTextFiles"]
        automated += 1
    print("PASS historical translations: 3 pioneering texts with editorial notes; "
          f"{automated} verified Perseus/First1K historical versions, originals preserved, "
          "reproducible loci and provenance, registries coherent.")


if __name__ == "__main__":
    verify()
