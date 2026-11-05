#!/usr/bin/env python3
"""Tabla de colación por locus: alinea cada pasaje del texto latino V514 (Kurilo) con el
texto OCR de las ediciones críticas de Rose (1899) y Krohn (1912).

Método: índice de trigramas de palabras normalizadas sobre el flujo continuo de páginas OCR;
para cada locus se elige la posición con más trigramas coincidentes y se acota el tramo con
difflib. Se registra la página impresa, el tramo alineado y un índice de semejanza (0–1).
Las diferencias que muestre la página incluyen ruido de OCR: es un instrumento de cotejo,
no un aparato crítico.

Salida: data/collation-loci.json
"""
import difflib
import json
import re
import unicodedata
from collections import Counter, defaultdict

WITNESSES = [
    ("rose-1899", "Rose 1899", "Valentin Rose, Vitruvii De architectura libri decem, Leipzig, Teubner, 1899 (2.ª ed.)"),
    ("krohn-1912", "Krohn 1912", "F. Krohn, Vitruvii De architectura libri decem, Leipzig, Teubner, 1912"),
]


def norm(w):
    w = unicodedata.normalize("NFD", w)
    w = "".join(c for c in w if unicodedata.category(c) != "Mn").lower()
    return w.replace("v", "u").replace("j", "i")


def clean_page(t):
    t = re.sub(r"-[ \t]*\d{0,3}[ \t]*\n\s*", "", t)  # guiones de fin de línea (con número de línea al margen)
    t = re.sub(r"\s+", " ", t)
    # guion de corte con número de línea o de página intercalado: «sym- (25) metriarum»
    t = re.sub(r"([A-Za-zÀ-ÿ])-\s+(?:[\(\[]?\d{1,3}[a-z]?[\)\]]?\s+)?(?=[a-zà-ÿ])", r"\1", t)
    return t.strip()


def stream(pages):
    toks = []  # (norm, page, start, end)
    texts = {}
    for p in pages:
        t = clean_page(p.get("text", ""))
        texts[p["page"]] = t
        for m in re.finditer(r"[A-Za-zÀ-ÿ]+", t):
            if len(m.group()) < 2:
                continue
            toks.append((norm(m.group()), p["page"], m.start(), m.end()))
    return toks, texts


def main():
    corpus = json.load(open("data/structured/recensio-es.json", encoding="utf-8"))["passages"]
    out = {"schema": "vitruvia-collation-v1", "method": __doc__.strip().split("\n\n")[1].replace("\n", " "),
           "base": "V514 (texto latino de la edición de Diego Kurilo, base Krohn 1912)",
           "witnesses": [{"id": w[0], "label": w[1], "citation": w[2]} for w in WITNESSES], "loci": {}}
    for wid, label, _ in WITNESSES:
        pages = json.load(open(f"data/text/{wid}.json", encoding="utf-8"))
        toks, texts = stream(pages)
        words = [t[0] for t in toks]
        tri = defaultdict(list)
        for i in range(len(words) - 2):
            tri[(words[i], words[i + 1], words[i + 2])].append(i)
        found = 0
        for p in corpus:
            L = [norm(w) for w in re.findall(r"[A-Za-zÀ-ÿ]+", p.get("latin", "")) if len(w) >= 2]
            if len(L) < 6:
                continue
            votes = Counter()
            for j in range(len(L) - 2):
                for i in tri.get((L[j], L[j + 1], L[j + 2]), ())[:40]:
                    votes[(i - j) // 8] += 1
            if not votes:
                continue
            bucket, hits = votes.most_common(1)[0]
            if hits < max(2, len(L) // 25):
                continue
            start = max(0, bucket * 8 - 30)
            end = min(len(words), bucket * 8 + len(L) + 40)
            sm = difflib.SequenceMatcher(None, L, words[start:end], autojunk=False)
            blocks = [b for b in sm.get_matching_blocks() if b.size >= 2]
            if not blocks:
                continue
            a0 = start + blocks[0].b
            a1 = start + blocks[-1].b + blocks[-1].size - 1
            # extender a los bordes si faltan palabras al principio o al final del locus
            a0 = max(0, a0 - blocks[0].a)
            a1 = min(len(words) - 1, a1 + (len(L) - (blocks[-1].a + blocks[-1].size)))
            seg = words[a0:a1 + 1]
            ratio = difflib.SequenceMatcher(None, L, seg, autojunk=False).ratio()
            if ratio < 0.35:
                continue
            p0, p1 = toks[a0][1], toks[a1][1]
            if p0 == p1:
                text = texts[p0][toks[a0][2]:toks[a1][3]]
            else:
                parts = [texts[p0][toks[a0][2]:]]
                for pg in range(p0 + 1, p1):
                    parts.append(texts.get(pg, ""))
                parts.append(texts[p1][:toks[a1][3]])
                text = " ".join(parts)
            rec = out["loci"].setdefault(p["locus"], {})
            rec[wid] = {"page": p0, "pageEnd": p1 if p1 != p0 else None, "score": round(ratio, 3), "text": text[:4000]}
            found += 1
        print(label, "loci alineados:", found, "de", len(corpus))
    out["counts"] = {w[0]: sum(1 for v in out["loci"].values() if w[0] in v) for w in WITNESSES}
    json.dump(out, open("data/collation-loci.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
