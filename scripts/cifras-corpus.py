#!/usr/bin/env python3
"""Escribe data/cifras-corpus.json: las cifras del corpus clásico, en un archivo chico.

Las páginas traían el número de obras escrito a mano (222). Si la biblioteca
incorpora obras todos los días, cualquier número escrito a mano queda viejo al
día siguiente. Este guion deja las cifras en un archivo de unos cientos de bytes
que assets/cifra-obras.js lee para completar los rótulos.

Las cifras se toman de los datos, no se declaran aquí: el repertorio, del
catálogo maestro; los facsímiles y las páginas indexadas, de los manifiestos de
R2. Si un dato no está, no se inventa: queda fuera.

Uso: python3 scripts/cifras-corpus.py
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SALIDA = ROOT / "data/cifras-corpus.json"
FUENTES = {
    "repertorio": ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json",
    "r2": ROOT / "data/r2/catalogo-clasicos-r2.json",
    "indice": ROOT / "data/r2/indice-semantico-manifest.json",
    "registro": ROOT / "data/classics-corpus/search-registry.json",
}


def leer(ruta):
    return json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else None


def main():
    repertorio = leer(FUENTES["repertorio"])
    r2 = leer(FUENTES["r2"])
    indice = leer(FUENTES["indice"])
    registro = leer(FUENTES["registro"])
    if not repertorio:
        raise SystemExit("Falta el catálogo maestro")

    cifras = {
        "schema": "vdl-cifras-corpus-1",
        "actualizado": date.today().isoformat(),
        "obras": len(repertorio["works"]),
        "nota": "Obras del repertorio grecolatino. Facsímiles y páginas indexadas se alojan en Cloudflare R2.",
    }
    if r2:
        propios = [x for x in r2["items"] if not x.get("coleccion")]
        recepcion = [x for x in r2["items"] if x.get("coleccion") == "recepcion-vitruviana"]
        cifras["facsimiles"] = len(propios)
        if recepcion:
            cifras["recepcionVitruviana"] = len(recepcion)
    if indice:
        cifras["obrasIndexadasR2"] = indice.get("obras")
        cifras["paginasIndexadasR2"] = indice.get("paginasIndexadas")
    if registro:
        # Contar las entradas, no los campos declarados: el texto alojado en R2
        # no quedaba contado y la página anunciaba obras sin texto que ya lo tienen.
        entradas = registro.get("entries") or []
        cifras["versionesTextuales"] = len(entradas) or registro.get("count")
        cifras["obrasConTextoIndexado"] = len({e.get("workId") for e in entradas}) or registro.get("works")

    SALIDA.write_text(json.dumps(cifras, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(cifras, ensure_ascii=False))


if __name__ == "__main__":
    main()
