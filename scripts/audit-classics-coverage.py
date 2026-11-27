#!/usr/bin/env python3
"""Audit the existing classical search registry without modifying source texts.

Run: python scripts/audit-classics-coverage.py
     python scripts/audit-classics-coverage.py --strict
"""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import urllib.request
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"

def source_bytes(entry, manifest, offline=False):
    """Read an edition without interpreting HTTPS as a local pathname.

    Remote access is restricted to exact objects in the published R2 manifest.
    Its binary fingerprint is checked before parsing or counting the text.
    Offline mode records the declaration without claiming a successful read.
    """
    path = entry["path"]
    url = urlsplit(path)
    if url.scheme:
        if url.scheme != "https" or url.hostname != "libros.vitruvius-digital-library.org" or url.username or url.password or url.query or url.fragment:
            raise ValueError("Unapproved remote source: " + path)
        record = manifest.get(path)
        if record and (record["workId"] != entry.get("sourceWorkId", entry["workId"]) or record["language"] != entry["language"]):
            raise ValueError("Remote source identity conflict: " + path)
        if entry.get("sha256") and record and entry["sha256"] != record["sha256"]:
            raise ValueError("Registry and manifest fingerprints disagree: " + path)
        if not record or not record.get("sha256"):
            raise ValueError("Remote source absent from the edition manifest: " + path)
        if offline:
            return None, "remote_declared_unchecked"
        request = urllib.request.Request(path, headers={"User-Agent": "Vitruvius-corpus-coverage/1.0"})
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = response.read()
        if hashlib.sha256(raw).hexdigest() != record["sha256"]:
            raise ValueError("Remote source fingerprint changed: " + path)
        return raw, "remote_verified"
    local = (ROOT / path).resolve()
    if not local.is_relative_to(ROOT.resolve()) or not local.is_file():
        raise ValueError("Missing local source: " + path)
    return local.read_bytes(), "local_file"

