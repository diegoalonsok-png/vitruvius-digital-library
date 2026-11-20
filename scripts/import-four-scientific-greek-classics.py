#!/usr/bin/env python3
"""Importar cuatro originales científicos griegos TEI verificados sin duplicar obras.

No modifica páginas, R2 ni obras previas. Publica únicamente una edición completa
con fuente inmutable, SHA256, licencia e identificador CTS verificados.
"""
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"data/classics-corpus"
CAT=ROOT/"data/bibliotheca-expansion-publicada-2026-11-16.json"
MAIN=ROOT/"data/bibliotheca-graeca-latina-I-bce-I-ce.json"
REG=BASE/"search-registry.json"
REVISION="ed91552c52530c8f5a3ddf2dd767e899372a804c"
ROOT_URL=f"https://raw.githubusercontent.com/OpenGreekAndLatin/First1KGreek/{REVISION}/data"
TEI="{http://www.tei-c.org/ns/1.0}"
SKIP={"note","rdg","bibl","fw","figure","graphic","ref","head","pb","milestone","teiHeader"}
CANDIDATES=[
 ("apollonius-conica","Apolonio de Perge","Conica · Κωνικά","tlg0550","tlg001","J. L. Heiberg","Geometría griega"),
 ("aristarchus-magnitudines","Aristarco de Samos","De magnitudinibus et distantiis solis et lunae","tlg1181","tlg001","Thomas Heath","Astronomía griega"),
 ("geminus-isagoge","Gémino","Elementa astronomiae · Εἰσαγωγή","tlg1383","tlg001","Charles Manitius","Astronomía griega"),
 ("pappus-synagoge","Papo de Alejandría","Synagoge · Συναγωγή","tlg2032","tlg001","Friedrich Hultsch","Matemática griega")
]
def read(p):return json.loads(p.read_text(encoding="utf-8"))
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def local(tag):return tag.rsplit("}",1)[-1]
def text(el):
    if local(el.tag) in SKIP:return ""
    parts=[el.text or ""]
    for ch in el:
        if local(ch.tag)=="app":
            lem=next((x for x in ch if local(x.tag)=="lem"),None)
            if lem is not None:parts.append(text(lem))
        elif local(ch.tag) not in SKIP:parts.append(text(ch))
        parts.append(ch.tail or "")
    return "".join(parts)
def download(url):
    for attempt in range(3):
        try:
            request=urllib.request.Request(url,headers={"User-Agent":"VitruviusDigitalLibrary/academic-tei-ingest"})
            with urllib.request.urlopen(request,timeout=50) as response:raw=response.read(4000001)
            if not 1500<len(raw)<=4000000:raise ValueError("Invalid TEI size")
            return raw
        except OSError:
            if attempt==2:raise
            time.sleep(2+attempt*3)
def extract(raw,urn):
    tree=ET.fromstring(raw)
    licences=[e for e in tree.iter() if local(e.tag)=="licence"]
    if not any("creativecommons.org/licenses/by-sa/4.0" in e.get("target","") for e in licences):
        raise ValueError("Missing CC BY-SA 4.0 licence declaration")
    body=next((e for e in tree.iter() if local(e.tag)=="body"),None)
    if body is None:raise ValueError("Missing TEI body")
    parents={child:parent for parent in body.iter() for child in parent}
    passages=[]
    for el in body.iter():
        if local(el.tag) not in ("p","l"):continue
        ancestor=parents.get(el)
        blocked=False
        while ancestor is not None:
            if local(ancestor.tag) in SKIP or (local(el.tag)=="l" and local(ancestor.tag)=="p"):
                blocked=True;break
            ancestor=parents.get(ancestor)
        if blocked:continue
        value=re.sub(r"\s+"," ",text(el)).strip()
        if len(value)<7 or len(re.findall(r"[\u0370-\u03ff\u1f00-\u1fff]",value))<3:continue
        divisions=[];anc=parents.get(el)
        while anc is not None:
            if local(anc.tag)=="div" and anc.get("type")=="textpart" and anc.get("n"):
                divisions.append(str(anc.get("n")))
            anc=parents.get(anc)
        passages.append({"locus":urn+":local-p"+f"{len(passages)+1:05d}","text":value,
          "sourceDivisionHint":".".join(reversed(divisions)) or "sin división fuente"})
    greek=sum(len(re.findall(r"[\u0370-\u03ff\u1f00-\u1fff]",p["text"])) for p in passages)
    if len(passages)<12 or greek<3000:raise ValueError("Incomplete or insufficient Greek text")
    return passages,greek
