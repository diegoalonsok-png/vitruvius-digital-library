#!/usr/bin/env python3
"""Daily federated Bibliotheca inventory: GitHub records + R2 editions.

Keep distinct the ancient work, its catalogue record, individual facsimile
editions, and indexed transcripts. R2 catalogue metadata alone does not prove
a public object is currently reachable. Never invent an edition linkage.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAT = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
R2 = ROOT / "data/r2/catalogo-clasicos-r2.json"
LINKS = ROOT / "data/r2/vinculos-repertorio.json"
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
OUT = ROOT / "data/r2/bibliotheca-inventario-unificado.json"

def read(p):
    return json.loads(p.read_text(encoding="utf-8"))

def main():
    catalog = read(CAT)["works"]
    r2 = read(R2)["items"]
    links = read(LINKS)
    registry = read(REGISTRY)["entries"]
    catalog_by_id = {x["id"]: x for x in catalog}
    assert len(catalog_by_id) == len(catalog), "Repeated work ID in catalogue"
    r2_by_id = {x["id"]: x for x in r2}
    assert len(r2_by_id) == len(r2), "Repeated R2 edition ID"
    mapping = links.get("mapa", {})
    unknown = sorted({w for ids in mapping.values() for w in ids} - set(catalog_by_id))
    assert not unknown, f"Unresolved R2 catalogue relations: {unknown[:12]}"
    dangling = sorted(set(mapping) - set(r2_by_id))
    assert not dangling, f"R2 relation keys absent from R2 catalogue: {dangling[:12]}"
    local_by_work = {}
    remote_by_work = {}
    for e in registry:
        if e["workId"] not in catalog_by_id:
            raise ValueError(f"Uncatalogued indexed work: {e['workId']}")
        if str(e["path"]).startswith(("http://", "https://")):
            remote_by_work.setdefault(e["workId"], []).append({"language":e["language"],"url":e["path"]})
        else:
            if not (ROOT / e["path"]).is_file():
                raise ValueError(f"Missing local source: {e['path']}")
            local_by_work.setdefault(e["workId"], []).append({"language":e["language"],"path":e["path"]})
    by_work = {w:[] for w in catalog_by_id}
    unlinked = []
    for edition in r2:
        rid = edition["id"]
        relations = mapping.get(rid)
        if relations is None and rid in catalog_by_id:
            relations = [rid]
        if relations is None and edition.get("traduccionDe") in catalog_by_id:
            relations = [edition["traduccionDe"]]
        if not relations:
            unlinked.append(rid)
            continue
        for work_id in relations:
            by_work[work_id].append({
                "editionId":rid,
                "title":edition.get("tituloEdicion"),
                "year":edition.get("anio"),
                "language":edition.get("lengua"),
                "pdf":edition.get("pdf"),
                "text":edition.get("texto"),
                "sha256":edition.get("sha256"),
                "objectStatus":"declared-in-r2-catalogue-not-live-probed",
            })
    inventory = {
        "schema":"vdl-federated-bibliotheca-inventory-v1",
        "generated":datetime.now(timezone.utc).isoformat(),
        "method":"One work per master catalogue ID; R2 facsimiles are editions, not additional works. Local texts verified by file existence; R2 object URLs declared, not live-verified. Unresolved editions flagged without automatic merging.",
        "counts":{
            "cataloguedWorks":len(catalog),
            "r2EditionRecords":len(r2),
            "r2LinkedEditionRecords":sum(len(v) for v in by_work.values()),
            "r2UnlinkedEditionRecords":len(unlinked),
            "worksWithR2Edition":sum(bool(v) for v in by_work.values()),
            "worksWithLocalIndexedText":len(local_by_work),
            "worksWithDeclaredRemoteIndex":len(remote_by_work),
        },
        "unlinkedR2EditionIds":sorted(unlinked),
        "works":[{
            "id":w["id"],"author":w.get("author"),"title":w.get("title"),
            "catalogue":"github",
            "locallyIndexedText":local_by_work.get(w["id"],[]),
            "declaredRemoteIndexedText":remote_by_work.get(w["id"],[]),
            "r2FacsimileEditions":by_work[w["id"]]
        } for w in catalog]
    }
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(inventory["counts"],ensure_ascii=False))
    if unlinked:
        print("WARNING: R2 records needing editorial linkage: "+", ".join(sorted(unlinked)[:20]))

if __name__ == "__main__":
    main()
