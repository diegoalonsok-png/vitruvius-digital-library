#!/usr/bin/env python3
"""Vitruvia Lexicon · construye los datos de consulta léxica y fraseológica.

Salidas (data/lexicon/):
  corpus-la.json   pasajes latinos de las obras locales (texto editado, con atribución)
  corpus-grc.json  pasajes griegos de las obras locales
  forms-la.json    forma plegada → [[lema, obra…]] + lema → {h, g, id}
  forms-grc.json   forma plegada → [[lema, morfología, obras…]] + lema → {g, id}

Solo reorganiza materiales ya presentes en el repositorio (data/classics-corpus,
data/classics-lexicon, data/vitruvius-chunks.json y corpus/*.html). No añade
textos, lecturas ni glosas nuevas.
"""
import html, json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "lexicon"
OUT.mkdir(parents=True, exist_ok=True)


def fold(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return s.replace("ς", "σ").replace("ϲ", "σ").replace("j", "i").replace("v", "u")


WORKS = {
    # id: (autor, título, lengua, edición, lector, prefijo de cita)
    "vitruvius": ("Vitruvio", "De architectura", "la",
                  "Recensio latina de la edición Kurilo V514 (base declarada: Krohn 1912); traducción castellana V514",
                  "lector-bilingue.html?edition=recensio-es&locus={locus}", "Vitr."),
    "lucretius": ("Lucrecio", "De rerum natura", "la",
                  "Transcripción de la Wikisource latina (dominio público; contribuciones CC BY-SA)",
                  "corpus/lucretius-de-rerum-natura-la.html#liber-{book}", "Lucr."),
    "cicero-officiis": ("Cicerón", "De officiis", "la",
                        "W. Miller, Loeb 1913; Project Gutenberg 47001",
                        "corpus/cicero-de-officiis-la.html#book{book}", "Cic. Off."),
    "catullus-carmina": ("Catulo", "Carmina", "la",
                         "R. Ellis, Oxford 1904; Project Gutenberg 23294",
                         "corpus/catullus-carmina-la.html#carmen-{roman}", "Catull."),
    "virgil-aeneid": ("Virgilio", "Aeneis", "la", None,
                      "classics-text-reader.html?work=virgil-aeneid&lang=la", "Verg. A."),
    "virgil-georgica": ("Virgilio", "Georgica", "la", None,
                        "classics-text-reader.html?work=virgil-georgica&lang=la", "Verg. G."),
    "caesar-gallico": ("César", "De bello Gallico", "la", None,
                       "classics-text-reader.html?work=caesar-gallico&lang=la", "Caes. Gal."),
    "petronius-satyrica": ("Petronio", "Satyrica", "la", None,
                           "classics-text-reader.html?work=petronius-satyrica&lang=la", "Petr."),
    "apuleius-metamorphoses": ("Apuleyo", "Metamorphoses", "la", None,
                               "classics-text-reader.html?work=apuleius-metamorphoses&lang=la", "Apul. Met."),
    "homer-iliad": ("Homero", "Ilíada", "grc", None,
                    "classics-text-reader.html?work=homer-iliad&lang=grc", "Hom. Il."),
    "homer-odyssey": ("Homero", "Odisea", "grc", None,
                      "classics-text-reader.html?work=homer-odyssey&lang=grc", "Hom. Od."),
    "plato-apology": ("Platón", "Apología de Sócrates", "grc", None,
                      "classics-text-reader.html?work=plato-apology&lang=grc", "Pl. Ap."),
    "aristotle-poetics": ("Aristóteles", "Poética", "grc", None,
                          "classics-text-reader.html?work=aristotle-poetics&lang=grc", "Arist. Po."),
    "epictetus-enchiridion": ("Epicteto", "Enchiridion", "grc", None,
                              "classics-text-reader.html?work=epictetus-enchiridion&lang=grc", "Epict. Ench."),
    "theophrastus-characters": ("Teofrasto", "Caracteres", "grc", None,
                                "classics-text-reader.html?work=theophrastus-characters&lang=grc", "Thphr. Char."),
}

ROMAN = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
         (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]


def roman(n):
    out = ""
    for v, s in ROMAN:
        while n >= v:
            out += s
            n -= v
    return out


def from_roman(s):
    vals = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    for i, c in enumerate(s):
        v = vals[c]
        total += -v if i + 1 < len(s) and vals[s[i + 1]] > v else v
    return total


def clean(t):
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return re.sub(r"[ \t]+", " ", t).strip()


corpus = {"la": [], "grc": []}
meta = {}


def add(work, locus, text, verse_start=None, tr=None):
    lang = WORKS[work][2]
    row = [work, locus, text.strip()]
    if verse_start is not None or tr:
        row.append(verse_start)
    if tr:
        row.append(tr)
    corpus[lang].append(row)


# 1. Obras JSON ya alineadas por pasajes (Perseus DL)
for work in ["virgil-aeneid", "virgil-georgica", "caesar-gallico", "petronius-satyrica",
             "apuleius-metamorphoses", "homer-iliad", "homer-odyssey", "plato-apology",
             "aristotle-poetics", "epictetus-enchiridion", "theophrastus-characters"]:
    lang = WORKS[work][2]
    d = json.loads((ROOT / f"data/classics-corpus/{work}-{lang}.json").read_text())
    meta[work] = {"edition": d.get("attribution", ""), "license": d.get("license", ""),
                  "status": d.get("editorialStatus", "")}
    for p in d["passages"]:
        start = None
        m = re.match(r"vv\. (\d+)[–-](\d+)", p.get("title", "") or "")
        # Solo se calcula el verso exacto cuando la cuenta de líneas coincide con el rango declarado.
        if m and int(m[2]) - int(m[1]) + 1 == p["text"].count("\n") + 1:
            start = int(m[1])
        add(work, p["locus"], p["text"], start)

# 2. Vitruvio: latín V514 con su traducción castellana
chunks = json.loads((ROOT / "data/vitruvius-chunks.json").read_text())["chunks"]
for c in chunks:
    if c.get("edicion") == "V514" and c.get("texto"):
        add("vitruvius", c["locus"], c["texto"], None, c.get("traduccion") or None)
# Las voces griegas que Vitruvio cita (τάξις, διάθεσις, οἰκονομία…) también se buscan desde el griego.
GREEK_RE = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")
for row in [r for r in corpus["la"] if r[0] == "vitruvius" and GREEK_RE.search(r[2])]:
    corpus["grc"].append(list(row))
meta["vitruvius"] = {"edition": WORKS["vitruvius"][3], "license": "© Diego A. Kurilo, acceso abierto; cítese la edición V514 (DOI 10.5281/zenodo.23884757)",
                     "status": "Edición de lectura con aparato crítico selectivo"}

# 3. Lucrecio (HTML, versos con la numeración impresa cada cinco)
def numbered(lines_raw):
    """Asigna a cada verso el número impreso (cada cinco versos) y cuenta los intermedios."""
    out, n = [], 0
    for l in lines_raw:
        m = re.search(r"\s(\d+[a-z]?)\s*$", " " + l)
        text = re.sub(r"\s+\d+[a-z]?\s*$", "", l).strip()
        if not text:
            continue
        n += 1
        if m and m[1].isdigit():
            n = int(m[1])
        out.append((n, text))
    return out


def chunks_by_number(work, prefix, verses, size=20):
    block = []
    for v in verses:
        if block and (len(block) >= size or v[0] != block[-1][0] + 1):
            add(work, f"{prefix}{block[0][0]}", "\n".join(t for _, t in block), block[0][0])
            block = []
        block.append(v)
    if block:
        add(work, f"{prefix}{block[0][0]}", "\n".join(t for _, t in block), block[0][0])


s = (ROOT / "corpus/lucretius-de-rerum-natura-la.html").read_text()
for book, body in re.findall(r'<section id="liber-(\d)">(.*?)</section>', s, re.S):
    body = re.sub(r"<h2>.*?</h2>", "", body, flags=re.S)
    raw = [clean(l) for l in re.split(r"<br\s*/?>|\n", body)]
    chunks_by_number("lucretius", f"{book}.", numbered(raw))
meta["lucretius"] = {"edition": WORKS["lucretius"][3], "license": "Dominio público / CC BY-SA (Wikisource)",
                     "status": "Transcripción, no edición crítica nueva"}

# 4. Cicerón, De officiis (párrafos con número de sección)
s = (ROOT / "corpus/cicero-de-officiis-la.html").read_text()
book, sec, buf = None, None, []


def flush():
    if book and sec and buf:
        add("cicero-officiis", f"{book}.{sec}", " ".join(buf))


for b, p in re.findall(r'<h2 id="book(\d)">|<p>(.*?)</p>', s, re.S):
    if b:
        flush(); book, sec, buf = b, None, []
        continue
    t = re.sub(r"\[\d+\]", "", clean(p))
    m = re.match(r"(\d+)\s+(.*)", t, re.S)
    if m:
        flush(); sec, buf = m[1], [re.sub(r"^[IVXLC]+\.\s+", "", m[2])]
    elif sec:
        buf.append(re.sub(r"^[IVXLC]+\.\s+", "", t))
flush()
meta["cicero-officiis"] = {"edition": WORKS["cicero-officiis"][3], "license": "Dominio público", "status": "Texto de la edición Loeb"}

# 5. Catulo (un poema por pasaje; numeración impresa cada cinco versos)
s = (ROOT / "corpus/catullus-carmina-la.html").read_text()
for num, body in re.findall(r'<article class="poem" id="carmen-([IVXLC]+)".*?<pre class="verses" lang="la">(.*?)</pre>', s, re.S):
    verses = numbered([clean(l) for l in body.split("\n")])
    if verses:
        add("catullus-carmina", str(from_roman(num)), "\n".join(t for _, t in verses), verses[0][0])
meta["catullus-carmina"] = {"edition": WORKS["catullus-carmina"][3], "license": "Dominio público", "status": "Edición crítica de Ellis"}

works_out = {}
for w, (author, title, lang, ed, reader, cite) in WORKS.items():
    works_out[w] = {"author": author, "title": title, "lang": lang, "reader": reader, "cite": cite, **meta.get(w, {})}

for lang in ("la", "grc"):
    rows = corpus[lang]
    data = {"schema": "vitruvia-lexicon-corpus-v1", "lang": lang,
            "note": "Pasajes de textos editados ya presentes en la Vitruvius Digital Library; no son transcripciones diplomáticas de códices.",
            "works": {k: v for k, v in works_out.items() if v["lang"] == lang or (lang == "grc" and k == "vitruvius")},
            "passages": rows}
    (OUT / f"corpus-{lang}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(lang, len(rows), "pasajes", sum(len(r[2]) for r in rows), "caracteres")

# 6. Índice léxico: formas → lemas (lematizaciones automáticas existentes)
for lang in ("la", "grc"):
    forms, lemmas = {}, {}
    for f in sorted((ROOT / "data/classics-lexicon").glob(f"*-{lang}.json")):
        d = json.loads(f.read_text())
        wid = d["workId"]
        for k, v in d["lemmas"].items():
            cur = lemmas.setdefault(k, {})
            for kk in ("h", "g", "id"):
                if v.get(kk) and not cur.get(kk):
                    cur[kk] = v[kk]
        for form, analyses in d["forms"].items():
            key = fold(form)
            slot = forms.setdefault(key, {})
            for a in analyses:
                if isinstance(a, list):
                    lem, tag = a[0], (a[1] if len(a) > 1 else "")
                else:
                    lem, tag = a, ""
                ent = slot.setdefault((lem, tag), set())
                ent.add(wid)
    if lang == "la":
        # Correcciones manuales de la tabla CLTK, que asigna a «est», «es», «esse»… solo el lema edo
        # («comer»): se antepone sum, que es la lectura normal, y se conserva edo como alternativa.
        for f_ in ("est", "es", "esse", "estis", "este", "esto", "estote"):
            if f_ in forms and ("sum1", "") not in forms[f_]:
                works_ = set().union(*forms[f_].values())
                forms[f_] = {("sum1", ""): works_, **forms[f_]}
    out_forms = {k: [[l, t, sorted(ws)] if t else [l, sorted(ws)] for (l, t), ws in v.items()] for k, v in forms.items()}
    lem_out = {k: {kk: vv for kk, vv in v.items() if vv} for k, v in lemmas.items()}
    data = {"schema": "vitruvia-lexicon-forms-v1", "lang": lang,
            "sources": ("Lematización CLTK (forma→lema, sin desambiguación); glosas Lewis & Short (Perseus DL, CC BY-SA 4.0)" if lang == "la"
                        else "Lematización G. Celano, Lemmatized Ancient Greek XML (CC BY-NC 4.0); glosas LSJ (Perseus DL, CC BY-SA 4.0)"),
            "note": "Análisis automáticos de las formas atestiguadas en el corpus local: deben verificarse en contexto.",
            "forms": out_forms, "lemmas": lem_out}
    (OUT / f"forms-{lang}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(lang, len(out_forms), "formas", len(lem_out), "lemas")
