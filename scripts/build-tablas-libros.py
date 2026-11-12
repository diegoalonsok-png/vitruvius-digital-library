#!/usr/bin/env python3
"""Extrae TODAS las tablas numeradas de las tres ediciones de Diego Kurilo.

Fuente: los PDF publicados en documents/ (V514 castellano, V554 francés,
V297 inglés). Las tablas del libro no tienen filetes verticales: sólo filetes
horizontales entre filas. Por eso:
  * las filas son las franjas entre filetes horizontales consecutivos;
  * las columnas salen del encabezado (intervalos de palabras fusionados);
  * una tabla sigue en la página siguiente cuando ésta repite el encabezado;
  * las palabras cortadas por la columna estrecha se reúnen sólo cuando la
    unión es una palabra atestiguada (wordfreq) o el corte es un guion.
Salida: data/tablas-libros.json (edición, número, título, página impresa y
del PDF, columnas, filas). No se corrige ni se inventa ningún contenido.
"""
import json, re, sys, hashlib
from pathlib import Path
import pdfplumber
from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
EDS = [
  {"id": "V514", "lang": "es", "pdf": "documents/kurilo-recensio-es.pdf", "cap": r"^Tabla (\d+)\.\s+(.*)$",
   "titulo": "De architectura. Recensio V514 (latín–castellano)"},
  {"id": "V554", "lang": "fr", "pdf": "documents/kurilo-recensio-fr.pdf", "cap": r"^Tableau (\d+)\.\s+(.*)$",
   "titulo": "De architectura. Recensio V554 (latin–français)"},
  {"id": "V297", "lang": "en", "pdf": "documents/kurilo-theory-en.pdf", "cap": r"^Table (\d+)\.\s+(.*)$",
   "titulo": "The Architect of Theory V297"},
]
TOC = re.compile(r"(\.\s?){4,}|\s\d{2,4}\s*$")

def palabra(w, lang):
    return zipf_frequency(w.lower().strip(".,;:()[]«»“”\"'"), lang)

def unir(a, b, lang):
    """¿La línea siguiente continúa la última palabra de la anterior?"""
    if not a or not b:
        return " "
    if a.endswith("-") and b[:1].islower():
        return "-cut"
    ua, pb = a.split()[-1], b.split()[0]
    if pb[:1] in ")],;.":
        return ""
    if not ua[-1:].isalpha() or not pb[:1].isalpha() or not pb[:1].islower():
        return " "
    junto = (ua + pb).strip(".,;:()")
    za, zb, zj = palabra(ua, lang), palabra(pb, lang), palabra(junto, lang)
    if zj >= 1.0 and (za < 2.5 or zb < 2.5):
        return ""
    # Transliteraciones y palabras griegas/latinas cortadas: ninguno de los dos trozos existe.
    if za == 0 and (zb == 0 and len(pb) <= 4 or len(pb) <= 2):
        return ""
    return " "

def texto_celda(palabras, lang, ancho=None):
    """Une las líneas de una celda. Un procesador de texto sólo parte una palabra
    sin guion cuando la palabra entera no cabe en la columna: si el último trozo
    de una línea y el primero de la siguiente juntos superan el ancho útil de la
    columna, son una sola palabra."""
    if not palabras:
        return ""
    lineas = []
    for w in sorted(palabras, key=lambda w: (round(w["top"]), w["x0"])):
        if lineas and abs(w["top"] - lineas[-1][0]) < 3:
            lineas[-1][1].append(w)
        else:
            lineas.append([w["top"], [w]])
    if ancho is None:
        ancho = max(w["x1"] for w in palabras) - min(w["x0"] for w in palabras)
    txt, prev = "", None
    for _, ws in lineas:
        ws = sorted(ws, key=lambda w: w["x0"])
        l = " ".join(w["text"] for w in ws)
        if not txt:
            txt, prev, lineas_prev = l, ws[-1], ws
            continue
        a, b = prev, ws[0]
        sola = len(lineas_prev) == 1
        forzado = (sola and (a["x1"] - a["x0"]) >= ancho * 0.84 and not a["text"].endswith((",", ";", ":", ".", ")"))
                   and b["text"][:1].isalnum() and not b["text"][:1].isupper()
                   and not (palabra(a["text"], lang) >= 2.5 and palabra(b["text"], lang) >= 2.5
                            and palabra(a["text"] + b["text"], lang) < 1.0))
        if txt.endswith("-") and b["text"][:1].islower():
            txt = txt[:-1] + l
        elif txt.endswith(("–", "—")) or b["text"][:1] in ")],;.":
            txt += l
        elif forzado:
            txt += l
        else:
            txt += " " + l
        prev, lineas_prev = ws[-1], ws
    return re.sub(r"\s+", " ", txt).strip()

