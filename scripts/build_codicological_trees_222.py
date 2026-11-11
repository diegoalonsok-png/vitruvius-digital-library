#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build evidence-qualified manuscript trees for the 222-work Vitruvius catalogue.

Metadata only; no OCR, no downloads, no guessed stemmata. A work-to-witness
link means 'attests', never 'copied from'. Witness-to-witness ancestry requires
an explicit source. Curated recensional groupings are preserved when generating.

Usage:
    python3 scripts/build_codicological_trees_222.py --check
    python3 scripts/build_codicological_trees_222.py --write
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
WITNESSES = ROOT / "data/bibliotheca-testimonia-verified.json"
TARGET = ROOT / "data/classics-corpus/codicological-trees-222.json"


def load(path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write("\n")
    temporary.replace(path)


def build(catalog, manuscript_register, old=None):
    works = catalog.get("works", [])
    if len(works) != 222 or len({w.get("id") for w in works}) != 222:
        raise ValueError("Expected 222 unique catalogue entries; never create a 223rd by inference")
    valid = {w["id"] for w in works}
    codices = manuscript_register.get("records", [])
    witness_ids = [m.get("id") for m in codices]
    if not all(witness_ids) or len(set(witness_ids)) != len(witness_ids):
        raise ValueError("Duplicate or empty physical manuscript identifiers")
    by_work = {wid: [] for wid in valid}
    for witness in codices:
        for wid in witness.get("workIds", []):
            if wid not in valid:
                raise ValueError(f"Unknown work ID: {wid}")
            by_work[wid].append(witness)

    previous = {x["workId"]: x for x in (old or {}).get("records", [])}
    records = []
    for work in works:
        wid = work["id"]
        manuscripts = by_work[wid]
        witnesses = []
        for m in manuscripts:
            siglum = m.get("siglum")
            witnesses.append({
                "id": m["id"], "type": "physical_witness",
                "label": f"{siglum} · {m.get('shelfmark')}" if siglum else (m.get("shelfmark") or m["id"]),
                "repository": m.get("library"),
                "dating": m.get("date"), "material": m.get("material"),
                "folioRange": m.get("folioRange"), "coverage": m.get("coverage"),
                "sourceUrl": m.get("record") or m.get("verificationUrl"),
                "sourceStatus": m.get("verificationLevel") or "needs_review",
                "siglum": siglum
            })
        edges = [{
            "source": wid, "target": w["id"], "relation": "attests_work",
            "certainty": "catalogued",
            "interpretation": "An index relation, not a stemmatic ancestry claim",
            "sourceUrl": w["sourceUrl"],
        } for w in witnesses]
        by_id = {m["id"]: m for m in manuscripts}
        filiation = []
        for m in manuscripts:
            parent = m.get("copyOf")
            if parent and parent in by_id:
                if not (m.get("copyOfUrl") or m.get("copyOfVerification")):
                    raise ValueError(f"Uncited copying hypothesis: {m['id']}")
                filiation.append({
                    "source": parent, "target": m["id"], "relation": "copied_from",
                    "certainty": ("probable" if str(m.get("copyOfStatus", "")).startswith("probable") else "pending_revalidation"),
                    "sourceUrl": m.get("copyOfUrl") or m.get("transmissionReference"),
                    "scholarlyBasis": m.get("copyOfVerification")
                })
        old_record = previous.get(wid, {})
        # Curated group labels are admitted only if every cited witness still belongs to the work.
        families = old_record.get("families", [])
        for group in families:
            if not group.get("source") or any(x not in by_id for x in group.get("memberWitnessIds", [])):
                raise ValueError(f"Invalid or unsourced recensional group: {wid}")
        status = ("published_recensional_classification_partial_no_complete_stemma" if families
                  else "partial_documented_relation_not_global_stemma" if filiation
                  else "not_established")
        record = {
            "workId": wid, "title": work.get("title"),
            "kind": "documentary_witness_tree_not_stemma",
            "root": {"id": wid, "type": "classical_work", "label": f"{work.get('author')} · {work.get('title')}"},
            "witnesses": witnesses, "links": edges,
            "documentedFiliation": filiation,
            "archetype": None, "subarchetypes": [],
            "families": families, "indirectSources": [],
            "openOrClosedTradition": None,
            "stemmaStatus": status,
            "gaps": {
                "witnessesPending": not bool(witnesses),
                "criticalFamilyClassificationPending": not bool(families),
                "collationPending": True,
                "apographsRequiresEditionCitation": True,
            }
        }
        if old_record.get("editorialNote"):
            record["editorialNote"] = old_record["editorialNote"]
        records.append(record)
    return {
        "schema": "vitruvius-codicological-trees-222-v1",
        "count": len(records), "physicalWitnessCount": len(codices),
        "interpretation": ("Work-to-manuscript links are attestations; ancestry is explicit and "
                           "source-backed. No unidentified archetypes are invented."),
        "method": "Physical witness IDs are stable across works; recensiones require scholarship.",
        "records": records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    old = load(TARGET) if TARGET.exists() else None
    result = build(load(CATALOG), load(WITNESSES), old)
    summary = {
        "works": result["count"],
        "physicalWitnesses": result["physicalWitnessCount"],
        "withEvidence": sum(bool(x["witnesses"]) for x in result["records"]),
        "familyGroups": sum(len(x["families"]) for x in result["records"]),
        "documentedFiliations": sum(len(x["documentedFiliation"]) for x in result["records"]),
    }
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    if args.write:
        write(TARGET, result)
        print("Wrote", TARGET)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
