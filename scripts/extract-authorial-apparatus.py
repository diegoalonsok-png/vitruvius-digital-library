#!/usr/bin/env python3
"""Extracción del aparato crítico y del comentario redactados en las ediciones de Diego A. Kurilo.

Por qué existe este script
--------------------------
`scripts/build-apparatus-index.py` sólo recoge los bloques que empiezan por un
rótulo de una lista cerrada. Medido sobre la *recensio* castellana (1157 páginas),
tocaba 128 páginas de las ~400 que el autor declara de aparato. Quedaban fuera el
comentario lematizado (`lemma] explicación`), el diccionario vitruviano del autor
(`ABACUS [ἄβαξ]. El ábaco: …`) y las bibliografías críticas por locus.

Qué hace de nuevo
-----------------
1. Extrae las UNIDADES DE COMENTARIO LEMATIZADO de las tres ediciones.
2. ANCLA cada unidad a un locus canónico buscando el lema en el texto latino de la
   propia edición. Si la secuencia de palabras del lema aparece en un único pasaje,
   la atribución queda probada por coincidencia textual: es verificable y
   reproducible, y no depende de la cercanía en la página impresa.
3. Registra las SECCIONES DE COMENTARIO («Comentario I.3.1») que dan locus
   explícito a los bloques que las siguen.
4. Levanta el REGISTRO DE AUTORIDADES realmente citadas, separando testimonios
   manuscritos, ediciones críticas modernas y ediciones impresas antiguas.

Qué NO hace
-----------
No verifica ninguna lectura contra un manuscrito. Una autoridad citada por el autor
se registra como citada, nunca como cotejada. El anclaje que este script certifica
es el del LOCUS de una nota, no el de una variante.

Uso: python3 scripts/extract-authorial-apparatus.py
"""
import json, re, unicodedata, pathlib, datetime, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
ED = [("recensio-es", "V514", "es", "documents/kurilo-recensio-es.pdf"),
      ("recensio-fr", "V554", "fr", "documents/kurilo-recensio-fr.pdf"),
      ("theory-en",   "V297", "en", "documents/kurilo-theory-en.pdf")]

# --- Autoridades, clasificadas por naturaleza del testimonio ------------------
AUTORIDADES = [
    ("H",  "Harleianus",      "manuscrito", r"\b(?:Harleianus|Harley|Codex\s+H|C[oó]dice\s+H|MS\s*2767)\b"),
    ("G",  "Gudianus",        "manuscrito", r"\b(?:Gudianus|Gud\.)\b"),
    ("S",  "Selestadiensis",  "manuscrito", r"\b(?:Selestadiensis|Scletstatensis|Sel\.)\b"),
    ("V",  "Vossianus",       "manuscrito", r"\b(?:Vossianus|Voss\.)\b"),
    ("Vat","Vaticanus",       "manuscrito", r"\b(?:Vaticanus|Vat\.)\b"),
    ("Rose",       "Rose 1899",        "edicion-critica", r"\bRose\b"),
    ("Krohn",      "Krohn 1912",       "edicion-critica", r"\bKrohn\b"),
    ("Bude",       "Budé (Les Belles Lettres)", "edicion-critica", r"\bBud[eé](?![^\W\d_])"),
    ("Fleury",     "Fleury",           "edicion-critica", r"\bFleury\b"),
    ("Callebat",   "Callebat",         "edicion-critica", r"\bCallebat\b"),
    ("Gros",       "Gros",             "edicion-critica", r"\bGros\b"),
    ("Soubiran",   "Soubiran",         "edicion-critica", r"\bSoubiran\b"),
    ("Granger",    "Granger",          "edicion-critica", r"\bGranger\b"),
    ("Marini",     "Marini",           "edicion-critica", r"\b(?:Marini|add\.\s*Mar\.)\b"),
    ("Corso",      "Corso",            "edicion-critica", r"\bCorso\b"),
    ("Fensterbusch","Fensterbusch",    "edicion-critica", r"\bFensterbusch\b"),
    ("Morgan",     "Morgan",           "edicion-critica", r"\bMorgan\b"),
    ("Giocondo",   "Giocondo 1511",    "impresa-antigua", r"\bGiocondo\b"),
    ("Cesariano",  "Cesariano 1521",   "impresa-antigua", r"\bCesarian[oe]\b"),
    ("Barbaro",    "Barbaro 1567",     "impresa-antigua", r"\bBarbaro\b"),
    ("Perrault",   "Perrault 1673",    "impresa-antigua", r"\bPerrault\b"),
    ("Sulpizio",   "Sulpizio 1486",    "impresa-antigua", r"\bSulpizio\b"),
    ("Urrea",      "Urrea 1582",       "impresa-antigua", r"\bUrrea\b"),
    ("Philandrier","Philandrier",      "impresa-antigua", r"\bPhilandrier\b"),
]
AUT_RX = [(sig, nom, tipo, re.compile(rx, re.I)) for sig, nom, tipo, rx in AUTORIDADES]

