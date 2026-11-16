#!/usr/bin/env python3
"""Ingesta académica reproducible de 50 fuentes griegas TEI verificadas.

- Fuente: PerseusDL/canonical-greekLit, revisión git inmutable y licencia CC BY-SA.
- Conserva fuente, edición, original, referencia CTS y grado de comprobación.
- NO inventa traducciones, NO declara variantes colacionadas, NO toca objetos R2.
- La publicación de GitHub se efectúa sólo después de crear el índice y superar tests.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
import sys
import time
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/classics-corpus/lote-50-fuentes-academicas-2026-11-16.json"
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
SUPPLEMENT = ROOT / "data/bibliotheca-expansion-publicada-2026-11-16.json"
MAIN_CATALOG = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
REPORT = ROOT / "data/classics-corpus/lote-50-ingestion-audit.json"
TEI_NS = "http://www.tei-c.org/ns/1.0"
CTS_NS = "http://chs.harvard.edu/xmlns/cts"
SKIP_TAGS = {"note", "bibl", "fw", "gap", "del", "surplus"}
WORK_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def local_name(tag):
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def download(url, revision):
    prefix = "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/" + revision + "/data/"
    if not url.startswith(prefix) or ".." in url or not url.endswith(".xml"):
        raise ValueError("Only pinned original TEI/CTS source URLs are allowed")
    last = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "Vitruvius-Bibliotheca-academic-ingest/1.0"}
            )
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read(5_000_001)
            if len(data) > 5_000_000 or len(data) < 400:
                raise ValueError(f"Unexpected upstream XML size: {len(data)}")
            return data
        except (TimeoutError, OSError, ValueError) as error:
            last = error
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Source inaccessible, no publication: {url}: {last}")


def text_of(element):
    """Reading text only: exclude editorial notes and duplicate choice readings."""
    if local_name(element.tag) in SKIP_TAGS:
        return ""
    if local_name(element.tag) == "choice":
        for preferred in ("corr", "reg", "expan", "lem", "orig", "sic"):
            child = next((c for c in element if local_name(c.tag) == preferred), None)
            if child is not None:
                return text_of(child)
    chunks = [element.text or ""]
    for child in element:
        chunks.append(text_of(child))
        chunks.append(child.tail or "")
    return "".join(chunks)


def norm_text(value):
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", value).strip())


def extraction(xml: bytes, urn: str):
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as error:
        raise ValueError("Invalid TEI XML") from error
    body = root.find(f".//{{{TEI_NS}}}body")
    if body is None:
        raise ValueError("TEI file has no body")
    entries = []

    def visit(node, parts):
        tag = local_name(node.tag)
        if tag in SKIP_TAGS:
            return
        if tag == "div" and node.get("type") == "textpart":
            n = str(node.get("n") or "").strip()
            if n:
                parts = [*parts, n]
        if tag in ("p", "l"):
            text = norm_text(text_of(node))
            if len(text) >= 3:
                n = node.get("n") if tag == "l" else None
                base_parts = [*parts, str(n)] if n else parts
                base = ".".join(base_parts) or "1"
                entries.append((base, text))
            return
        for child in node:
            visit(child, parts)

    visit(body, [])
    if len(entries) < 5:
        raise ValueError(f"Too few complete prose/verse units: {len(entries)}")
    counts = Counter(base for base, _ in entries)
    current = defaultdict(int)
    passages = []
    seen = set()
    for base, text in entries:
        current[base] += 1
        # A numbered CTS unit can contain several TEI paragraphs. Only the
        # final local subdivision is our own, not an original ancient locus.
        local = base if counts[base] == 1 else f"{base}.{current[base]}"
        locus = f"{urn}:{local}"
        if locus in seen:
            raise ValueError(f"Duplicated reading locator {locus}")
        seen.add(locus)
        record = {"locus": locus, "text": text}
        if counts[base] > 1:
            record["sourceLocus"] = f"{urn}:{base}"
            record["localParagraph"] = current[base]
        passages.append(record)
    character_count = sum(len(x["text"]) for x in passages)
    all_text = "".join(x["text"] for x in passages)
    alphabet = [ch for ch in all_text if ch.isalpha()]
    greek = sum("\u0370" <= ch <= "\u03ff" or "\u1f00" <= ch <= "\u1fff" for ch in alphabet)
    if character_count < 800 or not alphabet or greek / len(alphabet) < 0.45:
        raise ValueError(f"Insufficient original Greek material: {character_count} chars, ratio={greek/max(1,len(alphabet)):.2f}")
    editors = [
        norm_text(text_of(el)) for el in root.findall(f".//{{{TEI_NS}}}teiHeader//{{{TEI_NS}}}editor")
    ]
    return passages, character_count, [x for x in dict.fromkeys(editors) if x]


def cts_edition(xml: bytes, urn: str):
    root = ET.fromstring(xml)
    edition = next((el for el in root.iter() if local_name(el.tag) == "edition" and el.get("urn") == urn), None)
    if edition is None:
        raise ValueError(f"No matching edition URN in __cts__: {urn}")
    desc = next((norm_text(text_of(el)) for el in edition if local_name(el.tag) == "description"), "")
    label = next((norm_text(text_of(el)) for el in edition if local_name(el.tag) == "label"), "")
    if not desc:
        raise ValueError(f"Edition has no bibliographic reference: {urn}")
    return label, desc


def one(row, revision):
    xml = download(row["sourceXml"], revision)
    if b"creativecommons.org/licenses/by-sa/4.0" not in xml:
        raise ValueError(f"No verified CC BY-SA 4.0 license in TEI: {row['id']}")
    cts = download(row["sourceCts"], revision)
    label, edition_desc = cts_edition(cts, row["sourceUrn"])
    passages, chars, editors = extraction(xml, row["sourceUrn"])
    data = {
        "workId": row["id"], "language": "grc",
        "title": row["titleOriginal"], "sourceType": "edited-greek-tei",
        "editorialStatus": (
            "Transcripción TEI de una edición histórica: no se realizó cotejo "
            "paleográfico propio ni evaluación exhaustiva de variantes."
        ),
        "sourceUrn": row["sourceUrn"], "source": row["sourceXml"],
        "sourceCts": row["sourceCts"], "sourceRevision": revision,
        "sourceSha256": sha256(xml).hexdigest(),
        "attribution": "Perseus Digital Library · Tufts University",
        "editionReference": edition_desc, "editionGreekTitle": label,
        "editors": editors, "license": "CC BY-SA 4.0", "passages": passages,
    }
    return row, data, chars


def main():
    manifest = read_json(MANIFEST)
    rows = manifest.get("works", [])
    revision = manifest["sourceRevision"]
    if len(rows) != 50 or manifest.get("count") != 50:
        raise SystemExit("The curated lot must contain exactly 50 independently identified works")
    ids = [w["id"] for w in rows]
    if len(set(ids)) != 50 or any(not WORK_PATTERN.fullmatch(w) for w in ids):
        raise SystemExit("Repeated or malformed candidate ID")
    urns = [w["sourceUrn"] for w in rows]
    if len(set(urns)) != 50:
        raise SystemExit("Repeated Greek CTS source URN")
    old = read_json(REGISTRY)
    supplement = read_json(SUPPLEMENT)
    master = read_json(MAIN_CATALOG)
    master_ids = {w["id"] for w in master["works"]}
    recorded = {w["id"] for w in supplement["works"]}
    old_entries = {(e["workId"], e["language"]) for e in old["entries"]}
    if any(id_ in master_ids for id_ in ids):
        raise SystemExit("New lot collides with main catalogue IDs")

    print(f"Validating {len(rows)} pinned Greek TEI + CTS sources at revision {revision[:12]}")
    results = []
    failures = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        pending = {pool.submit(one, row, revision): row for row in rows}
        for future in as_completed(pending):
            row = pending[future]
            try:
                results.append(future.result())
                print(f"Validated {row['id']}")
            except Exception as e:
                failures.append(f"{row['id']}: {e}")
    if failures:
        for error in sorted(failures):
            print("ERROR:", error, file=sys.stderr)
        raise SystemExit(f"Batch failed: {len(failures)} source errors. No catalogue or corpus writes performed.")
    by_id = {row["id"]: (row, data, chars) for row, data, chars in results}

    added = 0
    for id_ in ids:
        row, data, chars = by_id[id_]
        target = ROOT / f"data/classics-corpus/{id_}-grc.json"
        if target.exists():
            present = read_json(target)
            if present.get("sourceUrn") != row["sourceUrn"] or present.get("language") != "grc":
                raise SystemExit(f"Existing corpus with conflicting identity: {id_}")
        else:
            write_json(target, data)
            added += 1
        if (id_, "grc") not in old_entries:
            old["entries"].append({
                "workId": id_, "author": row["author"],
                "title": row["titleOriginal"], "language": "grc",
                "format": "json-passages",
                "path": f"data/classics-corpus/{id_}-grc.json",
                "reader": f"classics-text-reader.html?work={id_}&lang=grc",
                "sourceUrn": row["sourceUrn"], "sourceSha256": data["sourceSha256"],
                "sourceDescription": "Perseus DL TEI · " + data["editionReference"]
                    + " · CC BY-SA 4.0; original sin cotejo independiente",
            })
        if id_ not in recorded:
            source = data["source"]
            # Preserve author/work/edition distinctions, instead of using
            # automatic transliteration as a scholarly attribution claim.
            supplement["works"].append({
                "id": id_, "author": row["author"],
                "title": row["titleOriginal"] + " · " + row["titleEs"],
                "language": "grc", "genre": row["genre"], "dating": row["dating"],
                "description": row["editorialNote"], "source": "Perseus Digital Library · edición histórica",
                "sourceUrl": source, "sourceUrn": row["sourceUrn"],
                "textStatus": "registered-pending-lexical-index",
                "status": "Texto griego extraído y catalogado; por indexar y verificar",
                "publicStatus": "registered-not-indexed",
                "corpusFiles": {"grc": f"data/classics-corpus/{id_}-grc.json"},
                "localVersions": [{"language": "grc", "path": f"data/classics-corpus/{id_}-grc.json"}],
                "reading": {
                    "url": f"classics-text-reader.html?work={id_}&lang=grc",
                    "status": "Texto original de edición histórica; no se incorpora traducción cotejada."
                },
                "translation": {"status": "Sin traducción académica alineada incorporada en este lote."},
                "bibliography": {
                    "uniformTitle": row["titleOriginal"],
                    "canonicalReference": row["sourceUrn"],
                    "editionReference": data["editionReference"],
                    "editor": ", ".join(data["editors"]) if data["editors"] else "Consultar referencia editorial",
                    "sourceCollection": "Perseus Digital Library, canonical-greekLit, TEI",
                    "sourceSha256": data["sourceSha256"],
                    "sourceRevision": revision,
                    "license": "CC BY-SA 4.0",
                    "textualNote": "La división de párrafos es local cuando una unidad CTS contiene varios párrafos.",
                },
                "cover": {
                    "type": "catalogue-typographic",
                    "notHistoricalTitlePage": True,
                },
                "links": {"scaife": "https://scaife.perseus.org/",
                          "gallica": "https://gallica.bnf.fr/",
                          "archive": "https://archive.org/"},
            })
    old["entries"].sort(key=lambda x: (x["workId"], x["language"]))
    old["count"] = len(old["entries"])
    old["works"] = len({e["workId"] for e in old["entries"]})
    old["updated"] = datetime.now(timezone.utc).date().isoformat()
    write_json(REGISTRY, old)
    write_json(SUPPLEMENT, supplement)
    audit = {
        "schema": "vdl-perseus-50-source-validation-v1",
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRevision": revision,
        "batchCount": len(results), "corpusCreated": added,
        "status": "source-validated-and-registered-pending-index",
        "limits": "No independiente collation, authorship verification or verified translation.",
        "editions": [{
            "id": id_, "sourceUrn": by_id[id_][0]["sourceUrn"],
            "sha256": by_id[id_][1]["sourceSha256"],
            "passages": len(by_id[id_][1]["passages"]), "characters": by_id[id_][2],
        } for id_ in ids],
    }
    write_json(REPORT, audit)
    print(json.dumps({"total": len(ids), "created": added, "registry": old["count"],
                      "distinctWorkIds": old["works"], "fiches": len(supplement["works"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
