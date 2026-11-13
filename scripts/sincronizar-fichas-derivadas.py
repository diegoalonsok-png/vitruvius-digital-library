#!/usr/bin/env python3
"""Propaga lo que dice el catálogo maestro a los datos que guardan copia de ello.

Varios datos derivados repiten el título, el autor, la lengua, el género, la
datación o el estado público de cada obra. Cuando una ficha se corrige en el
catálogo maestro —por ejemplo, al redactarle el título original— esas copias
quedan viejas, y las auditorías del sitio fallan con razón: la biblioteca dice
dos cosas distintas de la misma obra.

Este guion copia el dato del maestro al derivado, campo por campo, y no hace
nada más: no crea registros, no borra ninguno y no toca los campos propios de
cada auditoría (estado de indexación, testigos, recuentos).

Uso: python3 scripts/sincronizar-fichas-derivadas.py [--check]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAESTRO = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"

# destino: (archivo, clave de la lista, campo del id, {campo derivado: campo del maestro})
DESTINOS = [
    ("data/classics-corpus/coverage-audit.json", "works", "id",
     {"title": "title", "author": "author", "originalLanguage": "language",
      "genre": "genre", "dating": "dating", "catalogueStatus": "publicStatus"}),
    ("data/classics-corpus/quality-triage-222.json", "works", "id",
     {"title": "title", "author": "author", "language": "language"}),
    ("data/classics-corpus/translation-availability-222.json", "works", "id",
     {"title": "title", "author": "author", "originalLanguage": "language"}),
    ("data/perseus-provenance-audit.json", "records", "workId",
     {"title": "title", "author": "author", "originalLanguage": "language"}),
    ("data/classics-corpus/vitruvius-standard-222.json", "records", "workId", {}),
]
# El registro con la ficha anidada bajo otra clave.
#
# critical-authorities-222.json queda FUERA a propósito: es un registro de
# autoridad catalográfica y sus campos no son copia del maestro. «uniformTitle»
# guarda el título uniforme en lengua original (Διδαχὴ τῶν δώδεκα ἀποστόλων) y
# «normalizedAuthor» la forma latina de autoridad (Marcus Tullius Cicero), que
# no coinciden con el título de presentación ni con el autor en castellano.
# Igual queda fuera «readingStatus» de translation-availability, que tiene su
# propio vocabulario y no es el publicStatus del catálogo.
ANIDADOS = {
    "data/classics-corpus/vitruvius-standard-222.json": ("work", {
        "author": "author", "title": "title", "originalLanguage": "language",
        "compositionDating": "dating", "genre": "genre"}),
}
SANGRIA = {"data/perseus-provenance-audit.json": 2}


def main():
    check = "--check" in sys.argv
    maestro = {w["id"]: w for w in json.loads(MAESTRO.read_text(encoding="utf-8"))["works"]}
    total_cambios = 0

    for ruta, clave, campo_id, mapa in DESTINOS:
        archivo = ROOT / ruta
        if not archivo.exists():
            continue
        datos = json.loads(archivo.read_text(encoding="utf-8"))
        cambios = []
        for registro in datos[clave]:
            w = maestro.get(registro.get(campo_id))
            if not w:
                continue
            for destino, origen in mapa.items():
                if destino in registro and registro[destino] != w.get(origen) and w.get(origen) is not None:
                    cambios.append(f"{registro[campo_id]}.{destino}")
                    registro[destino] = w[origen]
            anidado = ANIDADOS.get(ruta)
            if anidado:
                nombre, campos = anidado
                bloque = registro.get(nombre) or {}
                for destino, origen in campos.items():
                    if destino in bloque and bloque[destino] != w.get(origen) and w.get(origen) is not None:
                        cambios.append(f"{registro[campo_id]}.{nombre}.{destino}")
                        bloque[destino] = w[origen]
        if cambios and not check:
            archivo.write_text(
                json.dumps(datos, ensure_ascii=False, indent=SANGRIA.get(ruta, 1)) + "\n", encoding="utf-8")
        total_cambios += len(cambios)
        if cambios:
            muestra = ", ".join(cambios[:4]) + (" …" if len(cambios) > 4 else "")
            print(f"{len(cambios):4d} campos · {ruta}  ({muestra})")

    if not total_cambios:
        print("Los datos derivados ya dicen lo mismo que el catálogo maestro.")
    elif check:
        print(f"\n--check: {total_cambios} campos desincronizados, no se escribió nada.")
        sys.exit(1)
    else:
        print(f"\n{total_cambios} campos puestos al día desde el catálogo maestro.")


if __name__ == "__main__":
    main()
