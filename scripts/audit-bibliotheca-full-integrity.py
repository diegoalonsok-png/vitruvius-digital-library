#!/usr/bin/env python3
"""Auditoría documental no destructiva: obra / edición / texto / OCR.

Las coincidencias automáticas jamás certifican la identidad filológica,
la completitud de la edición o un cotejo autóptico. No modifica los corpus.
Ejemplos:
 python scripts/audit-bibliotheca-full-integrity.py --mode inventory
 python scripts/audit-bibliotheca-full-integrity.py --mode texts
 python scripts/audit-bibliotheca-full-integrity.py --mode ocr --start 0 --limit 30
"""
import argparse
import collections
import datetime as dt
import hashlib
import json
import pathlib
import re
import unicodedata
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
MAX_REMOTE_BYTES=32_000_000
R2_HOST="libros.vitruvius-digital-library.org"
# Solo libros cuya extensión en libros o cantos está explícitamente documentada.
EXPECTED_BOOKS={
 "homer-iliad":24,"homer-odyssey":24,
 "virgil-aeneid":12,"virgil-georgica":4,
 "caesar-gallico":8,"caesar-civili":3,
 "herodotus-historiae":9,"thucydides-war":8,
}
MODERN_VITRUVIUS={"vitruvio-v514-pdf","vitruvio-v554-pdf","theory-v297-pdf"}
HIGH_RISK_UNCATALOGUED={
 "historia-augusta":"Identificador fuente S3 no acredita la Historia Augusta",
 "juliano-obras":"Identificador fuente S3 no acredita obras de Juliano",
 "justino-trogo-es":"Identificador fuente alude a la Apología de san Justino, no a Trogo",
}
def read(path):
 return json.loads((ROOT/path).read_text(encoding="utf-8"))
def get_json(url):
 p=urlparse(url)
 if p.scheme!="https" or p.hostname!=R2_HOST or not p.path.startswith(("/corpus/","/clasicos/texto/")):
  raise ValueError("URL remota fuera de la lista autorizada")
 req=Request(url,headers={"User-Agent":"VitruviusFullBibliothecaAudit/1.0"})
 with urlopen(req,timeout=45) as response:
  length=0;out=[]
  while True:
   part=response.read(262144)
   if not part:break
   length+=len(part)
   if length>MAX_REMOTE_BYTES:raise ValueError("JSON remoto excede límite de inspección")
   out.append(part)
 return json.loads(b"".join(out))
def fold(value):
 s=unicodedata.normalize("NFKD",str(value or "").lower())
 return "".join(ch for ch in s if not unicodedata.combining(ch))
def meaningful(value):
 return {w for w in re.findall(r"[a-zα-ω]{5,}",fold(value)) if w not in
  {"opera","omnia","volumen","volume","livre","libri","liber","latin","greek","griech",
   "english","translation","edition","printed","the","with","books","historia","obras","fragmenta"}}
def excerpt_matches(title,text):
 words=meaningful(title)
 if not words:return {"matched":[],"tokens":[]}
 sample=fold(text)
 return {"matched":sorted(w for w in words if w in sample)[:16],
         "tokens":sorted(words)[:16]}
def load_catalogues():
 main=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json")["works"]
 editions=read("data/r2/catalogo-clasicos-r2.json")["items"]
 links=read("data/r2/vinculos-repertorio.json")
 registry=read("data/classics-corpus/search-registry.json")["entries"]
 external=read("data/classics-corpus/external-index-reconciliation.json")["remoteEntries"]
 ocr=read("data/r2/bibliotheca-ocr-coverage.json")
 orphans=read("data/r2/r2-orphan-reconciliation.json")
 return main,editions,links,registry,external,ocr,orphans
