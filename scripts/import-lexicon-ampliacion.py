#!/usr/bin/env python3
"""Ampliación del corpus de Vitruvia Lexicon con los autores técnicos y los historiadores
que dialogan con Vitruvio.

Uso:  python3 scripts/import-lexicon-ampliacion.py DIR_FUENTES

DIR_FUENTES contiene las descargas (no se copian al repositorio):
  src/<id>__<archivo>   textos TEI de Perseus DL y textos planos de The Latin Library (espejo CLTK)
  celano/texts/<urn>.xml  lematización griega de G. Celano (Lemmatized Ancient Greek XML)
  lemmata.py              tabla forma→lema de CLTK (latin_lemmata_cltk)

Escribe, por obra, data/lexicon/fontes/<obra>-<lengua>.json (pasajes; fuentes propias del Lexicon,
fuera del índice del buscador clásico) y
data/classics-lexicon/<obra>-<lengua>.json (formas → lemas), que luego recoge
scripts/build-vitruvia-lexicon.py.
"""
import ast, html, json, re, sys, unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ext")
TEI = "{http://www.tei-c.org/ns/1.0}"
GH = "https://raw.githubusercontent.com/PerseusDL"

WORKS = {
    # id: (lengua, archivo fuente, segmentación, atribución, fuente)
    "herodotus-histories": ("grc", "tlg0016.tlg001__tlg0016.tlg001.perseus-grc2.xml", "book.chapter",
                            "A. D. Godley, Herodotus, Loeb, Harvard University Press, 1920; Perseus DL TEI, CC BY-SA 4.0",
                            f"{GH}/canonical-greekLit/master/data/tlg0016/tlg001/tlg0016.tlg001.perseus-grc2.xml", "tlg0016.tlg001.perseus-grc2.xml"),
    "euclid-elements": ("grc", "tlg1799.tlg001__tlg1799.tlg001.perseus-grc2.xml", "all",
                        "J. L. Heiberg, Euclidis Elementa, Leipzig, Teubner, 1883–1885; Perseus DL TEI, CC BY-SA 4.0",
                        f"{GH}/canonical-greekLit/master/data/tlg1799/tlg001/tlg1799.tlg001.perseus-grc2.xml", "tlg1799.tlg001.perseus-grc2.xml"),
    "columella-rustica": ("la", "phi0845.phi002__phi0845.phi002.perseus-lat3.xml", "book.chapter",
                          "V. Lundström, L. Iuni Moderati Columellae opera, Uppsala, 1897–1968; Perseus DL TEI, CC BY-SA 4.0 (libros I–IX en prosa)",
                          f"{GH}/canonical-latinLit/master/data/phi0845/phi002/phi0845.phi002.perseus-lat3.xml", None),
    "pliny-naturalis": ("la", "phi0978.phi001__phi0978.phi001.perseus-lat2.xml", "book.section:33-36",
                        "K. Mayhoff, C. Plini Secundi Naturalis historiae libri XXXVII, Leipzig, Teubner, 1892–1909; Perseus DL TEI, CC BY-SA 4.0 (libros XXXIII–XXXVI: metales, pintura, escultura, piedras y arquitectura)",
                        f"{GH}/canonical-latinLit/master/data/phi0978/phi001/phi0978.phi001.perseus-lat2.xml", None),
    "cato-agricultura": ("la", "stoa0079.stoa001__stoa0079.stoa001.perseus-lat1.xml", "div1",
                         "Cato, De agri cultura; Perseus DL TEI, CC BY-SA 4.0",
                         f"{GH}/canonical-latinLit/master/data/stoa0079/stoa001/stoa0079.stoa001.perseus-lat1.xml", None),
    "varro-rustica": ("la", "ll.varro-rustica__varro.rr{n}.txt", "plain-roman:1-3",
                      "Varrón, Rerum rusticarum libri III; texto de The Latin Library (espejo CLTK, dominio público)",
                      "https://raw.githubusercontent.com/cltk/latin_text_latin_library/master/varro.rr1.txt", None),
    "frontinus-aquaeductu": ("la", "ll.frontinus__aqua{n}.txt", "plain-arabic:1-2",
                             "Frontino, De aquaeductu urbis Romae; texto de The Latin Library (espejo CLTK, dominio público)",
                             "https://raw.githubusercontent.com/cltk/latin_text_latin_library/master/frontinus/aqua1.txt", None),
}
SKIP = {"note", "bibl", "del", "head", "ref", "figure", "gap"}


