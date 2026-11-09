#!/usr/bin/env python3
"""Preparar tres transcripciones latinas para un índice externo no destructivo.

La fuente es The Latin Library conservada por CLTK, Public Domain Mark 1.0.
No se presentan como ediciones críticas, códices, autógrafos ni loci cotejados.
No se alteran folios, Codex H, PDFs, DOCX, traducciones ni el sitio publicado.
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
SOURCES = (
    ("apuleius-de-deo-socratis", "apuleius/apuleius.deosocratis.txt", (), "APVLEI DE DEO SOCRATIS", 12),
    ("censorinus-die-natali", "censorinus.txt", (), "CENSORINI DE DIE NATALI LIBER AD Q. CAERELLIUM", 15),
    ("vegetius-epitoma", "vegetius1.txt", ("vegetius2.txt", "vegetius3.txt", "vegetius4.txt"),
     "FLAVI VEGETI RENATI VIRI INLUSTRIS COMITIS EPITOMA REI MILITARIS", 55),
)
SPACES = re.compile(r"\s+")
CHAPTER = re.compile(r"^\s*([IVXLCDM]{1,8})\.\s")


def download(path: str, limit: int = 400000) -> bytes:
    if ".." in path or "\\" in path or "?" in path or "#" in path:
        raise ValueError("Ruta de origen inesperada: " + path)
    with urlopen(Request(ROOT + path, headers={"User-Agent": "VitruviusOriginals/1.0"}),
                 timeout=60) as response:
        if response.status != 200:
            raise ValueError("Fuente no disponible: " + path)
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise ValueError("Fuente demasiado extensa: " + path)
    return raw


def split_book(raw: bytes, heading: str, book: int) -> list[dict]:
    source = raw.decode("utf-8-sig")
    blocks = [SPACES.sub(" ", part).strip()
              for part in re.split(r"\n[ \t]*\n+", source)]
    blocks = [s for s in blocks if s]
    start = next((i for i, block in enumerate(blocks) if heading in block.upper()), None)
    if start is None:
        raise ValueError("No se encontró el encabezado de la obra")
    blocks = blocks[start + 1:]
    stop = next((i for i, block in enumerate(blocks)
                 if "the latin library" in block.lower()), len(blocks))
    blocks = blocks[:stop]
    if len(blocks) < 5:
        raise ValueError("Extracción insuficiente de bloques")
    result = []
    for ordinal, text in enumerate(blocks, 1):
        chapter = CHAPTER.match(text)
        result.append({
            "locus": f"liber{book}.segmentum{ordinal}",
            "locusKind": "Segmento técnico del archivo de procedencia; no locus crítico cotejado",
            "chapterLabelTranscribed": chapter.group(1) if chapter else None,
            "text": text,
        })
    if sum(len(p["text"]) for p in result) < 12000:
        raise ValueError("Extracción de texto anormalmente breve")
    return result


def main(output: Path) -> None:
    license_text = download("LICENSE.md", 120000).decode("utf-8")
    if "Public Domain Mark 1.0" not in license_text:
        raise ValueError("No se pudo comprobar la declaración de dominio público")
    catalog = json.loads(Path("data/bibliotheca-graeca-latina-I-bce-I-ce.json").read_text("utf-8"))
    mapped = {w["id"]: w for w in catalog["works"]}
    roadmap = json.loads(Path("data/classics-corpus/indexation-roadmap-222.json").read_text("utf-8"))
    pending = {w["id"] for w in roadmap["items"] if not w["originalIndexed"]}
    output.mkdir(parents=True, exist_ok=True)
    entries = []
    for work_id, first, later, header, minimum in SOURCES:
        work = mapped.get(work_id)
        if work_id not in pending or not work or work["language"] != "la":
            raise ValueError("Obra no pendiente del catálogo: " + work_id)
        files = (first,) + later
        originals = [download(path) for path in files]
        segments = [seg for i, raw in enumerate(originals, 1)
                    for seg in split_book(raw, header, i)]
        if len(segments) < minimum:
            raise ValueError(f"Parágrafos insuficientes para {work_id}: {len(segments)}")
        source_digest = hashlib.sha256(b"\x00".join(originals)).hexdigest()
        source_links = [{"url": ROOT + path, "sha256": hashlib.sha256(raw).hexdigest()}
                        for path, raw in zip(files, originals)]
        citation = (
            f'{work["author"]}, {work["title"]}, transcripción de The Latin Library '
            f'(edición de base y manuscritos no especificados), archivo digital CLTK, '
            f'{ROOT + first}.'
        )
        doc = {
            "schema": "vitruvius-offsite-latin-original-v1",
            "workId": work_id, "author": work["author"], "title": work["title"],
            "language": "la", "source": ROOT + first, "sourceFiles": source_links,
            "sourceSha256": source_digest, "sourceLicense": ROOT + "LICENSE.md",
            "attribution": citation,
            "editorialStatus": "Transcripción, no edición crítica; sin manuscrito cotejado",
            "alignment": "Segmentos numerados del texto digital; sin alineación automática a ediciones o traducciones",
            "manuscriptCollated": False,
            "passages": segments,
        }
        content = (json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        if len(content) > 2500000:
            raise ValueError("Documento de índice excesivo")
        target = output / f"{work_id}-la.json"
        target.write_bytes(content)
        entries.append({
            "workId": work_id, "author": work["author"], "title": work["title"],
            "language": "la", "path": "data/offsite-latin/" + target.name,
            "passages": len(segments), "bytes": len(content),
            "source": ROOT + first, "sourceFiles": source_links,
            "sourceSha256": source_digest, "attribution": citation,
            "editorialStatus": doc["editorialStatus"],
        })
    manifest = {
        "schema": "vitruvius-offsite-latin-supplement-v1",
        "branch": BRANCH, "count": len(entries), "entries": entries,
        "policy": "Append-only derivados de transcripciones CLTK; originales y folios intactos",
    }
    (output / "supplement-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"addedWorks": len(entries),
                      "passages": sum(e["passages"] for e in entries),
                      "bytes": sum(e["bytes"] for e in entries)}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    main(Path(parser.parse_args().output))
