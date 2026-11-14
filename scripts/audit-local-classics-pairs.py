#!/usr/bin/env python3
"""Read-only comparison of GitHub's classic-book DOCX/PDF pairs.
Agreement proves both files have similar text, not that attribution is correct.
"""
import json,re,hashlib,pathlib,zipfile,unicodedata
from collections import Counter
from datetime import datetime,timezone
from xml.etree import ElementTree
ROOT=pathlib.Path(__file__).resolve().parents[1]
DOCS=ROOT/"documents/clasicos"
def fold(x):
 s=unicodedata.normalize("NFKD",str(x or "").casefold())
 return "".join(c for c in s if not unicodedata.combining(c))
def terms(text):
 return re.findall(r"[\w\u0370-\u03ff\u1f00-\u1fff]{4,}",fold(text),re.U)
def shingles(text):
 words=terms(text)
 return set(tuple(words[i:i+5]) for i in range(max(0,len(words)-4)))
def digest(path):
 h=hashlib.sha256()
 with path.open("rb") as stream:
  for b in iter(lambda:stream.read(262144),b""):h.update(b)
 return h.hexdigest()
def docx(path):
 with zipfile.ZipFile(path) as z:
  root=ElementTree.fromstring(z.read("word/document.xml"))
  text=" ".join(x.text or "" for x in root.iter() if x.tag.endswith("}t"))
  metadata={}
  if "docProps/core.xml" in z.namelist():
   root=ElementTree.fromstring(z.read("docProps/core.xml"))
   metadata={x.tag.split("}")[-1]:x.text for x in root.iter() if x.text and x.tag.split("}")[-1] in ("title","creator")}
 return text,metadata
def pdf(path):
 import fitz
 with fitz.open(path) as d:
  if not d.is_pdf or d.needs_pass:raise ValueError("Unavailable PDF")
  return "\n".join(page.get_text("text") for page in d),len(d),d.metadata or {}
def compare(path):
 alt=path.with_suffix(".pdf")
 out={"stem":path.stem,"docx":str(path.relative_to(ROOT)),"pdf":str(alt.relative_to(ROOT)),"docxSHA256":digest(path)}
 if not alt.exists():return {**out,"status":"missing_pdf_companion"}
 out["pdfSHA256"]=digest(alt)
 a,md=docx(path)
 b,n,mp=pdf(alt)
 out.update({"docxCharacters":len(a),"pdfExtractedCharacters":len(b),"pdfPages":n,
             "docxMetadata":md,"pdfMetadata":{k:mp.get(k) for k in ("title","author")}})
 sa,sb=shingles(a),shingles(b)
 overlap=len(sa&sb)/max(1,min(len(sa),len(sb)))
 # Two exports may have different line breaking, but low shingle overlap
 # requires human checking of the title and file bodies.
 out["fiveWordShingleOverlap"]=round(overlap,4)
 out["status"]="no_readable_text" if len(b)<300 or len(a)<300 else ("text_discrepancy" if overlap<0.35 else "manual_review_needed" if overlap<0.70 else "text_consistent_NOT_edition_verified")
 out["titleCheck"]="Filename is NOT considered evidence of actual author/title; human cover and introduction review required."
 return out
def main():
 records=[]
 for f in sorted(DOCS.glob("*.docx")):
  try:records.append(compare(f))
  except Exception as e:records.append({"stem":f.stem,"status":"could_not_inspect","reason":type(e).__name__+": "+str(e)[:250]})
 out={"schema":"vdl-paired-classics-content-audit-v1","createdAt":datetime.now(timezone.utc).isoformat(),
      "method":"Extract native DOCX and PDF text, compare five-word sequences; metadata is descriptive only.",
      "safety":"READ ONLY; no original or file in GitHub/R2 is modified or deleted",
      "counts":dict(Counter(x["status"] for x in records)),"records":records}
 path=ROOT/"reports/document-interiors/docx-pdf-pairs.json"
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print(json.dumps({"pairs":len(records),"counts":out["counts"]},ensure_ascii=False))
if __name__=="__main__":main()
