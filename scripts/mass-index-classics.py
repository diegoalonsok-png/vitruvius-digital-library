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
from html.entities import name2codepoint
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
MAX_PAGES_BYTES = 950_000_000  # Presupuesto preventivo: 1 GB decimal Pages menos 50 MB de reserva para índices/despliegue
ORIG = {"la": ("PerseusDL/canonical-latinLit", "lat"),
        "grc": ("PerseusDL/canonical-greekLit", "grc")}
# Ediciones griegas verificadas que faltan en Perseus; mismo URN CTS.
GREEK_FALLBACK_REPO = "OpenGreekAndLatin/First1KGreek"
# Sólo agrupar obras explícitamente comprobadas en sus unidades TEI completas.
COMPOSITE_WORKS = {
    "aeschylus-oresteia": ("tlg0085.tlg005", "tlg0085.tlg006", "tlg0085.tlg007"),
    "demosthenes-philippicae": ("tlg0014.tlg004", "tlg0014.tlg006", "tlg0014.tlg009", "tlg0014.tlg010"),
    "pseudo-apollodorus-bibliotheca": ("tlg0548.tlg001", "tlg0548.tlg002"),
    "nepos": ("phi0588.abo001", "phi0588.abo002", "phi0588.abo003", "phi0588.abo004", "phi0588.abo005", "phi0588.abo006", "phi0588.abo007", "phi0588.abo008", "phi0588.abo009", "phi0588.abo010", "phi0588.abo011", "phi0588.abo012", "phi0588.abo013", "phi0588.abo014", "phi0588.abo015", "phi0588.abo016", "phi0588.abo017", "phi0588.abo018", "phi0588.abo019", "phi0588.abo020", "phi0588.abo021", "phi0588.abo022", "phi0588.abo023", "phi0588.abo024", "phi0588.abo025"),
    "seneca-tragoediae": ("phi1017.phi001", "phi1017.phi002", "phi1017.phi003", "phi1017.phi004", "phi1017.phi005", "phi1017.phi006", "phi1017.phi007", "phi1017.phi008", "phi1017.phi009", "phi1017.phi010"),
    "suetonius-caesares": ("phi1348.abo011", "phi1348.abo012", "phi1348.abo013", "phi1348.abo014", "phi1348.abo015", "phi1348.abo016", "phi1348.abo017", "phi1348.abo018", "phi1348.abo019", "phi1348.abo020", "phi1348.abo021", "phi1348.abo022"),
    "appian-romaika": ("tlg0551.tlg002", "tlg0551.tlg003", "tlg0551.tlg004", "tlg0551.tlg005", "tlg0551.tlg006", "tlg0551.tlg007", "tlg0551.tlg008", "tlg0551.tlg009", "tlg0551.tlg010", "tlg0551.tlg011", "tlg0551.tlg012", "tlg0551.tlg013", "tlg0551.tlg014", "tlg0551.tlg017"),
    "homeric-hymns": ("tlg0013.tlg001", "tlg0013.tlg002", "tlg0013.tlg003", "tlg0013.tlg004", "tlg0013.tlg005", "tlg0013.tlg006", "tlg0013.tlg007", "tlg0013.tlg008", "tlg0013.tlg009", "tlg0013.tlg010", "tlg0013.tlg011", "tlg0013.tlg012", "tlg0013.tlg013", "tlg0013.tlg014", "tlg0013.tlg015", "tlg0013.tlg016", "tlg0013.tlg017", "tlg0013.tlg018", "tlg0013.tlg019", "tlg0013.tlg020", "tlg0013.tlg021", "tlg0013.tlg022", "tlg0013.tlg023", "tlg0013.tlg024", "tlg0013.tlg025", "tlg0013.tlg026", "tlg0013.tlg027", "tlg0013.tlg028", "tlg0013.tlg029", "tlg0013.tlg030", "tlg0013.tlg031", "tlg0013.tlg032", "tlg0013.tlg033"),
    # Secuencias documentadas en data/bibliotheca-perseus.json; si una pieza
    # falta, NO se publica una ficha supuestamente completa.
    "nepos": tuple(f"phi0588.abo{n:03d}" for n in range(1, 26)),
    "suetonius-caesares": tuple(f"phi1348.abo{n:03d}" for n in range(11, 23)),
    "seneca-tragoediae": tuple(f"phi1017.phi{n:03d}" for n in range(1, 11)),
    "appian-romaika": tuple([f"tlg0551.tlg{n:03d}" for n in range(2, 15)] + ["tlg0551.tlg017"]),
}
# Las obras extensas (Heródoto, Tucídides, Estrabón...) superan 2,2 MB TEI.
# Se acepta un original de hasta 8 MB, con JSON hasta 8 MB, siempre que
# pase el cotejo de caracteres y quede dentro del techo total de GitHub Pages.
# Ediciones mayores se mantienen pendientes para lectura segmentada, no truncadas.
MAX_XML = 8_000_000
MAX_JSON = 8_000_000
MAX_BATCH_BYTES = 24_000_000
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


