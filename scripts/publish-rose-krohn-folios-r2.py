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
import hashlib
import re
import unicodedata
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

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
  "holding": "Internet Archive · ejemplar vitruviidearchit00vitr_0",
  "rights": "Historical public-domain edition; scan provenance credited to the holding institution."
 },
 "krohn": {
  "key": "krohn-1912", "title": "Vitruvii De architectura libri decem",
  "author": "Marcus Vitruvius Pollio", "editor": "Fritz Krohn",
  "date": "1912", "language": "la",
  "source": "https://archive.org/details/vitruviidearchit00vitr",
  "holding": "University of Toronto · Internet Archive (crédito de la imagen digital 3)",
  "rights": "Edición histórica de dominio público. Se conserva el crédito de la digitalización de Internet Archive y University of Toronto."
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

def latin_tokens(text):
 normalized=unicodedata.normalize("NFD",text).lower().replace("v","u").replace("j","i")
 return re.findall(r"[a-z]+", "".join(c for c in normalized if not unicodedata.combining(c)))

def locus_index(pages):
 """Page candidates supported by actual OCR trigrams, with explicit uncertainty."""
 source=pathlib.Path("data/structured/recensio-es.json")
 if not source.is_file(): raise RuntimeError("Reference Latin is missing")
 inverted=defaultdict(set)
 for page in pages:
  tokens=latin_tokens(page["text"])
  for i in range(len(tokens)-2): inverted[tuple(tokens[i:i+3])].add(page["page"])
 loci={}
 for passage in json.loads(source.read_text(encoding="utf8"))["passages"]:
  tokens=latin_tokens(passage["latin"])
  triples=set(tuple(tokens[i:i+3]) for i in range(len(tokens)-2))
  votes=Counter()
  for triple in triples: votes.update(inverted.get(triple,()))
  best=votes.most_common(2)
  if not best: continue
  page,hits=best[0]; runner=best[1][1] if len(best)>1 else 0
  overlap=hits/max(1,len(triples))
  if hits<3 or overlap<.08: continue
  strong=hits>=5 and overlap>=.15 and (hits+1)/(runner+1)>=1.35
  loci[passage["locus"]]={"page":page,"status":"strong_textual_candidate" if strong else "ambiguous_textual_candidate",
    "matched_trigrams":hits,"overlap":round(overlap,3),"runner_up_page":best[1][0] if len(best)>1 else None}
 return {"schema":"vdl-edition-loci-1","loci":loci,
  "reference":"data/structured/recensio-es.json",
  "method":"Coincidencias de trigramas latinos normalizados en el OCR del mismo PDF. Son propuestas de navegación, no colación verificada."}

def page_ocr(page, number, slug):
 """Text offsets and boxes share ONE reading order from the same scanned page."""
 words=[]; fragments=[]; position=0; rect=page.rect
 for item in page.get_text("words",sort=True):
  x0,y0,x1,y1,term=item[:5]
  if not term.strip(): continue
  if fragments: fragments.append(" ");position+=1
  start=position;fragments.append(term);position+=len(term)
  x=max(0,min(1,(x0-rect.x0)/rect.width));y=max(0,min(1,(y0-rect.y0)/rect.height))
  words.append({"text":term,"start":start,"end":position,"x":round(x,6),"y":round(y,6),
   "w":round(max(0,min(1-x,(x1-x0)/rect.width)),6),"h":round(max(0,min(1-y,(y1-y0)/rect.height)),6)})
 return {"schema":"vdl-page-ocr-1","edition":slug,"page":number,"text":"".join(fragments),"words":words,
  "method":"Capa OCR del PDF original: coordenadas automáticas, pendientes de revisión."}

def reading_scale(page,dpi):
 """Retain the native resolution of the full-page scan, not its MediaBox DPI."""
 scale=max(dpi/72,2200/page.rect.width)
 images=page.get_images(full=True)
 if images:
  image=max(images,key=lambda item:item[2]*item[3])
  for rect in page.get_image_rects(image[0]):
   if rect.width>0 and rect.height>0 and rect.width*rect.height>=page.rect.width*page.rect.height*.5:
    scale=max(scale,image[2]/rect.width,image[3]/rect.height)
 return scale

def object_inventory(s3,prefix):
 result={}
 for batch in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET,Prefix=prefix+"/"):
  result.update({x["Key"]:x["Size"] for x in batch.get("Contents",[])})
 return result

