#!/usr/bin/env python3
"""Gate new Greek translations: provenance, full-text index and verified Greek/translation locus mapping.

Usage: python3 scripts/validate_greek_translation_sync.py <translation-json> ...
The importer must not publish unaligned translations as synchronized.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = json.loads((ROOT / "data/classics-corpus/search-registry.json").read_text(encoding="utf-8"))
ENTRIES = REGISTRY.get("entries", [])

def check(filename):
    p = Path(filename)
    data = json.loads(p.read_text(encoding="utf-8"))
    work_id, lang = data.get("workId"), data.get("language")
    if lang not in ("en", "es", "fr"):
        raise ValueError(f"{p}: language is not an approved translation language")
    if not work_id or not any(e.get("workId") == work_id and e.get("language") == "grc" for e in ENTRIES):
        raise ValueError(f"{p}: corresponding indexed Greek original is missing")
    if not data.get("source") or not data.get("sourceSha256") or not data.get("attribution"):
        raise ValueError(f"{p}: missing source provenance, digest or attribution")
    passages = data.get("passages")
    if not isinstance(passages, list) or len(passages) < 2:
        raise ValueError(f"{p}: no indexed translation passages")
    seen = set()
    for item in passages:
        locus, text = item.get("locus"), item.get("text")
        if not isinstance(locus, str) or not locus or locus in seen:
            raise ValueError(f"{p}: duplicate or missing translation locus")
        if not isinstance(text, str) or len(text.strip()) < 10:
            raise ValueError(f"{p}: empty indexed translation")
        seen.add(locus)
    # An ordinal segment number is never evidence of cross-edition equivalence.
    alignment = data.get("verifiedAlignment")
    if not isinstance(alignment, dict) or alignment.get("status") != "verified":
        raise ValueError(f"{p}: synchronization unverified; retain as acquisition candidate, do not publish as aligned")
    mappings = alignment.get("mappings")
    if not isinstance(mappings, list) or len(mappings) != len(passages):
        raise ValueError(f"{p}: incomplete explicit alignment map")
    original_entry = next(e for e in ENTRIES if e.get("workId") == work_id and e.get("language") == "grc")
    source_path = original_entry.get("path", "")
    if not source_path.startswith("data/"):
        raise ValueError(f"{p}: original hosted externally; alignment cannot be verified locally")
    original_data = json.loads((ROOT / source_path).read_text(encoding="utf-8"))
    greek_loci = {x.get("locus") for x in original_data.get("passages", [])}
    linked = set()
    for pair in mappings:
        t, greek = pair.get("translationLocus"), pair.get("greekLoci")
        if t not in seen or t in linked or not isinstance(greek, list) or not greek:
            raise ValueError(f"{p}: incomplete or duplicate translation mapping")
        if any(g not in greek_loci for g in greek):
            raise ValueError(f"{p}: alignment references nonexistent Greek locus")
        linked.add(t)
    if linked != seen:
        raise ValueError(f"{p}: not every translation passage is synchronized")
    print(f"VALID: {work_id} {lang}: {len(passages)} indexed and explicitly mapped segments")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: validate_greek_translation_sync.py translation.json [...]")
    try:
        for filename in sys.argv[1:]:
            check(filename)
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        sys.exit(f"FAIL: {exc}")
