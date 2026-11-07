#!/usr/bin/env python3
"""Incorporación conservadora, por lotes, de TEI originales de Perseus.

Solo textos con fuente concreta y licencia declarada, nunca fichas bibliográficas
simuladas. Conserva el XML original y genera una vista de búsqueda independiente.
La integración utiliza el registro compartido por Bibliotheca, Vitruvia y Lexicon.
No modifica HTML, CSS ni documentos editoriales existentes.
"""
from __future__ import annotations

import argparse
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen

from ingest_texts import tei_extract

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CATALOG = DATA / "bibliotheca-graeca-latina-I-bce-I-ce.json"
MAP = DATA / "bibliotheca-perseus.json"
REGISTRY = DATA / "classics-corpus/search-registry.json"
COVERAGE = DATA / "classics-corpus/translation-availability-222.json"
BACKLOG = DATA / "classics-corpus/indexation-backlog.json"
SOURCE_DIR = DATA / "classics-tei"
INDEX_DIR = DATA / "classics-corpus"
MAX_XML_BYTES = 1_800_000
MAX_BATCH_BYTES = 14_000_000
REPOS = {"la": "PerseusDL/canonical-latinLit", "grc": "PerseusDL/canonical-greekLit"}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def remote(url, limit):
    if not url.startswith("https://"):
        raise ValueError("Fuente HTTP sin TLS")
    headers = {"User-Agent": "VitruviusDigitalLibrary-TEIIndexer/1.0"}
    if os.getenv("GH_TOKEN") and ("api.github.com/" in url or "raw.githubusercontent.com/" in url):
        headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    with urlopen(Request(url, headers=headers), timeout=45) as response:
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise ValueError("Fuente excede el límite de tamaño")
    return raw


def tree_for(language):
    repo = REPOS[language]
    url = "https://api.github.com/repos/" + repo + "/git/trees/master?recursive=1"
    info = json.loads(remote(url, 10_000_000))
    if info.get("truncated"):
        raise RuntimeError("Árbol de Perseus truncado: no inferir faltantes")
    by_work = {}
    for item in info.get("tree", []):
        path = item.get("path", "")
        if item.get("type") != "blob" or not path.endswith(".xml"):
            continue
        if not (500 <= int(item.get("size", 0)) <= MAX_XML_BYTES):
            continue
        match = re.fullmatch(r"data/((?:phi|tlg)\d+)/((?:phi|tlg|abo)\w+)/[^/]+", path)
        if match:
            by_work.setdefault(match.group(1) + "." + match.group(2), []).append(path)
    return by_work


def choose_edition(paths, language):
    suffix = "lat" if language == "la" else "grc"
    editions = [p for p in paths if re.search(r"\.perseus-" + suffix + r"\d+\.xml$", p)]
    # La prioridad solo selecciona UNA edición textual; no implica que sea
    # la más antigua o la académicamente preferible.
    editions.sort(key=lambda p: (0 if p.endswith(suffix + "2.xml") else 1, p))
    return editions[0] if editions else None


def recalc_coverage(registry):
    if not COVERAGE.exists():
        return
    data = read(COVERAGE)
    languages = {}
    for entry in registry["entries"]:
        languages.setdefault(entry["workId"], set()).add(entry["language"])
    translation = {"es", "en", "fr", "it", "de", "pt"}
    for row in data["works"]:
        local = sorted(languages.get(row["id"], set()))
        row["localEditionLanguages"] = local
        row["originalIndexed"] = row.get("originalLanguage") in local
        row["translationLanguages"] = sorted(translation.intersection(local))
        row["indexed"] = bool(local)
    totals = data["totals"]
    totals["cataloguedWorks"] = len(data["works"])
    totals["locallyIndexedWorks"] = sum(row["indexed"] for row in data["works"])
    totals["originalTextIndexed"] = sum(row["originalIndexed"] for row in data["works"])
    totals["originalTextNotIndexed"] = sum(not row["originalIndexed"] for row in data["works"])
    totals["translatedWorksLocal"] = sum(bool(row["translationLanguages"]) for row in data["works"])
    totals["worksWithoutHostedTranslation"] = sum(not row["translationLanguages"] for row in data["works"])
    totals["localTranslationLanguages"] = {language: sum(language in row["translationLanguages"] for row in data["works"]) for language in ("es", "en", "fr")}
    write(COVERAGE, data)


def recalc_backlog(registry):
    if not BACKLOG.exists():
        return
    data = read(BACKLOG)
    languages = {}
    for entry in registry["entries"]:
        languages.setdefault(entry["workId"], set()).add(entry["language"])
    for row in data["entries"]:
        indexed = languages.get(row["id"], set())
        row["indexed"] = sorted(indexed)
        row["missing"] = sorted(set(row.get("missing", [])) - indexed)
    data["missingOriginals"] = sum(row.get("original") not in languages.get(row["id"], set()) for row in data["entries"])
    data["snapshot"] = date.today().isoformat()
    write(BACKLOG, data)


