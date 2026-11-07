#!/usr/bin/env python3
"""Indexar textos originales TEI identificados por el mapa de Perseus.

No indexa fichas, snippets ni facsímiles como si fueran texto cotejado.
Sólo incorpora obras catalogadas con UNA correspondencia Perseus y un TEI
original realmente descargado y validado. Bibliotheca, Vitruvia y Lexicon
comparten data/classics-corpus/search-registry.json.
No modifica HTML, CSS, textos madre ni traducciones existentes.
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
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

from ingest_texts import tei_extract

ROOT = Path(__file__).resolve().parents[1]
CAT = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
MAP = ROOT / "data/bibliotheca-perseus.json"
REG = ROOT / "data/classics-corpus/search-registry.json"
AUDIT = ROOT / "data/classics-corpus/coverage-audit.json"
BACKLOG = ROOT / "data/classics-corpus/indexation-backlog.json"
STATUS = ROOT / "data/classics-corpus/mass-index-status.json"
TRANSLATIONS = ROOT / "data/classics-corpus/translation-availability-222.json"
MAX_PAGES_BYTES = 970_000_000  # Dejar margen bajo el límite oficial de 1 GB de GitHub Pages
ORIG = {"la": ("PerseusDL/canonical-latinLit", "lat"),
        "grc": ("PerseusDL/canonical-greekLit", "grc")}
MAX_XML = 2_200_000
MAX_JSON = 4_000_000
MAX_BATCH_BYTES = 12_000_000
AGENT = "VitruviusAcademicIndexer/1.0 (https://github.com/diegoalonsok-png/vitruvius-digital-library)"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def get(url, size=MAX_XML, api=False):
    headers = {"User-Agent": AGENT, "Accept": "application/vnd.github+json" if api else "*/*"}
    if api and os.environ.get("GH_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    with urlopen(Request(url, headers=headers), timeout=45) as response:
        data = response.read(size + 1)
        if len(data) > size:
            raise ValueError("El archivo supera el límite de tamaño")
        return data


def remote_tree(repo):
    url = f"https://api.github.com/repos/{repo}/git/trees/master?recursive=1"
    data = json.loads(get(url, size=12_000_000, api=True))
    if data.get("truncated"):
        raise ValueError("Árbol externo truncado: no se puede seleccionar una edición fiable")
    return [item for item in data.get("tree", []) if item.get("type") == "blob"]


def choose_file(tree, urn, suffix):
    # Una correspondencia bibliográfica no garantiza un TEI descargable.
    if not re.fullmatch(r"(?:phi\d{4}|tlg\d{4}|stoa\d{4})\.(?:phi\d{3}|tlg\d{3}|stoa\d{3}|abo\d{3})", urn):
        return None
    author, work = urn.split(".")
    directory = f"data/{author}/{work}/"
    pattern = re.compile(r"^" + re.escape(directory + urn) +
                         r"\.perseus-" + re.escape(suffix) + r"(\d+)\.xml$")
    found = []
    for item in tree:
        match = pattern.fullmatch(item.get("path", ""))
        if match and 1000 <= item.get("size", 0) <= MAX_XML:
            found.append((int(match.group(1)), item["path"]))
    return sorted(found, reverse=True)[0][1] if found else None


def edition_document(work, original, source_url, raw, urn):
    # Reutilizar el extractor TEI actual; no inferir equivalencias con traducciones.
    title, author, detected, passages = tei_extract(raw, work.get("title", urn))
    if detected and detected.lower() not in {original, "lat" if original == "la" else "grc"}:
        raise ValueError("Idioma TEI discrepante: " + detected)
    if len(passages) < 1:
        raise ValueError("No hay unidades textuales reconocidas")
    clean, seen = [], {}
    for passage in passages:
        value = passage.get("original", "").strip()
        if len(value) < 12:
            continue
        locus = str(passage.get("locus") or "segmento").strip()
        seen[locus] = seen.get(locus, 0) + 1
        if seen[locus] > 1:
            # Distinguir bloques técnicos; el sufijo NO pretende ser un locus crítico.
            locus += "~segmento-" + str(seen[locus])
        clean.append({"locus": locus, "text": value,
                      "locusKind": passage.get("locusKind", "localización editorial orientativa")})
    if not clean or sum(len(p["text"]) for p in clean) < 350:
        raise ValueError("No se recuperó suficiente texto original")
    source_hash = hashlib.sha256(raw).hexdigest()
    return {
        "workId": work["id"], "language": original, "title": title,
        "sourceType": "edited-latin-tei" if original == "la" else "edited-greek-tei",
        "editorialStatus": "Texto TEI de edición; NO facsímil, OCR manuscrito ni cotejo filológico propio",
        "source": source_url,
        "sourceUrn": urn,
        "sourceSha256": source_hash,
        "attribution": f"{author} · {title} · Perseus Digital Library (TEI; ver edición y atribuciones en la fuente)",
        "license": "CC BY-SA 4.0 · PerseusDL; conservar atribución y condiciones de reutilización",
        "alignment": "Unidades TEI del archivo seleccionado; los segmentos técnicos no son loci críticos; sin alineación automática con traducciones o folios.",
        "passages": clean,
    }


def run():
    p = argparse.ArgumentParser()
    p.add_argument("--max-new", type=int, default=5)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    limit = max(1, min(args.max_new, 12))
    catalog, mapping, reg = load(CAT), load(MAP)["links"], load(REG)
    audit, backlog = load(AUDIT), load(BACKLOG)
    translations = load(TRANSLATIONS)
    site_bytes = sum(p.stat().st_size for p in ROOT.rglob("*")
                     if p.is_file() and ".git" not in p.relative_to(ROOT).parts)
    capacity = max(0, min(MAX_BATCH_BYTES, MAX_PAGES_BYTES - site_bytes))
    if capacity <= 0:
        print(json.dumps({"indexedInThisRun": 0, "siteBytes": site_bytes,
                          "warning": "No hay margen seguro en GitHub Pages; requiere separar archivos grandes del despliegue."},
                         ensure_ascii=False))
        return
    indexed = {(e["workId"], e["language"]) for e in reg["entries"]}
    eligible = []
    for w in catalog["works"]:
        wid, lang = w["id"], w.get("language")
        links = mapping.get(wid, [])
        if lang in ORIG and len(links) == 1 and (wid, lang) not in indexed:
            eligible.append((w, lang, links[0]["obra"]))
    trees = {}
    errors, created = [], []
    total_bytes = 0
    for w, lang, urn in eligible:
        if len(created) >= limit:
            break
        repo, suffix = ORIG[lang]
        try:
            if repo not in trees:
                trees[repo] = remote_tree(repo)
            path = choose_file(trees[repo], urn, suffix)
            if not path:
                continue
            url = f"https://raw.githubusercontent.com/{repo}/master/{quote(path, safe='/')}"
            raw = get(url)
            data = edition_document(w, lang, url, raw, urn)
            encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            if len(encoded) > MAX_JSON or total_bytes + len(encoded) > capacity:
                errors.append(w["id"] + ": excede el límite de lote")
                continue
            target = f"data/classics-corpus/{w['id']}-{lang}.json"
            if (ROOT / target).exists():
                errors.append(w["id"] + ": existe archivo no registrado; revisión manual")
                continue
            if not args.dry_run:
                (ROOT / target).write_bytes(encoded)
                w.setdefault("corpusFiles", {})[lang] = target
                reg["entries"].append({
                    "workId": w["id"], "author": w.get("author", data["attribution"]),
                    "title": w.get("title", data["title"]), "language": lang,
                    "format": "json-passages", "path": target,
                    "reader": f"classics-text-reader.html?work={w['id']}&lang={lang}",
                    "sourceDescription": "Perseus TEI · edición atribuida en el archivo · sin cotejo ni alineación automática",
                })
            created.append({"workId": w["id"], "lang": lang,
                            "path": target, "passages": len(data["passages"]),
                            "source": url, "sha256": data["sourceSha256"]})
            total_bytes += len(encoded)
        except (ValueError, ET.ParseError, OSError, KeyError) as error:
            errors.append(w["id"] + ": " + str(error)[:180])
        except Exception as error:
            errors.append(w["id"] + ": " + type(error).__name__ + ": " + str(error)[:120])

    if not args.dry_run and created:
        today = date.today().isoformat()
        reg["updated"] = today
        reg["count"] = len(reg["entries"])
        reg["works"] = len({e["workId"] for e in reg["entries"]})
        save(CAT, catalog)
        save(REG, reg)
        # Reports are derived from indexed local files, not bibliographic links.
        by_id = {row["id"]: row for row in audit.get("works", [])}
        for row in created:
            entry = by_id.get(row["workId"])
            if entry:
                entry["indexedTextLanguages"] = sorted(set(entry.get("indexedTextLanguages", [])) | {row["lang"]})
                entry["indexedTextFiles"] = sorted(set(entry.get("indexedTextFiles", [])) | {row["path"]})
                entry["hasDedicatedReader"] = True
        audit["date"] = today
        audit["counts"]["indexedTextVersions"] = reg["count"]
        audit["counts"]["indexedDistinctWorks"] = reg["works"]
        save(AUDIT, audit)
        indexed_by_work = {}
        for record in reg["entries"]:
            indexed_by_work.setdefault(record["workId"], set()).add(record["language"])
        for entry in backlog.get("entries", []):
            registered = indexed_by_work.get(entry["id"], set())
            expected = set(entry.get("missing", [])) | set(entry.get("indexed", []))
            if entry.get("original"):
                expected.add(entry["original"])
            entry["indexed"] = sorted(registered)
            entry["missing"] = sorted(expected - registered)
        backlog["snapshot"] = today
        backlog["missingOriginals"] = sum(
            bool(e.get("original") and e["original"] not in e.get("indexed", []))
            for e in backlog.get("entries", []))
        save(BACKLOG, backlog)
        by_id_translation = {row["id"]: row for row in translations["works"]}
        for item in created:
            entry = by_id_translation.get(item["workId"])
            if entry:
                entry["localEditionLanguages"] = sorted(set(entry.get("localEditionLanguages", [])) | {item["lang"]})
                entry["originalIndexed"] = True
                entry["indexed"] = True
        translations["generated"] = today
        translations["totals"]["locallyIndexedWorks"] = reg["works"]
        translations["totals"]["originalTextIndexed"] = sum(bool(row.get("originalIndexed")) for row in translations["works"])
        translations["totals"]["originalTextNotIndexed"] = len(translations["works"]) - translations["totals"]["originalTextIndexed"]
        save(TRANSLATIONS, translations)
        save(STATUS, {
            "updated": today, "newWorks": len(created), "newTextVersions": len(created),
            "indexedDistinctWorks": reg["works"], "registeredTextVersions": reg["count"],
            "missingOriginals": backlog["missingOriginals"],
            "method": "Perseus TEI original checked; explicit original-language match; no generated translations",
            "created": created, "errors": errors[:40],
        })
    print(json.dumps({
        "eligibleSingleSourceWorks": len(eligible), "indexedInThisRun": len(created),
        "bytes": total_bytes, "siteBytesBefore": site_bytes, "availableBytes": capacity,
        "newTitles": [e["workId"] for e in created],
        "errors": errors[:20], "dryRun": args.dry_run,
    }, ensure_ascii=False))
    if not created and errors:
        print("No se importó ninguna obra en este lote; revisar fallos sin afirmar cobertura.", file=sys.stderr)


if __name__ == "__main__":
    run()
