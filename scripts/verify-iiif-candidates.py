#!/usr/bin/env python3
"""Verifica los testimonios IIIF candidatos y añade los válidos a data/clasicos-testimonios.json.

Criterios (todos obligatorios): el manifiesto responde 200 con JSON IIIF (Presentation 2 o 3), contiene
al menos una imagen (canvas) y su rótulo o metadatos incluyen la signatura indicada en labelMustInclude.
Se ejecuta en GitHub Actions (acceso a las bibliotecas); informa de cada candidato.
"""
import json, urllib.request, datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
cand = json.loads((ROOT / "data/clasicos-testimonios-candidatos.json").read_text())
base = json.loads((ROOT / "data/clasicos-testimonios.json").read_text())
have = {w["manifest"] for w in base["witnesses"]}
today = datetime.date.today().isoformat()
added = 0
def text(x):
    if isinstance(x, str): return x
    if isinstance(x, list): return " ".join(text(i) for i in x)
    if isinstance(x, dict): return " ".join(text(v) for v in x.values())
    return ""
for w in cand["witnesses"]:
    ok = None
    for url in w["manifests"]:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "VitruvianDigitalLibrary-verifier/1.0", "Accept": "application/json"})
            m = json.loads(urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace"))
            canvases = (m.get("sequences") or [{}])[0].get("canvases") or m.get("items") or []
            lab = (text(m.get("label")) + " " + text(m.get("metadata"))).replace(" ", "").lower()
            need = w["labelMustInclude"].replace(" ", "").lower()
            print(f"{w['shelfmark']}: {url} · {len(canvases)} imágenes · rótulo {'con' if need in lab else 'SIN'} «{w['labelMustInclude']}»")
            if canvases and need in lab:
                ok = url; break
        except Exception as e:
            print(f"{w['shelfmark']}: {url} · error {e}")
    if ok and ok not in have:
        base["witnesses"].append({"match": w["match"], "shelfmark": w["shelfmark"], "name": w["name"], "date": w["date"], "library": w["library"],
                                  "manifest": ok, "oldest": w["oldest"], "note": w["note"] + f" Manifiesto verificado automáticamente el {today}."})
        added += 1
(ROOT / "data/clasicos-testimonios.json").write_text(json.dumps(base, ensure_ascii=False, indent=1))
print(f"{added} testimonios verificados añadidos")