# --- Operaciones ecdóticas ----------------------------------------------------
OPERACIONES = [("om.", r"\bom\.", "omittit"), ("hab.", r"\bhab\.", "habet"),
               ("secl.", r"\bsecl\.", "seclusit"), ("add.", r"\badd\.", "addidit"),
               ("del.", r"\bdel\.", "delevit"), ("coni.", r"\bconi\.", "coniecit"),
               ("corr.", r"\bcorr\.", "correxit"), ("transp.", r"\btransp\.", "transposuit"),
               ("s. l.", r"\bs\.\s*l\.", "supra lineam"), ("ut vid.", r"\but\s*vid\.", "ut videtur"),
               ("in marg.", r"\bin\s*marg\.", "in margine")]
OP_RX = [(ab, re.compile(rx, re.I), lat) for ab, rx, lat in OPERACIONES]

SECCION = re.compile(r"(?<![A-Za-zÀ-ÿ])(Comentario|Commentaire|Commentary)\s+"
                     r"((?:[IVX]{1,4}|\d{1,2})\s*[.,]\s*(?:praef\.?|Praef\.?|Pr\.?)?\s*\d{0,2}(?:\s*\.\s*\d{1,3})?)", re.I)
# Comentario lematizado: «lemma] explicación» y «lemma: explicación».
CORCHETE = re.compile(r"(?<![\w·\]])([A-Za-zÀ-ÿͰ-Ͽἀ-῿]"
                      r"[A-Za-zÀ-ÿͰ-Ͽἀ-῿\s\[\]⟨⟩'’]{2,70}?)\]\s+(?=[A-ZÁÉÍÓÚ«¿])")
DOSPUNTOS = re.compile(r"(?<![\w·])([A-Za-zÀ-ÿͰ-Ͽἀ-῿]"
                       r"[A-Za-zÀ-ÿͰ-Ͽἀ-῿\s'’…]{2,70}?):\s+(?=[A-ZÁÉÍÓÚ«¿])")
# Entrada del diccionario del autor: «ABACUS [ἄβαξ]. El ábaco: …».
DICCIONARIO = re.compile(r"(?<![A-Za-zÀ-ÿ])([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]{2,23})(\s*\[[^\]]{1,40}\])?\.\s+(?=[A-ZÁÉÍÓÚ«¿])")
ROMANO = re.compile(r"^[IVXLCDM]+$")
NO_LEMA = set("""DOCX PDF DOI ISBN IIIF TEI CTS OCR URL HTTP HTML JSON BCE CE AD BC ANNO CIRCA
IBID IDEM LOC CIT VOL FIG TAB NOTA NOTE APARATO APPARAT TERMINOLOGICA TERMINOLOGIQUE
EXEGETICA EXEGETIQUE ECDOTICA ECDOTIQUE CRITICA CRITIQUE FILOLOGICA PHILOLOGIQUE
METROLOGICA METROLOGIQUE HERMENEUTICA HERMENEUTIQUE CONSTRUCTIVA CONSTRUCTIVE HISTORICA
HISTORIQUE HISTORIOGRAFICA ARQUEOLOGICA ARCHEOLOGIQUE TECNICA TECHNIQUE ACUSTICA
ACOUSTIQUE GEOMETRICA GEOMETRIQUE ARQUITECTONICA ARCHITECTURALE COMPARATIVA COMPARATIF
BOOK LIBER CHAPTER PROEM PREFACE""".split())
ROM = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10}


