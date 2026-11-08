#!/usr/bin/env python3
"""Compactación SIN PÉRDIDA de JSON DERIVADOS; jamás originales, traducciones o facsímiles.

Sólo reduce espacios de serialización; las estructuras y cadenas permanecen idénticas.
Puede regenerarse cuando se publiquen nuevos índices. No borra ni reubica archivos.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = (
    "data/classical-dictionary.json",
    "data/lexicon/dictionary-la.json",
    "data/lexicon/dictionary-grc.json",
    "data/lexicon/forms-la.json",
    "data/lexicon/forms-grc.json",
)
if __name__ == "__main__":
    savings = 0
    for relative in TARGETS:
        path = ROOT / relative
        if not path.is_file():
            print(f"SKIP inexistente: {relative}")
            continue
        source = path.read_bytes()
        data = json.loads(source.decode("utf-8-sig"))
        output = (json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        if json.loads(output) != data:
            raise AssertionError("El JSON compactado cambió contenido: " + relative)
        reduced = len(source) - len(output)
        if reduced > 0:
            path.write_bytes(output)
            savings += reduced
        print(f"{relative}: original={len(source)}B optimizado={len(output)}B ahorro={max(reduced,0)}B")
    print(f"AHORRO TOTAL DERIVADOS: {savings} bytes. Ediciones textuales, PDF e imágenes intactos.")
