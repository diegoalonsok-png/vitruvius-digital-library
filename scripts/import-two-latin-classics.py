#!/usr/bin/env python3
"""Conservar e indexar obras latinas históricas verificadas sin duplicar fichas.

Fuente: CLTK lat_text_latin_library, public domain mark; revisión inmutable.
El locus es segmentación editorial local, no capítulo crítico ni facsímil.
"""
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CAT=ROOT/"data/bibliotheca-graeca-latina-I-bce-I-ce.json"
SUPP=ROOT/"data/bibliotheca-expansion-publicada-2026-11-16.json"
REG=ROOT/"data/classics-corpus/search-registry.json"
REV="76229acaf02efd1964ac32009408a90b6f279758"
BASE=f"https://raw.githubusercontent.com/cltk/lat_text_latin_library/{REV}"
SOURCES=[
 ("apuleius-de-deo-socratis","Apuleyo","De deo Socratis","apuleius/apuleius.deosocratis.txt","Filosofía romana"),
 ("censorinus-die-natali","Censorino","De die natali","censorinus.txt","Antigüedades y cronología romana")
]
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"VitruviusDigitalLibrary/1.0"})
    with urllib.request.urlopen(req,timeout=50) as response:raw=response.read(400001)
    if not 10000<len(raw)<400000:raise ValueError(f"Unexpected downloaded size: {url}")
    return raw
def chapters(raw):
    source=raw.decode("utf-8-sig")
    source=re.sub(r"<[^>\n]{1,120}>","",source)
    source=re.sub(r"\s+"," ",source).strip()
    # Texto integral, sin omitir secciones. No inferir concordancia con otras ediciones.
    size=1300
    passages=[]
    pos=0
    while pos<len(source):
        end=min(pos+size,len(source))
        if end<len(source):
            boundary=source.rfind(" ",max(pos,end-170),end+1)
            if boundary>pos:end=boundary
        fragment=source[pos:end].strip()
        if len(fragment)>30:passages.append({
            "locus":f"local.segment-{len(passages)+1:05d}",
            "locusKind":"local editorial segmentation, not historical chapter",
            "text":fragment})
        pos=end
        while pos<len(source) and source[pos].isspace():pos+=1
    length=sum(map(lambda x:len(x["text"]),passages))
    if len(passages)<10 or length<10000 or length<0.87*len(source):
        raise ValueError("Missing substantial Latin text in segmentation")
    return passages
def main():
    main=load(CAT);supp=load(SUPP);reg=load(REG)
    masters={w["id"]:w for w in main["works"]}
    supplements={w["id"]:w for w in supp["works"]}
    editions={(x["workId"],x["language"]) for x in reg["entries"]}
    additions=[];updated=[];new_entries=[];new_files=[]
    for id,author,title,filename,genre in SOURCES:
        if (id,"la") in editions:
            print("SKIP text already registered",id)
            continue
        url=f"{BASE}/{filename}"
        raw=fetch(url)
        passages=chapters(raw)
        path=f"data/classics-corpus/{id}-la.json"
        if (ROOT/path).exists():raise ValueError("Unregistered existing file: "+path)
        source={"workId":id,"language":"la","title":title,"sourceType":"latin-library-public-domain-transcription",
          "source":url,"sourceRevision":REV,"sourceSha256":hashlib.sha256(raw).hexdigest(),
          "license":"Public Domain Mark 1.0, CLTK lat_text_latin_library/LICENSE.md; confirm territorial applicability",
          "attribution":f"{author} · {title} · Latin Library/CLTK digital transcription",
          "editorialStatus":"Text transcribed into local segments. No historical chapter mapping or critical collation asserted.",
          "alignment":"No translation aligned",
          "passages":passages}
        entry={"workId":id,"author":author,"title":title,"language":"la",
          "format":"json-passages","path":path,
          "reader":f"classics-text-reader.html?work={id}&lang=la",
          "sourceDescription":"CLTK Latin Library historical transcription; Public Domain Mark 1.0",
          "sourceSha256":source["sourceSha256"]}
        if id in masters or id in supplements:
            target=masters.get(id) or supplements[id]
            if target.get("corpusFiles",{}).get("la"):
                raise ValueError("Conflicting registered original: "+id)
            target["corpusFiles"]={**target.get("corpusFiles",{}),"la":path}
            target["textStatus"]="registered-pending-lexical-index"
            target["sourceUrl"]=url
            target["sourceSha256"]=source["sourceSha256"]
            target["sourceLicense"]="Public Domain Mark 1.0"
            target["localVersions"]=[*target.get("localVersions",[]),{"language":"la","path":path}]
            target["reading"]={"url":entry["reader"],"status":"Texto latino digital; segmentación local, no cotejo crítico."}
            updated.append(id)
        else:
            additions.append({"id":id,"author":author,"title":title,"language":"la","genre":genre,
                "status":"Texto latino verificado; índice léxico pendiente",
                "textStatus":"registered-pending-lexical-index",
                "source":"CLTK Latin Library · texto digital de dominio público",
                "sourceUrl":url,"sourceSha256":source["sourceSha256"],
                "sourceLicense":"Public Domain Mark 1.0",
                "corpusFiles":{"la":path},"localVersions":[{"language":"la","path":path}],
                "publicStatus":"lectura-local-completa",
                "reading":{"url":entry["reader"],"status":"Transcripción latina segmentada sin traducción alineada."}})
        new_files.append((path,source))
        new_entries.append(entry)
        print("VERIFIED",id,"segments",len(passages),"bytes",len(raw))
    for path,source in new_files:save(ROOT/path,source)
    supp["works"].extend(additions)
    reg["entries"].extend(new_entries)
    reg["entries"].sort(key=lambda x:(x["workId"],x["language"],x.get("format","")))
    reg["count"]=len(reg["entries"])
    reg["works"]=len({x["workId"] for x in reg["entries"]})
    save(CAT,main);save(SUPP,supp);save(REG,reg)
    print(json.dumps({"imported":len(new_files),"catalogueAdded":len(additions),"existingEnriched":updated},ensure_ascii=False))
if __name__=="__main__":main()
