#!/usr/bin/env python3
"""Read-only content-vs-catalogue audit for PDF and DOCX books.
PDF page count, SHA256, opening text, edition, volume. Ambiguous cases remain unverified.
"""
import argparse, hashlib, json, pathlib, re, tempfile, unicodedata, zipfile
from collections import Counter
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from xml.etree import ElementTree
ROOT=pathlib.Path(__file__).resolve().parents[1]
MAX_BYTES=85*1024*1024
def fold(x):
 s=unicodedata.normalize("NFKD",str(x or "").casefold())
 return "".join(ch for ch in s if not unicodedata.combining(ch))
def download(url,target):
 if not url.startswith("https://"):raise ValueError("Only HTTPS is permitted")
 sha=hashlib.sha256();length=0
 req=Request(url,headers={"User-Agent":"Vitruvius-Book-Identity-Audit/1.0"})
 with urlopen(req,timeout=45) as resp,open(target,"wb") as out:
  declared=resp.headers.get("Content-Length")
  if declared and int(declared)>MAX_BYTES:raise ValueError("Oversized PDF")
  while True:
   chunk=resp.read(262144)
   if not chunk:break
   length+=len(chunk)
   if length>MAX_BYTES:raise ValueError("Exceeded safe size")
   sha.update(chunk);out.write(chunk)
 return sha.hexdigest(),length
def pdf_read(path):
 import fitz
 with fitz.open(path) as doc:
  if not doc.is_pdf or doc.needs_pass:raise ValueError("Unreadable PDF")
  pages=len(doc);positions=sorted(set(range(min(16,pages)))|set(range(max(0,pages-2),pages)))
  parts=[{"page":i+1,"text":doc[i].get_text("text").strip()} for i in positions]
  return pages,parts,doc.metadata or {}
def docx_read(path):
 with zipfile.ZipFile(path) as z:
  if "word/document.xml" not in z.namelist():raise ValueError("Invalid DOCX")
  xml=ElementTree.fromstring(z.read("word/document.xml"))
  value=" ".join(x.text or "" for x in xml.iter() if x.tag.endswith("}t"))
  meta={}
  if "docProps/core.xml" in z.namelist():
   props=ElementTree.fromstring(z.read("docProps/core.xml"))
   meta={x.tag.split("}")[-1]:x.text for x in props.iter() if x.text and x.tag.split("}")[-1] in ("title","creator")}
  return None,[{"page":None,"text":value[:20000]}],meta
def inspect(item,local_dir):
 suffix=".docx" if item.get("pdf","").lower().endswith(".docx") else ".pdf"
 with tempfile.TemporaryDirectory() as folder:
  local=pathlib.Path(local_dir,item["id"]+suffix) if local_dir else None
  target=local if local and local.is_file() else pathlib.Path(folder,"book"+suffix)
  if target.parent==pathlib.Path(folder):sha,nbytes=download(item["pdf"],target)
  else:
   sha256=hashlib.sha256()
   with open(target,"rb") as file:
    for chunk in iter(lambda:file.read(262144),b""):sha256.update(chunk)
   sha,nbytes=sha256.hexdigest(),target.stat().st_size
  pages,parts,metadata=docx_read(target) if suffix==".docx" else pdf_read(target)
  sample=fold(" ".join(x["text"] for x in parts if x["page"] is None or x["page"]<=12))
  words=[x for x in re.findall("[a-z]{5,}",fold(item.get("tituloEdicion"))) if x not in ("volume","translation","translated","edition","books","greek","latin","english","opera","libri")]
  found=list(dict.fromkeys(x for x in words if x in sample))[:12]
  flags=[]
  if item.get("sha256") and sha!=item["sha256"]:flags.append("SHA256_MISMATCH")
  if item.get("bytes") and nbytes!=item["bytes"]:flags.append("BYTES_MISMATCH")
  if pages is not None and isinstance(item.get("paginas"),int) and pages!=item["paginas"]:flags.append("PAGE_COUNT_MISMATCH")
  volume=fold(item.get("volumen"))
  printed=re.findall(r"\\b(?:volume|vol\\.?|tomo|tomus|tome)\\s*(?:no\\.?\\s*)?([ivxlcdm]+|\\d{1,2})\\b",sample[:10000])
  if volume and printed and volume not in printed:flags.append("PRINTED_VOLUME_NEEDS_REVIEW")
  if sum(len(x["text"]) for x in parts)<150:flags.append("NO_EXTRACTABLE_FRONT_TEXT")
  elif words and not found:flags.append("TITLE_NOT_DETECTED_IN_SAMPLE")
  if item.get("incidenciaCatalografica"):flags.append("EXISTING_CATALOGUE_WARNING")
  return {"id":item["id"],"declaredAuthor":item.get("autor"),"declaredTitle":item.get("tituloEdicion"),
          "declaredVolume":item.get("volumen"),"declaredTranslator":item.get("traductor"),
          "source":item.get("pdf"),"archiveRecord":item.get("fuente"),
          "observed":{"pages":pages,"sha256":sha,"bytes":nbytes,"metadata":metadata,
                      "openingTextLength":sum(len(x["text"]) for x in parts),"matchingTitleTerms":found,
                      "printedVolumeCandidates":list(dict.fromkeys(printed))[:6]},
          "flags":flags,"catalogueWarning":item.get("incidenciaCatalografica"),
          "status":"binary_discrepancy" if any(x in flags for x in ("SHA256_MISMATCH","BYTES_MISMATCH","PAGE_COUNT_MISMATCH")) else "manual_review_needed" if flags else "consistent_metadata_NOT_certified_edition"}
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--start",type=int,default=0);parser.add_argument("--limit",type=int,default=12)
 parser.add_argument("--catalog",default=str(ROOT/"data/r2/catalogo-clasicos-r2.json"))
 parser.add_argument("--local-dir");parser.add_argument("--output",default="reports/document-interiors/latest.json")
 opts=parser.parse_args()
 if opts.start<0 or not 1<=opts.limit<=30:parser.error("start must be >=0 and limit 1..30")
 items=json.loads(pathlib.Path(opts.catalog).read_text(encoding="utf8"))["items"]
 results=[]
 for item in items[opts.start:opts.start+opts.limit]:
  try:results.append(inspect(item,opts.local_dir))
  except Exception as exc:results.append({"id":item["id"],"source":item.get("pdf"),"status":"could_not_inspect","reason":type(exc).__name__+": "+str(exc)[:300]})
 result={"schema":"vdl-content-identity-audit-v1","createdAt":datetime.now(timezone.utc).isoformat(),
         "scope":{"start":opts.start,"limit":opts.limit,"total":len(items)},
         "method":"SHA256 + actual page count + sampled PDF text or OOXML text. Matching title words do not certify edition or full-text contents.",
         "safety":"READ ONLY: never delete, edit, replace, rename, or upload original books, codices or folios",
         "results":results}
 output=pathlib.Path(opts.output);output.parent.mkdir(parents=True,exist_ok=True)
 output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\\n",encoding="utf8")
 print(json.dumps({"results":dict(Counter(x["status"] for x in results)),"output":str(output)},ensure_ascii=False))
if __name__=="__main__":main()
