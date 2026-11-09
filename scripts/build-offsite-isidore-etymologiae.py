#!/usr/bin/env python3
"""Derived, provenance-aware full-text search index for Isidore's 20 Etymologiae books.

The Latin transcription is The Latin Library, mirrored by CLTK. Neither a
manuscript collation nor a verified critical edition is asserted. The corpus
is stored outside GitHub Pages; Vitruvius codices/folios/master texts remain
untouched. No original file is rewritten, translated, or silently omitted.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = "https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/"
WORK_ID = "isidore-etymologiae"
BRANCH = "corpus-originales-latinos-20261108"
FILES = tuple(f"isidore/{i}.txt" for i in range(1, 21))
HEADING = re.compile(
    r"ISIDORI HISPALENSIS EPISCOPI ETYMOLOGIARUM SIVE ORIGINUM LIBER\s+"
    r"(XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b"
)
FOOTER = "Isidore of Seville"
SPACES = re.compile(r"\s+")
TARGET_SIZE = 720
MAX_SIZE = 880


def download(path: str, limit: int = 130_000) -> bytes:
    if path not in (*FILES, "LICENSE.md"):
        raise ValueError("Unexpected source: " + path)
    with urlopen(Request(ROOT + path, headers={
        "User-Agent": "VitruviusDigitalLibrary-LatinSourceIndexer/1.0"
    }), timeout=60) as reply:
        if reply.status != 200:
            raise ValueError("Source unavailable: " + path)
        original = reply.read(limit + 1)
    if len(original) > limit or not original:
        raise ValueError("Missing or oversized original transcription: " + path)
    return original


def roman(n: int) -> str:
    tens = "X" * (n // 10)
    units = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][n % 10]
    return tens + units


def source_body(raw: bytes, number: int) -> tuple[str, str]:
    source = raw.decode("utf-8-sig")
    match = HEADING.search(source)
    if match is None or match.group(1) != roman(number):
        raise ValueError("Incorrect Isidore title/book number: " + str(number))
    end = source.rfind(FOOTER)
    if end <= match.end() or "The Latin Library" not in source[end:]:
        raise ValueError("Missing source signature: " + str(number))
    original = SPACES.sub(" ", source[match.end():end]).strip()
    if len(original) < 17_000 or len(original) > 120_000:
        raise ValueError("Unexpected content length: " + str(number))
    return original, match.group(0)


def segment_preserving_words(text: str, book: int) -> list[dict]:
    """Split only at spaces and prove exact reconstruction of normalized source."""
    result = []
    rest = text
    while rest:
        if len(rest) <= MAX_SIZE:
            piece, rest = rest, ""
        else:
            split = rest.rfind(" ", 400, TARGET_SIZE)
            if split == -1:
                raise ValueError("No safe segmentation boundary")
            piece, rest = rest[:split], rest[split + 1:]
        if not piece:
            raise ValueError("Empty Isidore segment")
        result.append({
            "locus": f"liber{book}.segmentum{len(result)+1}",
            "book": book,
            "locusKind": (
                "Digital technical segment; not an attested manuscript folio, "
                "original chapter number, or critical edition locus"
            ),
            "text": piece,
        })
    if " ".join(p["text"] for p in result) != text:
        raise ValueError("Text lost or reordered in technical segmentation")
    if len(result) < 18:
        raise ValueError("Unusually few sections for book " + str(book))
    return result


def build(output: Path) -> None:
    license_text = download("LICENSE.md", 20_000).decode("utf-8")
    if "Public Domain Mark 1.0" not in license_text:
        raise ValueError("Source licensing status could not be verified")
    catalog = json.loads(
        Path("data/bibliotheca-graeca-latina-I-bce-I-ce.json").read_text("utf-8")
    )
    work = next((item for item in catalog["works"] if item["id"] == WORK_ID), None)
    if not work or work["language"] != "la":
        raise ValueError("Isidore's Latin bibliography is absent from the catalog")

    originals = []
    source_parts = []
    passages = []
    for n, path in enumerate(FILES, 1):
        raw = download(path)
        original, heading = source_body(raw, n)
        units = segment_preserving_words(original, n)
        passages.extend(units)
        originals.append(raw)
        source_parts.append({
            "book": n, "file": path,
            "source": ROOT + path,
            "sourceSha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw), "segments": len(units),
            "titleTranscribed": heading,
            "normalizedTextSha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
        })

    if len(source_parts) != 20 or len(passages) < 1300:
        raise ValueError("Incomplete 20-book extraction")
    if sum(len(x["text"]) for x in passages) < 900_000:
        raise ValueError("Not enough textual material to claim a full corpus")
    if len({x["locus"] for x in passages}) != len(passages):
        raise ValueError("Duplicate technical locator")

    digest = hashlib.sha256(b"\x00".join(originals)).hexdigest()
    attribution = (
        "Isidorus Hispalensis, Etymologiae (Origines), twenty Latin books; "
        "digital transcriptions at The Latin Library, mirrored by CLTK, "
        "https://github.com/cltk/lat_text_latin_library/tree/master/isidore. "
        "Underlying print edition and manuscript witnesses not specified; "
        "not a critical edition, autoptic collation, or aligned translation."
    )
    indexed = {
        "schema": "vitruvius-offsite-latin-original-v1",
        "workId": WORK_ID, "language": "la",
        "title": work["title"], "author": work["author"],
        "source": ROOT + FILES[0], "sourceParts": source_parts,
        "sourceSha256": digest, "sourceLicense": ROOT + "LICENSE.md",
        "attribution": attribution,
        "manuscriptCollated": False,
        "editorialStatus": (
            "Public-domain Latin digital transcription, without verified edition "
            "or manuscript apparatus; whitespace normalized only for search"
        ),
        "alignment": (
            "Twenty numbered books. Search segments are technical only; "
            "no fabricated ancient chapters, folios, translation alignment, "
            "or manuscript witness associations."
        ),
        "passages": passages,
    }

    output.mkdir(parents=True, exist_ok=True)
    raw_doc = (json.dumps(indexed, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    if len(raw_doc) > 2_500_000:
        raise ValueError("Derived index too big; external source must remain small")
    name = WORK_ID + "-la.json"
    (output / name).write_bytes(raw_doc)

    item = {
        "workId": WORK_ID, "author": work["author"], "title": work["title"],
        "language": "la", "path": "data/offsite-latin/" + name,
        "source": indexed["source"], "sourceParts": source_parts,
        "sourceSha256": digest, "attribution": attribution,
        "passages": len(passages), "books": len(source_parts),
        "bytes": len(raw_doc), "editorialStatus": indexed["editorialStatus"],
    }
    manifest = {
        "schema": "vitruvius-offsite-latin-isidore-supplement-v1",
        "branch": BRANCH, "count": 1, "entries": [item],
        "policy": "Append-only derived index outside Pages; all codices, folios, master files untouched",
    }
    (output / "isidore-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8"
    )
    print(json.dumps({
        "indexedWorks": 1, "books": 20, "passages": len(passages),
        "bytes": len(raw_doc),
    }, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    build(Path(parser.parse_args().output))
