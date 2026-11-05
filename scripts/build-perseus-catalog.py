#!/usr/bin/env python3
"""Catálogo de lectura en línea: autores del siglo II a. C. al siglo II d. C. en Perseus Digital Library.

No se copian los textos al repositorio (límite de espacio de GitHub): el visor los lee en el momento desde
raw.githubusercontent.com/PerseusDL (TEI EpiDoc, CC BY-SA 4.0). Este script solo guarda el índice.
Entrada: un listado de rutas de canonical-latinLit y canonical-greekLit con título de cada obra
(se obtiene con `git ls-tree` y los archivos __cts__.xml; ver comentario al pie).
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUTHORS = {  # id: (nombre en castellano, fechas, año para ordenar, lengua)
 "phi0119": ("Plauto", "c. 254–184 a. C.", -254), "phi0134": ("Terencio", "c. 195–159 a. C.", -195),
 "tlg0543": ("Polibio", "c. 200–118 a. C.", -200), "tlg0527": ("Septuaginta (Antiguo Testamento griego)", "s. III–I a. C.", -250),
 "phi0474": ("Cicerón", "106–43 a. C.", -106), "phi0448": ("Julio César", "100–44 a. C.", -100),
 "phi0428": ("Pseudo-César", "s. I a. C.", -50), "phi0430": ("Pseudo-César", "s. I a. C.", -50),
 "phi0588": ("Cornelio Nepote", "c. 110–24 a. C.", -110), "phi0550": ("Lucrecio", "c. 99–55 a. C.", -99),
 "phi0631": ("Salustio", "86–35 a. C.", -86), "phi0472": ("Catulo", "c. 84–54 a. C.", -84),
 "tlg0060": ("Diodoro Sículo", "s. I a. C.", -80), "phi0690": ("Virgilio", "70–19 a. C.", -70),
 "phi0692": ("Appendix Vergiliana", "s. I a. C.–s. I d. C.", -60), "phi0893": ("Horacio", "65–8 a. C.", -65),
 "tlg0099": ("Estrabón", "c. 64 a. C.–24 d. C.", -64), "tlg0081": ("Dionisio de Halicarnaso", "c. 60–7 a. C.", -60),
 "phi0914": ("Tito Livio", "59 a. C.–17 d. C.", -59), "phi1014": ("Séneca el Viejo", "c. 54 a. C.–39 d. C.", -54),
 "phi0660": ("Tibulo", "c. 55–19 a. C.", -55), "phi0620": ("Propercio", "c. 50–15 a. C.", -50),
 "phi0959": ("Ovidio", "43 a. C.–17 d. C.", -43), "phi1038": ("Valerio Máximo", "s. I d. C.", 14),
 "phi0975": ("Fedro", "c. 15 a. C.–50 d. C.", -15), "phi1017": ("Séneca", "c. 4 a. C.–65 d. C.", -4),
 "phi0845": ("Columela", "4–c. 70 d. C.", 4), "phi0978": ("Plinio el Viejo", "23–79 d. C.", 23),
 "phi0860": ("Quinto Curcio Rufo", "s. I d. C.", 40), "tlg0031": ("Nuevo Testamento", "s. I d. C.", 50),
 "phi0917": ("Lucano", "39–65 d. C.", 39), "phi0972": ("Petronio", "m. 66 d. C.", 27),
 "tlg0526": ("Flavio Josefo", "37–c. 100 d. C.", 37), "phi1002": ("Quintiliano", "c. 35–c. 100 d. C.", 35),
 "phi1294": ("Marcial", "c. 40–104 d. C.", 40), "phi1020": ("Estacio", "c. 45–96 d. C.", 45),
 "phi1345": ("Silio Itálico", "c. 26–101 d. C.", 26), "phi1035": ("Valerio Flaco", "m. c. 90 d. C.", 45),
 "tlg0612": ("Dión de Prusa", "c. 40–c. 115 d. C.", 40), "tlg0007": ("Plutarco", "c. 46–c. 120 d. C.", 46),
 "phi1351": ("Tácito", "c. 56–c. 120 d. C.", 56), "tlg0557": ("Epicteto (por Arriano)", "c. 50–c. 135 d. C.", 50),
 "phi1318": ("Plinio el Joven", "61–c. 113 d. C.", 61), "phi1276": ("Juvenal", "s. I–II d. C.", 60),
 "phi1348": ("Suetonio", "c. 69–c. 122 d. C.", 69), "phi1242": ("Floro", "s. II d. C.", 74),
 "tlg0074": ("Arriano", "c. 86–c. 160 d. C.", 86), "tlg0551": ("Apiano", "c. 95–c. 165 d. C.", 95),
 "tlg0363": ("Claudio Ptolomeo", "c. 100–c. 170 d. C.", 100), "tlg0525": ("Pausanias", "c. 110–c. 180 d. C.", 110),
 "tlg0284": ("Elio Arístides", "117–c. 181 d. C.", 117), "tlg0562": ("Marco Aurelio", "121–180 d. C.", 121),
 "phi1212": ("Apuleyo", "c. 124–c. 170 d. C.", 124), "phi1254": ("Aulo Gelio", "c. 125–c. 180 d. C.", 125),
 "tlg0062": ("Luciano de Samósata", "c. 125–c. 180 d. C.", 125), "tlg0057": ("Galeno", "129–c. 216 d. C.", 129),
}

def main(meta_path):
    meta = json.load(open(meta_path, encoding="utf-8"))
    works = []
    for key, v in meta.items():
        tg, w = key.split(".")
        if tg not in AUTHORS:
            continue
        lang = "grc" if v["repo"] == "canonical-greekLit" else "la"
        files = v["files"]
        orig = sorted(f for f in files if re.search(r"\.perseus-(lat|grc)\d+\.xml$", f))
        eng = sorted(f for f in files if re.search(r"\.perseus-eng\d+\.xml$", f))
        if not orig:
            continue
        base = f"https://raw.githubusercontent.com/PerseusDL/{v['repo']}/master/data/{tg}/{w}/"
        name, dates, year = AUTHORS[tg]
        title = v["title"] if v["title"] != w else {"phi0690.phi001": "Eclogae"}.get(key, v["title"])
        works.append({"urn": f"urn:cts:{'greekLit' if lang == 'grc' else 'latinLit'}:{key}", "id": key, "authorId": tg,
                      "author": name, "dates": dates, "year": year, "title": title, "language": lang,
                      "original": base + orig[-1], "translations": [{"language": "en", "url": base + e} for e in eng]})
    works.sort(key=lambda x: (x["year"], x["author"], x["id"]))
    out = {"schema": "vitruvius-classics-perseus/1", "updated": "2026-11-05",
           "scope": "Autores del siglo II a. C. al siglo II d. C. con texto TEI en Perseus Digital Library",
           "license": "Textos y traducciones: Perseus Digital Library (Tufts University), CC BY-SA 4.0; se leen desde GitHub en el momento, sin copia en este repositorio.",
           "authors": len({w["authorId"] for w in works}), "works": works}
    (ROOT / "data/clasicos-perseus.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(works), "obras ·", out["authors"], "autores ·", sum(1 for w in works if w["translations"]), "con traducción inglesa")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/perseus/meta.json")
# Para regenerar meta.json: clonar PerseusDL/canonical-latinLit y canonical-greekLit con
# `git clone --filter=blob:none --no-checkout --depth 1`, listar rutas con `git ls-tree -r --name-only HEAD`
# y leer ti:groupname y ti:title de los __cts__.xml de cada autor y obra.
