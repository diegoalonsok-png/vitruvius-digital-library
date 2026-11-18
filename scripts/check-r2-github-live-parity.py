#!/usr/bin/env python3
"""Read-only, live GitHub index ↔ public Cloudflare R2 parity audit.
Checks all registered R2 digital originals by full SHA256 and passage identity.
Checks catalogued historical PDFs by HTTP HEAD (presence/size only; NOT OCR).
Does not update corpus, publish indexes, or claim scholarly collation.
"""
import concurrent.futures as cf
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://libros.vitruvius-digital-library.org/"
REPORT = ROOT / "reports/deployment/r2-github-live-parity.json"

def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))

def request(url, method="GET"):
    assert url.startswith(BASE), "R2 URL not on the documented public host"
    last = None
    for attempt in range(1, 4):
        req = urllib.request.Request(
            url, method=method,
            headers={"User-Agent": "Vitruvius-R2-GitHub-parity/1.0",
                     "Cache-Control": "no-cache", "Accept-Encoding": "identity"})
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                return response.status, dict(response.headers), (
                    response.read() if method == "GET" else b"")
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last = str(error)
            if isinstance(error, urllib.error.HTTPError) and error.code not in (408, 425, 429, 500, 502, 503, 504):
                break
            if attempt < 3:
                time.sleep(attempt)
    raise RuntimeError(last or "unknown HTTP failure")

def main():
    corpus = read("data/r2/corpus-manifest.json")
    index = read("data/index/classics-r2/manifest.json")
    registry = read("data/classics-corpus/search-registry.json")
    catalogue = read("data/r2/catalogo-clasicos-r2.json")
    assert corpus["base"] == BASE + "corpus/"
    issues = []
    works = corpus["obras"]
    indexed = {x["id"] + "|" + x["lang"]: x for x in index["index"]}
    registered = {x["workId"] + "|" + x["language"]: x for x in registry["entries"]
                  if str(x.get("path", "")).startswith(corpus["base"])}
    keys = {x["workId"] + "|" + x["language"] for x in works}
    if len(keys) != len(works) or len(indexed) != len(index["index"]) or len(registered) != len(works):
        issues.append("Duplicate/missing work-language keys in corpus, index or registry")
    if set(indexed) != keys or set(registered) != keys:
        issues.append("R2 corpus, lexical index and GitHub search registry contain different IDs")
    for original in works:
        key = original["workId"] + "|" + original["language"]
        expected_url = corpus["base"] + original["archivo"]
        for name, item, fields in (
            ("index", indexed.get(key), {"file": expected_url, "sha256": original["sha256"],
                                         "passages": original["pasajes"]}),
            ("registry", registered.get(key), {"path": expected_url, "sha256": original["sha256"],
                                               "passages": original["pasajes"]})):
            if not item:
                issues.append(name + " missing " + key)
                continue
            for field, value in fields.items():
                if item.get(field) != value:
                    issues.append(name + " field " + field + " differs for " + key)

    def verify_original(item):
        url = corpus["base"] + item["archivo"]
        result = {"id": item["workId"], "lang": item["language"], "url": url}
        try:
            status, headers, body = request(url)
            digest = hashlib.sha256(body).hexdigest()
            doc = json.loads(body)
            passages = doc.get("passages", [])
            ok = (status == 200 and digest == item["sha256"]
                  and doc.get("workId") == item["workId"]
                  and doc.get("language") == item["language"]
                  and isinstance(passages, list)
                  and len(passages) == item["pasajes"]
                  and all(isinstance(p, dict) and str(p.get("locus", "")).strip()
                          and isinstance(p.get("text"), str) and p["text"].strip()
                          for p in passages))
            result.update(ok=ok, http=status, bytes=len(body), sha256=digest,
                          passages=len(passages) if isinstance(passages, list) else None)
            if not ok: result["issue"] = "SHA256, work ID, language, text or passage count mismatch"
        except Exception as error:
            result.update(ok=False, issue=str(error)[:240])
        return result

    def verify_pdf(item):
        url = item.get("pdf", "")
        result = {"id": item["id"], "url": url}
        try:
            status, headers, _ = request(url, "HEAD")
            length = headers.get("Content-Length")
            expected = item.get("bytes")
            result.update(ok=status == 200 and (not length or not expected or int(length) == expected),
                          http=status, content_length=int(length) if length else None,
                          expected_bytes=expected)
            if not result["ok"]: result["issue"] = "PDF HEAD/size mismatch; full PDF SHA not checked"
        except Exception as error:
            result.update(ok=False, issue=str(error)[:240])
        return result

    with cf.ThreadPoolExecutor(max_workers=8) as executor:
        original_results = list(executor.map(verify_original, works))
    with cf.ThreadPoolExecutor(max_workers=12) as executor:
        pdf_results = list(executor.map(verify_pdf, catalogue["items"]))
    total_ok = sum(x["ok"] for x in original_results)
    pdf_ok = sum(x["ok"] for x in pdf_results)
    report = {
        "schema": "vdl-github-r2-live-parity-v1",
        "checked_utc": datetime.now(timezone.utc).isoformat(),
        "github_sha": os.environ.get("GITHUB_SHA", "local"),
        "method": "Full public HTTP GET + SHA256 of indexed digital original JSON; HTTP HEAD and size check of historical PDFs. No OCR, original editing, deletion, or index rebuild.",
        "summary": {
            "github_registry_total": len(registry["entries"]),
            "r2_originals_declared": len(works),
            "r2_originals_verified": total_ok,
            "r2_original_passages_declared": sum(x["pasajes"] for x in works),
            "r2_pdf_editions_declared": len(catalogue["items"]),
            "r2_pdf_head_verified": pdf_ok,
            "metadata_discrepancies": len(issues),
            "r2_original_failures": len(original_results) - total_ok,
            "r2_pdf_failures": len(pdf_results) - pdf_ok,
        },
        "metadata_issues": issues,
        "original_failures": [x for x in original_results if not x["ok"]],
        "pdf_failures": [x for x in pdf_results if not x["ok"]],
        "limitations": [
            "Full PDF SHA256 bytes are not re-downloaded by this job.",
            "Unregistered bucket objects and orphan index entries require authenticated S3 LIST and provenance review.",
            "R2 JSON is an edition text index, not OCR or a verified critical collation.",
            "A temporary network failure is reported, never silently counted as OK.",
        ],
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    for x in (issues[:15] + [str(z) for z in (report["original_failures"][:8] + report["pdf_failures"][:8])]):
        print("ISSUE", x)
    return 0 if total_ok == len(works) and pdf_ok == len(catalogue["items"]) and not issues else 1

if __name__ == "__main__":
    raise SystemExit(main())
