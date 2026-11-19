#!/usr/bin/env python3
"""Importación priorizada de clásicos First1KGreek con control de identidad.

Lee un lote editorial con 50 fuentes y NO crea fichas sin texto.
Descarga TEI, comprueba Git blob SHA y SHA256, conserva loci de la edición,
genera texto del lector y actualiza el registro y el catálogo complementario.
El índice invertido se reconstruye después con el generador EXISTENTE.
Sin OCR, sin traducción automática, sin cambiar portada, vistas o Lexicon.
"""
from __future__ import annotations
import argparse
from datetime import date
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "data/classics-corpus/batches/lote-50-priorizado-2026-11-19.json"
REG = ROOT / "data/classics-corpus/search-registry.json"
CAT = ROOT / "data/bibliotheca-expansion-publicada-2026-11-16.json"
MAIN = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
OUT = ROOT / "data/classics-corpus/batches/lote-50-resultado-2026-11-19.json"
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")
SOURCE_RE = re.compile(r"^https://raw\.githubusercontent\.com/OpenGreekAndLatin/First1KGreek/master/data/[A-Za-z0-9/._-]+\.xml$")
URN_RE = re.compile(r"^urn:cts:greekLit:([a-z0-9]+)\.([a-z0-9]+)\.[a-z0-9.-]+$")
USER_AGENT = "VitruviusAcademicLibrary/1.0 (source verification)"

def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def pretty(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"

def download(url: str, max_bytes: int) -> bytes:
    if not SOURCE_RE.fullmatch(url):
        raise ValueError("Origen fuera de First1KGreek, rechazado")
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=40) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        data = response.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ValueError("TEI excede el límite declarado")
    return data

def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()

def source_extractor():
    spec = importlib.util.spec_from_file_location(
        "vdl_verified_tei", ROOT / "scripts/build-offsite-greek-originals.py")
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module.convert

def load_existing_ids():
    names = set()
    for doc in (read(MAIN), read(CAT)):
        for work in doc["works"]:
            if work.get("id"):
                names.add(work["id"])
    return names

