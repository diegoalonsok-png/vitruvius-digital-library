# -*- coding: utf-8 -*-
"""Índice liviano del latín de las ediciones del autor para la concordancia KWIC.

Sólo locus y latín (sin traducciones), en el orden del tratado:
data/index/latin-texto.json con V514 (recensio-es) y V297 (theory-en).
"""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
out = {"schema": "latin-texto/1", "fuente": "data/structured/recensio-es.json y theory-en.json", "ediciones": {}}
for clave, sig in (("recensio-es", "V514"), ("theory-en", "V297")):
    P = json.load(open(R + f"data/structured/{clave}.json", encoding="utf-8"))["passages"]
    out["ediciones"][sig] = [[p["locus"], p["latin"]] for p in P if (p.get("latin") or "").strip()]
json.dump(out, open(R + "data/index/latin-texto.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print({k: len(v) for k, v in out["ediciones"].items()}, os.path.getsize(R + "data/index/latin-texto.json") // 1024, "KB")
