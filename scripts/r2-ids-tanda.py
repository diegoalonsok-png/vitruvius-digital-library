#!/usr/bin/env python3
"""IDs únicos de todas las ediciones R2 incorporadas en una tanda.

La primera pasada descarga originales y traducciones ya candidatas; la segunda
puede añadir traducciones encontradas tras la incorporación de los originales.
Se conservan ambos informes para que ningún índice pierda obras.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = [ROOT / "r2-clasicos-informe-originales.json", ROOT / "r2-clasicos-informe.json"]
result, seen = [], set()
for path in REPORTS:
    if not path.exists():
        continue
    for wid in json.loads(path.read_text(encoding="utf-8")).get("incorporadas", []):
        if wid not in seen:
            seen.add(wid)
            result.append(wid)
print(",".join(result))
