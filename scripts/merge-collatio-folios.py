#!/usr/bin/env python3
"""Incorpora al mapa folio ↔ locus los folios documentados en la collatio del autor.

El mapa data/codex-h/folio-locus-map.json registraba 21 folios, verificados por
inspección del facsímil. El Apéndice T de las ediciones impresas documenta otros,
con autopsia del folio («Autopsie directe de f.10v»), y esas atribuciones pasaron
los cuatro controles de scripts/validate-collatio.py, entre ellos el de no
contradecir este mismo mapa.

Se añaden con un estado propio, «collatio_autoral», para que la procedencia quede
visible y no se confunda con la verificación por rúbrica. No se infiere foliación:
cada folio nuevo procede de una tabla impresa que lo nombra.

Uso: python3 scripts/merge-collatio-folios.py
"""
import json, re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAPA = ROOT / "data/codex-h/folio-locus-map.json"
INDICE = ROOT / "images/CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR/indice-folios.json"


def folio_key(f):
    m = re.match(r"(\d+)\s*([rv])", f or "")
    return (int(m.group(1)), 0 if m.group(2) == "r" else 1) if m else (10 ** 6, 0)


def main():
    mapa = json.loads(MAPA.read_text(encoding="utf8"))
    val = json.loads((ROOT / "data/apparatus/collatio-validada.json").read_text(encoding="utf8"))
    imagenes = {}
    if INDICE.exists():
        for im in json.loads(INDICE.read_text(encoding="utf8")).get("imagenes", []):
            et = str(im.get("etiquetaOriginal", ""))
            m = re.match(r"f\.?\s*(\d+\s*[rv])$", et)
            if m:
                imagenes[re.sub(r"\s+", "", m.group(1))] = im.get("numeroImagen")

    existentes = {e["folio"] for e in mapa["entries"]}
    por_folio = {f["folio"]: f for f in val["folioLocus"]}
    nuevos = 0
    enriquecidos = 0

    for folio in sorted(por_folio, key=folio_key):
        reg = por_folio[folio]
        entradas = sorted({x for x in reg["loci"]})
        if folio in existentes:
            # Folio ya verificado: se añade sólo la referencia a la collatio, sin tocar su estado.
            e = next(x for x in mapa["entries"] if x["folio"] == folio)
            ya = {l["locus"] for l in e.get("loci", [])}
            añadidos = [l for l in entradas if l not in ya]
            if añadidos:
                for l in añadidos:
                    e.setdefault("loci", []).append({
                        "locus": l, "extent": "attested",
                        "status": "collatio_autoral",
                        "note": "Documentado en la collatio del Apéndice T de las ediciones impresas; "
                                "no sustituye la verificación por rúbrica de este folio.",
                    })
                e.setdefault("collatio_entries", []).extend(reg["entradas"])
                enriquecidos += 1
            continue
        mapa["entries"].append({
            "folio": folio,
            "image_number": imagenes.get(folio),
            "folio_status": "collatio_autoral",
            "collatio_entries": reg["entradas"],
            "loci": [{"locus": l, "extent": "attested", "status": "collatio_autoral",
                      "note": "Lectura consignada en la collatio del Apéndice T, con el folio citado por el autor. "
                              "Transcripción diplomática del folio pendiente."} for l in entradas],
        })
        nuevos += 1

    mapa["entries"].sort(key=lambda e: folio_key(e["folio"]))
    mapa.setdefault("status_labels", {})["collatio_autoral"] = (
        "Folio citado en la collatio del Apéndice T de las ediciones impresas, con lectura del testimonio "
        "y valoración editorial. Comprobado por doble fuente bilingüe y por coherencia con el orden del "
        "códice; la transcripción diplomática del folio sigue pendiente.")
    mapa["updated"] = datetime.date.today().isoformat()
    mapa["method"] = mapa.get("method", "") + (
        " · Ampliado el " + datetime.date.today().isoformat() + " con los folios documentados en la collatio "
        "del autor (Apéndice T), que no se infieren de la numeración moderna sino que están nombrados en "
        "tablas impresas y pasaron los controles de data/apparatus/collatio-validada.json.")
    mapa.setdefault("sources", {})["collatio"] = "data/apparatus/collatio-validada.json"

    MAPA.write_text(json.dumps(mapa, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    total = len(mapa["entries"])
    conimg = sum(1 for e in mapa["entries"] if e.get("image_number"))
    print(f"→ {MAPA.relative_to(ROOT)}")
    print(f"   folios antes: {len(existentes)} | nuevos: {nuevos} | enriquecidos: {enriquecidos} | total: {total}")
    print(f"   con número de imagen resuelto: {conimg} de {total}")
    print("   serie: " + ", ".join(f"{e['folio']}" for e in mapa["entries"][:30]))


if __name__ == "__main__":
    main()
