#!/usr/bin/env python3
"""ALTO 3.x e-rara OCR to PDF-page concordance. One PDF cover page precedes ALTO."""
import argparse,json,xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("input");p.add_argument("output");p.add_argument("--offset",type=int,default=1)
args=p.parse_args()
namespace="{http://www.loc.gov/standards/alto/ns-v3#}"
rows=[]
for _,elem in ET.iterparse(args.input,events=("end",)):
 if elem.tag==namespace+"Page":
  physical=int(elem.attrib.get("PHYSICAL_IMG_NR",len(rows)+1))
  lines=[]
  for line in elem.iter(namespace+"TextLine"):
   words=[w.attrib.get("CONTENT","") for w in line.iter(namespace+"String")]
   if words:lines.append(" ".join(words))
  rows.append({"page":physical+args.offset,"text":"\n".join(lines)})
  elem.clear()
if len(rows)<200:raise SystemExit("ALTO incomplete: "+str(len(rows))+" pages")
if len(set(r["page"] for r in rows))!=len(rows):raise SystemExit("Duplicate PDF page numbers")
target=Path(args.output);target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(rows,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("OCR pages:",len(rows),"PDF page span:",rows[0]["page"],rows[-1]["page"],"characters:",sum(map(lambda r:len(r["text"]),rows)))
