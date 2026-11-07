#!/usr/bin/env python3
"""Generate *unverified* OCR page navigation candidates from exact Latin anchors.

Krohn/Rose page numbers are not canonical De architectura loci. This script
does not align texts philologically; it marks conservative navigation candidates
for editorial review and leaves every source document untouched.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / "data/structured/recensio-es.json"
SOURCES = {
    "krohn": ROOT / "data/text/krohn-1912.json",
    "rose": ROOT / "data/text/rose-1899.json",
}
OUTPUT = ROOT / "data/text/krohn-rose-locus-candidates.json"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower().replace("j", "i").replace("v", "u")
    return " ".join(re.sub(r"[^a-z\s]", " ", value).split())


def anchors(value: str) -> list[str]:
    words = [w for w in normalize(value).split() if len(w) > 3]
    if len(words) < 12:
        return []
    offsets = (0, max(0, len(words) // 2 - 2), max(0, len(words) - 5))
    return list(dict.fromkeys(
        segment for i in offsets
        if len(segment := " ".join(words[i:i + 5])) >= 26
    ))


def main():
    structured = json.loads(ORIGINAL.read_text(encoding="utf-8"))["passages"]
    entries = []
    counts = {}
    for edition, path in SOURCES.items():
        ocr_pages = json.loads(path.read_text(encoding="utf-8"))
        pages = [(int(p["page"]), normalize(p.get("text", ""))) for p in ocr_pages]
        confident = ambiguous = unmatched = 0
        for passage in structured:
            query = anchors(passage.get("latin", ""))
            if not query:
                unmatched += 1
                continue
            hits = []
            for page, normalized_ocr in pages:
                n = sum(a in normalized_ocr for a in query)
                if n:
                    hits.append({"page": page, "anchorsMatched": n})
            hits.sort(key=lambda x: -x["anchorsMatched"])
            accepted = len(hits) == 1 or (
                len(hits) > 1 and hits[0]["anchorsMatched"] >= 2
                and hits[0]["anchorsMatched"] > hits[1]["anchorsMatched"]
            )
            if accepted:
                best = hits[0]
                entries.append({
                    "edition": edition,
                    "locus": str(passage["locus"]),
                    "page": best["page"],
                    "anchorsMatched": best["anchorsMatched"],
                    "anchorsChecked": len(query),
                    "method": "normalized-exact-five-word-anchor",
                    "status": "machine-candidate-not-verified",
                })
                confident += 1
            elif hits:
                ambiguous += 1
            else:
                unmatched += 1
        counts[edition] = {
            "candidates": confident, "ambiguous": ambiguous,
            "unmatched": unmatched
        }
    output = {
        "schema": "vitruvia-ocr-locus-candidates-v1",
        "sourceEdition": "data/structured/recensio-es.json",
        "ocrSources": {
            name: str(path.relative_to(ROOT)) for name, path in SOURCES.items()
        },
        "method": (
            "Tokenize Latin V514 and OCR pages, fold diacritics, i/j and u/v; "
            "seek up to three distinct verbatim five-word anchors of >=26 chars; "
            "accept only unique page, or unique page with at least two anchors. "
            "Reject ambiguous matches. No semantic or philological verification."
        ),
        "warning": (
            "Machine candidate for navigation only: identical normalized text "
            "fragments are not proof of an aligned locus or equivalent edition. "
            "Do not silently synchronize pages without an explicit opt-in."
        ),
        "counts": counts,
        "entries": entries,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