def columnas(cab, x_min, x_max):
    iv = sorted([w["x0"], w["x1"]] for w in cab)
    out = []
    for a, b in iv:
        if out and a - out[-1][1] < 6:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    # el borde izquierdo de cada columna es el inicio de su encabezado
    bordes = [x_min] + [out[i + 1][0] - 2 for i in range(len(out) - 1)] + [x_max]
    return bordes

def columnas_cuerpo(ws, x_min, x_max):
    lineas = {}
    for w in ws:
        lineas.setdefault(round(w["top"] / 3), []).append(w)
    if len(lineas) < 3:
        return None
    inicios = []
    for l in lineas.values():
        l.sort(key=lambda w: w["x0"])
        prev = None
        for w in l:
            if prev is None or w["x0"] - prev["x1"] > 7:
                inicios.append(w["x0"])
            prev = w
    inicios.sort()
    grupos = []
    for x in inicios:
        if grupos and x - grupos[-1][-1] < 5:
            grupos[-1].append(x)
        else:
            grupos.append([x])
    minimo = max(2, int(len(lineas) * 0.3))
    starts = [min(g) for g in grupos if len(g) >= minimo]
    if len(starts) < 2:
        return None
    return [x_min] + [x - 2 for x in starts[1:]] + [x_max]

def filetes(p):
    hs = [l for l in p.lines if abs(l["top"] - l["bottom"]) < 1.5 and (l["x1"] - l["x0"]) > 100]
    hs += [r for r in p.rects if (r["bottom"] - r["top"]) < 1.5 and (r["x1"] - r["x0"]) > 100]
    ys = sorted({round(h["top"], 1) for h in hs})
    limpio = []
    for y in ys:
        if not limpio or y - limpio[-1] > 2:
            limpio.append(y)
    x0 = min((h["x0"] for h in hs), default=0)
    x1 = max((h["x1"] for h in hs), default=p.width)
    return limpio, x0, x1

def cuerpo(p):
    alto = p.height
    return [w for w in p.extract_words(keep_blank_chars=False, use_text_flow=False, extra_attrs=["size"], x_tolerance=1.5)
            if 45 < w["top"] < alto - 50]

