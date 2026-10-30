#!/usr/bin/env python3
"""Build browser-readable E5 embeddings from verified structured Vitruvian loci.
Requires: pip install sentence-transformers numpy
Run: python scripts/build-embeddings.py
Produces a signed int8 matrix and one JSON index; no server is required at runtime.
"""
import json
from pathlib import Path
import numpy as np
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "structured"
OUT = ROOT / "data"
SOURCES = [("recensio-es", "es"), ("recensio-fr", "fr"), ("theory-en", "en")]
MODEL = "intfloat/multilingual-e5-small"
MAX_CHARS = 1800


def main():
    model = SentenceTransformer(MODEL)
    rows, passages = [], {}
    for edition, language in SOURCES:
        data = json.loads((SOURCE / f"{edition}.json").read_text(encoding="utf-8"))
        for p in data["passages"]:
            locus = p["locus"]
            passages.setdefault(locus, {})[language] = {"edition": edition, "text": p.get("translation", "")}
            # Latin has one common locus identity; avoid duplicating the same passage three times.
            if edition == "recensio-es":
                rows.append({"locus": locus, "language": "la", "edition": edition, "text": p["latin"][:MAX_CHARS]})
            translated = p.get("translation", "")
            if translated:
                rows.append({"locus": locus, "language": language, "edition": edition, "text": translated[:MAX_CHARS]})
    notes_path = OUT / "critical-notes.json"
    if notes_path.exists():
        notes = json.loads(notes_path.read_text(encoding="utf-8"))
        for note in notes.get("entries", []):
            content = str(note.get("text") or "").strip()
            if content:
                rows.append({"locus": note.get("locus") or note.get("candidate_locus") or "",
                             "language": {"recensio-es":"es","recensio-fr":"fr","theory-en":"en"}.get(note.get("edition"),"la"),
                             "edition": note.get("edition"), "type": "critical_note",
                             "note_id": str(note.get("footnote_id") or ""),
                             "text": content[:MAX_CHARS]})
    texts = ["passage: " + r["text"] for r in rows]
    vectors = model.encode(texts, batch_size=24, normalize_embeddings=True, show_progress_bar=True)
    vectors = np.asarray(vectors, dtype=np.float32)
    if vectors.ndim != 2 or len(vectors) != len(rows):
        raise RuntimeError("Invalid embedding matrix")
    # Global scale across unit vectors; dot products are used for approximate ranking.
    quantized = np.clip(np.rint(vectors * 127), -127, 127).astype(np.int8)
    matrix_name = "embeddings-e5-small-int8.bin"
    (OUT / matrix_name).write_bytes(quantized.tobytes(order="C"))
    index = {
        "schema": 1,
        "model": MODEL,
        "runtime_model": "Xenova/multilingual-e5-small",
        "normalization": "e5-passage-prefix+mean-pooling+l2",
        "dtype": "int8",
        "scale": 127,
        "dimensions": vectors.shape[1],
        "rows": [{"locus": r["locus"], "language": r["language"], "edition": r["edition"], "type": r.get("type","passage"), "note_id": r.get("note_id")} for r in rows],
        "matrix": matrix_name,
        "corpus": {x: len(passages) for x in ["loci"]},
    }
    (OUT / "embeddings-e5-small-index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Prepared {len(rows)} vectors across {len(passages)} distinct loci, {vectors.shape[1]} dimensions.")


if __name__ == "__main__":
    main()
