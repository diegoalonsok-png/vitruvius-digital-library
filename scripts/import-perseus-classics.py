#!/usr/bin/env python3
"""Import edited Greek and Latin texts from Perseus Digital Library TEI (CC BY-SA 4.0)
into data/classics-corpus/<work>-<lang>.json for classics-text-reader.html.

Each passage keeps the edition's own citation units; inner sections are shown inline
as [n]. No folio alignment is invented.

Usage: python3 scripts/import-perseus-classics.py [work-id ...] [--src DIR]
  --src DIR reads <DIR>/<basename of url> instead of downloading.
"""
import hashlib
import json
import pathlib
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

TEI = "{http://www.tei-c.org/ns/1.0}"
BASE = "https://raw.githubusercontent.com/PerseusDL/"
WORKS = {
    "plato-apology": {
        "url": BASE + "canonical-greekLit/master/data/tlg0059/tlg002/tlg0059.tlg002.perseus-grc2.xml",
        "lang": "grc", "mode": "divs", "subtype": "section", "inline": "stephanus",
        "attribution": "John Burnet, Platonis Opera I, Oxford, Clarendon Press, 1903; Perseus DL TEI, CC BY-SA 4.0",
        "alignment": "Locus = página de Stephanus; las subdivisiones [17a], [17b]… se indican en el texto",
        "min": (20, 50000),
    },
    "aristotle-poetics": {
        "url": BASE + "canonical-greekLit/master/data/tlg0086/tlg034/tlg0086.tlg034.perseus-grc2.xml",
        "lang": "grc", "mode": "divs", "subtype": "chapter", "inner": "subchapter",
        "attribution": "Rudolf Kassel, Aristotelis de arte poetica liber, Oxford, 1965 (texto distribuido por Perseus DL TEI, CC BY-SA 4.0)",
        "alignment": "Locus = capítulo; las líneas Bekker [1447a8]… se indican en el texto",
        "min": (20, 40000),
    },
    "epictetus-enchiridion": {
        "url": BASE + "canonical-greekLit/master/data/tlg0557/tlg002/tlg0557.tlg002.perseus-grc2.xml",
        "lang": "grc", "mode": "divs", "subtype": "chapter", "inner": "section",
        "attribution": "Heinrich Schenkl, Epicteti Dissertationes… Enchiridion, Leipzig, Teubner, 1916; Perseus DL TEI, CC BY-SA 4.0",
        "alignment": "Locus = capítulo del Manual; secciones [n] en el texto",
        "min": (50, 25000),
    },
    "caesar-gallico": {
        "url": BASE + "canonical-latinLit/master/data/phi0448/phi001/phi0448.phi001.perseus-lat2.xml",
        "lang": "la", "mode": "divs", "subtype": "chapter", "inner": "section", "parent": "book",
        "attribution": "T. Rice Holmes, C. Iuli Caesaris Commentarii, Oxford, Clarendon Press, 1914; Perseus DL TEI, CC BY-SA 4.0",
        "alignment": "Locus = libro.capítulo; secciones [n] en el texto",
        "min": (400, 300000),
    },
    "virgil-aeneid": {
        "url": BASE + "canonical-latinLit/master/data/phi0690/phi003/phi0690.phi003.perseus-lat2.xml",
        "lang": "la", "mode": "verse",
        "attribution": "J. B. Greenough, Bucolics, Aeneid, and Georgics of Vergil, Boston, Ginn & Co., 1900; Perseus DL TEI, CC BY-SA 4.0",
        "alignment": "Locus = libro.verso inicial del pasaje; la numeración de versos se conserva",
        "min": (300, 300000),
    },
    "virgil-georgica": {
        "url": BASE + "canonical-latinLit/master/data/phi0690/phi002/phi0690.phi002.perseus-lat2.xml",
        "lang": "la", "mode": "verse",
        "attribution": "J. B. Greenough, Bucolics, Aeneid, and Georgics of Vergil, Boston, Ginn & Co., 1900; Perseus DL TEI, CC BY-SA 4.0",
        "alignment": "Locus = libro.verso inicial del pasaje; la numeración de versos se conserva",
        "min": (60, 80000),
    },
}
SKIP = {"note", "pb", "fw", "head", "ref", "ptr", "bibl", "figure"}


def tag(n):
    return n.tag.rsplit("}", 1)[-1]


def clean(t):
    t = re.sub(r"\s+", " ", t).strip()
    return re.sub(r"\s+([,.;:·])", r"\1", t)


