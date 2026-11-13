#!/usr/bin/env python3
"""Pone la instantánea de conciliación al día con el inventario del repertorio.

data/classics-corpus/external-index-reconciliation.json declara cuántas obras
hay catalogadas y cuáles siguen sin original indexado. Cuando entra una obra
nueva —hoy, por facsímil alojado en R2— esas cifras quedan viejas y la prueba
test-classics-audited-coverage.mjs lo detecta.

Este guion las toma del inventario recién generado (indexation-roadmap) y de las
fichas, sin inventar ninguna: una obra sólo se declara sin original indexado si
el inventario dice que lo está.

Uso: python3 scripts/sincronizar-reconciliacion.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTARIO = ROOT / "data/classics-corpus/indexation-roadmap-222.json"
INSTANTANEA = ROOT / "data/classics-corpus/external-index-reconciliation.json"
REPERTORIO = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"


def main():
    inventario = json.loads(INVENTARIO.read_text(encoding="utf-8"))
    instantanea = json.loads(INSTANTANEA.read_text(encoding="utf-8"))
    fichas = {w["id"]: w for w in json.loads(REPERTORIO.read_text(encoding="utf-8"))["works"]}

    ediciones = set(instantanea.get("editorialEditionRecordsNotNewAncientWorks") or [])
    sin_indice = [w for w in inventario["items"] if not w.get("effectiveOriginalIndexed")]
    conocidos = {r["workId"] for r in instantanea["remainingWithoutOriginalIndex"]}
    for w in sin_indice:
        if w["id"] in conocidos:
            continue
        ficha = fichas.get(w["id"], {})
        instantanea["remainingWithoutOriginalIndex"].append({
            "workId": w["id"],
            "originalLanguage": w.get("language") or ficha.get("language"),
            "sourceReadiness": w.get("sourceReadiness") or "facsimil_alojado_sin_transcripcion",
            "bibliographyCandidateUrns": [],
            "recordKind": "edition-record" if w["id"] in ediciones else "independent-work",
        })
    vigentes = {w["id"] for w in sin_indice}
    instantanea["remainingWithoutOriginalIndex"] = [
        r for r in instantanea["remainingWithoutOriginalIndex"] if r["workId"] in vigentes]

    c = instantanea["counts"]
    c["worksCatalogued"] = inventario["targetWorks"]
    c["hostedOriginalsIndexed"] = inventario["counts"]["originalsIndexed"]
    c["remoteOriginalsIndexed"] = inventario["counts"]["offsiteOriginalsIndexed"]
    c["combinedOriginalsIndexed"] = inventario["counts"]["effectiveOriginalsIndexed"]
    c["originalsStillWithoutIndex"] = inventario["counts"]["effectiveOriginalsMissing"]
    c["hostedTranslations"] = inventario["counts"]["worksWithHostedTranslation"]
    c["hostedTextVersions"] = inventario["counts"]["textVersions"]
    c["unindexedEditionRecordsOfExistingVitruviusWork"] = inventario["counts"][
        "unindexedEditionRecordsOfExistingVitruviusWork"]
    c["distinctAncientWorksStillMissingOriginalIndex"] = inventario["counts"][
        "distinctAncientWorksStillMissingOriginalIndex"]
    instantanea["updated"] = inventario["updated"]

    INSTANTANEA.write_text(json.dumps(instantanea, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(c, ensure_ascii=False))


if __name__ == "__main__":
    main()
