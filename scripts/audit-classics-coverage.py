#!/usr/bin/env python3
"""Audit the existing classical search registry without modifying source texts.

Run: python scripts/audit-classics-coverage.py
     python scripts/audit-classics-coverage.py --strict
"""
import argparse
from collections import Counter, defaultdict
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"

class IdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        value = dict(attrs).get("id")
        if value:
            self.ids.add(value)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--out", default="reports/classics-corpus-coverage.json")
    args = parser.parse_args()
    entries = json.loads(REGISTRY.read_text(encoding="utf-8"))["entries"]
    rows, errors, warnings = [], [], []
    loci_by_work = defaultdict(dict)
    seen = set()
    for e in entries:
        work, language, kind = e["workId"], e["language"], e["format"]
        key = (work, language)
        path = ROOT / e["path"]
        row = {"work":work,"language":language,"format":kind,"path":e["path"],
               "reader":e.get("reader"),"passages":0,"characters":0,"status":"ok"}
        if key in seen:
            errors.append(f"Duplicate edition registry key: {work}/{language}")
        seen.add(key)
        if not path.is_file():
            errors.append(f"Missing source: {e['path']}")
            row["status"] = "missing"
            rows.append(row)
            continue
        if kind == "html-text":
            body = path.read_text(encoding="utf-8")
            ids = IdParser()
            ids.feed(body)
            row["characters"] = len(body)
            reader = urlsplit(e.get("reader") or e["path"])
            if reader.path == e["path"] and reader.fragment and reader.fragment not in ids.ids:
                warnings.append(f"Unresolved HTML anchor: {work}/{language}")
            warnings.append(f"HTML source needs manual block-level completeness review: {work}/{language}")
        elif kind == "historical-ocr-pages":
            pages = json.loads(path.read_text(encoding="utf-8"))
            row["passages"] = len(pages)
            row["characters"] = sum(len(p.get("text","")) for p in pages)
            row["locator"] = "pdf-page-only; unverified OCR"
        else:
            data = json.loads(path.read_text(encoding="utf-8"))
            passages = data.get("passages", [])
            if not isinstance(passages,list) or not passages:
                errors.append(f"Empty or malformed passages: {e['path']}")
                passages = []
            if kind == "structured-bilingual":
                field = "latin" if language == "la" else "translation"
                passages = [p for p in passages if isinstance(p.get(field),str) and p[field].strip()]
                if data.get("edition") != e.get("edition"):
                    errors.append(f"Edition mismatch: {e['path']}")
            else:
                field = "text"
                if data.get("workId") != work or data.get("language") != language:
                    errors.append(f"Identity mismatch: {e['path']}")
            loci = [str(p.get("locus","")).strip() for p in passages]
            duplicates = [loc for loc,n in Counter(loci).items() if n>1]
            if duplicates:
                errors.append(f"Duplicate loci in {e['path']}: {duplicates[:5]}")
            if not all(loci):
                errors.append(f"Missing loci in {e['path']}")
            row["passages"] = len(passages)
            row["characters"] = sum(len(p.get(field,"")) for p in passages)
            loci_by_work[work][language] = set(loci)
            reader = urlsplit(e.get("reader") or "")
            params = parse_qs(reader.query)
            if kind == "json-passages" and (params.get("work") != [work] or params.get("lang") != [language]):
                errors.append(f"Reader URL does not identify edition: {work}/{language}")
            if kind == "structured-bilingual" and params.get("edition") != [e.get("edition")]:
                errors.append(f"Structured reader edition mismatch: {work}/{language}")
        rows.append(row)
    comparisons = []
    for work, languages in sorted(loci_by_work.items()):
        originals = [l for l in ("grc","la") if l in languages]
        if not originals:
            continue
        original = originals[0]
        for language, loci in languages.items():
            if language == original:
                continue
            shared = len(loci & languages[original])
            comparisons.append({"work":work,"original":original,"translation":language,
                                "original_loci":len(languages[original]),"translated_loci":len(loci),
                                "shared_loci":shared,"unmatched_original":len(languages[original]-loci),
                                "unmatched_translation":len(loci-languages[original]),
                                "alignment":"locus identifier overlap only; textual equivalence unverified"})
            if shared != len(loci) or shared != len(languages[original]):
                warnings.append(f"Unmatched loci: {work} {original}/{language}: {shared} common")
    report = {"schema":"vitruvia-classics-coverage-audit-v1",
              "registry_entries":len(entries),"works":len({r["work"] for r in rows}),
              "editions":rows,"comparisons":comparisons,"errors":errors,"warnings":warnings,
              "interpretation":"Coverage is structural, not philological certification; no source text was changed."}
    output = ROOT / args.out
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"{len(entries)} editions; {len(comparisons)} comparisons; {len(errors)} errors; {len(warnings)} warnings")
    if args.strict and errors:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
