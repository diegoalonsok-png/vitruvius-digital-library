#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a conservative, reproducible ecdotic overlay for 222 classical works.

Python 3.11+ / standard library only. Does NOT overwrite the master catalogue,
manuscript registry, textual indices or historical research. Missing scholarly
evidence remains null and cannot silently increase maturity.

Usage: python3 scripts/build_ecdotics_222.py --check
       python3 scripts/build_ecdotics_222.py --write
       python3 scripts/build_ecdotics_222.py --write --out /tmp/ecdotics-222.json
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
WITNESSES = ROOT / "data/bibliotheca-testimonia-verified.json"
AUTHORITIES = ROOT / "data/perseus-provenance-audit.json"
STANDARD = ROOT / "data/classics-corpus/vitruvius-standard-222.json"
DEFAULT_OUT = ROOT / "data/classics-corpus/ecdotics-222.json"
CTS_RE = re.compile(r"^urn:cts:(?:greekLit|latinLit):(?:tlg|phi|stoa)[A-Za-z0-9_.-]+$")
VALID_TYPES = {"direct", "indirect", "undetermined"}


def read(path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(path)


def verified_url(value):
    """Only classify HTTPS URL shape; availability and manuscript match need review."""
    if not isinstance(value, str):
        return None
    p = urlparse(value)
    return value if p.scheme == "https" and p.netloc and not p.username else None


def classify_witness(record):
    kind = record.get("witnessKind", "")
    if kind.startswith("direct_original_"):
        return "direct"
    if kind.startswith("ancient_translation"):
        return "indirect"
    return "undetermined"


def create_overlay(catalog, registry, authorities, standard):
    works = catalog.get("works", [])
    if len(works) != 222 or len({w.get("id") for w in works}) != 222:
        raise ValueError("Expected exactly 222 distinct works in master catalogue")
    ids = {w["id"] for w in works}
    auth_by = {x.get("workId"): x for x in authorities.get("records", [])}
    std_by = {x.get("workId"): x for x in standard.get("records", [])}
    if set(std_by) != ids:
        raise ValueError("The 222-record standard is not aligned with the master catalogue")

    linked = {id_: [] for id_ in ids}
    seen = set()
    issues = []
    for ms in registry.get("records", []):
        mid = ms.get("id")
        if not mid or mid in seen:
            issues.append({"severity": "error", "code": "duplicate_or_missing_witness_id", "id": mid})
        seen.add(mid)
        for wid in ms.get("workIds", []):
            if wid not in ids:
                issues.append({"severity": "error", "code": "unknown_work", "id": wid})
                continue
            linked[wid].append(ms)

    records = []
    for w in works:
        wid = w["id"]
        base = std_by[wid]
        authority = auth_by.get(wid, {})
        cts = authority.get("ctsEditionUrn")
        if cts and not CTS_RE.fullmatch(cts):
            issues.append({"severity": "warning", "code": "cts_urn_needs_review", "id": wid})
            cts = None
        witnesses = []
        for ms in linked[wid]:
            typ = classify_witness(ms)
            if typ not in VALID_TYPES:
                raise ValueError("Invalid transmission type")
            if ms.get("viewer") and not verified_url(ms.get("viewer")):
                issues.append({"severity": "warning", "code": "viewer_url_not_https", "id": ms.get("id")})
            witnesses.append({
                "witnessId": ms["id"],
                "transmission": {
                    "type": typ,
                    "classificationBasis": ms.get("witnessKind"),
                    "family": None,
                    "recension": None,
                    "editorialSiglum": ms.get("siglum"),
                    "siglumSourceEdition": None,
                    "stemmaPosition": None,
                    "copyOf": None,
                    "indirectSourceType": None,
                },
                "codicology": {
                    "repository": ms.get("library"),
                    "shelfmark": ms.get("shelfmark"),
                    "paleographicDate": ms.get("date"),
                    "support": ms.get("material"),
                    "script": ms.get("script"),
                    "hands": ms.get("hands"),
                    "correctors": ms.get("corrections"),
                    "scholia": ms.get("scholia"),
                    "interlinearGlosses": ms.get("glosses"),
                    "subscriptiones": ms.get("subscriptiones"),
                    "origin": ms.get("origin"),
                    "provenance": ms.get("provenance"),
                    "foliation": ms.get("folioRange"),
                },
                "textualIntegrity": {
                    "coverage": ms.get("coverage"),
                    "lacunae": None,
                    "acephalus": None,
                    "mutilus": None,
                    "transposedFolios": None,
                    "interpolations": None,
                    "criticalReviewStatus": "pending",
                },
                "sources": {
                    "catalogue": verified_url(ms.get("record")),
                    "viewer": verified_url(ms.get("viewer")),
                    "iiifManifest": verified_url(ms.get("manifest")),
                    "verification": verified_url(ms.get("verificationUrl")),
                    "evidenceStatus": ms.get("verificationLevel", "not_reviewed"),
                    "criticalEditionChicago18": None,
                },
            })
        editor_refs = list(dict.fromkeys(ref.strip() for ref in base.get("editorialControl", {}).get("chicago18References", []) if isinstance(ref, str) and ref.strip()))
        # Do not infer an edition type, stemma or level solely from manuscripts.
        has_l1 = bool(cts and editor_refs and base["authority"]["candidateWorkCodes"])
        # L2 requires a cited editor's explicit siglum and manuscript position.
        has_l2 = has_l1 and any(
            x["transmission"]["editorialSiglum"]
            and x["transmission"]["siglumSourceEdition"]
            and x["sources"]["viewer"] and x["sources"]["criticalEditionChicago18"]
            for x in witnesses
        )
        has_l3 = False  # Only promote after a separately reviewed stemma.
        level = 3 if has_l3 else 2 if has_l2 else 1 if has_l1 else 0
        records.append({
            "workId": wid,
            "work": {
                "author": w.get("author"),
                "title": w.get("title"),
                "originalLanguage": w.get("language"),
                "compositionDate": w.get("dating"),
                "genre": w.get("genre"),
            },
            "canonicalIdentifiers": {
                "candidateTLGPHI": authority.get("candidateWorkCodes", []),
                "candidateStatus": "requires_authority_review",
                "ctsEditionUrn": cts,
                "ctsEditionStatus": "existing_registry_claim_requires_review" if cts else "not_verified",
            },
            "textualTradition": {
                "directIndirectReview": "incomplete",
                "traditionType": None,
                "isOpenTradition": None,
                "archetype": None,
                "families": [],
                "recensions": [],
                "indirectWitnesses": [],
                "stemmaCodicum": {"status": "not_established", "sourceEdition": None, "edges": []},
            },
            "witnesses": witnesses,
            "digitalEdition": {
                "baseEdition": None,
                "editionType": "not_verified",
                "criticalApparatus": "not_audited",
                "normalization": {
                    "latinUV": None, "latinIJ": None, "latinAssimilation": None,
                    "greekAccents": None, "greekBreathings": None,
                    "punctuation": None, "editorialConjectures": None,
                },
                "chicago18References": editor_refs,
                "ctsEditionUrn": cts,
                "lociAlignment": "not_verified",
            },
            "maturity": {
                "level": level,
                "levelName": ["pending_ecdotic_baseline", "authority_and_base_edition",
                              "primary_witness_verified", "stemma_verified"][level],
                "requirements": "Cumulative L1: verified edition CTS + Chicago18; "
                                "L2: cited critical siglum + source + manuscript; "
                                "L3: documented direct/indirect traditions and stemma.",
                "candidateWitnessCount": len(witnesses),
                "isManuscriptAgePriorityProven": False,
            },
        })
    return {
        "schema": "vitruvius-ecdotics-222-v1",
        "sourceFiles": [str(p.relative_to(ROOT)) for p in (CATALOG, WITNESSES, AUTHORITIES, STANDARD)],
        "policy": "No conjectural editorial genealogies or identifiers; never modify sources.",
        "count": len(records),
        "records": records,
    }, issues


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--check", action="store_true", help="Validate data without writing output")
    p.add_argument("--write", action="store_true", help="Write the generated ecdotic overlay")
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = p.parse_args()
    overlay, issues = create_overlay(read(CATALOG), read(WITNESSES),
                                     read(AUTHORITIES), read(STANDARD))
    summary = {
        "works": len(overlay["records"]),
        "linkedWitnessAssociations": sum(len(x["witnesses"]) for x in overlay["records"]),
        "worksWithManuscripts": sum(bool(x["witnesses"]) for x in overlay["records"]),
        "maturity": {str(n): sum(x["maturity"]["level"] == n for x in overlay["records"])
                     for n in range(4)},
        "issues": issues[:40],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if args.write:
        save(args.out, overlay)
        print("Wrote:", args.out)
    return 1 if any(x["severity"] == "error" for x in issues) else 0


if __name__ == "__main__":
    raise SystemExit(main())
