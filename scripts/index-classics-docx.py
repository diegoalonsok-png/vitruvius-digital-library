#!/usr/bin/env python3
"""Index the existing classical DOCX files without modifying them.

This is a literal paragraph index, NOT manuscript OCR, textual collation or
semantic alignment. All nonempty body paragraphs are preserved in source order.
"""
from __future__ import annotations
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "documents" / "clasicos"
DEST = ROOT / "data" / "classics-documents"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
TAG_P = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"
TAG_T = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"
TAG_TAB = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tab"
TAG_BR = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}br"
TAG_BODY = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}body"

def paragraphs(path: Path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    doc = ET.fromstring(xml)
    body = doc.find(TAG_BODY)
    if body is None:
        raise ValueError("DOCX has no document body")
    for p in body.iter(TAG_P):
        parts = []
        for node in p.iter():
            if node.tag == TAG_T:
                parts.append(node.text or "")
            elif node.tag == TAG_TAB:
                parts.append("\t")
            elif node.tag == TAG_BR:
                parts.append("\n")
        text = "".join(parts).strip()
        if text:
            yield text

def build():
    DEST.mkdir(parents=True, exist_ok=True)
    records = []
    for source in sorted(SOURCE.glob("*.docx")):
        slug = source.stem
        checksum = hashlib.sha256(source.read_bytes()).hexdigest()
        units = [{"id": f"p{i:05d}", "ordinal": i, "text": text}
                 for i, text in enumerate(paragraphs(source), 1)]
        output = {
            "schema": "vitruvia-classical-docx-paragraphs-v1",
            "title": slug.replace("-", " "),
            "source": source.relative_to(ROOT).as_posix(),
            "sha256": checksum,
            "method": "OOXML body paragraphs, full order; no semantic alignment",
            "language": "unverified",
            "ocr": False,
            "alignment": "unverified",
            "paragraphs": units,
        }
        target = DEST / f"{slug}.json"
        serialized = json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n"
        if not target.exists() or target.read_text(encoding="utf-8") != serialized:
            target.write_text(serialized, encoding="utf-8")
        records.append({
            "id": slug, "title": output["title"], "source": output["source"],
            "index": target.relative_to(ROOT).as_posix(),
            "sha256": checksum, "paragraphs": len(units),
            "pdf": f"documents/clasicos/{slug}.pdf" if (SOURCE / f"{slug}.pdf").is_file() else None,
            "status": "literal-docx-index; language and alignment unverified",
        })
    manifest = {
        "schema": "vitruvia-classical-document-index-v1",
        "method": "Full local DOCX text, paragraphs in source order; no OCR or semantic alignment",
        "count": len(records), "records": records,
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    if not records:
        raise RuntimeError("No DOCX sources indexed")
    print(f"Indexed {len(records)} existing DOCX works ({sum(x['paragraphs'] for x in records)} nonempty paragraphs).")
    return manifest

if __name__ == "__main__":
    build()
