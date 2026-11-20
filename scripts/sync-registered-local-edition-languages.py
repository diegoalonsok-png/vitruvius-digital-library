#!/usr/bin/env python3
"""Sincroniza idiomas de ediciones verificadas con el catálogo maestro, sin duplicar obras.

El registro solo se usa como lista de candidatos: los archivos JSON locales y su idioma
deben existir y coincidir antes de incorporar idiomas a la ficha.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MAIN=ROOT/"data/bibliotheca-graeca-latina-I-bce-I-ce.json"
REG=ROOT/"data/classics-corpus/search-registry.json"

def main():
    catalogue=json.loads(MAIN.read_text(encoding="utf-8"))
    registry=json.loads(REG.read_text(encoding="utf-8"))
    masters={w["id"]:w for w in catalogue["works"]}
    verified={}
    for e in registry["entries"]:
        work_id,lang,path=e["workId"],e["language"],str(e.get("path",""))
        if work_id not in masters or e.get("format")!="json-passages":
            continue
        if not path.startswith("data/classics-corpus/") or not path.endswith(f"-{lang}.json"):
            continue
        source=ROOT/path
        if not source.is_file():
            raise ValueError(f"Registered local source missing: {path}")
        record=json.loads(source.read_text(encoding="utf-8"))
        if record.get("workId")!=work_id or record.get("language")!=lang:
            raise ValueError(f"Edition identity mismatch: {path}")
        if not isinstance(record.get("passages"),list) or not any(p.get("text") for p in record["passages"]):
            raise ValueError(f"Empty edition: {path}")
        if not (record.get("source") or record.get("sources")):
            raise ValueError(f"No source provenance: {path}")
        verified.setdefault(work_id,set()).add(lang)
    revised=[]
    for id,languages in sorted(verified.items()):
        work=masters[id]
        previous=work.get("localEditionLanguages",[])
        if not isinstance(previous,list):
            raise ValueError(f"Invalid localEditionLanguages: {id}")
        missing=sorted(languages-set(previous))
        if missing:
            work["localEditionLanguages"]=[*previous,*missing]
            revised.append({"id":id,"added":missing})
    if revised:
        MAIN.write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"catalogueWorksUpdated":len(revised),"verifiedNewLanguageDeclarations":sum(len(x["added"]) for x in revised),"details":revised},ensure_ascii=False))
if __name__=="__main__":main()
