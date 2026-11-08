#!/usr/bin/env python3
"""Importar traducciones inglesas históricas con procedencia TEI verificable.

NO genera traducciones. Requiere original local, versión TEI identificada y
hash de blob Git verificable; conserva sin alterar textos madre y manuscritos.
Las unidades de traducción NO constituyen alineación automática con el original.
"""
from __future__ import annotations

import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/classics-corpus"
CAT = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
REG = BASE / "search-registry.json"
AUD = BASE / "coverage-audit.json"
BACK = BASE / "indexation-backlog.json"
COVER = BASE / "translation-availability-222.json"
REPORT = BASE / "translation-import-status.json"
NS = "{http://www.tei-c.org/ns/1.0}"
SKIP = {"note", "head", "pb", "fw", "bibl", "teiHeader"}
MAX_SOURCE = 2_300_000
MAX_BATCH = 1_900_000

# Fuentes históricas digitalizadas y codificadas por Perseus (CC BY-SA 4.0).
# Se fijan SHA de blobs Git para impedir la sustitución silenciosa de una edición.
CANDIDATES = [
    dict(id="cicero-catilinariae", original="la", repo="canonical-latinLit",
         path="data/phi0474/phi013/phi0474.phi013.perseus-eng2.xml",
         blob="73ba36a8365d911d41719c5124a0d70a08c21bb0",
         translator="Charles Duke Yonge", year=1856, publisher="Henry G. Bohn, London",
         mode="speech-sections", min_units=85, min_chars=17000),
    dict(id="aristophanes-clouds", original="grc", repo="canonical-greekLit",
         path="data/tlg0019/tlg003/tlg0019.tlg003.perseus-eng2.xml",
         blob="3c81b24c9c1e5b3405883c67aa81c4edf6bc8177",
         translator="William James Hickie", year=1853, publisher="Bohn, London",
         mode="verse-lines", min_units=600, min_chars=20000),
    dict(id="sophocles-oedipus", original="grc", repo="canonical-greekLit",
         path="data/tlg0011/tlg004/tlg0011.tlg004.perseus-eng2.xml",
         blob="bdfb8852df1f0c5341aed2153447d2dd5c146b23",
         translator="Richard Jebb", year=1887, publisher="Cambridge University Press",
         mode="verse-lines", min_units=600, min_chars=20000),
    dict(id="lucian-verae-historiae", original="grc", repo="canonical-greekLit",
         path="data/tlg0062/tlg012/tlg0062.tlg012.perseus-eng2.xml",
         blob="f4af940f2e29362dfb1cd1b899be54680032c0da",
         translator="Austin Morris Harmon", year=1913,
         publisher="William Heinemann / Harvard University Press",
         mode="book-sections", min_units=85, min_chars=18000),
    dict(id="euripides-medea", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg003/tlg0006.tlg003.perseus-eng2.xml",
         blob="7585638769674650b167e6bdcf8296a1dc38dc7d",
         translator="Edward P. Coleridge", year=1906,
         publisher="George Bell and Sons, London",
         mode="verse-lines", min_units=400, min_chars=15000),
    dict(id="aristotle-politics", original="grc", repo="canonical-greekLit",
         path="data/tlg0086/tlg035/tlg0086.tlg035.perseus-eng2.xml",
         blob="0a8143122a35118da8ab8421746ca8eca5011482",
         translator="Harris Rackham", year=1944,
         publisher="William Heinemann / Harvard University Press",
         mode="book-bekker-pages", min_units=160, min_chars=55000),
]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def local(tag):
    return tag.rsplit("}", 1)[-1]


def text_without_notes(elem):
    pieces = []

    def walk(node):
        if local(node.tag) in SKIP:
            return
        if node.text:
            pieces.append(node.text)
        for child in node:
            walk(child)
            if child.tail:
                pieces.append(child.tail)

    walk(elem)
    return " ".join(" ".join(pieces).split())


