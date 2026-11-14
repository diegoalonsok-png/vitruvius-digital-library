#!/usr/bin/env python3
"""Auditoría reproducible, sin escritura ni descarga, de Bibliotheca y R2.

Separa obra, edición, archivo binario y testimonio material.
No deduce que dos ediciones sean distintas por tener nombres distintos.
"""
from __future__ import annotations
import collections, hashlib, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT / p).read_text(encoding="utf-8"))
def audit():
    catalog=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json")["works"]
    editions=read("data/r2/catalogo-clasicos-r2.json")["items"]
    registry=read("data/classics-corpus/search-registry.json")["entries"]
    links=read("data/r2/vinculos-repertorio.json")
    works={x["id"]: x for x in catalog}
    by_hash=collections.defaultdict(list)
    by_source=collections.defaultdict(list)
    problems=[]
    for ed in editions:
        signature=ed.get("sha256")
        if signature: by_hash[signature].append(ed)
        if ed.get("identificadorIA"):by_source[ed["identificadorIA"]].append(ed["id"])
        if not ed.get("tituloEdicion") or not ed.get("anio") or not ed.get("fuente"):
            problems.append({"id":ed["id"],"issue":"missing_bibliographic_core"})
        if "vol01" in ed["id"].lower() and re.search(r"\bvol(?:ume|umen)?\.?\s*(?:14|xiv)\b",ed.get("tituloEdicion",""),re.I):
            problems.append({"id":ed["id"],"issue":"volume_identifier_conflicts_with_title","title":ed.get("tituloEdicion")})
    duplicates=[{"sha256":sha,"editionIds":[e["id"] for e in vals],"titles":[e.get("tituloEdicion") for e in vals],
                 "classification":"one_binary_multiple_catalogue_entries; inspect whether omnibus edition shared intentionally"}
                for sha,vals in sorted(by_hash.items()) if len(vals)>1]
    duplicate_sources=[{"archiveIdentifier":k,"editionIds":v} for k,v in by_source.items() if len(v)>1]
    registry_ids={e["workId"] for e in registry}
    mapping=links.get("mapa",{})
    dangling=sorted({id for ids in mapping.values() for id in ids if id not in works})
    return {"schema":"vdl-bibliotheca-integrity-audit-v1","counts":{
            "catalogueWorks":len(catalog),"r2EditionRecords":len(editions),
            "distinctR2FileHashes":len(by_hash),"indexedVersionEntries":len(registry),
            "indexedDistinctWorkIds":len(registry_ids)},
            "duplicateBinaryGroups":duplicates,"reusedArchiveSources":duplicate_sources,
            "bibliographicProblems":problems,"unresolvedMappedWorkIds":dangling,
            "policy":"No automatic deletion. One PDF can legitimately be a collected edition of several works; document its component loci and use the same object URL rather than copying bytes.",
            "limitation":"R2 HEAD and actual PDF full-text content are not checked in this metadata-only audit."}
if __name__=="__main__":
 print(json.dumps(audit(),ensure_ascii=False,indent=2))