def main():
    catalog=read(CAT);master=read(MAIN);registry=read(REG)
    indexed={e["workId"] for e in registry["entries"]}
    seen_urns={str(e.get("sourceUrn","")) for e in registry["entries"] if e.get("sourceUrn")}
    known={w["id"] for w in catalog["works"]}|{w["id"] for w in master["works"]}
    saved=[];new_entries=[];new_works=[]
    for id,author,title,a,b,editor,genre in CANDIDATES:
        if id in indexed or id in known:
            print("SKIP existing",id);continue
        urn=f"urn:cts:greekLit:{a}.{b}.1st1K-grc1"
        if urn in seen_urns:raise ValueError("Duplicate edition URN "+urn)
        url=f"{ROOT_URL}/{a}/{b}/{a}.{b}.1st1K-grc1.xml"
        raw=download(url)
        passages,greek=extract(raw,urn)
        path=f"data/classics-corpus/{id}-grc.json"
        if (ROOT/path).exists():raise ValueError("Unregistered original exists: "+path)
        original={"workId":id,"language":"grc","title":title,
          "sourceType":"edited-greek-tei","source":url,"sourceRevision":REVISION,
          "sourceUrn":urn,"sourceSha256":hashlib.sha256(raw).hexdigest(),
          "sourceLicense":"CC BY-SA 4.0","attribution":f"{author} · {editor} · Open Greek and Latin First1KGreek",
          "editorialStatus":"Original griego TEI; segmentos digitales locales, no loci CTS cotejados ni traducción alineada.",
          "alignment":"No se atribuye equivalencia a una traducción ausente.",
          "passages":passages}
        rec={"id":id,"author":author,"title":title,"language":"grc","genre":genre,
          "status":"Texto griego verificado; indexación léxica pendiente de comprobación",
          "textStatus":"registered-pending-lexical-index","source":"Open Greek and Latin First1KGreek · edición TEI",
          "sourceUrl":url,"sourceUrn":urn,"sourceSha256":original["sourceSha256"],
          "sourceLicense":"CC BY-SA 4.0","corpusFiles":{"grc":path},
          "localVersions":[{"language":"grc","path":path}],"publicStatus":"lectura-local-completa",
          "reading":{"url":f"classics-text-reader.html?work={id}&lang=grc","status":"Original griego segmentado; traducción aún no registrada."}}
        entry={"workId":id,"author":author,"title":title,"language":"grc",
          "format":"json-passages","path":path,
          "reader":f"classics-text-reader.html?work={id}&lang=grc",
          "sourceUrn":urn,"sourceSha256":original["sourceSha256"],
          "sourceDescription":f"First1KGreek; edición de {editor}; CC BY-SA 4.0"}
        saved.append((path,original))
        new_entries.append(entry);new_works.append(rec)
        seen_urns.add(urn)
        print(f"VERIFIED {id}: {len(passages)} passages, {greek} Greek chars")
    # Sólo escribir si TODAS las fuentes candidatas validaron; sin cambios parciales.
    for path,original in saved:write(ROOT/path,original)
    catalog["works"].extend(new_works)
    registry["entries"].extend(new_entries)
    registry["entries"].sort(key=lambda x:(x["workId"],x["language"],x.get("format","")))
    registry["count"]=len(registry["entries"])
    registry["works"]=len({x["workId"] for x in registry["entries"]})
    write(CAT,catalog);write(REG,registry)
    print(json.dumps({"newIndexedCandidates":len(saved),"newIds":[x["id"] for x in new_works]}))
if __name__=="__main__":main()
