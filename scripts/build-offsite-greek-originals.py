#!/usr/bin/env python3
"""Publish verified Greek TEI originals to an off-Pages branch.

READ-ONLY with respect to the live site, folios, scans, masters, PDFs and DOCX.
The generated JSON is staged in a temporary directory; a separate GitHub Actions
job publishes it to a non-Pages branch. No translations are produced or hosted.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://raw.githubusercontent.com"
NS = "{http://www.tei-c.org/ns/1.0}"
LANG = "{http://www.w3.org/XML/1998/namespace}lang"
BRANCH = "corpus-originales-griegos-20261108"
DEST = "data/offsite-originals"
SOURCES = (
    ("thucydides-war", "PerseusDL/canonical-greekLit", "data/tlg0003/tlg001/tlg0003.tlg001.perseus-grc2.xml"),
    ("cassius-dio-historia", "PerseusDL/canonical-greekLit", "data/tlg0385/tlg001/tlg0385.tlg001.perseus-grc2.xml"),
    ("athenaeus-deipnosophistae", "PerseusDL/canonical-greekLit", "data/tlg0008/tlg001/tlg0008.tlg001.perseus-grc3.xml"),
    ("theophrastus-historia-plantarum", "OpenGreekAndLatin/First1KGreek", "data/tlg0093/tlg001/tlg0093.tlg001.1st1K-grc1.xml"),
    ("archimedes-fluitantibus", "OpenGreekAndLatin/First1KGreek", "data/tlg0552/tlg008/tlg0552.tlg008.1st1K-grc1.xml"),
    ("ps-aristotle-mechanica", "OpenGreekAndLatin/First1KGreek", "data/tlg0086/tlg023/tlg0086.tlg023.1st1K-grc1.xml"),
    ("euclid-optica", "OpenGreekAndLatin/First1KGreek", "data/tlg1799/tlg009/tlg1799.tlg009.1st1K-grc1.xml"),
    ("cleonides-harmonica", "OpenGreekAndLatin/First1KGreek", "data/tlg0361/tlg001/tlg0361.tlg001.1st1K-grc1.xml"),
    ("hero-belopoeica", "OpenGreekAndLatin/First1KGreek", "data/tlg0559/tlg012/tlg0559.tlg012.1st1K-grc1.xml"),
    ("geminus-isagoge", "OpenGreekAndLatin/First1KGreek", "data/tlg1383/tlg001/tlg1383.tlg001.1st1K-grc1.xml"),
    ("aristarchus-magnitudines", "OpenGreekAndLatin/First1KGreek", "data/tlg1181/tlg001/tlg1181.tlg001.1st1K-grc1.xml"),
    ("apollonius-conica", "OpenGreekAndLatin/First1KGreek", "data/tlg0550/tlg001/tlg0550.tlg001.1st1K-grc1.xml"),
    ("pappus-synagoge", "OpenGreekAndLatin/First1KGreek", "data/tlg2032/tlg001/tlg2032.tlg001.1st1K-grc1.xml"),
)
EXCLUDED = {"note", "del", "fw", "figure", "graphic", "apparatus", "castList"}
TEXT_BLOCKS = {"p", "l", "ab"}
CLEAN = re.compile(r"\s+", re.UNICODE)
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")


def local(element):
    return element.tag.rsplit("}", 1)[-1]


def normalized(value):
    return CLEAN.sub(" ", value).strip()


def surface(node):
    """Preserve the edited Greek surface; never mix editorial footnotes into text."""
    if local(node) in EXCLUDED:
        return ""
    value = [node.text or ""]
    for child in node:
        if local(child) not in EXCLUDED:
            value.append(surface(child))
        value.append(child.tail or "")
    return "".join(value)


def fetch_source(url):
    if not url.startswith("https://raw.githubusercontent.com/"):
        raise ValueError("Untrusted TEI source URL")
    req = Request(url, headers={"User-Agent": "VitruviusDigitalLibrary-TEI-Provenance/1.0"})
    with urlopen(req, timeout=65) as response:
        if response.status != 200:
            raise ValueError("Upstream HTTP " + str(response.status))
        data = response.read(9_000_001)
    if len(data) > 9_000_000:
        raise ValueError("TEI too large for vetted ingest")
    return data


def convert(work, xml_bytes, source_url, catalogue):
    root = ET.fromstring(xml_bytes)
    if local(root) != "TEI":
        raise ValueError("Not a TEI document")
    license_nodes = root.findall(".//" + NS + "availability/" + NS + "licence")
    if not any("creativecommons.org/licenses/by-sa/4.0/" in (n.get("target") or "") for n in license_nodes):
        raise ValueError("No verified CC BY-SA 4.0 statement in TEI header")
    title = root.find(".//" + NS + "titleStmt/" + NS + "title")
    editor = root.find(".//" + NS + "titleStmt/" + NS + "editor")
    source_desc = root.find(".//" + NS + "sourceDesc")
    if source_desc is None or len(normalized(surface(source_desc))) < 12:
        raise ValueError("Critical edition provenance absent")
    text = root.find(".//" + NS + "text")
    if text is None:
        raise ValueError("Missing TEI text")
    body = text.find(NS + "body")
    if body is None:
        raise ValueError("Missing TEI body")
    edition = next((e for e in body.iter() if local(e) == "div" and e.get("type") == "edition"), body)
    declared = (edition.get(LANG) or text.get(LANG) or "").lower()
    if declared not in {"grc", "greek", "grc-ancient"}:
        raise ValueError("Original Greek not identified in edition language: " + declared)
    parents = {c: p for p in edition.iter() for c in p}
    candidates = []
    for elem in edition.iter():
        if local(elem) not in TEXT_BLOCKS:
            continue
        ancestor = parents.get(elem)
        excluded = False
        while ancestor is not None and ancestor is not edition:
            if local(ancestor) in EXCLUDED or local(ancestor) in TEXT_BLOCKS:
                excluded = True
                break
            ancestor = parents.get(ancestor)
        if excluded:
            continue
        content = normalized(surface(elem))
        if not content:
            continue
        if not GREEK.search(content):
            continue
        divs, parent = [], parents.get(elem)
        while parent is not None and parent is not edition:
            if local(parent) == "div" and parent.get("type") == "textpart" and parent.get("n"):
                divs.append(parent.get("n"))
            parent = parents.get(parent)
        divs.reverse()
        if not divs:
            # No fictitious editorial locus: explicitly mark the internal reference.
            divs = ["unlocated"]
        locus = ".".join(divs)
        candidates.append((locus, content, elem.get("n")))
    if not candidates:
        raise ValueError("No Greek editorial passages extracted")
    grouped = defaultdict(list)
    for locus, content, num in candidates:
        grouped[locus].append((content, num))
    passages = []
    for locus, paragraphs in grouped.items():
        # Keep all surface text, and state any generated paragraph division openly.
        for i, (content, num) in enumerate(paragraphs, 1):
            unique = locus if len(paragraphs) == 1 else locus + "~p" + str(i)
            passages.append({
                "locus": unique,
                "editorialLocus": locus if locus != "unlocated" else None,
                "locusKind": "TEI editorial division" if len(paragraphs) == 1 else "TEI division + numbered digital paragraph, not a manuscript locus",
                "text": content
            })
    chars = sum(len(p["text"]) for p in passages)
    if chars < 600 or len(passages) < 2:
        raise ValueError("Greek original seems incomplete: " + str(chars) + " chars")
    if len(pages := {p["locus"] for p in passages}) != len(passages):
        raise ValueError("Passage locus collision")
    urn = edition.get("n", "")
    if urn and "greekLit:" not in urn:
        raise ValueError("Non-Greek CTS edition identifier")
    source_title = normalized(surface(title)) if title is not None else catalogue["title"]
    source_editor = normalized(surface(editor)) if editor is not None else ""
    return {
        "schema": "vitruvius-offsite-greek-original-v1",
        "workId": work,
        "language": "grc",
        "title": catalogue["title"],
        "author": catalogue["author"],
        "sourceTitle": source_title,
        "sourceType": "edited-greek-tei",
        "editorialStatus": "Edición griega derivada de TEI, no transcripción diplomática ni colación manuscrita propia",
        "source": source_url,
        "sourceUrn": urn,
        "sourceSha256": hashlib.sha256(xml_bytes).hexdigest(),
        "license": "CC BY-SA 4.0 (declarada en TEI): atribución y ShareAlike",
        "editor": source_editor,
        "attribution": catalogue["author"] + ", " + source_title + ". " + source_desc_text(source_desc),
        "alignment": "Divisiones TEI conservadas; sufijos ~p son párrafos técnicos, nunca folios ni variantes verificadas",
        "passages": passages
    }


def source_desc_text(desc):
    return normalized(surface(desc))[:500]


def run(args):
    catalogue = json.loads((ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json").read_text("utf-8"))
    by_id = {w["id"]: w for w in catalogue["works"]}
    roadmap = json.loads((ROOT / "data/classics-corpus/indexation-roadmap-222.json").read_text("utf-8"))
    missing = {w["id"] for w in roadmap["items"] if not w["originalIndexed"]}
    outdir = Path(args.output)
    outdir.mkdir(parents=True, exist_ok=True)
    result = []
    failed = []
    total = 0
    for work, repo, path in SOURCES:
        if work not in by_id or by_id[work].get("language") != "grc" or work not in missing:
            raise ValueError("No original Greek pending under catalog ID: " + work)
        url = BASE + "/" + repo + "/master/" + path
        try:
            raw = fetch_source(url)
            obj = convert(work, raw, url, by_id[work])
            dest = outdir / (work + "-grc.json")
            data = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
            dest.write_bytes(data)
            total += len(data)
            result.append({"workId": work, "path": DEST + "/" + dest.name,
                           "bytes": len(data), "passages": len(obj["passages"]),
                           "sourceSha256": obj["sourceSha256"], "source": url,
                           "editionUrn": obj["sourceUrn"]})
            print("VERIFIED", work, len(obj["passages"]), "passages", len(data), "bytes", flush=True)
        except Exception as exc:
            failed.append({"workId": work, "reason": str(exc)})
            print("SKIPPED", work, str(exc), file=sys.stderr, flush=True)
    summary = {
        "schema": "vitruvius-offsite-greek-originals-manifest-v1",
        "branch": BRANCH,
        "count": len(result),
        "totalBytes": total,
        "entries": result,
        "errors": failed,
        "rule": "Only validated original Greek TEI. No PDF, DOCX, translation, image, folio or master modified."
    }
    (outdir / "manifest.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(json.dumps({"newOriginals": len(result), "bytes": total, "failed": failed}, ensure_ascii=False), flush=True)
    if len(result) < 7:
        raise SystemExit("Too few verified editions. Do not publish this incomplete batch automatically.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    run(parser.parse_args())
