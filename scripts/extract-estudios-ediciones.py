#!/usr/bin/env python3
"""Prosa analítica de las ediciones: estudio introductorio, apéndices y excursus.

La auditoría de cobertura (scripts/audit-cobertura-ediciones.py) encontró 422
páginas que no son texto latino, ni traducción, ni aparato: introducción,
valoración de las ediciones críticas, stemma codicum, restitutio vocabulorum,
normae interpretationis, status quaestionis, excursus y aparato arqueológico
comparativo. Es erudición del autor que no era consultable desde el sitio.

Se indexa aparte del aparato y rotulada como estudio, no como aparato crítico:
son cosas distintas y conviene que un lector pueda distinguirlas. El archivo va
en su propio fichero para que no engorde el índice que cargan todas las páginas.

Uso: python3 scripts/extract-estudios-ediciones.py
"""
import json, re, pathlib, datetime, collections, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
ED = [("recensio-es", "V514", "es", "documents/kurilo-recensio-es.pdf"),
      ("recensio-fr", "V554", "fr", "documents/kurilo-recensio-fr.pdf"),
      ("theory-en",   "V297", "en", "documents/kurilo-theory-en.pdf")]

# Rótulo de apéndice o de sección de estudio, tal como aparece en el titulillo.
SECCION = re.compile(r"^\s*(?:ap[ée]ndice|annexe|appendix)\s+([a-z](?:\.\d)?|[ivx]+)\s*[·.:–-]\s*([^\d]{3,60})", re.I)
TITULILLO = re.compile(r"^\s*(?:el arquitecto de la teor[íi]a|the architect of theory|l.architecte de la th[ée]orie"
                       r"|de architectura[^\n]{0,40}|vitrvvivs pollio)\s*", re.I)
LOCUS = re.compile(r"\b((?:[IVX]{1,4}|\d{1,2})\.(?:praef\.?|\d{1,2})(?:\.\d{1,3})?)\b")
ROM = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10}
AUT = re.compile(r"\b(Krohn|Rose|Bud[eé]|Fleury|Callebat|Gros|Soubiran|Granger|Marini|Corso|Fensterbusch"
                 r"|Morgan|Giocondo|Cesarian[oe]|Barbaro|Perrault|Sulpizio|Urrea|Philandrier"
                 r"|Harleianus|Gudianus|Selestadiensis|Vossianus)\b")


def fold(s):
    t = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in t if not unicodedata.combining(c)).lower()


def norm_locus(raw):
    raw = re.sub(r"\s+", "", str(raw or ""))
    m = re.match(r"^((?:[IVX]{1,4}|\d{1,2}))\.(praef\.?|\d{1,2})(?:\.(\d{1,3}))?$", raw, re.I)
    if not m:
        return None
    h = m.group(1).upper()
    b = ROM.get(h) if h in ROM else (int(h) if h.isdigit() else None)
    if not b or b > 10:
        return None
    c = "praef" if re.match(r"^praef", m.group(2), re.I) else str(int(m.group(2)))
    return f"{b}.{c}.{int(m.group(3))}" if m.group(3) else f"{b}.{c}"


def main():
    cob = json.loads((ROOT / "reports/cobertura-ediciones.json").read_text(encoding="utf8"))
    por_ed = {e["id"]: e for e in cob["ediciones"]}
    idx = json.loads((ROOT / "data/apparatus-index.json").read_text(encoding="utf8"))
    paginas_aparato = collections.defaultdict(set)
    for e in idx["entries"]:
        if e.get("page"):
            paginas_aparato[e["edition"]].add(e["page"])

    entradas = []
    for ed, ver, lang, pdf in ED:
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        ocupadas = set(paginas_aparato[ed])
        for p in st.get("passages", []):
            pp = p.get("pdf_pages") or {}
            for k in ("latin", "translation"):
                if isinstance(pp.get(k), int):
                    ocupadas.add(pp[k])
        raw = json.loads((ROOT / f"data/{ed}-pages.json").read_text(encoding="utf8"))
        pages = {x["page"]: x.get("text") or "" for x in (raw if isinstance(raw, list) else raw.get("pages", []))
                 if isinstance(x.get("page"), int)}
        seccion = None
        for n in sorted(pages):
            texto = pages[n]
            # El titulillo puede venir antes o después del número de página, según
            # cómo haya caído la caja en el PDF: se quita en los dos órdenes.
            cuerpo = re.sub(r"\s+", " ", texto).strip()
            for _ in range(3):
                antes = cuerpo
                cuerpo = TITULILLO.sub("", cuerpo).strip()
                cuerpo = re.sub(r"^\d{1,4}\s+", "", cuerpo).strip()
                cuerpo = re.sub(r"^(?:ap[ée]ndice|annexe|appendix)\s+[a-z](?:\.\d)?\s*[·.:–-]\s*[^\d]{0,60}?\s*\d{0,4}\s*",
                                "", cuerpo, flags=re.I).strip()
                if cuerpo == antes:
                    break
            m = SECCION.search(texto[:260])
            if m:
                seccion = f"{m.group(1).upper()} · {' '.join(m.group(2).split())[:56]}"
            if n in ocupadas or len(cuerpo) < 700:
                continue
            loci = sorted({l for l in (norm_locus(x) for x in LOCUS.findall(cuerpo)) if l})
            entradas.append({
                "id": f"{ver}-est-p{n}", "edition": ed, "version": ver, "language": lang,
                "page": n, "pdf": f"{pdf}#page={n}",
                "seccion": seccion,
                "clase": "estudio introductorio" if n < 300 and not seccion else
                         ("apéndice" if seccion else "prosa analítica"),
                "loci": loci[:12],
                "autoridades": sorted(set(AUT.findall(cuerpo)))[:12],
                "texto": cuerpo[:2600],
            })

    doc = {
        "schema": "vitruvius-estudios-ediciones/1",
        "generated": datetime.date.today().isoformat(),
        "fuente": ("Páginas de las ediciones de Diego A. Kurilo que no son texto latino, traducción ni "
                   "aparato: estudio introductorio, apéndices en prosa y excursus."),
        "advertencia": ("Esto NO es aparato crítico ni traducción: es la prosa analítica del autor. Se "
                        "indexa aparte para que un lector pueda distinguir una cosa de la otra. Los loci "
                        "que acompañan a una página son los que la página cita, no una atribución "
                        "editorial del pasaje."),
        "recuentos": {
            "paginas": len(entradas),
            "porEdicion": dict(collections.Counter(e["version"] for e in entradas)),
            "porClase": dict(collections.Counter(e["clase"] for e in entradas)),
            "conLocusCitado": sum(1 for e in entradas if e["loci"]),
            "secciones": len({e["seccion"] for e in entradas if e["seccion"]}),
        },
        "entradas": entradas,
    }
    out = ROOT / "data/apparatus/estudios-ediciones.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1048576:.2f} MB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")
    secs = sorted({e["seccion"] for e in entradas if e["seccion"]})
    print("\n   secciones detectadas:")
    for s in secs[:18]:
        print(f"     {s}")


if __name__ == "__main__":
    main()
