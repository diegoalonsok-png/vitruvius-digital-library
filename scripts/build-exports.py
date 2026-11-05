#!/usr/bin/env python3
"""Exportaciones descargables (CSV, UTF-8 con BOM) para la página de datos.

Solo índices y metadatos derivados: no se exporta el texto de las traducciones ni del
aparato de Diego Kurilo, que conservan sus derechos (consulta y cita).
"""
import csv
import io
import json
import pathlib
import re
import unicodedata
from collections import Counter, defaultdict

OUT = pathlib.Path("data/export")
OUT.mkdir(parents=True, exist_ok=True)


def write(name, header, rows):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    (OUT / name).write_text("﻿" + buf.getvalue(), encoding="utf-8")
    print(name, len(rows))


def fold(w):
    w = unicodedata.normalize("NFD", w)
    return "".join(c for c in w if unicodedata.category(c) != "Mn").lower().replace("v", "u").replace("j", "i")


corpus = json.load(open("data/structured/recensio-es.json", encoding="utf-8"))["passages"]

# 1. Loci de De architectura (estructura citable)
write("vitruvius-loci.csv", ["locus", "libro", "capitulo", "seccion", "palabras_latinas", "pagina_pdf_V514"],
      [[p["locus"], p["book"], p["chapter"], p["section"], len(re.findall(r"[A-Za-z]+", p.get("latin", ""))),
        (p.get("pdf_pages") or {}).get("latin", "")] for p in corpus])

# 2. Concordancia de folios del Codex Harleianus
m = json.load(open("data/codex-h/folio-locus-map.json", encoding="utf-8"))
rows = []
for e in m["entries"]:
    for l in e.get("loci", []):
        rows.append([e["folio"], e.get("image_number", ""), l["locus"], l.get("extent", ""), l.get("status", e.get("folio_status", "")), l.get("note", "")])
write("codex-h-folios-loci.csv", ["folio", "imagen", "locus", "alcance", "evidencia", "nota"], rows)
write("codex-h-libros.csv", ["libro", "inicio", "capitulo_1", "fin", "evidencia"],
      [[b["book"], b.get("start", ""), b.get("chapter1", ""), b.get("end", ""), b.get("status", "")] for b in m.get("books", [])])

# 3. Índice de lemas latinos (CLTK + Lewis & Short) sobre el texto latino V514
g = json.load(open("data/classics-lexicon/vitruvius-la.json", encoding="utf-8"))
occ, forms, loci = Counter(), defaultdict(Counter), defaultdict(set)
for p in corpus:
    for w in re.findall(r"[A-Za-z]+", p.get("latin", "")):
        lem = g["forms"].get(fold(w))
        if not lem:
            continue
        occ[lem[0]] += 1
        forms[lem[0]][w.lower()] += 1
        loci[lem[0]].add(p["locus"])
write("vitruvius-lemas.csv", ["lema", "entrada_lewis_short", "apariciones", "loci", "formas", "glosa_inglesa_lewis_short"],
      [[re.sub(r"\d+$", "", l), g["lemmas"].get(l, {}).get("h", ""), n, len(loci[l]),
        " ".join(f for f, _ in forms[l].most_common()), g["lemmas"].get(l, {}).get("g", "")] for l, n in occ.most_common()])

# 4. Colación: alineación con Rose (1899) y Krohn (1912)
c = json.load(open("data/collation-loci.json", encoding="utf-8"))
write("colacion-rose-krohn.csv", ["locus", "testigo", "pagina", "pagina_final", "semejanza"],
      [[l, w, r["page"], r.get("pageEnd") or "", r["score"]] for l, ws in c["loci"].items() for w, r in ws.items()])

# 5. Aparato crítico: metadatos (sin el texto de las notas)
a = json.load(open("data/apparatus-index.json", encoding="utf-8"))
write("aparato-indice.csv", ["id", "edicion", "version", "tipo", "pagina", "loci", "referencias"],
      [[e["id"], e["edition"], e["version"], e["kind"], e.get("page", ""), " ".join(e.get("loci") or []), " ".join(e.get("references") or [])] for e in a["entries"]])