def extraer(pdf, idx, y_desde, y_hasta, lang, bordes=None, cab_ref=None, bordes_x0=None):
    """Tabla en la página idx entre y_desde e y_hasta.
    Sin bordes: el encabezado está arriba (antes del primer filete o en la primera franja).
    Con bordes (continuación): se reutilizan; si la primera franja repite el encabezado, se omite."""
    p = pdf.pages[idx]
    ys, x0, x1 = filetes(p)
    ys = [y for y in ys if y_desde < y < y_hasta]
    if len(ys) < 2:
        return None
    ws = [w for w in cuerpo(p) if w["top"] < y_hasta]
    if bordes is None:
        cab_ws = [w for w in ws if y_desde < w["top"] < ys[0] - 1]
        if not cab_ws:
            cab_ws = [w for w in ws if ys[0] < w["top"] < ys[1] - 1]
            ys = ys[1:]
        if not cab_ws or len(ys) < 2:
            return None
        bordes = columnas(cab_ws, x0 - 2, x1 + 2)
        # Encabezados apretados (versalitas que se tocan): las columnas se leen
        # también en el cuerpo, por los inicios de palabra tras un blanco ancho.
        cuerpo_ws = [w for w in ws if ys[0] < w["top"] < ys[-1]]
        alt = columnas_cuerpo(cuerpo_ws, x0 - 2, x1 + 2)
        if alt and len(alt) > len(bordes):
            bordes = alt
    else:
        cab_ws = None
        bordes = [b + (x0 - bordes_x0) for b in bordes] if bordes_x0 is not None else bordes
    anchos = []
    for i in range(len(bordes) - 1):
        col = [w for w in ws if w["top"] > ys[0] and bordes[i] <= w["x0"] + 1 < bordes[i + 1]]
        anchos.append((max(w["x1"] for w in col) - min(w["x0"] for w in col)) if col else bordes[i + 1] - bordes[i])
    def cortar(ws_):
        celdas = [[] for _ in range(len(bordes) - 1)]
        for w in ws_:
            cx = w["x0"] + 1
            for i in range(len(bordes) - 1):
                if bordes[i] <= cx < bordes[i + 1]:
                    celdas[i].append(w); break
            else:
                (celdas[0] if cx < bordes[0] else celdas[-1]).append(w)
        return [texto_celda(c, lang, anchos[i]) for i, c in enumerate(celdas)]
    def cortar_cab(ws_):
        """En versalitas apretadas dos rótulos vecinos pueden salir pegados
        («EquivalenteRelación»): se separan en la mayúscula interior."""
        partidos = []
        for w in ws_:
            m = re.search(r"[a-zà-ÿ]([A-ZÀ-Ý])", w["text"])
            if not m:
                partidos.append(w); continue
            k = m.start(1); L = len(w["text"]); xm = w["x0"] + (w["x1"] - w["x0"]) * k / L
            partidos.append(dict(w, text=w["text"][:k], x1=xm))
            partidos.append(dict(w, text=w["text"][k:], x0=xm + 0.5))
        return cortar(partidos)
    cab = cortar_cab(cab_ws) if cab_ws else cab_ref
    filas = []
    for a, b in zip(ys, ys[1:]):
        banda = [w for w in ws if a < w["top"] < b - 1]
        for sub in subfilas(banda, bordes):
            fila = cortar(sub)
            if any(fila):
                filas.append(fila)
    if cab_ws is None and filas and cab_ref and plano(filas[0]) == plano(cab_ref):
        filas = filas[1:]
    return cab, filas, (bordes, x0), ys[-1]

