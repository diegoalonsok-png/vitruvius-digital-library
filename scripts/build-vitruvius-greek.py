#!/usr/bin/env python3
"""Glosario de las voces griegas citadas en el texto latino de Vitruvio (V514).

Forma -> lema: primero por las formas lematizadas de los glosarios griegos del sitio
(data/classics-lexicon/*-grc.json, Celano); si no, por coincidencia directa con un lema
del LSJ (sin diacríticos). Glosa: LSJ (Perseus TEI, CC BY-SA 4.0).

Uso: python3 scripts/build-vitruvius-greek.py <lsj-dir>
"""
import glob
import importlib.util
import json
import pathlib
import re
import sys
import unicodedata

spec = importlib.util.spec_from_file_location("gg", pathlib.Path(__file__).with_name("build-greek-glossary.py"))
gg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gg)

GREEK = re.compile(r"[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͯ]*(?:[’ʼ'](?=\s|$|[,.;:]))?")


def main():
    lsj_dir = sys.argv[1]
    corpus = json.load(open("data/structured/recensio-es.json", encoding="utf-8"))["passages"]
    tokens = {}
    for p in corpus:
        for m in GREEK.findall(p.get("latin", "")):
            w = gg.nfc(m).lower()
            if len(gg.fold(w).strip("’ʼ'")) < 2 or not re.search(r"[α-ω]", gg.fold(w)):
                continue
            tokens[w] = tokens.get(w, 0) + 1
    known = {}
    for path in glob.glob("data/classics-lexicon/*-grc.json"):
        if path.endswith("vitruvius-grc.json"):
            continue
        d = json.load(open(path, encoding="utf-8"))
        for f, an in d["forms"].items():
            known.setdefault(gg.fold(f), [])
            for a in an:
                if a not in known[gg.fold(f)]:
                    known[gg.fold(f)].append(a)
    forms, lemmas = {}, set()
    for w in tokens:
        an = known.get(gg.fold(w))
        if an:
            forms[w] = an[:4]
            lemmas.update(a[0] for a in an[:4])
        else:
            forms[w] = [[w.strip("’ʼ'"), ""]]
            lemmas.add(w.strip("’ʼ'"))
    ENDS = [("ιν", "ις"), ("ον", "ος"), ("ου", "ος"), ("ου", "ον"), ("ω", "ος"), ("ω", "ον"), ("ης", "η"), ("ην", "η"),
            ("ας", "α"), ("αν", "α"), ("αις", "α"), ("αις", "η"), ("οις", "ος"), ("οις", "ον"), ("ους", "ος"), ("ων", "ος"),
            ("ων", "ον"), ("ων", "η"), ("ων", "α"), ("ες", "ης"), ("α", "ον"), ("οι", "ος"), ("αι", "η"), ("αι", "α"),
            ("ιν", "ι"), ("εως", "ις"), ("ει", "εω"), ("εις", "εω"), ("ουσιν", "εω"), ("ουσι", "εω"), ("ντες", "ω"),
            ("ος", "ς"), ("ος", "ξ"), ("α", "ς"), ("ν", "")]
    def cands(l):
        f = gg.fold(l)
        out = []
        for a_, b_ in ENDS:
            if f.endswith(a_) and len(f) > len(a_) + 2:
                out.append(gg.fold(f[: -len(a_)] + b_))
        return out
    wanted = {gg.fold(l) for l in lemmas}
    for l in lemmas:
        wanted.update(cands(l))
    lsj = gg.load_lsj(lsj_dir, wanted)
    lem_out = {}
    for l in sorted(lemmas):
        c = lsj.get(gg.fold(l), [])
        exact = [x for x in c if x["lemma"] == l] or c
        if exact:
            lem_out[l] = {"g": exact[0]["gloss"], "id": exact[0]["id"]}
            continue
        alt = next((lsj[c][0] for c in cands(l) if c in lsj), None)
        if alt:
            lem_out[l] = {"g": alt["gloss"], "id": alt["id"], "probable": alt["lemma"]}
        else:
            lem_out[l] = {"g": "", "id": ""}
    # Formas sin lema verificado ni entrada en el LSJ: se conservan sin glosa.
    data = {
        "schema": "vitruvia-greek-glossary-v1", "workId": "vitruvius", "language": "grc",
        "sources": [
            {"label": "Lematización: G. Celano, Lemmatized Ancient Greek XML (formas compartidas con otros textos del sitio)", "url": "https://github.com/gcelano/LemmatizedAncientGreekXML", "license": "CC BY-NC 4.0"},
            {"label": "Glosas: Liddell–Scott–Jones (Perseus Digital Library TEI)", "url": "https://github.com/PerseusDL/lexica", "license": "CC BY-SA 4.0"},
        ],
        "note": "Voces griegas citadas por Vitruvio; cuando la forma no está lematizada se busca como lema del LSJ.",
        "stats": {"forms": len(forms), "lemmas": len(lem_out), "glossed": sum(1 for v in lem_out.values() if v["g"])},
        "lemmas": lem_out, "forms": forms,
    }
    out = pathlib.Path("data/classics-lexicon/vitruvius-grc.json")
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(data["stats"]))


if __name__ == "__main__":
    main()