def extract(raw, candidate):
    root = ET.fromstring(raw)
    header = root.find(".//" + NS + "titleStmt")
    if header is None:
        raise ValueError("TEI sin titleStmt")
    editors = [text_without_notes(x) for x in header.findall(NS + "editor")
               if x.get("role") == "translator"]
    if candidate["translator"] not in editors:
        raise ValueError("Traductor TEI distinto del acreditado: " + repr(editors))
    if not any(str(candidate["year"]) in "".join(x.itertext())
               for x in root.findall(".//" + NS + "sourceDesc")):
        raise ValueError("La fecha de la edición no aparece en sourceDesc")
    body = root.find(".//" + NS + "body")
    if body is None:
        raise ValueError("TEI sin cuerpo")
    parents = {child: parent for parent in body.iter() for child in parent}

    def ancestors(node):
        while node in parents:
            node = parents[node]
            yield node

    if candidate["mode"] == "speech-sections":
        passages = []
        for div in body.iter(NS + "div"):
            if div.get("subtype") != "section":
                continue
            speech = next((a for a in ancestors(div)
                           if a.tag == NS + "div" and a.get("subtype") == "speech"), None)
            if speech is None or not speech.get("n") or not div.get("n"):
                continue
            # Se excluyen encabezados, argumentos editoriales y notas.
            prose = [p for p in div.iter(NS + "p") if
                     not any(a.tag == NS + "div" and a.get("subtype") == "commentary"
                             for a in ancestors(p))]
            value = " ".join(text_without_notes(p) for p in prose).strip()
            if len(value) >= 25:
                passages.append(dict(
                    locus=speech.get("n") + "." + div.get("n"), text=value,
                    locusKind="oración y sección CTS de traducción inglesa"))
        if len(passages) < candidate["min_units"]:
            raise ValueError("Cobertura insuficiente de secciones: " + str(len(passages)))
        if len({p["locus"] for p in passages}) != len(passages):
            raise ValueError("Secciones duplicadas")
        unit_count = len(passages)
    elif candidate["mode"] == "book-sections":
        passages = []
        for div in body.iter(NS + "div"):
            if div.get("subtype") != "section":
                continue
            book = next((a for a in ancestors(div)
                         if a.tag == NS + "div" and a.get("subtype") == "book"), None)
            if book is None or not book.get("n") or not div.get("n"):
                continue
            # Filtrar las notas/paratextos; el locus pertenece a la traducción TEI.
            paragraphs = [p for p in div.iter(NS + "p")]
            value = " ".join(text_without_notes(p) for p in paragraphs).strip()
            if len(value) >= 25:
                passages.append(dict(
                    locus=book.get("n") + "." + div.get("n"), text=value,
                    locusKind="libro y sección CTS de traducción inglesa; sin colación automática"))
        unit_count = len(passages)
        if unit_count < candidate["min_units"]:
            raise ValueError("Cobertura insuficiente de secciones: " + str(unit_count))
        if len({p["locus"] for p in passages}) != unit_count:
            raise ValueError("Loci de secciones duplicados")
    elif candidate["mode"] == "book-bekker-pages":
        passages = []
        for div in body.iter(NS + "div"):
            if div.get("subtype") != "bekker_page":
                continue
            book = next((a for a in ancestors(div)
                         if a.tag == NS + "div" and a.get("subtype") == "book"), None)
            if book is None or not book.get("n") or not div.get("n"):
                continue
            paragraphs = [p for p in div.iter(NS + "p")]
            value = " ".join(text_without_notes(p) for p in paragraphs).strip()
            if len(value) >= 25:
                passages.append(dict(
                    locus=book.get("n") + "." + div.get("n"), text=value,
                    locusKind="libro y página Bekker de traducción inglesa; sin colación automática"))
        unit_count = len(passages)
        if unit_count < candidate["min_units"]:
            raise ValueError("Cobertura insuficiente de páginas Bekker: " + str(unit_count))
        if len({p["locus"] for p in passages}) != unit_count:
            raise ValueError("Páginas Bekker de traducción repetidas")
    else:
        verses = []
        for line in body.iter(NS + "l"):
            if any(local(a.tag) in {"note", "head", "teiHeader", "bibl"}
                   for a in ancestors(line)):
                continue
            t = text_without_notes(line)
            if len(t) > 3:
                verses.append((line.get("n"), t))
        unit_count = len(verses)
        if unit_count < candidate["min_units"]:
            raise ValueError("Versos de traducción insuficientes: " + str(unit_count))
        passages = []
        for i in range(0, len(verses), 10):
            group = verses[i:i + 10]
            start = group[0][0] or str(i + 1)
            end = group[-1][0] or str(i + len(group))
            passages.append(dict(
                locus="en-lines-" + str(start) + "-" + str(end),
                text=" ".join(t for _, t in group),
                locusKind="rango de versos ingleses según TEI; no alineación griego-inglés"))
        if len({p["locus"] for p in passages}) != len(passages):
            raise ValueError("Rangos editoriales de versos no únicos")
    total_chars = sum(len(p["text"]) for p in passages)
    if total_chars < candidate["min_chars"]:
        raise ValueError("Extracción insuficiente: " + str(total_chars) + " caracteres")
    return passages, unit_count, total_chars


