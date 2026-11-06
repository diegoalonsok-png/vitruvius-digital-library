#!/usr/bin/env python3
"""Loci paralleli de Vitruvio: para cada locus de De architectura, los pasajes de los demás autores latinos
del corpus del Lexicon con mayor afinidad léxica.

Método (reproducible):
  1. Cada pasaje se reduce a lemas (tabla forma → lema de data/lexicon/forms-la.json; si una forma admite
     varios lemas se toma el primero). Se excluyen las palabras gramaticales y los lemas de menos de 3 letras.
  2. Peso tf-idf con frecuencia sublineal: (1 + log tf) · log(N / df), sobre los pasajes del corpus latino.
  3. Afinidad = coseno entre los vectores del locus de Vitruvio y de cada pasaje de otro autor.
  4. Se conservan los candidatos con afinidad ≥ UMBRAL y al menos MIN_COMUNES lemas compartidos de rareza
     apreciable (idf ≥ IDF_MIN), hasta TOP por locus. Se guardan los lemas que más contribuyen.

Son candidatos para el estudio de fuentes y recepción, no dependencias demostradas: la coincidencia léxica
puede deberse al tema común (agricultura, aguas, materiales) y no a una relación textual.
Salida: data/lexicon/paralleli-vitruvius.json
"""
import json, math, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UMBRAL, MIN_COMUNES, IDF_MIN, TOP = 0.12, 3, 2.5, 6
TOKEN = re.compile(r"[^\W\d_][^\W\d_'’]*", re.U)
STOP = set("""et in est non ad cum ut quae qui quod sed ex e a ab de per si autem enim etiam aut uel nec neque quam sunt esse sit se
sic item ita eius eorum ea eo id hic haec hoc is ille illa atque ac ne nam quo qua quia tum tam sibi suis sua suo suam suum quoque uti erit
erunt fuit eis iis his quibus quorum quem quas quos eam eum ipse ipsa ipsum iam inter sub pro ob post ante tamen uero sum edo qui1 hic1
ego tu nos uos meus tuus noster uester omnis alius alter nullus nihil res facio dico habeo do possum uolo fio eo1 is1 ut1 cum1 neque1""".split())


def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return s.replace("j", "i").replace("v", "u").replace("’", "'")


def main():
    corpus = json.loads((ROOT / "data/lexicon/corpus-la.json").read_text())
    forms = json.loads((ROOT / "data/lexicon/forms-la.json").read_text())["forms"]
    P = corpus["passages"]
    docs = []
    for p in P:
        lem = Counter()
        for m in TOKEN.finditer(p[2]):
            k = fold(m.group(0)).rstrip("'")
            an = forms.get(k)
            l = an[0][0] if an else k
            lb = re.sub(r"\d+$", "", l)
            if len(lb) < 3 or l in STOP or lb in STOP:
                continue
            lem[l] += 1
        docs.append(lem)
    N = len(docs)
    df = Counter()
    for d in docs:
        df.update(d.keys())
    idf = {l: math.log(N / n) for l, n in df.items()}
    vec, norm = [], []
    for d in docs:
        v = {l: (1 + math.log(tf)) * idf[l] for l, tf in d.items()}
        vec.append(v)
        norm.append(math.sqrt(sum(x * x for x in v.values())) or 1.0)
    inv = defaultdict(list)
    for i, v in enumerate(vec):
        if P[i][0] == "vitruvius":
            continue
        for l, w in v.items():
            inv[l].append((i, w))
    out, n_pairs = {}, 0
    for i, p in enumerate(P):
        if p[0] != "vitruvius":
            continue
        acc = defaultdict(float)
        contrib = defaultdict(list)
        for l, w in vec[i].items():
            if idf[l] < IDF_MIN or len(inv[l]) > 1500:
                continue
            for j, w2 in inv[l]:
                acc[j] += w * w2
                contrib[j].append((w * w2, l))
        cands = []
        for j, dot in acc.items():
            sim = dot / (norm[i] * norm[j])
            shared = sorted(contrib[j], reverse=True)
            if sim >= UMBRAL and len(shared) >= MIN_COMUNES:
                cands.append((sim, j, [re.sub(r"\d+$", "", l) for _, l in shared[:8]]))
        cands.sort(reverse=True)
        if cands:
            W = corpus["works"]
            out[p[1]] = [[P[j][0], P[j][1], round(s, 3), sh, (W[P[j][0]].get("cite") or W[P[j][0]]["author"]) + " " + P[j][1]] for s, j, sh in cands[:TOP]]
            n_pairs += len(out[p[1]])
    data = {"schema": "vitruvia-paralleli-v1",
            "method": "Afinidad léxica por coseno tf-idf entre lemas (forms-la.json), sin palabras gramaticales; "
                      f"umbral {UMBRAL}, al menos {MIN_COMUNES} lemas compartidos con idf ≥ {IDF_MIN}, hasta {TOP} por locus. "
                      "Candidatos para el estudio de fuentes y recepción: la coincidencia léxica puede deberse al tema común y no a una relación textual.",
            "script": "scripts/build-vitruvius-paralleli.py",
            "loci": out}
    (ROOT / "data/lexicon/paralleli-vitruvius.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    by = Counter(c[0] for v in out.values() for c in v)
    print(f"{len(out)} loci de Vitruvio con paralelos · {n_pairs} candidatos · por obra: {dict(by.most_common())}")


if __name__ == "__main__":
    main()
