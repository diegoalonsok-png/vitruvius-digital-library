#!/usr/bin/env python3
"""Publish scanned IMAGE PAGES of Rose 1899 and Krohn 1912 as individually addressable R2 objects.

Usage (locally or from workflow):
  python scripts/publish-rose-krohn-folios-r2.py --edition both
  python scripts/publish-rose-krohn-folios-r2.py --edition rose --dry-run

Digital image number != printed page != historical manuscript folio.
No correspondence is invented. OCR is excluded from the facsimile index until verified.
Manifests are uploaded only after all image objects have been checked.
"""
from __future__ import annotations
import argparse
import io
import json
import os
import pathlib
import sys
import tempfile
import urllib.request

ROSE_SOURCES = [
 "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vitruvii_De_architectura_libri_decem_%28IA_vitruviidearchit00vitr_0%29.pdf",
 "https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf",
 "https://archive.org/download/vitruviidearchi00pollgoog/vitruviidearchi00pollgoog.pdf",
]
KROHN = pathlib.Path("documents/krohn-1912.pdf")
KROHN_FALLBACK = [
 "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vitruvii_De_architectura_libri_decem_%28IA_vitruviidearchit00vitr%29.pdf",
 "https://archive.org/download/vitruviidearchit00vitr/vitruviidearchit00vitr.pdf",
 "https://archive.org/download/vitruviidearchit00vitr_1/vitruviidearchit00vitr_1.pdf",
]
BASE = os.getenv("R2_PUBLIC_BASE", "https://libros.vitruvius-digital-library.org").rstrip("/")
BUCKET = os.getenv("R2_BUCKET_NAME", os.getenv("R2_BUCKET", "vitruvius-bibliotheca"))
EDITIONS = {
 "rose": {
  "key": "rose-1899", "title": "Vitruvii De architectura libri decem",
  "author": "Marcus Vitruvius Pollio", "editor": "Valentin Rose",
  "date": "1899", "language": "la",
  "source": "https://archive.org/details/vitruviidearchit00vitr_0",
  "holding": "Getty Research Institute · Internet Archive digitization (source copy for this import)",
  "rights": "Historical public-domain edition; scan provenance credited to the holding institution."
 },
 "krohn": {
  "key": "krohn-1912", "title": "Vitruvii De architectura libri decem",
  "author": "Marcus Vitruvius Pollio", "editor": "Fritz Krohn",
  "date": "1912", "language": "la",
  "source": "https://vitruvius-digital-library.org/documents/krohn-1912.pdf",
  "holding": "Scan held by Vitruvius Digital Library; original institutional holding not yet established",
  "rights": "Historical edition; identify the source copy and reproduction terms before external redistribution."
 }
}

def evaluate_scan(pdf: pathlib.Path, edition: str) -> dict:
 """Check actual original image detail; upscaling never adds readable information."""
 import fitz
 from statistics import median
 with fitz.open(str(pdf)) as doc:
  count = len(doc)
  if count < 280 or count > 850: raise RuntimeError(f"{edition}: suspicious page count {count}")
  picks=sorted(set(max(0,min(count-1,int(count*f))) for f in (.08,.16,.25,.35,.45,.55,.65,.75,.84,.93)))
  resolutions=[]
  for i in picks:
   pg=doc[i]
   images=pg.get_images(full=True)
   if images:
    sizes=[(im[2],im[3]) for im in images if im[2] and im[3]]
    if sizes: resolutions.append(max(h for w,h in sizes))
  # PDFs consisting of real vector glyphs are allowed, but tiny raster scans
  # are not misrepresented as a high-resolution source.
  if resolutions and median(resolutions)<1050:
   raise RuntimeError(f"{edition}: source image resolution too low, median {median(resolutions):.0f}px high")
  if not resolutions and sum(len(doc[i].get_text().strip()) for i in picks)<1000:
   raise RuntimeError(f"{edition}: neither readable vector text nor sufficient raster evidence")
  return {"pages":count,"sample_native_heights":resolutions,"minimum_sample_height_px":min(resolutions) if resolutions else None}

