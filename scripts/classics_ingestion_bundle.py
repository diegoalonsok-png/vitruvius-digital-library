"""Produce readable text, an exact-word index and Conceptus anchors at ingestion.

The PDF is never altered. Image pages are OCRed before a book is advertised as
searchable. Page numbers are documentary anchors, not ancient canonical loci.
"""
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from build_classics_semantic_index import dictionary, tokens


def pdf_pages(document, language="la", edition_language="", ocr=True, runner=subprocess.run):
    """Keep native text; OCR pages with insufficient extracted text in full."""
    model = {"grc": "grc", "la": "lat", "en": "eng", "fr": "fra", "es": "spa",
             "lat": "lat", "eng": "eng", "fre": "fra", "fra": "fra", "spa": "spa", "gre": "grc", "ell": "grc"}
    edition = str(edition_language).removeprefix("bilingue-")
    requested = list(dict.fromkeys([model.get(language, "eng"), model.get(edition, "eng")]))
    available = None
    pages, methods = [], []
    for number, page in enumerate(document, 1):
        native = page.get_text("text") or ""
        method, issue, text = "PDF text layer", "", native
        if ocr and len(native.strip()) < 80:
            try:
                if not shutil.which("tesseract"):
                    raise RuntimeError("Tesseract OCR is not installed")
                if available is None:
                    available = set(runner(["tesseract", "--list-langs"], capture_output=True, text=True, check=True, timeout=15).stdout.splitlines()[1:])
                missing = [lang for lang in requested if lang not in available]
                if missing:
                    raise RuntimeError("OCR language models missing: " + ", ".join(missing))
                with tempfile.TemporaryDirectory(prefix="classics-ocr-") as folder:
                    image = Path(folder) / "page.png"
                    page.get_pixmap(dpi=250, alpha=False).save(str(image))
                    result = runner(["tesseract", str(image), "stdout", "-l", "+".join(requested), "--psm", "3"], capture_output=True, text=True, check=True, timeout=90)
                recovered = result.stdout.strip()
                # Native fragments remain recoverable even if OCR recognition is worse.
                if len(recovered) > len(native.strip()):
                    text, method = recovered, "Tesseract OCR (" + "+".join(requested) + ") · unreviewed"
                elif not native.strip():
                    method = "OCR completed; no text recognized (blank or unreadable page)"
            except (RuntimeError, OSError, subprocess.SubprocessError) as exc:
                issue = str(exc)[:180]
                method = "OCR unavailable; native text retained"
        pages.append(text)
        methods.append({"page": number, "method": method, **({"issue": issue} if issue else {})})
    return pages, methods


def reading_index(work_id, units, concepts, source_sha256, source_kind="pdf-ocr"):
    """Candidate index over every unit; literal phrases are verified in the text."""
    literal = defaultdict(lambda: [0, []])
    semantic = defaultdict(list)
    lexicon = dictionary(concepts)
    characters = 0
    for anchor, content in units:
        words = tokens(content)
        characters += len(content)
        counts = Counter(words)
        for word, count in counts.items():
            literal[word][0] += count
            literal[word][1].append(anchor)
        found = set()
        for i, word in enumerate(words):
            for language in lexicon:
                for cid, term, phrase in lexicon[language].get(word, []):
                    if words[i:i + len(phrase)] == phrase:
                        found.add(cid)
        for cid in found:
            semantic[cid].append(anchor)
    if not characters or not literal:
        raise ValueError("No digital text recovered; cannot publish a searchable edition")
    return {"schema": "vdl-ingestion-reading-index-v1", "workId": work_id,
            "sourceSha256": source_sha256, "sourceKind": source_kind,
            "anchorKind": "digital-page-not-canonical-locus" if source_kind == "pdf-ocr" else "edition-locus",
            "units": len(units), "characters": characters,
            "literal": dict(literal), "semantic": dict(semantic),
            "method": "Normalized surface forms and documented multilingual Conceptus terms; candidate anchors, not embeddings or validated lemmatization."}


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


def pdf_bundle(work_id, pages, methods, source_sha256, concepts, source_identifier=""):
    if len(pages) != len(methods):
        raise ValueError("Page text and OCR method counts differ")
    text = {"schema": "vdl-r2-texto-paginas-1", "obra": work_id,
            "fuente": source_identifier, "sourceSha256": source_sha256,
            "aviso": "PDF text layer / Tesseract OCR; automatic transcription not reviewed",
            "paginas": pages, "metodosPagina": methods}
    index = reading_index(work_id, list(enumerate(pages, 1)), concepts, source_sha256)
    index["textSha256"] = hashlib.sha256(json_bytes(text)).hexdigest()
    return text, index
