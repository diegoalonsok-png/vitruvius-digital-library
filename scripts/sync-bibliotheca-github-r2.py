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
SUPPLEMENT = ROOT / "data/bibliotheca-expansion-publicada-2026-11-16.json"
R2 = ROOT / "data/r2/catalogo-clasicos-r2.json"
LINKS = ROOT / "data/r2/vinculos-repertorio.json"
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
OUT = ROOT / "data/r2/bibliotheca-inventario-unificado.json"

def read(p):
    return json.loads(p.read_text(encoding="utf-8"))

def main():
    catalog = read(CAT)["works"]
    supplement = read(SUPPLEMENT)["works"]
    r2 = read(R2)["items"]
    links = read(LINKS)
    registry = read(REGISTRY)["entries"]
    catalog_by_id = {x["id"]: x for x in catalog}
    assert len(catalog_by_id) == len(catalog), "Repeated work ID in catalogue"
    supplement_by_id = {x["id"]: x for x in supplement}
    assert len(supplement_by_id) == len(supplement), "Repeated supplementary work ID"
    assert not (set(supplement_by_id) & set(catalog_by_id)), "Supplementary work duplicates master catalogue"
    all_catalogued = {**catalog_by_id, **supplement_by_id}
    r2_by_id = {x["id"]: x for x in r2}
    assert len(r2_by_id) == len(r2), "Repeated R2 edition ID"
    mapping = links.get("mapa", {})
    additional = links.get("obrasNuevas", [])
    additional_ids = {r["r2"] for r in additional}
    assert len(additional_ids) == len(additional), "Repeated additional work ID"
    assert not (additional_ids & set(catalog_by_id)), "Additional work already exists in master catalogue"
    assert additional_ids <= set(r2_by_id), "Additional work without R2 catalogue edition"
    unknown = sorted({w for ids in mapping.values() for w in ids} - set(catalog_by_id))
    assert not unknown, f"Unresolved R2 catalogue relations: {unknown[:12]}"
    dangling = sorted(set(mapping) - set(r2_by_id))
    assert not dangling, f"R2 relation keys absent from R2 catalogue: {dangling[:12]}"
    local_by_work = {}
    remote_by_work = {}
    for e in registry:
        # Ediciones latinas críticas de Krohn y Rose son índices auxiliares,
        # no obras antiguas nuevas; se conservan y verifican como archivos.
        if e.get("format") == "critical-indexed-latin":
            if not (ROOT / e["path"]).is_file():
                raise ValueError(f"Missing auxiliary critical index: {e['path']}")
            continue
        if e["workId"] not in all_catalogued:
            raise ValueError(f"Uncatalogued indexed work: {e['workId']}")
        if str(e["path"]).startswith(("http://", "https://")):
            remote_by_work.setdefault(e["workId"], []).append({"language":e["language"],"url":e["path"]})
        else:
            if not (ROOT / e["path"]).is_file():
                raise ValueError(f"Missing local source: {e['path']}")
            local_by_work.setdefault(e["workId"], []).append({"language":e["language"],"path":e["path"]})
    # Las manifestaciones PDF reutilizan exclusivamente índices digitales verificados.
    edition_links = {
        "krohn-1912-pdf": ("krohn-1912-indexed", "la", "data/critical-editions/krohn-1912-tei-loci.json"),
        "vitruvio-v514-pdf": ("vitruvius", "es", "data/structured/recensio-es.json"),
        "vitruvio-v554-pdf": ("vitruvius", "fr", "data/structured/recensio-fr.json"),
        "theory-v297-pdf": ("vitruvius", "en", "data/structured/theory-en.json"),
    }
    for edition_id, (work_id, language, path) in edition_links.items():
        if edition_id not in all_catalogued:
            continue
        matches = [e for e in registry if e.get("workId") == work_id and e.get("language") == language and e.get("path") == path]
        if len(matches) == 1 and (ROOT / path).is_file():
            row = {"language": language, "path": path, "sourceWorkId": work_id, "sourceType": "digital-index-no-ocr"}
            if not any(e.get("path") == path and e.get("language") == language for e in local_by_work.get(edition_id, [])):
                local_by_work.setdefault(edition_id, []).append(row)
    by_work = {w:[] for w in catalog_by_id}
    unlinked = []
    linked_edition_ids = set()
    for edition in r2:
        rid = edition["id"]
        relations = mapping.get(rid)
        # Un mapa vacío no anula una coincidencia exacta de identidad con
        # el catálogo principal; cinco ediciones históricas usan esa forma.
        if not relations and rid in catalog_by_id:
            relations = [rid]
        if not relations and edition.get("traduccionDe") in catalog_by_id:
            relations = [edition["traduccionDe"]]
        if not relations:
            # An additional catalogue work is not an orphaned edition.
            if rid not in additional_ids:
                unlinked.append(rid)
            continue
        linked_edition_ids.add(rid)
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
    assert len(linked_edition_ids) + len(additional_ids) + len(unlinked) == len(r2), (
        "R2 edition categories do not reconcile"
    )
    inventory = {
        "schema":"vdl-federated-bibliotheca-inventory-v1",
        "generated":datetime.now(timezone.utc).isoformat(),
        "method":"Master works and additional R2 works counted separately; edition relations can be many-to-many. Remote text URLs are declared, not live-verified. Unresolved editions are never merged automatically.",
        "counts":{
            "cataloguedWorks":len(catalog),
            "supplementaryWorks":len(supplement),
            "additionalWorks":len(additional),
            "totalDeclaredWorks":len(catalog)+len(supplement)+len(additional),
            "r2EditionRecords":len(r2),
            "r2LinkedEditionRecords":len(linked_edition_ids),
            "r2WorkEditionRelations":sum(len(v) for v in by_work.values()),
            "r2AdditionalEditionRecords":len(additional_ids),
            "r2UnlinkedEditionRecords":len(unlinked),
            "worksWithR2Edition":sum(bool(v) for v in by_work.values()),
            "worksWithLocalIndexedText":len(local_by_work),
            "worksWithDeclaredRemoteIndex":len(remote_by_work),
        },
        "unlinkedR2EditionIds":sorted(unlinked),
        "additionalWorks":[{
            "id":row["r2"],"author":row.get("autor"),"title":row.get("obra"),
            "language":row.get("lengua"),"catalogue":"r2-additional-work",
            "r2FacsimileEditions":[{
                "editionId":row["r2"],
                "pdf":r2_by_id[row["r2"]].get("pdf"),
                "text":r2_by_id[row["r2"]].get("texto"),
                "year":r2_by_id[row["r2"]].get("anio"),
                "sha256":r2_by_id[row["r2"]].get("sha256"),
                "objectStatus":"declared-in-r2-catalogue-not-live-probed"
            }]
        } for row in additional],
        "supplementaryWorks":[{
            "id":w["id"],"author":w.get("author"),"title":w.get("title"),
            "catalogue":"github-supplementary",
            "locallyIndexedText":local_by_work.get(w["id"],[]),
            "declaredRemoteIndexedText":remote_by_work.get(w["id"],[]),
            "r2FacsimileEditions":[]
        } for w in supplement],
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
    # Keep headline work counts tied to actual catalogue IDs, not scheduled
    # imports, edition variants, or OCR-only records.
    counts_path = ROOT / "data/cifras-corpus.json"
    if counts_path.exists():
        headline = read(counts_path)
        headline["obras"] = len(catalog)
        headline["obrasSuplementarias"] = len(supplement)
        headline["obrasAdicionales"] = len(additional)
        headline["obrasTotalesDeclaradas"] = inventory["counts"]["totalDeclaredWorks"]
        headline["actualizado"] = datetime.now(timezone.utc).date().isoformat()
        headline["objetivoObras"] = 500
        headline["faltanParaObjetivo"] = max(0, 500 - headline["obrasTotalesDeclaradas"])
        counts_path.write_text(json.dumps(headline,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    print(json.dumps(inventory["counts"],ensure_ascii=False))
    if unlinked:
        print("WARNING: R2 records needing editorial linkage: "+", ".join(sorted(unlinked)[:20]))

if __name__ == "__main__":
    main()
