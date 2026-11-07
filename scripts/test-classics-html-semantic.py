#!/usr/bin/env python3
"""Verify semantic index extraction from *existing* HTML corpus anchors."""
import importlib.util
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("classics_semantic", root / "scripts/build_classics_semantic_index.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
expected = {
    "corpus/cicero-de-officiis-la.html": "book1",
    "corpus/lucretius-de-rerum-natura-la.html": "liber-1",
    "corpus/catullus-carmina-la.html": "carmen-I",
}
for path, anchor in expected.items():
    items = builder.read({"path": path, "format": "html-text"})
    assert items, f"HTML corpus empty: {path}"
    assert any(loc == anchor for loc, _ in items), f"No real source anchor {anchor} in {path}"
    assert all(loc and text.strip() for loc, text in items), f"Unanchored passage {path}"
    print(path, len(items), "anchored source units")
assert "html-text" in builder.ELIGIBLE
assert "historical-ocr-pages" not in builder.ELIGIBLE
print("HTML source anchor tests passed; historical OCR remains unverified.")
