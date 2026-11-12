# -*- coding: utf-8 -*-
"""Concordancia del latín de V514 con Krohn (1912) y Rose (1899), y erratas.

Para cada uno de los 731 loci se alinea el latín de V514, palabra por palabra,
con el lugar correspondiente de cada edición (OCR de Internet Archive):

  1. Se localiza el pasaje en la edición por votación de trigramas y se alinea
     una ventana con difflib (sin descarte automático).
  2. Una palabra de V514 cuenta como atestiguada si coincide con Krohn o con
     Rose: un error de OCR en una de las dos no se toma por diferencia de V514.
  3. Diferencias sólo gráficas (asimilación ad-/con-/in-/ex-, ae/e, y/i, ph/f,
     consonante doble, i/j, u/v) se cuentan aparte: no son errores.
  4. Errata probable: Krohn y Rose concuerdan entre sí, V514 difiere a una o
     dos letras de distancia y no es variante gráfica. Si el aparato del autor
     cita la forma en ese locus, se marca «justificada en el aparato».
  5. V514 frente a V554 (mismo latín en las dos ediciones del autor): toda
     diferencia es candidata a errata en una de las dos.

Límites: el OCR de Krohn y Rose tiene errores propios; los porcentajes son un
mínimo (subestiman la concordancia real). Budé no está disponible en texto.
"""
import json, os, re, unicodedata, difflib
from collections import Counter, defaultdict

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
J = lambda p: json.load(open(R + p, encoding="utf-8"))

