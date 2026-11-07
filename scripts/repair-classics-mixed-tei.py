#!/usr/bin/env python3
"""Restaurar dos índices TEI de Cicerón truncados, con copia y bitácora.

No modifica la fuente editorial ni los HTML/CSS del sitio. Sólo sustituye
datos derivados después de verificar el SHA256 de la TEI y la recuperación
substancial de la prosa. Un reintento no reescribe índices ya restaurados.
"""
from __future__ import annotations

from datetime import date
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("mass_index", ROOT / "scripts/mass-index-classics.py")
indexer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(indexer)

TARGETS = ("cicero-oratore", "cicero-republica")
REPORT = ROOT / "data/classics-corpus/repairs/REPARACIONES-TEI-2026-11-07.json"
CATALOGUE = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repair():
    works = {w["id"]: w for w in json.loads(CATALOGUE.read_text(encoding="utf-8"))["works"]}
    changes = []
    for wid in TARGETS:
        path = ROOT / "data/classics-corpus" / (wid + "-la.json")
        old = json.loads(path.read_text(encoding="utf-8"))
        if old.get("restorationStatus") == "source-verified-prose-recovered":
            continue
        if old.get("workId") != wid or old.get("language") != "la":
            raise ValueError("Identidad de obra/index incorrecta: " + wid)
        old_hash = old.get("sourceSha256")
        if not old_hash or len(old_hash) != 64:
            raise ValueError("Falta huella TEI original para cotejar: " + wid)
        source = old.get("source", "")
        if not source.startswith("https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/"):
            raise ValueError("Fuente fuera del repositorio acreditado: " + wid)
        raw = indexer.get(source)
        observed_hash = hashlib.sha256(raw).hexdigest()
        if observed_hash != old_hash:
            raise ValueError("La TEI cambió; requiere revisión antes de sustituir el índice: " + wid)
        new = indexer.edition_document(
            works[wid], "la", source, raw, old.get("sourceUrn", "")
        )
        previous_chars = sum(len(p["text"]) for p in old["passages"])
        recovered_chars = sum(len(p["text"]) for p in new["passages"])
        if recovered_chars < max(previous_chars * 8, 30_000):
            raise ValueError(
                f"No se confirmó recuperación suficiente de prosa en {wid}: {previous_chars} -> {recovered_chars}"
            )
        if new["sourceSha256"] != old_hash:
            raise ValueError("Huella del documento recuperado no coincide: " + wid)
        backup_path = ROOT / "data/classics-corpus/repairs" / (wid + "-la-ANTES-REPARACION.json")
        if not backup_path.exists():
            write_json(backup_path, old)
        new.update({
            "restorationStatus": "source-verified-prose-recovered",
            "restorationDate": date.today().isoformat(),
            "restorationPreviousIndex": str(backup_path.relative_to(ROOT)),
            "restorationNote": "Regeneración desde el mismo TEI y SHA-256 tras detectar truncamiento por versos incrustados; no es cotejo filológico ni una nueva edición.",
        })
        write_json(path, new)
        changes.append({
            "workId": wid,
            "source": source,
            "sourceSha256": old_hash,
            "previousPassages": len(old["passages"]),
            "recoveredPassages": len(new["passages"]),
            "previousCharacters": previous_chars,
            "recoveredCharacters": recovered_chars,
            "backup": str(backup_path.relative_to(ROOT)),
            "status": "Index recuperado; requiere control filológico para certificar edición crítica",
        })
    if changes:
        existing = json.loads(REPORT.read_text(encoding="utf-8")) if REPORT.exists() else {"schema": "vitruvia-tei-index-repair-v1", "repairs": []}
        seen = {r["workId"] for r in existing["repairs"]}
        existing["repairs"].extend(r for r in changes if r["workId"] not in seen)
        existing["updated"] = date.today().isoformat()
        write_json(REPORT, existing)
    print(json.dumps({"restored": changes, "previouslyRestored": len(TARGETS) - len(changes)},
                     ensure_ascii=False))


if __name__ == "__main__":
    repair()
