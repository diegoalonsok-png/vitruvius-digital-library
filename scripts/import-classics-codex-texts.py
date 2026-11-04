#!/usr/bin/env python3
"""Import citable Latin TEI plus public-domain translations without inventing folio alignment.
PerseusDL canonical-latinLit TEI: CC BY-SA 4.0 with attribution and ShareAlike.
Original works are public domain; converted structural data inherits source TEI license.
"""
import hashlib
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
import requests

ROOT=pathlib.Path(".")
OUT=ROOT/"data"/"classics-corpus"
OUT.mkdir(parents=True, exist_ok=True)
TEI="http://www.tei-c.org/ns/1.0"
SOURCES={
 "apuleius-metamorphoses":{
  "latin":"https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi1212/phi002/phi1212.phi002.perseus-lat1.xml",
  "latin_editor":"Stephen Gaselee, 1915; Perseus DL TEI, CC BY-SA 4.0",
  "subtype":"chapter","min_sections":150,"min_chars":230000,
  "english":("https://www.gutenberg.org/cache/epub/1666/pg1666.txt","William Adlington (1566, reprint 1639), Project Gutenberg #1666"),
  "spanish":("https://www.gutenberg.org/cache/epub/66591/pg66591.txt","La metamorfosis o El asno de oro, edición española histórica de 1890; Project Gutenberg #66591")
 },
 "petronius-satyrica":{
  "latin":"https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0972/phi001/phi0972.phi001.perseus-lat2.xml",
  "latin_editor":"Michael Heseltine, 1913; Perseus DL TEI, CC BY-SA 4.0",
  "subtype":"section","min_sections":100,"min_chars":80000,
  "english":("https://www.gutenberg.org/cache/epub/5225/pg5225.txt","W. C. Firebaugh, English translation; Project Gutenberg #5225"),
 }
}
SESSION=requests.Session()
SESSION.headers.update({"User-Agent":"VitruviusDigitalLibrary/1.0 (github.com/diegoalonsok-png/vitruvius-digital-library)"})
def download(url):
 response=SESSION.get(url,timeout=(20,100))
 response.raise_for_status()
 if len(response.content)>4_000_000:raise RuntimeError("Source too large")
 print("SOURCE",url,"bytes",len(response.content),"sha256",hashlib.sha256(response.content).hexdigest())
 return response.content.decode("utf-8-sig",errors="replace")
def tag(node):return node.tag.rsplit("}",1)[-1]
def clean(txt):return re.sub(r"\s+"," ",txt).strip()
def text_of(node):
 parts=[node.text or ""]
 for child in node:
  if tag(child) in ("note","pb","milestone","fw","head","ref","ptr"):pass
  elif tag(child)=="gap":parts.append(" [lacuna] ")
  else:parts.append(text_of(child))
  parts.append(child.tail or "")
 return clean(" ".join(parts))
def import_latin(wid,cfg):
 raw=download(cfg["latin"])
 root=ET.fromstring(raw)
 ns={"t":TEI}
 passages=[]
 for sub in root.findall(".//t:div[@subtype='"+cfg["subtype"]+"']",ns):
  content=text_of(sub)
  if len(content)<10:continue
  if cfg["subtype"]=="chapter":
   parent_books=[]
   # ElementTree lacks getparent: build map only once outside loop
   pass
  passages.append((sub.attrib.get("n",""),content,sub))
 parent_map={c:p for p in root.iter() for c in p}
 result=[]
 for n,content,sub in passages:
  if cfg["subtype"]=="chapter":
   p=parent_map.get(sub)
   book=p.attrib.get("n","") if p is not None else ""
   if not book:continue
   locus=book+"."+n
  else:locus=n
  if result and result[-1]["locus"]==locus:continue
  result.append({"locus":locus,"text":content})
 chars=sum(len(p["text"]) for p in result)
 if len(result)<cfg["min_sections"] or chars<cfg["min_chars"]:
  raise RuntimeError(f"Latin source incomplete: {wid} sections={len(result)} chars={chars}")
 return {
  "workId":wid,"language":"la","sourceType":"edited-latin-tei","editorialStatus":"Texto editado, no transcripción diplomática ni OCR del códice",
  "source":cfg["latin"],"attribution":cfg["latin_editor"],
  "license":"CC BY-SA 4.0 (PerseusDL canonical-latinLit; conservar atribución y compartir adaptaciones)",
  "alignment":"No existe correspondencia automática entre locus editorial y folio del códice",
  "passages":result
 }
