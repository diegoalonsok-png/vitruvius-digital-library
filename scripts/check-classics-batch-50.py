#!/usr/bin/env python3
"""Valida lote preparatorio de 50 fichas y transcripción latina de Manilio.

No declara obras preparadas como indexadas. La revisión de licencia, la
extensión crítica y la colación se mantienen pendientes.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
batch=json.loads((ROOT/"data/classics-corpus/batch-50-work-preparation-20261115.json").read_text(encoding="utf8"))
roadmap=json.loads((ROOT/"data/classics-corpus/indexation-roadmap-222.json").read_text(encoding="utf8"))
manilius=json.loads((ROOT/"data/classics-corpus/manilio-astronomica-la.json").read_text(encoding="utf8"))
ids={r["id"] for r in roadmap["items"]}
records=batch["records"]
assert batch["count"]==50==len(records)
assert len(set(x["workId"] for x in records))==50
assert all(x["workId"] in ids and x["textIndexed"] is False for x in records)
assert manilius["workId"]=="manilio-astronomica" and manilius["language"]=="la"
assert len(manilius["sourceFiles"])==5
assert len(manilius["passages"])>=300
assert len({p["locus"] for p in manilius["passages"]})==len(manilius["passages"])
assert all(p["text"].strip() for p in manilius["passages"])
assert all(p["locus"].startswith(tuple(f"{n}.seg" for n in range(1,6))) for p in manilius["passages"])
print("50 fichas preparatorias, IDs únicos; Manilio: 5 libros,",
      len(manilius["passages"]),"segmentos digitales; fuentes y derechos pendientes")
