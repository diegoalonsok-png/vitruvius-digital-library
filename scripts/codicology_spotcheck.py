#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Weekly rotating spot-check for the Vitruvius manuscript catalogue.

Read-only and metadata-only. Uses HTTP HEAD for catalogue/viewer links, and
small JSON responses solely for IIIF manifests. NEVER fetches folio images,
PDFs, OCR or any codex data. Does not modify the scholarly catalogue.

Pass --batch-size 12 weekly: cycles through every witness over several weeks.
This tests access and *metadata consistency*, not palaeographic correctness.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import codicology_auditor as base

OUTPUT = base.ROOT / "reports/codicology-weekly"
TIMEOUT = 10


def probe_head(url):
    """Best-effort availability check; HTTP errors are not proof of miscataloguing."""
    if not base.trusted(url):
        return {"status": "manual_review", "reason": "domain_unlisted_or_not_https"}
    try:
        req = Request(url, headers={"User-Agent": base.UA, "Accept": "*/*"}, method="HEAD")
        with urlopen(req, timeout=TIMEOUT) as response:
            final_url = response.url
            return {
                "status": "reachable" if base.trusted(final_url) else "manual_review",
                "http": response.status,
                "type": response.headers.get("Content-Type", "").split(";")[0].lower(),
                "redirectTrusted": base.trusted(final_url),
            }
    except HTTPError as exc:
        if exc.code in (404, 410):
            status = "missing_http"
        elif exc.code in (401, 403, 405, 429, 500, 502, 503, 504):
            status = "access_indeterminate"
        else:
            status = "manual_review"
        return {"status": status, "http": exc.code}
    except (URLError, TimeoutError, ValueError, OSError) as exc:
        return {"status": "access_indeterminate", "reason": type(exc).__name__}


def local_or_external_link(value):
    """Treat local HTML views as code references, not external availability."""
    if not value:
        return {"status": "not_declared"}
    p = urlparse(str(value))
    if p.scheme == "https":
        return probe_head(value)
    if p.scheme or str(value).startswith("//"):
        return {"status": "manual_review", "reason": "unsafe_link"}
    # Local path availability can be audited without reading content.
    path = (base.ROOT / p.path.lstrip("/")).resolve()
    if not path.is_relative_to(base.ROOT.resolve()):
        return {"status": "manual_review", "reason": "local_path_escape"}
    return {"status": "local_present" if path.is_file() else "local_missing"}


def verify_record(work, witness, *, remote=True):
    """Cross-check identity, physical provenance, foliation, and link metadata."""
    flags = list(base.audit_witness(work, witness))
    if not witness.get("dateStartBasis") and witness.get("dateStart"):
        flags.append(base.issue("warning", "dating_not_justified"))
    if not (witness.get("folioRange") or witness.get("coverage")):
        flags.append(base.issue("warning", "locus_coverage_unavailable"))
    if witness.get("viewer") and not witness.get("record"):
        flags.append(base.issue("warning", "viewer_without_catalogue"))
    if witness.get("manifest") and not witness.get("viewer"):
        flags.append(base.issue("warning", "manifest_without_viewer"))
    kind = str(witness.get("witnessKind", ""))
    if kind.startswith("ancient_translation"):
        if witness.get("language") == work.get("language"):
            flags.append(base.issue("warning", "indirect_version_same_language_check"))
    elif witness.get("language") and witness.get("language") != work.get("language"):
        flags.append(base.issue("error", "direct_witness_language_disagreement"))
    checks = {}
    if remote:
        for key in ("record", "viewer"):
            if witness.get(key):
                checks[key] = local_or_external_link(witness[key])
                if checks[key]["status"] == "missing_http":
                    flags.append(base.issue("warning", "external_link_404_410", key))
                if checks[key]["status"] in ("manual_review", "local_missing"):
                    flags.append(base.issue("warning", "link_requires_review", key))
        if witness.get("manifest"):
            result = base.fetch_json_metadata(witness["manifest"])
            checks["manifest"] = {"status": result["status"]}
            if result["status"] == "ok":
                flags.extend(base.review_manifest(work, witness, result))
            else:
                flags.append(base.issue("warning", "iiif_unavailable_or_unverified", result["status"]))
    return {
        "id": witness.get("id"), "workId": work["id"],
        "shelfmark": witness.get("shelfmark"), "library": witness.get("library"),
        "source": witness.get("record"),
        "links": checks,
        "findings": flags,
        "conclusion": ("blocking_record_issue" if any(f["severity"] == "error" for f in flags)
                       else "requires_editorial_review" if flags else "consistent_in_checked_fields"),
    }


def review_batch(catalog, registry, *, week=None, batch_size=12, remote=True):
    works = {w["id"]: w for w in catalog.get("works", [])}
    if len(works) != 222:
        raise ValueError("Expected 222 different work IDs, aborting")
    records = sorted(registry.get("records", []), key=lambda x: str(x.get("id", "")))
    if not records:
        raise ValueError("No manuscript registry records")
    if len({x.get("id") for x in records}) != len(records):
        raise ValueError("Duplicate witness IDs, aborting")
    # Absolute weeks since 1970: stable rotation, not per-year restart.
    if week is None:
        today = dt.date.today()
        week = (today - dt.date(1970, 1, 5)).days // 7
    start = (week * batch_size) % len(records)
    selected = [records[(start + i) % len(records)]
                for i in range(min(batch_size, len(records)))]
    output = []
    for witness in selected:
        for wid in witness.get("workIds", []):
            work = works.get(wid)
            if not work:
                output.append({"id": witness.get("id"), "workId": wid,
                               "conclusion": "blocking_record_issue",
                               "findings": [base.issue("error", "orphan_work_id")]})
                continue
            output.append(verify_record(work, witness, remote=remote))
    return {
        "schema": "vitruvius-codicology-weekly-review-v1",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "rotation": {"week": week, "batchSize": batch_size, "start": start,
                     "totalWitnessRecords": len(records),
                     "selectedWitnesses": [w["id"] for w in selected]},
        "purpose": ("Audit of metadata and external access only. HTTP HEAD may be blocked. "
                    "A reachable URL does not prove manuscript identity or reading; "
                    "do not claim autoptic collatio. No automatic edits, no codex downloads."),
        "checks": output,
        "summary": {
            "witnessesReviewed": len(selected),
            "workAssociations": len(output),
            "blocking": sum(x["conclusion"] == "blocking_record_issue" for x in output),
            "editorialReview": sum(x["conclusion"] == "requires_editorial_review" for x in output),
            "checkedConsistent": sum(x["conclusion"] == "consistent_in_checked_fields" for x in output),
            "linksMissing": sum(
                value.get("status") == "missing_http"
                for x in output for value in x.get("links", {}).values()
            ),
            "linksIndeterminate": sum(
                value.get("status") in ("access_indeterminate", "manual_review")
                for x in output for value in x.get("links", {}).values()
            ),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch-size", type=int, default=12)
    parser.add_argument("--week", type=int, default=None, help="Testing only")
    parser.add_argument("--offline", action="store_true", help="No external HTTP")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if args.batch_size < 1 or args.batch_size > 222:
        parser.error("--batch-size must be between 1 and 222")
    report = review_batch(base.read(base.CATALOG), base.read(base.WITNESSES),
                          week=args.week, batch_size=args.batch_size,
                          remote=not args.offline)
    base.write(args.output / "weekly-review.json", report)
    print(json.dumps(report["summary"], ensure_ascii=False, sort_keys=True))
    print("Read-only report:", args.output / "weekly-review.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