def import_translation(wid,lang,record):
 url,credit=record
 raw=download(url)
 start=re.search(r"\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*",raw,re.I)
 end=re.search(r"\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*",raw,re.I)
 if start:raw=raw[start.end():]
 if end and not start:raw=raw[:end.start()]
 if start:
  end2=re.search(r"\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*",raw,re.I)
  if end2:raw=raw[:end2.start()]
 raw=re.sub(r"\r\n?","\n",raw)
 blocks=[clean(x) for x in re.split(r"\n\s*\n",raw) if len(clean(x))>30]
 passages=[];chunk=[]
 for b in blocks:
  chunk.append(b)
  if sum(map(len,chunk))>=1400:
   passages.append({"locus":"t"+str(len(passages)+1),"text":"\n\n".join(chunk)});chunk=[]
 if chunk:passages.append({"locus":"t"+str(len(passages)+1),"text":"\n\n".join(chunk)})
 chars=sum(len(p["text"]) for p in passages)
 if chars<23000:raise RuntimeError("Truncated translation: "+wid+lang+" "+str(chars))
 return {"workId":wid,"language":lang,"sourceType":"historical-translation","editorialStatus":"Traducción histórica no alineada por folios o loci con el original",
  "source":url,"attribution":credit,"license":"Public domain translation in Project Gutenberg (check jurisdiction and PG reuse terms)",
  "alignment":"Segmentos de lectura consecutivos, NO equivalencias con los capítulos del texto latino",
  "passages":passages}
def write(wid,lang,data):
 path=OUT/(wid+"-"+lang+".json")
 path.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
 print("PUBLISHED",path,"sections",len(data["passages"]),"characters",sum(len(p["text"]) for p in data["passages"]))
 return path.as_posix()

catalog_path=ROOT/"data"/"bibliotheca-graeca-latina-I-bce-I-ce.json"
catalog=json.loads(catalog_path.read_text(encoding="utf8"))
works={w["id"]:w for w in catalog["works"]}
changes={}
for wid,cfg in SOURCES.items():
 try:
  corpus={"la":import_latin(wid,cfg)}
  corpus["en"]=import_translation(wid,"en",cfg["english"])
  if "spanish" in cfg:corpus["es"]=import_translation(wid,"es",cfg["spanish"])
  paths={lang:write(wid,lang,data) for lang,data in corpus.items()}
  changes[wid]=paths
 except Exception as exc:
  print("NOT PUBLISHED",wid,str(exc),file=sys.stderr)
  # A failed source must never falsely claim an available local edition.
  continue
for wid,files in changes.items():
 w=works[wid]
 w["corpusFiles"]=files
 w["localHtml"]="classics-text-reader.html?work="+wid+"&lang=la"
 w["localVersions"]=[
  {"language":lang,"label":{"la":"Latín original · edición Perseus","en":"English · traducción histórica","es":"Castellano · traducción histórica"}.get(lang,lang),
   "path":"classics-text-reader.html?work="+wid+"&lang="+lang,
   "kind":"edited-text" if lang=="la" else "historical-translation","source":corpus_source}
  for lang,corpus_source in ((lang,SOURCES[wid]["latin"] if lang=="la" else SOURCES[wid]["english"][0] if lang=="en" else SOURCES[wid]["spanish"][0]) for lang in files)
 ]
 w["publicStatus"]="lectura-local-completa" if wid=="apuleius-metamorphoses" else "lectura-local-parcial"
 w["reading"]={"url":w["localHtml"],"status":
   ("Apuleyo: once libros latinos editados (Gaselee 1915), inglés histórico Adlington y castellano histórico de 1890. Sin alineación folio-locus."
    if wid=="apuleius-metamorphoses" else
    "Petronio: todos los fragmentos que transmite la edición latina digitalizada (Heseltine 1913), inglés histórico Firebaugh. Obra original perdida parcialmente; no se afirma integridad.")}
 w["translation"]={"status":"Inglés histórico y "+("castellano histórico, ambos disponibles localmente." if "es" in files else "castellano externo en Wikisource.")+
  " Traducciones NO cotejadas locus por locus con el texto latino."}
 if wid=="apuleius-metamorphoses":
  w["aliases"]=["Apuleyo","Apuleius","Asno de oro","El asno de oro","El asno dorado","Golden Ass","Cupid and Psyche","Psique y Cupido","Metamorfosis de Apuleyo"]
 else:w["aliases"]=["Petronio","Petronius","Satiricón","Satyricon","Satyrica","Cena Trimalchionis","Cena de Trimalción","Trimalcion","banquete","novela satírica"]
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
if len(changes)!=len(SOURCES):
 print("INCOMPLETE IMPORT",list(changes),"not imported",[x for x in SOURCES if x not in changes])
 sys.exit(1)
print("SUCCESS:",len(changes),"classical original-language Latin corpora with historical translations, all checked")
