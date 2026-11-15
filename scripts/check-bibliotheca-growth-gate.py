#!/usr/bin/env python3
"""Puerta de integridad para el crecimiento del catálogo de Bibliotheca.

Sin red, sin OCR ficticio, sin reescribir fichas. Un aumento del catálogo sólo
puede aceptarse como inventario estructuralmente coherente; verificaciones
académicas no concluidas quedan en el informe para revisión editorial.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
ROADMAP=ROOT/"data/classics-corpus/indexation-roadmap-222.json"
RECON=ROOT/"data/classics-corpus/external-index-reconciliation.json"
REGISTRY=ROOT/"data/classics-corpus/search-registry.json"
BASELINE={"works":271,"indexed":210,"remote":28,"registryVersions":279}

def load(p):
    return json.loads(p.read_text(encoding="utf-8"))

def audit():
    road,recon,registry=map(load,(ROADMAP,RECON,REGISTRY))
    works=road.get("items",[])
    ids=[w.get("id") for w in works]
    idset=set(ids)
    issues=[]
    def check(ok,code,detail):
        if not ok: issues.append({"code":code,"detail":detail})
    check(len(works)==road.get("targetWorks"),"target_drift",
          f"{len(works)} entries vs target {road.get('targetWorks')}")
    check(all(isinstance(x,str) and x for x in ids),"missing_id","Some records lack a stable work ID")
    duplicates=[x for x,n in Counter(ids).items() if n>1]
    check(not duplicates,"duplicate_work_ids",duplicates)
    for w in works:
        wid=w.get("id")
        check(bool(w.get("author") and w.get("title")),"identity_missing",wid)
        check(w.get("originalLanguage") in ("grc","la","he","hbo","heb"),"language_missing",wid)
        actual=bool(w.get("originalIndexed") or w.get("offsiteOriginalIndexed"))
        check(w.get("effectiveOriginalIndexed") is actual,"index_state_mismatch",wid)
    indexed=sum(w.get("effectiveOriginalIndexed") is True for w in works)
    check(indexed==road.get("counts",{}).get("effectiveOriginalsIndexed"),
          "indexed_counter_mismatch",indexed)
    check(len(works)-indexed==road.get("counts",{}).get("effectiveOriginalsMissing"),
          "missing_counter_mismatch",len(works)-indexed)
    check(len(works)>=BASELINE["works"],"catalogue_regression",len(works))
    # La línea de base es sólo un mínimo, no un certificado filológico.
    check(indexed>=BASELINE["indexed"],"indexed_original_regression",indexed)
    remote=recon.get("remoteEntries",[])
    check(len(remote)>=BASELINE["remote"],"remote_index_regression",len(remote))
    check(len(remote)==recon.get("counts",{}).get("remoteOriginalsIndexed"),
          "remote_counter_mismatch",len(remote))
    remote_keys=[(x.get("workId"),x.get("language")) for x in remote]
    check(len(remote_keys)==len(set(remote_keys)),"remote_duplicate",remote_keys)
    check(all(e.get("workId") in idset for e in remote),"remote_missing_catalogue_work",
          [e.get("workId") for e in remote if e.get("workId") not in idset])
    for item in remote:
        check(bool(item.get("sourceSha256") and item.get("sourceUrl") and item.get("textPath")),
              "remote_provenance_missing",item.get("workId"))
    entries=registry.get("entries",[])
    check(len(entries)==registry.get("count"),"registry_count_mismatch",len(entries))
    check(len(entries)>=BASELINE["registryVersions"],"indexed_version_regression",len(entries))
    entrykeys=[(e.get("workId"),e.get("language"),e.get("path")) for e in entries]
    check(len(entrykeys)==len(set(entrykeys)),"duplicate_indexed_version",
          [k for k,n in Counter(entrykeys).items() if n>1][:20])
    check(all(e.get("workId") in idset for e in entries),"registry_orphans",
          sorted({e.get("workId") for e in entries if e.get("workId") not in idset})[:40])
    counts={"works":len(works),"indexed_originals":indexed,
            "originals_without_index":len(works)-indexed,
            "remote_originals":len(remote),"text_version_entries":len(entries)}
    return {"counts":counts,"baseline":BASELINE,"structural_issues":issues,
      "limitations":"Does not verify inside PDFs, OCR quality, manuscript transcriptions, external availability or editorial correctness."}

def main():
    result=audit()
    dest=ROOT/"reports"/"bibliotheca"/"growth-gate.json"
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if result["structural_issues"]:
        print("Catalogue integrity gate FAILED",file=sys.stderr)
        return 1
    print("Catalogue integrity gate PASSED: structural consistency only")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
