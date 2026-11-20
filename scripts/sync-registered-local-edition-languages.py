#!/usr/bin/env python3
"""Sincroniza idiomas de ediciones verificadas con el catálogo maestro, sin duplicar obras.

El registro solo se usa como lista de candidatos: los archivos JSON locales y su idioma
deben existir y coincidir antes de incorporar idiomas a la ficha.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MAIN=ROOT/"data/bibliotheca-graeca-latina-I-bce-I-ce.json"
SUPP=ROOT/"data/bibliotheca-expansion-publicada-2026-11-16.json"
REG=ROOT/"data/classics-corpus/search-registry.json"

def main():
    catalogue=json.loads(MAIN.read_text(encoding="utf-8"))
    supplement=json.loads(SUPP.read_text(encoding="utf-8"))
    registry=json.loads(REG.read_text(encoding="utf-8"))
    masters={w["id"]:w for w in catalogue["works"]}
    overlays={w["id"]:w for w in supplement["works"]}
    if set(masters)&set(overlays):raise ValueError("Duplicate catalogue work identifiers")
    all_works={**masters,**overlays}
    verified={}
    verified_paths={}
    for e in registry["entries"]:
        work_id,lang,path=e["workId"],e["language"],str(e.get("path",""))
        if work_id not in all_works or e.get("format")!="json-passages":
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
        verified_paths[(work_id,lang)]=path
    revised=[]
    for id,languages in sorted(verified.items()):
        work=all_works[id]
        previous=work.get("localEditionLanguages",[])
        if not isinstance(previous,list):
            raise ValueError(f"Invalid localEditionLanguages: {id}")
        missing=sorted(languages-set(previous))
        if missing:
            work["localEditionLanguages"]=[*previous,*missing]
        if id in overlays:
            files=work.setdefault("corpusFiles",{})
            versions=work.setdefault("localVersions",[])
            for lang in sorted(languages):
                path=verified_paths[(id,lang)]
                if lang in files and files[lang]!=path:
                    raise ValueError(f"Conflicting supplementary corpus path: {id}/{lang}")
                files[lang]=path
                if not any(v.get("language")==lang and v.get("path")==path for v in versions):
                    prior=[v for v in versions if v.get("language")==lang]
                    if prior:
                        if len(prior)!=1:
                            raise ValueError(f"Multiple supplementary versions need review: {id}/{lang}")
                        existing=prior[0]
                        old_path=str(existing.get("path",""))
                        allowed_reader=f"classics-text-reader.html?work={id}&lang={lang}"
                        if old_path!=allowed_reader:
                            raise ValueError(f"Conflicting supplementary version path: {id}/{lang}")
                        existing["reader"]=old_path
                        existing["path"]=path
                    else:
                        versions.append({"language":lang,"path":path})
            if any(lang in languages for lang in ("en","fr","es")):
                work["translation"]={"status":"Traducción humana registrada como texto local; no se afirma alineación entre pasajes sin cotejo."}
        if missing:
            revised.append({"id":id,"added":missing})
    if revised:
        MAIN.write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        SUPP.write_text(json.dumps(supplement,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"catalogueWorksUpdated":len(revised),"verifiedNewLanguageDeclarations":sum(len(x["added"]) for x in revised),"details":revised},ensure_ascii=False))
if __name__=="__main__":main()
