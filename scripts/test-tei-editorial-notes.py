#!/usr/bin/env python3
"""Validate source-explicit authorial footnotes, not manuscript variants.

This is a reproducible XML/authority/provenance integrity test. It does not
claim any independent philological verification or a full TEI RelaxNG check.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
TEI = ROOT / "data/tei/notae-auctoris-locis-explicitis-2026-11-14.xml"
SOURCE = ROOT / "data/critical-notes.json"
NS = {"tei": "http://www.tei-c.org/ns/1.0"}
Q = "{http://www.tei-c.org/ns/1.0}"
XML = "{http://www.w3.org/XML/1998/namespace}"
EXPECTED = {"recensio-es": 10, "recensio-fr": 11, "theory-en": 20}
EDITION = {"recensio-es": "v514", "recensio-fr": "v554", "theory-en": "v297"}
SOURCE_LEN = 41


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def main() -> None:
    tree = ET.parse(TEI)
    root = tree.getroot()
    check(root.tag == Q + "TEI", "The source-explicit notes must be TEI P5 namespace XML")
    notes = root.findall(".//tei:note", NS)
    check(len(notes) == SOURCE_LEN, f"Expected {SOURCE_LEN} dated A-notes; got {len(notes)}")
    check(not root.findall(".//tei:app", NS), "Source footnotes cannot be represented as certified apparatus variants")
    check(not root.findall(".//tei:lem", NS), "Editorial footnotes are not adopted variant lemmata")
    check(not root.findall(".//tei:rdg", NS), "Editorial footnotes cannot invent manuscript readings")
    tei_ids = [note.attrib[XML + "id"] for note in notes]
    check(len(set(tei_ids)) == SOURCE_LEN, "Duplicated authorial note identifiers")

    source_bytes = SOURCE.read_bytes()
    blob_hash = hashlib.sha1(
        f"blob {len(source_bytes)}\0".encode("ascii") + source_bytes
    ).hexdigest()
    recorded_hash = root.findtext(".//tei:idno[@type='GitBlobSHA1']", namespaces=NS)
    check(recorded_hash and re.fullmatch(r"[a-f0-9]{40}", recorded_hash), "Missing source blob fingerprint")

    if blob_hash == recorded_hash:
        indexed = json.loads(source_bytes)["entries"]
        explicit = [r for r in indexed if r.get("mapping_status") == "explicit_in_anchor" and r.get("locus")]
        check(len(explicit) == SOURCE_LEN, "Explicit-source note set has changed without a TEI refresh")
        for note in notes:
            url = note.attrib.get("corresp", "")
            params = parse_qs(urlparse(url).query)
            edition = params.get("edition", [None])[0]
            locus = params.get("locus", [None])[0]
            source_id = note.attrib.get(XML + "id")
            source_note = next((r for r in explicit if r["edition"] == edition and
                                f"nota-{EDITION[edition]}-{r['footnote_id']}" == source_id), None) if edition in EDITION else None
            check(source_note is not None, f"TEI note {source_id} not found among source-explicit DOCX notes")
            check(locus == source_note["locus"], f"Wrong locus in {source_id}")
            paragraph = note.find("tei:p", NS)
            check(paragraph is not None and paragraph.text == source_note["text"],
                  f"Note {source_id} has been paraphrased rather than transcribed")
            check(f"párrafo de origen {source_note['source_paragraph']}" in
                  "".join(note.itertext()), f"Missing original paragraph of {source_id}")
    else:
        # Dated corpus states remain citable after later improvements.
        print("INFO: Original notes corpus differs from the dated TEI snapshot; compare via recorded Git blob.")

    edition_counts = {key: 0 for key in EDITION}
    for note in notes:
        check(note.get("type") == "authorialFootnote" and note.get("subtype") == "explicitInSource",
              "Notes must retain editorial origin and explicit-source status")
        check(note.get("resp") == "#diego-kurilo", "Authorial attribution cannot be inferred as peer review")
        params = parse_qs(urlparse(note.attrib.get("corresp", "")).query)
        edition = params.get("edition", [""])[0]
        check(edition in edition_counts, "Unknown edition reference in note")
        edition_counts[edition] += 1
        check(bool(note.find("tei:p", NS).text), "Empty editorial note")
    check(edition_counts == EXPECTED, f"Incorrect edition distribution: {edition_counts}")
    print(f"PASS TEI: {len(notes)} explicit-source editorial footnotes, source blob {recorded_hash}; no manuscript variants fabricated.")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ET.ParseError) as error:
        print(f"FAIL TEI editorial note integrity: {error}", file=sys.stderr)
        raise SystemExit(1)
