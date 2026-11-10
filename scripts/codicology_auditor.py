#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vitruvius Digital Library: metadata-only codicological self-auditor.

Audits all 222 records every run. Optional discovery uses the public Library
of Congress JSON metadata API, in small batches. All NEW hits are quarantined:
NO unreviewed data are published to the scholarly manuscript registry.

No codices, folio photographs, PDFs, OCR or IIIF canvases are downloaded.
Python 3.11+; standard library only; no paid services.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
WITNESSES = ROOT / "data/bibliotheca-testimonia-verified.json"
OUT = ROOT / "reports/codicology"
UA = "Vitruvius-Codicological-Auditor/1.0 (metadata only; academic digital library)"
MAX_META_BYTES = 950000
DOMAINS = (
    "loc.gov", "bl.uk", "biblissima.fr", "bnf.fr", "vatlib.it",
    "bodleian.ox.ac.uk", "ox.ac.uk", "uni-heidelberg.de",
    "oclc.org", "unifr.ch", "irht.cnrs.fr", "universiteitleiden.nl",
    "onb.digital", "helsinki.fi", "universityofgalway.ie", "hab.de",
    "bsb-muenchen.de", "mdz-nbn-resolving.de",
)
LANGUAGES = {"la": "lat", "grc": "greek", "cop": "coptic"}
SPECIAL = {
    "homer-odyssey": (
        ("odyssea", "odyssey", "odysseia", "οδυσσει", "odyssee", "odysse"),
        ("iliad", "ilias", "iliade", "iliada", "ιλιαδ"),
    ),
    "homer-iliad": (
        ("iliad", "ilias", "iliade", "iliada", "ιλιαδ"),
        ("odyssea", "odyssey", "odysseia", "οδυσσει", "odyssee"),
    ),
}