def collect_inventory():
 main,editions,links,registry,external,ocr,orphans=load_catalogues()
 main_by_id={w["id"]:w for w in main}
 edition_by_id={e["id"]:e for e in editions}
 extra=links.get("obrasNuevas",[])
 extra_ids={x["r2"] for x in extra}
 mapped=links.get("mapa",{})
 by_work=collections.defaultdict(list)
 problems=[]
 if len(main_by_id)!=len(main):problems.append({"code":"DUPLICATE_MAIN_ID"})
 if len(edition_by_id)!=len(editions):problems.append({"code":"DUPLICATE_EDITION_ID"})
 if len(extra_ids)!=len(extra) or extra_ids & set(main_by_id):problems.append({"code":"EXTRA_ID_COLLISION"})
 for edition in editions:
  eid=edition["id"]
  relations=mapped.get(eid,[])
  if not relations and eid in main_by_id:relations=[eid]
  if not relations and edition.get("traduccionDe") in main_by_id:relations=[edition["traduccionDe"]]
  for wid in relations:
   if wid not in main_by_id:problems.append({"code":"RELATION_UNKNOWN_WORK","edition":eid,"work":wid})
   else:by_work[wid].append(eid)
  if not relations and eid not in extra_ids:
   problems.append({"code":"UNLINKED_EDITION","edition":eid})
 reg_by_work=collections.defaultdict(list)
 for e in registry:reg_by_work[e["workId"]].append(e)
 ext_by_work=collections.defaultdict(list)
 for e in external:ext_by_work[e["workId"]].append(e)
 ocr_by_work={x["id"]:x for x in ocr.get("ocrSearchableWithoutTranscription",[])}
 edition_hashes=collections.defaultdict(list)
 for e in editions:
  if e.get("sha256"):edition_hashes[e["sha256"]].append(e["id"])
 duplicated_volumes=[{"sha256":sha,"editionIds":ids,"interpretation":"un único archivo compartido: localizar sección por obra; no contabilizar archivos como libros distintos"} for sha,ids in edition_hashes.items() if len(ids)>1]
 for x in duplicated_volumes:problems.append({"code":"SHARED_PDF_MULTIPLE_EDITION_RECORDS","editions":x["editionIds"]})
 results=[]
 for w in main:
  wid=w["id"];reg=reg_by_work[wid];external_rows=ext_by_work[wid]
  pdf_ids=by_work[wid]
  by_ocr=wid in ocr_by_work
  own_original=any(e.get("language")==w.get("language") for e in reg)
  if not reg and not external_rows and not by_ocr and wid not in MODERN_VITRUVIUS:
   state="no_registered_content"
  elif own_original or external_rows:state="registered_transcript"
  elif by_ocr:state="ocr_only"
  elif wid in MODERN_VITRUVIUS:state="modern_edition_link_to_vitruvius"
  else:state="no_original_text_registered"
  notes=[]
  if not own_original and not external_rows and wid not in MODERN_VITRUVIUS:
   notes.append("original griego/latino sin transcripción propia en registro principal ni externo")
  if len(pdf_ids)>1:notes.append("varias ediciones vinculadas: cotejar alcance de cada una")
  results.append({"id":wid,"author":w.get("author"),"title":w.get("title"),"language":w.get("language"),
   "catalogueStatus":w.get("publicStatus"),"indexStatus":state,"localOrR2TextVersions":len(reg),
   "externalOriginalVersions":len(external_rows),"r2EditionIds":pdf_ids,
   "ocrIndexed":by_ocr,"manuscriptWitnessCount":len(w.get("witnessRecords") or []),
   "notes":notes,"identityAndCompletenessCertified":False})
 for x in extra:
  eid=x["r2"];edition=edition_by_id.get(eid,{})
  results.append({"id":eid,"catalogue":"r2-additional","author":edition.get("autor") or x.get("autor"),
   "title":edition.get("obra") or x.get("titulo"),"r2EditionIds":[eid],
   "indexStatus":"ocr_facsimile_only","identityAndCompletenessCertified":False})
 orphan_rows=orphans.get("records",[])
 if isinstance(orphan_rows,dict):orphan_rows=orphan_rows.get("sample",[])
 quarantined=[]
 for x in orphan_rows:
  note=HIGH_RISK_UNCATALOGUED.get(x["id"])
  if note:problems.append({"code":"HIGH_RISK_SOURCE_IDENTITY","id":x["id"],"reason":note})
  quarantined.append({"id":x["id"],"sourceIdentifier":x.get("sourceIdentifierS3"),
    "candidateWork":x.get("candidateWork"),"registeredInCatalogue":False,
    "status":"quarantine_pending_pdf_title_and_contents_review","warning":note})
 stats={"mainCatalogueWorks":len(main),"additionalR2WorkRecords":len(extra),"declaredUniqueWorks":len(results),
  "shortfallAgainst300UnverifiedTarget":max(0,300-len(results)),"r2EditionRecords":len(editions),
  "registeredTextVersions":len(registry),"registeredTextWorkIds":sum(bool(v) for v in reg_by_work.values()),
  "externalIndexedOriginalWorkIds":sum(bool(v) for v in ext_by_work.values()),"quarantinedR2UncataloguedPDFs":len(quarantined),
  "worksWithoutAnySearchableSource":sum(x["indexStatus"]=="no_registered_content" for x in results),
  "identityAndCompletenessCertified":0}
 return {"schema":"vdl-bibliotheca-complete-content-audit-v1","mode":"inventory",
  "limitations":"Documento de conciliación, NO cotejo de todas las páginas ni certificación de integridad. Las 300 obras son una meta solicitada, no un inventario constatado.",
  "counts":stats,"records":results,"sharedPhysicalFiles":duplicated_volumes,
  "quarantine":quarantined,"problems":problems}
