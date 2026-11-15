#!/usr/bin/env python3
"""Auditoría conservadora del catálogo clásico, sin inventar OCR ni cotejos.

Uso: python3 scripts/audit-bibliotheca-provenance.py
      python3 scripts/audit-bibliotheca-provenance.py --json
Comprueba únicamente declaraciones en los manifiestos locales; no certifica la
lectura del interior de PDFs, la fidelidad paleográfica ni el acceso a R2.
"""
import argparse
import collections
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROADMAP = ROOT / "data/classics-corpus/indexation-roadmap-222.json"
RECON = ROOT / "data/classics-corpus/external-index-reconciliation.json"

def audit():
    roadmap = json.loads(ROADMAP.read_text(encoding="utf-8"))
    remote = json.loads(RECON.read_text(encoding="utf-8"))
    works = roadmap["items"]
    defects = []
    priorities = []
    ids = set()
    for entry in works:
        wid = entry.get("id")
        if not wid or wid in ids:
            defects.append({"id": wid, "code": "identificador_ausente_o_duplicado"})
        ids.add(wid)
        if not entry.get("title") or not entry.get("author"):
            defects.append({"id": wid, "code": "titulo_o_autor_ausente"})
        if entry.get("originalLanguage") not in ("grc", "la"):
            defects.append({"id": wid, "code": "lengua_original_no_clasificada"})
        expected = bool(entry.get("originalIndexed") or entry.get("offsiteOriginalIndexed"))
        if entry.get("effectiveOriginalIndexed") != expected:
            defects.append({"id": wid, "code": "cobertura_original_inconsistente"})
        if not expected:
            priorities.append({
                "id": wid, "title": entry.get("title"),
                "language": entry.get("originalLanguage"),
                "sourceReadiness": entry.get("sourceReadiness"),
                "task": "Identificar fuente, edición y extensión antes de transcribir/indexar",
            })
    counts = roadmap["counts"]
    declared_states = collections.Counter(x.get("state") for x in works)
    for status, n in counts.get("states", {}).items():
        if declared_states[status] != n:
            defects.append({"code": "estado_inconsistente", "state": status,
                            "declared": n, "observed": declared_states[status]})
    if len(works) != roadmap["targetWorks"]:
        defects.append({"code": "total_catalogo_inconsistente"})
    if len(priorities) != counts.get("effectiveOriginalsMissing"):
        defects.append({"code": "faltantes_inconsistentes", "observed": len(priorities)})
    remote_entries = remote.get("remoteEntries", [])
    remote_keys = {(x.get("workId"), x.get("language")) for x in remote_entries}
    if len(remote_keys) != len(remote_entries):
        defects.append({"code": "registro_remoto_duplicado"})
    if len(remote_entries) != counts.get("offsiteOriginalsIndexed"):
        defects.append({"code": "totales_remotos_inconsistentes",
                        "observed": len(remote_entries)})
    for item in remote_entries:
        if not item.get("sourceUrl") or not item.get("sourceSha256") or not item.get("textPath"):
            defects.append({"code": "procedencia_remota_incompleta", "id": item.get("workId")})
    return {
        "scope": "Auditoría de metadatos declarados; NO certifica OCR ni contenido de archivos",
        "catalogued_records": len(works),
        "originals_indexed_declared": sum(bool(x.get("effectiveOriginalIndexed")) for x in works),
        "originals_pending_declared": len(priorities),
        "remote_manifest_entries": len(remote_entries),
        "metadata_defects": defects,
        "originals_requiring_source_and_text_validation": priorities,
        "manual_checks": [
            "Comparar portada, título interior, incipit y explicit de cada PDF/DOCX con la ficha",
            "Inspeccionar muestras de folios OCR, separando errores de reconocimiento y variantes textuales",
            "Registrar sigla, biblioteca, signatura, foliación, datación y enlace institucional de cada códice",
            "Verificar locus y extensión antes de afirmar texto completo o traducción enfrentada",
            "Comprobar HTTP, integridad SHA-256, búsqueda y lectura del recurso real en R2",
        ],
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="Imprimir informe JSON")
    options = parser.parse_args()
    result = audit()
    if options.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"Registros: {result['catalogued_records']}; originales indexados declarados: "
              f"{result['originals_indexed_declared']}; pendientes: "
              f"{result['originals_pending_declared']}; incidencias: "
              f"{len(result['metadata_defects'])}")
        for item in result["metadata_defects"]:
            print("INCIDENCIA", item)
        for item in result["originals_requiring_source_and_text_validation"]:
            print("PENDIENTE", item["id"], item["language"], item["sourceReadiness"])
    raise SystemExit(1 if result["metadata_defects"] else 0)