def read(path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    temp.replace(path)


def norm(value):
    raw = unicodedata.normalize("NFKD", str(value or "").casefold())
    return "".join(ch for ch in raw if not unicodedata.combining(ch))


def host(url):
    try:
        p = urlparse(str(url))
    except ValueError:
        return ""
    return (p.hostname or "").lower() if p.scheme == "https" else ""


def trusted(url):
    h = host(url)
    return bool(h and any(h == d or h.endswith("." + d) for d in DOMAINS))


def issue(severity, code, detail=""):
    return {"severity": severity, "code": code, "detail": str(detail)[:250]}


def title_match(work, candidate_title):
    """Veto explicit mismatches. A 'match' is not proof of identity."""
    title = norm(candidate_title)
    wanted, exclude = SPECIAL.get(work["id"], ((), ()))
    if wanted:
        has_wanted = any(x in title for x in wanted)
        has_other = any(x in title for x in exclude)
        if has_other and not has_wanted:
            return "contradiction"
        return "plausible" if has_wanted else "unknown"
    pieces = [x for x in re.findall(r"\w+", norm(work.get("title", "")))
              if len(x) > 5]
    return "plausible" if any(x in title for x in pieces) else "unknown"


def audit_witness(work, witness):
    errors = []
    for field in ("id", "library", "shelfmark", "coverage", "date"):
        if not str(witness.get(field) or "").strip():
            errors.append(issue("error" if field in ("id", "library", "shelfmark")
                                else "warning", "missing_" + field))
    if not witness.get("record"):
        errors.append(issue("warning", "no_institutional_catalogue"))
    for key in ("record", "viewer", "manifest"):
        url = witness.get(key)
        if url and not host(url):
            errors.append(issue("error", "not_safe_https_url", key))
        elif url and not trusted(url):
            errors.append(issue("warning", "domain_unlisted_requires_review", url))
    language = witness.get("language")
    if language and language != work.get("language"):
        if not str(witness.get("witnessKind") or "").startswith("ancient_translation"):
            errors.append(issue("error", "language_mismatch_unclassified", language))
    title_state = title_match(work, witness.get("title", ""))
    if title_state == "contradiction":
        errors.append(issue("error", "wrong_work_title", witness.get("title", "")))
    elif title_state == "unknown":
        # Manuscript titles differ from uniform work titles in many traditions.
        errors.append(issue("warning", "title_unconfirmed_by_machine"))
    if not witness.get("viewer") and not witness.get("localViewer"):
        errors.append(issue("warning", "no_public_folio_viewer"))
    if witness.get("manifest") and not witness.get("viewer"):
        errors.append(issue("warning", "manifest_without_viewer_link"))
    if witness.get("dateStart") and not witness.get("dateStartBasis"):
        errors.append(issue("warning", "dating_order_without_basis"))
    return errors


def fetch_json_metadata(url):
    """Download small metadata JSON only (NEVER raw images or document bytes)."""
    if not trusted(url):
        return {"status": "untrusted_domain"}
    req = Request(url, headers={"User-Agent": UA,
                                "Accept": "application/ld+json, application/json"})
    try:
        with urlopen(req, timeout=12) as res:
            content_type = res.headers.get("Content-Type", "").lower()
            if "json" not in content_type:
                return {"status": "not_json", "mime": content_type[:100]}
            raw = res.read(MAX_META_BYTES + 1)
            if len(raw) > MAX_META_BYTES:
                return {"status": "metadata_too_large"}
            data = json.loads(raw.decode("utf-8-sig"))
            return {"status": "ok", "data": data}
    except (HTTPError, URLError, TimeoutError, OSError, ValueError,
            UnicodeDecodeError, json.JSONDecodeError) as exc:
        return {"status": "unavailable", "reason": type(exc).__name__}


def flatten_label(value):
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " ".join(flatten_label(v) for v in value.values())
    if isinstance(value, list):
        return " ".join(flatten_label(v) for v in value)
    return ""


def review_manifest(work, witness, response):
    if response.get("status") != "ok":
        return [issue("warning", "iiif_not_checked", response.get("status"))]
    d = response.get("data")
    if not isinstance(d, dict):
        return [issue("error", "iiif_non_object")]
    kind = str(d.get("type") or d.get("@type") or "")
    if kind not in ("Manifest", "sc:Manifest"):
        return [issue("error", "iiif_not_manifest", kind)]
    if kind == "Manifest":
        canvases = d.get("items")
    else:
        sequences = d.get("sequences") or []
        canvases = sequences[0].get("canvases") if sequences and isinstance(sequences[0], dict) else []
    if not isinstance(canvases, list) or not canvases:
        return [issue("error", "iiif_has_no_canvas")]
    label = flatten_label(d.get("label"))
    findings = []
    if not label:
        findings.append(issue("warning", "iiif_missing_label"))
    elif title_match(work, label) == "contradiction":
        findings.append(issue("error", "iiif_wrong_work", label))
    shelf = norm(witness.get("shelfmark", "")).replace(" ", "")
    if shelf and shelf not in norm(label).replace(" ", ""):
        findings.append(issue("warning", "iiif_shelfmark_not_in_title", label))
    return findings


def discover_loc(work):
    """Library of Congress metadata keyword search: candidates, never approvals."""
    full_title = (work.get("bibliography") or {}).get("uniformTitle") or work.get("title", "")
    term = str(full_title).split(" · ")[0][:95]
    url = "https://www.loc.gov/manuscripts/?" + urlencode(
        {"q": term, "fo": "json", "at": "results", "c": "5"})
    result = fetch_json_metadata(url)
    if result.get("status") != "ok":
        return [], result.get("status", "unavailable")
    rows = result.get("data", {}).get("results", [])
    if not isinstance(rows, list):
        return [], "invalid_results"
    proposals = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or "")
        url = str(row.get("id") or "")
        if title_match(work, title) == "contradiction" or not trusted(url):
            continue
        proposals.append({
            "workId": work["id"], "candidateTitle": title,
            "provider": "Library of Congress API", "source": url,
            "status": "unverified_keyword_hit", "shelfmark": None,
            "manifest": None, "viewer": None, "date": None,
            "corroboratingSources": [],
        })
    return proposals, "ok"


def independent_guard(candidates, works):
    """Independent second pass vetoes auto-promotion without source corroboration."""
    quarantine = []
    for item in candidates:
        work = works.get(item.get("workId"))
        if not work:
            continue
        objections = []
        if title_match(work, item.get("candidateTitle", "")) != "plausible":
            objections.append("title_not_confirmed")
        if not item.get("shelfmark"):
            objections.append("institutional_shelfmark_missing")
        if not item.get("date"):
            objections.append("paleographic_date_missing")
        if not item.get("viewer") and not item.get("manifest"):
            objections.append("folio_viewer_missing")
        if len({host(x) for x in item.get("corroboratingSources", []) if trusted(x)}) < 2:
            objections.append("independent_corroboration_missing")
        item["secondPass"] = {
            "status": "quarantined_for_human_review", "objections": objections}
        quarantine.append(item)
    return quarantine


