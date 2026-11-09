#!/usr/bin/env python3
"""Indexar dos textos originales latinos de Séneca fuera de GitHub Pages.

Sólo genera derivados de originales TEI identificados; no altera folios,
códices, manuscritos, PDF, DOCX, traducciones ni la web publicada.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("mass_index", ROOT / "scripts/mass-index-classics.py")
mass = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mass)

BRANCH = "corpus-originales-griegos-20261108"
ROOT_URL = "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/"
DEST = "data/offsite-originals"
SOURCES = (
    ("seneca-de-ira", "stoa0255.stoa010", "data/stoa0255/stoa010/stoa0255.stoa010.perseus-lat2.xml",
     "De ira", "1928", "1"),
    ("seneca-de-tranquillitate", "stoa0255.stoa013", "data/stoa0255/stoa013/stoa0255.stoa013.perseus-lat2.xml",
     "De tranquillitate animi", "1932", "2"),
)


def download(relative: str, limit: int) -> bytes:
    if relative.startswith("/") or ".." in relative:
        raise ValueError("Invalid remote path")
    with urlopen(Request(ROOT_URL + relative, headers={"User-Agent": "VitruviusTEI/1.0"}), timeout=55) as response:
        if response.status != 200:
            raise ValueError("HTTP source error: " + str(response.status))
        value = response.read(limit + 1)
    if len(value) > limit:
        raise ValueError("Source exceeds vetted size limit")
    return value


def build(target: Path) -> None:
    catalog = json.loads((ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json").read_text("utf-8"))
    works = {w["id"]: w for w in catalog["works"]}
    roadmap = json.loads((ROOT / "data/classics-corpus/indexation-roadmap-222.json").read_text("utf-8"))
    missing = {w["id"] for w in roadmap["items"] if not w["originalIndexed"]}
    license_text = download("license.md", 85000).decode("utf-8")
    if "Attribution-ShareAlike 4.0 International" not in license_text:
        raise ValueError("Perseus repository CC BY-SA license not established")
    entries = []
    target.mkdir(parents=True, exist_ok=True)
    for work_id, urn, relative, title, year, volume in SOURCES:
        if work_id not in missing or works[work_id]["language"] != "la":
            raise ValueError("Not a pending Latin original: " + work_id)
        original = download(relative, 2_000_000)
        source_url = ROOT_URL + relative
        edition = mass.edition_document(works[work_id], "la", source_url, original, urn)
        if edition["workId"] != work_id or edition["language"] != "la":
            raise ValueError("Edition does not match catalog")
        if len(edition["passages"]) < 5 or sum(len(p["text"]) for p in edition["passages"]) < 2000:
            raise ValueError("Latin TEI extraction insufficient")
        edition["schema"] = "vitruvius-offsite-latin-original-v1"
        edition["editor"] = "John William Basore"
        edition["license"] = "CC BY-SA 4.0 (PerseusDL/canonical-latinLit repository); preserve edition credits"
        edition["editorialStatus"] = "Latin edition from identified TEI; not manuscript collation or diplomatic transcription"
        edition["attribution"] = (f"L. Annaeus Seneca, {title}, ed. John William Basore, Moral Essays, "
                                  f"vol. {volume} (London: William Heinemann; New York: G. P. Putnam's Sons, {year}), "
                                  "Perseus Project, TEI digital edition.")
        edition["alignment"] = "TEI editorial divisions only. No automatic alignment with translations or folios."
        content = (json.dumps(edition, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        dest = target / f"{work_id}-la.json"
        dest.write_bytes(content)
        entries.append({
            "workId": work_id, "author": works[work_id]["author"], "title": works[work_id]["title"],
            "language": "la", "path": f"{DEST}/{dest.name}", "bytes": len(content),
            "passages": len(edition["passages"]), "source": source_url,
            "sourceUrn": urn, "sourceSha256": hashlib.sha256(original).hexdigest(),
            "attribution": edition["attribution"],
        })
    manifest = {
        "schema": "vitruvius-offsite-latin-originals-manifest-v1",
        "branch": BRANCH, "count": len(entries), "entries": entries,
        "licenseSource": ROOT_URL + "license.md",
        "policy": "Derived textual index only; no site, codex, folio, PDF, DOCX or translation changes.",
    }
    (target / "latin-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if manifest["count"] != len(SOURCES):
        raise ValueError("Incomplete TEI batch")
    print(json.dumps({"indexedOffsite": len(entries), "passages": sum(e["passages"] for e in entries),
                      "bytes": sum(e["bytes"] for e in entries)}, ensure_ascii=False))


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--output", required=True)
    build(Path(cli.parse_args().output))