def locus_segments(passages, field):
    """Repeated consecutive loci may be distinct fragments of one unit.

    Preserve every fragment. Reject non-consecutive reuse or repeated identical
    text, rather than silently deleting or renumbering an editorial source.
    """
    positions = defaultdict(list)
    for i, passage in enumerate(passages):
        positions[str(passage.get("locus", "")).strip()].append(i)
    grouped, invalid = [], []
    for locus, indices in positions.items():
        if len(indices) < 2:
            continue
        texts = [str(passages[i].get(field, "")).strip() for i in indices]
        consecutive = all(b == a + 1 for a, b in zip(indices, indices[1:]))
        if not locus or not consecutive or not all(texts) or len(set(texts)) != len(texts):
            invalid.append(locus)
        else:
            grouped.append({"locus": locus, "segments": len(indices)})
    return grouped, invalid

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
    parser.add_argument("--offline", action="store_true", help="Keep remote declarations explicit without certifying their availability")
    args = parser.parse_args()
    entries = json.loads(REGISTRY.read_text(encoding="utf-8"))["entries"]
    legacy = json.loads((ROOT / "data/r2/corpus-manifest.json").read_text(encoding="utf-8"))
    manifest = {}
    def register_source(url, row):
        identity = {k: row.get(k) for k in ("workId", "language", "sha256")}
        if url in manifest and manifest[url] != identity:
            raise ValueError("Conflicting manifests: " + url)
        manifest[url] = identity
    for row in legacy["obras"]:
        register_source(legacy["base"] + row["archivo"], row)
    for name in ("classics-expansion-manifest.json", "classics-translation-manifest.json"):
        document = json.loads((ROOT / "data/r2" / name).read_text(encoding="utf-8"))
        for row in document["editions"]:
            register_source(row["url"], row)
    remote_sources = {}
    def prepare_remote(entry):
        try:
            return entry["path"], source_bytes(entry, manifest, args.offline)
        except Exception as exc:
            return entry["path"], exc
    with ThreadPoolExecutor(max_workers=4) as pool:
        remote_sources.update(pool.map(prepare_remote, [e for e in entries if urlsplit(e["path"]).scheme]))
    rows, errors, warnings = [], [], []
    loci_by_work = defaultdict(dict)
    seen = set()
    for e in entries:
        work, language, kind = e["workId"], e["language"], e["format"]
        key = (work, language, e["path"], e.get("edition"))
        path = ROOT / e["path"]
        row = {"work":work,"language":language,"format":kind,"path":e["path"],
               "reader":e.get("reader"),"passages":0,"characters":0,"status":"ok"}
        if key in seen:
            errors.append(f"Duplicate edition registry key: {work}/{language}")
        seen.add(key)
        try:
            result = remote_sources.get(e["path"])
            if isinstance(result, Exception):
                raise result
            raw, access = result if result is not None else source_bytes(e, manifest, args.offline)
            row["source_access"] = access
        except Exception as exc:
            errors.append(str(exc))
            row["status"] = "missing"
            rows.append(row)
            continue
        if raw is None:
            row["status"] = "remote_declared_unchecked"
            warnings.append(f"Remote declaration not checked offline: {e['path']}")
            rows.append(row)
            continue
        if kind == "html-text":
            body = raw.decode("utf-8")
            ids = IdParser()
            ids.feed(body)
            row["characters"] = len(body)
            reader = urlsplit(e.get("reader") or e["path"])
            if reader.path == e["path"] and reader.fragment and reader.fragment not in ids.ids:
                warnings.append(f"Unresolved HTML anchor: {work}/{language}")
            warnings.append(f"HTML source needs manual block-level completeness review: {work}/{language}")
        elif kind == "historical-ocr-pages":
            pages = json.loads(raw)
            row["passages"] = len(pages)
            row["characters"] = sum(len(p.get("text","")) for p in pages)
            row["locator"] = "pdf-page-only; unverified OCR"
        else:
            data = json.loads(raw)
            passages = data.get("passages", [])
            if not isinstance(passages,list) or not passages:
                errors.append(f"Empty or malformed passages: {e['path']}")
                passages = []
            if kind == "structured-bilingual":
                field = "latin" if language == "la" else "translation"
                passages = [p for p in passages if isinstance(p.get(field),str) and p[field].strip()]
                if data.get("edition") != e.get("edition"):
                    errors.append(f"Edition mismatch: {e['path']}")
            elif kind == "critical-indexed-latin":
                # Krohn y Rose son ediciones críticas auxiliares de una misma
                # obra antigua, no JSON de traducción ni obras catalogables.
                expected = {
                    "krohn-1912-indexed": "data/critical-editions/krohn-1912-tei-loci.json",
                    "rose-1899-indexed": "data/critical-editions/rose-1899-transcribed-loci.json",
                }
                if (language != "la" or expected.get(work) != e["path"]
                        or data.get("edition") != work.removesuffix("-indexed")):
                    errors.append(f"Critical edition identity mismatch: {e['path']}")
                field = "latin"
                if len(passages) != 731 or any(
                    not isinstance(p.get("latin"),str) or not p["latin"].strip()
                    for p in passages
                ):
                    errors.append(f"Incomplete Latin critical edition: {e['path']}")
                row["locator"] = "critical-edition locus; textual collation not certified"
            else:
                field = "text"
                if data.get("workId") != e.get("sourceWorkId", work) or data.get("language") != language:
                    errors.append(f"Identity mismatch: {e['path']}")
            loci = [str(p.get("locus","")).strip() for p in passages]
            grouped, duplicates = locus_segments(passages, field)
            row["contiguous_locus_groups"] = grouped
            if duplicates:
                errors.append(f"Non-consecutive or identical duplicate segments in {e['path']}: {duplicates[:5]}")
            if not all(loci):
                errors.append(f"Missing loci in {e['path']}")
            row["passages"] = len(passages)
            row["characters"] = sum(len(p.get(field,"")) for p in passages)
            loci_by_work[work][(language,e["path"])] = set(loci)
            reader = urlsplit(e.get("reader") or "")
            params = parse_qs(reader.query)
            if kind == "json-passages" and (params.get("work") != [work] or params.get("lang") != [language]):
                errors.append(f"Reader URL does not identify edition: {work}/{language}")
            if kind == "structured-bilingual" and params.get("edition") != [e.get("edition")]:
                errors.append(f"Structured reader edition mismatch: {work}/{language}")
        rows.append(row)
    comparisons = []
    for work, languages in sorted(loci_by_work.items()):
        originals = [(key, loci) for key, loci in languages.items() if key[0] in ("grc","la")]
        translations = [(key, loci) for key, loci in languages.items() if key[0] not in ("grc","la")]
        for (original, original_path), original_loci in originals:
            for (language, translation_path), loci in translations:
                shared = len(loci & original_loci)
                comparisons.append({"work":work,"original":original,"translation":language,
                                    "originalPath":original_path,"translationPath":translation_path,
                                    "original_loci":len(original_loci),"translated_loci":len(loci),
                                    "shared_loci":shared,"unmatched_original":len(original_loci-loci),
                                    "unmatched_translation":len(loci-original_loci),
                                    "alignment":"locus identifier overlap only; textual equivalence unverified"})
                if shared != len(loci) or shared != len(original_loci):
                    warnings.append(f"Unmatched loci: {work} {original}/{language}: {shared} common ({original_path} / {translation_path})")
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
