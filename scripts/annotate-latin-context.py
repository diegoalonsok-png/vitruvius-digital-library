#!/usr/bin/env python3
"""Desambiguación contextual de lemas latinos para Vitruvia Lexicon.

La tabla forma → lema del Lexicon (CLTK) no mira el contexto: «est» puede ser sum o edo, «ius» ius o ius2,
«legere» lego1 o lego2. Este script analiza cada pasaje del corpus latino con Stanza (Stanford NLP, modelos
entrenados en los treebanks Universal Dependencies de latín) y, para cada palabra cuya forma admite varios
lemas en la tabla, guarda el lema elegido por el analizador SOLO si coincide con uno de esos candidatos.
Así el resultado nunca introduce un lema ajeno a la tabla: solo elige entre los posibles.

Uso (en GitHub Actions, que puede descargar los modelos):
  pip install stanza && python scripts/annotate-latin-context.py [--package proiel] [--limit N]
Salida: data/lexicon/context-la.json
  {"schema", "method", "model", "stats", "loci": {"obra locus": "i:k,i:k,…"}}
  i = índice de la palabra en el pasaje (misma tokenización que el Lexicon); k = posición del lema elegido
  en la lista de análisis de esa forma en forms-la.json.
"""
import argparse, json, re, time, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
import regex  # misma tokenización que el navegador: /[\p{L}\p{M}][\p{L}\p{M}'ʼ’]*/u
TOKEN = regex.compile(r"[\p{L}\p{M}][\p{L}\p{M}'ʼ’]*")


def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return s.replace("ς", "σ").replace("j", "i").replace("v", "u").replace("ʼ", "'").replace("’", "'")


def base(lem):
    return fold(re.sub(r"\d+$", "", lem)).replace("-", "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--package", default="proiel")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    import stanza
    stanza.download("la", package=a.package, processors="tokenize,pos,lemma", verbose=False)
    nlp = stanza.Pipeline("la", package=a.package, processors="tokenize,pos,lemma", tokenize_pretokenized=True, verbose=False, use_gpu=False)
    corpus = json.loads((ROOT / "data/lexicon/corpus-la.json").read_text())
    forms = json.loads((ROOT / "data/lexicon/forms-la.json").read_text())["forms"]
    out, amb, chosen, t0 = {}, 0, 0, time.time()
    passages = corpus["passages"][: a.limit or None]
    for n, p in enumerate(passages):
        toks = [m.group(0) for m in TOKEN.finditer(p[2])]
        if not toks:
            continue
        doc = nlp([toks])
        words = [w for s in doc.sentences for w in s.words]
        if len(words) != len(toks):
            continue  # alineación imposible: se omite el pasaje
        picks = []
        for i, (t, w) in enumerate(zip(toks, words)):
            an = forms.get(fold(t).rstrip("'"))
            if not an:
                continue
            lems = [x[0] for x in an]
            if len(set(lems)) < 2:
                continue
            amb += 1
            target = base(w.lemma or "")
            ks = [k for k, l in enumerate(lems) if base(l) == target]
            if len(ks) == 1 or (ks and len({lems[k] for k in ks}) == 1):
                picks.append(f"{i}:{ks[0]}")
                chosen += 1
        if picks:
            out[f"{p[0]} {p[1]}"] = ",".join(picks)
        if n % 200 == 0:
            print(f"{n}/{len(passages)} pasajes · {amb} formas ambiguas · {chosen} resueltas · {time.time() - t0:.0f} s", flush=True)
    data = {"schema": "vitruvia-lexicon-context-v1",
            "method": "Lema elegido por contexto con Stanza (Stanford NLP) entre los candidatos de la tabla forma → lema; "
                      "solo se registra cuando el lema del analizador coincide con uno de ellos. Análisis automático: verifíquese en el pasaje.",
            "model": f"stanza {stanza.__version__} · la · {a.package}",
            "stats": {"ambiguous": amb, "resolved": chosen},
            "loci": out}
    (ROOT / "data/lexicon/context-la.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"Listo: {chosen} de {amb} formas ambiguas resueltas ({chosen / max(amb, 1):.0%}) en {len(out)} pasajes · {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