def ingest_one(item, extractor):
    urn = item["urn"]
    match = URN_RE.fullmatch(urn)
    if not match or item["language"] != "grc":
        raise ValueError("URN CTS o idioma inválidos")
    if item["sourceRepository"] != "OpenGreekAndLatin/First1KGreek":
        raise ValueError("Repositorio externo incorrecto")
    if item["license"] != "CC BY-SA 4.0":
        raise ValueError("Licencia sin cotejar")
    if item["sourcePath"].split("/")[-1] not in item["sourceUrl"]:
        raise ValueError("Nombre TEI y URL incoherentes")
    source = download(item["sourceUrl"], min(2_000_000, item["sourceBytes"] + 32))
    if len(source) != item["sourceBytes"]:
        raise ValueError("Tamaño del TEI cambió desde el inventario")
    if git_blob_sha(source) != item["gitBlobSha"]:
        raise ValueError("SHA Git del TEI no coincide; revisar edición")
    work_id = "first1k-" + "-".join(match.groups())
    doc = extractor(work_id, source, item["sourceUrl"],
                    {"title": item["title"], "author": item["author"]})
    if doc.get("sourceUrn") != urn:
        raise ValueError("CTS del TEI distinto del identificado en el lote")
    normalized = doc["passages"]
    chars = sum(len(p["text"]) for p in normalized)
    greek_chars = sum(len(GREEK.findall(p["text"])) for p in normalized)
    if len(normalized) < 2 or chars < 900 or greek_chars < 200:
        raise ValueError("Contenido griego o unidades insuficientes")
    doc["sources"] = [{"urn": urn, "url": item["sourceUrl"],
                       "sha256": doc["sourceSha256"],
                       "gitBlobSha": item["gitBlobSha"]}]
    path = f"data/classics-corpus/{work_id}-grc.json"
    registry_entry = {
        "workId": work_id, "author": item["author"],
        "title": item["title"], "language": "grc", "format": "json-passages",
        "path": path,
        "reader": f"classics-text-reader.html?work={work_id}&lang=grc",
        "sourceDescription": "OpenGreekAndLatin First1KGreek TEI · CC BY-SA 4.0 · "
                             + urn + " · SHA256 verificado, sin cotejo autóptico"
    }
    catalog_entry = {
        "id": work_id, "author": item["author"], "title": item["title"],
        "language": "grc", "genre": item["genre"],
        "status": "Texto original griego incorporado; índice léxico reconstruido en el despliegue",
        "textStatus": "lexically-indexed",
        "source": "OpenGreekAndLatin First1KGreek · fuente TEI íntegra",
        "sourceUrl": item["sourceUrl"], "sourceUrn": urn,
        "sourceSha256": doc["sourceSha256"],
        "sourceLicense": "CC BY-SA 4.0",
        "corpusFiles": {"grc": path},
        "publicStatus": "lectura-local-completa",
        "localVersions": [{"language": "grc", "path": path}],
        "reading": {"url": registry_entry["reader"],
                    "status": "Original griego segmentado por locus TEI; sin traducción vinculada."}
    }
    return doc, registry_entry, catalog_entry, {
        "rank": item["rank"], "workId": work_id, "urn": urn,
        "passages": len(normalized), "textCharacters": chars,
        "sourceSha256": doc["sourceSha256"], "sourceBytes": len(source)
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Guardar solo tras validación de fuentes")
    ap.add_argument("--minimum", type=int, default=50, help="Mínimo de importaciones verificadas")
    args = ap.parse_args()
    batch = read(PLAN)
    items = batch.get("items") or []
    if len(items) != 50 or [i.get("rank") for i in items] != list(range(1, 51)):
        raise SystemExit("La tanda debe tener 50 identidades únicas ordenadas")
    id_roots = [URN_RE.fullmatch(i.get("urn", "")) for i in items]
    if any(x is None for x in id_roots) or len({x.group(0).rsplit(".", 1)[0] for x in id_roots}) != 50:
        raise SystemExit("Tanda con CTS repetidos o no canónicos")
    registry, catalog = read(REG), read(CAT)
    existing_ids = load_existing_ids()
    existing_registry = {(e["workId"], e["language"]) for e in registry["entries"]}
    extractor = source_extractor()
    to_write, added, failed = [], [], []
    for item in items:
        key = URN_RE.fullmatch(item["urn"])
        wid = "first1k-" + "-".join(key.groups())
        if wid in existing_ids or (wid, "grc") in existing_registry:
            failed.append({"rank": item["rank"], "workId": wid,
                           "reason": "Obra ya presente; no duplicar"})
            continue
        try:
            doc, entry, work, row = ingest_one(item, extractor)
        except Exception as exc:
            failed.append({"rank": item["rank"], "workId": wid,
                           "reason": str(exc)[:220]})
            continue
        to_write.append((ROOT / entry["path"], doc))
        registry["entries"].append(entry)
        catalog["works"].append(work)
        existing_ids.add(wid)
        existing_registry.add((wid, "grc"))
        added.append(row)
        print(f"OK #{item['rank']:02d} {wid}: {row['passages']} loci", flush=True)
    registry["entries"].sort(key=lambda x: (x["workId"], x["language"], x.get("path", "")))
    registry["count"] = len(registry["entries"])
    registry["works"] = len({e["workId"] for e in registry["entries"]})
    result = {"schema": "vdl-prioritized-50-import-result-v1",
              "date": date.today().isoformat(),
              "selected": 50, "imported": len(added), "failed": failed,
              "added": added,
              "indexNote": "Índice léxico se reconstruye por build-classics-lexical-index.mjs; este informe no certifica indexación semántica.",
              "status": "applied-needs-lexical-build" if args.apply else "dry-run"}
    if args.apply:
        if len(added) < args.minimum:
            raise SystemExit("Ningún lote suficientemente verificado: no se escribe.")
        for path, doc in to_write:
            if path.exists():
                raise SystemExit("Archivo de salida existente; revisar colisión: " + str(path))
        for path, doc in to_write:
            path.write_text(pretty(doc), encoding="utf-8")
        REG.write_text(pretty(registry), encoding="utf-8")
        CAT.write_text(pretty(catalog), encoding="utf-8")
        OUT.write_text(pretty(result), encoding="utf-8")
    print(pretty({k: result[k] for k in ("selected", "imported", "failed", "status")}), flush=True)
    if len(added) < args.minimum:
        raise SystemExit("No se alcanza la cantidad mínima de textos verificables.")

if __name__ == "__main__":
    main()