def text_of(node, cfg):
    parts = [node.text or ""]
    for ch in node:
        name = tag(ch)
        if name == "milestone":
            if cfg.get("inline") == "stephanus" and ch.attrib.get("unit") == "section" and ch.attrib.get("resp") == "Stephanus":
                parts.append(" [" + ch.attrib.get("n", "") + "] ")
            elif cfg.get("inner") == "subchapter" and ch.attrib.get("unit") == "line" and ch.attrib.get("n"):
                parts.append(" [" + ch.attrib["n"] + "] ")
        elif name in SKIP:
            pass
        elif name == "gap":
            parts.append(" […] ")
        elif name == "div" and cfg.get("inner") and ch.attrib.get("subtype") == cfg["inner"] and cfg["inner"] != "subchapter":
            parts.append(" [" + ch.attrib.get("n", "") + "] " + text_of(ch, cfg))
        else:
            parts.append(text_of(ch, cfg))
        parts.append(ch.tail or "")
    return "".join(parts)


def by_divs(root, cfg):
    parents = {c: p for p in root.iter() for c in p}
    out = []
    for d in root.iter(TEI + "div"):
        if d.attrib.get("subtype") != cfg["subtype"]:
            continue
        n = d.attrib.get("n", "")
        if cfg.get("parent"):
            p = parents.get(d)
            while p is not None and p.attrib.get("subtype") != cfg["parent"]:
                p = parents.get(p)
            n = (p.attrib.get("n", "") + "." if p is not None else "") + n
        head = d.find(TEI + "head")
        txt = clean(text_of(d, cfg))
        if len(txt) < 8:
            continue
        rec = {"locus": n, "text": txt}
        if head is not None and clean("".join(head.itertext())):
            rec["title"] = clean("".join(head.itertext()))
        out.append(rec)
    return out


def by_verse(root, cfg):
    out = []
    for book in root.iter(TEI + "div"):
        if book.attrib.get("subtype") != "book" or book.attrib.get("type") != "textpart":
            continue
        bn = book.attrib.get("n", "")
        chunk = []

        def flush():
            if chunk:
                out.append({"locus": bn + "." + chunk[0][0], "title": "vv. " + chunk[0][0] + "–" + chunk[-1][0],
                            "text": "\n".join(f"{t}" for _, t in chunk)})
                chunk.clear()
        for el in book.iter():
            name = tag(el)
            if name == "milestone" and el.attrib.get("unit") == "card":
                flush()
            elif name == "l":
                t = clean(text_of(el, cfg))
                if t:
                    chunk.append((el.attrib.get("n", ""), t))
        flush()
    return out


def main():
    args = sys.argv[1:]
    src = None
    if "--src" in args:
        i = args.index("--src")
        src = pathlib.Path(args[i + 1])
        del args[i:i + 2]
    ids = args or list(WORKS)
    for wid in ids:
        cfg = WORKS[wid]
        name = cfg["url"].rsplit("/", 1)[1]
        raw = (src / name).read_bytes() if src and (src / name).exists() else urllib.request.urlopen(cfg["url"], timeout=90).read()
        print("SOURCE", cfg["url"], len(raw), hashlib.sha256(raw).hexdigest())
        root = ET.fromstring(raw)
        passages = by_verse(root, cfg) if cfg["mode"] == "verse" else by_divs(root, cfg)
        chars = sum(len(p["text"]) for p in passages)
        if len(passages) < cfg["min"][0] or chars < cfg["min"][1]:
            raise SystemExit(f"{wid}: incomplete {len(passages)} passages {chars} chars")
        lic = "canonical-greekLit" if cfg["lang"] == "grc" else "canonical-latinLit"
        data = {
            "workId": wid, "language": cfg["lang"],
            "sourceType": "edited-greek-tei" if cfg["lang"] == "grc" else "edited-latin-tei",
            "editorialStatus": "Texto editado, no transcripción diplomática ni OCR del códice",
            "source": cfg["url"], "attribution": cfg["attribution"],
            "license": f"CC BY-SA 4.0 (PerseusDL {lic}; conservar atribución y compartir adaptaciones)",
            "alignment": cfg["alignment"] + "; sin correspondencia automática con folios",
            "passages": passages,
        }
        out = pathlib.Path("data/classics-corpus") / f"{wid}-{cfg['lang']}.json"
        out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print("WROTE", out, len(passages), chars)


if __name__ == "__main__":
    main()
