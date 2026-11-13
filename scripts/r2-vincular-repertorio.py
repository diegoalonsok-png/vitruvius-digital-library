#!/usr/bin/env python3
"""Recalcula data/r2/vinculos-repertorio.json a partir del catálogo R2 y del mapa curado.

El mapa (clave «mapa») se revisa a mano: id R2 → lista de fichas del repertorio.
Una edición cuyo identificador coincide con el de una ficha se vincula sola a esa
obra: es el mismo identificador, no una conjetura.
Una lista vacía declara una obra NUEVA (sin ficha previa). Las ediciones R2 que aún
no figuran en el mapa quedan en «sinRevisar» y no se suman a ningún recuento.

Este guion no modifica el repertorio. Cuando scripts/r2-fichas-obras-nuevas.py le da
ficha a una obra nueva —la ficha lleva el mismo id que la edición alojada—, aquí deja
de contarse como nueva y pasa a contarse como ficha, sin duplicarse.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REP = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
CAT = ROOT / "data/r2/catalogo-clasicos-r2.json"
OUT = ROOT / "data/r2/vinculos-repertorio.json"

rep = {w["id"] for w in json.loads(REP.read_text(encoding="utf-8"))["works"]}
cat = json.loads(CAT.read_text(encoding="utf-8"))
previo = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
mapa = previo.get("mapa", {})
for k, v in mapa.items():
    for w in v:
        if w not in rep:
            raise SystemExit(f"Ficha inexistente en el mapa: {k} → {w}")

por_obra, nuevas, sin_revisar = {}, [], []
for x in cat["items"]:
    if x["id"] not in mapa:
        # Si la edición lleva el mismo identificador que una ficha, es esa obra:
        # no hay nada que adivinar, y dejarla sin vincular la volvía invisible
        # (no contaba, no se veía desde la ficha y no se podía leer desde ella).
        if x["id"] in rep:
            mapa[x["id"]] = [x["id"]]
        elif x.get("coleccion") or x.get("traduccionDe"):
            mapa[x["id"]] = []
        else:
            sin_revisar.append(x["id"])
            continue
    fichas = mapa[x["id"]]
    # Una obra que ya tiene ficha propia (mismo id) deja de ser una incorporación nueva.
    if not fichas and x["id"] in rep:
        fichas = [x["id"]]
    # Una traducción no es una obra más: cuelga de la ficha de su original.
    if not fichas and x.get("traduccionDe"):
        fichas = mapa.get(x["traduccionDe"]) or ([x["traduccionDe"]] if x["traduccionDe"] in rep else [])
    for w in fichas:
        por_obra.setdefault(w, []).append({
            "r2": x["id"], "pdf": x["pdf"], "edicion": x["tituloEdicion"], "anio": x["anio"],
            "traduccion": x.get("traduccionDe") and x.get("lengua"),
            "volumen": x.get("volumen"), "loeb": x.get("bilingueLoeb"), "alcance": x.get("alcance")})
    if not fichas:
        nuevas.append({"r2": x["id"], "autor": x["autor"], "obra": x["obra"], "lengua": x["lengua"], "pdf": x["pdf"]})

out = {
    "schema": "vdl-r2-vinculos-repertorio-1", "actualizado": cat.get("actualizado"),
    "descripcion": "Correspondencia, revisada a mano, entre las ediciones en facsímil alojadas en R2 y las "
                   f"{len(rep)} fichas del repertorio (data/bibliotheca-graeca-latina-I-bce-I-ce.json, que no se "
                   "modifica). Las obras sin ficha previa se cuentan como incorporaciones nuevas; las ediciones "
                   "aún no revisadas no se cuentan.",
    "recuentos": {"fichasRepertorio": len(rep), "obrasNuevas": len(nuevas), "obrasTotales": len(rep) + len(nuevas),
                  "edicionesFacsimil": len(cat["items"]) - len(sin_revisar), "fichasConFacsimil": len(por_obra),
                  "sinRevisar": len(sin_revisar)},
    "porObra": por_obra, "obrasNuevas": nuevas, "sinRevisar": sin_revisar, "mapa": mapa,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(json.dumps(out["recuentos"], ensure_ascii=False))
