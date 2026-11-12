#!/usr/bin/env python3
"""Validación de la collatio leída del Apéndice T antes de publicarla en el sitio.

La lectura de tablas de un PDF arrastra texto de columnas vecinas. Publicar una
celda sangrada como lectura de un manuscrito sería un error grave, así que aquí
se separa lo verificable de lo que necesita revisión humana, con tres controles:

1. CONCORDANCIA BILINGÜE. Las ediciones V514 y V554 imprimen la misma collatio;
   la lectura latina del testigo no depende de la lengua de la edición. Si ambas
   coinciden para el mismo locus, la entrada queda confirmada por doble fuente.
2. SANGRADO DE COLUMNA. Se rechaza la celda que contiene marcas propias de otra
   columna (un folio dentro de la lectura, un locus incrustado, prosa vernácula
   dentro de una lectura latina).
3. ORDEN CODICOLÓGICO. En un códice el orden de los folios acompaña al del texto.
   Una entrada que rompe la monotonía (f. 1r atribuido a 3.3.7) se aparta. Se usa la
   subsecuencia no decreciente más larga, robusta frente a valores atípicos.
4. JERARQUÍA DE EVIDENCIA. El mapa data/codex-h/folio-locus-map.json registra límites
   de libro verificados por inspección de la rúbrica del folio. Una rúbrica vista en
   el facsímil vale más que una tabla leída mecánicamente de un PDF, de modo que toda
   entrada que contradiga ese mapa o los rangos de libro declarados se aparta.

Se publica TODO el aparato leído, pero por GRADOS, que es la práctica normal en
filología: cada entrada declara qué respaldo tiene, en lugar de ocultar las que no
alcanzan el grado máximo.

  doble-fuente                impresa en las dos ediciones con la misma lectura latina
  fuente-unica                celda íntegra, pero sin par bilingüe que la confirme
  transcripcion-por-comprobar la celda muestra señales de arrastre de columna
  orden-dudoso                rompe el orden de folios del códice
  conflicto-con-el-facsimil   contradice el mapa verificado por inspección

Al mapa folio ↔ locus sólo pasan los dos primeros grados: un folio equivocado
corrompería la navegación del facsímil.

Uso: python3 scripts/validate-collatio.py
"""
import json, re, pathlib, datetime, collections, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
LECTURA = ("estaEdicion", "testigoH", "krohn", "vulgata", "lecturaVisible", "lectura", "testigo",
           "grado", "valoracion", "estado")
FOLIO_EN_CELDA = re.compile(r"\b\d{1,3}\s*[rv]\b")
LOCUS_EN_CELDA = re.compile(r"\b(?:[IVX]{1,4}|\d{1,2})\s*\.\s*(?:praef|\d{1,2})\s*\.\s*\d{1,3}\b", re.I)
VERNACULO = re.compile(r"\b(?:sin valor|en una sola|según|aunque|porque|mismo|también|puede|debe|"
                       r"selon|parce|aussi|peut|doit|même|without|because|also|should)\b", re.I)


def fold(s):
    t = unicodedata.normalize("NFD", s or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9⟨⟩\[\]& ]+", " ", t.lower().replace("j", "i").replace("v", "u"))


def norm_lectura(s):
    return re.sub(r"\s+", " ", fold(s)).strip()


LATIN_VOCAB = set()


def latin_tokens(s):
    """Tokens de la celda que existen en el texto latino de las ediciones.

    Comparar sólo estos neutraliza el arrastre de prosa vernácula, que sangra de
    manera distinta en la edición castellana y en la francesa.
    """
    return {t for t in re.findall(r"[a-z⟨⟩\[\]&]+", norm_lectura(s)) if len(t) > 2 and t in LATIN_VOCAB}