def text_of(el):
    out = []

    def walk(e):
        if e.tag.replace(TEI, "") in SKIP:
            if e.tail:
                out.append(e.tail)
            return
        if e.text:
            out.append(e.text)
        for c in e:
            walk(c)
        if e.tail:
            out.append(e.tail)
    if el.text:
        out.append(el.text)
    for c in el:
        walk(c)
    return re.sub(r"\s+", " ", "".join(out)).strip()


def is_part(e):
    return e.tag == "div" and e.get("type") == "textpart"


def tei_passages(path, mode):
    raw = Path(path).read_text(encoding="utf-8")
    raw = re.sub(r"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)(\w+);", lambda m: html.unescape(m[0]) if html.unescape(m[0]) != m[0] else "", raw)
    root = ET.fromstring(raw.encode("utf-8"))
    for e in root.iter():  # TEI P5 (con espacio de nombres) o P4 (sin él)
        if isinstance(e.tag, str) and "}" in e.tag:
            e.tag = e.tag.split("}", 1)[1]
    body = root.find(".//body")
    books = [d for d in body.iter("div") if is_part(d) and d.get("subtype") == "book"]
    out = []
    if mode == "book.chapter":
        for b in books:
            for ch in [c for c in b if is_part(c)]:
                t = text_of(ch)
                if t:
                    out.append((f"{b.get('n')}.{ch.get('n')}", t))
    elif mode == "all":  # Euclides: libro.tipo.número (def., post., c. n., prop.)
        def walk(e, path_):
            kids = [c for c in e if is_part(c)]
            if not kids:
                t = text_of(e)
                if t:
                    out.append((".".join(path_), t))
                return
            for k in kids:
                walk(k, path_ + [k.get("n")])
        for b in books:
            walk(b, [b.get("n")])
    elif mode.startswith("book.section"):
        lo, hi = map(int, mode.split(":")[1].split("-"))
        for b in books:
            if not (lo <= int(b.get("n")) <= hi):
                continue
            cur, buf = None, []

            def flush():
                t = re.sub(r"\s+", " ", "".join(buf)).strip()
                if cur and t:
                    out.append((f"{b.get('n')}.{cur}", t))

            def walk(e):
                nonlocal cur, buf
                tag = e.tag.replace(TEI, "")
                if tag == "milestone" and e.get("unit") == "section":
                    flush()
                    cur, buf = e.get("n"), []
                elif tag in SKIP:
                    pass
                else:
                    if e.text:
                        buf.append(e.text)
                    for c in e:
                        walk(c)
                if e.tail:
                    buf.append(e.tail)
            for c in b:
                walk(c)
            flush()
    elif mode == "div1":  # TEI P4: capítulos div1 (pr, 1, 2…)
        for d in body.iter("div1"):
            t = text_of(d)
            if t:
                out.append((d.get("n"), t))
    elif mode == "section":
        cur, buf = "1", []

        def flush():
            t = re.sub(r"\s+", " ", "".join(buf)).strip()
            if cur and t:
                out.append((cur, t))

        def walk(e):
            nonlocal cur, buf
            tag = e.tag.replace(TEI, "")
            if tag == "milestone" and e.get("unit") == "section":
                flush()
                cur, buf = e.get("n"), []
            elif tag in SKIP:
                pass
            else:
                if e.text:
                    buf.append(e.text)
                for c in e:
                    walk(c)
            if e.tail:
                buf.append(e.tail)
        walk(body)
        flush()
    return out


ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}


def from_roman(s):
    t = 0
    for i, c in enumerate(s):
        v = ROMAN[c]
        t += -v if i + 1 < len(s) and ROMAN[s[i + 1]] > v else v
    return t


def plain_passages(pattern, mode):
    kind, rng = mode.split(":")
    lo, hi = map(int, rng.split("-"))
    out = []
    for n in range(lo, hi + 1):
        raw = (SRC / "src" / pattern.format(n=n)).read_text(encoding="utf-8", errors="replace")
        raw = re.sub(r"(?s)The Latin Library.*$", "", raw)
        lines = [l.strip() for l in raw.replace("\r", "").split("\n")]
        cur, buf = None, []

        def flush():
            t = re.sub(r"\s+", " ", " ".join(buf)).strip()
            if cur is not None and t:
                out.append((f"{n}.{cur}" if kind == "plain-roman" else str(cur), t))
        for l in lines:
            if not l:
                continue
            if kind == "plain-roman":
                m = re.fullmatch(r"([IVXLC]+)\.", l)
                if m:
                    flush()
                    cur, buf = from_roman(m[1]), []
                    continue
            else:
                m = re.match(r"^(\d+)\.\s+(.*)$", l)
                if m:
                    flush()
                    cur, buf = int(m[1]), [m[2]]
                    continue
            if cur is not None:
                buf.append(l)
        flush()
    return out


