#!/usr/bin/env python3
"""Recuento reproducible de los totales que muestra onomasticon.html.

La página declaraba 57.639 palabras latinas. Ninguna convención de recuento
aplicada al texto actual de V514 devuelve esa cifra: la más natural da 57.654 y
la separación por espacios 57.610. La cifra venía de un estado anterior del
texto y no se recalculó tras una corrección, de modo que la página mostraba un
número que nadie podía reproducir.

Aquí se recalculan los totales desde el texto y se declara la convención, para
que cualquiera pueda repetir la cuenta:

  palabra latina  carrera máxima de letras latinas, una vez retirado el griego.
                  Incluye los numerales en versales (XII, VIIII), que son
                  palabras del texto; se informa su número por separado.
  palabra griega  carrera máxima de caracteres del bloque griego.

Los demás totales (fichas, personas, lugares, pasajes, capítulos) se verificaron
exactos contra los datos y se recalculan igual para que no vuelvan a desfasarse.

Uso: python3 scripts/recount-onomasticon-totals.py
"""
import json, re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
GRIEGO = re.compile(r"[Ͱ-Ͽἀ-῿]+")
LATINA = re.compile(r"[A-Za-zÀ-ÿ]+")
ROMANO = re.compile(r"^[IVXLCDM]+$")


def main():
    st = json.loads((ROOT / "data/structured/recensio-es.json").read_text(encoding="utf8"))
    P = st["passages"]
    lat = grk = rom = 0
    for p in P:
        texto = p.get("latin", "")
        grk += len(GRIEGO.findall(texto))
        for w in LATINA.findall(GRIEGO.sub(" ", texto)):
            lat += 1
            if ROMANO.match(w):
                rom += 1

    f = ROOT / "data/onomasticon-vitruvianum.json"
    doc = json.loads(f.read_text(encoding="utf8"))
    ent = doc["entities"]
    antes = dict(doc.get("totals") or {})
    doc["totals"] = {
        "latinWords": lat,
        "greekWords": grk,
        "allWords": lat + grk,
        "romanNumeralsIncludedInLatinWords": rom,
        "passages": len(P),
        "books": len({p["book"] for p in P}),
        "chapters": len({(p["book"], p["chapter"]) for p in P}),
        "curatedEntries": len(ent),
        "persons": sum(1 for e in ent if e.get("kind") == "person"),
        "places": sum(1 for e in ent if e.get("kind") == "place"),
        "personsWithLocus": sum(1 for e in ent if e.get("kind") == "person" and e.get("loci")),
        "placesWithLocus": sum(1 for e in ent if e.get("kind") == "place" and e.get("loci")),
        "greekNameReferences": sum(1 for e in ent if e.get("greek_name")),
        "entriesWithLiteralLatinForms": sum(1 for e in ent if e.get("latin_forms")),
        "entriesWithProsopographicAuthority": sum(1 for e in ent if e.get("source")),
    }
    doc["countingConvention"] = (
        "Palabra latina: carrera máxima de letras latinas en el campo «latin» de los pasajes de "
        "data/structured/recensio-es.json, una vez retirado el bloque griego. Los numerales en versales "
        f"(XII, VIIII) se cuentan como palabras y son {rom} del total. Palabra griega: carrera máxima de "
        "caracteres del bloque griego. Recuento reproducible con scripts/recount-onomasticon-totals.py; "
        "no es un recuento diplomático del Codex H.")
    doc.setdefault("revisions", []).append({
        "date": datetime.date.today().isoformat(),
        "change": ("Totales recalculados desde el texto. La cifra anterior de palabras latinas "
                   f"({antes.get('latinWords')}) no era reproducible con ninguna convención aplicada al "
                   f"texto vigente; el recuento declarado da {lat}. Las demás cifras se verificaron "
                   "exactas y se recalculan igual para que no se desfasen."),
        "script": "scripts/recount-onomasticon-totals.py",
    })
    f.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf8")

    print(f"→ {f.relative_to(ROOT)}")
    for k, v in doc["totals"].items():
        prev = antes.get(k)
        marca = "" if prev is None or prev == v else f"   (antes {prev})"
        print(f"   {k:38s} {v}{marca}")


if __name__ == "__main__":
    main()