def fetch(candidate):
    url = ("https://raw.githubusercontent.com/PerseusDL/" +
           candidate["repo"] + "/master/" + candidate["path"])
    req = Request(url, headers={"User-Agent": "VitruviusAcademicTranslations/1.0"})
    with urlopen(req, timeout=60) as response:
        raw = response.read(MAX_SOURCE + 1)
    if not raw or len(raw) > MAX_SOURCE:
        raise ValueError("Fuente ausente o demasiado grande")
    blob = hashlib.sha1(b"blob " + str(len(raw)).encode() + bytes([0]) + raw).hexdigest()
    if blob != candidate["blob"]:
        raise ValueError("El SHA del TEI remoto cambió: requiere nueva revisión")
    return url, raw


def update_derived(catalog, registry, audit, backlog, coverage, new):
    by_cat = {x["id"]: x for x in catalog["works"]}
    by_aud = {x["id"]: x for x in audit["works"]}
    by_back = {x["id"]: x for x in backlog["entries"]}
    by_cov = {x["id"]: x for x in coverage["works"]}
    for item in new:
        c = item["candidate"]
        wid = c["id"]
        filename = item["path"]
        w = by_cat[wid]
        w.setdefault("corpusFiles", {})["en"] = filename
        versions = w.setdefault("localVersions", [])
        if not any(v.get("language") == "en" and v.get("path") == filename for v in versions):
            versions.append(dict(language="en", label="English · " + c["translator"] +
                                 " (" + str(c["year"]) + ")",
                                 path="classics-text-reader.html?work=" + wid + "&lang=en",
                                 kind="historical-translation",
                                 citationChicago18=(w.get("author", "") + ". " +
                                    w.get("title", "") + ". Translated by " +
                                    c["translator"] + ". " + c["publisher"] +
                                    ", " + str(c["year"]) + ". Perseus Digital Library, TEI.")))
        registry["entries"].append(dict(
            workId=wid, author=w.get("author", ""), title=w.get("title", ""),
            language="en", format="json-passages", path=filename,
            reader="classics-text-reader.html?work=" + wid + "&lang=en",
            sourceDescription="Traducción histórica de " + c["translator"] +
                              " (" + str(c["year"]) + "); TEI Perseus verificado por SHA; sin cotejo automático"))
        a = by_aud[wid]
        a["indexedTextLanguages"] = sorted(set(a.get("indexedTextLanguages", [])) | {"en"})
        a["indexedTextFiles"] = sorted(set(a.get("indexedTextFiles", [])) | {filename})
        a["hasDedicatedReader"] = True
        back = by_back[wid]
        back["indexed"] = sorted(set(back.get("indexed", [])) | {"en"})
        back["missing"] = sorted(set(back.get("missing", [])) - {"en"})
        cov = by_cov[wid]
        cov["originalIndexed"] = True
        cov["indexed"] = True
        cov["translationLanguages"] = sorted(set(cov.get("translationLanguages", [])) | {"en"})
        cov["localEditionLanguages"] = sorted(set(cov.get("localEditionLanguages", [])) | {"en"})
        cov["translationRegisteredButNotHosted"] = False
        cov["translationSourceDescription"] = "Inglés histórico: " + c["translator"] + (
             " (" + str(c["year"]) + "), texto completo de la fuente TEI Perseus "
             "con procedencia por SHA; sin alineación textual certificada.")

    langs_by_work = {}
    for e in registry["entries"]:
        langs_by_work.setdefault(e["workId"], set()).add(e["language"])
    registry["count"] = len(registry["entries"])
    registry["works"] = len(langs_by_work)
    registry["updated"] = date.today().isoformat()
    audit["date"] = registry["updated"]
    audit["counts"]["indexedTextVersions"] = registry["count"]
    audit["counts"]["indexedDistinctWorks"] = registry["works"]
    backlog["snapshot"] = registry["updated"]
    backlog["missingOriginals"] = sum(
        e.get("original") not in langs_by_work.get(e["id"], set())
        for e in backlog["entries"] if e.get("original"))
    coverage["generated"] = registry["updated"]
    totals = coverage["totals"]
    totals["locallyIndexedWorks"] = registry["works"]
    totals["translatedWorksLocal"] = sum(bool(w.get("translationLanguages"))
                                         for w in coverage["works"])
    totals["worksWithoutHostedTranslation"] = len(coverage["works"]) - totals["translatedWorksLocal"]
    totals["localTranslationLanguages"] = {language: sum(
        language in w.get("translationLanguages", []) for w in coverage["works"])
        for language in ("es", "en", "fr")}
    totals["originalTextIndexed"] = sum(w.get("originalIndexed", False)
                                        for w in coverage["works"])
    totals["originalTextNotIndexed"] = len(coverage["works"]) - totals["originalTextIndexed"]


