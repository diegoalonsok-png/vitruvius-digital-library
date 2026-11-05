#!/usr/bin/env python3
"""Build a per-work Latin glossary: attested form -> lemma -> short Lewis & Short gloss.

Inputs (downloaded outside the repo, never committed):
  * CLTK latin_lemmata_cltk.pickle (cltk/lat_models_cltk, MIT): form -> lemma
  * Lewis & Short TEI (PerseusDL/lexica, lat.ls.perseus-eng2.xml, CC BY-SA 4.0)

Usage:
  python3 scripts/build-latin-glossary.py <pickle> <ls.xml> <work-id> <text-source> [<text-source> ...]
  text-source: a data/classics-corpus/*.json file or a corpus/*.html page.
Writes data/classics-lexicon/<work-id>-la.json.

Lemmatization is dictionary-based (one lemma per form) and ignores context; the
reader shows it as an orientation, never as a certified analysis.
"""
import html
import json
import pathlib
import pickle
import re
import sys
import unicodedata


def fold(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().replace("j", "i").replace("v", "u")


def texts(src):
    p = pathlib.Path(src)
    raw = p.read_text(encoding="utf-8")
    if p.suffix == ".json":
        d = json.loads(raw)
        return " ".join(x.get("text", "") for x in d.get("passages", []))
    raw = re.sub(r"<(script|style)\b.*?</\1>", " ", raw, flags=re.S | re.I)
    return html.unescape(re.sub(r"<[^>]+>", " ", raw))


ABBR = re.compile(r"^(?:[a-z]{1,6}\.\s*)+$|^(?:i\. e\.|v\.|cf\.|sc\.|lit\.|fig\.|init\.|absol\.|act\.|pass\.|dep\.|gen\.|plur\.|sing\.|abl\.|acc\.|dat\.|nom\.|voc\.|adj\.|adv\.|part\.|perf\.|fut\.|imp\.|inf\.|sup\.|comp\.|neutr\.|subst\.|poet\.|transf\.|trop\.)", re.I)


def load_ls(path, wanted):
    raw = pathlib.Path(path).read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(r"<entryFree\b([^>]*)>(.*?)</entryFree>", raw, re.S):
        attrs, body = m.groups()
        km = re.search(r'\bkey="([^"]+)"', attrs)
        im = re.search(r'\bid="([^"]+)"', attrs)
        if not km:
            continue
        key = km.group(1)
        base = fold(re.sub(r"\d+$", "", key))
        if base not in wanted:
            continue
        orth = re.search(r"<orth\b[^>]*>(.*?)</orth>", body, re.S)
        itype = re.search(r"<itype>(.*?)</itype>", body, re.S)
        gen = re.search(r"<gen>(.*?)</gen>", body, re.S)
        pos = re.search(r"<pos>(.*?)</pos>", body, re.S)
        head = " ".join(x for x in [
            re.sub(r"<[^>]+>", "", orth.group(1)) if orth else key,
            re.sub(r"<[^>]+>", "", itype.group(1)) if itype else "",
            re.sub(r"<[^>]+>", "", gen.group(1)) if gen else "",
            re.sub(r"<[^>]+>", "", pos.group(1)) if pos else "",
        ] if x).strip()
        body2 = re.sub(r"<cit\b.*?</cit>|<bibl\b.*?</bibl>|<etym\b.*?</etym>|<foreign\b.*?</foreign>", " ", body, flags=re.S)
        gl = []
        for t in re.findall(r'<hi rend="ital">(.*?)</hi>', body2, re.S):
            t = re.sub(r"<[^>]+>", "", t).strip(" ,;:")
            if not t or len(t) < 3 or ABBR.match(t) or re.search(r"\d", t):
                continue
            if t not in gl:
                gl.append(t)
            if sum(len(x) for x in gl) > 140 or len(gl) >= 8:
                break
        out.setdefault(base, []).append({"key": key, "id": im.group(1) if im else "", "head": head, "gloss": "; ".join(gl)})
    return out


def lemma_for(form, table):
    f = form.lower()
    cands = [f, f.replace("j", "i"), f.replace("v", "u"), f.replace("u", "v"), f.replace("j", "i").replace("v", "u")]
    for c in cands:
        if c in table:
            return table[c]
    for enc in ("que", "ne", "ve"):
        if f.endswith(enc) and len(f) > len(enc) + 2:
            for c in (f[: -len(enc)], f[: -len(enc)].replace("v", "u"), f[: -len(enc)].replace("j", "i")):
                if c in table:
                    return table[c]
    return None


def main():
    pkl, ls, work, *sources = sys.argv[1:]
    table = pickle.load(open(pkl, "rb"))
    tokens = set()
    for s in sources:
        for w in re.findall(r"[A-Za-zÀ-ÿāēīōūăĕĭŏŭȳ]+", texts(s)):
            if len(w) > 1:
                tokens.add(w)
    forms, lemmas = {}, set()
    for w in tokens:
        lem = lemma_for(w, table)
        if not lem:
            continue
        k = fold(w)
        forms.setdefault(k, [])
        if lem not in forms[k]:
            forms[k].append(lem)
        lemmas.add(lem)
    wanted = {fold(re.sub(r"\d+$", "", l)) for l in lemmas}
    ls_entries = load_ls(ls, wanted)
    lem_out = {}
    for l in sorted(lemmas):
        base = fold(re.sub(r"\d+$", "", l))
        cands = ls_entries.get(base, [])
        digit = re.search(r"(\d+)$", l)
        pick = None
        if digit:
            pick = next((c for c in cands if c["key"].endswith(digit.group(1))), None)
        pick = pick or next((c for c in cands if c["gloss"]), None) or (cands[0] if cands else None)
        lem_out[l] = {"h": pick["head"] if pick else re.sub(r"\d+$", "", l), "g": pick["gloss"] if pick else "", "id": pick["id"] if pick else ""}
    data = {
        "schema": "vitruvia-latin-glossary-v1", "workId": work, "language": "la",
        "sources": [
            {"label": "Lematización: CLTK, latin_lemmata_cltk (forma → lema)", "url": "https://github.com/cltk/lat_models_cltk", "license": "MIT"},
            {"label": "Glosas: Lewis & Short, A Latin Dictionary (Perseus Digital Library TEI)", "url": "https://github.com/PerseusDL/lexica", "license": "CC BY-SA 4.0"},
        ],
        "note": "Lema asignado por tabla de formas, sin desambiguación contextual; glosas inglesas breves del Lewis & Short.",
        "stats": {"tokens": len(tokens), "forms": len(forms), "lemmas": len(lem_out), "glossed": sum(1 for v in lem_out.values() if v["g"])},
        "lemmas": lem_out, "forms": forms,
    }
    out = pathlib.Path("data/classics-lexicon") / f"{work}-la.json"
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(work, json.dumps(data["stats"]), out.stat().st_size)


if __name__ == "__main__":
    main()