def choose_file(tree, urn, suffix, corpus="perseus"):
    # Una correspondencia bibliográfica no garantiza un TEI descargable.
    if not re.fullmatch(r"(?:phi\d{4}|tlg\d{4}|stoa\d{4})\.(?:phi\d{3}|tlg\d{3}|stoa\d{3}|abo\d{3})", urn):
        return None
    author, work = urn.split(".")
    directory = f"data/{author}/{work}/"
    if corpus not in {"perseus", "1st1K"}:
        raise ValueError("Repositorio TEI no aprobado")
    pattern = re.compile(r"^" + re.escape(directory + urn) +
                         r"\." + re.escape(corpus) + "-" + re.escape(suffix) + r"(\d+)\.xml$")
    found = []
    for item in tree:
        match = pattern.fullmatch(item.get("path", ""))
        if match and 1000 <= item.get("size", 0) <= MAX_XML:
            found.append((int(match.group(1)), item["path"]))
    return sorted(found, reverse=True)[0][1] if found else None


def normalize_legacy_perseus_tei(raw):
    """Accept Perseus P4 TEI.2 without loading its network DTD.

    Some valid legacy Perseus witnesses (e.g. Cato) use HTML4 named entities
    and <div1> chapters. Python's XML parser does not fetch the external DTD.
    Convert a TEMPORARY in-memory representation only; retain the raw
    downloaded bytes and SHA-256 for provenance and restoration. Unknown
    entities or malformed declarations fail closed, never silently delete text.
    """
    if b"<TEI.2" not in raw:
        return raw
    value = raw.decode("utf-8-sig")
    marker = re.search(r"<!DOCTYPE\s+TEI\.2\b", value)
    if marker:
        end = value.find("]>", marker.end())
        if end < 0 or "[" not in value[marker.start():end]:
            raise ValueError("DTD TEI.2 no reconocida; revisión manual necesaria")
        value = value[:marker.start()] + value[end + 2:]
    if not re.search(r"<TEI\.2(?=\s|>)", value):
        raise ValueError("Raíz P4 TEI.2 no reconocida")
    def named_entity(match):
        name = match.group(1)
        if name in {"amp", "lt", "gt", "apos", "quot"}:
            return match.group(0)
        number = name2codepoint.get(name)
        if number is None:
            raise ValueError("Entidad TEI P4 desconocida: &" + name + ";")
        return chr(number)
    value = re.sub(r"&([A-Za-z][A-Za-z0-9]+);", named_entity, value)
    value = re.sub(r"<TEI\.2(?=\s|>)",
                   '<TEI xmlns="http://www.tei-c.org/ns/1.0"', value, count=1)
    value = value.replace("</TEI.2>", "</TEI>")
    value = re.sub(r"(<\/?)div[1-9](?=[\s/>])", r"\1div", value)
    # Validate immediately; invalid P4 files must not enter the corpus.
    ET.fromstring(value.encode("utf-8"))
    return value.encode("utf-8")


def extract_complete_tei(raw, fallback_title):
    """No indexar únicamente versos citados cuando el original es prosa TEI.

    El extractor común prioriza <l> si el documento contiene alguna línea.
    En textos mixtos eso puede descartar casi toda la prosa: se determina el
    cuerpo principal y se comprueba el volumen efectivamente extraído.
    El XML externo y los textos editoriales originales permanecen intactos.
    """
    raw = normalize_legacy_perseus_tei(raw)
    root = ET.fromstring(raw)
    ns = "{http://www.tei-c.org/ns/1.0}"
    body = root.find(".//" + ns + "body")
    if body is None:
        raise ValueError("TEI no contiene body")
    verses = body.findall(".//" + ns + "l")
    prose = body.findall(".//" + ns + "p")
    # La TEI contiene indentación y saltos editoriales que NO son caracteres del texto.
    # Comparar cobertura frente a texto normalizado, como hace el extractor,
    # evita rechazar obras extensas (p. ej. Fedón) por espacios del marcado XML.
    verse_chars = sum(len(" ".join(" ".join(e.itertext()).split())) for e in verses)
    prose_chars = sum(len(" ".join(" ".join(e.itertext()).split())) for e in prose)
    if verses and prose and prose_chars > 2 * verse_chars:
        # Solo copia XML en memoria: preservar los versos dentro de sus párrafos.
        for line in verses:
            line.tag = ns + "seg"
        normalized = ET.tostring(root, encoding="utf-8")
    else:
        normalized = raw
    title, author, detected, passages = tei_extract(normalized, fallback_title)
    extracted_chars = sum(len(p.get("original", "")) for p in passages)
    main_chars = max(verse_chars, prose_chars)
    if main_chars and extracted_chars < 0.75 * main_chars:
        raise ValueError(
            f"TEI incompleta: sólo {extracted_chars}/{main_chars} caracteres del texto principal"
        )
    return title, author, detected, passages


