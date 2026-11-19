#!/usr/bin/env python3
"""Non-destructive public R2 ↔ GitHub text parity audit.

Checks byte-level SHA-256 and JSON passage metadata of EVERY R2 corpus URL
declared in data/classics-corpus/search-registry.json. R2 scanned books
and GitHub CTS editions are different witnesses and are not expected to have
identical text or matching identifiers. This tool never writes to R2.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
import unicodedata
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
HOST = "https://libros.vitruvius-digital-library.org/"
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
R2_CATALOG = ROOT / "data/r2/catalogo-clasicos-r2.json"
MAX_BYTES = 64 * 1024 * 1024


def download(url):
    if not url.startswith(HOST) or any(x in url for x in ("?", "#", "..")):
        raise ValueError("Unexpected external path; URL is not the declared R2 public host")
    req = Request(url, headers={"User-Agent": "Vitruvius-Symmetry-Audit/1.0", "Accept": "application/json"})
    with urlopen(req, timeout=50) as response:
        if response.status != 200:
            raise ValueError("HTTP " + str(response.status))
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("File exceeds 64 MiB audit safety cap")
    return data


def audit_text(entry):
    result = {"id": entry["workId"], "language": entry["language"],
              "url": entry["path"], "status": "ok", "issues": []}
    try:
        raw = download(entry["path"])
        result["bytes"] = len(raw)
        digest = hashlib.sha256(raw).hexdigest()
        result["actualSha256"] = digest
        result["expectedSha256"] = entry.get("sha256")
        if digest != entry.get("sha256"):
            result["issues"].append("sha256-mismatch")
        obj = json.loads(raw.decode("utf-8-sig"))
        if not isinstance(obj, dict):
            raise ValueError("JSON root is not an object")
        passages = obj.get("passages")
        if not isinstance(passages, list):
            result["issues"].append("missing-passages-array")
            passages = []
        result["actualPassages"] = len(passages)
        result["expectedPassages"] = entry.get("passages")
        if len(passages) != entry.get("passages"):
            result["issues"].append("passage-count-mismatch")
        for prop, expected in (("workId", entry["workId"]), ("language", entry["language"])):
            if obj.get(prop) is not None and obj[prop] != expected:
                result["issues"].append(prop + "-mismatch")
        loci = [p.get("locus") for p in passages if isinstance(p, dict)]
        if len(loci) != len(passages) or any(not isinstance(x, str) or not x.strip() for x in loci):
            result["issues"].append("invalid-loci")
        elif len(loci) != len(set(loci)):
            result["issues"].append("duplicate-loci")
        if not passages or not any(isinstance(p, dict) and
           (isinstance(p.get("text"), str) or isinstance(p.get("original"), str) or
            isinstance(p.get("latin"), str) or isinstance(p.get("greek"), str)) for p in passages):
            result["issues"].append("no-searchable-text")
    except (HTTPError, URLError, OSError, ValueError, UnicodeError, json.JSONDecodeError) as exc:
        result["issues"].append("download-or-parse-failure")
        result["detail"] = str(exc)[:300]
    if result["issues"]:
        result["status"] = "failed"
    return result


def audit_ocr(item):
    out = {"id": item["id"], "url": item["texto"], "status": "ok", "issues": []}
    try:
        raw = download(item["texto"])
        obj = json.loads(raw.decode("utf-8-sig"))
        pages = obj.get("paginas") if isinstance(obj, dict) else None
        if not isinstance(pages, list):
            out["issues"].append("missing-page-array")
        else:
            out["actualPages"] = len(pages)
            out["declaredPages"] = item.get("paginas")
            if len(pages) != item.get("paginas"):
                out["issues"].append("page-count-mismatch")
            # Match the site's VitruviaPhilology.fold: pages containing only punctuation
            # or combining marks are not treated as searchable text pages.
            nonblank = sum(isinstance(p, str) and any(
                unicodedata.category(ch)[0] in ("L", "N")
                for ch in unicodedata.normalize("NFD", p)
            ) for p in pages)
            out["actualTextPages"] = nonblank
            out["declaredTextPages"] = item.get("paginasConTexto")
            if nonblank != item.get("paginasConTexto"):
                out["issues"].append("nonblank-page-count-mismatch")
    except (HTTPError, URLError, OSError, ValueError, UnicodeError, json.JSONDecodeError) as exc:
        out["issues"].append("download-or-parse-failure")
        out["detail"] = str(exc)[:300]
    if out["issues"]:
        out["status"] = "warning"  # OCR is noisy; don't equate OCR with edition text
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default="/tmp/vitruvius-r2-symmetry-report.json")
    ap.add_argument("--limit", type=int, default=0, help="0 = audit all registered remote texts")
    ap.add_argument("--ocr-sample", type=int, default=6)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()
    index = json.loads(REGISTRY.read_text(encoding="utf-8"))
    catalogue = json.loads(R2_CATALOG.read_text(encoding="utf-8"))
    entries = index["entries"]
    books = catalogue["items"]
    remote = [e for e in entries if isinstance(e.get("path"), str) and e["path"].startswith("https://")]
    remote = sorted(remote, key=lambda e: (e.get("workId", ""), e.get("language", "")))
    if args.limit:
        remote = remote[:args.limit]
    bad = []
    for e in remote:
        if not e["path"].startswith(HOST) or not e.get("sha256") or not isinstance(e.get("passages"), int):
            bad.append(e.get("workId"))
    pairs = {(e["workId"], e["language"], e["path"]) for e in entries}
    if len(pairs) != len(entries):
        bad.append("duplicate-registry-entries")
    book_ids = {b["id"] for b in books}
    overlap = {e["workId"] for e in remote if e["workId"] in book_ids}
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 6))) as executor:
        text_rows = list(executor.map(audit_text, remote))
        ocr_rows = list(executor.map(audit_ocr, books[:max(0, args.ocr_sample)]))
    facsimile_index = {"status": "unavailable", "indexedIds": 0, "uncataloguedIds": [], "missingIds": []}
    try:
        idx = json.loads(download(HOST + "clasicos/indice/fragmentos.json").decode("utf-8-sig"))
        indexed_ids = {x["id"] for x in idx.get("obras", []) if isinstance(x, dict) and x.get("id")}
        facsimile_index = {
            "status": "verified-index-list", "indexedIds": len(indexed_ids),
            "uncataloguedIds": sorted(indexed_ids - book_ids),
            "missingIds": sorted(book_ids - indexed_ids)
        }
    except (HTTPError, URLError, OSError, ValueError, UnicodeError, json.JSONDecodeError) as error:
        facsimile_index["detail"] = str(error)[:250]
    report = {
        "schema": "vitruvius-r2-github-text-symmetry-audit-v1",
        "basis": "public R2 HTTP objects and GitHub registry at CI checkout; no private R2 enumeration",
        "registryEditions": len(entries), "registryWorks": len({e["workId"] for e in entries}),
        "r2ScannedVolumes": len(books),
        "r2RemoteTextEntriesDeclared": len([e for e in entries if str(e.get("path", "")).startswith("https://")]),
        "r2RemoteTextsAudited": len(text_rows),
        "r2TextsVerified": sum(e["status"] == "ok" for e in text_rows),
        "r2TextsFailed": sum(e["status"] == "failed" for e in text_rows),
        "sharedIdsInAuditedRemoteTexts": len(overlap),
        "ocrSamplesAudited": len(ocr_rows),
        "ocrSamplesWarned": sum(e["status"] == "warning" for e in ocr_rows),
        "metadataErrors": bad, "facsimileIndex": facsimile_index,
        "remoteTexts": text_rows, "ocrSamples": ocr_rows
    }
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in ("remoteTexts", "ocrSamples")}, ensure_ascii=False, indent=2))
    for row in text_rows:
        print(("%s" % ("PASS" if row["status"] == "ok" else "FAIL")),
              row["id"], row["language"], ",".join(row["issues"]))
    for row in ocr_rows:
        print(("PASS" if row["status"] == "ok" else "WARN"), "OCR", row["id"], ",".join(row["issues"]))
    if bad or report["r2TextsFailed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