def latin_lemmata():
    # La tabla se lee como dato (literal de diccionario), nunca se ejecuta.
    raw = (SRC / "lemmata.py").read_text(encoding="utf-8")
    return ast.literal_eval(raw[raw.index("{"):raw.rindex("}") + 1])


def fold(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def greek_forms(urnfile):
    forms, lemmas = {}, {}
    for _, e in ET.iterparse(SRC / "celano" / "texts" / urnfile):
        if e.tag != "t":
            continue
        f = (e.findtext("f") or "").strip()
        tag = e.get("o") or ""
        l = e.find("l")
        lem = None
        if l is not None:
            l1 = l.find("l1")
            l2 = l.find("l2")
            lem = (l1.text if l1 is not None and l1.text else None) or (l2.text if l2 is not None and l2.text else None)
        if f and lem:
            slot = forms.setdefault(f, [])
            if [lem, tag] not in slot:
                slot.append([lem, tag])
            lemmas.setdefault(lem, {"g": "", "id": ""})
        e.clear()
    return forms, lemmas


def main():
    LT = None
    for wid, (lang, src, mode, attrib, url, celano) in WORKS.items():
        if mode.startswith("plain"):
            ps = plain_passages(src, mode)
        else:
            ps = tei_passages(SRC / "src" / src, mode)
        corpus = {"workId": wid, "language": lang, "sourceType": "edited-tei" if not mode.startswith("plain") else "plain-text",
                  "editorialStatus": "Texto editado, no transcripción diplomática ni OCR del códice",
                  "source": url, "attribution": attrib,
                  "license": "CC BY-SA 4.0 (Perseus DL; conservar atribución)" if "Perseus" in attrib else "Dominio público (The Latin Library)",
                  "passages": [{"locus": l, "text": t} for l, t in ps]}
        (ROOT / "data/lexicon/fontes" / f"{wid}-{lang}.json").write_text(json.dumps(corpus, ensure_ascii=False, separators=(",", ":")))
        toks = sum(len(re.findall(r"[\wͰ-Ͽἀ-῿]+", t)) for _, t in ps)
        if lang == "grc":
            forms, lemmas = greek_forms(celano)
            src_ = [{"label": "Lematización: G. Celano, Lemmatized Ancient Greek XML", "url": "https://github.com/gcelano/LemmatizedAncientGreekXML", "license": "CC BY-NC 4.0"}]
            schema = "vitruvia-greek-glossary-v1"
        else:
            LT = LT or latin_lemmata()
            forms, lemmas = {}, {}
            for _, t in ps:
                for w in re.findall(r"[A-Za-z]+", t):
                    for c in (w, w.lower(), w.capitalize(), w.lower().replace("v", "u"), w.lower().replace("j", "i")):
                        if c in LT:
                            forms.setdefault(w.lower(), [LT[c]])
                            lemmas.setdefault(LT[c], {"h": LT[c], "g": "", "id": ""})
                            break
            src_ = [{"label": "Lematización: CLTK, latin_lemmata_cltk (forma → lema)", "url": "https://github.com/cltk/lat_models_cltk", "license": "MIT"}]
            schema = "vitruvia-latin-glossary-v1"
        lex = {"schema": schema, "workId": wid, "language": lang, "sources": src_,
               "note": "Lematización automática, sin desambiguación contextual: verifíquese en contexto.",
               "stats": {"tokens": toks, "forms": len(forms), "lemmas": len(lemmas)}, "lemmas": lemmas, "forms": forms}
        (ROOT / "data/classics-lexicon" / f"{wid}-{lang}.json").write_text(json.dumps(lex, ensure_ascii=False, separators=(",", ":")))
        print(f"{wid}: {len(ps)} pasajes · {toks} palabras · {len(forms)} formas · {len(lemmas)} lemas · ej. {ps[0][0]} / {ps[-1][0]}")


if __name__ == "__main__":
    main()
