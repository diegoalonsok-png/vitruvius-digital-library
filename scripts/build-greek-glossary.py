#!/usr/bin/env python3
"""Build a per-work Ancient Greek glossary: attested form -> lemma(s) + morphology tag -> short LSJ gloss.

Inputs (downloaded outside the repo, never committed):
  1. Lemmatized text from gcelano/LemmatizedAncientGreekXML (Celano 2017, CC BY-NC 4.0):
     texts/<urn>.xml with <t><f>form</f><l><l1 o="postag">lemma</l1></l></t>
  2. LSJ TEI from PerseusDL/lexica (CTS_XML_TEI/perseus/pdllex/grc/lsj, CC BY-SA 4.0).

Usage:
  python3 scripts/build-greek-glossary.py <lemmatized.xml> <lsj-dir> <out.json> <work-id>

Glosses are the English <tr> translation equivalents printed in LSJ for each entry,
truncated; they orient the reader and do not replace the full LSJ article.
"""
import json
import pathlib
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET

from betacode.conv import beta_to_uni


def nfc(s):
    return unicodedata.normalize("NFC", s or "").strip()


def fold(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().replace("ς", "σ").replace("ϲ", "σ")


def clean_tr(t):
    t = re.sub(r"\s+", " ", t).strip(" ,;:.")
    return t


def load_lsj(lsj_dir, wanted_folded):
    entries = {}
    pat_entry = re.compile(r"<entryFree\b([^>]*)>(.*?)</entryFree>", re.S)
    pat_id = re.compile(r'\bid="([^"]+)"')
    pat_key = re.compile(r'\bkey="([^"]+)"')
    pat_tr = re.compile(r"<tr\b[^>]*>(.*?)</tr>", re.S)
    for path in sorted(pathlib.Path(lsj_dir).glob("grc.lsj.perseus-eng*.xml")):
        raw = path.read_text(encoding="utf-8")
        for m in pat_entry.finditer(raw):
            attrs, body = m.groups()
            mi, mk = pat_id.search(attrs), pat_key.search(attrs)
            if not mi or not mk:
                continue
            eid, key = mi.group(1), mk.group(1)
            beta = re.sub(r"[\^_]", "", re.sub(r"\d+$", "", key))
            try:
                uni = nfc(beta_to_uni(beta))
            except Exception:
                continue
            f = fold(uni)
            if f not in wanted_folded:
                continue
            trs = []
            for t in pat_tr.findall(body):
                t = clean_tr(re.sub(r"<[^>]+>", "", t))
                if t and t not in trs:
                    trs.append(t)
                if sum(len(x) for x in trs) > 180:
                    break
            if not trs:
                plain = re.sub(r"<bibl\b.*?</bibl>|<cit\b.*?</cit>|<orth\b.*?</orth>", " ", body, flags=re.S)
                plain = clean_tr(re.sub(r"<[^>]+>", " ", plain))
                plain = re.sub(r"\s+([,;.])", r"\1", plain)
                if not plain:
                    continue
                trs = [plain[:160] + ("…" if len(plain) > 160 else "")]
            entries.setdefault(f, []).append({"lemma": uni, "id": eid, "gloss": "; ".join(trs)[:220]})
    return entries


def main():
    lem_path, lsj_dir, out_path, work_id = sys.argv[1:5]
    root = ET.parse(lem_path).getroot()
    forms = {}
    lemmas = set()
    tokens = 0
    for t in root.iter("t"):
        f = t.find("f")
        if f is None or not (f.text or "").strip():
            continue
        form = nfc(f.text).lower()
        if not re.search(r"[Ͱ-Ͽἀ-῿]", form):
            continue
        tokens += 1
        pos = t.attrib.get("o", "")
        analyses = []
        lnode = t.find("l")
        if lnode is not None:
            for l1 in list(lnode.findall("l1")) + list(lnode.findall("l2")):
                lem = nfc(re.sub(r"\d+$", "", l1.text or ""))
                if lem:
                    analyses.append([lem, l1.attrib.get("o", pos) or pos])
        if not analyses:
            continue
        bucket = forms.setdefault(form, [])
        for a in analyses:
            if a not in bucket:
                bucket.append(a)
            lemmas.add(a[0])
    wanted = {fold(l) for l in lemmas}
    lsj = load_lsj(lsj_dir, wanted)
    lemma_out = {}
    for lem in sorted(lemmas):
        cands = lsj.get(fold(lem), [])
        exact = [c for c in cands if c["lemma"] == lem] or cands
        if exact:
            lemma_out[lem] = {"g": exact[0]["gloss"], "id": exact[0]["id"]}
        else:
            lemma_out[lem] = {"g": "", "id": ""}
    glossed = sum(1 for v in lemma_out.values() if v["g"])
    data = {
        "schema": "vitruvia-greek-glossary-v1",
        "workId": work_id,
        "language": "grc",
        "sources": [
            {"label": "Lematización: G. Celano, Lemmatized Ancient Greek XML (2017)", "url": "https://github.com/gcelano/LemmatizedAncientGreekXML", "license": "CC BY-NC 4.0"},
            {"label": "Glosas: Liddell–Scott–Jones, A Greek-English Lexicon (Perseus Digital Library TEI)", "url": "https://github.com/PerseusDL/lexica", "license": "CC BY-SA 4.0"},
        ],
        "note": "Glosas breves (equivalentes ingleses impresos en el LSJ); la desambiguación de lemas es automática y debe verificarse en contexto.",
        "stats": {"tokens": tokens, "forms": len(forms), "lemmas": len(lemma_out), "glossed": glossed},
        "lemmas": lemma_out,
        "forms": forms,
    }
    pathlib.Path(out_path).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(data["stats"]))


if __name__ == "__main__":
    main()
