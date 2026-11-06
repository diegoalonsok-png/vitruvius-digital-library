#!/usr/bin/env python3
"""Inserta en vitruvia-lexicon.html el contenido estático rastreable:
índice de voces del Etymologicum, JSON-LD DefinedTermSet / DefinedTerm y cifras del corpus.
Idempotente: reemplaza lo que haya entre los marcadores <!--X--> … <!--/X-->."""
import hashlib, html, json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "vitruvia-lexicon.html"
URL = "https://diegoalonsok-png.github.io/vitruvius-digital-library/vitruvia-lexicon.html"
E = json.loads((ROOT / "data/lexicon/etymologicum.json").read_text())
SENT = json.loads((ROOT / "data/lexicon/sententiae.json").read_text())
stats = {}
all_works = set()
for l in ("la", "grc"):
    c = json.loads((ROOT / f"data/lexicon/corpus-{l}.json").read_text())
    f = json.loads((ROOT / f"data/lexicon/forms-{l}.json").read_text())
    all_works |= set(c["works"])
    stats[l] = {"works": len(c["works"]), "passages": len(c["passages"]),
                "words": sum(len(re.findall(r"[^\W\d_]+", p[2])) for p in c["passages"]),
                "forms": len(f["forms"]), "lemmas": len(f["lemmas"])}

fold = lambda x: "".join(c for c in unicodedata.normalize("NFD", x) if not unicodedata.combining(c)).lower()
entries = sorted(E["entries"], key=lambda e: (e["l"] != "la", fold(e["lemma"])))
items = []
for e in entries:
    he = " · ".join(h["w"] for h in e.get("he", [])[:1])
    items.append(f'<li><a href="vitruvia-lexicon.html?q={html.escape(e["lemma"])}&amp;mode=palabra" lang="{e["l"]}">{html.escape(e["lemma"])}</a> '
                 f'<small>{"lat." if e["l"] == "la" else "gr."}{" · " + html.escape(e.get("root", "")) if e.get("root") else ""}</small>'
                 + (f' <span lang="he" dir="rtl">{html.escape(he)}</span>' if he else "") + "</li>")
index = '<ul class="lx-index" style="list-style:none;padding:0">' + "\n".join(items) + "</ul>"

ld = {"@context": "https://schema.org", "@type": "DefinedTermSet", "@id": URL + "#etymologicum",
      "name": "Vitruvia Lexicon · Etymologicum", "inLanguage": ["la", "grc", "he", "es"],
      "creator": {"@type": "Person", "name": "Diego A. Kurilo"}, "url": URL,
      "hasDefinedTerm": [{"@type": "DefinedTerm", "@id": f"{URL}?q={e['lemma']}#{e['id']}", "name": e["lemma"],
                          "alternateName": [x for x in [e.get("head"), e.get("tr")] if x],
                          "inLanguage": e["l"], "termCode": e["id"],
                          "description": (e.get("sens") or [""])[0] + " " + e.get("etym", "")[:300],
                          "url": f"{URL}?q={e['lemma']}"} for e in entries]}
ld_html = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"

la, gr = stats["la"], stats["grc"]
metrics = ('<div class="metrics" id="lx-metrics">'
           f'<span><b>{len(all_works)}</b>obras</span>'
           f'<span><b>{la["passages"] + gr["passages"]:,}</b>pasajes</span>'
           f'<span><b>{la["words"] + gr["words"]:,}</b>palabras indexadas</span>'
           f'<span><b>{la["forms"] + gr["forms"]:,}</b>formas lematizadas</span>'
           f'<span><b>{la["lemmas"] + gr["lemmas"]:,}</b>lemas con glosa LSJ / Lewis &amp; Short</span>'
           f'<span><b data-m="etym">{len(E["entries"])}</b>fichas etimológicas</span>'
           f'<span><b data-m="sent">{len(SENT["sententiae"])}</b>sententiae</span></div>').replace(",", ".")

s = PAGE.read_text()
for name, content in (("ETYM-INDEX", index), ("ETYM-LD", ld_html), ("METRICS", metrics)):
    pat = re.compile(rf"<!--{name}-->.*?<!--/{name}-->|<!--{name}-->", re.S)
    s = pat.sub(lambda m: f"<!--{name}-->{content}<!--/{name}-->", s, count=1)
PAGE.write_text(s)
print(stats)

# Huella de versión de los datos: el navegador y el service worker guardan los JSON versionados
# sin volver a descargarlos hasta que cambie el contenido.
h = hashlib.sha1()
for name in sorted((ROOT / "data/lexicon").glob("*.json")):
    h.update(name.name.encode()); h.update(name.read_bytes())
ver = h.hexdigest()[:12]
page = PAGE.read_text()
meta = f'<meta name="lx-data-version" content="{ver}">'
page = re.sub(r'<meta name="lx-data-version" content="[^"]*">', meta, page) if 'name="lx-data-version"' in page else page.replace("</head>", meta + "\n</head>", 1)
PAGE.write_text(page)
print("versión de datos", ver)
