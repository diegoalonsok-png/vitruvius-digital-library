#!/usr/bin/env python3
"""Concordancia por libro y capítulo entre las ediciones italiana y latina de Barbaro (1567).

Fuentes: data/text/barbaro-1567-{it,la}.json (OCR) y data/structured/recensio-es.json (latín V514).
Método:
  · libro: cabecera corrida y títulos («LIBRO PRIMO», «LIBER PRIMVS»), con tolerancia a errores de OCR;
  · capítulo: títulos «Cap. IIII.» en línea breve, aceptados solo en orden (siguiente o uno más);
  · proemio: «PROEMIO», «PROOEMIVM», «PRAEFATIO» al comienzo de un libro;
  · latín: además, cada locus de V514 se ubica en la imagen cuyo texto comparte más palabras largas.
El resultado es una concordancia orientativa para sincronizar visores, no una foliación crítica.
"""
import json, pathlib, re, unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[1]
ORD = {
    "it": ["primo", "secondo", "terzo", "quarto", "quinto", "sesto", "settimo", "ottauo", "nono", "decimo"],
    "la": ["primus", "secundus", "tertius", "quartus", "quintus", "sextus", "septimus", "octauus", "nonus", "decimus"],
}
ROMAN = {"i": 1, "ii": 2, "iii": 3, "iiii": 4, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "viiii": 9, "ix": 9, "x": 10,
         "xi": 11, "xii": 12, "xiii": 13, "xiiii": 14, "xiv": 14, "xv": 15, "xvi": 16, "xvii": 17, "xviii": 18, "xix": 19, "xx": 20}

def fold(s):
    s = unicodedata.normalize("NFD", s.replace("ſ", "s").replace("æ", "ae").replace("œ", "oe").replace("ę", "e"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn").lower()
    return s.replace("v", "u").replace("j", "i")

def mfold(s):  # para comparar con el OCR: ſ leída como f, ae/e, u/v, i/j
    return re.sub(r"ae", "e", fold(s)).replace("f", "s")

def lev(a, b):
    if abs(len(a) - len(b)) > 2:
        return 9
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]

def ordinal(word, ed):
    w = re.sub(r"[^a-z]", "", fold(word))
    if len(w) < 4:
        return None
    for n, o in enumerate(ORD[ed], 1):
        if lev(w, fold(o)) <= (1 if len(o) <= 5 else 2):
            return n
    return None

def detect(pages, ed):
    out, book, chap, praef = [], 0, 0, False
    head_word = "libro" if ed == "it" else "liber"
    for p in pages:
        lines = [l.strip() for l in (p.get("text") or "").split("\n") if l.strip()]
        newbook = None
        # Título de libro dentro de la página («LIBRO PRIMO» / «LIBER PRIMVS») o cabecera corrida en recto.
        for i, l in enumerate(lines[:40]):
            ws = l.split()
            if len(l) > 40:  # un título es una línea breve; evita «come nel libro secondo» en el comentario
                continue
            for k, w in enumerate(ws[:-1]):
                if lev(re.sub(r"[^a-z]", "", fold(w)), head_word) <= 1:
                    n = ordinal(ws[k + 1], ed)
                    if n and book <= n <= book + 1:
                        newbook = n
        for l in lines[:2]:
            for w in l.split()[:4]:
                n = ordinal(w, ed)
                if n and n >= book and n <= book + 1:
                    newbook = newbook or n
        if newbook and newbook != book and newbook >= book:
            book, chap, praef = newbook, 0, True
        for l in lines:
            if len(l) > 70:
                continue
            m = re.search(r"\bcap(?:o|itolo|ut|\.)?\s*\.?\s*([ivxl]{1,6})\b", fold(l))
            if m and m.group(1) in ROMAN:
                n = ROMAN[m.group(1)]
                if book and (n == chap + 1 or n == chap + 2 or (n == 1 and chap == 0)):
                    chap, praef = n, False
            if book and chap == 0 and re.search(r"\b(proemio|prooemium|proemium|praefatio|prefatione)\b", fold(l)):
                praef = True
        out.append({"page": p["page"], "label": p.get("label", ""), "book": book or None,
                    "chapter": ("praef" if praef and chap == 0 else (chap or None))})
    return out

def latin_loci(pages, conc):
    data = json.loads((ROOT / "data/structured/recensio-es.json").read_text(encoding="utf-8"))
    sets = [set(re.findall(r"[a-z]{6,}", mfold(p.get("text") or ""))) for p in pages]
    for c in conc:
        c["loci"] = []
    for ps in data.get("passages", []):
        words = set(re.findall(r"[a-z]{6,}", mfold(ps.get("latin") or "")))
        if len(words) < 4:
            continue
        cands = [i for i, c in enumerate(conc) if c["book"] in (None, ps.get("book"))] or range(len(conc))
        best, bn = None, 0
        for i in cands:
            n = len(words & sets[i])
            if n > bn:
                best, bn = i, n
        if best is not None and bn >= max(4, round(len(words) * 0.4)):
            conc[best]["loci"].append(ps["locus"])
    # El locus manda sobre la detección por títulos cuando la contradice.
    for c in conc:
        if c["loci"]:
            b, ch = c["loci"][0].split(".")[:2]
            c["book"] = int(b)
            c["chapter"] = "praef" if ch == "praef" else int(ch)
    return conc

def main():
    result = {"schema": "barbaro-1567-concordance/1",
              "method": "Libro y capítulo por títulos y cabeceras del OCR; en el latín, además, ubicación de cada locus de V514 por coincidencia de palabras. Orientativa: coteja siempre la imagen.",
              "editions": {}}
    for ed in ("it", "la"):
        f = ROOT / f"data/text/barbaro-1567-{ed}.json"
        if not f.exists():
            raise SystemExit(f"Falta {f}: ejecuta antes scripts/ocr-barbaro-1567.py")
        pages = json.loads(f.read_text(encoding="utf-8"))
        conc = detect(pages, ed)
        if ed == "la":
            conc = latin_loci(pages, conc)
        result["editions"][ed] = conc
        books = sorted({c["book"] for c in conc if c["book"]})
        print(ed, "libros detectados:", books, "· páginas con capítulo:", sum(1 for c in conc if c["chapter"]),
              "· loci ubicados:", sum(len(c.get("loci", [])) for c in conc))
    (ROOT / "data/barbaro-1567-concordance.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

if __name__ == "__main__":
    main()