def edition_document(work, original, source_url, raw, urn, min_original_chars=350):
    # Extraer el cuerpo sin descartar prosa si contiene versos citados.
    title, author, detected, passages = extract_complete_tei(raw, work.get("title", urn))
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
    if not clean or sum(len(p["text"]) for p in clean) < min_original_chars:
        raise ValueError("No se recuperó suficiente texto original")
    source_hash = hashlib.sha256(raw).hexdigest()
    from_first1k = "/OpenGreekAndLatin/First1KGreek/" in source_url
    return {
        "workId": work["id"], "language": original, "title": title,
        "sourceType": "edited-latin-tei" if original == "la" else "edited-greek-tei",
        "editorialStatus": ("Edición TEI First1KGreek, con posible origen en transcripción u OCR corregido; sin colación independiente"
                            if from_first1k else "Texto TEI de edición; NO facsímil, OCR manuscrito ni cotejo filológico propio"),
        "source": source_url,
        "sourceUrn": urn,
        "sourceSha256": source_hash,
        "attribution": (f"{author} · {title} · OpenGreekAndLatin First1KGreek (TEI; edición y correcciones según fuente)"
                        if from_first1k else f"{author} · {title} · Perseus Digital Library (TEI; ver edición y atribuciones en la fuente)"),
        "license": ("CC BY-SA 4.0 · OpenGreekAndLatin First1KGreek; conservar atribución de edición y digitalización"
                    if from_first1k else "CC BY-SA 4.0 · PerseusDL; conservar atribución y condiciones de reutilización"),
        "alignment": "Unidades TEI del archivo seleccionado; los segmentos técnicos no son loci críticos; sin alineación automática con traducciones o folios.",
        "passages": clean,
    }


