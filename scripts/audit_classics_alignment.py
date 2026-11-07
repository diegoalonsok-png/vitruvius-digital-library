#!/usr/bin/env python3
"""Audit completeness and locus compatibility of locally indexed classical texts.

Run after corpus updates. Never changes original text or invents alignments.
Scanned PDFs and bibliography-only records are not considered indexable text.
"""
from __future__ import annotations
import argparse
import collections
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
REGISTER = ROOT / "data/classics-corpus/search-registry.json"
CATALOG = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
DEFAULT_OUTPUT = ROOT / "data/classics-corpus/locus-compatibility-report.json"


def read_json(path: pathlib.Path):
    return json.loads(path.read_text(encoding="utf-8"))


def audit():
    registry = read_json(REGISTER)
    catalog = read_json(CATALOG)
    catalog_by_id = {work["id"]: work for work in catalog["works"]}
    claims = collections.defaultdict(list)
    issues = []
    seen = set()
    for entry in registry["entries"]:
        if entry.get("format") != "json-passages":
            continue
        key = (entry["workId"], entry["language"])
        if key in seen:
            issues.append({"work": key[0], "language": key[1], "kind": "duplicate-registry-entry"})
            continue
        seen.add(key)
        rel = entry["path"]
        expected = f"data/classics-corpus/{key[0]}-{key[1]}.json"
        if rel != expected:
            issues.append({"work": key[0], "language": key[1], "kind": "unexpected-path"})
            continue
        path = ROOT / rel
        if not path.is_file():
            issues.append({"work": key[0], "language": key[1], "kind": "missing-file"})
            continue
        data = read_json(path)
        if (data.get("workId"), data.get("language")) != key:
            issues.append({"work": key[0], "language": key[1], "kind": "metadata-mismatch"})
            continue
        passages = data.get("passages")
        if not isinstance(passages, list) or not passages:
            issues.append({"work": key[0], "language": key[1], "kind": "no-passages"})
            continue
        keys = [str(p.get("locus", "")).strip() for p in passages]
        if len(set(keys)) != len(keys) or any(not k for k in keys):
            issues.append({"work": key[0], "language": key[1], "kind": "duplicate-or-empty-locus"})
        blank = sum(not isinstance(p.get("text"), str) or not p["text"].strip() for p in passages)
        if blank:
            issues.append({"work": key[0], "language": key[1], "kind": "empty-passages", "count": blank})
        claims[key[0]].append({
            "language": key[1], "passages": len(passages),
            "loci": keys, "source": rel, "empty": blank,
        })
    works = []
    for work in catalog["works"]:
        versions = claims.get(work["id"], [])
        original = work.get("language")
        pairs = []
        for i, a in enumerate(versions):
            for b in versions[i+1:]:
                left, right = set(a["loci"]), set(b["loci"])
                intersection = left & right
                pairs.append({
                    "languages": [a["language"], b["language"]],
                    "sharedLoci": len(intersection),
                    "leftLoci": len(left), "rightLoci": len(right),
                    "alignment": (
                        "same-editorial-locus-only" if intersection
                        else "no-shared-loci-manual-comparison"
                    ),
                    "coverageLeftPct": round(100 * len(intersection) / len(left), 1) if left else 0,
                    "coverageRightPct": round(100 * len(intersection) / len(right), 1) if right else 0,
                    "warning": "Coincidir por locus NO confirma equivalencia filológica de contenido.",
                })
        works.append({
            "id": work["id"], "title": work.get("title", ""),
            "originalLanguage": original, "originalIndexed": original in [v["language"] for v in versions],
            "indexedLanguages": [v["language"] for v in versions],
            "versionCounts": [{"language": v["language"], "passages": v["passages"]} for v in versions],
            "pairs": pairs,
        })
    return {
        "schema": "vitruvia-locus-compatibility-v1",
        "method": "Comparación mecánica de identificadores de locus; sin OCR, NLP, equivalencia textual ni verificación de fuentes externas.",
        "catalogueWorks": len(works),
        "worksWithJson": sum(bool(w["versionCounts"]) for w in works),
        "worksWithOriginalJson": sum(w["originalIndexed"] for w in works),
        "issues": issues,
        "works": works,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", default=str(DEFAULT_OUTPUT))
    p.add_argument("--strict", action="store_true", help="Exit nonzero when data-integrity issues exist")
    opts = p.parse_args()
    report = audit()
    pathlib.Path(opts.output).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{report['catalogueWorks']} catalogue works; "
          f"{report['worksWithJson']} with indexed JSON; "
          f"{report['worksWithOriginalJson']} with original JSON; "
          f"{len(report['issues'])} issues.")
    if opts.strict and report["issues"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