def parse_book_prefix(locus):
 m=re.match(r"^(?:lib(?:er)?|book|bk|canto)\s*([1-9]\d?)(?:[.:\s-]|$)",str(locus),re.I)
 if not m:m=re.match(r"^([1-9]\d?)[.:](?:\d+|pr|pref)",str(locus),re.I)
 return int(m.group(1)) if m else None
def inspect_registry(start,limit):
 main,_,_,registry,_,_,_=load_catalogues()
 names={w["id"]:w for w in main}
 selected=registry[start:start+limit] if limit else registry[start:]
 rows=[]
 for e in selected:
  status="not_inspected";flags=[];count=0;chars=0;kind=e.get("format")
  path=e["path"];file_path=ROOT/path
  try:
   if path.startswith("https://"):obj=get_json(path)
   else:
    if not file_path.is_file():raise FileNotFoundError(path)
    if kind=="html-text":
     raw=file_path.read_text(encoding="utf-8")
     if len(raw)<350:flags.append("HTML_WITHOUT_SUFFICIENT_CONTENT")
     rows.append({"workId":e["workId"],"language":e["language"],"path":path,"format":kind,
        "status":"html_present_requires_textual_collation" if not flags else "manual_review",
        "byteLength":len(raw.encode("utf-8")),"flags":flags,
        "identityAndCompletenessCertified":False});continue
    obj=json.loads(file_path.read_text(encoding="utf-8"))
   if kind=="structured-bilingual":
    passages=obj.get("passages") if isinstance(obj,dict) else None
    if not isinstance(passages,list):raise ValueError("structured edition without passages")
    for x in passages:
     field="latin" if e["language"]=="la" else "translation"
     if not str(x.get("locus") or "").strip() or not str(x.get(field) or "").strip():flags.append("EMPTY_STRUCTURED_LOCUS_OR_LANGUAGE");break
    count=len(passages);chars=sum(len(str(x.get("latin" if e["language"]=="la" else "translation") or "")) for x in passages)
   elif kind=="historical-ocr-pages":
    if not isinstance(obj,list):flags.append("INVALID_HISTORICAL_OCR")
    else:count=len(obj);chars=sum(len(str(x.get("text") or "")) for x in obj if isinstance(x,dict))
   else:
    if not isinstance(obj,dict):raise ValueError("JSON root not object")
    expected=e.get("sourceWorkId") or e["workId"]
    if obj.get("workId")!=expected:flags.append("WORK_ID_CONTENT_CONFLICT")
    if obj.get("language")!=e["language"]:flags.append("LANGUAGE_CONTENT_CONFLICT")
    passages=obj.get("passages")
    if not isinstance(passages,list):raise ValueError("JSON without passages")
    count=len(passages);book_nums=set();locus_occurrences=collections.defaultdict(list);segmented_loci=0
    for position,p in enumerate(passages):
     if not isinstance(p,dict) or not isinstance(p.get("text"),str) or not p["text"].strip() or not str(p.get("locus") or "").strip():
      flags.append("EMPTY_OR_MALFORMED_PASSAGE");break
     locus=str(p["locus"])
     locus_occurrences[locus].append((position,p["text"]))
     v=parse_book_prefix(locus)
     if v is not None:book_nums.add(v)
    for locus,segments in locus_occurrences.items():
     if len(segments)<2:continue
     positions=[pos for pos,_ in segments]
     contents=[body for _,body in segments]
     if all(b==a+1 for a,b in zip(positions,positions[1:])) and len(set(contents))==len(contents):
      segmented_loci+=1
     else:
      flags.append("NONCONTIGUOUS_OR_IDENTICAL_LOCUS_REUSE")
    chars=sum(len(p.get("text","")) for p in passages if isinstance(p,dict) and isinstance(p.get("text"),str))
    known=names.get(e["workId"],{})
    source_title=obj.get("title") or obj.get("sourceTitle") or ""
    # Indicio, nunca constatación de título falso: variantes y traducciones existen.
    title_variants=[known.get("title"),*(known.get("aliases") or [])]
    checks=[excerpt_matches(v,source_title) for v in title_variants if isinstance(v,str) and v.strip()]
    if source_title and checks and any(c["tokens"] for c in checks) and not any(c["matched"] for c in checks):
     flags.append("CATALOGUE_SOURCE_TITLE_NEEDS_COMPARISON")
    expected_parts=EXPECTED_BOOKS.get(e["workId"])
    if expected_parts and book_nums and len(book_nums)>=2:
     missing=[k for k in range(1,expected_parts+1) if k not in book_nums]
     if missing:flags.append("BOOK_NUMBERS_NOT_DETECTED_REVIEW")
    else:missing=[]
    if not expected_parts:missing=[]
   if count==0 or chars<350:flags.append("NO_SUBSTANTIVE_TEXT")
   status="needs_review" if flags else "structurally_readable_not_philologically_verified"
   extra={"segmentedLocusGroups":segmented_loci if kind not in ("structured-bilingual","historical-ocr-pages") else 0,
          "sourceTitle":obj.get("title") or obj.get("sourceTitle") if isinstance(obj,dict) else None,
          "bookNumbersDetected":sorted(book_nums) if kind not in ("structured-bilingual","historical-ocr-pages") else [],
          "candidateMissingBooks":missing if kind not in ("structured-bilingual","historical-ocr-pages") else []}
   rows.append({"workId":e["workId"],"language":e["language"],"path":path,"format":kind,
     "status":status,"passageCount":count,"characters":chars,"flags":sorted(set(flags)),
     "identityAndCompletenessCertified":False,**extra})
  except Exception as exc:
   rows.append({"workId":e["workId"],"language":e["language"],"path":path,"format":kind,
     "status":"could_not_inspect","reason":type(exc).__name__+": "+str(exc)[:220],
     "identityAndCompletenessCertified":False})
 return {"schema":"vdl-bibliotheca-complete-content-audit-v1","mode":"texts",
  "method":"Abrir cada original/traducción registrado, comprobar identificación de obra y lengua, integridad de pasajes y loci. Un locus puede distribuirse en fragmentos consecutivos distintos: no se declara duplicación textual por la misma etiqueta. Las partes faltantes se consideran hipótesis si la numeración digital lo permite.",
  "limits":"Ni la validación JSON ni los números de libros prueban edición íntegra, fidelidad manuscrita o cotejo editorial. Traducciones sin correspondencia por locus permanecen separadas.",
  "scope":{"start":start,"limit":len(selected),"total":len(registry)},
  "counts":dict(collections.Counter(x["status"] for x in rows)),"results":rows}
