#!/usr/bin/env python3
"""Create two provenance-led Latin *derived* indexes, not critical editions.

- Velleius Paterculus, Historia Romana, books I-II (chapter labels in source).
- Frontinus-attributed opuscula gromatica (three individually named texts).

Read the public-domain CLTK mirror of The Latin Library. Preserve ALL
Vitruvian codices, folios, manuscripts, PDF/DOCX, site design and master texts.
Publish only searchable JSON on the separate, non-Pages Latin branch.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = "https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/"
BRANCH = "corpus-originales-latinos-20261108"
FILES = {
    "velleius-historia": ("vell1.txt", "vell2.txt"),
    "frontinus-gromatica": (
        "frontinus/qualitate.txt", "frontinus/contro.txt", "frontinus/lim.txt",
    ),
}
TITLE_MARKER = "C. VELLEI PATERCULI HISTORIAE ROMANAE LIBRI DUO"
CHAPTER = re.compile(r"(?m)^[ \t]*\[[ \t]*([0-9]{1,3})[ \t]*\][ \t]*")
FRONT_TITLES = ("DE AGRORUM QUALITATE", "DE CONTROVERSIIS", "DE LIMITIBUS")
WS = re.compile(r"\s+")


def download(path: str, limit: int = 240_000) -> bytes:
    if path not in (*FILES["velleius-historia"], *FILES["frontinus-gromatica"], "LICENSE.md"):
        raise ValueError("Unauthorized source file: " + path)
    request = Request(ROOT + path, headers={
        "User-Agent": "VitruviusDigitalLibrary-ProvenanceLatinIndexer/1.0"
    })
    with urlopen(request, timeout=60) as response:
        if response.status != 200:
            raise ValueError("Source HTTP error for " + path)
        data = response.read(limit + 1)
    if len(data) > limit or not data:
        raise ValueError("Empty/oversized source file: " + path)
    return data


def details(path: str, original: bytes, units: int) -> dict:
    return {
        "file": path,
        "source": ROOT + path,
        "bytes": len(original),
        "sourceSha256": hashlib.sha256(original).hexdigest(),
        "segments": units,
    }


def velleius_book(raw: bytes, book: int) -> list[dict]:
    text = raw.decode("utf-8-sig")
    header = text.find(TITLE_MARKER)
    footer = text.rfind("The Latin Library")
    ending = text.rfind("Velleius", 0, footer)
    if header < 0 or footer < 0 or ending < header:
        raise ValueError("Unexpected Velleius source header/footer")
    book_label = "LIBER PRIOR" if book == 1 else "LIBER POSTERIOR"
    if book_label not in text[header:header + 130]:
        raise ValueError("Wrong Velleius book identification")
    body = text[header:ending]
    markers = list(CHAPTER.finditer(body))
    expected = 18 if book == 1 else 131
    labels = [int(m.group(1)) for m in markers]
    if labels != list(range(1, expected + 1)):
        raise ValueError("Chapter labels missing or out of order in book " + str(book))
    result = []
    for i, marker in enumerate(markers):
        stop = markers[i + 1].start() if i + 1 < len(markers) else len(body)
        passage = WS.sub(" ", body[marker.end():stop]).strip()
        if len(passage) < 35:
            raise ValueError("Unexpectedly short Velleius chapter")
        result.append({
            "locus": f"liber{book}.caput{labels[i]}",
            "chapterLabelTranscribed": labels[i],
            "locusKind": "Source chapter label; not a manuscript-collated reference",
            "text": passage,
        })
    return result


def frontinus_treatise(raw: bytes, file: str, title: str, number: int) -> list[dict]:
    text = raw.decode("utf-8-sig")
    title_idx = text.find(title)
    footer = text.rfind("The Latin Library")
    ending = text.rfind("Frontinus", 0, footer)
    if title_idx < 0 or footer < 0 or ending < title_idx:
        raise ValueError("Missing titled source / footer: " + file)
    complete = WS.sub(" ", text[title_idx + len(title):ending]).strip()
    if len(complete) < 1900:
        raise ValueError("Source text too short: " + file)
    # Technical, content-preserving segments: never label them as critical loci.
    parts = []
    remainder = complete
    while len(remainder) > 900:
        split = remainder.rfind(" ", 350, 850)
        if split <= 0:
            raise ValueError("Cannot segment source without touching characters")
        parts.append(remainder[:split])
        remainder = remainder[split + 1:]
    if remainder:
        parts.append(remainder)
    if " ".join(parts) != complete:
        raise ValueError("Frontinus text loss during segmentation")
    if len(parts) < 3:
        raise ValueError("Insufficient source-derived segments: " + file)
    return [
        {
            "locus": f"opusculum{number}.segmentum{index}",
            "treatiseTitleTranscribed": title,
            "locusKind": "Technical sequential passage, not a verified critical locus",
            "text": segment,
        }
        for index, segment in enumerate(parts, 1)
    ]


def build(output: Path) -> None:
    license_text = download("LICENSE.md", 20_000).decode("utf-8")
    if "Public Domain Mark 1.0" not in license_text:
        raise ValueError("Cannot verify source licensing statement")
    catalogue = json.loads(Path(
        "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
    ).read_text("utf-8"))
    work_map = {w["id"]: w for w in catalogue["works"]}
    output.mkdir(parents=True, exist_ok=True)
    entries = []
    for work_id, filenames in FILES.items():
        work = work_map.get(work_id)
        if not work or work.get("language") != "la":
            raise ValueError("No identified Latin catalogue record for " + work_id)
        raws = [download(path) for path in filenames]
        passages, parts = [], []
        for n, (path, raw) in enumerate(zip(filenames, raws), 1):
            if work_id == "velleius-historia":
                units = velleius_book(raw, n)
            else:
                units = frontinus_treatise(raw, path, FRONT_TITLES[n - 1], n)
            passages.extend(units)
            parts.append(details(path, raw, len(units)))
        if work_id == "velleius-historia" and len(passages) != 149:
            raise ValueError("Velleius should contain 149 source chapters")
        if work_id == "frontinus-gromatica" and len(passages) < 12:
            raise ValueError("Frontinus components not fully indexed")
        if len({p["locus"] for p in passages}) != len(passages):
            raise ValueError("Duplicate local passage identifier")
        chars = sum(len(p["text"]) for p in passages)
        if chars < (170_000 if work_id == "velleius-historia" else 11_000):
            raise ValueError("Unexpectedly little textual content for " + work_id)
        checksum = hashlib.sha256(b"\x00".join(raws)).hexdigest()
        attribution = (
            f'{work["author"]}, {work["title"]}. Latin transcription at '
            f'The Latin Library, mirrored by CLTK/lat_text_latin_library. '
            "The underlying print edition and manuscript witnesses are not "
            "identified; texts are not a critically collated recension. "
            f'{ROOT + filenames[0]}'
        )
        book = {
            "schema": "vitruvius-offsite-latin-original-v1",
            "workId": work_id,
            "language": "la", "author": work["author"], "title": work["title"],
            "source": ROOT + filenames[0],
            "sourceParts": parts,
            "sourceSha256": checksum,
            "sourceLicense": ROOT + "LICENSE.md",
            "attribution": attribution,
            "editorialStatus": (
                "Documented digital transcription, not a verified critical edition; "
                "source variants and manuscript attribution require scholarly review"
            ),
            "manuscriptCollated": False,
            "alignment": (
                "Source chapter labels where present; other divisions are technical "
                "segments only. No invented cross-edition or translation equivalence."
            ),
            "passages": passages,
        }
        rendered = (json.dumps(book, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        if len(rendered) > 2_500_000:
            raise ValueError("Derived index too large")
        filename = work_id + "-la.json"
        (output / filename).write_bytes(rendered)
        entries.append({
            "workId": work_id, "author": work["author"], "title": work["title"],
            "language": "la", "path": "data/offsite-latin/" + filename,
            "source": book["source"], "sourceParts": parts,
            "sourceSha256": checksum, "attribution": attribution,
            "passages": len(passages), "bytes": len(rendered),
            "editorialStatus": book["editorialStatus"],
        })
    manifest = {
        "schema": "vitruvius-offsite-latin-two-works-supplement-v1",
        "branch": BRANCH, "count": len(entries), "entries": entries,
        "policy": "Append-only derived Latin passages; no Vitruvian codices, folios, source files or visual redesign",
    }
    (output / "two-works-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8"
    )
    print(json.dumps({
        "indexedWorks": len(entries),
        "passages": {x["workId"]: x["passages"] for x in entries},
        "bytes": sum(x["bytes"] for x in entries),
    }, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    build(Path(parser.parse_args().output))
