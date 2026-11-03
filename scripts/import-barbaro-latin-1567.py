#!/usr/bin/env python3
"""Import Daniele Barbaro's Latin edition (Venice 1567) from e-rara IIIF.

Holding: Stiftung Bibliothek Werner Oechslin, Einsiedeln; A04d, app. 928.
DOI: https://doi.org/10.3931/e-rara-19438
IIIF: https://www.e-rara.ch/i3f/v20/6105281/manifest
License: Public Domain Mark. Credit holder and DOI in all metadata.
Distinct from Italian 1567 exemplar, with different pagination.
"""
import json
import pathlib
import time
import urllib.request
from urllib.parse import quote

ROOT=pathlib.Path(__file__).resolve().parents[1]
MANIFEST="https://www.e-rara.ch/i3f/v20/6105281/manifest"
OUT=ROOT/"data/iiif/barbaro-latin-1567.json"
IMAGES=ROOT/"images/barbaro-latin-1567"
HEADERS={"User-Agent":"VitruviusDigitalLibrary/1.0 (research archive; https://github.com/diegoalonsok-png/vitruvius-digital-library)","Accept":"application/json,image/jpeg,*/*"}
def load(url,attempts=4):
    error=None
    for i in range(attempts):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=70) as req:
                return req.read()
        except Exception as exc:
            error=exc
            time.sleep(2*(i+1))
    raise RuntimeError("Could not download "+url+": "+str(error))
def value_label(obj):
    s=obj.get("label","")
    return s if isinstance(s,str) else " · ".join(sum(([str(t) for t in v] for v in s.values()),[]))
def canvases(doc):
    if "sequences" in doc:
        for n,c in enumerate(doc["sequences"][0].get("canvases",[]),1):
            resource=(c.get("images") or [{}])[0].get("resource",{})
            service=resource.get("service",{})
            if isinstance(service,list):service=service[0] if service else {}
            base=service.get("@id") or service.get("id") or ""
            base=base.rstrip("/")
            image=(base+"/full/1200,/0/default.jpg") if base else resource.get("@id") or resource.get("id")
            yield {"page":n,"iiif_label":value_label(c),"canvas_id":c.get("@id"),"image_url":image,"local_url":f"images/barbaro-latin-1567/{n:04}.jpg"}
    else:
        for n,c in enumerate(doc.get("items",[]),1):
            body=((c.get("items") or [{}])[0].get("items") or [{}])[0].get("body",{})
            service=body.get("service",{})
            if isinstance(service,list):service=service[0] if service else {}
            base=(service.get("id") or service.get("@id") or "").rstrip("/")
            image=(base+"/full/1200,/0/default.jpg") if base else body.get("id")
            yield {"page":n,"iiif_label":value_label(c),"canvas_id":c.get("id"),"image_url":image,"local_url":f"images/barbaro-latin-1567/{n:04}.jpg"}
def main():
    data=json.loads(load(MANIFEST))
    folios=list(canvases(data))
    if len(folios)<300:
        raise RuntimeError(f"Unexpected IIIF manifest with {len(folios)} canvases; aborting import")
    OUT.parent.mkdir(parents=True,exist_ok=True)
    IMAGES.mkdir(parents=True,exist_ok=True)
    record={"schema":1,"title":"M. Vitruvii Pollionis De architectura libri decem: cum commentariis Danielis Barbari (Venice, 1567)","language":"la","iiif_manifest":MANIFEST,"record":"https://www.e-rara.ch/oec/doi/10.3931/e-rara-19438","doi":"10.3931/e-rara-19438","institution":"Stiftung Bibliothek Werner Oechslin, Einsiedeln","shelfmark":"A04d, app. 928","rights":"Public Domain Mark; source and institutional credit required","total":len(folios),"canvases":folios}
    OUT.write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    failures=[]
    for c in folios:
        dest=ROOT/c["local_url"]
        if dest.exists() and dest.stat().st_size>3500:
            continue
        try:
            data=load(c["image_url"],3)
            if not data.startswith(bytes((255,216,255))) or len(data)<3500:
                raise ValueError("Not a valid JPEG")
            dest.write_bytes(data)
        except Exception as exc:
            failures.append(f"{c['page']}: {exc}")
        if c["page"]%25==0:
            print("Verified up to digital image",c["page"],"of",len(folios),flush=True)
    if failures:
        print("\n".join(failures[:20]))
        raise SystemExit(f"{len(failures)} images could not be copied; index preserved for retry")
    print("COMPLETE",len(folios),"Latin edition images, separate from Italian edition")
if __name__=="__main__": main()
