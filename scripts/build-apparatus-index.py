#!/usr/bin/env python3
"""Índice estático del aparato crítico y de las notas de las ediciones de Diego Kurilo.

Fuentes (todas del repositorio):
  · data/<edición>-pages.json   texto por página de los PDF V514 / V554 / V297
  · data/structured/<edición>.json   pasajes con su página PDF (latín y traducción)
  · data/critical-notes.json    notas al pie extraídas de los DOCX del autor

Cada bloque del aparato se vincula a los loci impresos en la MISMA página del PDF
(«contexto de página»), nunca a un locus inventado. Una mención explícita de locus
dentro del bloque se registra aparte. Las notas DOCX conservan la distinción entre
locus explícito y locus candidato no verificado.

Uso: python3 scripts/build-apparatus-index.py  → data/apparatus-index.json
"""
import json, re, unicodedata, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
ED = [
    ("recensio-es", "V514", "es", "documents/kurilo-recensio-es.pdf"),
    ("recensio-fr", "V554", "fr", "documents/kurilo-recensio-fr.pdf"),
    ("theory-en", "V297", "en", "documents/kurilo-theory-en.pdf"),
]
# Encabezados en mayúsculas (rótulo editorial) o en redonda seguidos de dos puntos.
_UP = (r"APARATO CR[IÍ]TICO(?: COMPARATIVO| Y FILOL[OÓ]GICO)?|APARATO COMPARATIVO|APARATO FILOL[OÓ]GICO"
       r"|NOTA (?:E[CÉ]D[OÓ]TICA|CR[IÍ]TICA|TEXTUAL|T[EÉ]CNICA|ARQUITECT[OÓ]NICA|COMPARATIVA)"
       r"|APPARAT CRITIQUE(?: COMPARATIF)?|APPARAT (?:COMPARATIF|PHILOLOGIQUE)"
       r"|NOTE (?:[EÉ]CDOTIQUE|CRITIQUE|TEXTUELLE|TECHNIQUE|TERMINOLOGIQUE|COMPARATIVE)"
       r"|CRITICAL APPARATUS|CRITICAL NOTES?|TEXTUAL NOTES?|COMPARATIVE NOTES?|PHILOLOGICAL NOTES?|ECDOTIC NOTES?")
_LOW = (r"Aparato cr[ií]tico(?: comparativo| y filol[oó]gico)?|Nota (?:ecd[oó]tica|cr[ií]tica|textual|t[eé]cnica|arquitect[oó]nica|comparativa)"
        r"|Apparat critique(?: comparatif)?|Note (?:[eé]cdotique|critique|textuelle|technique|terminologique|comparative)"
        r"|Critical (?:apparatus|note)|Textual note|Ecdotic note|Comparative note")
HEAD = re.compile(r"(?<![A-Za-zÀ-ÿ])(?:(" + _UP + r")\b(?:\s*\[[A-Z][a-z]?\])?(?:\s*[—–-]\s*)?|(" + _LOW + r")\s*(?:\[[A-Z][a-z]?\])?\s*(?:[—–-]|:))")
# Locus inmediatamente después del rótulo: «— I.1.1.», «— I.praef.2», «sobre el Praefatio del Libro I».
LEAD_LOCUS = re.compile(r"^\s*(?:\[[A-Z][a-z]?\]\s*)?[—–-]?\s*((?:[IVX]{1,4}|\d{1,2})\.(?:praef\.)?\d+(?:\.\d+)?)")
LOCUS = re.compile(r"\b(?:[IVX]{1,4}|\d{1,2})\.(?:praef\.)?\d+(?:\.\d+)?(?:[–-]\d+)?\b")
ROM = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}
# Siglas de los testimonios citadas en el aparato (forma impresa en las ediciones).
SIGLA = re.compile(r"\b(Harleianus|Harl\.|Gudianus|Gud\.|Selestadiensis|Scletstatensis|Sel\.|Vossianus|Voss\.|Vaticanus|Vat\.|Krohn|Rose|Fensterbusch|Granger|Gros|Fleury|Callebat|Corso)\b")


# --- Vocabulario ampliado (2026-11-11) -------------------------------------
# El detector original sólo admitía una lista cerrada de rótulos, de modo que
# quedaba fuera el aparato rotulado NOTA METROLÓGICA, NOTA HERMENÉUTICA,
# «Bibliografía (Referencia Crítica)», «Análisis Crítico y Técnico» y las
# entradas del diccionario vitruviano del autor. Se amplía por unión: todo lo
# que detectaba HEAD se sigue detectando.
_CAPW = r"[A-ZÁÉÍÓÚÜÑÀÈÌÒÙÇÄÖ][A-ZÁÉÍÓÚÜÑÀÈÌÒÙÇÄÖ'\u2019\-]*"
VERSAL = re.compile(
    r"(?<![A-Za-zÀ-ÿ])("
    r"(?:APARATO|APPARAT|APPARATUS|NOTA|NOTE|NOTES|CRITICAL|TEXTUAL|ECDOTIC|COMMENTARY"
    r"|COMENTARIO|COMMENTAIRE|ANÁLISIS|ANALYSE|ANALYSIS)"
    r"(?:\s+(?:DE|DEL|DES|DU|LA|LE|LES|Y|ET|AND|ON|POUR|PARA|E)\b|\s+" + _CAPW + r"){0,4}"
    r")(?=\s*(?:\[[A-Za-z][a-z]?\]\s*)?(?:[—–:·]|\.\s+[A-ZÁÉÍÓÚ«]))")
