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
    registry = read("data/classics-corpus/search-registry.json")["entries"]
    indexed = {x["workId"] for x in registry}
    linked = {x["id"]: x for x in inventory["works"]}
    catalogued = {x["id"] for x in catalog["items"]}
    index_missing = set(index.get("missingIndexIds", []))
    listed_index_ids = catalogued - index_missing if index.get("status", "").startswith("checked") else set()
    rows, no_ocr = [], []
    for work in master:
        if work["id"] in indexed:
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
    assert len(rows) + len(no_ocr) == len(master) - len(indexed)
    assert len(catalogued) == len(catalog["items"]), "ID R2 duplicados"
    result = {
        "schema": "vdl-bibliotheca-ocr-coverage-v1",
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": "Catálogo maestro, registro de versiones, inventario federado e índice S3 auditado",
        "limits": "Índice por raíces sobre OCR no revisado, no traducción, no lematización morfológica, ni correspondencia certificada con loci. La presencia en el listado no prueba que cada palabra tenga una localización correcta; consultar auditoría léxica en vivo.",
        "counts": {
            "masterWorks": len(master), "withRegisteredText": len(indexed),
            "withoutRegisteredText": len(rows) + len(no_ocr),
            "withoutTextButWithR2OcrIndex": len(rows),
            "withoutTextOrLinkedR2OcrIndex": len(no_ocr)
        },
        "ocrSearchableWithoutTranscription": rows,
        "needsTextOrVerifiableFacsimile": no_ocr,
        "r2IndexAuditTimestamp": index.get("generated"),
        "r2IndexDeclared": bool(listed_index_ids)
    }
    out = ROOT / "data/r2/bibliotheca-ocr-coverage.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["counts"], ensure_ascii=False))

if __name__ == "__main__":
    main()