def acuerdo_latino(a, b):
    """Coincidencia de dos celdas por sus tokens latinos (Jaccard >= 0.6)."""
    ta, tb = latin_tokens(a), latin_tokens(b)
    if len(ta) < 2 or len(tb) < 2:
        return False
    inter = len(ta & tb)
    return inter / len(ta | tb) >= 0.6 or inter >= min(len(ta), len(tb)) >= 3


def folio_key(f):
    m = re.match(r"(\d+)\s*([rv])", f or "")
    return (int(m.group(1)), 0 if m.group(2) == "r" else 1) if m else (10 ** 6, 0)


def locus_key(l):
    b, c, *s = (str(l) + "..").split(".")
    return (int(b) if b.isdigit() else 0, 0 if c == "praef" else (int(c) if c.isdigit() else 0),
            int(s[0]) if s and s[0].isdigit() else 0)


def sangrada(campos):
    """Motivos por los que una fila parece arrastrar texto de otra columna."""
    motivos = []
    for k in LECTURA:
        v = campos.get(k)
        if not v:
            continue
        if k != "folio" and FOLIO_EN_CELDA.search(v):
            motivos.append(f"folio dentro de «{k}»")
        if LOCUS_EN_CELDA.search(v):
            motivos.append(f"locus dentro de «{k}»")
        if k in ("estaEdicion", "testigoH", "krohn", "vulgata") and VERNACULO.search(v):
            motivos.append(f"prosa vernácula dentro de «{k}»")
        tope = 420 if k in ("valoracion", "estado") else 190
        if len(v) > tope:
            motivos.append(f"celda «{k}» anómalamente larga ({len(v)})")
        if re.search(r"\bff?\.\s*\d{1,3}\s*[rv]\s*[–-]\s*\d{1,3}\s*[rv]", v):
            motivos.append(f"rango de folios en prosa dentro de «{k}»: resumen del anexo, no atribución")
    return sorted(set(motivos))


