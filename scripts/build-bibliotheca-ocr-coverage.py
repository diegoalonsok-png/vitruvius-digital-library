#!/usr/bin/env python3
"""Indexación en dos niveles: transcripción indexada y OCR de facsímil R2.

No promueve OCR a texto crítico, no altera la búsqueda de loci. Genera un
inventario derivado para que la Bibliotheca permita buscar también en aquellos
facsímiles que aún carecen de transcripción alineada.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(relative):
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))

def main():
    panel = read("data/r2/bibliotheca-panel-sync.json")
    inventory = read("data/r2/bibliotheca-inventario-unificado.json")
    catalog = read("data/r2/catalogo-clasicos-r2.json")
    index = read("data/r2/bibliotheca-r2-live-audit.json")
    master = read("data/bibliotheca-graeca-latina-I-bce-I-ce.json")["works"]
    supplement = read("data/bibliotheca-expansion-publicada-2026-11-16.json")["works"]
    additional = inventory["additionalWorks"]
    all_works = master + supplement + additional
    registry = read("data/classics-corpus/search-registry.json")["entries"]
    # Compare all declared work IDs; auxiliary indices are not additional works.
    all_ids = {x["id"] for x in all_works}
    assert len(all_ids) == len(all_works), "Identificador duplicado en catálogo federado"
    indexed = {x["workId"] for x in registry} & all_ids
    linked = {x["id"]: x for x in inventory["works"] + inventory["supplementaryWorks"] + additional}
    catalogued = {x["id"] for x in catalog["items"]}
    index_missing = set(index.get("missingIndexIds", []))
    listed_index_ids = catalogued - index_missing if index.get("status", "").startswith("checked") else set()
    editions_by_work = {}
    for entry in registry:
        if entry.get("workId") == "vitruvius" and entry.get("format") == "structured-bilingual":
            editions_by_work[entry.get("edition")] = entry
    alias_ids = {"vitruvio-v514-pdf": "recensio-es",
                 "vitruvio-v554-pdf": "recensio-fr",
                 "theory-v297-pdf": "theory-en"}
    rows, no_ocr, existing_structured = [], [], []
    for work in all_works:
        if work["id"] in indexed:
            continue
        alias = editions_by_work.get(alias_ids.get(work["id"]))
        if work["id"] == "krohn-1912-pdf":
            critical = next((e for e in registry if e.get("workId") == "krohn-1912-indexed" and e.get("format") == "critical-indexed-latin"), None)
            if critical and (ROOT / critical["path"]).is_file():
                existing_structured.append({"id": work["id"], "author": work.get("author"), "title": work.get("title"), "status": "edición crítica ya indexada por loci", "edition": critical.get("edition"), "reader": critical["reader"], "indexedPath": critical["path"], "indexedUnderWorkId": critical["workId"]})
                continue
        if alias:
            existing_structured.append({
                "id": work["id"], "author": work.get("author"), "title": work.get("title"),
                "status": "versión ya indexada bajo la ficha editorial de Vitruvio",
                "edition": alias["edition"], "reader": alias["reader"],
                "indexedPath": alias["path"], "indexedUnderWorkId": "vitruvius"
            })
            continue
        editions = linked.get(work["id"], {}).get("r2FacsimileEditions", [])
        available = []
        for edition in editions:
            rid = edition.get("editionId")
            if rid in listed_index_ids and edition.get("text") and edition.get("pdf"):
                available.append({
                    "editionId": rid,
                    "reader": "buscador-facsimiles-clasicos.html?obra=" + rid,
                    "textKind": "OCR por página, sin cotejo filológico",
                    "bibliographicIdentity": "metadatos del catálogo de ediciones R2",
                })
        item = {"id": work["id"], "author": work.get("author"),
                "title": work.get("title"), "originalLanguage": work.get("language"),
                "editionSearchStatus": "sin transcripción textual registrada"}
        if available:
            item["ocrSearchStatus"] = "índice invertido R2 declarado; OCR no revisado"
            item["facsimileReaders"] = available
            rows.append(item)
        else:
            item["ocrSearchStatus"] = "sin facsímil con índice R2 vinculado"
            no_ocr.append(item)
    assert len(rows) + len(no_ocr) + len(existing_structured) == len(all_works) - len(indexed)
    assert len(catalogued) == len(catalog["items"]), "ID R2 duplicados"
    result = {
        "schema": "vdl-bibliotheca-ocr-coverage-v1",
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": "Catálogo maestro, registro de versiones, inventario federado e índice S3 auditado",
        "limits": "Índice por raíces sobre OCR no revisado, no traducción, no lematización morfológica, ni correspondencia certificada con loci. La presencia en el listado no prueba que cada palabra tenga una localización correcta; consultar auditoría léxica en vivo.",
        "counts": {
            "masterWorks": len(master), "supplementaryWorks": len(supplement), "additionalR2Works": len(additional), "totalDeclaredWorks": len(all_works), "withRegisteredText": len(indexed),
            "withoutRegisteredText": len(rows) + len(no_ocr) + len(existing_structured),
            "withoutTextButWithR2OcrIndex": len(rows),
            "withoutOwnRegistryButWithLinkedStructuredEdition": len(existing_structured),
            "withoutTextOrLinkedR2OcrIndex": len(no_ocr)
        },
        "ocrSearchableWithoutTranscription": rows,
        "alreadyIndexedAsStructuredEdition": existing_structured,
        "needsTextOrVerifiableFacsimile": no_ocr,
        "r2IndexAuditTimestamp": index.get("generated"),
        "r2IndexDeclared": bool(listed_index_ids)
    }
    out = ROOT / "data/r2/bibliotheca-ocr-coverage.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["counts"], ensure_ascii=False))

if __name__ == "__main__":
    main()