def subfilas(banda, bordes):
    """Tablas sin filetes entre filas (estilo booktabs de V514/V554): una franja
    puede contener varias filas. Empieza fila nueva la línea que tiene texto en la
    primera columna, si la celda anterior de esa columna no quedó abierta (paréntesis
    sin cerrar, guion, coma) y la línea ocupa al menos la mitad de las columnas
    o deja un blanco vertical mayor que el interlineado."""
    if not banda:
        return []
    lineas = []
    for w in sorted(banda, key=lambda w: (w["top"], w["x0"])):
        if lineas and abs(w["top"] - lineas[-1][0]) < 3:
            lineas[-1][1].append(w)
        else:
            lineas.append([w["top"], [w]])
    if len(lineas) < 3:
        return [banda]
    ncol = len(bordes) - 1
    def col(w):
        for i in range(ncol):
            if bordes[i] <= w["x0"] + 1 < bordes[i + 1]:
                return i
        return 0 if w["x0"] < bordes[0] else ncol - 1
    saltos = sorted(b[0] - a[0] for a, b in zip(lineas, lineas[1:]))
    paso = saltos[len(saltos) // 2]
    grupos, abierta, previo = [], False, None
    for top, ws in lineas:
        cols = {col(w) for w in ws}
        txt0 = " ".join(w["text"] for w in sorted(ws, key=lambda w: w["x0"]) if col(w) == 0)
        nueva = (not grupos) or (0 in cols and not abierta and
                 (len(cols) >= max(2, (ncol + 1) // 2) or (previo is not None and top - previo > paso * 1.35)))
        if nueva:
            grupos.append([])
        grupos[-1].extend(ws)
        if 0 in cols:
            acumulado = " ".join(w["text"] for w in grupos[-1] if col(w) == 0)
            abierta = acumulado.count("(") > acumulado.count(")") or txt0.endswith(("-", ",", "y", "e", "de", "del"))
        previo = top
    return grupos

def plano(fila):
    return re.sub(r"\W+", "", " ".join(fila)).lower()

def ficha(pdf, ed, n, titulo, inicio, fin, cab, filas):
    impresa = None
    pie = [w["text"] for w in pdf.pages[inicio].extract_words(x_tolerance=1.5) if w["top"] > pdf.pages[inicio].height - 60 and w["text"].isdigit()]
    if pie:
        impresa = int(pie[-1])
    return {"edicion": ed["id"], "lengua": ed["lang"], "n": n, "titulo": titulo,
            "paginaPdf": inicio + 1, "paginasPdf": [inicio + 1, fin + 1], "paginaImpresa": impresa,
            "pdf": f"{ed['pdf']}#page={inicio + 1}", "columnas": cab, "filas": filas}

def bloque_final(ys, hasta):
    """Filetes contiguos que terminan justo antes de «hasta»."""
    b = [y for y in ys if y < hasta]
    if not b:
        return []
    out = [b[-1]]
    for y in reversed(b[:-1]):
        if out[0] - y > 90:
            break
        out.insert(0, y)
    return out

def hacia_atras(pdf, i, top, lang):
    ys, _, _ = filetes(pdf.pages[i])
    blq = bloque_final(ys, top)
    if len(blq) < 2:
        return None
    inicio, y0 = i, blq[0]
    while y0 < 110 and inicio > 0:          # la tabla viene de la página anterior
        ysp, _, _ = filetes(pdf.pages[inicio - 1])
        b = bloque_final(ysp, pdf.pages[inicio - 1].height - 50)
        if not b or b[-1] < pdf.pages[inicio - 1].height - 160:
            break
        inicio, y0 = inicio - 1, b[0]
    hasta = lambda k: (top if k == i else pdf.pages[k].height - 50)
    r = extraer(pdf, inicio, y0 - 0.5, hasta(inicio), lang)
    if not r:
        return None
    cab, filas, (bordes, bx0), _ = r
    for k in range(inicio + 1, i + 1):
        r2 = extraer(pdf, k, 45, hasta(k), lang, bordes=bordes, cab_ref=cab, bordes_x0=bx0)
        if r2:
            filas += r2[1]
    return cab, filas, inicio

def construir(ed):
    pdf = pdfplumber.open(ROOT / ed["pdf"])
    cap = re.compile(ed["cap"])
    leyendas = []   # (página, top, bottom, n, título)
    for i, p in enumerate(pdf.pages):
        if i < 15:
            continue
        for l in p.extract_text_lines(x_tolerance=1.5):
            t = l["text"].strip()
            m = cap.match(t)
            if m and not TOC.search(t):
                leyendas.append((i, l["top"], l["bottom"], int(m.group(1)), m.group(2).strip()))
    vistas, tablas = set(), []
    def tope(i, desde):
        return min([t for (j, t, _, _, _) in leyendas if j == i and t > desde] + [pdf.pages[i].height - 50])
    for (i, top, bot, n, titulo) in leyendas:
        if n in vistas:
            continue
        ys_i, _, _ = filetes(pdf.pages[i])
        debajo = [y for y in ys_i if y > bot]
        encima = [y for y in ys_i if y < top]
        previa = None
        if not encima and not (debajo and debajo[0] - bot < 45) and top < 160 and i > 0:
            ysp, _, _ = filetes(pdf.pages[i - 1])
            if ysp and ysp[-1] > pdf.pages[i - 1].height - 160:
                previa = i - 1
        if previa is not None or (not (debajo and debajo[0] - bot < 45) and encima and top - encima[-1] < 45):
            # Leyenda al pie: la tabla termina justo encima (y puede venir de páginas anteriores).
            r = hacia_atras(pdf, i, top, ed["lang"]) if previa is None else hacia_atras(pdf, previa, pdf.pages[previa].height - 50, ed["lang"])
            if r:
                cab, filas, inicio = r
                vistas.add(n)
                tablas.append(ficha(pdf, ed, n, titulo, inicio, i, cab, filas))
                print(ed["id"], n, len(cab), "col", len(filas), "filas", "p.", inicio + 1, "-", i + 1, "(leyenda al pie)", file=sys.stderr)
                continue
        pag, desde = i, bot
        r = extraer(pdf, pag, desde, tope(pag, desde), ed["lang"])
        if not r and pag + 1 < len(pdf.pages):          # la tabla empieza en la página siguiente
            pag, desde = i + 1, 45
            r = extraer(pdf, pag, desde, tope(pag, desde), ed["lang"])
        if not r:
            print(ed["id"], n, "SIN TABLA", file=sys.stderr)
            continue
        cab, filas, (bordes, bx0), ultimo = r
        inicio, fin = pag, pag
        while ultimo > pdf.pages[fin].height - 140 and fin + 1 < len(pdf.pages):
            q = fin + 1
            ys, _, _ = filetes(pdf.pages[q])
            if not ys or ys[0] > 110:
                break
            if any(j == q and t < ys[0] for (j, t, _, _, _) in leyendas):
                break
            r2 = extraer(pdf, q, 45, tope(q, 45), ed["lang"], bordes=bordes, cab_ref=cab, bordes_x0=bx0)
            if not r2 or not r2[1]:
                break
            filas += r2[1]
            ultimo, fin = r2[3], q
        vistas.add(n)
        tablas.append(ficha(pdf, ed, n, titulo, inicio, fin, cab, filas))
        print(ed["id"], n, len(cab), "col", len(filas), "filas", "p.", inicio + 1, "-", fin + 1, file=sys.stderr)
    return sorted(tablas, key=lambda t: t["n"])

def main():
    solo = sys.argv[1:] or [e["id"] for e in EDS]
    out = ROOT / "data/tablas-libros.json"
    previo = json.loads(out.read_text()) if out.exists() else {"tablas": []}
    tablas = [t for t in previo.get("tablas", []) if t["edicion"] not in solo]
    fuentes = {}
    for ed in EDS:
        h = hashlib.sha256((ROOT / ed["pdf"]).read_bytes()).hexdigest()
        fuentes[ed["id"]] = {"titulo": ed["titulo"], "pdf": ed["pdf"], "sha256": h, "lengua": ed["lang"]}
        if ed["id"] in solo:
            tablas += construir(ed)
    orden = {"V514": 0, "V554": 1, "V297": 2}
    tablas.sort(key=lambda t: (orden[t["edicion"]], t["n"]))
    out.write_text(json.dumps({
        "schema": "vitruvius-tablas-libros-v1",
        "autor": "Diego A. Kurilo",
        "metodo": "Extracción automática desde los PDF publicados: filas por filetes horizontales, columnas por el encabezado; palabras cortadas por el ancho de columna reunidas sólo si la unión está atestiguada. Sin corrección editorial; ante duda, la página del PDF manda.",
        "fuentes": fuentes, "tablas": tablas}, ensure_ascii=False, indent=1))
    print(len(tablas), "tablas", file=sys.stderr)

if __name__ == "__main__":
    main()