def inspect_ocr(start,limit):
 _,editions,_,_,_,_,_=load_catalogues()
 selected=editions[start:start+limit]
 rows=[]
 greek=re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")
 for e in selected:
  flags=[]
  try:
   obj=get_json(e["texto"])
   if not isinstance(obj,dict) or not isinstance(obj.get("paginas"),list):raise ValueError("OCR no contiene páginas")
   pages=obj["paginas"]
   if obj.get("obra")!=e["id"]:flags.append("OCR_EDITION_ID_MISMATCH")
   if e.get("paginas")!=len(pages):flags.append("OCR_PAGE_COUNT_MISMATCH")
   if any(not isinstance(p,str) for p in pages):flags.append("OCR_PAGE_NOT_TEXT")
   front=" ".join(pages[:min(18,len(pages))])
   match=excerpt_matches(e.get("tituloEdicion"),front)
   if len(match["tokens"])>=2 and not match["matched"]:
    flags.append("PRINTED_TITLE_UNDETECTED_IN_OCR_FRONT")
   matched_author=excerpt_matches(e.get("autor"),front)
   if matched_author["tokens"] and not matched_author["matched"]:
    flags.append("AUTHOR_UNDETECTED_IN_OCR_FRONT")
   greek_pages=sum(bool(greek.search(p)) for p in pages)
   if e.get("lengua")=="grc" and greek_pages==0:
    flags.append("ORIGINAL_GREEK_NOT_DETECTED_IN_OCR")
   all_text_chars=sum(len(p.strip()) for p in pages)
   if all_text_chars<400:flags.append("OCR_LACKS_SUBSTANTIVE_TEXT")
   if e.get("notaFilologica") or e.get("incidenciaCatalografica"):
    flags.append("CATALOGUE_QUALIFICATION_NEEDS_HUMAN_REVIEW")
   rows.append({"editionId":e["id"],"declaredWork":e.get("obra"),"editionTitle":e.get("tituloEdicion"),
    "source":e.get("fuente"),"ocrPages":len(pages),"declaredPdfPages":e.get("paginas"),
    "ocrCharacters":all_text_chars,"greekScriptPages":greek_pages,
    "titleTokensFound":match["matched"],"authorTokensFound":matched_author["matched"],
    "status":"review_indicators" if flags else "ocr_metadata_consistent_not_full_edition_certified",
    "flags":flags,"identityAndCompletenessCertified":False})
  except Exception as exc:
   rows.append({"editionId":e["id"],"status":"could_not_inspect","reason":type(exc).__name__+": "+str(exc)[:220],
     "identityAndCompletenessCertified":False})
 return {"schema":"vdl-bibliotheca-complete-content-audit-v1","mode":"ocr",
  "scope":{"start":start,"limit":len(selected),"total":len(editions)},
  "method":"Lectura íntegra de las páginas OCR disponibles por edición. Prueba la correspondencia de objeto y páginas y busca indicios de autor/título/idioma; NO certifica identidad ni completitud.",
  "counts":dict(collections.Counter(x["status"] for x in rows)),"results":rows}
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--mode",required=True,choices=("inventory","texts","ocr"))
 p.add_argument("--start",type=int,default=0)
 p.add_argument("--limit",type=int,default=0)
 p.add_argument("--output",default=None)
 a=p.parse_args()
 if a.start<0 or a.limit<0: p.error("start and limit must be nonnegative")
 report={"inventory":collect_inventory,"texts":lambda:inspect_registry(a.start,a.limit),
  "ocr":lambda:inspect_ocr(a.start,a.limit)}[a.mode]()
 report["generatedAt"]=dt.datetime.now(dt.timezone.utc).isoformat()
 report["readOnly"]=True
 output=pathlib.Path(a.output or f"reports/bibliotheca/full-integrity-{a.mode}-{a.start}.json")
 output.parent.mkdir(parents=True,exist_ok=True)
 output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({"mode":a.mode,"output":str(output),"counts":report["counts"]},ensure_ascii=False))
if __name__=="__main__":main()
