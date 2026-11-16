#!/usr/bin/env python3
"""Verify Conceptus postings correspond exactly to the versioned classical registry.

This is a read-only integrity gate: it never edits classics, OCR, R2 or editions.
An excluded edition remains visible in the ledger, not counted as indexed.
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
POSTINGS = ROOT / "data/classics-corpus/semantic-conceptus-postings.json"
ELIGIBLE = {"json-passages", "structured-bilingual", "html-text"}

def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    index = json.loads(POSTINGS.read_text(encoding="utf-8"))
    entries = registry["entries"]
    versions = index.get("versions", [])
    excluded = index.get("notIndexedFormats", [])
    assert index.get("schema") == "vitruvia-classics-semantic-postings-v1"
    assert not index.get("errors"), "Unverified or missing source files in static index"
    assert len(entries) == index["registryEditionCount"], "Stale registry/index editions count"
    assert sum(e["format"] in ELIGIBLE for e in entries) == index["eligibleEditions"], "Eligible edition total disagrees"
    assert len(versions) == index["indexedEditions"], "Postings metadata count disagrees"
    identity = lambda e, path: (e["workId"], e["language"], e[path], e.get("edition") or "")
    registry_keys = Counter(identity(e, "path") for e in entries)
    indexed_keys = Counter(identity(e, "source") for e in versions)
    assert all(n == 1 for n in indexed_keys.values()), "Duplicate indexed editions"
    assert not (indexed_keys - registry_keys), "Index contains editions not in the catalogue"
    excluded_paths = {e["path"] for e in excluded}
    justified = []
    for entry in entries:
        if entry["format"] in ELIGIBLE and not entry["path"].startswith(("http://", "https://")):
            if entry["format"] == "html-text" and entry["path"] in excluded_paths:
                justified.append(entry)
            else:
                assert indexed_keys[identity(entry, "path")] == registry_keys[identity(entry, "path")], (
                    "Missing local indexed edition: " + entry["path"]
                )
        elif entry["path"] not in excluded_paths:
            raise AssertionError("Excluded source absent from the documented ledger: " + entry["path"])
    assert len(versions) + len(excluded) == len(entries), (
        "Index plus exclusions must account for every catalogue entry"
    )
    report = {
        "catalogue_editions": len(entries),
        "indexed_editions": len(versions),
        "excluded_with_reasons": len(excluded),
        "eligible_editions": index["eligibleEditions"],
        "missing_local_editions": 0,
        "duplicate_index_editions": 0,
        "unindexed_anchored_html": 0,
        "invalid_sources": 0,
    }
    print(json.dumps(report, ensure_ascii=False))
    return report

if __name__ == "__main__":
    main()