TITLE = re.compile(
    r"(?<![A-Za-zÀ-ÿ])("
    r"Bibliograf[íi]a\s*\(Referencia\s+Cr[íi]tica\)|Bibliographie\s*\(R[ée]f[ée]rence\s+Critique\)"
    r"|Bibliography\s*\(Critical\s+Reference\)"
    r"|An[áa]lisis\s+Cr[íi]tico(?:\s+y\s+T[ée]cnico)?|Analyse\s+Critique(?:\s+et\s+Technique)?"
    r"|Critical\s+(?:and\s+Technical\s+)?Analysis"
    r"|Notas?\s+Cr[íi]ticas?|Notes?\s+Critiques?"
    r"|Nota\s+(?:de\s+alcance|textual|de\s+m[ée]todo|exeg[ée]tica|terminol[óo]gica)"
    r"|Comentario|Commentaire|Commentary"
    r")(?=\s*(?:[—–:(]|\s[A-ZÁÉÍÓÚ«]|\s*$))")
# La edición inglesa (V297) es anterior y de otra arquitectura: rotula el aparato en
# caja baja («Critical note», «Adopted reading») y no en versales, de modo que el
# detector de versales la veía apenas. Vocabulario propio, medido sobre sus 1056 páginas:
# 292 rótulos en 215 páginas.
INGLESA = re.compile(
    r"(?<![A-Za-z])("
    r"(?:Textual|Critical|Comparative|Philological|Ecdotic|Technical|Terminological|Exegetical"
    r"|Hermeneutic|Historical|Archaeological|Metrological|Acoustic|Geometric(?:al)?|Constructional"
    r"|Constructive|Architectural|Historiographical|Medical|Musical|Military|Mechanical|Scope|Method"
    r"|Reception|Translation|Linguistic|Lexical|Editorial|Explanatory)"
    r"(?:\s+and\s+(?:metrological|geometrical|constructional|mechanical|architectural|textual"
    r"|philological|technical|historical|critical))?"
    r"\s+(?:note|notes|apparatus|analysis|commentary|remark|observation|appendix)"
    r"(?:\s+on\s+[^.:;]{3,48})?"
    r"|Adopted\s+(?:text|reading|wording|form)|Preferred\s+reading|Retained\s+reading"
    r"|Reading\s+of\s+(?:the\s+)?(?:main\s+)?codices"
    r"|Bibliography\s*\(Critical\s+Reference\)|Critical\s+bibliography"
    r"|Argumentum\s+libri\s+[IVX]+"
    r")(?=\s*[—–:.·]|\s+[A-Z“\"])")

# Entrada del diccionario vitruviano del autor: «ABACUS [ἄβαξ]. El ábaco: …».
GLOSS = re.compile(
    r"(?<![A-Za-zÀ-ÿ])([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]{2,23})(\s*\[[^\]]{1,40}\])?\.\s+(?=[A-ZÁÉÍÓÚ«¿])")
ROMAN_ONLY = re.compile(r"^[IVXLCDM]+$")
# Palabras que son parte de un rótulo, no lemas del diccionario.
RUBRIC_WORD = set(("""TERMINOLOGICA TERMINOLOGIQUE EXEGETICA EXEGETIQUE ECDOTICA ECDOTIQUE CRITICA
CRITIQUE FILOLOGICA PHILOLOGIQUE METROLOGICA METROLOGIQUE HERMENEUTICA HERMENEUTIQUE
CONSTRUCTIVA CONSTRUCTIVE HISTORICA HISTORIQUE HISTORIOGRAFICA HISTORIOGRAPHIQUE
ARQUEOLOGICA ARCHEOLOGIQUE TECNICA TECHNIQUE ACUSTICA ACOUSTIQUE GEOMETRICA GEOMETRIQUE
ARQUITECTONICA ARCHITECTURALE COMPARATIVA COMPARATIF NOTE NOTA APARATO APPARAT""").split())
NOT_LEMMA = set("""DOCX PDF DOI ISBN IIIF TEI CTS OCR URL HTTP HTML JSON BCE CE AD BC
ANNO CIRCA IBID IDEM LOC CIT VOL FIG TAB NOTA NOTE""".split()) | RUBRIC_WORD