def download_rose(tmp: pathlib.Path) -> pathlib.Path:
 dest = tmp / "rose-1899.pdf"
 errors = []
 for url in ROSE_SOURCES:
  try:
   request = urllib.request.Request(url, headers={"User-Agent": "VitruviusDigitalLibrary/1.0 (scholarly indexing)"})
   with urllib.request.urlopen(request, timeout=120) as src, dest.open("wb") as target:
    while True:
     buf = src.read(1024 * 1024)
     if not buf: break
     target.write(buf)
   if dest.stat().st_size < 100_000: raise RuntimeError("Incomplete PDF")
   import fitz
   with fitz.open(str(dest)) as doc:
    if len(doc) < 200: raise RuntimeError("Insufficient scanned pages")
    front = " ".join(doc[i].get_text()[:2500] for i in range(min(12,len(doc)))).lower()
    if front and "rose" not in front and "vitruv" not in front:
     raise RuntimeError("No Vitruvius/Rose identification in the front matter")
   quality=evaluate_scan(dest,"rose-1899")
   print("Rose source validated:",url,quality,flush=True)
   return dest
  except Exception as exc:
   errors.append(f"{url}: {exc}")
   if dest.exists(): dest.unlink()
 raise RuntimeError("Neither verified Rose PDF source could be downloaded: " + " | ".join(errors))


def select_krohn(tmp: pathlib.Path) -> pathlib.Path:
 if KROHN.is_file():
  try:
   details=evaluate_scan(KROHN,"krohn-1912")
   print("Krohn local PDF validated:",details,flush=True)
   return KROHN
  except Exception as exc:
   print("Local Krohn copy rejected for scan quality:",exc,flush=True)
 issues=[]
 for url in KROHN_FALLBACK:
  dest=tmp/"krohn-1912.pdf"
  try:
   request=urllib.request.Request(url,headers={"User-Agent":"VitruviusDigitalLibrary/1.0 (academic digitization)"})
   with urllib.request.urlopen(request,timeout=120) as res,dest.open("wb") as file:
    while chunk:=res.read(1024*1024): file.write(chunk)
   details=evaluate_scan(dest,"krohn-1912")
   print("Krohn scan validated:",url,details,flush=True)
   return dest
  except Exception as exc:
   issues.append(f"{url}: {exc}")
   if dest.exists(): dest.unlink()
 raise RuntimeError("No acceptable Krohn scan found: "+" | ".join(issues))

def client():
 import boto3
 account = os.getenv("R2_ACCOUNT_ID", os.getenv("CLOUDFLARE_ACCOUNT_ID", "4e936bf2c4f185a87075ca506de93e69"))
 access = os.getenv("R2_ACCESS_KEY_ID", "")
 secret = os.getenv("R2_SECRET_ACCESS_KEY", "")
 if not all((account, access, secret, BUCKET)):
  raise RuntimeError("R2 credentials missing: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME")
 return boto3.client("s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
                     aws_access_key_id=access, aws_secret_access_key=secret, region_name="auto")

def exists(s3, key):
 from botocore.exceptions import ClientError
 try:
  s3.head_object(Bucket=BUCKET, Key=key)
  return True
 except ClientError as exc:
  status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 0)
  if status in (403, 404): 
   if status == 403: raise
   return False
  raise

