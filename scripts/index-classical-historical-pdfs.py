#!/usr/bin/env python3
"""Index already-hosted historical PDFs: text layer first, OCR only as fallback.

Outputs raw page readings and evidence, not corrected editions. No alteration of
PDFs or claim of semantic/philological alignment. One JSON file per edition.
"""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "data/classics-corpus/pdf-inventory.json"
OUT = ROOT / "data/classics-historical-pages"
LANG_HINTS = {
    "aristotle-poetics-greek-christ-1893": "ell+eng",
    "aristotle-poetics-english-1819": "eng",
    "caesar-de-bello-gallico-smith-1842": "lat+eng",
    "cicero-de-officiis-miller-1913": "lat+eng",
    "epictetus-theophrastus-greek-1870": "ell+lat",
    "lucretius-de-rerum-natura-latin-1813": "lat",
    "lucretius-on-nature-things-1880": "eng",
    "plato-apologia-socratis-adam-1891": "ell+lat",
    "virgil-aeneid-book-i-walpole-1893": "lat+eng",
    "virgil-georgica-latin-forbiger-1849": "lat",
}

def ocr_page(page, languages, dpi):
    # Running tesseract on a temporary PNG limits RAM footprint.
    with tempfile.TemporaryDirectory() as temp:
        image = Path(temp) / "page.png"
        page.get_pixmap(dpi=dpi, colorspace=__import__("fitz").csGRAY, alpha=False).save(image)
        result = subprocess.run(
            ["tesseract", str(image), "stdout", "-l", languages, "--psm", "3"],
            capture_output=True, text=True, timeout=100, check=False,
        )
        if result.returncode:
            raise RuntimeError(result.stderr.strip()[:250] or "tesseract error")
        return result.stdout

def build(*, do_ocr=False, dpi=170, min_chars=90):
    import fitz
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    reports = []
    for entry in inventory["files"]:
        rel = entry["path"]
        path = ROOT / rel
        name = path.stem
        target = OUT / f"{name}.json"
        if not path.is_file():
            reports.append({"path": rel, "status": "missing-file"})
            continue
        fingerprint = hashlib.sha256(path.read_bytes()).hexdigest()
        if target.exists():
            try:
                prev = json.loads(target.read_text(encoding="utf-8"))
                if prev.get("sourceSha256") == fingerprint and (not do_ocr or prev.get("ocrAttempted")):
                    reports.append({"path": rel, "status": "unchanged", "pages": len(prev["pages"]),
                                    "ocrPages": sum(x["method"] == "ocr" for x in prev["pages"])})
                    continue
            except (ValueError, KeyError, TypeError):
                pass
        page_records = []
        language = LANG_HINTS.get(name, "eng")
        with fitz.open(path) as document:
            for i, page in enumerate(document):
                raw = page.get_text("text", sort=True)
                text = raw
                method = "pdf-text-layer" if len(raw.strip()) >= min_chars else "text-layer-short"
                error = None
                if do_ocr and len(raw.strip()) < min_chars:
                    try:
                        candidate = ocr_page(page, language, dpi)
                        if len(candidate.strip()) > len(raw.strip()):
                            text = candidate
                            method = "ocr"
                        else:
                            method = "text-layer-short-after-ocr"
                    except Exception as exc:
                        error = str(exc)[:240]
                        method = "ocr-failed"
                page_records.append({
                    "page": i + 1,
                    "text": text,
                    "method": method,
                    "characters": len(text.strip()),
                    **({"warning": error} if error else {}),
                })
        output = {
            "schema": "vitruvia-classics-historical-page-index-v1",
            "source": rel,
            "sourceSha256": fingerprint,
            "languagesForOcr": language,
            "ocrAttempted": bool(do_ocr),
            "editorialStatus": "Uncorrected page extraction; no diplomatic transcription or semantic alignment",
            "pages": page_records,
        }
        target.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")
        reports.append({
            "path": rel, "index": target.relative_to(ROOT).as_posix(),
            "status": "page-index-created", "pages": len(page_records),
            "textLayerPages": sum(x["method"] == "pdf-text-layer" for x in page_records),
            "ocrPages": sum(x["method"] == "ocr" for x in page_records),
            "shortOrFailed": sum(x["method"] not in ("pdf-text-layer", "ocr") for x in page_records),
        })
    report = {
        "schema": "vitruvia-classics-historical-ocr-coverage-v1",
        "note": "Raw per-page text; OCR is provisional and not proof of editorial correspondence.",
        "ocrRequested": bool(do_ocr),
        "records": reports,
    }
    (OUT / "coverage.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if any(r["status"] == "missing-file" for r in reports):
        raise RuntimeError("Some inventoried PDFs are missing")
    return report

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ocr", action="store_true", help="Run Tesseract for pages with short text layers")
    ap.add_argument("--dpi", type=int, default=170)
    args = ap.parse_args()
    build(do_ocr=args.ocr, dpi=args.dpi)
