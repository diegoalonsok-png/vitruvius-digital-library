#!/usr/bin/env python3
"""Import Theophrastus, Characteres (ed. Diels 1909) from PerseusDL canonical-greekLit TEI.

Source licence: CC BY-SA 4.0 (Perseus Digital Library). One passage per character
(chapter), with section numbers kept inline as [n]. No folio alignment is invented.
"""
import hashlib
import json
import pathlib
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

URL = "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0093/tlg009/tlg0093.tlg009.perseus-grc2.xml"
OUT = pathlib.Path("data/classics-corpus/theophrastus-characters-grc.json")
TEI = "{http://www.tei-c.org/ns/1.0}"
SKIP = {"note", "pb", "milestone", "fw", "head", "ref", "ptr", "bibl"}


def tag(node):
    return node.tag.rsplit("}", 1)[-1]


def clean(txt):
    return re.sub(r"\s+", " ", txt).strip()


def text_of(node):
    parts = [node.text or ""]
    for child in node:
        name = tag(child)
        if name in SKIP:
            pass
        elif name == "gap":
            parts.append(" […] ")
        else:
            parts.append(text_of(child))
        parts.append(child.tail or "")
    return "".join(parts)


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
    raw = src.read_bytes() if src else urllib.request.urlopen(URL, timeout=60).read()
    print("SOURCE", URL, "bytes", len(raw), "sha256", hashlib.sha256(raw).hexdigest())
    root = ET.fromstring(raw)
    passages = []
    for chap in root.iter(TEI + "div"):
        if chap.attrib.get("subtype") != "chapter":
            continue
        n = chap.attrib.get("n", "")
        head = chap.find(TEI + "head")
        title = clean(text_of(head)) if head is not None else ""
        title = re.sub(r"\s+[Α-Ω]+ʼ$", "", title)
        sections = []
        for sec in chap.findall(TEI + "div"):
            if sec.attrib.get("subtype") != "section":
                continue
            body = clean(text_of(sec))
            if body:
                sections.append("[" + sec.attrib.get("n", "") + "] " + body)
        if not sections:
            continue
        passages.append({
            "locus": "prooem." if n == "0" else n,
            "title": title,
            "text": " ".join(sections),
        })
    chars = sum(len(p["text"]) for p in passages)
    if len(passages) < 30 or chars < 40000:
        raise SystemExit(f"incomplete: {len(passages)} passages, {chars} chars")
    data = {
        "workId": "theophrastus-characters",
        "language": "grc",
        "sourceType": "edited-greek-tei",
        "editorialStatus": "Texto editado (Diels 1909), no transcripción diplomática ni OCR del códice",
        "source": URL,
        "attribution": "Hermann Diels, Theophrasti Characteres, Oxford, Clarendon Press, 1909; Perseus DL TEI, CC BY-SA 4.0",
        "license": "CC BY-SA 4.0 (PerseusDL canonical-greekLit; conservar atribución y compartir adaptaciones)",
        "alignment": "Locus = carácter (capítulo) y [sección] de la edición de Diels; sin correspondencia automática con folios",
        "passages": passages,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("WROTE", OUT, len(passages), "passages", chars, "chars")


if __name__ == "__main__":
    main()
