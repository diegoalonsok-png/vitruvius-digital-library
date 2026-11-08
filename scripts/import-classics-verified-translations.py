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
    dict(id="hippocrates-aphorisms", original="grc", repo="canonical-greekLit",
         path="data/tlg0627/tlg012/tlg0627.tlg012.perseus-eng2.xml",
         blob="d4a9d7434955eede6a1624c0c24a2adb45953b22",
         translator="Francis Adams", year=1886,
         publisher="William Wood and Company, New York",
         mode="section-aphorisms", min_units=410, min_chars=28000),
    dict(id="plato-meno", original="grc", repo="canonical-greekLit",
         path="data/tlg0059/tlg024/tlg0059.tlg024.perseus-eng2.xml",
         blob="05cfc5200f2c5719703d479493f53e2e299e837a",
         translator="Walter Rangeley Maitland Lamb", year=1924,
         publisher="Harvard University Press / William Heinemann",
         mode="stephanus-sections", min_units=31, min_chars=29000),
    dict(id="plato-symposium", original="grc", repo="canonical-greekLit",
         path="data/tlg0059/tlg011/tlg0059.tlg011.perseus-eng2.xml",
         blob="2062d2cb8cfe182bce903b96704909c0b631e954",
         translator="Walter Rangeley Maitland Lamb", year=1925,
         publisher="Harvard University Press / William Heinemann",
         mode="stephanus-sections", min_units=52, min_chars=45000),
    dict(id="plato-gorgias", original="grc", repo="canonical-greekLit",
         path="data/tlg0059/tlg023/tlg0059.tlg023.perseus-eng2.xml",
         blob="cc4d587ec81c2433472c950cf6dc8a99518512bd",
         translator="Walter Rangeley Maitland Lamb", year=1925,
         publisher="Harvard University Press / William Heinemann",
         mode="stephanus-sections", min_units=81, min_chars=70000),
    dict(id="plato-crito", original="grc", repo="canonical-greekLit",
         path="data/tlg0059/tlg003/tlg0059.tlg003.perseus-eng2.xml",
         blob="7a1903d28f63aa491becaa874b54f9dc5e1a6287",
         translator="Harold North Fowler", year=1914,
         publisher="Harvard University Press / William Heinemann",
         mode="stephanus-sections", min_units=12, min_chars=12000),
    dict(id="plato-phaedo", original="grc", repo="canonical-greekLit",
         path="data/tlg0059/tlg004/tlg0059.tlg004.perseus-eng2.xml",
         blob="1742b19ee9808128c471de37127069d8bd8e6183",
         translator="Harold North Fowler", year=1914,
         publisher="Harvard University Press / William Heinemann",
         mode="stephanus-sections", min_units=62, min_chars=85000),
    dict(id="aeschylus-suppliants", original="grc", repo="canonical-greekLit",
         path="data/tlg0085/tlg001/tlg0085.tlg001.perseus-eng2.xml",
         blob="8114a610a69b70b0bebd234e56a65603e7c6d3ea",
         translator="Herbert Weir Smyth", year=1922,
         publisher="William Heinemann / G. P. Putnam's Sons",
         mode="verse-lines", min_units=380, min_chars=35000,
         editorialNote="Texto digital modernizado por Perseus; no reproducción diplomática de Smyth (1922)."),
    dict(id="aeschylus-persae", original="grc", repo="canonical-greekLit",
         path="data/tlg0085/tlg002/tlg0085.tlg002.perseus-eng2.xml",
         blob="adc9811e3c04d97ac1ce34d653eda61395066e9b",
         translator="Herbert Weir Smyth", year=1922, publisher="William Heinemann / G. P. Putnam's Sons",
         mode="verse-lines", min_units=350, min_chars=35000),
    dict(id="aeschylus-seven-thebes", original="grc", repo="canonical-greekLit",
         path="data/tlg0085/tlg004/tlg0085.tlg004.perseus-eng2.xml",
         blob="ebf227eb004feb358f7e296f8506337403f58f5c",
         translator="Herbert Weir Smyth", year=1922, publisher="William Heinemann / G. P. Putnam's Sons",
         mode="verse-lines", min_units=340, min_chars=34000),
    dict(id="aeschylus-prometheus", original="grc", repo="canonical-greekLit",
         path="data/tlg0085/tlg003/tlg0085.tlg003.perseus-eng2.xml",
         blob="fc5f25eff4cd6be776718b996fbaaad132a4cd84",
         translator="Herbert Weir Smyth", year=1922, publisher="William Heinemann / G. P. Putnam's Sons",
         mode="verse-lines", min_units=360, min_chars=38000),
    dict(id="sophocles-antigone", original="grc", repo="canonical-greekLit",
         path="data/tlg0011/tlg002/tlg0011.tlg002.perseus-eng2.xml",
         blob="d395007cbcfa43c198a5a03fb97a5d4c6c194146",
         translator="Richard Jebb", year=1891, publisher="Cambridge University Press",
         mode="verse-lines", min_units=490, min_chars=47000),
    dict(id="sophocles-philoctetes", original="grc", repo="canonical-greekLit",
         path="data/tlg0011/tlg006/tlg0011.tlg006.perseus-eng2.xml",
         blob="ca67e862dc6c839ef6d4f12f50a0b724661238fc",
         translator="Richard Jebb", year=1898, publisher="Cambridge University Press",
         mode="verse-lines", min_units=590, min_chars=53000),
    dict(id="sophocles-oedipus-colonus", original="grc", repo="canonical-greekLit",
         path="data/tlg0011/tlg007/tlg0011.tlg007.perseus-eng2.xml",
         blob="bcbc848c2e6bd71b7eec27b4c163d1e6035374f8",
         translator="Richard Jebb", year=1889, publisher="Cambridge University Press",
         mode="verse-lines", min_units=780, min_chars=62000),
    dict(id="sophocles-electra", original="grc", repo="canonical-greekLit",
         path="data/tlg0011/tlg005/tlg0011.tlg005.perseus-eng2.xml",
         blob="d2f17610bc0f87b6e8ed07b522c7901de7fb7ff1",
         translator="Richard Jebb", year=1894, publisher="Cambridge University Press",
         mode="verse-lines", min_units=610, min_chars=53000),
    dict(id="euripides-bacchae", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg017/tlg0006.tlg017.perseus-eng2.xml",
         blob="8837a3e1ea3952a962df6570a86b53ced89f256d",
         translator="T. A. Buckley", year=1850, publisher="Henry G. Bohn, London",
         mode="verse-lines", min_units=510, min_chars=46000),
    dict(id="euripides-hippolytus", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg005/tlg0006.tlg005.perseus-eng2.xml",
         blob="201a18b0e820156e2f3edb8e55f86b2876b937e4",
         translator="Edward P. Coleridge", year=1906, publisher="George Bell and Sons, London",
         mode="verse-lines", min_units=530, min_chars=49000),
    dict(id="euripides-alcestis", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg002/tlg0006.tlg002.perseus-eng2.xml",
         blob="5e761bdd16a62e6553ee1cd72d12d4d05d17389c", translator="Edward P. Coleridge",
         year=1906, publisher="George Bell and Sons, London",
         mode="verse-lines", min_units=480, min_chars=37000),
    dict(id="euripides-electra", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg012/tlg0006.tlg012.perseus-eng2.xml",
         blob="0c305bb6f2184a00c066996c24b17218f894007e", translator="Edward P. Coleridge",
         year=1891, publisher="George Bell and Sons, London",
         mode="verse-lines", min_units=540, min_chars=41000),
    dict(id="euripides-troades", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg011/tlg0006.tlg011.perseus-eng2.xml",
         blob="97cc56a17f4492aa931295a2f21ea27bab833a88", translator="Edward P. Coleridge",
         year=1906, publisher="George Bell and Sons, London",
         mode="verse-lines", min_units=440, min_chars=35000),
    dict(id="euripides-hecuba", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg007/tlg0006.tlg007.perseus-eng2.xml",
         blob="ee3a815ae12dbac49b5576609be215dbb506a9b9", translator="Edward P. Coleridge",
         year=1891, publisher="George Bell and Sons, London",
         mode="verse-lines", min_units=470, min_chars=36000),
    dict(id="euripides-iphigenia-aulid", original="grc", repo="canonical-greekLit",
         path="data/tlg0006/tlg018/tlg0006.tlg018.perseus-eng2.xml",
         blob="8cdeca29747c66e9e9b18aff71ab21e5a7674612", translator="Edward P. Coleridge",
         year=1891, publisher="George Bell and Sons, London",
         mode="verse-lines", min_units=680, min_chars=45000),
    dict(id="plato-timaeus", original="grc", repo="canonical-greekLit",
         path="data/tlg0059/tlg031/tlg0059.tlg031.perseus-eng2.xml",
         blob="125e21ce37e085963ad9130a0d893301097b5d3e", translator="Robert Gregg Bury", year=1929,
         publisher="Harvard University Press / William Heinemann Ltd.",
         mode="stephanus-sections", min_units=74, min_chars=65000),
    dict(id="plato-phaedrus", original="grc", repo="canonical-greekLit",
         path="data/tlg0059/tlg012/tlg0059.tlg012.perseus-eng2.xml",
         blob="5ee72b32f700d41ef8b9f18b59813744f465d4e3", translator="Harold North Fowler", year=1914,
         publisher="Harvard University Press / William Heinemann Ltd.",
         mode="stephanus-sections", min_units=52, min_chars=45000),
    dict(id="aristotle-nicomachean-ethics", original="grc", repo="canonical-greekLit",
         path="data/tlg0086/tlg010/tlg0086.tlg010.perseus-eng2.xml",
         blob="16b6cf05d7f5b7493e64d429f6cd6095d4854ec8", translator="Harris Rackham", year=1926,
         publisher="William Heinemann Ltd. / G. P. Putnam's Sons",
         mode="book-sections", min_units=110, min_chars=160000),
    dict(id="philo", original="grc", owner="OpenGreekAndLatin", repo="First1KGreek",
         path="data/tlg0018/tlg001/tlg0018.tlg001.1st1K-eng1.xml",
         blob="f6fa0377cfe8a5b8a30d6568a99420ffcb7f9936", translator="Charles Duke Yonge", year=1854,
         publisher="Henry G. Bohn, London", mode="hierarchical-sections",
         min_units=170, min_chars=90000),
    dict(id="philo-legum-allegoriae", original="grc", owner="OpenGreekAndLatin", repo="First1KGreek",
         path="data/tlg0018/tlg002/tlg0018.tlg002.1st1K-eng1.xml",
         blob="bc3190c9259edeb4474ebe7025e990cf224293f7", translator="Charles Duke Yonge", year=1854,
         publisher="Henry G. Bohn, London", mode="hierarchical-sections",
         min_units=450, min_chars=210000),
    dict(id="philo-de-vita-mosis", original="grc", owner="OpenGreekAndLatin", repo="First1KGreek",
         path="data/tlg0018/tlg022/tlg0018.tlg022.1st1K-eng1.xml",
         blob="f93c43182be0a148df79a0d8d20e0da9e81a0ac3", translator="Charles Duke Yonge", year=1855,
         publisher="Henry G. Bohn, London", mode="hierarchical-sections",
         min_units=610, min_chars=260000),
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
    # Algunas ediciones Perseus documentan al traductor en sourceDesc pero no
    # etiquetan su función en titleStmt. Exigir la atribución explícita del TEI,
    # sin inferir que todo editor o modernizador sea traductor.
    source_desc = root.find(".//" + NS + "sourceDesc")
    editors = [text_without_notes(x) for x in header.findall(NS + "editor")
               if x.get("role") == "translator"]
    if source_desc is not None:
        editors += [text_without_notes(x) for x in source_desc.iter(NS + "editor")
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
    elif candidate["mode"] == "stephanus-sections":
        # Unidades Stephanus de la TEI: 57–118, sin atribuir letras
        # ni equivalencias palabra a palabra que el marcado no certifique.
        passages = []
        for div in body.iter(NS + "div"):
            if div.get("subtype") != "section" or not div.get("n"):
                continue
            numbered = str(div.get("n")).strip()
            value = " ".join(text_without_notes(p) for p in div.iter(NS + "p")).strip()
            if len(value) >= 25:
                passages.append(dict(
                    locus=numbered, text=value,
                    locusKind="página Stephanus de traducción inglesa TEI; sin colación palabra a palabra"))
        unit_count = len(passages)
        if unit_count < candidate["min_units"]:
            raise ValueError("Secciones Stephanus incompletas: " + str(unit_count))
        if len({p["locus"] for p in passages}) != unit_count:
            raise ValueError("Secciones Stephanus duplicadas")
    elif candidate["mode"] == "section-aphorisms":
        passages = []
        for div in body.iter(NS + "div"):
            if div.get("subtype") != "aphorism":
                continue
            section = next((a for a in ancestors(div)
                            if a.tag == NS + "div" and a.get("subtype") == "section"), None)
            if section is None or not section.get("n") or not div.get("n"):
                continue
            # Cada sentencia mantiene su sección y número, sin notas ni encabezados.
            value = " ".join(text_without_notes(p) for p in div.iter(NS + "p")).strip()
            if value:
                passages.append(dict(
                    locus=section.get("n") + "." + div.get("n"), text=value,
                    locusKind="sección y aforismo CTS de traducción inglesa; no colación de griego-inglés"))
        unit_count = len(passages)
        if unit_count < candidate["min_units"]:
            raise ValueError("Aforismos traducidos insuficientes: " + str(unit_count))
        if len({p["locus"] for p in passages}) != unit_count:
            raise ValueError("Aforismos traducidos con loci duplicados")
    elif candidate["mode"] == "hierarchical-sections":
        passages = []
        for div in body.iter(NS + "div"):
            if div.get("subtype") != "section" or not div.get("n"):
                continue
            book = next((a for a in ancestors(div)
                         if a.tag == NS + "div" and a.get("subtype") == "book"), None)
            locus = (book.get("n") + "." if book is not None and book.get("n") else "") + div.get("n")
            value = " ".join(text_without_notes(p) for p in div.iter(NS + "p")).strip()
            if len(value) >= 25:
                passages.append(dict(locus=locus, text=value,
                    locusKind="sección TEI inglesa First1K; sin alineación filológica certificada"))
        unit_count = len(passages)
        if unit_count < candidate["min_units"]:
            raise ValueError("Faltan secciones de traducción: " + str(unit_count))
        if len({p["locus"] for p in passages}) != unit_count:
            raise ValueError("Loci repetidos; revisar jerarquía TEI")
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
    owner = candidate.get("owner", "PerseusDL")
    if (owner, candidate["repo"]) not in {
        ("PerseusDL", "canonical-greekLit"),
        ("PerseusDL", "canonical-latinLit"),
        ("OpenGreekAndLatin", "First1KGreek"),
    }:
        raise ValueError("Repositorio TEI no aprobado")
    url = ("https://raw.githubusercontent.com/" + owner + "/" +
           candidate["repo"] + "/master/" + candidate["path"])
    req = Request(url, headers={"User-Agent": "VitruviusAcademicTranslations/1.0"})
    with urlopen(req, timeout=60) as response:
        raw = response.read(MAX_SOURCE + 1)
    if not raw or len(raw) > MAX_SOURCE:
        raise ValueError("Fuente ausente o demasiado grande")
    if owner == "OpenGreekAndLatin" and (
        b"creativecommons.org/licenses/by-sa/4.0/" not in raw or b"<licence" not in raw
    ):
        raise ValueError("Fuente First1K sin licencia verificable")
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
        source_name = ("OpenGreekAndLatin First1KGreek" if c.get("owner") == "OpenGreekAndLatin"
                       else "Perseus Digital Library")
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
                                    ", " + str(c["year"]) + ". " + source_name + ", TEI.")))
        registry["entries"].append(dict(
            workId=wid, author=w.get("author", ""), title=w.get("title", ""),
            language="en", format="json-passages", path=filename,
            reader="classics-text-reader.html?work=" + wid + "&lang=en",
            sourceDescription="Traducción histórica de " + c["translator"] +
                              " (" + str(c["year"]) + "); TEI " + source_name + " verificado por SHA; sin cotejo automático"))
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
             " (" + str(c["year"]) + "), texto completo de la fuente TEI " + source_name +
             " con procedencia por SHA; sin alineación textual certificada.")

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
    limit = max(1, min(args.max_new, 12))
    catalog, registry, audit, backlog, coverage = (
        read(CAT), read(REG), read(AUD), read(BACK), read(COVER))
    already = {(e["workId"], e["language"]) for e in registry["entries"]}
    by_id = {w["id"]: w for w in catalog["works"]}
    additions, failures, pending_originals, size = [], [], [], 0
    for candidate in CANDIDATES:
        wid = candidate["id"]
        filename = "data/classics-corpus/" + wid + "-en.json"
        if (wid, "en") in already:
            continue
        if (wid, candidate["original"]) not in already:
            # Dependencia académica real, no error de código: la traducción queda
            # pendiente sin inventar un original y se reintentará en otros lotes.
            pending_originals.append(wid)
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
                sourceType=("historical-english-first1k-tei" if candidate.get("owner") == "OpenGreekAndLatin"
                             else "historical-english-perseus-tei"),
                source=url,
                sourceGitBlobSha=candidate["blob"], sourceSha256=hashlib.sha256(raw).hexdigest(),
                license=("CC BY-SA 4.0 · " + ("OpenGreekAndLatin First1KGreek" if candidate.get("owner") == "OpenGreekAndLatin"
                                                   else "Perseus Digital Library") + " TEI"),
                attribution=(by_id[wid]["author"] + ". " + by_id[wid]["title"] +
                             ". English translation by " + candidate["translator"] +
                             " (" + str(candidate["year"]) + "), TEI " + ("OpenGreekAndLatin First1KGreek" if candidate.get("owner") == "OpenGreekAndLatin" else "PerseusDL") + "."),
                editorialStatus=("Traducción histórica; fuente TEI cotejada estructuralmente, no colación filológica independiente. "+candidate.get("editorialNote", "")).strip(),
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
        updated=date.today().isoformat(), sources="PerseusDL / OpenGreekAndLatin First1KGreek, TEI con SHA fijado",
        newTranslations=len(additions), titles=[a["candidate"]["id"] for a in additions],
        indexedWorks=registry["works"], indexedVersions=registry["count"],
        translatedWorks=coverage["totals"]["translatedWorksLocal"],
        failures=failures, pendingOriginals=pending_originals,
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