def build_report(catalog, registry, *, live=False, batch_size=12, offset=0):
    works = catalog["works"]
    if len(works) != 222 or len({w["id"] for w in works}) != 222:
        raise ValueError("Catalog must contain 222 UNIQUE work records")
    by_id = {w["id"]: w for w in works}
    rows = {w["id"]: [] for w in works}
    global_issues = []
    seen = set()
    for witness in registry["records"]:
        if witness.get("id") in seen:
            global_issues.append(issue("error", "duplicate_manuscript_id", witness.get("id")))
        seen.add(witness.get("id"))
        for wid in witness.get("workIds", []):
            if wid not in by_id:
                global_issues.append(issue("error", "unknown_work_id", wid))
            else:
                rows[wid].append(witness)
    entries = []
    for w in works:
        witnesses = []
        for ms in rows[w["id"]]:
            problems = audit_witness(w, ms)
            network = "not_requested"
            if live and ms.get("manifest") and trusted(ms["manifest"]):
                response = fetch_json_metadata(ms["manifest"])
                network = response["status"]
                problems += review_manifest(w, ms, response)
            witnesses.append({
                "id": ms.get("id"), "shelfmark": ms.get("shelfmark"),
                "record": ms.get("record"), "viewer": ms.get("viewer"),
                "manifest": ms.get("manifest"), "metadataCheck": network,
                "findings": problems,
                "validation": ("blocking_issue" if any(e["severity"] == "error" for e in problems)
                               else "review_required" if problems else "structurally_consistent"),
            })
        entries.append({
            "workId": w["id"], "author": w.get("author"), "title": w.get("title"),
            "language": w.get("language"),
            "recordType": ("modern_edition" if w.get("manuscript", {}).get("isIndependentAncientWork") is False
                           else "classical_work"),
            "witnessCount": len(witnesses),
            "linkedViewerCount": sum(bool(ms.get("viewer")) for ms in rows[w["id"]]),
            "witnesses": witnesses,
            "researchLinks": {
                "biblissima": "https://iiif.biblissima.fr/collections/",
                "pinakes": "https://pinakes.irht.cnrs.fr/" if w.get("language") == "grc" else None,
                "loc": "https://www.loc.gov/manuscripts/?" + urlencode(
                    {"q": str((w.get("bibliography") or {}).get("uniformTitle")
                              or w.get("title", ""))[:95]}),
            }
        })
    proposals = []
    discovery_statuses = []
    if live and batch_size > 0:
        for i in range(min(batch_size, len(works))):
            work = works[(offset + i) % len(works)]
            if work.get("manuscript", {}).get("isIndependentAncientWork") is False:
                continue
            hits, status = discover_loc(work)
            proposals.extend(hits)
            discovery_statuses.append({"workId": work["id"], "status": status,
                                       "candidateCount": len(hits)})
    quarantine = independent_guard(proposals, by_id)
    return {
        "schema": "vitruvius-codicology-audit-v1",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "mode": "metadata_live" if live else "offline",
        "policy": ("Never attach new manuscripts automatically. A keyword match, valid URL, "
                   "or valid IIIF manifest alone does not prove a textual witness. "
                   "No downloaded codex, photographs or PDFs."),
        "summary": {
            "catalogueWorks": len(works),
            "registryManuscripts": len(registry["records"]),
            "worksWithWitnesses": sum(bool(x["witnessCount"]) for x in entries),
            "worksWithoutWitnesses": sum(not x["witnessCount"] for x in entries),
            "modernEditions": sum(x["recordType"] == "modern_edition" for x in entries),
            "candidatesQuarantined": len(quarantine),
            "structuralErrors": sum(
                problem["severity"] == "error" for x in entries for ms in x["witnesses"]
                for problem in ms["findings"]) + sum(x["severity"] == "error" for x in global_issues),
        },
        "globalIssues": global_issues, "works": entries,
        "discovery": {"offset": offset, "batchSize": batch_size,
                      "providers": ["Library of Congress official JSON API"],
                      "results": discovery_statuses},
        "quarantine": quarantine,
    }


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--live", action="store_true", help="Query metadata-only APIs and published IIIF manifests")
    p.add_argument("--batch-size", type=int, default=12)
    p.add_argument("--offset", type=int, default=None, help="Default: rotate 12-work batches by UTC day")
    p.add_argument("--output", type=Path, default=OUT)
    args = p.parse_args(argv)
    if not 0 <= args.batch_size <= 222:
        p.error("--batch-size must be between 0 and 222")
    offset = (dt.date.today().toordinal() * args.batch_size) % 222 if args.offset is None else args.offset % 222
    report = build_report(read(CATALOG), read(WITNESSES),
                          live=args.live, batch_size=args.batch_size, offset=offset)
    write(args.output / "latest-audit.json", report)
    write(args.output / "quarantine.json", {
        "generatedAt": report["generatedAt"], "items": report["quarantine"]})
    write(args.output / "summary.json", {
        "generatedAt": report["generatedAt"], **report["summary"],
        "discovery": report["discovery"]})
    print(json.dumps(report["summary"], ensure_ascii=False, sort_keys=True))
    print("Reports saved to:", args.output)
    return 0  # Problems are reported, never silently rewritten.


if __name__ == "__main__":
    raise SystemExit(main())