def run():
    p = argparse.ArgumentParser()
    p.add_argument("--max-new", type=int, default=3)
    args = p.parse_args()
    limit = max(1, min(args.max_new, 6))
    catalog, registry, audit, backlog, coverage = (
        read(CAT), read(REG), read(AUD), read(BACK), read(COVER))
    already = {(e["workId"], e["language"]) for e in registry["entries"]}
    by_id = {w["id"]: w for w in catalog["works"]}
    additions, failures, size = [], [], 0
    for candidate in CANDIDATES:
        wid = candidate["id"]
        filename = "data/classics-corpus/" + wid + "-en.json"
        if (wid, "en") in already:
            continue
        if (wid, candidate["original"]) not in already:
            failures.append(wid + ": el original todavía no está indexado")
            continue
        if (ROOT / filename).exists():
            failures.append(wid + ": archivo preexistente sin registrar; revisión manual")
            continue
        if wid not in by_id or by_id[wid].get("language") != candidate["original"]:
            failures.append(wid + ": ficha bibliográfica incompatible")
            continue
        try:
            url, raw = fetch(candidate)
            passages, units, chars = extract(raw, candidate)
            doc = dict(
                workId=wid, language="en", title=by_id[wid]["title"],
                originalLanguage=candidate["original"],
                translator=candidate["translator"], editionYear=candidate["year"],
                translationEdition=candidate["publisher"] + " (" + str(candidate["year"]) + ")",
                sourceType="historical-english-perseus-tei",
                source=url,
                sourceGitBlobSha=candidate["blob"], sourceSha256=hashlib.sha256(raw).hexdigest(),
                license="CC BY-SA 4.0 · Perseus Digital Library TEI",
                attribution=(by_id[wid]["author"] + ". " + by_id[wid]["title"] +
                             ". English translation by " + candidate["translator"] +
                             " (" + str(candidate["year"]) + "), TEI PerseusDL."),
                editorialStatus="Traducción histórica; fuente TEI cotejada estructuralmente, no colación filológica independiente",
                alignmentStatus="unaligned",
                alignment="No alineado por equivalencia verbal con el original; loci propios de esta traducción TEI.",
                coverage=dict(sourceUnitsVerified=units, passages=len(passages), chars=chars,
                              unitType=candidate["mode"]),
                passages=passages)
            rawjson = (json.dumps(doc, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            if len(rawjson) + size > MAX_BATCH:
                raise ValueError("Límite del lote excedido")
            additions.append(dict(candidate=candidate, path=filename, bytes=rawjson, units=units))
            size += len(rawjson)
            if len(additions) >= limit:
                break
        except Exception as err:
            failures.append(wid + ": " + str(err)[:200])

    if additions:
        update_derived(catalog, registry, audit, backlog, coverage, additions)
        for row in additions:
            (ROOT / row["path"]).write_bytes(row["bytes"])
        for path, obj in [(CAT, catalog), (REG, registry), (AUD, audit),
                          (BACK, backlog), (COVER, coverage)]:
            save(path, obj)
    save(REPORT, dict(
        updated=date.today().isoformat(), sources="PerseusDL TEI con SHA fijado",
        newTranslations=len(additions), titles=[a["candidate"]["id"] for a in additions],
        indexedWorks=registry["works"], indexedVersions=registry["count"],
        translatedWorks=coverage["totals"]["translatedWorksLocal"],
        failures=failures,
        policy=("Nada de traducciones automáticas presentadas como históricas. "
                "Mantener obras originales y versiones sin alineación forzada.")))
    print(json.dumps(dict(added=len(additions),
                          titles=[a["candidate"]["id"] for a in additions],
                          failures=failures, indexed=registry["works"],
                          translated=coverage["totals"]["translatedWorksLocal"]),
                     ensure_ascii=False))
    if failures and not additions:
        print("No se publicó ninguna traducción: revisar fuentes y derechos", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    run()
