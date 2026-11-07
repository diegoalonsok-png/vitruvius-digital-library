#!/usr/bin/env python3
"""Make conservative editorial navigation links from existing classical JSON passages.

Exact matching locus IDs mean shared editorial labels, NOT semantic proof.
When labels differ, only an optional shared book is reported. Never drop text.
"""
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REG=ROOT/"data/classics-corpus/search-registry.json"
OUT=ROOT/"data/classics-alignment"

def locus(x):
    return re.sub(r"\s+", "", str(x or "").lower()).strip()

def book(x):
    m=re.match(r"^(\d+)[.:-]\d+", locus(x))
    return m.group(1) if m else None

def build():
    registry=json.loads(REG.read_text(encoding="utf8"))
    grouped={}
    for e in registry["entries"]:
        if e["format"]!="json-passages": continue
        grouped.setdefault(e["workId"], {})[e["language"]]=e
    OUT.mkdir(parents=True,exist_ok=True)
    report=[]
    for work,langs in sorted(grouped.items()):
        for original in ("grc","la"):
            if original not in langs:continue
            for translation in ("en","es","fr"):
                if translation not in langs:continue
                a=json.loads((ROOT/langs[original]["path"]).read_text(encoding="utf8"))["passages"]
                b=json.loads((ROOT/langs[translation]["path"]).read_text(encoding="utf8"))["passages"]
                targets={}
                for i,p in enumerate(b):
                    key=locus(p.get("locus"))
                    if key: targets.setdefault(key,[]).append(i)
                direct=[]
                for i,p in enumerate(a):
                    key=locus(p.get("locus"))
                    hits=targets.get(key,[])
                    if len(hits)==1:
                        direct.append({"sourceIndex":i,"targetIndex":hits[0],"locus":p["locus"],"grade":"shared-editorial-locus"})
                output={"schema":"vitruvia-classics-navigation-v1","workId":work,
                        "original":original,"translation":translation,
                        "sourcePassages":len(a),"translationPassages":len(b),
                        "correspondences":direct,
                        "unalignedSourcePassages":len(a)-len(direct),
                        "status":"Only identical, unique editorial locus identifiers linked; no semantic OCR alignment verified",
                        "allSourceTextPreserved":True,"allTranslationTextPreserved":True}
                name=f"{work}-{original}-{translation}.json"
                (OUT/name).write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
                report.append({"workId":work,"original":original,"translation":translation,
                               "path":"data/classics-alignment/"+name,
                               "sharedLoci":len(direct),"originalPassages":len(a),
                               "translationPassages":len(b),"status":"editorial-locus-only"})
    manifest={"schema":"vitruvia-classics-navigation-manifest-v1","pairs":report,"count":len(report),
              "caution":"Shared chapter labels are not semantic collation; mismatches stay available for manual consultation."}
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("Pairs",len(report),"shared editorial loci",sum(x["sharedLoci"] for x in report))
if __name__=="__main__":build()
