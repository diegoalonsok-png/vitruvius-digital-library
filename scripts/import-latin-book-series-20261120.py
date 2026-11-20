#!/usr/bin/env python3
"""Ingest complete digital Latin book-series from a pinned public-domain repository.

Source units are preserved as books; inner chunk numbers are *local* and must
never be mistaken for canonical chapter references or verified translations.
Existing catalogue records are enriched, never duplicated.
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
 {"id":"isidore-etymologiae","author":"Isidoro de Sevilla","title":"Etymologiae · Originum libri XX",
  "genre":"Enciclopedia latina tardoantigua","files":[f"isidore/{n}.txt" for n in range(1,21)]},
 {"id":"seneca-naturales","author":"Séneca","title":"Naturales quaestiones",
  "genre":"Filosofía natural latina","files":[f"sen/sen.qn{n}.txt" for n in range(1,8)]},
 {"id":"velleius-historia","author":"Veleyo Patérculo","title":"Historia Romana · libri duo",
  "genre":"Historiografía latina","files":["vell1.txt","vell2.txt"]},
]
def read(path):return json.loads(path.read_text(encoding="utf-8"))
def write(path,data):
 path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def fetch(path):
 url=f"{BASE}/{path}"
 req=urllib.request.Request(url,headers={"User-Agent":"VitruviusDigitalLibrary/1.0 (academic indexing)"})
 with urllib.request.urlopen(req,timeout=65) as response:
  raw=response.read(2500001)
 if not 15000<len(raw)<2500000:raise ValueError("Incomplete or oversized text: "+path)
 return url,raw
def segments(raw,book):
 # Remove markup placeholders but preserve text; do not fabricate canonical loci.
 txt=raw.decode("utf-8-sig")
 txt=re.sub(r"<[^>\n]{1,90}>","",txt)
 txt=re.sub(r"\s+"," ",txt).strip()
 if len(txt)<9000 or len(re.findall(r"[A-Za-z]",txt))<7000:
  raise ValueError("Insufficient Latin transcription in book "+str(book))
 out=[]
 start=0
 while start<len(txt):
  end=min(start+1700,len(txt))
  if end<len(txt):
   space=txt.rfind(" ",max(start,end-200),end+1)
   if space>start:end=space
  part=txt[start:end].strip()
  if part:out.append({"locus":f"book-{book}.local-{len(out)+1:05d}",
     "locusKind":"source book number plus local chunk (NOT classical chapter)",
     "sourceBook":book,"text":part})
  start=end
  while start<len(txt) and txt[start].isspace():start+=1
 if sum(len(p["text"]) for p in out)<0.95*len(txt):
  raise ValueError("Source transcription unexpectedly truncated")
 return out
def main():
 cat,supp,reg=read(CAT),read(SUPP),read(REG)
 primary={w["id"]:w for w in cat["works"]}
 secondary={w["id"]:w for w in supp["works"]}
 if set(primary)&set(secondary):raise ValueError("Duplicate work identities across catalogues")
 indexed={(e["workId"],e["language"]) for e in reg["entries"]}
 files=[];entries=[];added=[];enriched=[]
 for spec in SOURCES:
  id=spec["id"]
  if (id,"la") in indexed:
   print("SKIP already registered",id);continue
  all_passages=[];source_files=[]
  for book,filename in enumerate(spec["files"],1):
   url,raw=fetch(filename)
   passgs=segments(raw,book)
   all_passages.extend(passgs)
   source_files.append({"book":book,"url":url,"sha256":hashlib.sha256(raw).hexdigest(),
                        "bytes":len(raw),"passages":len(passgs)})
   print("VERIFIED",id,"book",book,"bytes",len(raw),"passages",len(passgs))
  assert len(source_files)==len(spec["files"])
  if len({p["locus"] for p in all_passages})!=len(all_passages):
   raise ValueError("Duplicate source-book/local locus "+id)
  path=f"data/classics-corpus/{id}-la.json"
  if (ROOT/path).exists():raise ValueError("Orphan local text needs review: "+path)
  original={"workId":id,"language":"la","title":spec["title"],
     "sourceType":"public-domain-latin-library-book-series","source":BASE,
     "sourceRevision":REV,"sourceFiles":source_files,
     "attribution":f'{spec["author"]} · {spec["title"]} · The Latin Library, CLTK digital transcription',
     "license":"Public Domain Mark 1.0 in CLTK/lat_text_latin_library LICENSE.md; national rights may vary",
     "editorialStatus":"Digital book-unit transcription, no autoptic collation or canonical chapter attribution.",
     "alignment":"Source books kept distinct; local chunks do not assert translation equivalence.",
     "passages":all_passages}
  row={"workId":id,"author":spec["author"],"title":spec["title"],"language":"la",
       "format":"json-passages","path":path,
       "reader":f"classics-text-reader.html?work={id}&lang=la",
       "sourceDescription":"Pinned CLTK Latin Library book files; Public Domain Mark 1.0"}
  w=primary.get(id) or secondary.get(id)
  if w:
   existing=w.get("corpusFiles",{}).get("la")
   if existing:raise ValueError("Existing Latin text requires review: "+id)
   w["corpusFiles"]={**w.get("corpusFiles",{}),"la":path}
   w["localVersions"]=[*w.get("localVersions",[]),{"language":"la","path":path}]
   w["sourceFiles"]=source_files
   w["sourceLicense"]="Public Domain Mark 1.0"
   w["textStatus"]="registered-pending-lexical-index"
   w["reading"]={"url":row["reader"],"status":"Transcripción latina por libros; pasajes digitales locales."}
   enriched.append(id)
  else:
   added.append({"id":id,"author":spec["author"],"title":spec["title"],
      "language":"la","genre":spec["genre"],
      "status":"Transcripción latina incorporada; índice por verificar",
      "textStatus":"registered-pending-lexical-index","source":"The Latin Library / CLTK",
      "sourceUrl":BASE,"sourceFiles":source_files,"sourceLicense":"Public Domain Mark 1.0",
      "corpusFiles":{"la":path},"localVersions":[{"language":"la","path":path}],
      "publicStatus":"lectura-local-completa",
      "reading":{"url":row["reader"],"status":"Transcripción latina por libros; pasajes digitales locales."}})
  files.append((path,original))
  entries.append(row)
 # Atomic logical staging: no files are published until every required book is downloaded.
 for path,source in files:write(ROOT/path,source)
 supp["works"].extend(added)
 reg["entries"].extend(entries)
 reg["entries"].sort(key=lambda x:(x["workId"],x["language"],x.get("format","")))
 reg["count"]=len(reg["entries"])
 reg["works"]=len({x["workId"] for x in reg["entries"]})
 write(CAT,cat);write(SUPP,supp);write(REG,reg)
 print(json.dumps({"indexedCandidateWorks":len(files),"existingWorksEnriched":enriched,
   "newCataloguedWorks":[w["id"] for w in added]},ensure_ascii=False))
if __name__=="__main__":main()
