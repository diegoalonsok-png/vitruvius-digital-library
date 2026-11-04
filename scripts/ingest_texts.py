#!/usr/bin/env python3
"""Vitruvia universal text ingestion for GitHub Pages.

Discovers and ingests openly licensed TEI editions in configured repositories;
also supports local TXT, HTML, TEI/XML, DOCX and text-extractable PDF files.
Every output uses the common source/passages contract. Never call a PDF scan
OCRed unless it is actually transcribed. No per-person or per-work logic.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.parse import quote
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "data/text-ingestion.json"
CORPORA = ROOT / "data/ai-corpora.json"
STATUS = ROOT / "data/ingestion-status.json"
OUTPUT = ROOT / "data/structured"
NS = {"tei": "http://www.tei-c.org/ns/1.0"}
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"
USER_AGENT = "VitruviaAcademicIndexer/1.0 (+https://github.com/diegoalonsok-png/vitruvius-digital-library)"
ALLOWED_EXTENSIONS = {".txt", ".html", ".htm", ".xml", ".tei", ".docx", ".pdf"}
GENERIC_LICENSES = {"CC BY-SA 4.0", "CC BY 4.0", "Public Domain", "CC0 1.0"}
WHITESPACE = re.compile(r"\s+", re.UNICODE)
MAX_BYTES = 2_000_000
SLICE_WORDS = 360
OVERLAP = 50


def normalize(value: str) -> str:
    return WHITESPACE.sub(" ", value).strip()


def fetch(url: str, limit: int = 2_000_000) -> bytes:
    if not url.startswith("https://"):
        raise ValueError("only HTTPS public source URLs are permitted")
    request = Request(url, headers={
        "Accept": "application/vnd.github+json" if "api.github.com/" in url else "*/*",
        "User-Agent": USER_AGENT,
        **({"Authorization": "Bearer " + os.environ["GH_TOKEN"]} if "GH_TOKEN" in os.environ and "api.github.com/" in url else {}),
    })
    with urlopen(request, timeout=24) as response:
        if response.status != 200:
            raise ValueError("source HTTP %s" % response.status)
        body = response.read(limit + 1)
    if len(body) > limit:
        raise ValueError("source exceeds %s-byte limit" % limit)
    return body


def github_tree(collection: dict) -> list[dict]:
    name = collection["repository"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", name):
        raise ValueError("invalid public GitHub repository")
    ref = collection.get("ref", "master")
    if not re.fullmatch(r"[A-Za-z0-9._-]+", ref):
        raise ValueError("invalid Git ref")
    url = f"https://api.github.com/repos/{name}/git/trees/{quote(ref)}?recursive=1"
    result = json.loads(fetch(url, limit=9_000_000))
    if result.get("truncated"):
        print("WARNING: GitHub tree truncated for", name, file=sys.stderr)
    exclusions = set(collection.get("excludeFileNames", []))
    prefix = collection.get("prefix", "data/")
    limit = min(int(collection.get("maxBytesPerDocument", MAX_BYTES)), MAX_BYTES)
    return [
        file for file in result.get("tree", [])
        if file.get("type") == "blob"
        and file.get("path", "").startswith(prefix)
        and file.get("path", "").endswith(".xml")
        and not file.get("path", "").endswith("__cts__.xml")
        and Path(file["path"]).name not in exclusions
        and 500 <= int(file.get("size", 0)) <= limit
    ]


def read_remote_tei(collection: dict, path: str) -> bytes:
    repo = collection["repository"]
    ref = collection.get("ref", "master")
    if ".." in Path(path).parts or not path.startswith(collection.get("prefix", "data/")):
        raise ValueError("source path outside configured prefix")
    raw = f"https://raw.githubusercontent.com/{repo}/{ref}/{path}"
    return fetch(raw, limit=min(int(collection.get("maxBytesPerDocument", MAX_BYTES)), MAX_BYTES))


def source_identity(repo: str, path: str) -> str:
    return f"{repo}:{path}"


def clean_text(value: str) -> str:
    return normalize(value.replace("\x00", " "))


def xml_text(elem: ET.Element) -> str:
    return clean_text(" ".join(elem.itertext()))


def strip_namespace(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def tei_extract(data: bytes, fallback_title: str) -> tuple[str, str, str, list[dict]]:
    root = ET.fromstring(data)
    if strip_namespace(root.tag) != "TEI":
        raise ValueError("not a TEI document")
    title_node = root.find(".//tei:titleStmt/tei:title", NS)
    author_node = root.find(".//tei:titleStmt/tei:author", NS)
    title = xml_text(title_node) if title_node is not None else fallback_title
    author = xml_text(author_node) if author_node is not None else "Autor según archivo TEI"
    text_node = root.find(".//tei:text", NS)
    language = text_node.get(XML_LANG, "") if text_node is not None else ""
    body = root.find(".//tei:text/tei:body", NS)
    if body is None:
        raise ValueError("TEI contains no text/body")
    parents = {child: parent for parent in root.iter() for child in parent}
    lines = body.findall(".//tei:l", NS)
    paragraphs = body.findall(".//tei:p", NS)
    if not lines and not paragraphs:
        paragraphs = [body]

    def location(elem: ET.Element) -> str:
        parts = []
        current = parents.get(elem)
        while current is not None and current is not body:
            if strip_namespace(current.tag) == "div":
                n = current.get("n")
                if n:
                    parts.append(n.replace(".", "_"))
            current = parents.get(current)
        return ".".join(reversed(parts)) or "text"

    records = []
    for element in (lines if lines else paragraphs):
        text = xml_text(element)
        if not text:
            continue
        records.append((location(element), element.get("n", ""), text))
    if not records:
        raise ValueError("TEI has no searchable text")
    passages = []
    if lines:
        group = []
        last_location = None
        for book, number, text in records:
            if last_location is not None and book != last_location and group:
                passages.extend(verse_windows(group))
                group = []
            group.append((book, number, text))
            last_location = book
        if group:
            passages.extend(verse_windows(group))
    else:
        grouped = []
        current = None
        for place, number, paragraph in records:
            if current is not None and current != place:
                passages.extend(prose_windows(grouped, current))
                grouped = []
            grouped.append(paragraph)
            current = place
        if grouped:
            passages.extend(prose_windows(grouped, current or "text"))
    if not passages:
        raise ValueError("no nonempty TEI passages")
    return title, author, language, passages


def verse_windows(lines: list[tuple[str, str, str]]) -> list[dict]:
    result = []
    # 10 successive verses, overlapping by two. Critical line references retained.
    for offset in range(0, len(lines), 8):
        group = lines[offset:offset + 10]
        if not group:
            continue
        book = group[0][0]
        start = group[0][1] or str(offset + 1)
        end = group[-1][1] or str(offset + len(group))
        result.append({"locus": f"{book}.{start}-{end}", "original": clean_text(" ".join(x[2] for x in group)),
                       "translation": "", "locusKind": "TEI verse numbers"})
        if offset + 10 >= len(lines):
            break
    return result


def prose_windows(paragraphs: list[str], location: str) -> list[dict]:
    words = " ".join(paragraphs).split()
    out = []
    for index, position in enumerate(range(0, len(words), SLICE_WORDS - OVERLAP), 1):
        chunk = words[position:position + SLICE_WORDS]
        if not chunk:
            break
        out.append({
            "locus": location + ".segment-" + str(index),
            "original": " ".join(chunk), "translation": "",
            "locusKind": "generated segment, not a critical edition locus",
        })
        if position + SLICE_WORDS >= len(words):
            break
    return out


class HTMLText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hidden = 0
        self.text = []
        self.title = []
        self.in_title = False
    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "noscript", "nav", "footer"}:
            self.hidden += 1
        if tag == "title":
            self.in_title = True
        if tag in {"p", "h1", "h2", "h3", "div", "br"} and not self.hidden:
            self.text.append("\n")
    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript", "nav", "footer"}:
            self.hidden = max(self.hidden - 1, 0)
        if tag == "title":
            self.in_title = False
    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title.append(data)
        elif not self.hidden:
            self.text.append(data)


def local_extract(path: Path) -> tuple[str, list[dict]]:
    suffix = path.suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError("unsupported extension")
    if path.stat().st_size > 25_000_000:
        raise ValueError("local source exceeds 25 MB")
    if suffix in {".txt", ".html", ".htm"}:
        raw = path.read_text(encoding="utf-8-sig")
        if suffix in {".html", ".htm"}:
            parser = HTMLText()
            parser.feed(raw)
            raw = " ".join(parser.text)
            title = clean_text(" ".join(parser.title))
        else:
            title = path.stem
    elif suffix in {".xml", ".tei"}:
        title, _, _, passages = tei_extract(path.read_bytes(), path.stem)
        return title, passages
    elif suffix == ".docx":
        with ZipFile(path) as z:
            document = ET.fromstring(z.read("word/document.xml"))
        paragraphs = []
        for para in document.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
            paragraphs.append(clean_text(" ".join(para.itertext())))
        raw, title = "\n".join(paragraphs), path.stem
    else:
        try:
            from pypdf import PdfReader
        except ImportError as error:
            raise ValueError("pypdf required for text-extractable PDFs") from error
        reader = PdfReader(str(path))
        raw = "\n".join(page.extract_text() or "" for page in reader.pages)
        title = path.stem
        if len(raw.split()) < 30:
            raise ValueError("scanned image PDF: OCR required, not indexed as text")
    return title, prose_windows([raw], "text")


def allow_license(entry: dict) -> None:
    license_name = entry.get("license", "")
    if license_name not in GENERIC_LICENSES:
        raise ValueError("source has no explicit eligible open license: " + license_name)


def work_entry(identity: str, title: str, author: str, language: str,
               license_name: str, provenance: str, source_url: str, passages: list[dict]) -> tuple[dict, dict]:
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:14]
    work_id = "ingested-" + digest
    edition = "archive-" + digest
    output_name = f"data/structured/{edition}.json"
    doc = {
        "schema": 1, "edition": edition, "version": "Transcripción TEI / edición de la fuente",
        "title": title, "author": author, "language": language, "license": license_name,
        "source": {"url": source_url, "provenance": provenance, "sourceIdentity": identity,
                   "method": "Universal TEI/TXT/HTML/DOCX/PDF ingestion; no OCR or folio-location inference"},
        "passages": passages,
    }
    for p in doc["passages"]:
        p["reader"] = source_url
    catalog = {"url": output_name, "workId": work_id, "workTitle": title,
               "author": author, "edition": edition, "language": language,
               "source": provenance, "license": license_name, "reader": source_url,
               "sourceIdentity": identity}
    return catalog, doc


def write_json(path: Path, item: dict) -> int:
    encoded = json.dumps(item, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)
    return len(encoded)


def run() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-new", type=int, default=None)
    args = parser.parse_args()
    settings = json.loads(CONFIG.read_text(encoding="utf-8"))
    manifest = json.loads(CORPORA.read_text(encoding="utf-8"))
    sources = manifest.setdefault("sources", [])
    existing = {s.get("sourceIdentity") for s in sources if s.get("sourceIdentity")}
    cap = min(max(1, args.max_new or settings.get("maxNewDocumentsPerRun", 12)), 40)
    max_output = min(settings.get("maxOutputBytesPerRun", 10_000_000), 35_000_000)
    created, errors, total_bytes, skipped = [], [], 0, 0

    candidates = []
    for collection in settings.get("collections", []):
        if not collection.get("enabled"):
            continue
        try:
            allow_license(collection)
            for item in sorted(github_tree(collection), key=lambda x: x["path"]):
                identity = source_identity(collection["repository"], item["path"])
                if identity not in existing:
                    candidates.append(("github", identity, collection, item["path"]))
        except Exception as error:
            errors.append(collection.get("repository", "?") + ": " + str(error))
    for local in settings.get("localFiles", []):
        try:
            allow_license(local)
            source_path = local["path"]
            normalized = (ROOT / source_path).resolve()
            if not normalized.is_relative_to(ROOT):
                raise ValueError("local source outside repository")
            if not normalized.is_file():
                raise ValueError("source file missing")
            identity = "local:" + source_path
            if identity not in existing:
                candidates.insert(0, ("local", identity, local, normalized))
        except Exception as error:
            errors.append("local source: " + str(error))

    for kind, identity, source, location in candidates:
        if len(created) >= cap or total_bytes >= max_output:
            break
        try:
            if kind == "github":
                raw = read_remote_tei(source, location)
                title, author, detected_language, passages = tei_extract(raw, Path(location).stem)
                language = detected_language or source.get("language", "la")
                ref = source.get("ref", "master")
                url = f"https://github.com/{source['repository']}/blob/{ref}/{location}"
            else:
                title, passages = local_extract(location)
                author = source.get("author", "Autor según metadatos del archivo")
                language = source.get("language", "")
                url = source.get("reader", "https://github.com/diegoalonsok-png/vitruvius-digital-library")
            if len(passages) < 1:
                raise ValueError("no searchable passages")
            catalog, doc = work_entry(identity, source.get("title", title), author, language,
                                      source["license"], source.get("source", identity), url, passages)
            encoded = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            if total_bytes + len(encoded) > max_output:
                skipped += 1
                continue
            if not args.dry_run:
                target = ROOT / catalog["url"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(encoded)
                sources.append(catalog)
            created.append({"work": catalog["workTitle"], "passages": len(passages),
                            "size": len(encoded), "url": catalog["url"], "identity": identity})
            total_bytes += len(encoded)
        except Exception as error:
            errors.append(identity + ": " + str(error)[:240])

    if not args.dry_run:
        if created:
            manifest["updated"] = date.today().isoformat()
            CORPORA.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        STATUS.write_text(json.dumps({
            "updated": date.today().isoformat(),
            "indexedSourceCount": len(sources), "newSourceCount": len(created),
            "newSourceBytes": total_bytes, "pendingCandidates": max(0, len(candidates)-len(created)),
            "created": created, "skippedForSize": skipped, "errors": errors[:25],
            "note": "Only locally indexed corpus sources are counted; Wikisource results are external discovery.",
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"indexed": len(created), "passages": sum(x["passages"] for x in created),
                      "bytes": total_bytes, "errors": errors[:10], "dryRun": args.dry_run},
                     ensure_ascii=False))
    if errors and not created:
        print("No new texts indexed; see errors", file=sys.stderr)


if __name__ == "__main__":
    run()