def wide_rubrics(text):
    """Rótulos del aparato en una página: unión del detector original y el ampliado.

    Devuelve [(posición, rótulo, tipo)] ordenado, sin solapamientos: una entrada
    de diccionario que cae dentro de un rótulo ya detectado se descarta, porque
    es el término glosado por ese rótulo y no una entrada autónoma.
    """
    found = []
    for m in HEAD.finditer(text):
        found.append((m.start(), (m.group(1) or m.group(2)).strip(), "rotulo"))
    for m in VERSAL.finditer(text):
        found.append((m.start(), m.group(1).strip(), "rotulo"))
    for m in TITLE.finditer(text):
        found.append((m.start(), m.group(1).strip(), "rotulo"))
    for m in INGLESA.finditer(text):
        found.append((m.start(), " ".join(m.group(1).split())[:60], "rotulo"))
    gloss = []
    for m in GLOSS.finditer(text):
        lemma = m.group(1)
        if lemma in NOT_LEMMA or ROMAN_ONLY.match(lemma):
            continue
        gloss.append((m.start(), lemma + (m.group(2) or "").strip(), "glosario"))
    spans = sorted(found, key=lambda x: x[0])
    out = list(spans)
    for at, lab, kind in gloss:
        # Descartar si cae dentro de los 90 caracteres siguientes a un rótulo.
        if any(0 <= at - s < 90 for s, _, _ in spans):
            continue
        out.append((at, lab, kind))
    # Deduplicar por posición conservando el rótulo más largo.
    best = {}
    for at, lab, kind in out:
        if at not in best or len(lab) > len(best[at][0]):
            best[at] = (lab, kind)
    return [(at, lab, kind) for at, (lab, kind) in sorted(best.items())]


