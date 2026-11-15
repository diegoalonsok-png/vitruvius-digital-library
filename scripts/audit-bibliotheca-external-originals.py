#!/usr/bin/env python3
"""Cotejo de los 28 originales externos y los 6 archivos OCR R2 sin ficha.

Lectura sin cambios: no importa, elimina, renombra ni promueve una edición.
El contenido de una transcripción documentada no prueba por sí solo la
completitud ni la identidad de un testimonio manuscrito.
"""
import collections
import datetime as dt
import json
import pathlib
import re
import unicodedata
from urllib.request import Request,urlopen
from urllib.parse import urlparse

ROOT=pathlib.Path(__file__).resolve().parents[1]
RESULT=ROOT/"reports/bibliotheca/external-originals-and-orphans.json"
MAX_BYTES=22_000_000
BRANCHES={"corpus-originales-griegos-20261108":"data/offsite-originals/",
          "corpus-originales-latinos-20261108":"data/offsite-latin/"}
R2="https://libros.vitruvius-digital-library.org/clasicos/texto/"
def read(p):
 return json.loads((ROOT/p).read_text(encoding="utf-8"))
def fetch_json(url):
 p=urlparse(url)
 if p.scheme!="https" or p.hostname not in ("raw.githubusercontent.com","libros.vitruvius-digital-library.org"):
  raise ValueError("Origen URL no aprobado")
 blocks=[];size=0
 with urlopen(Request(url,headers={"User-Agent":"VitruviusOffsiteIdentityAudit/1.0"}),timeout=45) as r:
  while True:
   b=r.read(262144)
   if not b:break
   size+=len(b)
   if size>MAX_BYTES:raise ValueError("Texto remoto excede tamaño máximo")
   blocks.append(b)
 return json.loads(b"".join(blocks))
def fold(s):
 return "".join(c for c in unicodedata.normalize("NFD",str(s or "").lower()) if not unicodedata.combining(c))
def terms(s):
 return {x for x in re.findall(r"[a-z]{5,}",fold(s)) if x not in {"opera","omnia","books","volume","libri","titulus","translation","edition","fragmenta"}}
