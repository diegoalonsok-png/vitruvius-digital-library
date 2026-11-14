#!/usr/bin/env python3
"""Research-stage IIIF/PDF folio downloader: no invented foliation or R2 uploads.

Usage (execute in a network-enabled environment):
 python scripts/download_classical_folios.py pdf --source https://archive.org/download/twobooksonwater00hersgoog/twobooksonwater00hersgoog.pdf --id frontinus-herschel-1899 --rights "PD-1899 verified" --out staging
 python scripts/download_classical_folios.py iiif --source https://INSTITUTION/verified-manifest.json --id arcerianus --rights "permission verified" --out staging

Requires: pip install requests pymupdf Pillow
Do not copy institutional images without checking their stated reuse policy.
"""
import argparse, hashlib, io, json, re
from pathlib import Path
from urllib.parse import urlparse
import requests

def get(url, limit=300000000):
    if urlparse(url).scheme != "https": raise ValueError("HTTPS required")
    response=requests.get(url, timeout=90, headers={"User-Agent":"VitruviusDigitalLibrary/1.0 research"})
    response.raise_for_status()
    if len(response.content)>limit: raise ValueError("Download too large")
    return response.content

def canvases(doc):
    if doc.get("items"): return doc["items"]
    return doc.get("sequences",[{}])[0].get("canvases",[])

def image_url(canvas):
    if canvas.get("images"):
        resource=canvas["images"][0].get("resource",{})
        if resource.get("@id"): return resource["@id"]
        service=resource.get("service",{})
        if isinstance(service,list): service=service[0]
        base=service.get("@id") or service.get("id")
        if base: return base.rstrip("/")+"/full/max/0/default.jpg"
    for page in canvas.get("items",[]):
        for ann in page.get("items",[]):
            body=ann.get("body",{})
            if isinstance(body,list): body=body[0]
            if body.get("id"): return body["id"]
            service=body.get("service",[])
            if isinstance(service,dict):service=[service]
            if service:
                base=service[0].get("id") or service[0].get("@id")
                if base:return base.rstrip("/")+"/full/max/0/default.jpg"
    return None

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("mode",choices=["pdf","iiif"])
    p.add_argument("--source",required=True)
    p.add_argument("--id",required=True)
    p.add_argument("--rights",required=True,help="Verified source reuse status")
    p.add_argument("--out",default="folio-staging")
    p.add_argument("--limit",type=int,default=40)
    p.add_argument("--start",type=int,default=1,help="First 1-based scan page for PDF")
    a=p.parse_args()
    if not re.fullmatch("[a-z0-9][a-z0-9-]{2,79}",a.id):p.error("Invalid id")
    if not 1<=a.limit<=1000 or a.start<1:p.error("Invalid page range")
    target=Path(a.out)/a.id
    if target.exists() and any(target.iterdir()):p.error("Refusing to overwrite existing output")
    target.mkdir(parents=True,exist_ok=True)
    result=[]
    if a.mode=="pdf":
        import fitz
        raw=get(a.source)
        if not raw.startswith(b"%PDF"):raise ValueError("Source is not a PDF")
        doc=fitz.open(stream=raw,filetype="pdf")
        for n in range(a.start,min(len(doc),a.start+a.limit-1)+1):
            binary=doc.load_page(n-1).get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes("jpeg",jpg_quality=85)
            fn=f"scan-{n:04d}.jpg";(target/fn).write_bytes(binary)
            result.append({"file":fn,"scan_page":n,"sha256":hashlib.sha256(binary).hexdigest(),"folio":None,"locus":None})
    else:
        from PIL import Image
        manuscript=json.loads(get(a.source,25000000))
        for i,canvas in enumerate(canvases(manuscript)[:a.limit],1):
            url=image_url(canvas)
            if not url:continue
            binary=get(url,40000000)
            image=Image.open(io.BytesIO(binary)).convert("RGB")
            fn=f"canvas-{i:04d}.jpg";image.save(target/fn,quality=88)
            content=(target/fn).read_bytes()
            result.append({"file":fn,"canvas_index":i,"original_label":canvas.get("label"),"sha256":hashlib.sha256(content).hexdigest(),"folio":None,"locus":None,"image_source":url})
    record={"schema":"vdl-facsimile-staging-v1","id":a.id,"source":a.source,"rights_verification":a.rights,"type":"historical_reproduction","folio_locus_alignment":"not_verified","count":len(result),"pages":result}
    (target/"manifest.json").write_text(json.dumps(record,ensure_ascii=False,indent=2,default=str)+"\n",encoding="utf-8")
    print(f"Staged {len(result)} scans at {target}; no R2 upload or public catalogue update was performed.")

if __name__=="__main__":main()
