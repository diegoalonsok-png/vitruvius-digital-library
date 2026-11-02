#!/usr/bin/env python3
"""Copia reproducible de Sulpizio c.1486–1487 desde BSB IIIF (Public Domain Mark).

205 imágenes, en el orden exacto del manifiesto bsb00061745. No altera otros
lectores ni crea atribuciones capítulo-folio sin cotejo.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import random
import sys
import time
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/"data/iiif/sulpizio-1486.json"
OUT=ROOT/"images/sulpizio-1486"
REPORT=ROOT/"data/iiif/sulpizio-1486-import-report.json"
MANIFEST="https://api.digitale-sammlungen.de/iiif/presentation/v2/bsb00061745/manifest"
TOTAL=205
WIDTH=int(os.getenv("SULPIZIO_WIDTH","1000"))
WORKERS=min(3,max(1,int(os.getenv("SULPIZIO_WORKERS","2"))))
HEADERS={"User-Agent":"Vitruvius-Digital-Library/1.0 (BSB bsb00061745, academic open access)","Accept":"application/json,image/jpeg,*/*"}

def download(url):
    for i in range(5):
        try:
            req=urllib.request.Request(url,headers=HEADERS)
            with urllib.request.urlopen(req,timeout=50) as response:
                return response.read()
        except (urllib.error.URLError,urllib.error.HTTPError,TimeoutError,OSError) as e:
            if i==4:
                raise RuntimeError(f"{url}: {e}") from e
            time.sleep(min(23,2*(2**i))+random.random()/2)

def jpeg_ok(raw):
    return len(raw)>2500 and raw[:3]==b"\xff\xd8\xff" and raw[-2:]==b"\xff\xd9"

def source():
    manifest=json.loads(download(MANIFEST))
    if "publicdomain/mark" not in str(manifest.get("license","")).lower():
        raise RuntimeError("BSB rights changed: review before copying")
    canvases=manifest.get("sequences",[{}])[0].get("canvases",[])
    if len(canvases)!=TOTAL:
        raise RuntimeError(f"Expected {TOTAL}, got {len(canvases)}")
    pages=[]
    for i,c in enumerate(canvases,1):
        service=c.get("images",[{}])[0].get("resource",{}).get("service",{})
        base=service.get("@id") or service.get("id")
        if not str(base).startswith("https://api.digitale-sammlungen.de/iiif/image/v2/bsb00061745_"):
            raise RuntimeError("Untrusted IIIF service for page "+str(i))
        pages.append({"page":i,"iiif_label":c.get("label",""),"canvas_id":c.get("@id"),
                      "image_url":base.rstrip("/")+f"/full/{WIDTH},/0/default.jpg",
                      "local_url":f"images/sulpizio-1486/{i:04d}.jpg"})
    return pages,manifest["license"]

def save(p):
    dest=OUT/f"{p['page']:04d}.jpg"
    if dest.is_file():
        old=dest.read_bytes()
        if jpeg_ok(old):
            return p["page"],"existing",len(old),hashlib.sha256(old).hexdigest()
    raw=download(p["image_url"])
    if not jpeg_ok(raw):
        raise RuntimeError("Not a valid complete JPEG at page "+str(p["page"]))
    if len(raw)>10_000_000:
        raise RuntimeError("Unexpectedly large JPEG at page "+str(p["page"]))
    temp=dest.with_suffix(".tmp")
    temp.write_bytes(raw);temp.replace(dest)
    return p["page"],"downloaded",len(raw),hashlib.sha256(raw).hexdigest()

def main():
    if WIDTH<600 or WIDTH>1600:raise ValueError("Unsafe image width")
    OUT.mkdir(parents=True,exist_ok=True)
    INDEX.parent.mkdir(parents=True,exist_ok=True)
    pages,license=source()
    meta={"schema":1,"title":"Vitruvius De architectura, Sulpizio da Veroli, c.1486–1487",
          "iiif_manifest":MANIFEST,"record":"https://www.digitale-sammlungen.de/en/view/bsb00061745",
          "institution":"Bayerische Staatsbibliothek, München","shelfmark":"2 Inc.s.a. 1221 m",
          "rights":license,"total":TOTAL,"canvases":pages}
    INDEX.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    successful=[];failed=[];existing=0;copied=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        tasks={pool.submit(save,p):p["page"] for p in pages}
        for n,job in enumerate(concurrent.futures.as_completed(tasks),1):
            page=tasks[job]
            try:
                idx,mode,size,sha=job.result()
                successful.append({"page":idx,"sha256":sha,"bytes":size})
                if mode=="existing": existing+=1
                else:copied+=1
            except Exception as exc:
                failed.append({"page":page,"error":str(exc)[:250]})
                print(f"FALLÓ {page}: {exc}",flush=True)
            if n%25==0: print(f"Verificadas {n}/{TOTAL}; errores {len(failed)}",flush=True)
    successful.sort(key=lambda x:x["page"])
    report={"source":MANIFEST,"rights":license,"expected":TOTAL,"successful":len(successful),
            "downloaded":copied,"existing":existing,"failed":failed,
            "total_bytes":sum(p["bytes"] for p in successful),
            "images":successful,"note":"Copia de estudio; no es transcripción filológica ni cotejo de variantes"}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"TOTAL {len(successful)}/{TOTAL}; bytes {report['total_bytes']:,}; faltan {[p['page'] for p in failed]}",flush=True)
    return 0

if __name__=="__main__":
    sys.exit(main())
