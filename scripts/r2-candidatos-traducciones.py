#!/usr/bin/env python3
"""Propone traducciones de dominio público para las obras alojadas que no tienen ninguna.

De las ediciones alojadas en R2, las bilingües (Loeb y similares) ya traen la
traducción inglesa enfrentada. Las demás están sólo en lengua original: sin una
traducción, la obra se puede consultar pero casi no se puede leer.

Este guion busca en Internet Archive una traducción castellana, inglesa o
francesa de dominio público para cada una de esas obras y la añade a
data/r2/clasicos-candidatos.json como candidata declarada —con «justificacion»,
porque la regla de no repetición sólo admite una segunda edición de una obra ya
alojada cuando está justificada—. La descarga y la verificación las hace después
scripts/r2-importar-clasicos.py, que es quien comprueba derechos, capa de texto
y huella SHA-256.

No afirma que la traducción sea buena ni la atribuye sin datos: guarda el
identificador de Internet Archive y el idioma declarado allí, y deja constancia
de que la edición debe revisarse antes de darla por académica.

Uso: python3 scripts/r2-candidatos-traducciones.py [--limite N] [--idiomas es,en,fr]
"""
import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOGO = ROOT / "data/r2/catalogo-clasicos-r2.json"
CANDIDATOS = ROOT / "data/r2/clasicos-candidatos.json"
UA = {"User-Agent": "VitruviusDigitalLibrary/1.0 (+https://vitruvius-digital-library.org)"}
IDIOMAS = {"es": ("Spanish", "castellana"), "en": ("English", "inglesa"), "fr": ("French", "francesa")}


def buscar(creador, titulos, idioma, anio_max):
    consulta = (f'creator:({creador}) AND mediatype:texts AND language:({IDIOMAS[idioma][0]}) '
                f'AND date:[1800-01-01 TO {anio_max}-12-31] AND (' +
                " OR ".join(f'title:("{t}")' for t in titulos) + ")")
    url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
        {"q": consulta, "rows": 5, "output": "json", "sort[]": "downloads desc"}) + "&fl[]=identifier&fl[]=title&fl[]=year"
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
        datos = json.loads(r.read())
    return (datos.get("response") or {}).get("docs") or []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limite", type=int, default=0)
    ap.add_argument("--idiomas", default="es,en,fr")
    args = ap.parse_args()
    idiomas = [i for i in args.idiomas.split(",") if i in IDIOMAS]

    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    candidatos = json.loads(CANDIDATOS.read_text(encoding="utf-8"))
    anio_max = candidatos["limites"]["anioMaximo"]
    ya = {o["id"] for o in candidatos["obras"]}
    por_id = {o["id"]: o for o in candidatos["obras"]}

    faltan = [x for x in catalogo["items"] if not x.get("bilingueLoeb")]
    if args.limite:
        faltan = faltan[:args.limite]
    print(f"{len(faltan)} ediciones alojadas sin traducción en el propio volumen.")

    nuevos = []
    for obra in faltan:
        origen = por_id.get(obra["id"]) or {}
        creador = origen.get("creador") or obra["autor"].split()[-1].lower()
        titulos = origen.get("titulo") or [obra["obra"].split("(")[0].strip().lower()]
        for idioma in idiomas:
            nuevo_id = f"{obra['id']}-{idioma}"
            if nuevo_id in ya:
                continue
            try:
                docs = buscar(creador, titulos, idioma, anio_max)
            except Exception as e:  # noqa: BLE001
                print(f"  ! {obra['id']} ({idioma}): {e}")
                continue
            time.sleep(1)
            if not docs:
                continue
            doc = docs[0]
            nuevos.append({
                "id": nuevo_id,
                "autor": obra["autor"],
                "obra": f"{obra['obra']} — traducción {IDIOMAS[idioma][1]}",
                "lengua": idioma,
                "titulo": titulos,
                "creador": creador,
                "preferirIdentificador": doc.get("identifier"),
                "traduccionDe": obra["id"],
                "justificacion": (f"Traducción {IDIOMAS[idioma][1]} de dominio público de una obra ya alojada "
                                  f"sólo en lengua original; edición por revisar antes de darla por académica."),
            })
            print(f"  + {nuevo_id}: {doc.get('identifier')} ({doc.get('year') or 's. f.'})")
            break  # una traducción por obra y tanda

    if not nuevos:
        print("Sin candidatas nuevas.")
        return
    candidatos["obras"].extend(nuevos)
    CANDIDATOS.write_text(json.dumps(candidatos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"\n{len(nuevos)} traducciones añadidas como candidatas. Las incorpora la próxima tanda.")


if __name__ == "__main__":
    main()
