#!/usr/bin/env python3
"""Auditoría reproducible de identidad y cobertura de la Bibliotheca.

Comprueba las 271 fichas principales, 10 fichas R2 adicionales, 279 versiones
textuales registradas y 117 ediciones facsimilares. No equipara coincidencia
de metadatos con cotejo filológico ni certifica integridad de una obra.
No escribe ni modifica textos, PDF, códices, traducciones ni índices.
"""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import unicodedata
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "reports/document-interiors/catalogue-correlation.json"
ORIGINAL_LANGUAGES = {"grc", "la"}
URL_PREFIXES = (
    "https://libros.vitruvius-digital-library.org/corpus/",
    "https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/",
)
STOP = {"opera", "omnia", "volumen", "volume", "libri", "liber", "edition",
        "the", "with", "greek", "latin", "ancient", "text", "traduccion"}
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")

def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or "").casefold())
    return "".join(ch for ch in value if not unicodedata.combining(ch))

def title_warning(canonical, declared):
    """Compare shared scripts only; a warning is never proof of misattribution."""
    if not canonical or not declared:
        return False
    def tokens(value, greek):
        words = re.findall(r"[^\W\d_]{4,}", norm(value), re.UNICODE)
        return {w for w in words if w not in STOP and bool(GREEK.search(w)) == greek}
    for script in (False, True):
        a, b = tokens(canonical, script), tokens(declared, script)
        if a and b:
            return not bool(a & b)
    return False

def get_source(path, online):
    if path.startswith("https://"):
        if not online:
            return None, "remote_not_checked"
        if not path.startswith(URL_PREFIXES):
            return None, "remote_host_not_approved"
        req = Request(path, headers={"User-Agent": "Vitruvius-Interior-Correlation/1.0"})
        with urlopen(req, timeout=35) as response:
            data = response.read(18_000_001)
        if len(data) > 18_000_000:
            return None, "remote_exceeds_18mb"
        return data.decode("utf-8"), "downloaded"
    target = (ROOT / path).resolve()
    if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
        return None, "local_file_missing"
    return target.read_text(encoding="utf-8"), "local_read"

