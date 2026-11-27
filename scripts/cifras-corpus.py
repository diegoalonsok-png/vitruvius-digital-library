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
    "vinculos": ROOT / "data/r2/vinculos-repertorio.json",
    "suplemento": ROOT / "data/bibliotheca-expansion-publicada-2026-11-16.json",
    "lexicoLocal": ROOT / "data/index/classics/manifest.json",
    "lexicoR2": ROOT / "data/index/classics-r2/manifest.json",
}


def leer(ruta):
    return json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else None


def main():
    repertorio = leer(FUENTES["repertorio"])
    r2 = leer(FUENTES["r2"])
    indice = leer(FUENTES["indice"])
    registro = leer(FUENTES["registro"])
    vinculos = leer(FUENTES["vinculos"])
    suplemento = leer(FUENTES["suplemento"])
    lexico_local = leer(FUENTES["lexicoLocal"])
    lexico_r2 = leer(FUENTES["lexicoR2"])
    if not repertorio:
        raise SystemExit("Falta el catálogo maestro")

    cifras = {
        "schema": "vdl-cifras-corpus-1",
        "actualizado": date.today().isoformat(),
        "obras": len(repertorio["works"]),
        "nota": "Obras del repertorio grecolatino. Facsímiles y páginas indexadas se alojan en Cloudflare R2.",
    }
    suplementarias = (suplemento or {}).get("works") or []
    master_ids = {w["id"] for w in repertorio["works"]}
    extra_ids = {w["id"] for w in suplementarias}
    if len(extra_ids) != len(suplementarias) or master_ids & extra_ids:
        raise SystemExit("Fichas suplementarias duplicadas o repetidas en el repertorio principal")
    cifras["obrasSuplementarias"] = len(extra_ids)
    if vinculos:
        adicionales = vinculos.get("obrasNuevas") or []
        ids = [row["r2"] for row in adicionales]
        if len(set(ids)) != len(ids):
            raise SystemExit("Obras adicionales duplicadas en vinculos-repertorio")
        if r2 and not set(ids) <= {row["id"] for row in r2["items"]}:
            raise SystemExit("Obra adicional sin facsímil declarado en R2")
        if set(ids) & {row["id"] for row in repertorio["works"]}:
            raise SystemExit("Obra adicional ya contada en el repertorio principal")
        cifras["obrasAdicionales"] = len(ids)
        if set(ids) & extra_ids:
            raise SystemExit("Obra R2 adicional también incorporada en el suplemento")
        cifras["obrasTotalesDeclaradas"] = cifras["obras"] + len(extra_ids) + len(ids)
        cifras["notaTotal"] = ("Total de fichas por identificador no duplicado: repertorio principal, "
            "obras suplementarias y obras adicionales con facsímil R2. Las versiones y ediciones se cuentan aparte.")
    if r2:
        cifras["edicionesPdfR2"] = len(r2["items"])
        propios = [x for x in r2["items"] if not x.get("coleccion")]
        recepcion = [x for x in r2["items"] if x.get("coleccion") == "recepcion-vitruviana"]
        cifras["facsimiles"] = len(propios)
        if recepcion:
            cifras["recepcionVitruviana"] = len(recepcion)
    if indice:
        cifras["obrasIndexadasR2"] = indice.get("obras")
        cifras["paginasIndexadasR2"] = indice.get("paginasIndexadas")
    # Las ediciones críticas auxiliares son versiones, no nuevas fichas.
    catalog_ids = master_ids | extra_ids | {row["r2"] for row in (vinculos or {}).get("obrasNuevas", [])}
    if registro:
        # Contar las entradas, no los campos declarados: el texto alojado en R2
        # no quedaba contado y la página anunciaba obras sin texto que ya lo tienen.
        entradas = registro.get("entries") or []
        cifras["versionesTextuales"] = len(entradas) or registro.get("count")
        registered_ids = {e["workId"] for e in entradas if e.get("workId") in catalog_ids}
        cifras["obrasConTextoRegistrado"] = len(registered_ids)
        cifras["fichasSinVersionTextualPropia"] = len(catalog_ids - registered_ids)
        cifras["versionesAuxiliaresFueraDelCatalogo"] = sum(e.get("workId") not in catalog_ids for e in entradas)
        cifras["notaRegistroTextual"] = ("Registro textual por ficha; no equivale a integridad filológica ni a índice léxico comprobado.")

    # No llamar "indexado" a un texto solamente registrado. El índice local
    # y el de R2 son sistemas distintos; contabilizar originales por ID único
    # sin sumar versiones griegas/latinas ni contar fichas sin texto.
    local_entries = (lexico_local or {}).get("index") or []
    r2_entries = (lexico_r2 or {}).get("index") or []
    cifras["edicionesLexicasLocales"] = len(local_entries)
    cifras["edicionesLexicasR2"] = len(r2_entries)
    originals = {e["id"] for e in [*local_entries, *r2_entries]
                 if e.get("lang") in {"la", "grc"}}
    for e in [*local_entries, *r2_entries]:
        for alias in e.get("gate", []):
            work_id, _, lang = alias.rpartition("|")
            if lang in {"la", "grc"}:
                originals.add(work_id)
    cifras["obrasConTextoIndexado"] = len(originals & catalog_ids)
    cifras["notaIndiceTextual"] = ("Originales del catálogo en manifiestos léxicos local y R2 clásico; "
        "no incluye automáticamente la ampliación R2, OCR ni certificación filológica.")
    expansion = leer(ROOT / "data/r2/classics-expansion-index.json") or {}
    if expansion:
        cifras["edicionesLexicasAmpliacionR2"] = expansion.get("works")
        cifras["pasajesLexicosAmpliacionR2"] = expansion.get("passages")
        cifras["notaAmpliacionR2"] = ("Cifras del descriptor de ampliación; no se suman a obras únicas "
            "por posibles coincidencias de ediciones y obras. Sin nueva prueba HTTP.")
    # Conservar el objetivo editorial vigente sin inferir cobertura textual.
    old = leer(SALIDA) or {}
    cifras["objetivoObras"] = old.get("objetivoObras", 500)
    cifras["faltanParaObjetivo"] = max(0, cifras["objetivoObras"] - len(catalog_ids))

    SALIDA.write_text(json.dumps(cifras, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(cifras, ensure_ascii=False))


if __name__ == "__main__":
    main()