def run():
    p = argparse.ArgumentParser()
    p.add_argument("--max-new", type=int, default=5)
    p.add_argument("--only-work-id", action="append", default=[], help="Restringir a identificadores existentes, sin cambiar comportamiento por defecto")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    limit = max(1, min(args.max_new, 16))
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
        if args.only_work_id and wid not in set(args.only_work_id):
            continue
        links = mapping.get(wid, [])
        if lang not in ORIG or (wid, lang) in indexed:
            continue
        urns = tuple(link["obra"] for link in links)
        if len(urns) == 1 or (wid in COMPOSITE_WORKS and urns == COMPOSITE_WORKS[wid]):
            eligible.append((w, lang, urns))
    # Los títulos compuestos son una sola ficha, pero deben incorporar
    # TODAS sus fuentes, no presentar un primer volumen como edición completa.
    eligible.sort(key=lambda entry: -len(entry[2]))
    trees = {}
    errors, created, deferred_for_batch, oversized_files = [], [], [], []
    unavailable_tei = []
    total_bytes = 0
    for w, lang, urns in eligible:
        if len(created) >= limit:
            break
        repo, suffix = ORIG[lang]
        try:
            if repo not in trees:
                trees[repo] = remote_tree(repo)
            component_files = []
            for urn in urns:
                source_repo = repo
                path = choose_file(trees[source_repo], urn, suffix)
                if not path and lang == "grc" and len(urns) == 1:
                    source_repo = GREEK_FALLBACK_REPO
                    if source_repo not in trees:
                        trees[source_repo] = remote_tree(source_repo)
                    path = choose_file(trees[source_repo], urn, suffix, corpus="1st1K")
                if not path:
                    # El vínculo bibliográfico existe, pero el repositorio remoto
                    # no ofrece aquí un TEI compatible con idioma y tamaño.
                    # Registrar el bloqueo; no atribuir una edición inexistente.
                    unavailable_tei.append({
                        "workId": w["id"], "urn": urn, "language": lang,
                        "repository": repo,
                        "reason": "No se encontró TEI original compatible en el árbol remoto o excede límites",
                    })
                    component_files = []
                    break
                url = f"https://raw.githubusercontent.com/{source_repo}/master/{quote(path, safe='/')}"
                raw = get(url)
                if source_repo == GREEK_FALLBACK_REPO and (
                    b"creativecommons.org/licenses/by-sa/4.0/" not in raw or b"<licence" not in raw
                ):
                    raise ValueError("TEI First1KGreek no contiene licencia CC BY-SA identificada")
                # Los himnos y fragmentos auténticos pueden medir menos de 350
                # caracteres. Exigir un pasaje real, no recortar la colección.
                doc = edition_document(w, lang, url, raw, urn,
                                       min_original_chars=12 if len(urns)>1 else 350)
                component_files.append((urn, doc))
            if not component_files or len(component_files) != len(urns):
                continue
            if len(urns) == 1:
                data = component_files[0][1]
            else:
                first = component_files[0][1]
                parts = []
                passages = []
                for urn, doc in component_files:
                    parts.append({"urn": urn, "title": doc["title"],
                                  "source": doc["source"], "sha256": doc["sourceSha256"],
                                  "passages": len(doc["passages"])})
                    for passage in doc["passages"]:
                        passages.append({**passage,
                                         "locus": urn + ":" + passage["locus"],
                                         "sourceUrn": urn})
                if len(passages) < len(urns):
                    raise ValueError("Compilación con unidades vacías")
                data = {**first, "title": w.get("title") or first["title"],
                        "sourceType": "verified-multi-TEI-edition",
                        "editorialStatus": "Compilación técnica íntegra de los TEI documentados; no recensio nueva ni colación crítica",
                        "sourceUrn": list(urns), "sourceParts": parts,
                        "sourceSha256": hashlib.sha256("|".join(p["sha256"] for p in parts).encode()).hexdigest(),
                        "alignment": "Cada locus incluye su URN; sin equivalencias inferidas entre fuentes, traducciones ni manuscritos.",
                        "passages": passages}
            encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            if len(encoded) > MAX_JSON:
                oversized_files.append(w["id"])
                continue
            if total_bytes + len(encoded) > capacity:
                # No es un fallo filológico: pasar al siguiente lote.
                deferred_for_batch.append(w["id"])
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
                    "sourceDescription": ("OpenGreekAndLatin First1KGreek TEI" if "First1KGreek/" in data["source"]
                                          else "Perseus TEI") + " · fuente editada documentada, sin colación automática",
                })
            created.append({"workId": w["id"], "lang": lang,
                            "path": target, "passages": len(data["passages"]),
                            "source": data["source"], "sha256": data["sourceSha256"],
                            "componentUrns": list(urns)})
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
            "deferredForBatch": deferred_for_batch,
            "requiresSharding": oversized_files,
            "unavailableSourceMappings": unavailable_tei,
        })
    if not args.dry_run:
        # Este diagnóstico queda disponible aun cuando NO haya nuevas obras.
        # No reemplaza mass-index-status.json (resumen del último lote exitoso).
        # Permite auditar por qué siguen pendientes originales del catálogo.
        save(ROOT / "data/classics-corpus/source-readiness-latest.json", {
            "updated": date.today().isoformat(),
            "scope": "Inspección de fuentes TEI originales; no confundir candidatos bibliográficos con textos indexados",
            "eligibleMappedWorksScanned": len(eligible),
            "newWorksInThisScan": len(created),
            "indexedDistinctWorksNow": len({e["workId"] for e in reg["entries"]}) + (
                len({x["workId"] for x in created}) if args.dry_run else 0),
            "sourceMissingOrIncompatible": unavailable_tei,
            "extractionAndCapacityErrors": errors,
            "policy": "No publicar TEI incompleto, traducciones inventadas, OCR sin validar ni colaciones inferidas.",
        })
    print(json.dumps({
        "eligibleSingleSourceWorks": len(eligible), "indexedInThisRun": len(created),
        "bytes": total_bytes, "siteBytesBefore": site_bytes, "availableBytes": capacity,
        "newTitles": [e["workId"] for e in created],
        "unavailableSourceCount": len(unavailable_tei),
        "unavailableSourceExamples": unavailable_tei[:10],
        "errors": errors[:20], "dryRun": args.dry_run,
    }, ensure_ascii=False))
    if not created and errors:
        print("No se importó ninguna obra en este lote; revisar fallos sin afirmar cobertura.", file=sys.stderr)


if __name__ == "__main__":
    run()