def fold(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()


def category(label):
    v = fold(label)
    if re.search(r"adopted|preferred|retained|reading of", v):
        return "filologica"
    if re.search(r"explanatory|commentary", v):
        return "comentario"
    if re.search(r"tecnica|technique|technical|arquitectonica|terminologique|terminologica", v):
        return "tecnica"
    if re.search(r"comparati[vf]", v):
        return "comparativa"
    if re.search(r"ecdot|textual|filolog|philolog|crit", v):
        return "filologica"
    return "comentario"


def norm_locus(m):
    head, _, rest = m.partition(".")
    book = ROM.get(head.upper(), head)
    return f"{int(book)}.{rest}" if str(book).isdigit() else m


def main():
    out = []
    for ed, ver, lang, pdf in ED:
        pages = json.loads((ROOT / f"data/{ed}-pages.json").read_text(encoding="utf8"))
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        by_page = {}
        for p in st.get("passages", []):
            for key in ("translation", "latin"):
                n = (p.get("pdf_pages") or {}).get(key)
                if isinstance(n, int):
                    by_page.setdefault(n, [])
                    if p["locus"] not in by_page[n]:
                        by_page[n].append(p["locus"])
        n_block = 0
        for page in pages:
            text, num = page.get("text"), page.get("page")
            if not isinstance(text, str) or not str(num).isdigit():
                continue
            num = int(num)
            if num < 195:  # páginas preliminares: criterios editoriales, no aparato de loci
                continue
            heads = wide_rubrics(text)
            for i, (at, label, rubric_kind) in enumerate(heads):
                end = heads[i + 1][0] if i + 1 < len(heads) else len(text)
                snippet = text[at:min(end, at + 2400)].strip()
                if len(snippet) < 60:
                    continue
                after = at + len(label)
                lead = LEAD_LOCUS.match(text[after:after + 40])
                mention = lead or LOCUS.search(snippet[:200])
                # Loci impresos en la misma página o en la anterior (el aparato suele cerrar la página).
                ctx = by_page.get(num) or by_page.get(num - 1) or []
                n_block += 1
                out.append({
                    "id": f"{ver}-p{num}-{i+1}",
                    "source": "bloque",
                    "edition": ed, "version": ver, "language": lang,
                    "kind": "glosario" if rubric_kind == "glosario" else category(label), "label": label,
                    "page": num, "pdf": f"{pdf}#page={num}",
                    "loci": ctx[:12], "locusLink": "contexto de página" if ctx else "sin locus en la página",
                    "locusMention": norm_locus(mention.group(1) if lead else mention.group(0)) if mention else None,
                    "locusInHeading": bool(lead),
                    "references": sorted(set(SIGLA.findall(snippet)))[:10],
                    "text": re.sub(r"\s+", " ", snippet)[:1400],
                })
        print(ed, "bloques:", n_block)
    notes = json.loads((ROOT / "data/critical-notes.json").read_text(encoding="utf8"))["entries"]
    vers = {e[0]: e for e in ED}
    for n in notes:
        ed, ver, lang, pdf = vers[n["edition"]]
        loc = n.get("locus") or n.get("candidate_locus")
        out.append({
            "id": f"{ver}-n{n['footnote_id']}",
            "source": "nota",
            "edition": ed, "version": ver, "language": lang,
            "kind": "nota", "label": f"{ver} · nota {n['footnote_id']}",
            "page": None, "pdf": pdf,
            "loci": [loc] if loc else [],
            "locusLink": "locus explícito" if n.get("locus") else ("locus candidato sin verificar" if loc else "sin locus"),
            "locusMention": n.get("locus"),
            "locusInHeading": False,
            "references": [],
            "text": re.sub(r"\s+", " ", str(n.get("text", ""))).strip()[:1400],
            "anchor": str(n.get("anchor", "")).strip()[:300],
        })
    # Glosas lematizadas del comentario (scripts/extract-authorial-apparatus.py).
    # Se incorporan al índice para que las levanten todos los consumidores ya
    # existentes: el buscador Vitruvia, aparato-critico.html y colacion.html?locus=.
    # Su locus no viene de la cercanía en la página sino de haber hallado el lema en
    # el texto latino de la propia edición, de modo que es un vínculo más firme.
    autoral = ROOT / "data/apparatus/aparato-autoral.json"
    GRADO_VINCULO = {
        "verificado-por-lema": "locus verificado por el lema",
        "verificado-por-lema-y-pagina": "locus verificado por el lema y la página",
        "verificado-por-lema-y-seccion": "locus verificado por el lema y la sección de comentario",
        "lema-en-varios-loci": "lema en varios loci, sin desambiguar",
        "sin-anclaje": "lema no localizado en el texto latino",
    }
    n_glosa = 0
    if autoral.exists():
        aut = json.loads(autoral.read_text(encoding="utf8"))
        vers = {e["id"]: e for e in aut.get("ediciones", [])}
        for g in aut.get("glosas", []):
            ed = vers.get(g["edition"], {})
            firme = g["grado"].startswith("verificado")
            out.append({
                "id": g["id"], "source": "glosa",
                "edition": g["edition"], "version": g["version"], "language": g["language"],
                "kind": "glosa", "label": g["lemma"],
                "page": g["page"], "pdf": g["pdf"],
                "loci": [g["locus"]] if g.get("locus") else (g.get("lociPosibles") or [])[:6],
                "locusLink": GRADO_VINCULO.get(g["grado"], g["grado"]),
                "locusMention": g.get("locus"),
                "locusInHeading": firme,
                "references": [a["siglum"] for a in g.get("autoridades", [])][:10],
                "text": (g["lemma"] + "] " + g["glosa"])[:1400],
            })
            n_glosa += 1
        for d in aut.get("diccionario", []):
            out.append({
                "id": d["id"], "source": "glosario",
                "edition": d["edition"], "version": d["version"], "language": d["language"],
                "kind": "glosario", "label": d["lemma"],
                "page": d["page"], "pdf": d["pdf"],
                "loci": d.get("lociCitados") or [],
                "locusLink": "locus citado en la definición" if d.get("lociCitados") else "sin locus",
                "locusMention": (d.get("lociCitados") or [None])[0],
                "locusInHeading": bool(d.get("lociCitados")),
                "references": [a["siglum"] for a in d.get("autoridades", [])][:10],
                "text": (d["lemma"] + (f" [{d['graecum']}]" if d.get("graecum") else "") + ". " + d["definicion"])[:1400],
            })
            n_glosa += 1
        print("glosas y glosario incorporados:", n_glosa)

    doc = {
        "schema": "vitruvius-apparatus-index/1",
        "generated": datetime.date.today().isoformat(),
        "method": "Bloques del aparato localizados por encabezado en el texto de los PDF y notas DOCX del autor. "
                  "El vínculo con el locus es el de la página impresa; no equivale a una collatio verificada. "
                  "Vocabulario de rótulos ampliado el 2026-11-11 por unión: además de los rótulos de la lista "
                  "original se reconocen los rótulos en versales de cualquier especialidad (metrológica, "
                  "hermenéutica, constructiva…), las bibliografías críticas por locus y las entradas del "
                  "diccionario vitruviano del autor.",
        "editions": [{"id": e[0], "version": e[1], "language": e[2], "pdf": e[3]} for e in ED],
        "counts": {"bloques": sum(1 for x in out if x["source"] == "bloque"),
                   "notas": sum(1 for x in out if x["source"] == "nota"),
                   "glosas": sum(1 for x in out if x["source"] == "glosa"),
                   "glosario": sum(1 for x in out if x["source"] == "glosario")},
        "entries": out,
    }
    (ROOT / "data/apparatus-index.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(doc["counts"])


if __name__ == "__main__":
    main()
