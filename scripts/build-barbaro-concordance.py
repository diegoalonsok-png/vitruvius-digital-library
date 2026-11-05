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

def chapter_heading(line):
    """«Cap. IIII.», «Cap: > JI.», «Cap. 11IL», «Cap. VIL»: el OCR confunde I con 1, l, L, J y |."""
    low = line.lower()
    m = re.search(r"\bcap\s*[.:;,]\s*[>»\-–]?\s*([ivxl1j|!]{1,6})(?![a-z])", low)
    if not m:
        return None
    tok = re.sub(r"[l1j|!]", "i", m.group(1))
    tok = re.sub(r"i{5,}", "iiii", tok)
    return ROMAN.get(tok)

def book_ranges(ed):
    """Libros según los rangos del manifiesto (más fiables que la cabecera corrida leída por OCR)."""
    files = [ROOT / f"data/iiif/barbaro-1567-{ed}-ranges.json"]
    if ed == "it":
        files.append(ROOT / "data/iiif/barbaro-1567-sections.json")
    for f in files:
        if not f.exists():
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        out = []
        for r in d.get("ranges") or d.get("sections") or []:
            lab = unicodedata.normalize("NFD", r.get("label", "")).encode("ascii", "ignore").decode().lower()
            m = re.search(r"\b(?:libro|liber|lib)\.?\s+([ivx]+|\d+|[a-z]+)\b", lab)
            if not m:
                continue
            tok = m.group(1)
            n = ROMAN.get(tok) or (int(tok) if tok.isdigit() else ordinal(tok, ed) or ordinal(tok, "la" if ed == "it" else "it"))
            if n and 1 <= n <= 10:
                out.append((int(r["start"]), int(r["end"]), n))
        if len({n for *_, n in out}) >= 8:
            return sorted(out)
    return None

def detect(pages, ed):
    ranges = book_ranges(ed)
    if ranges:
        out, book, chap, praef = [], 0, 0, False
        for p in pages:
            b = next((n for s, e, n in ranges if s <= p["page"] <= e), None)
            if b != book:
                book, chap, praef = (b or 0), 0, bool(b)
            lines = [l.strip() for l in (p.get("text") or "").split("\n") if l.strip()]
            for l in lines:
                if len(l) > 90 or not book:
                    continue
                n = chapter_heading(l)
                if n and (chap < n <= chap + 3 or (n == 1 and chap == 0)):
                    chap, praef = n, False
            out.append({"page": p["page"], "label": p.get("label", ""), "book": book or None,
                        "chapter": ("praef" if praef and chap == 0 else (chap or None)) if book else None})
        return out
    return detect_by_heads(pages, ed)

def detect_by_heads(pages, ed):
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
    """Ubica cada locus de V514 en la imagen latina con más palabras largas en común (mínimo 25 % y
    claramente por encima de la segunda candidata), descarta lo que rompe el orden del texto y, con eso,
    asigna libro y capítulo a todas las imágenes (los títulos leídos por OCR en cursiva son poco fiables)."""
    data = json.loads((ROOT / "data/structured/recensio-es.json").read_text(encoding="utf-8"))
    sets = [set(re.findall(r"[a-z]{6,}", mfold(p.get("text") or ""))) for p in pages]
    hits = []
    for order, ps in enumerate(data.get("passages", [])):
        words = set(re.findall(r"[a-z]{6,}", mfold(ps.get("latin") or "")))
        if len(words) < 6:
            continue
        scored = sorted(((len(words & st), i) for i, st in enumerate(sets)), reverse=True)[:2]
        best, second = scored[0][0] / len(words), (scored[1][0] / len(words) if len(scored) > 1 else 0)
        if best >= 0.25 and best >= 1.5 * max(second, 0.01):
            hits.append((order, scored[0][1], ps["locus"]))
    # Subsecuencia creciente más larga: el impreso sigue el orden del texto.
    import bisect
    tails, prev, idx = [], [None] * len(hits), []
    for k, (_, page, _) in enumerate(hits):
        j = bisect.bisect_right([hits[t][1] for t in tails], page)
        if j > 0:
            prev[k] = tails[j - 1]
        if j == len(tails):
            tails.append(k)
        else:
            tails[j] = k
    keep, k = [], (tails[-1] if tails else None)
    while k is not None:
        keep.append(hits[k]); k = prev[k]
    keep.reverse()
    for c in conc:
        c["loci"] = []
    for _, page, locus in keep:
        conc[page]["loci"].append(locus)
    if len(keep) >= 100:
        cur = None
        for c in conc:
            if c["loci"]:
                b, ch = c["loci"][0].split(".")[:2]
                cur = (int(b), "praef" if ch == "praef" else int(ch))
                last = c["loci"][-1].split(".")[:2]
                c["book"], c["chapter"] = cur
                cur = (int(last[0]), "praef" if last[1] == "praef" else int(last[1]))
            elif cur:
                c["book"], c["chapter"] = cur
            else:
                c["book"], c["chapter"] = None, None
        # Después del último locus del libro X, el resto (tablas e índices) queda sin asignar.
        lastloc = max((c["page"] for c in conc if c["loci"]), default=0)
        for c in conc:
            if c["page"] > lastloc + 3:
                c["book"], c["chapter"] = None, None
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