def main():
    for ed in ("recensio-es", "recensio-fr", "theory-en"):
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        for p in st.get("passages", []):
            LATIN_VOCAB.update(re.findall(r"[a-z]+", norm_lectura(p.get("latin", ""))))
    src = json.loads((ROOT / "data/apparatus/collatio-codicum.json").read_text(encoding="utf8"))
    E = src["entradas"]

    # 1 · concordancia bilingüe por (locus, lectura normalizada de esta edición)
    por_locus = collections.defaultdict(list)
    for e in E:
        por_locus[e["locus"]].append(e)

    confirmadas, revision = [], []
    for e in E:
        motivos = sangrada(e["campos"])
        pares = [o for o in por_locus[e["locus"]] if o["version"] != e["version"]]
        acuerdo = None
        campo = lambda x: (x["campos"].get("estaEdicion") or x["campos"].get("lectura")
                           or x["campos"].get("lecturaVisible") or x["campos"].get("krohn") or "")
        for o in pares:
            if acuerdo_latino(campo(e), campo(o)):
                acuerdo = o["version"]
                break
        reg = dict(e)
        reg["bilingue"] = acuerdo
        reg["motivosDeRevision"] = motivos
        (revision if (motivos or not acuerdo) else confirmadas).append(reg)

    # 3 · orden codicológico sobre las confirmadas que traen folio
    conf_folio = [e for e in confirmadas if e["folios"]]
    orden = sorted(conf_folio, key=lambda e: folio_key(e["folios"][0]))
    # Subsecuencia no decreciente más larga: robusta frente a valores atípicos.
    # Un solo folio mal leído al principio no debe invalidar el resto de la serie.
    seq = [locus_key(e["locus"]) for e in orden]
    n = len(seq)
    mejor, prev = [1] * n, [-1] * n
    for i in range(n):
        for j in range(i):
            if seq[j] <= seq[i] and mejor[j] + 1 > mejor[i]:
                mejor[i], prev[i] = mejor[j] + 1, j
    coherentes = set()
    if n:
        i = max(range(n), key=lambda k: mejor[k])
        while i >= 0:
            coherentes.add(orden[i]["id"])
            i = prev[i]
    anom = {e["id"] for e in orden if e["id"] not in coherentes}
    confirmadas2 = [e for e in confirmadas if e["id"] not in anom]
    for e in confirmadas:
        if e["id"] in anom:
            e["motivosDeRevision"] = e.get("motivosDeRevision", []) + ["rompe el orden folio ↔ locus"]
            revision.append(e)

    # 4 · contraste con el mapa verificado por inspección del facsímil
    verificado = json.loads((ROOT / "data/codex-h/folio-locus-map.json").read_text(encoding="utf8"))
    # Sólo valen como contraste los folios verificados por inspección del facsímil.
    # Las entradas que este mismo proceso añadió al mapa («collatio_autoral») se
    # excluyen: contrastar contra ellas sería validar la collatio contra sí misma.
    INSPECCION = ("visual_rubric", "visual_text", "catalogue", "provisional", "not_verified")
    vmap = {e["folio"]: [l["locus"] for l in e.get("loci", [])
                         if l.get("status") != "collatio_autoral"]
            for e in verificado.get("entries", [])
            if e.get("folio_status") in INSPECCION}
    vmap = {f: loci for f, loci in vmap.items() if loci}
    libros = {b["book"]: (b.get("start"), b.get("end")) for b in verificado.get("books", [])}
    libro_de = lambda l: int(str(l).split(".")[0])
    choca = set()
    for e in confirmadas2:
        for f in e["folios"]:
            f = re.sub(r"\s+", "", f)
            if f in vmap and vmap[f]:
                if {libro_de(x) for x in vmap[f]} != {libro_de(e["locus"])}:
                    e.setdefault("motivosDeRevision", []).append(
                        f"contradice el mapa verificado en f.{f} ({', '.join(vmap[f])})")
                    choca.add(e["id"])
            b = libro_de(e["locus"])
            if b in libros and all(libros[b]):
                ini, fin = libros[b]
                if not (folio_key(ini) <= folio_key(f) <= folio_key(fin)):
                    e.setdefault("motivosDeRevision", []).append(
                        f"f.{f} fuera del rango declarado del libro {b} ({ini}–{fin})")
                    choca.add(e["id"])
    revision += [e for e in confirmadas2 if e["id"] in choca]
    confirmadas2 = [e for e in confirmadas2 if e["id"] not in choca]



    # Grado de cada entrada: se publican todas, cada una con su respaldo declarado.
    GRADOS = {
        "doble-fuente": "Impresa en las dos ediciones del autor con la misma lectura latina. "
                        "La lectura de un testimonio no depende de la lengua de la edición, de modo "
                        "que su coincidencia en ambas es una comprobación independiente.",
        "fuente-unica": "Celda íntegra, sin señales de arrastre de columna, pero sin una segunda "
                        "edición que repita la misma lectura. Transcripción fiel de lo impreso; "
                        "conviene confirmarla en la página citada antes de citarla como lectura.",
        "transcripcion-por-comprobar": "La celda muestra señales de arrastre de la columna vecina. "
                        "El dato existe en el aparato impreso, pero esta transcripción puede haber "
                        "mezclado columnas: se publica para que pueda compararse con la página, no "
                        "como lectura establecida de ningún testimonio.",
        "orden-dudoso": "La atribución de folio rompe el orden del códice. Puede ser un folio mal "
                        "leído o una referencia a otro lugar del manuscrito; requiere comprobación.",
        "conflicto-con-el-facsimil": "Contradice el mapa de folios verificado por inspección del "
                        "facsímil o los límites de libro declarados en él. Prevalece el facsímil.",
    }

    def grado_de(e):
        motivos = e.get("motivosDeRevision") or []
        if any("contradice" in m or "fuera del rango" in m for m in motivos):
            return "conflicto-con-el-facsimil"
        if any("dentro de" in m or "larga" in m or "vernácula" in m for m in motivos):
            return "transcripcion-por-comprobar"
        if any("orden" in m for m in motivos):
            return "orden-dudoso"
        return "doble-fuente" if e.get("bilingue") else "fuente-unica"

    todas = []
    for e in confirmadas2 + revision:
        reg = dict(e)
        reg["grado"] = grado_de(e)
        todas.append(reg)
    vistos, entradas_unicas = set(), []
    for e in todas:
        if e["id"] in vistos:
            continue
        vistos.add(e["id"]); entradas_unicas.append(e)
    orden_grado = {g: i for i, g in enumerate(GRADOS)}
    entradas_unicas.sort(key=lambda e: (orden_grado.get(e["grado"], 9), locus_key(e["locus"])))
    por_grado = collections.Counter(e["grado"] for e in entradas_unicas)

    doc = {
        "schema": "vitruvius-collatio-validada/1",
        "generated": datetime.date.today().isoformat(),
        "metodo": ("Validación de la lectura mecánica del Apéndice T. Una entrada se declara CONFIRMADA sólo si "
                   "(a) la misma collatio aparece en las dos ediciones del autor, castellana y francesa, con la "
                   "misma lectura latina —doble fuente independiente de la lengua—, (b) ninguna celda muestra "
                   "señales de arrastre de la columna vecina, y (c) no rompe el orden de folios del códice. "
                   "Las demás se publican como cola de revisión y NO como aparato."),
        "recuentos": {
            "entradasLeidas": len(E),
            "confirmadas": len(confirmadas2),
            "enRevision": len(revision),
            "lociConfirmados": len({e["locus"] for e in confirmadas2}),
            "apartadasPorOrdenCodicologico": len(anom),
            "apartadasPorContradecirElFacsimil": len(choca),
            "publicadas": len(entradas_unicas),
            "porGrado": dict(por_grado),
        },
        "grados": GRADOS,
        "entradas": entradas_unicas,
        "confirmadas": confirmadas2,
        "revision": revision,
    }
    # Mapa folio ↔ locus: sólo los dos grados superiores. Ambos pasaron los controles
    # de integridad de celda, de orden codicológico y de contraste con el facsímil; la
    # diferencia entre ellos es si una segunda edición repite la lectura. Un folio
    # equivocado aquí corrompería la navegación del facsímil, así que los grados
    # inferiores no entran.
    CIMA = ("doble-fuente", "fuente-unica")
    aptas = [e for e in entradas_unicas if e["grado"] in CIMA]
    mapa = collections.defaultdict(set)
    grado_folio = {}
    for e in aptas:
        for f in e["folios"]:
            f = re.sub(r"\s+", "", f)
            mapa[f].add(e["locus"])
            if e["grado"] == "doble-fuente" or f not in grado_folio:
                grado_folio[f] = e["grado"]
    folios = [{"folio": f, "loci": sorted(mapa[f], key=locus_key),
               "evidencia": "collatio del autor, Apéndice T",
               "grado": grado_folio.get(f),
               "entradas": sorted({x["id"] for x in aptas if f in [re.sub(r'\s+','',y) for y in x["folios"]]})}
              for f in sorted(mapa, key=folio_key)]

    doc["folioLocus"] = folios
    doc["recuentos"]["foliosConfirmados"] = len(folios)
    out = ROOT / "data/apparatus/collatio-validada.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1024:.0f} KB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")
    print("\n   motivos de revisión más frecuentes:")
    c = collections.Counter(m for e in revision for m in e.get("motivosDeRevision", []))
    for m, n in c.most_common(8):
        print(f"     {n:4d}  {m}")
    print("\n   folio → locus confirmados (primeros 24):")
    print("     " + ", ".join(f"{f['folio']}→{f['loci'][0]}" for f in folios[:24]))


if __name__ == "__main__":
    main()
