#!/usr/bin/env python3
"""Add a bounded set of academically sourced Greek editions to Bibliotheca.

Preservation rules:
- No R2 objects or unrelated GitHub files are deleted, renamed or overwritten.
- A catalogue-only record is not declared indexed before the lexical CI succeeds.
- TEI is parsed as XML, never extracted with regex, and notes/variants are not
  passed off as the base Greek text.
- Paragraph-level digital segmentation is explicitly NOT a scholarly CTS locus.
- Idempotent: existing edition files are validated, not overwritten.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/classics-corpus/lote-50-fuentes-academicas-2026-11-16.json"
CATALOG = ROOT / "data/bibliotheca-expansion-publicada-2026-11-16.json"
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
TEI_NS = "{http://www.tei-c.org/ns/1.0}"
EXCLUDED = {"note", "rdg", "bibl", "ref", "pb", "milestone", "fw", "figure", "graphic", "head", "gloss"}
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")

def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def write(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def fetch(url: str) -> bytes:
    if not re.fullmatch(
        r"https://raw\.githubusercontent\.com/PerseusDL/canonical-greekLit/"
        r"[a-f0-9]{40}/data/tlg\d+/tlg\d+/(?:tlg\d+\.tlg\d+\.perseus-grc\d+\.xml|__cts__\.xml)",
        url,
    ):
        raise ValueError("Source URL does not match the approved pinned Perseus tree: " + url)
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "VitruviusDigitalLibrary/1.0 scholarly-import"})
            with urllib.request.urlopen(req, timeout=50) as response:
                content = response.read(4_000_001)
            if len(content) > 4_000_000:
                raise ValueError("TEI document exceeds import size cap")
            return content
        except (OSError, TimeoutError) as exc:
            last = exc
            if attempt < 2:
                time.sleep(2 + attempt * 2)
    raise RuntimeError(f"Unable to retrieve source: {url}: {last}")

def name(el: ET.Element) -> str:
    return el.tag.rsplit("}", 1)[-1]

def plain(el: ET.Element) -> str:
    """Keep the edited main text, excluding notes, alternative readings and references."""
    bits = [el.text or ""]
    for child in el:
        tag = name(child)
        if tag == "app":
            lem = next((x for x in child if name(x) == "lem"), None)
            if lem is not None:
                bits.append(plain(lem))
        elif tag not in EXCLUDED:
            bits.append(plain(child))
        bits.append(child.tail or "")
    return "".join(bits)

def extract(xml: bytes, expected_urn: str) -> tuple[list[dict], int]:
    tree = ET.fromstring(xml)
    body = next((e for e in tree.iter() if name(e) == "body"), None)
    if body is None:
        raise ValueError("TEI text has no body")
    parents = {child: parent for parent in body.iter() for child in parent}
    chunks = []
    eligible = []
    for el in body.iter():
        if name(el) not in ("p", "l"):
            continue
        # A line inside a paragraph is already included in that paragraph.
        ancestor = parents.get(el)
        blocked = False
        while ancestor is not None:
            if name(ancestor) in EXCLUDED or (name(el) == "l" and name(ancestor) == "p"):
                blocked = True
                break
            ancestor = parents.get(ancestor)
        if blocked:
            continue
        eligible.append(el)
        value = re.sub(r"\s+", " ", plain(el)).strip()
        if len(value) < 7 or len(GREEK.findall(value)) < 3:
            continue
        # This is a local digital segment number, NOT a Stephanus page, book or
        # manuscript folio. The source edition URN remains preserved separately.
        locus = expected_urn + ":local-p" + f"{len(chunks)+1:05d}"
        ancestor = parents.get(el)
        source_parts = []
        while ancestor is not None:
            if name(ancestor) == "div" and ancestor.get("type") == "textpart" and ancestor.get("n"):
                source_parts.append(f"{ancestor.get('subtype','div')}={ancestor.get('n')}")
            ancestor = parents.get(ancestor)
        chunks.append({
            "locus": locus,
            "text": value,
            "sourceDivisionHint": "/".join(reversed(source_parts)) or "no textual division",
        })
    greek_chars = sum(len(GREEK.findall(row["text"])) for row in chunks)
    if len(chunks) < 4 or greek_chars < 500:
        raise ValueError(f"Incomplete or insufficient Greek text: {len(chunks)} segments, {greek_chars} characters")
    if len(chunks) < max(4, len(eligible) * .75):
        raise ValueError("Low passage coverage; nonempty TEI elements were omitted")
    return chunks, greek_chars

def verify_cts(xml: bytes, urn: str) -> str:
    tree = ET.fromstring(xml)
    editions = [x for x in tree.iter() if name(x) == "edition"]
    edition = next((x for x in editions if x.attrib.get("urn") == urn), None)
    if edition is None:
        raise ValueError("Requested TEI edition URN is absent from the CTS inventory")
    description = next((re.sub(r"\s+", " ", "".join(x.itertext())).strip()
                        for x in edition.iter() if name(x) == "description"), "")
    if not description:
        raise ValueError("Source edition does not supply editorial description")
    return description

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=5, help="Maximum number of new original texts per execution; 0=all")
    args = ap.parse_args()
    if args.limit < 0 or args.limit > 50:
        raise ValueError("--limit must be between 0 and 50")
    inventory, catalog, registry = load(SOURCE), load(CATALOG), load(REGISTRY)
    if len(inventory["works"]) != 50 or inventory.get("count") != 50:
        raise ValueError("Fifty-item candidate inventory has changed unexpectedly")
    fiches = {x["id"]: x for x in catalog["works"]}
    if len(fiches) != len(catalog["works"]):
        raise ValueError("Duplicate catalogue identifier")
    registered = {(x["workId"], x["language"]): x for x in registry["entries"]}
    saved = []
    pending = []
    already = 0
    for w in inventory["works"]:
        id = w["id"]
        path = ROOT / "data/classics-corpus" / f"{id}-grc.json"
        entry = fiches.get(id)
        if not entry or entry.get("collection") != "obras-selectas":
            raise ValueError("Selected original has no matching academic fiche: " + id)
        if path.exists():
            old = load(path)
            if old.get("workId") != id or old.get("language") != "grc" or old.get("sourceUrn") != w["sourceUrn"]:
                raise ValueError("Existing original conflicts with proposed edition: " + id)
            if not old.get("passages"):
                raise ValueError("Existing original has no passages: " + id)
            already += 1
        else:
            if args.limit and len(saved) >= args.limit:
                pending.append(id)
                continue
            xml = fetch(w["sourceXml"])
            if b"creativecommons.org/licenses/by-sa/4.0" not in xml:
                raise ValueError("Unverified TEI reuse license: " + id)
            description = verify_cts(fetch(w["sourceCts"]), w["sourceUrn"])
            passages, greek_chars = extract(xml, w["sourceUrn"])
            # All changes to this edition happen only after source validation.
            content = {
                "workId": id, "language": "grc",
                "title": w["author"] + " \u00b7 " + w["titleOriginal"],
                "sourceType": "edited-greek-tei",
                "sourceUrn": w["sourceUrn"],
                "source": w["sourceXml"],
                "sourceSha256": hashlib.sha256(xml).hexdigest(),
                "sourceRevision": inventory["sourceRevision"],
                "editionReference": description,
                "attribution": w["author"] + " \u00b7 " + description + " \u00b7 Perseus Digital Library",
                "license": "CC BY-SA 4.0 (Perseus Digital Library)",
                "editorialStatus": "Greek TEI edited text, not independently collated, local-pNNNNN are editorial digital segments rather than canonical citations",
                "localSegmentation": "Each local-pNNNNN denotes an ordered local textual unit, never a verified canonical CTS locus or Stephanus reference",
                "passages": passages,
            }
            write(path, content)
            entry["bibliography"]["editionDescription"] = description
            entry["bibliography"]["sourceSha256"] = content["sourceSha256"]
            entry["bibliography"]["localSegmentation"] = content["localSegmentation"]
            saved.append({"id": id, "passages": len(passages), "greekChars": greek_chars})
        relative = path.relative_to(ROOT).as_posix()
        recorded = registered.get((id, "grc"))
        if recorded and recorded.get("path") != relative:
            raise ValueError("Existing registry points to a different source: " + id)
        if not recorded:
            registry["entries"].append({
                "workId": id, "author": w["author"], "title": w["titleOriginal"],
                "language": "grc", "format": "json-passages", "path": relative,
                "reader": "classics-text-reader.html?work=" + id + "&lang=grc",
                "sourceDescription": "Perseus original Greek edited TEI | " + w["sourceUrn"] + " | CC BY-SA 4.0 | local digital paragraph segments, not canonical loci",
            })
            registered[(id, "grc")] = registry["entries"][-1]
        entry["corpusFiles"] = {"grc": relative}
        entry["localVersions"] = [{"language": "grc", "path": relative}]
        entry["publicStatus"] = "lectura-local-completa"
        # Lexical index verification and promotion are done by the separate
        # rebuild workflow; never claim this stage is indexed.
        if entry.get("textStatus") != "lexically-indexed":
            entry["textStatus"] = "registered-pending-lexical-index"
            entry["status"] = "Original griego registrado, lector disponible; indexación léxica pendiente de verificación"
        entry["reading"] = {
            "url": "classics-text-reader.html?work=" + id + "&lang=grc",
            "status": "Transcripción de edición TEI con segmentos digitales locales; sin cotejo crítico independiente.",
        }
    registry["entries"].sort(key=lambda x: (x["workId"], x["language"]))
    registry["count"] = len(registry["entries"])
    registry["works"] = len({x["workId"] for x in registry["entries"]})
    registry["updated"] = inventory["date"]
    write(REGISTRY, registry)
    write(CATALOG, catalog)
    print(json.dumps({
        "newOriginals": saved, "preexistingValidated": already, "deferred": len(pending),
        "registryVersions": registry["count"], "registryWorks": registry["works"],
    }, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