def fold(s):
    """Plegado filológico: sin diacríticos, minúsculas, i/j y u/v unificadas."""
    t = unicodedata.normalize("NFD", s or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t.lower().replace("j", "i").replace("v", "u")


def norm_locus(raw):
    raw = re.sub(r"\s+", "", str(raw or "")).replace(",", ".")
    m = re.match(r"^((?:[IVX]{1,4}|\d{1,2}))\.(praef\.?|Praef\.?|Pr\.?|\d{1,2})(?:\.(\d{1,3}))?$", raw, re.I)
    if not m:
        return None
    head = m.group(1).upper()
    book = ROM.get(head) if head in ROM else (int(head) if head.isdigit() else None)
    if not book or book > 10:
        return None
    cap = "praef" if re.match(r"^(praef|pr)", m.group(2), re.I) else str(int(m.group(2)))
    return f"{book}.{cap}.{int(m.group(3))}" if m.group(3) else f"{book}.{cap}"


def autoridades(text):
    return [{"siglum": s, "nombre": n, "tipo": t} for s, n, t, rx in AUT_RX if rx.search(text)]


def operaciones(text):
    return [{"abreviatura": ab, "latin": lat} for ab, rx, lat in OP_RX if rx.search(text)]


class Anclaje:
    """Ancla un lema a un locus buscando sus palabras en el latín de la edición."""

    def __init__(self, passages):
        self.latin = {}
        self.vocab = set()
        for p in passages:
            txt = fold(p.get("latin", ""))
            toks = re.findall(r"[a-zͰ-Ͽἀ-῿]+", txt)
            self.latin[p["locus"]] = " " + " ".join(toks) + " "
            self.vocab.update(toks)

    def lema_valido(self, lemma):
        toks = re.findall(r"[A-Za-zÀ-ÿͰ-Ͽἀ-῿]+", lemma)
        if not toks:
            return False
        return all(fold(t) in self.vocab for t in toks)

    def loci(self, lemma):
        toks = [fold(t) for t in re.findall(r"[A-Za-zÀ-ÿͰ-Ͽἀ-῿]+", lemma)]
        if not toks:
            return []
        needle = " " + " ".join(toks) + " "
        return [loc for loc, hay in self.latin.items() if needle in hay]


def main():
    glosas, secciones, dicc = [], [], []
    aut_count = collections.Counter()
    tier = collections.Counter()
    canonical = set()

    for ed, ver, lang, pdf in ED:
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        passages = st.get("passages", [])
        canonical.update(p["locus"] for p in passages)
        anc = Anclaje(passages)
        # loci impresos por página, para desambiguar lemas repetidos
        by_page = collections.defaultdict(list)
        for p in passages:
            for key in ("latin", "translation"):
                n = (p.get("pdf_pages") or {}).get(key)
                if isinstance(n, int) and p["locus"] not in by_page[n]:
                    by_page[n].append(p["locus"])

        raw = json.loads((ROOT / f"data/{ed}-pages.json").read_text(encoding="utf8"))
        pages = raw if isinstance(raw, list) else raw.get("pages", [])
        seccion_actual = None

        for page in sorted((p for p in pages if isinstance(p.get("page"), int)), key=lambda p: p["page"]):
            num, text = page["page"], page.get("text")
            if not isinstance(text, str) or num < 195 or len(text) < 80:
                continue

            for m in SECCION.finditer(text):
                loc = norm_locus(m.group(2))
                if loc:
                    seccion_actual = loc
                    secciones.append({"edition": ed, "version": ver, "language": lang,
                                      "page": num, "pdf": f"{pdf}#page={num}",
                                      "locus": loc, "rotulo": " ".join(m.group(0).split())})

            # diccionario del autor
            for m in DICCIONARIO.finditer(text):
                lemma = m.group(1)
                if lemma in NO_LEMA or ROMANO.match(lemma):
                    continue
                griego = (m.group(2) or "").strip(" []")
                cuerpo = re.sub(r"\s+", " ", text[m.end():m.end() + 700]).strip()
                cuerpo = re.split(r"(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ]{3,}[\s.\[])", cuerpo)[0][:600]
                dicc.append({"id": f"{ver}-dic-p{num}-{m.start()}", "edition": ed, "version": ver,
                             "language": lang, "page": num, "pdf": f"{pdf}#page={num}",
                             "lemma": lemma, "lemmaFolded": fold(lemma),
                             "graecum": griego or None, "definicion": cuerpo,
                             "autoridades": autoridades(cuerpo),
                             "lociCitados": sorted({l for l in (norm_locus(x) for x in
                                 re.findall(r"(?:De architectura|Vitr\.?)\s*([0-9IVX]+[.,][0-9a-z.]+)", cuerpo)) if l}),
                             "seccion": seccion_actual})

            # comentario lematizado
            for forma, rx in (("corchete", CORCHETE), ("dospuntos", DOSPUNTOS)):
                for m in rx.finditer(text):
                    lemma = " ".join(m.group(1).split())
                    if len(lemma) < 4 or not anc.lema_valido(lemma):
                        continue
                    cuerpo = re.sub(r"\s+", " ", text[m.end():m.end() + 700]).strip()
                    corte = rx.search(cuerpo)
                    if corte and corte.start() > 40:
                        cuerpo = cuerpo[:corte.start()].rstrip()
                    cuerpo = cuerpo[:600]
                    if len(cuerpo) < 25:
                        continue
                    hits = anc.loci(lemma)
                    pagina_loci = by_page.get(num, []) + by_page.get(num - 1, [])
                    cruce = [l for l in hits if l in pagina_loci]
                    if len(hits) == 1:
                        locus, grado = hits[0], "verificado-por-lema"
                    elif len(cruce) == 1:
                        locus, grado = cruce[0], "verificado-por-lema-y-pagina"
                    elif seccion_actual and any(l == seccion_actual or l.startswith(seccion_actual + ".") for l in hits):
                        locus = next(l for l in hits if l == seccion_actual or l.startswith(seccion_actual + "."))
                        grado = "verificado-por-lema-y-seccion"
                    elif hits:
                        locus, grado = None, "lema-en-varios-loci"
                    else:
                        locus, grado = None, "sin-anclaje"
                    tier[grado] += 1
                    texto = lemma + "] " + cuerpo
                    for a in autoridades(texto):
                        aut_count[a["siglum"]] += 1
                    glosas.append({"id": f"{ver}-glo-p{num}-{m.start()}", "edition": ed, "version": ver,
                                   "language": lang, "page": num, "pdf": f"{pdf}#page={num}",
                                   "forma": forma, "lemma": lemma, "lemmaFolded": fold(lemma),
                                   "glosa": cuerpo, "locus": locus, "grado": grado,
                                   "lociPosibles": sorted(hits)[:8] if not locus else [],
                                   "seccion": seccion_actual,
                                   "autoridades": autoridades(texto),
                                   "operaciones": operaciones(texto)})

    doc = {
        "schema": "vitruvius-aparato-autoral/1",
        "generated": datetime.date.today().isoformat(),
        "metodo": ("Comentario lematizado, diccionario del autor y secciones de comentario extraídos del "
                   "texto de los PDF de las tres ediciones. El locus de una glosa se ancla buscando las "
                   "palabras del lema en el texto latino de la propia edición: «verificado-por-lema» "
                   "significa que la secuencia aparece en un único pasaje canónico y la atribución es "
                   "reproducible. Una autoridad citada por el autor se registra como CITADA, nunca como "
                   "cotejada: este archivo no verifica ninguna lectura contra un manuscrito."),
        "ediciones": [{"id": e[0], "version": e[1], "language": e[2], "pdf": e[3]} for e in ED],
        "grados": {
            "verificado-por-lema": "El lema aparece en un único pasaje canónico: atribución probada por coincidencia textual.",
            "verificado-por-lema-y-pagina": "El lema aparece en varios pasajes; uno solo está impreso en esa página.",
            "verificado-por-lema-y-seccion": "El lema aparece en varios pasajes; uno pertenece a la sección de comentario abierta.",
            "lema-en-varios-loci": "El lema aparece en más de un pasaje y el contexto no desambigua.",
            "sin-anclaje": "El lema no se localizó en el texto latino de la edición.",
        },
        "registroDeAutoridades": [{"siglum": s, "nombre": n, "tipo": t, "citasEnGlosas": aut_count.get(s, 0)}
                                   for s, n, t, _ in AUTORIDADES],
        "recuentos": {"glosas": len(glosas), "diccionario": len(dicc), "secciones": len(secciones),
                      "porGrado": dict(tier),
                      "lociCanonicos": len(canonical),
                      "lociConGlosaVerificada": len({g["locus"] for g in glosas if g["locus"]})},
        "secciones": secciones,
        "diccionario": dicc,
        "glosas": glosas,
    }
    out = ROOT / "data/apparatus/aparato-autoral.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1048576:.2f} MB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")


if __name__ == "__main__":
    main()