def plegar(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().replace("j", "i").replace("v", "u")

GRAF = [(r"^adf", "aff"), (r"^adl", "all"), (r"^adp", "app"), (r"^adc", "acc"), (r"^adt", "att"), (r"^ads", "ass"),
        (r"^adg", "agg"), (r"^adr", "arr"), (r"^conl", "coll"), (r"^conp", "comp"), (r"^conm", "comm"), (r"^conr", "corr"),
        (r"^inl", "ill"), (r"^inm", "imm"), (r"^inp", "imp"), (r"^inr", "irr"), (r"^subp", "supp"), (r"^subm", "summ"),
        (r"^exs", "ex"), (r"ae", "e"), (r"oe", "e"), (r"y", "i"), (r"ph", "f"), (r"th", "t"), (r"ch", "c"), (r"([a-z])\1", r"\1"),
        (r"quom", "cum"), (r"^hiem", "hiem")]
def grafia(w):
    for a, b in GRAF:
        w = re.sub(a, b, w)
    return w

def tokens_texto(t):
    return [plegar(w) for w in re.findall(r"[A-Za-zÀ-ÿ]+", t)]

def tokens_ocr(paginas):
    toks = []
    for p in paginas:
        t = p.get("text") or ""
        t = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", t)   # palabras partidas a final de línea
        toks += [plegar(w) for w in re.findall(r"[A-Za-z]+", t)]
    return toks

def indice_trigramas(toks):
    ix = defaultdict(list)
    for i in range(len(toks) - 2):
        ix[(toks[i], toks[i + 1], toks[i + 2])].append(i)
    return ix

def alinear(T, W, ix, desde):
    votos = Counter()
    for i in range(len(T) - 2):
        for j in ix.get((T[i], T[i + 1], T[i + 2]), ()):
            if j >= desde - 2000:
                votos[j - i] += 1
    if not votos:
        return None
    off, n = votos.most_common(1)[0]
    if n < max(2, len(T) // 12):
        return None
    a, b = max(0, off - 15), min(len(W), off + len(T) + 40)
    sm = difflib.SequenceMatcher(None, T, W[a:b], autojunk=False)
    return a, sm

def distancia(a, b):
    return 0 if a == b else (1 - difflib.SequenceMatcher(None, a, b).ratio()) * max(len(a), len(b))

def cotejar(pasajes, W, nombre):
    ix = indice_trigramas(W)
    res, desde = {}, 0
    for p in pasajes:
        T = tokens_texto(p["latin"])
        if len(T) < 4:
            continue
        al = alinear(T, W, ix, desde)
        if not al:
            res[p["locus"]] = None
            continue
        a, sm = al
        eq, ops = set(), []
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op == "equal":
                eq.update(range(i1, i2))
            elif op == "replace":
                ops.append((i1, i2, W[a + j1:a + j2]))
            elif op == "delete":
                ops.append((i1, i2, []))
        res[p["locus"]] = {"T": T, "eq": eq, "ops": ops}
        bl = [b for b in sm.get_matching_blocks() if b.size]
        if bl:
            desde = a + bl[-1].b
    return res

def main():
    pas = J("data/structured/recensio-es.json")["passages"]
    fr = {p["locus"]: p for p in J("data/structured/recensio-fr.json")["passages"]}
    K = tokens_ocr(J("data/text/krohn-1912.json"))
    Ro = tokens_ocr(J("data/text/rose-1899.json"))
    ck, cr = cotejar(pas, K, "Krohn"), cotejar(pas, Ro, "Rose")
    aparato = defaultdict(str)
    try:
        for r in J("data/index/registro-ecdotico.json")["registros"]:
            if r.get("locus"):
                aparato[r["locus"]] += " " + plegar(" ".join(str(r.get(k) or "") for k in ("lema", "aparato", "texto")))
    except Exception:
        pass

    tot = Counter(); por_libro = defaultdict(Counter); erratas = []; sin_alinear = []
    for p in pas:
        L = p["locus"]; k, r = ck.get(L), cr.get(L)
        if k is None and r is None:
            if L in ck or L in cr:
                sin_alinear.append(L)
            continue
        T = (k or r)["T"]; n = len(T); lb = int(L.split(".")[0])
        okK = k["eq"] if k else set(); okR = r["eq"] if r else set()
        # grafía: reemplazo 1 a 1 que sólo difiere en grafía cuenta como atestiguado-gráfico
        graf = set()
        for res in (k, r):
            if not res:
                continue
            for i1, i2, w in res["ops"]:
                if i2 - i1 == len(w):
                    for d, i in enumerate(range(i1, i2)):
                        if grafia(T[i]) == grafia(w[d]):
                            graf.add(i)
        exacto = okK | okR
        atest = exacto | graf
        for c, v in (("palabras", n), ("exactas", len(exacto)), ("conGrafia", len(atest)),
                     ("krohn", len(okK) if k else 0), ("rose", len(okR) if r else 0),
                     ("palabrasK", n if k else 0), ("palabrasR", n if r else 0)):
            tot[c] += v; por_libro[lb][c] += v
        # erratas: Krohn y Rose concuerdan, V514 difiere a 1-2 letras
        if k and r:
            mk = {i: w[d] for i1, i2, w in k["ops"] if i2 - i1 == len(w) for d, i in enumerate(range(i1, i2))}
            mr = {i: w[d] for i1, i2, w in r["ops"] if i2 - i1 == len(w) for d, i in enumerate(range(i1, i2))}
            for i in sorted(set(mk) & set(mr)):
                if i in atest:
                    continue
                wk, wr, t = mk[i], mr[i], T[i]
                if wk != wr or len(t) < 3:
                    continue
                d = distancia(t, wk)
                if 0 < d <= 2.2:
                    ctx = " ".join(T[max(0, i - 4):i]) + " [" + t + "] " + " ".join(T[i + 1:i + 5])
                    just = (wk in aparato.get(L, "")) or (re.search(r"\b" + re.escape(t) + r"\b", aparato.get(L, "")) is not None and len(t) > 4)
                    erratas.append({"locus": L, "V514": t, "KrohnRose": wk, "contexto": ctx,
                                    "estado": "justificada en el aparato" if just else "errata probable"})
    # V514 frente a V554
    dif_ed = []
    for p in pas:
        q = fr.get(p["locus"])
        if not q:
            continue
        a, b = tokens_texto(p["latin"]), tokens_texto(q["latin"])
        if a == b:
            continue
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op != "equal":
                dif_ed.append({"locus": p["locus"], "V514": " ".join(a[i1:i2]), "V554": " ".join(b[j1:j2]),
                               "contexto": " ".join(a[max(0, i1 - 4):i2 + 4])})
    pct = lambda a, b: round(100 * a / b, 2) if b else None
    out = {"schema": "cotejo-krohn-rose/1", "metodo": __doc__.strip(),
           "global": {"palabrasV514": tot["palabras"], "concordanciaExacta": pct(tot["exactas"], tot["palabras"]),
                      "concordanciaConGrafia": pct(tot["conGrafia"], tot["palabras"]),
                      "conKrohn": pct(tot["krohn"], tot["palabrasK"]), "conRose": pct(tot["rose"], tot["palabrasR"]),
                      "lociAlineados": sum(1 for L in ck if ck[L] or cr.get(L)), "lociSinAlinear": sin_alinear},
           "porLibro": {str(b): {"palabras": c["palabras"], "concordanciaConGrafia": pct(c["conGrafia"], c["palabras"]),
                                  "conKrohn": pct(c["krohn"], c["palabrasK"]), "conRose": pct(c["rose"], c["palabrasR"])}
                        for b, c in sorted(por_libro.items())},
           "erratasCandidatas": erratas, "diferenciasV514V554": dif_ed}
    os.makedirs(R + "reports", exist_ok=True)
    json.dump(out, open(R + "data/index/cotejo-krohn-rose.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    g = out["global"]
    print(f"palabras V514 cotejadas: {g['palabrasV514']}  · loci alineados {g['lociAlineados']} · sin alinear {len(sin_alinear)}")
    print(f"concordancia exacta (Krohn o Rose): {g['concordanciaExacta']} %  · con variantes gráficas: {g['concordanciaConGrafia']} %")
    print(f"sólo Krohn: {g['conKrohn']} %  · sólo Rose: {g['conRose']} %")
    for b, c in out["porLibro"].items():
        print(f"  libro {b:>2}: {c['concordanciaConGrafia']} %  (K {c['conKrohn']} · R {c['conRose']}) · {c['palabras']} palabras")
    print("erratas candidatas:", Counter(e["estado"] for e in erratas))
    print("diferencias V514/V554:", len(dif_ed))

main()
