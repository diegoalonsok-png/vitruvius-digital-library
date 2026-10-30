#!/usr/bin/env python3
"""Static validation of E5 files without third-party packages."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
idx = root / "data/embeddings-e5-small-index.json"
if not idx.exists():
    raise SystemExit("FAIL: Build data with python scripts/build-embeddings.py first.")
d = json.loads(idx.read_text(encoding="utf-8"))
assert d["schema"] == 1
assert d["dtype"] == "int8"
assert d["model"] == "intfloat/multilingual-e5-small"
rows = d["rows"]
assert len(rows) >= 731 * 3, f"Only {len(rows)} rows"
assert all(r["locus"] and r["language"] in {"la","es","fr","en"} for r in rows)
matrix = idx.parent / d["matrix"]
assert matrix.stat().st_size == len(rows) * d["dimensions"]
for edition in ["recensio-es", "recensio-fr", "theory-en"]:
    src = json.loads((root / f"data/structured/{edition}.json").read_text(encoding="utf-8"))
    expected = {x["locus"] for x in src["passages"]}
    available = {r["locus"] for r in rows if r["edition"] == edition}
    assert expected <= available, f"Missing {edition}: {sorted(expected-available)[:5]}"
print(f"PASS: {len(rows)} matrix rows with {len(set(x['locus'] for x in rows))} loci")
