#!/usr/bin/env python3
"""Extract source-identified Latin TEI into an independent non-Pages branch.

Never removes, rewrites or normalizes a manuscript, folio, source PDF or master
edition. Output consists solely of derived, attributed searchable JSON.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ROOT_URL = "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/"
NS = "{http://www.tei-c.org/ns/1.0}"
SOURCES = (
    ("seneca-de-ira", "Séneca", "De ira", "stoa0255.stoa010",
     "data/stoa0255/stoa010/stoa0255.stoa010.perseus-lat2.xml",
     "J. W. Basore, Moral Essays I, Londres y Nueva York, 1928."),
    ("seneca-de-tranquillitate", "Séneca", "De tranquillitate animi", "stoa0255.stoa013",
     "data/stoa0255/stoa013/stoa0255.stoa013.perseus-lat2.xml",
     "J. W. Basore, Moral Essays II, Londres y Nueva York, 1932."),
)
BRANCH = "corpus-originales-latinos-20261108"
SKIP = {"note", "del", "fw", "figure", "graphic", "gap", "app", "rdg", "listWit"}
SPACES = re.compile(r"\s+")


def local(node):
    return node.tag.rsplit("}", 1)[-1]


def surface(node):
    """Retrieve a single editorial reading, not apparatus alternatives."""
    tag = local(node)
    if tag in SKIP:
        return ""
    if tag == "choice":
        selected = next((child for name in ("corr", "reg", "expan", "orig", "sic")
                         for child in node if local(child) == name), None)
        if selected is not None:
            return surface(selected)
    result = [node.text or ""]
    for child in node:
        if local(child) not in SKIP:
            result.append(surface(child))
        result.append(child.tail or "")
    return "".join(result)


def build_one(workid, author, title, urn, path, edition):
    url = ROOT_URL + path
    with urlopen(Request(url, headers={"User-Agent": "VitruviusDigitalLibrary-TEI-Indexer/1.0"}),
                 timeout=60) as response:
        if response.status != 200:
            raise ValueError("TEI unavailable: " + url)
        raw = response.read(2_500_001)
    if len(raw) > 2_500_000:
        raise ValueError("TEI exceeds size safety limit: " + urn)
    root = ET.fromstring(raw)
    if local(root) != "TEI":
        raise ValueError("Source is not TEI: " + urn)
    body = root.find(".//" + NS + "text/" + NS + "body")
    if body is None:
        raise ValueError("Missing TEI body: " + urn)
    parents = {child: parent for parent in body.iter() for child in parent}
    paragraphs = body.findall(".//" + NS + "p")
    if len(paragraphs) < 5:
        raise ValueError("Insufficient TEI paragraphs: " + urn)
    counters = defaultdict(int)
    passages = []
    empty_structural_paragraphs = 0
    for p in paragraphs:
        path = []
        ancestor = parents.get(p)
        while ancestor is not None and ancestor is not body:
            if local(ancestor) == "div" and ancestor.get("n"):
                path.append(ancestor.get("n"))
            ancestor = parents.get(ancestor)
        editorial = ".".join(reversed(path)) or "text"
        text = SPACES.sub(" ", surface(p)).strip()
        if not text:
            # Truly empty TEI paragraphs are structure, not missing text.
            if SPACES.sub(" ", "".join(p.itertext())).strip():
                raise ValueError("TEI paragraph with excluded textual content needs review: " + urn)
            empty_structural_paragraphs += 1
            continue
        counters[editorial] += 1
        passages.append({
            "locus": editorial + "~p" + str(counters[editorial]),
            "editorialLocus": editorial,
            "locusKind": "Párrafo técnico; la localización editorial procede de los div/@n del TEI",
            "text": text,
        })
    chars = sum(len(p["text"]) for p in passages)
    if chars < 2500 or len(passages) + empty_structural_paragraphs != len(paragraphs):
        raise ValueError("Incomplete TEI extraction: " + urn)
    source_hash = hashlib.sha256(raw).hexdigest()
    citation = author + ", " + title + ". Ed. " + edition + " TEI: Perseus Digital Library."
    book = {
        "schema": "vitruvius-offsite-latin-original-v1",
        "workId": workid, "language": "la", "title": title, "author": author,
        "source": url, "sourceUrn": urn, "sourceSha256": source_hash,
        "attribution": citation,
        "editorialStatus": "Edición latina TEI, sin colación autóptica de manuscritos",
        "alignment": "Localizadores editoriales y párrafos técnicos; no se suponen equivalencias con traducciones",
        "passages": passages
    }
    return book


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    folder = Path(args.output)
    folder.mkdir(parents=True, exist_ok=True)
    entries = []
    total_bytes = 0
    for workid, author, title, urn, path, edition in SOURCES:
        doc = build_one(workid, author, title, urn, path, edition)
        data = (json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        if len(data) > 2_500_000:
            raise ValueError("Derived JSON too large: " + workid)
        target = folder / (workid + "-la.json")
        target.write_bytes(data)
        total_bytes += len(data)
        entries.append({
            "workId": workid, "author": author, "title": title, "language": "la",
            "path": "data/offsite-latin/" + target.name,
            "passages": len(doc["passages"]), "bytes": len(data),
            "source": doc["source"], "sourceUrn": urn,
            "sourceSha256": doc["sourceSha256"], "attribution": doc["attribution"],
        })
    manifest = {
        "schema": "vitruvius-offsite-latin-originals-manifest-v1",
        "branch": BRANCH, "count": len(entries), "totalBytes": total_bytes,
        "method": "Single editorial TEI reading; explicit technical paragraph locators; no reconstructed or invented ancient text",
        "entries": entries
    }
    (folder / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"works": len(entries), "bytes": total_bytes,
                      "paths": [x["path"] for x in entries]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
