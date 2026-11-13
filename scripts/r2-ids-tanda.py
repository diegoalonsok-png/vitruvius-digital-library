#!/usr/bin/env python3
"""Imprime, separados por coma, los ids de las obras incorporadas en la tanda.

Lee el informe que deja scripts/r2-importar-clasicos.py. Si no hay informe o la
tanda no incorporó nada, no imprime nada: el flujo diario lo interpreta como
«no hay que reindexar».
"""
import json
from pathlib import Path

INFORME = Path(__file__).resolve().parents[1] / "r2-clasicos-informe.json"

if INFORME.exists():
    datos = json.loads(INFORME.read_text(encoding="utf-8"))
    print(",".join(datos.get("incorporadas") or []))