def publish(edition: str, pdf: pathlib.Path, s3, dpi: int, force: bool, dry_run: bool):
 import fitz
 info = EDITIONS[edition]; slug = info["key"]; prefix = f"folios/{slug}"
 with fitz.open(str(pdf)) as doc:
  count = len(doc)
  if not count: raise RuntimeError(f"{edition}: zero pages")
  quality=evaluate_scan(pdf,slug)
  print(f"{edition}: {count} independent digital images; PDF={pdf} ({pdf.stat().st_size} bytes); quality={quality}", flush=True)
  # The original PDF remains available without adding a large binary to GitHub.
  source_hash=hashlib.sha256(pdf.read_bytes()).hexdigest()
  known={} if dry_run else object_inventory(s3,prefix)
  expected=set(); pending=[]; pages=[]
  pool=ThreadPoolExecutor(max_workers=8)
  def put(key,body,content_type,replace=False):
   expected.add(key)
   if dry_run or not replace and not force and known.get(key,0)>0:return
   pending.append(pool.submit(s3.put_object,Bucket=BUCKET,Key=key,Body=body,
    ContentType=content_type,CacheControl="public, max-age=3600"))
  def put_json(key,data):
   put(key,json.dumps(data,ensure_ascii=False,separators=(",",":")).encode("utf8"),"application/json; charset=utf-8",True)
  put(f"{prefix}/source.pdf",pdf.read_bytes(),"application/pdf")
  entries = []
  for i in range(count):
   n = i + 1
   # Several source PDFs have very small physical MediaBoxes. A DPI setting
   # alone produced pages only ~800 px wide despite a 3300–4000 px native scan.
   # Version the new objects so old immutable-cache responses cannot persist.
   key = f"{prefix}/imagen-master-{n:04d}.jpg"
   public = f"{BASE}/{key}"
   thumbnail=f"{prefix}/miniatura-{n:04d}.jpg"
   ocr_key=f"{prefix}/ocr/pagina-{n:04d}.json"
   page=doc.load_page(i);ocr=page_ocr(page,n,slug)
   pages.append({"page":n,"text":ocr["text"]})
   put_json(ocr_key,ocr)
   entries.append({
    "imagenDigital": n, "imagen": public, "miniatura": f"{BASE}/{thumbnail}",
    "texto":f"{BASE}/{ocr_key}",
    "folio": None, "paginaImpresa": None,
    "etiquetaFuente": f"Imagen digital {n}",
    "numeracion": "digital-only-unverified-printed-pagination"
   })
   expected.add(key);expected.add(thumbnail)
   if dry_run: continue
   from PIL import Image
   if force or not known.get(key):
    scale=reading_scale(page,dpi)
    pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),colorspace=fitz.csRGB,alpha=False)
    im=Image.frombytes("RGB",(pix.width,pix.height),pix.samples);output=io.BytesIO()
    im.save(output,format="JPEG",quality=92,optimize=True,subsampling=0)
    put(key,output.getvalue(),"image/jpeg")
   if force or not known.get(thumbnail):
    scale=280/page.rect.width
    pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),colorspace=fitz.csRGB,alpha=False)
    im=Image.frombytes("RGB",(pix.width,pix.height),pix.samples);output=io.BytesIO()
    im.save(output,format="JPEG",quality=82,optimize=True)
    put(thumbnail,output.getvalue(),"image/jpeg")
   if n % 30 == 0 or n == count: print(f"{slug} {n}/{count}", flush=True)
  manifest = {
   "schema": "vdl-folios-obra-1", "obra": slug, "titulo": info["title"],
   "autor": info["author"], "editor": info["editor"], "edicion": info["date"],
   "lengua": info["language"], "fuente": info["source"], "custodia": info["holding"],
   "derechos": info["rights"], "imagenes": count, "folios": entries,
   "calidad": quality, "dpi_exportacion": dpi, "jpeg_calidad":92,
   "ancho_minimo_exportacion_px":2200,
   "resolucion":"Se conserva al menos la resolución nativa del escaneo de página completa; el PDF maestro se conserva íntegro.",
   "criterio": "One scanned PDF page per image; image number is NOT printed pagination or manuscript foliation.",
   "pdf":f"{BASE}/{prefix}/source.pdf","sha256_pdf":source_hash,
   "textoIndice":f"{BASE}/{prefix}/ocr.json","lociIndice":f"{BASE}/{prefix}/loci.json",
   "estadoOCR":"OCR del mismo PDF con coordenadas automáticas de palabras; no transcripción crítica revisada."
  }
  navigation=locus_index(pages)
  put_json(f"{prefix}/ocr.json",{"schema":"vdl-edition-ocr-1","edition":slug,"sha256_pdf":source_hash,"pages":pages})
  put_json(f"{prefix}/loci.json",navigation)
  for job in pending:job.result()
  pool.shutdown(wait=True)
  if dry_run:
   print(json.dumps({k:v for k,v in manifest.items() if k!="folios"},ensure_ascii=False,indent=2))
   return
  # Verify EVERY image exists before making the public index visible.
  inventory=object_inventory(s3,prefix)
  missing=[key for key in expected if inventory.get(key,0)<=0]
  if missing: raise RuntimeError(f"{edition}: upload incomplete: {missing[:12]}")
  payload=json.dumps(manifest,ensure_ascii=False,indent=2).encode("utf-8")
  s3.put_object(Bucket=BUCKET,Key=f"{prefix}/indice-folios.json",Body=payload,
                ContentType="application/json; charset=utf-8",CacheControl="public, max-age=300")
  local=pathlib.Path("data/r2/folios")/f"{slug}.json"
  local.parent.mkdir(parents=True,exist_ok=True);local.write_bytes(payload)
  # Small same-origin indexes let both GitHub Pages and .org search even when
  # a visitor's network blocks cross-origin R2 JSON. Images still live in R2.
  for name,data in [("ocr",{"schema":"vdl-edition-ocr-1","edition":slug,"sha256_pdf":source_hash,"pages":pages}),("loci",navigation)]:
   (local.parent/f"{slug}-{name}.json").write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf8")
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
