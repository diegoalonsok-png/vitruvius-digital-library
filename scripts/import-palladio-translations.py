#!/usr/bin/env python3
"""Palladio historical translations: PDF -> page images, text, manifests -> R2.

Usage:
 pip install pymupdf boto3
 python scripts/import-palladio-translations.py --edition es1797 --out palladio-staging
 python scripts/import-palladio-translations.py --edition en1738 --out palladio-staging --upload --acknowledge-reuse-rights

R2 environment (never commit values): R2_ENDPOINT_URL, R2_ACCESS_KEY_ID,
R2_SECRET_ACCESS_KEY, R2_BUCKET; optionally R2_PUBLIC_BASE_URL.
Page indices are digital PDF pages (1-based), NOT original printed folios.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

EDITIONS = {
    "es1797": {
        "title": "Los quatro libros de arquitectura de Andres Paladio, vicentino",
        "translator": "Joseph Francisco Ortiz y Sanz",
        "language": "es",
        "year": 1797,
        "source_pdf": "https://www.sedhc.es/bibliotecaD/1797_Andrea_Palladio_Los_cuatro_libros_de_arquitectura.pdf",
        "source_catalog": "https://sedhc.es/tratados/",
        "note": "Bibliographic records describe a separately paginated volume; verify full four-book coverage.",
    },
    "en1738": {
        "title": "The four books of architecture",
        "translator": "Isaac Ware",
        "language": "en",
        "year": 1738,
        "source_pdf": "https://archive.org/download/gri_33125011569684/gri_33125011569684.pdf",
        "source_catalog": "https://commons.wikimedia.org/wiki/File:The_four_books_of_architecture_(IA_gri_33125011569684).pdf",
        "note": "Engraved plates have their own enumeration.",
    },
    "fr1650": {
        "title": "Les quatre livres de l'architecture d'André Palladio",
        "translator": "Roland Fréart de Chambray",
        "language": "fr",
        "year": 1650,
        "source_pdf": "https://architectura.univ-tours.fr/wp-content/uploads/pdf/pdf-images/CESR_4045.pdf",
        "source_catalog": "https://architectura.univ-tours.fr/livres-consultation/cesr_4045consult/",
        "note": "CNRS/Tours digital reproduction: verify reuse terms before hosting scans.",
    },
}

def download(url, dest):
    if dest.exists() and dest.stat().st_size > 1024:
        return
    req = Request(url, headers={"User-Agent": "VitruviusDigitalLibrary/1.0 (research preservation)"})
    tmp = dest.with_suffix(".partial")
    with urlopen(req, timeout=120) as response, tmp.open("wb") as out:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            out.write(block)
    if tmp.stat().st_size < 1024:
        raise RuntimeError("Downloaded file unexpectedly small")
    tmp.replace(dest)

def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def upload_folder(folder, prefix):
    import boto3
    required = ["R2_ENDPOINT_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError("Missing R2 configuration: " + ", ".join(missing))
    client = boto3.client(
        "s3", endpoint_url=os.environ["R2_ENDPOINT_URL"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )
    types = {".jpg": "image/jpeg", ".json": "application/json", ".txt": "text/plain", ".pdf": "application/pdf"}
    bucket = os.environ["R2_BUCKET"]
    for file in sorted(folder.rglob("*")):
        if not file.is_file() or file.name.endswith(".partial"):
            continue
        key = prefix + "/" + file.relative_to(folder).as_posix()
        client.upload_file(str(file), bucket, key, ExtraArgs={"ContentType": types.get(file.suffix, "application/octet-stream")})
        print("R2:", key)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--edition", required=True, choices=sorted(EDITIONS))
    parser.add_argument("--out", default="palladio-staging")
    parser.add_argument("--dpi", type=int, default=160)
    parser.add_argument("--limit", type=int, default=0, help="First N PDF pages for a pilot (0=all)")
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--acknowledge-reuse-rights", action="store_true",
                        help="Confirm that hosting the source institution's digitization is permitted")
    args = parser.parse_args()
    if args.upload and not args.acknowledge_reuse_rights:
        parser.error("R2 publication requires --acknowledge-reuse-rights")
    try:
        import fitz
    except ImportError as exc:
        raise SystemExit("Install PyMuPDF: pip install pymupdf") from exc
    edition = EDITIONS[args.edition]
    root = Path(args.out) / args.edition
    (root / "pages").mkdir(parents=True, exist_ok=True)
    (root / "texts").mkdir(exist_ok=True)
    pdf = root / "source.pdf"
    download(edition["source_pdf"], pdf)
    with fitz.open(pdf) as doc:
        total = len(doc)
        maximum = min(total, args.limit) if args.limit else total
        records = []
        for i in range(maximum):
            page = doc[i]
            number = i + 1
            stem = f"page-{number:04d}"
            img = root / "pages" / (stem + ".jpg")
            txt = root / "texts" / (stem + ".txt")
            if not img.exists():
                pix = page.get_pixmap(matrix=fitz.Matrix(args.dpi / 72, args.dpi / 72), alpha=False)
                pix.save(img, jpg_quality=83)
            content = page.get_text("text", sort=True)
            txt.write_text(content, encoding="utf-8")
            records.append({
                "pdf_page": number, "folio_original": None, "book": None, "chapter": None,
                "image": "pages/" + img.name, "text": "texts/" + txt.name,
                "has_embedded_text": bool(content.strip()),
                "image_sha256": sha256(img),
            })
    manifest = {
        "id": "palladio-" + args.edition,
        "work_id": "palladio-quattro-libri",
        "edition": edition,
        "source_sha256": sha256(pdf),
        "pdf_page_count": total,
        "processed_page_count": len(records),
        "complete": len(records) == total,
        "page_numbering": "1-based digital PDF page; original printed pagination not yet aligned",
        "collation_status": "not-verified",
        "ocr_status": "embedded-text-extraction-only; blank text needs OCR",
        "pages": records,
    }
    (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"edition": args.edition, "pages": len(records), "pdf_total": total, "text_pages": sum(r["has_embedded_text"] for r in records), "dir": str(root)}, ensure_ascii=False))
    if args.upload:
        upload_folder(root, "classics/palladio/translations/" + args.edition)

if __name__ == "__main__":
    main()
