#!/usr/bin/env python3
"""Descarga reproducible de las 390 imágenes públicas IIIF de Cesariano (1521).

No modifica ni importa ningún códice manuscrito ni los libros del autor.
La secuencia y las etiquetas proceden de e-rara; no son una foliación crítica.
Uso GitHub Actions: python scripts/import-cesariano-iiif.py
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import random
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "data/iiif/cesariano-1521.json"
DEST = ROOT / "images/cesariano-1521"
REPORT = ROOT / "data/iiif/cesariano-1521-import-report.json"
MANIFEST = "https://www.e-rara.ch/i3f/v20/6094045/manifest"
EXPECTED_DOI = "10.3931/e-rara-19393"
EXPECTED_PAGES = 390
WIDTH = int(os.environ.get("CESARIANO_IMAGE_WIDTH", "1400"))
WORKERS = min(3, max(1, int(os.environ.get("CESARIANO_WORKERS", "2"))))
HEADERS = {"User-Agent": "Vitruvius-Digital-Library/1.0 (research reproduction; original DOI 10.3931/e-rara-19393)",
           "Accept": "application/json, image/jpeg;q=0.9, */*;q=0.1"}


def get(url, attempts=5):
    for step in range(attempts):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=55) as res:
                return res.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as e:
            if step == attempts - 1:
                raise RuntimeError(f"{url}: {e}") from e
            wait = min(24, 2 * (2 ** step)) + random.random() / 3
            print(f"Reintento {step + 1}/{attempts}: {e}; {wait:.1f} s", flush=True)
            time.sleep(wait)


def jpeg_valid(raw):
    return len(raw) > 2500 and raw[:3] == b"\xff\xd8\xff" and raw[-2:] == b"\xff\xd9"


def normalized_label(value):
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " · ".join(str(v) for a in value.values() for v in (a if isinstance(a, list) else [a]))
    return str(value)


def manifest_info():
    data = json.loads(get(MANIFEST))
    if "publicdomain/mark" not in str(data.get("license", "")).lower():
        raise ValueError("La licencia ha cambiado: no se publican copias sin revisar los derechos")
    canvases = data.get("sequences", [{}])[0].get("canvases") or data.get("items") or []
    if len(canvases) != EXPECTED_PAGES:
        raise ValueError(f"El origen cambió: esperado {EXPECTED_PAGES}, recibido {len(canvases)}")
    output = []
    seen = set()
    for number, c in enumerate(canvases, 1):
        body = (c.get("images") or [{}])[0].get("resource") or {}
        if not body:
            body = (c.get("items") or [{}])[0].get("items", [{}])[0].get("body") or {}
        service = body.get("service") or body.get("services") or []
        if isinstance(service, list):
            service = service[0] if service else {}
        base = service if isinstance(service, str) else service.get("@id") or service.get("id")
        if not base or not base.startswith("https://www.e-rara.ch/") or base in seen:
            raise ValueError(f"Servicio IIIF ausente, inesperado o duplicado en imagen {number}")
        seen.add(base)
        output.append({
            "page": number,
            "iiif_label": normalized_label(c.get("label", "")),
            "canvas_id": c.get("@id") or c.get("id"),
            "local_url": f"images/cesariano-1521/{number:04d}.jpg",
            "image_url": base.rstrip("/") + f"/full/{WIDTH},/0/default.jpg",
        })
    return output


def save_page(p):
    number = p["page"]
    target = DEST / f"{number:04d}.jpg"
    if target.exists() and jpeg_valid(target.read_bytes()):
        return number, "existente", target.stat().st_size, hashlib.sha256(target.read_bytes()).hexdigest()
    raw = get(p["image_url"])
    if not jpeg_valid(raw):
        raise ValueError(f"Imagen {number} no es un JPEG válido")
    if len(raw) >= 10_000_000:
        raise ValueError(f"Imagen {number} demasiado grande: {len(raw)} bytes")
    tmp = target.with_suffix(".jpg.tmp")
    tmp.write_bytes(raw)
    tmp.replace(target)
    return number, "descargada", len(raw), hashlib.sha256(raw).hexdigest()


def main():
    if WIDTH < 600 or WIDTH > 2400:
        raise ValueError("Ancho de imagen fuera del intervalo permitido")
    DEST.mkdir(parents=True, exist_ok=True)
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    pages = manifest_info()
    # Conservar la licencia, los identificadores de los folios y la procedencia.
    index = {
        "schema": 1,
        "title": "Vitruvius · Cesare Cesariano · De architectura libri dece (Como 1521)",
        "record": "https://www.e-rara.ch/oec/content/titleinfo/6094045",
        "iiif_manifest": MANIFEST,
        "doi": EXPECTED_DOI,
        "institution": "Stiftung Bibliothek Werner Oechslin",
        "rights": "https://creativecommons.org/publicdomain/mark/1.0/deed.en",
        "total": len(pages),
        "canvases": pages,
    }
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts = {"descargada": 0, "existente": 0}
    failures = []
    bytes_total = 0
    hashes = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        jobs = {executor.submit(save_page, p): p["page"] for p in pages}
        for done_number, future in enumerate(concurrent.futures.as_completed(jobs), 1):
            page = jobs[future]
            try:
                number, state, size, sha = future.result()
                counts[state] += 1
                bytes_total += size
                hashes.append({"page": number, "sha256": sha, "bytes": size})
            except Exception as e:
                failures.append({"page": page, "error": str(e)[:240]})
                print(f"FALLO {page}: {e}", flush=True)
            if done_number % 25 == 0:
                print(f"Procesadas {done_number} / {EXPECTED_PAGES} · fallos {len(failures)}", flush=True)
    hashes.sort(key=lambda x: x["page"])
    report = {
        "edition": "Cesariano 1521",
        "source": MANIFEST,
        "doi": EXPECTED_DOI,
        "rights": index["rights"],
        "total_expected": len(pages),
        "existing": counts["existente"],
        "downloaded": counts["descargada"],
        "successful": len(hashes),
        "failed": failures,
        "total_bytes": bytes_total,
        "images": hashes,
        "note": "Copia digital de consulta, no transcripción crítica ni cotejo de manuscritos.",
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"RESULTADO: {len(hashes)} de {len(pages)} imágenes, {bytes_total:,} bytes; faltantes: {[e['page'] for e in failures]}", flush=True)
    # Los archivos recuperados pueden publicarse incluso si hay un fallo puntual; el
    # visor usa la imagen institucional como alternativa. El workflow marca PARTIAL.
    return 0


if __name__ == "__main__":
    sys.exit(main())