def publish(edition: str, pdf: pathlib.Path, s3, dpi: int, force: bool, dry_run: bool):
 import fitz
 info = EDITIONS[edition]; slug = info["key"]; prefix = f"folios/{slug}"
 with fitz.open(str(pdf)) as doc:
  count = len(doc)
  if not count: raise RuntimeError(f"{edition}: zero pages")
  quality=evaluate_scan(pdf,slug)
  print(f"{edition}: {count} independent digital images; PDF={pdf} ({pdf.stat().st_size} bytes); quality={quality}", flush=True)
  entries = []
  for i in range(count):
   n = i + 1
   key = f"{prefix}/imagen-{n:04d}.jpg"
   public = f"{BASE}/{key}"
   entries.append({
    "imagenDigital": n, "imagen": public, "miniatura": None,
    "folio": None, "paginaImpresa": None,
    "etiquetaFuente": f"Imagen digital {n}",
    "numeracion": "digital-only-unverified-printed-pagination"
   })
   if dry_run: continue
   if not force and exists(s3, key):
    if n % 30 == 0: print(f"{slug} {n}/{count} (already uploaded)", flush=True)
    continue
   page = doc.load_page(i)
   pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72), colorspace=fitz.csRGB, alpha=False)
   # Pillow used for compact and legible folio images (~130-160 dpi).
   from PIL import Image
   im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
   output = io.BytesIO()
   im.save(output, format="JPEG", quality=92, optimize=True, subsampling=0)
   s3.put_object(Bucket=BUCKET, Key=key, Body=output.getvalue(), ContentType="image/jpeg",
                 CacheControl="public, max-age=31536000, immutable")
   if n % 30 == 0 or n == count: print(f"{slug} {n}/{count}", flush=True)
  manifest = {
   "schema": "vdl-folios-obra-1", "obra": slug, "titulo": info["title"],
   "autor": info["author"], "editor": info["editor"], "edicion": info["date"],
   "lengua": info["language"], "fuente": info["source"], "custodia": info["holding"],
   "derechos": info["rights"], "imagenes": count, "folios": entries,
   "calidad": quality, "dpi_exportacion": dpi, "jpeg_calidad":92,
   "criterio": "One scanned PDF page per image; image number is NOT printed pagination or manuscript foliation.",
   "estadoOCR": "Texto OCR e índice de loci separados; todavía sin coordenadas verificadas sobre cada imagen."
  }
  if dry_run:
   print(json.dumps({k:v for k,v in manifest.items() if k!="folios"},ensure_ascii=False,indent=2))
   return
  # Verify EVERY image exists before making the public index visible.
  missing=[entry["imagenDigital"] for entry in entries
           if not exists(s3, f'{prefix}/imagen-{entry["imagenDigital"]:04d}.jpg')]
  if missing: raise RuntimeError(f"{edition}: upload incomplete: {missing[:12]}")
  payload=json.dumps(manifest,ensure_ascii=False,indent=2).encode("utf-8")
  s3.put_object(Bucket=BUCKET,Key=f"{prefix}/indice-folios.json",Body=payload,
                ContentType="application/json; charset=utf-8",CacheControl="public, max-age=300")
  print(f"PUBLIC {BASE}/{prefix}/indice-folios.json ({count} pages)",flush=True)

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--edition",choices=["rose","krohn","both"],default="both")
 parser.add_argument("--dpi",type=int,default=195)
 parser.add_argument("--force",action="store_true")
 parser.add_argument("--dry-run",action="store_true")
 args=parser.parse_args()
 if not 150<=args.dpi<=240: parser.error("DPI must be between 150 and 240")
 editions=["krohn","rose"] if args.edition=="both" else [args.edition]
 s3=None if args.dry_run else client()
 with tempfile.TemporaryDirectory(prefix="vitruvius-folios-") as temporary:
  for edition in editions:
   pdf=download_rose(pathlib.Path(temporary)) if edition=="rose" else select_krohn(pathlib.Path(temporary))
   if not pdf.is_file(): raise FileNotFoundError(pdf)
   publish(edition,pdf,s3,args.dpi,args.force,args.dry_run)

if __name__=="__main__":
 try: main()
 except Exception as exc:
  print(f"ERROR: {exc}",file=sys.stderr)
  sys.exit(1)
