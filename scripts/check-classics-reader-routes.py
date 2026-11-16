#!/usr/bin/env python3
"""Read-only regression check for bibliotheca reader destinations and R2 declarations.

This examines the search registry and R2 manifest, NOT the remote bytes.
It deliberately does not claim that an HTTP URL works or that a work is complete.
Usage: python3 scripts/check-classics-reader-routes.py [--json] [--self-test]
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
MANIFEST = ROOT / "data/r2/corpus-manifest.json"
KNOWN_FORMATS = {"json-passages", "structured-bilingual", "historical-ocr-pages", "html-text"}
LOCAL_READERS = {
    "classics-text-reader.html", "lector-bilingue.html", "concordancia-historica.html"
}


def check(registry, manifest):
    rows = registry.get("entries", [])
    base = manifest.get("base", "")
    sources = manifest.get("obras", [])
    source_keys = {(base + item.get("archivo", ""), item.get("workId"), item.get("language"))
                   for item in sources}
    errors, warnings = [], []
    formats = Counter()
    seen = set()
    remote = 0
    for index, entry in enumerate(rows, 1):
        work, lang, kind = entry.get("workId"), entry.get("language"), entry.get("format")
        label = f"{work or '#'+str(index)}/{lang or '?'}"
        formats[kind] += 1
        if not all(isinstance(entry.get(k), str) and entry[k].strip()
                   for k in ("workId", "author", "title", "language", "format", "path", "reader")):
            errors.append(f"{label}: bibliographic/reader field missing")
        key = (work, lang)
        if key in seen:
            errors.append(f"{label}: duplicate work-language edition")
        seen.add(key)
        if kind not in KNOWN_FORMATS:
            errors.append(f"{label}: unknown text format {kind}")
        reader = urlsplit(entry.get("reader", ""))
        if reader.scheme or reader.netloc or reader.path.startswith("/") or ".." in Path(reader.path).parts:
            errors.append(f"{label}: reader must be a safe site-relative path")
        if not reader.path.endswith(".html"):
            errors.append(f"{label}: reader does not point to an HTML page")
        query = parse_qs(reader.query)
        if kind == "json-passages":
            if reader.path != "classics-text-reader.html" or query.get("work") != [work] or query.get("lang") != [lang]:
                errors.append(f"{label}: incorrect work/language reader destination")
        if kind == "structured-bilingual":
            if reader.path != "lector-bilingue.html" or query.get("edition") != [entry.get("edition")]:
                errors.append(f"{label}: incorrect bilingual edition destination")
        if kind == "historical-ocr-pages" and reader.path != "concordancia-historica.html":
            errors.append(f"{label}: unexpected historical OCR reader destination")
        src = entry.get("path", "")
        parsed = urlsplit(src)
        if parsed.scheme:
            remote += 1
            if parsed.scheme != "https" or parsed.netloc != "libros.vitruvius-digital-library.org":
                errors.append(f"{label}: unapproved remote text host")
            if (src, work, lang) not in source_keys:
                errors.append(f"{label}: source not matched in R2 manifest")
        elif not src or Path(src).is_absolute() or ".." in Path(src).parts:
            errors.append(f"{label}: invalid local source path")
        elif not (ROOT / src).is_file():
            # Local file existence is checked by the existing coverage audit.
            # Keep this route check useful in metadata-only or sparse clones.
            warnings.append(f"{label}: local file not present in this checkout")
    if registry.get("count") != len(rows):
        errors.append("registry entry count differs from actual entries")
    if registry.get("works") != len({entry.get("workId") for entry in rows}):
        errors.append("registry work count differs from distinct work IDs")
    report = {
        "status": "FAIL" if errors else "PASS",
        "registry_editions": len(rows),
        "distinct_registered_works": len({e.get("workId") for e in rows}),
        "remote_registry_entries": remote,
        "r2_manifest_records": len(sources),
        "formats": dict(formats),
        "error_count": len(errors), "warning_count": len(warnings),
        "errors": errors, "warnings": warnings,
        "scope": "declared routes and source identities only; remote HTTP/R2 readability unverified"
    }
    return report


def self_test():
    base = {"schema": "test", "count": 1, "works": 1, "entries": [{
        "workId": "example", "author": "Example", "title": "Text",
        "language": "la", "format": "json-passages", "path": "test/example.json",
        "reader": "classics-text-reader.html?work=example&lang=la"
    }]}
    manifest = {"base": "https://libros.vitruvius-digital-library.org/corpus/", "obras": []}
    assert not check(base, manifest)["errors"]
    bad = json.loads(json.dumps(base))
    bad["entries"][0]["reader"] = "classics-text-reader.html?work=another&lang=la"
    assert any("incorrect work/language" in e for e in check(bad, manifest)["errors"])
    bad = json.loads(json.dumps(base))
    bad["count"] = 2
    assert any("count" in e for e in check(bad, manifest)["errors"])
    bad = json.loads(json.dumps(base))
    bad["entries"][0]["path"] = "https://libros.vitruvius-digital-library.org/corpus/example.json"
    assert any("not matched" in e for e in check(bad, manifest)["errors"])
    print("PASS: four route/identity regression fixtures")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    report = check(registry, manifest)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"{report['status']}: {report['registry_editions']} editions, "
              f"{report['distinct_registered_works']} works, "
              f"{report['remote_registry_entries']} R2 source declarations; "
              f"{report['error_count']} errors, {report['warning_count']} warnings")
        for error in report["errors"]:
            print("ERROR:", error)
        for warning in report["warnings"][:10]:
            print("WARN:", warning)
        print(report["scope"])
    return int(bool(report["errors"]))


if __name__ == "__main__":
    sys.exit(main())
