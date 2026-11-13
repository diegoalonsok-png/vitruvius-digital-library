#!/usr/bin/env python3
"""Regla de no repetición: una obra que ya está en la biblioteca no se vuelve a subir.

La biblioteca tiene tres lugares donde puede estar una obra: las fichas del
repertorio (data/bibliotheca-graeca-latina-I-bce-I-ce.json), las ediciones en
facsímil alojadas en R2 (data/r2/catalogo-clasicos-r2.json) y los PDF que ya
están en el repositorio (documents/). Este módulo las reúne bajo una clave
normalizada de autor y obra, para que el importador salte lo que ya existe.

La excepción es deliberada: una edición histórica o académica distinta de la
misma obra SÍ se admite, y el candidato tiene que declararla con el campo
«justificacion» en data/r2/clasicos-candidatos.json. Sin esa declaración, la
obra repetida se salta.

No borra nada: sólo informa y decide si corresponde subir.

Uso: python3 scripts/r2-duplicados.py [--json]
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPERTORIO = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
CATALOGO_R2 = ROOT / "data/r2/catalogo-clasicos-r2.json"
DOCUMENTOS = [ROOT / "documents/clasicos", ROOT / "documents/classics"]
VACIAS = {"de", "del", "la", "las", "los", "el", "y", "e", "liber", "libri", "libro", "libros",
          "vol", "volumen", "obras", "opera", "con", "sobre", "the", "and", "of", "ed", "trad"}


def plegar(texto):
    sin = unicodedata.normalize("NFD", str(texto or "")).encode("ascii", "ignore").decode().lower()
    return [p for p in re.split(r"[^a-z0-9]+", sin) if p and p not in VACIAS]


def clave(autor, obra):
    """Clave de obra: apellido o nombre principal del autor + palabras significativas del título."""
    a = plegar(autor)[:2]
    o = sorted(set(plegar(obra)))[:3]
    return " ".join(a + o)


def leer(ruta):
    return json.loads(ruta.read_text(encoding="utf-8"))


def inventario():
    rep = leer(REPERTORIO)["works"]
    cat = leer(CATALOGO_R2)["items"] if CATALOGO_R2.exists() else []
    inv = {}
    for w in rep:
        inv.setdefault(clave(w["author"], w["title"]), {"fichas": [], "r2": [], "documentos": []})["fichas"].append(w["id"])
        for alias in w.get("aliases") or []:
            inv.setdefault(clave(w["author"], alias), {"fichas": [], "r2": [], "documentos": []})["fichas"].append(w["id"])
    for x in cat:
        inv.setdefault(clave(x["autor"], x["obra"]), {"fichas": [], "r2": [], "documentos": []})["r2"].append(x["id"])
    for carpeta in DOCUMENTOS:
        if not carpeta.is_dir():
            continue
        for archivo in sorted(carpeta.iterdir()):
            if archivo.suffix.lower() not in (".pdf", ".docx"):
                continue
            partes = plegar(archivo.stem)
            if not partes:
                continue
            k = " ".join(partes[:1] + sorted(set(partes[1:]))[:3])
            inv.setdefault(k, {"fichas": [], "r2": [], "documentos": []})["documentos"].append(
                str(archivo.relative_to(ROOT)))
    return inv


def ya_esta(candidato, inv=None):
    """(True, motivo) si la obra ya está en la biblioteca y el candidato no justifica otra edición."""
    inv = inv if inv is not None else inventario()
    titulos = candidato.get("titulo") or [candidato.get("obra", "")]
    for titulo in [candidato.get("obra", "")] + list(titulos):
        entrada = inv.get(clave(candidato.get("autor", ""), titulo))
        if not entrada:
            continue
        if entrada["r2"]:
            if candidato.get("justificacion"):
                return False, f"edición distinta declarada: {candidato['justificacion']}"
            return True, f"ya alojada en R2 como {', '.join(entrada['r2'])}"
        if entrada["documentos"] and not candidato.get("justificacion"):
            return True, f"ya en el repositorio: {', '.join(entrada['documentos'])}"
    return False, ""


def main():
    inv = inventario()
    repetidas = {k: v for k, v in inv.items()
                 if sum(bool(v[x]) for x in ("fichas", "r2", "documentos")) > 1 or len(v["r2"]) > 1}
    if "--json" in sys.argv:
        print(json.dumps({"obras": len(inv), "repetidas": repetidas}, ensure_ascii=False, indent=1))
        return
    print(f"{len(inv)} claves de obra en la biblioteca (fichas, facsímiles R2 y PDF del repositorio).")
    sin_justificar = {k: v for k, v in repetidas.items() if len(v["r2"]) > 1}
    print(f"\nObras con más de una edición en R2 (revisar si se justifican): {len(sin_justificar)}")
    for k, v in sin_justificar.items():
        print(f"  {k}: {', '.join(v['r2'])}")
    print(f"\nObras presentes en más de un lugar (normal: ficha + facsímil): {len(repetidas) - len(sin_justificar)}")
    for k, v in list(repetidas.items())[:12]:
        if len(v["r2"]) > 1:
            continue
        donde = [f"{len(v['fichas'])} ficha(s)" if v["fichas"] else "", f"R2: {','.join(v['r2'])}" if v["r2"] else "",
                 f"repo: {len(v['documentos'])} archivo(s)" if v["documentos"] else ""]
        print(f"  {k}: " + " · ".join(x for x in donde if x))
    if len(repetidas) - len(sin_justificar) > 12:
        print("  …")


if __name__ == "__main__":
    main()