def inspect_version(entry, online):
    result = {
        "workId": entry["workId"], "language": entry.get("language"),
        "format": entry.get("format"), "path": entry.get("path"),
        "status": "not_checked", "issues": [], "passages": None
    }
    try:
        raw, status = get_source(entry.get("path", ""), online)
        result["access"] = status
        if raw is None:
            result["status"] = "unverified_remote" if status == "remote_not_checked" else "unavailable"
            if status != "remote_not_checked":
                result["issues"].append(status)
            return result
        if entry["format"] == "html-text":
            result["characters"] = len(raw)
            result["status"] = "html_present_not_collated" if len(raw) >= 250 else "invalid_html"
            if len(raw) < 250:
                result["issues"].append("html_too_short")
            return result
        doc = json.loads(raw)
        if entry["format"] == "historical-ocr-pages":
            if not isinstance(doc, list) or not doc:
                result["issues"].append("invalid_historical_ocr")
                result["status"] = "identity_or_content_problem"
                return result
            result["passages"] = len(doc)
            result["status"] = "ocr_by_page_not_critical_text"
            return result
        if not isinstance(doc, dict):
            result["issues"].append("json_not_object")
            result["status"] = "identity_or_content_problem"
            return result
        if entry["format"] == "structured-bilingual":
            if doc.get("edition") != entry.get("edition"):
                result["issues"].append("edition_code_mismatch")
            if entry.get("language") not in {"la", doc.get("language")}:
                result["issues"].append("structured_language_mismatch")
            field = "latin" if entry.get("language") == "la" else "translation"
        else:
            expected = entry.get("sourceWorkId") or entry["workId"]
            if doc.get("workId") != expected:
                result["issues"].append("internal_work_id_mismatch")
            if doc.get("language") != entry.get("language"):
                result["issues"].append("internal_language_mismatch")
            field = "text"
        passages = doc.get("passages")
        if not isinstance(passages, list) or not passages:
            result["issues"].append("no_passages")
            result["status"] = "identity_or_content_problem"
            return result
        result["passages"] = len(passages)
        texts = [p.get(field) for p in passages if isinstance(p, dict)]
        result["characters"] = sum(len(t.strip()) for t in texts if isinstance(t, str))
        result["emptyOrMalformedPassages"] = sum(
            not isinstance(p, dict) or not isinstance(p.get(field), str) or
            not p.get(field, "").strip()
            for p in passages
        )
        if result["emptyOrMalformedPassages"]:
            result["issues"].append("passages_without_text")
        loci = [str(p.get("locus", "")).strip() for p in passages if isinstance(p, dict)]
        missing_locus = sum(not v for v in loci)
        if missing_locus or len(loci) != len(passages):
            result["issues"].append("passages_without_locus")
        duplicates = len(loci) - len(set(loci))
        if duplicates:
            result["duplicateLoci"] = duplicates
            result["issues"].append("repeated_loci_review")
        if result["characters"] < 350:
            result["issues"].append("insufficient_text")
        if doc.get("title") and title_warning(entry.get("title"), doc["title"]):
            result["issues"].append("source_title_needs_individual_review")
            result["sourceTitle"] = doc["title"]
        # Consecutive integer-only loci can be checked without pretending that
        # complex CTS, poetry, fragments or printed pagination is consecutive.
        if loci and all(re.fullmatch(r"\d+", loc) for loc in loci):
            ints = sorted(set(map(int, loci)))
            gaps = sum(max(0, b - a - 1) for a, b in zip(ints, ints[1:]))
            if gaps:
                result["numberingGaps"] = gaps
                result["issues"].append("integer_locus_gaps_review")
        result["status"] = (
            "identity_or_content_problem" if any(v in result["issues"] for v in
                ["edition_code_mismatch", "structured_language_mismatch",
                 "internal_work_id_mismatch", "internal_language_mismatch",
                 "no_passages", "passages_without_text", "passages_without_locus",
                 "insufficient_text"])
            else "metadata_and_passages_consistent_not_collated"
        )
        return result
    except Exception as exc:
        result["status"] = "could_not_inspect"
        result["issues"] = [type(exc).__name__ + ": " + str(exc)[:180]]
        return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--online", action="store_true",
                        help="Check 32 R2 text URLs and 28 external original-text URLs")
    parser.add_argument("--output", default=str(OUTPUT))
    args = parser.parse_args()

    works = load("data/bibliotheca-graeca-latina-I-bce-I-ce.json")["works"]
    r2 = load("data/r2/catalogo-clasicos-r2.json")["items"]
    links = load("data/r2/vinculos-repertorio.json")
    registry = load("data/classics-corpus/search-registry.json")["entries"]
    offsite = load("data/classics-corpus/external-index-reconciliation.json")["remoteEntries"]
    ocr = load("data/r2/bibliotheca-ocr-coverage.json")
    books = load("data/catalog-completo.json")
    main_ids = {w["id"] for w in works}
    extra = links["obrasNuevas"]
    extra_ids = {e["r2"] for e in extra}
    registry_by_work = defaultdict(list)
    for entry in registry:
        registry_by_work[entry["workId"]].append(entry)
    offsite_by_work = {x["workId"]: x for x in offsite}
    ocr_by_work = {x["id"]: x for x in ocr["ocrSearchableWithoutTranscription"]}
    structured = {x["id"] for x in ocr["alreadyIndexedAsStructuredEdition"]}
    pdf_by_id = {x["id"]: x for x in r2}
    r2_by_work = defaultdict(list)
    for edition in r2:
        ids = links.get("mapa", {}).get(edition["id"]) or []
        if not ids and edition["id"] in main_ids:
            ids = [edition["id"]]
        if not ids and edition.get("traduccionDe") in main_ids:
            ids = [edition["traduccionDe"]]
        for wid in ids:
            r2_by_work[wid].append(edition["id"])

    # Include the 28 documented originals in separate branches as well as
    # 279 registered versions, keeping their provenance and counts separate.
    offsite_entries = [
        {"workId": x["workId"], "language": x["language"],
         "title": next((w.get("title") for w in works if w["id"] == x["workId"]), ""),
         "format": "json-passages",
         "path": "https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/"
                 + x["branch"] + "/" + x["textPath"]}
        for x in offsite
    ]
    with ThreadPoolExecutor(max_workers=6) as pool:
        version_results = list(pool.map(lambda e: inspect_version(e, args.online), registry))
        offsite_results = list(pool.map(lambda e: inspect_version(e, args.online), offsite_entries))
    problem_versions = [v for v in version_results + offsite_results if v["status"] in
                        {"identity_or_content_problem", "unavailable", "could_not_inspect", "invalid_html"}]

    records = []
    for w in works:
        wid = w["id"]
        versions = registry_by_work[wid]
        modes = []
        if versions:
            modes.append("structured_text_registry")
        if wid in offsite_by_work:
            modes.append("offsite_original_index")
        if wid in ocr_by_work:
            modes.append("r2_facsimile_ocr")
        if wid in structured:
            modes.append("vitruvius_edition_already_indexed_under_parent")
        if w.get("reading", {}).get("url"):
            modes.append("external_reading_reference")
        editions = r2_by_work[wid]
        flags = []
        if not modes and not editions:
            flags.append("no_reading_or_indexed_source_linked")
        if not versions and not wid in offsite_by_work and not wid in structured:
            flags.append("no_structured_original_under_own_id")
        if w.get("publicStatus") == "lectura-local-completa" and not versions:
            flags.append("catalogue_claims_complete_local_without_registry")
        for v in versions:
            match = next((x for x in version_results
                          if x["workId"] == wid and x["language"] == v["language"]
                          and x["path"] == v["path"]), None)
            if match and match["status"] in {"identity_or_content_problem", "unavailable", "could_not_inspect"}:
                flags.append("indexed_version_requires_repair_or_review")
        records.append({
            "id": wid, "author": w.get("author"), "catalogueTitle": w.get("title"),
            "originalLanguage": w.get("language"), "publicStatus": w.get("publicStatus"),
            "textVersions": len(versions), "searchModes": sorted(set(modes)),
            "r2Editions": editions, "flags": sorted(set(flags)),
            "completeness": "not_certified_against_complete_scholarly_edition"
        })
    for x in extra:
        edition = pdf_by_id.get(x["r2"])
        records.append({
            "id": x["r2"], "author": x.get("autor"),
            "catalogueTitle": x.get("obra"), "originalLanguage": x.get("lengua"),
            "publicStatus": "r2_additional_work",
            "textVersions": 0, "searchModes": ["r2_facsimile_ocr"] if edition else [],
            "r2Editions": [x["r2"]] if edition else [],
            "flags": [] if edition else ["additional_work_without_catalogued_pdf"],
            "completeness": "not_certified_against_complete_scholarly_edition"
        })

    edition_flags = []
    hash_groups = defaultdict(list)
    for e in r2:
        if e.get("sha256"):
            hash_groups[e["sha256"]].append(e["id"])
        issues = []
        # An ID may preserve historical naming; do not silently relabel it.
        year_match = re.search(r"(1[4-9]\d{2}|20[0-2]\d)", e["id"])
        if year_match and e.get("anio") and int(year_match.group()) != int(e["anio"]):
            issues.append("file_id_year_differs_from_catalogue_year")
        vol_match = re.search(r"(?:^|-)vol0*(\d+)(?:-|$)", e["id"])
        printed = re.search(r"\bvol(?:ume|\.?)\s*(\d+)\b", e.get("tituloEdicion", ""), re.I)
        if vol_match and printed and int(vol_match.group(1)) != int(printed.group(1)):
            issues.append("id_volume_differs_from_edition_title")
        if e.get("incidenciaCatalografica"):
            issues.append("existing_bibliographic_incident")
        if e.get("notaFilologica") and re.search(r"\b(?:solo|only|únicamente|fragment|parcial)\b", e["notaFilologica"], re.I):
            issues.append("edition_partial_scope_declared")
        if issues:
            edition_flags.append({"id": e["id"], "title": e.get("tituloEdicion"),
                                  "issues": issues, "catalogueNote": e.get("incidenciaCatalografica")})
    for ids in hash_groups.values():
        if len(ids) > 1:
            edition_flags.append({"ids": ids, "issues": ["same_pdf_sha_under_multiple_edition_ids"]})

    # A candidate file is not evidence that it contains the work named in its ficha.
    candidate_mismatch = []
    candidates = load("data/perseus-obras-faltantes.json").get("fichas", {})
    for wid, candidate in candidates.items():
        if wid not in main_ids:
            continue
        for unit in candidate.get("obras", []):
            title = unit.get("titulo") or ""
            if title and title_warning(candidate.get("titulo"), title):
                candidate_mismatch.append({"id": wid, "declaredTitle": candidate.get("titulo"),
                                           "candidateTitle": title,
                                           "issue": "candidate_work_may_not_match_catalogue_work"})

    result = {
        "schema": "vdl-bibliotheca-interior-correlation-audit-v1",
        "generated": datetime.now(timezone.utc).isoformat(),
        "method": "Full-catalogue ID and evidence reconciliation; actual content/metadata/locus checks for locally registered JSON or HTML; remote checks only with --online. PDF opening/ending pages and SHA are separately checked by scripts/audit-book-interiors.py, not certified here.",
        "importantLimit": "Not a manuscript collation, copyright audit or a proof that no printed leaves, books or chapters are missing. In particular, OCR and metadata cannot establish a complete ancient text.",
        "counts": {
            "mainCatalogueWorks": len(works),
            "additionalR2Works": len(extra),
            "totalFederatedWorks": len(records),
            "separateAuthorPublications": len(books),
            "registeredVersions": len(registry),
            "localVersionRecords": sum(not e.get("path", "").startswith("https://") for e in registry),
            "remoteVersionRecords": sum(e.get("path", "").startswith("https://") for e in registry),
            "offsiteOriginals": len(offsite),
            "offsiteByInspectionStatus": dict(Counter(v["status"] for v in offsite_results)),
            "r2PdfEditions": len(r2),
            "worksWithIndexedText": len(registry_by_work),
            "versionsByInspectionStatus": dict(Counter(v["status"] for v in version_results)),
            "versionProblems": len(problem_versions),
            "worksWithoutAnyReadingEvidence": sum("no_reading_or_indexed_source_linked" in x["flags"] for x in records),
            "r2EditionMetadataIncidents": len(edition_flags),
            "candidateTitleWarnings": len(candidate_mismatch)
        },
        "catalogue": records,
        "versionInspection": version_results,
        "offsiteOriginalInspection": offsite_results,
        "r2EditionWarnings": edition_flags,
        "candidateTitleWarnings": candidate_mismatch,
        "separatePublications": [{"id": x.get("id"), "title": x.get("title"),
                                  "available": x.get("available"), "searchable": x.get("searchable")}
                                 for x in books]
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"counts": result["counts"], "output": str(output)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
