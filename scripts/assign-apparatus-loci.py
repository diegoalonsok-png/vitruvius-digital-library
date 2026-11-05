#!/usr/bin/env python3
"""Completa el locus de las entradas del aparato que no lo tienen.

- Bloques del aparato: si el encabezado menciona un locus (p. ej., «I.2.1») y la página no tiene
  pasaje asociado, se usa esa mención («mención explícita en el encabezado»).
- Notas al pie: se ubican por su posición en el documento del autor (párrafo de origen) respecto de
  los párrafos de cada pasaje. Antes del primer pasaje: «introducción de la edición»; después del
  último: «apéndices». En medio: el pasaje inmediatamente anterior («locus estimado por posición»).
Se ejecuta después de scripts/build-apparatus-index.py.
"""
import bisect
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
idx_path = ROOT / "data/apparatus-index.json"
idx = json.loads(idx_path.read_text(encoding="utf8"))
notes = json.loads((ROOT / "data/critical-notes.json").read_text(encoding="utf8"))["entries"]
para = {(n["edition"], str(n["footnote_id"])): n.get("source_paragraph") for n in notes}
maps = {}
for ed in ("recensio-es", "recensio-fr", "theory-en"):
    ps = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))["passages"]
    pairs = sorted((min(p["source_paragraphs"]), p["locus"]) for p in ps if p.get("source_paragraphs"))
    last = max(max(p["source_paragraphs"]) for p in ps if p.get("source_paragraphs"))
    maps[ed] = ([a for a, _ in pairs], [b for _, b in pairs], last)
stats = {"bloques": 0, "notas": 0, "introduccion": 0, "apendices": 0}
for e in idx["entries"]:
    if e.get("loci"):
        continue
    if e["source"] == "bloque" and e.get("locusMention"):
        e["loci"] = [e["locusMention"]]
        e["locusLink"] = "mención explícita en el encabezado"
        stats["bloques"] += 1
    elif e["source"] == "nota":
        sp = para.get((e["edition"], e["id"].split("-n")[-1]))
        starts, loci, last = maps[e["edition"]]
        if sp is None:
            continue
        if sp < starts[0]:
            e["locusLink"] = "introducción de la edición"
            e["section"] = "introducción"
            stats["introduccion"] += 1
        elif sp > last + 3:
            e["locusLink"] = "apéndices y estudios finales"
            e["section"] = "apéndices"
            stats["apendices"] += 1
        else:
            i = bisect.bisect_right(starts, sp) - 1
            e["loci"] = [loci[max(0, i)]]
            e["locusLink"] = "locus estimado por posición en el documento"
            stats["notas"] += 1
idx["method"] = idx.get("method", "") + " Las entradas sin locus en la página se completan con la mención del encabezado o, en las notas, por la posición en el documento (marcado como estimado)."
idx_path.write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
left = sum(1 for e in idx["entries"] if not e.get("loci") and not e.get("section"))
print(stats, "sin ubicar:", left)
