#!/usr/bin/env python3
"""Index Seneca's Naturales quaestiones as an attributed *derived* Latin text.

Read seven public-domain digital transcriptions from CLTK/The Latin Library.
Never modify an original source, Vitruvian codex, folio, master edition or PDF.
Technical segments are NOT manuscript-collated loci. All input bytes are hashed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = "https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/"
WORK_ID = "seneca-naturales"
BRANCH = "corpus-originales-latinos-20261108"
FILES = tuple(f"sen/sen.qn{i}.txt" for i in range(1, 8))
HEAD = "L. ANNAEI SENECAE QUAESTIONES NATURALES"
FOOT = "Seneca the Younger The Latin Library The Classics Page"
LABEL = re.compile(r"(?m)^[ \t]*\[([0-9]{1,3}(?:,[0-9]{1,3})?)\][ \t]*")


def download(path: str, limit: int = 120_000) -> bytes:
    if path not in (*FILES, "LICENSE.md"):
        raise ValueError("Unauthorized source: " + path)
    with urlopen(Request(ROOT + path, headers={
        "User-Agent": "VitruviusDigitalLibrary-Latin-DerivedIndexer/1.0"
    }), timeout=60) as reply:
        if reply.status != 200:
            raise ValueError("Source unavailable: " + path)
        raw = reply.read(limit + 1)
    if len(raw) > limit or not raw:
        raise ValueError("Source empty or beyond permitted size: " + path)
    return raw


def extract_book(raw: bytes, number: int) -> tuple[list[dict], dict]:
    source = raw.decode("utf-8-sig")
    first = source.find(HEAD)
    last = source.rfind(FOOT)
    if first < 0 or last <= first:
        raise ValueError("Unexpected source boundaries in book " + str(number))
    body = source[first:last]
    markers = list(LABEL.finditer(body))
    if len(markers) < 50:
        raise ValueError("Insufficient numbered sections in book " + str(number))
    heading = " ".join(body[:markers[0].start()].split())
    if HEAD not in heading or not re.search(r"\bLIBER\b", heading):
        raise ValueError("Unrecognized book heading " + str(number))
    if len(heading) > 180:
        raise ValueError("Unexpected unindexed preface text in book " + str(number))
    results: list[dict] = []
    for index, marker in enumerate(markers):
        end = markers[index + 1].start() if index + 1 < len(markers) else len(body)
        passage = " ".join(body[marker.end():end].split())
        if len(passage) < 9:
            raise ValueError("Empty/short numbered section: " + str(number))
        results.append({
            "locus": f"liber{number}.segmentum{index + 1}",
            "locusKind": "Technical digital segment, not a manuscript-collated locus",
            "sectionLabelTranscribed": marker.group(1),
            "text": passage,
        })
    if sum(len(p["text"]) for p in results) < 18_000:
        raise ValueError("Book text unexpectedly short: " + str(number))
    return results, {
        "book": number, "file": FILES[number - 1], "headingTranscribed": heading,
        "sections": len(results), "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw), "source": ROOT + FILES[number - 1],
    }


def build(output: Path) -> None:
    license_text = download("LICENSE.md").decode("utf-8")
    if "Public Domain Mark 1.0" not in license_text:
        raise ValueError("Source copyright statement is not as expected")
    catalog = json.loads(Path(
        "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
    ).read_text("utf-8"))
    works = {w["id"]: w for w in catalog["works"]}
    work = works.get(WORK_ID)
    if not work or work.get("language") != "la":
        raise ValueError("Missing corresponding Latin bibliographic record")
    raws = [download(path) for path in FILES]
    passages, parts = [], []
    for n, raw in enumerate(raws, 1):
        text, part = extract_book(raw, n)
        passages.extend(text)
        parts.append(part)
    if len(passages) < 850 or sum(len(p["text"]) for p in passages) < 285_000:
        raise ValueError("Incomplete collection: fewer than seven substantive books")
    if len({p["locus"] for p in passages}) != len(passages):
        raise ValueError("Duplicate technical locator")
    sha = hashlib.sha256(b"\x00".join(raws)).hexdigest()
    attribution = (
        "Lucius Annaeus Seneca, Naturales quaestiones, seven Latin transcriptions "
        "digitized by The Latin Library and mirrored in CLTK/lat_text_latin_library; "
        "underlying printed edition and manuscript witnesses not identified; "
        "not a collated critical edition. " + ROOT + FILES[0]
    )
    doc = {
        "schema": "vitruvius-offsite-latin-original-v1",
        "workId": WORK_ID, "author": work["author"], "title": work["title"],
        "language": "la", "source": ROOT + FILES[0], "sourceParts": parts,
        "sourceSha256": sha, "sourceLicense": ROOT + "LICENSE.md",
        "attribution": attribution, "manuscriptCollated": False,
        "editorialStatus": (
            "Public-domain Latin digital transcription, with documented source "
            "files; OCR and editorial variants are not certified"
        ),
        "alignment": (
            "Technical segments retain transcription labels; neither manuscript "
            "loci nor translation equivalences are asserted"
        ),
        "passages": passages,
    }
    output.mkdir(parents=True, exist_ok=True)
    raw_doc = (json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    if len(raw_doc) > 2_500_000:
        raise ValueError("Derived JSON too large")
    target = output / (WORK_ID + "-la.json")
    target.write_bytes(raw_doc)
    item = {
        "workId": WORK_ID, "author": work["author"], "title": work["title"],
        "language": "la", "path": "data/offsite-latin/" + target.name,
        "passages": len(passages), "bytes": len(raw_doc),
        "source": doc["source"], "sourceParts": parts,
        "sourceSha256": sha, "attribution": attribution,
        "editorialStatus": doc["editorialStatus"],
    }
    manifest = {
        "schema": "vitruvius-offsite-latin-naturales-supplement-v1",
        "branch": BRANCH, "count": 1, "entries": [item],
        "policy": "Append only; originals, Codex H, Vitruvian folios and source files untouched",
    }
    (output / "naturales-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8"
    )
    print(json.dumps({"indexedWorks": 1, "books": 7, "passages": len(passages),
                      "sourceFiles": len(parts), "bytes": len(raw_doc)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    build(Path(parser.parse_args().output))
