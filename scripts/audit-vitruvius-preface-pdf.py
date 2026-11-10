#!/usr/bin/env python3
"""PDF source-layer review of Latin preface exceptions; read-only."""
import json, pathlib, subprocess, re, unicodedata
R=pathlib.Path(__file__).resolve().parents[1]
corpora={k:{p["locus"]:p for p in json.loads((R/v).read_text())["passages"]} for k,v in {"es":"data/structured/recensio-es.json","en":"data/structured/theory-en.json"}.items()}
pdfs={"es":"documents/kurilo-recensio-es.pdf","en":"documents/kurilo-theory-en.pdf"}
def tok(s):
 s=unicodedata.normalize("NFD",str(s or "")).lower()
 s="".join(c for c in s if unicodedata.category(c)!="Mn")
 return re.findall(r"[^\W_]+",s.replace("v","u").replace("j","i"))
def overlap(needle,hay,n=4):
 a=[tuple(needle[i:i+n]) for i in range(max(0,len(needle)-n+1))]
 b={tuple(hay[i:i+n]) for i in range(max(0,len(hay)-n+1))}
 return sum(x in b for x in a),len(a)
rows=[]
for locus in ("2.praef.5","7.praef.12","7.praef.13","8.praef.4","9.praef.3"):
 es=tok(corpora["es"][locus]["latin"]);en=tok(corpora["en"][locus]["latin"])
 if locus=="8.praef.4" or locus=="9.praef.3":words=es[len(en):]
 elif locus.startswith("7.praef."):words=tok("quibus vero felicitas maximum summumque contulit munus")
 else:words=es[40:75]
 row={"locus":locus,"selectedWords":len(words),"pdfs":{}}
 for language in ("es","en"):
  doc=corpora[language][locus]
  page=(doc.get("pdf_pages") or {}).get("latin")
  out={"pdf":pdfs[language],"pageHint":page}
  try:
   start,end=max(1,page-2),page+2
   binary=subprocess.check_output(["pdftotext","-f",str(start),"-l",str(end),"-layout",str(R/pdfs[language]),"-"],stderr=subprocess.STDOUT,timeout=90)
   text=binary.decode("utf8",errors="replace")
   a,b=overlap(words,tok(text))
   out.update({"checkedPages":[start,end],"matching4Grams":a,"available4Grams":b,"status":"EXTRACTED"})
  except Exception as e:out["status"]="UNVERIFIED";out["error"]=str(e)[:170]
  row["pdfs"][language]=out
 rows.append(row)
out={"schema":"vitruvius-english-preface-pdf-proof-v1","method":"pdftotext on ±2 hinted pages of published PDFs, 4-word token overlap; source HTML/JSON vs PDF not presumed identical. OCR/image collation still requires separate review.","records":rows,"mutations":"none"}
(R/"reports").mkdir(exist_ok=True)
(R/"reports/prefaces-pdf-evidence.json").write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
for row in rows:
 print(row["locus"],"ES",row["pdfs"]["es"].get("matching4Grams"),"EN",row["pdfs"]["en"].get("matching4Grams"),"of",row["pdfs"]["es"].get("available4Grams"))
print("PDFs unchanged. JSON evidence generated.")
