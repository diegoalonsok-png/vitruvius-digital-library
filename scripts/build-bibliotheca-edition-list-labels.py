#!/usr/bin/env python3
"""Generate compact, bibliographically cautious version labels for Bibliotheca.

A date is shown only when a field expressly says it is the edition/translation
publication date; creation date and digital accession dates are not publication dates.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REG=ROOT/"data/classics-corpus/search-registry.json"
OUT=ROOT/"data/classics-corpus/edition-list-labels.json"
ORIGINAL={"la","grc"}
def clean(value):
    if not isinstance(value,(str,int,float)):return ""
    return " ".join(str(value).split()).strip()[:160]
def year(record):
    for k in ("editionYear","translationYear","publicationYear","yearOfPublication"):
        value=record.get(k)
        if isinstance(value,int) and 1400<=value<=2026:return str(value)
        if isinstance(value,str) and value.isdigit() and 1400<=int(value)<=2026:return value
    return ""
def make():
    registry=json.loads(REG.read_text())
    manifest=ROOT/"data/r2/classics-translation-manifest.json"
    remote={e["url"]:e for e in json.loads(manifest.read_text())["editions"]} if manifest.exists() else {}
    out={}
    for e in registry["entries"]:
        wid,lang=e.get("workId"),e.get("language")
        if not wid or not lang or e.get("format") not in ("json-passages","structured-bilingual","html-text"):continue
        if not (lang in ORIGINAL or lang in ("en","fr","es","it","de","pt")):continue
        data={}
        src=e.get("path","")
        if src.startswith("data/") and src.endswith(".json") and (ROOT/src).is_file():
            obj=json.loads((ROOT/src).read_text())
            if isinstance(obj,dict) and (obj.get("workId")==wid or e.get("format")=="structured-bilingual"):
                data=obj
        m=remote.get(src,{})
        if m and (m.get("workId")!=wid or m.get("language")!=lang or m.get("sha256")!=e.get("sha256")):m={}
        row={
            "path":src,
            "reader":e.get("reader"),
            "language":lang,
            "kind":"original" if lang in ORIGINAL else "translation",
        }
        if lang not in ORIGINAL:
            translator=clean(" · ".join(m.get("translators") or []) or data.get("translator") or e.get("translator"))
            publisher=clean(data.get("translationEdition") or data.get("sourceEdition") or data.get("edition") or e.get("edition"))
            date=year(m) or year(data) or year(e)
            row["attributionStatus"]="documented_translator_and_year" if translator and date else "bibliography_pending"
            if m.get("sourceUrn"):row["sourceUrn"]=m["sourceUrn"]
            if m.get("sourceUrl"):row["sourceUrl"]=m["sourceUrl"]
            if translator:row["translator"]=translator
            if date:row["publicationYear"]=date
            if publisher:row["edition"]=publisher
        elif data:
            edition=clean(data.get("sourceEdition") or data.get("edition"))
            if edition:row["edition"]=edition
        out.setdefault(wid,[])
        if not any(v["language"]==lang and v.get("path")==src for v in out[wid]):
            out[wid].append(row)
    for key in out:out[key].sort(key=lambda x:{"grc":0,"la":1,"en":2,"fr":3,"es":4}.get(x["language"],9))
    OUT.write_text(json.dumps({"schema":"bibliotheca-edition-list-labels-v1","works":out},ensure_ascii=False,separators=(",",":"))+"\n")
    print(f"Edition labels: {len(out)} distinct works, {sum(map(len,out.values()))} source languages")
if __name__=="__main__":make()
