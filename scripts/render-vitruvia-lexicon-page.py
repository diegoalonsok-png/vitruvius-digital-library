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

# Cobertura documentada del corpus: qué está completo, qué es parcial, cómo se lematiza y qué traducción hay.
PARTIAL = {"pliny-naturalis": "Parcial: libros XXXIII–XXXVI de XXXVII (metales, pintura, escultura, piedras y arquitectura).",
           "columella-rustica": "Parcial: libros I–IX de XII (la edición de base no incluye X–XII).",
           "vitruvius@grc": "Selección: solo los pasajes de Vitruvio con voces griegas (el texto latino íntegro está en el corpus latino)."}
TRANS = {"vitruvius": "Castellano, francés e inglés (ediciones Kurilo V514, V554, V297), alineadas por locus.",
         "theophrastus-characters": "—", "cato-agricultura": "—", "varro-rustica": "—", "frontinus-aquaeductu": "—"}
APPROX = {"pliny-naturalis": " Alineación proporcional (parágrafos de Mayhoff ↔ capítulos de Bostock): orientativa.",
          "apuleius-metamorphoses": " Alineación proporcional dentro del libro: orientativa.",
          "petronius-satyrica": " Alineación por sección.", "homer-iliad": " Alineación por tramo de versos.", "homer-odyssey": " Alineación por tramo de versos."}
rows = []
for l in ("la", "grc"):
    c = json.loads((ROOT / f"data/lexicon/corpus-{l}.json").read_text())
    words, passages = {}, {}
    for p_ in c["passages"]:
        words[p_[0]] = words.get(p_[0], 0) + len(re.findall(r"[^\W\d_]+", p_[2])); passages[p_[0]] = passages.get(p_[0], 0) + 1
    for wid, w in c["works"].items():
        if wid not in passages:
            continue
        key = wid + ("@grc" if l == "grc" and wid == "vitruvius" else "")
        cov = PARTIAL.get(key, "Completa (texto conservado en la edición de base).")
        lem = "CLTK: tabla forma → lema, sin desambiguación por contexto" if l == "la" else "G. Celano: lematización automática con categoría gramatical"
        tr = TRANS.get(wid, "Inglés (Perseus DL, CC BY-SA 4.0)." + APPROX.get(wid, " Alineación por locus o capítulo."))
        rows.append(f'<tr><td>{html.escape(w["author"])}, <i>{html.escape(w["title"])}</i></td><td>{"latín" if l == "la" else "griego"}</td>'
                    f'<td>{f"{words[wid]:,}".replace(",", ".")}</td><td>{f"{passages[wid]:,}".replace(",", ".")}</td><td>{html.escape(cov)}</td><td>{html.escape(lem)}</td><td>{html.escape(tr)}</td>'
                    f'<td class="lx-small">{html.escape((w.get("edition") or "")[:160])}{" · " + html.escape(w.get("license","")[:80]) if w.get("license") else ""}</td></tr>')
coverage = ('<details class="lx-coverage"><summary>Cobertura del corpus: completitud, lematización y traducciones por obra</summary>'
            '<p class="lx-small">Generado automáticamente a partir de los datos publicados (scripts/render-vitruvia-lexicon-page.py). '
            'La lematización es automática: los lemas ambiguos se señalan en cada pasaje y las correcciones verificadas a mano se marcan con ✓.</p>'
            '<div style="overflow-x:auto"><table class="lx-table"><thead><tr><th>Obra</th><th>Lengua</th><th>Palabras</th><th>Pasajes</th><th>Cobertura</th><th>Lematización</th><th>Traducción</th><th>Edición y licencia</th></tr></thead><tbody>'
            + "".join(rows) + "</tbody></table></div></details>")
s = PAGE.read_text()
if "<!--COVERAGE-->" not in s:
    s = s.replace('<h2 id="met-h" data-i18n>Método, sintaxis de búsqueda y fuentes</h2>', '<h2 id="met-h" data-i18n>Método, sintaxis de búsqueda y fuentes</h2>\n <!--COVERAGE-->', 1)
for name, content in (("ETYM-INDEX", index), ("ETYM-LD", ld_html), ("METRICS", metrics), ("COVERAGE", coverage)):
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