def run():
    args = argparse.ArgumentParser()
    args.add_argument("--max-new", type=int, default=10)
    args.add_argument("--plan", action="store_true", help="No red, no cambios; cobertura potencial, no disponibilidad certificada")
    opts = args.parse_args()
    cap = max(1, min(opts.max_new, 12))
    catalogue, mapping, registry = read(CATALOG), read(MAP), read(REGISTRY)
    indexed = {(e["workId"], e["language"]) for e in registry["entries"]}
    candidates = []
    for work in catalogue["works"]:
        wid, language = work["id"], work.get("language", "")
        links = mapping.get("links", {}).get(wid, [])
        ids = [link.get("obra", "") for link in links]
        # Las obras compuestas requieren otro proceso para evitar fingir
        # que una sola sección CTS equivale a todo un corpus.
        if language in REPOS and (wid, language) not in indexed and len(ids) == 1:
            if re.fullmatch(r"(?:tlg|phi)\d+\.(?:tlg|phi|abo)\w+", ids[0]):
                candidates.append((work, language, ids[0]))
    if opts.plan:
        print(json.dumps({"catalogued": len(catalogue["works"]), "indexedVersions": len(registry["entries"]),
                          "indexedWorks": len({e["workId"] for e in registry["entries"]}),
                          "eligibleSingleCTS": len(candidates),
                          "note": "Candidatas documentales; no se certifica archivo TEI disponible",
                          "sample": [w["id"] for w, _, _ in candidates[:15]]}, ensure_ascii=False))
        return
    trees = {language: tree_for(language) for language in REPOS if any(lang == language for _, lang, _ in candidates)}
    added, errors, total_size = [], [], 0
    for work, language, cts in candidates:
        if len(added) >= cap or total_size >= MAX_BATCH_BYTES:
            break
        path = choose_edition(trees[language].get(cts, []), language)
        if not path:
            continue
        wid = work["id"]
        source_url = "https://raw.githubusercontent.com/" + REPOS[language] + "/master/" + path
        destination = INDEX_DIR / (wid + "-" + language + ".json")
        xml_path = SOURCE_DIR / (wid + "-" + language + ".xml")
        if destination.exists() or xml_path.exists():
            continue
        try:
            raw = remote(source_url, MAX_XML_BYTES)
            title, author, found_language, extracted = tei_extract(raw, work["title"])
            if found_language and not found_language.lower().startswith(language[:2]):
                raise ValueError("Lengua de TEI no corresponde a la lengua del original")
            passages, seen = [], set()
            for item in extracted:
                value = item.get("original", "").strip()
                if not value:
                    continue
                locus = str(item.get("locus", "")).strip()
                if not locus or locus in seen:
                    raise ValueError("Locus ausente o duplicado en la segmentación TEI")
                seen.add(locus)
                passages.append({"locus": locus, "text": value})
            if len(passages) < 10 or sum(len(p["text"]) for p in passages) < 3000:
                raise ValueError("Transcripción demasiado corta o vacía")
            document = {
                "workId": wid, "language": language,
                "sourceType": "edited-" + ("latin" if language == "la" else "greek") + "-tei",
                "editorialStatus": "Edición TEI indexada sin cotejo diplomático; verificar integridad y aparato",
                "source": source_url, "sourceTEI": "data/classics-tei/" + xml_path.name,
                "sha256": hashlib.sha256(raw).hexdigest(),
                "attribution": author + " · " + title + " · Perseus Digital Library, edición identificada en la cabecera TEI",
                "license": "CC BY-SA 4.0 · PerseusDL; conservar atribución y términos de redistribución",
                "alignment": "Loci/segmentos de la TEI; ningún folio, traducción ni cotejo equivalentes se infieren",
                "passages": passages,
            }
            encoded = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            if total_size + len(encoded) + len(raw) > MAX_BATCH_BYTES:
                continue
            SOURCE_DIR.mkdir(parents=True, exist_ok=True)
            xml_path.write_bytes(raw)  # Inmutable, con huella SHA256.
            destination.write_bytes(encoded)
            source_path = "data/classics-corpus/" + destination.name
            entry = {
                "workId": wid, "author": work["author"], "title": work["title"],
                "language": language, "format": "json-passages",
                "path": source_path,
                "reader": "classics-text-reader.html?work=" + wid + "&lang=" + language,
                "sourceDescription": "TEI Perseus DL · " + source_url + " · transcripción indexada, cotejo pendiente",
            }
            registry["entries"].append(entry)
            work.setdefault("corpusFiles", {})[language] = source_path
            added.append({"id": wid, "cts": cts, "path": source_path, "passages": len(passages)})
            indexed.add((wid, language))
            total_size += len(encoded) + len(raw)
        except Exception as exc:
            errors.append({"id": wid, "cts": cts, "error": str(exc)[:200]})
    if added:
        registry["entries"].sort(key=lambda e: (e["workId"], e["language"], e["path"]))
        registry["count"] = len(registry["entries"])
        registry["works"] = len({e["workId"] for e in registry["entries"]})
        registry["updated"] = date.today().isoformat()
        catalogue["updated"] = date.today().isoformat()
        write(CATALOG, catalogue)
        write(REGISTRY, registry)
        recalc_coverage(registry)
        recalc_backlog(registry)
    result = {"added": len(added), "works": added, "errors": errors[:25],
              "status": "Ediciones TEI originales indexadas sin cotejo filológico; no se alteró la interfaz"}
    print(json.dumps(result, ensure_ascii=False))
    if errors and not added:
        print("No se incorporaron obras; revisar errores de origen", file=sys.stderr)


if __name__ == "__main__":
    run()