def main():
 main={x["id"]:x for x in read("data/bibliotheca-graeca-latina-I-bce-I-ce.json")["works"]}
 manifest=read("data/classics-corpus/external-index-reconciliation.json")["remoteEntries"]
 orphan_report=read("data/r2/r2-orphan-reconciliation.json")
 orphans=orphan_report["records"]
 if isinstance(orphans,dict):orphans=orphans.get("sample",[])
 out={"schema":"vdl-offsite-and-uncatalogued-content-audit-v1",
      "generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
      "method":"GET de JSON de textos griegos/latinos en ramas documentadas; verificación de workId, lengua, cantidad y contenido de pasajes. Para huérfanos R2, lectura de OCR sin conferirles identidad editorial.",
      "limitations":"No se certifica edición completa, cotejo de manuscrito ni identidad PDF desde OCR. Títulos alternativos y versiones parciales requieren comprobación humana.",
      "external":[],"quarantined":[]}
 for e in manifest:
  wid=e["workId"];branch=e["branch"];path=e["textPath"];flags=[]
  try:
   if branch not in BRANCHES or not path.startswith(BRANCHES[branch]) or not re.fullmatch(r"data/[a-z0-9/_-]+\.json",path):
    raise ValueError("Ruta o rama externa no aprobada")
   url=f"https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/{branch}/{path}"
   d=fetch_json(url)
   if d.get("workId")!=wid:flags.append("WORK_ID_MISMATCH")
   if d.get("language")!=e.get("language"):flags.append("LANGUAGE_MISMATCH")
   if not isinstance(d.get("passages"),list):raise ValueError("No hay lista de pasajes")
   ps=d["passages"]
   if len(ps)!=e.get("passages"):flags.append("PASSAGE_COUNT_MISMATCH")
   blanks=sum(not isinstance(p,dict) or not str(p.get("text") or "").strip() or not str(p.get("locus") or "").strip() for p in ps)
   if blanks:flags.append("EMPTY_LOCI_OR_PASSAGES")
   sample="".join(str(p.get("text","")) for p in ps[:15] if isinstance(p,dict))
   if e["language"]=="grc" and not re.search(r"[\u0370-\u03ff\u1f00-\u1fff]",sample):flags.append("NO_GREEK_IN_ORIGINAL_SAMPLE")
   srcsha=d.get("sourceSha256")
   if srcsha and srcsha!=e.get("sourceSha256"):flags.append("SOURCE_HASH_PROVENANCE_CONFLICT")
   if len(sample)<350:flags.append("INSUFFICIENT_TEXT_SAMPLE")
   recorded=main.get(wid,{})
   title_candidates=[recorded.get("title"),*(recorded.get("aliases") or [])]
   source_title=d.get("title") or ""
   matches=any(terms(title)&terms(source_title) for title in title_candidates if isinstance(title,str))
   # Solo señal bibliográfica: equivalencias latín/griego no se descartan.
   if source_title and not matches:flags.append("EDITORIAL_TITLE_VARIANT_TO_REVIEW")
   out["external"].append({"id":wid,"title":recorded.get("title"),"textTitle":source_title,
    "passages":len(ps),"sourceSha256":e.get("sourceSha256"),"url":url,
    "status":"review" if flags else "metadata_and_text_consistent_not_certified",
    "flags":flags,"completeTextCertified":False})
  except Exception as exc:
   out["external"].append({"id":wid,"status":"could_not_inspect",
    "reason":type(exc).__name__+": "+str(exc)[:250],"completeTextCertified":False})
 for e in orphans:
  eid=e["id"];flags=[]
  try:
   if not re.fullmatch(r"[a-z0-9-]+",eid):raise ValueError("ID OCR fuera de norma")
   d=fetch_json(R2+eid+".json")
   if d.get("obra")!=eid:flags.append("OCR_ID_MISMATCH")
   pages=d.get("paginas")
   if not isinstance(pages,list) or not pages:raise ValueError("OCR sin páginas")
   opening=" ".join(pages[:min(18,len(pages))])
   tokens=terms(e.get("candidateWork"))
   matching=sorted(t for t in tokens if t in fold(opening))
   if tokens and not matching:flags.append("WORK_TITLE_UNDETECTED_IN_OCR_FRONT")
   source=e.get("sourceIdentifierS3")
   if source and d.get("identificadorIA") and d.get("identificadorIA")!=source:
    flags.append("ARCHIVE_SOURCE_IDENTIFIER_MISMATCH")
   # Identificadores fuertemente contradictorios; la ficha queda en cuarentena.
   if eid in ("justino-trogo-es","historia-augusta","juliano-obras"):
    flags.append("ARCHIVE_SOURCE_IDENTITY_REQUIRES_PRIMARY_VERIFICATION")
   out["quarantined"].append({"id":eid,"candidateWork":e.get("candidateWork"),"sourceIdentifier":source,
    "ocrPages":len(pages),"titleTokensFound":matching,"flags":flags,
    "status":"quarantined_not_cleared","completeTextCertified":False})
  except Exception as exc:
   out["quarantined"].append({"id":eid,"status":"could_not_inspect",
     "reason":type(exc).__name__+": "+str(exc)[:250],"completeTextCertified":False})
 out["counts"]={"externalSources":len(out["external"]),
   "externalSuccessfulReads":sum(x["status"]!="could_not_inspect" for x in out["external"]),
   "externalNeedsReview":sum(x["status"]=="review" for x in out["external"]),
   "uncataloguedR2Sources":len(out["quarantined"]),
   "uncataloguedOCRRead":sum(x["status"]!="could_not_inspect" for x in out["quarantined"])}
 RESULT.parent.mkdir(parents=True,exist_ok=True)
 RESULT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps(out["counts"],ensure_ascii=False))
if __name__=="__main__":main()
