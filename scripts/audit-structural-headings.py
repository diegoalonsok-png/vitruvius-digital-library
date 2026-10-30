#!/usr/bin/env python3
"""Audit born-digital Vitruvian chapter markers; do not guess canonical loci."""
import json,re,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
out={"schema":1,"method":"Directly observed book/chapter/section headings; candidate anchors only","editions":{}}
patterns={
 "book":re.compile(r"(?im)^\s*(?:LIBER|LIVRE|BOOK|LIBRO)\s+([IVX]{1,5}|10|[1-9])\b"),
 "chapter":re.compile(r"(?im)^\s*(?:CAPUT|CHAPITRE|CHAPTER|CAPÍTULO|CAPITOLO)\s+([IVX]{1,5}|\d{1,2}|PRIMUM|SECUNDUM|TERTIUM|QUARTUM|QUINTUM)\b"),
 "locus":re.compile(r"(?m)^\s*([IVX]{1,5}|10|[1-9])\s*[.·]\s*(\d{1,2})\s*[.·]\s*(\d{1,3})\b")
}
for edition in ("recensio-es","recensio-fr","theory-en"):
 path=root/"data/text"/(edition+".json")
 if not path.exists():continue
 pages=json.loads(path.read_text(encoding="utf-8"))
 found=[]
 for p in pages:
  txt=p["text"]
  for kind,rx in patterns.items():
   for m in rx.finditer(txt):
    found.append({"kind":kind,"value":m.group(0).strip()[:100],"page":p["page"],"context":txt[max(0,m.start()-45):m.end()+75].replace("\n"," ")})
 out["editions"][edition]=found
 print(edition, "heading candidates",len(found))
dest=root/"data/vitruvian-structural-audit.json"
dest.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
