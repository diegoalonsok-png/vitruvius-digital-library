#!/usr/bin/env python3
"""Check consistency of the published catalogue *snapshot* without accessing R2.

Exit 0 = structural counters reconcile; exit 1 = inconsistent declarations.
Passing does not certify remote HTTP availability or textual completeness.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "data/classics-corpus/external-index-reconciliation.json"


def audit(snapshot):
    c = snapshot["counts"]
    remote = snapshot["remoteEntries"]
    pending = snapshot["remainingWithoutOriginalIndex"]
    editions = snapshot["editorialEditionRecordsNotNewAncientWorks"]
    checks = {
        "catalogue_partition": c["worksCatalogued"] == c["combinedOriginalsIndexed"] + c["originalsStillWithoutIndex"],
        "indexed_partition": c["combinedOriginalsIndexed"] == c["hostedOriginalsIndexed"] + c["remoteOriginalsIndexed"],
        "pending_rows": c["originalsStillWithoutIndex"] == len(pending),
        "pending_ancient_works": c["distinctAncientWorksStillMissingOriginalIndex"] == sum(
            x.get("recordKind") == "independent-work" for x in pending),
        "pending_editorial_editions": c["unindexedEditionRecordsOfExistingVitruviusWork"] == len(editions),
        "edition_ids": set(editions) == {
            x["workId"] for x in pending
            if x.get("recordKind") == "derivative-edition-existing-ancient-work"},
        "greek_remote_manifest": c["remoteGreek"] == Counter(x.get("language") for x in remote)["grc"],
        "latin_remote_manifest": c["remoteLatin"] == Counter(x.get("language") for x in remote)["la"],
        "remote_not_overcounted": c["remoteOriginalsIndexed"] <= len(remote),
        "unique_remote_ids": len({x.get("workId") for x in remote}) == len(remote),
        "unique_pending_ids": len({x.get("workId") for x in pending}) == len(pending),
        "disjoint_indexed_and_pending": not (
            {x.get("workId") for x in remote} & {x.get("workId") for x in pending}),
        "remote_provenance": all(
            x.get("sourceUrl", "").startswith("https://")
            and len(x.get("sourceSha256", "")) == 64
            and x.get("editorialAttribution")
            and isinstance(x.get("passages"), int) and x["passages"] > 0
            for x in remote),
    }
    return checks


def main():
    snapshot = json.loads(FILE.read_text(encoding="utf-8"))
    checks = audit(snapshot)
    passed = sum(checks.values())
    failed = [name for name, ok in checks.items() if not ok]
    print(json.dumps({
        "scope": "snapshot only; not HTTP/R2/philological verification",
        "checks": len(checks), "passed": passed, "failed": failed,
        "catalogued": snapshot["counts"]["worksCatalogued"],
        "indexed": snapshot["counts"]["combinedOriginalsIndexed"],
        "pending": snapshot["counts"]["originalsStillWithoutIndex"],
        "remote_manifest_entries": len(snapshot["remoteEntries"]),
        "remote_additional": snapshot["counts"]["remoteOriginalsIndexed"],
    }, ensure_ascii=False, indent=2))
    return int(bool(failed))


if __name__ == "__main__":
    sys.exit(main())
