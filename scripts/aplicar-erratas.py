#!/usr/bin/env python3
"""Aplica la fe de erratas (data/index/erratas-v297-v514.json → «correcciones»)
a la edición digital y a los índices de búsqueda derivados.

No toca la transcripción de los PDF impresos (data/text/*.json, data/*-pages.json):
el PDF conserva la errata hasta una nueva tirada, y así lo indica la página de erratas.
Es idempotente: puede volver a ejecutarse tras regenerar los índices.
Uso: python3 scripts/aplicar-erratas.py
"""
import json, re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/"
ERR = json.load(open(R + "data/index/erratas-v297-v514.json", encoding="utf-8"))
DESTINOS = {  # edición → archivos de la edición digital y de búsqueda
    "V514": ["data/structured/recensio-es.json"],
    "V554": ["data/structured/recensio-fr.json"],
    "V297": ["data/structured/theory-en.json"],
    "*": ["data/vitruvius-chunks.json", "data/index/latin-texto.json", "data/lexicon/corpus-la.json"],
}
total = 0
for c in ERR["correcciones"]:
    archivos = sum((DESTINOS[e] for e in c["ediciones"]), []) + DESTINOS["*"]
    pat = re.compile(c["patron"])
    for f in archivos:
        s = open(R + f, encoding="utf-8").read()
        s2, n = pat.subn(c["reemplazo"], s)
        if n:
            open(R + f, "w", encoding="utf-8").write(s2)
            total += n
            print(f"{c['locus']}: {n} × {f}")
print("reemplazos:", total)
