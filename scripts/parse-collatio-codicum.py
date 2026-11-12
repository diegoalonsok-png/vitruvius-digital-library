#!/usr/bin/env python3
"""Lectura de las tablas del Apéndice T «Collatio codicum et editionum» de las ediciones Kurilo.

El Apéndice T ocupa 68 páginas en la recensio castellana (V514, pp. 1087–1155) y 66 en
la francesa (V554, pp. 1097–1163). Contiene tablas de colación con columnas de posición
fija: locus, lectura de esta edición, lectura del testigo, folio y valoración. El texto
se lee del PDF conservando la disposición (`pdftotext -layout`), de modo que las columnas
se recuperan por desplazamiento de caracteres y no por heurística de separadores.

Lo que este archivo registra es lo que el autor imprimió: locus, lemma, lectura del
testigo, folio y su valoración, con la página del PDF donde puede verificarse. Los
códigos de evidencia del propio aparato ([Hvid], [Gvid], [A], [Rep; B], [Ed; C]) se
conservan sin reinterpretarlos.

Uso: python3 scripts/parse-collatio-codicum.py [--cache DIR]
"""
import json, re, sys, pathlib, datetime, subprocess, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
ED = [("recensio-es", "V514", "es", "documents/kurilo-recensio-es.pdf", (1080, 1160)),
      ("recensio-fr", "V554", "fr", "documents/kurilo-recensio-fr.pdf", (1090, 1166)),
      ("theory-en",   "V297", "en", "documents/kurilo-theory-en.pdf",   (940, 1056))]

ROM = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10}
LOCUS_CELL = re.compile(r"^\s*((?:[IVX]{1,4}|\d{1,2})\s*\.\s*(?:praef\.?|pr[ée]f(?:ace)?\.?|Pr\.?|\d{1,2})"
                        r"(?:\s*\.\s*\d{1,3})?)\s*(?:[—–-]\s*(.*))?$", re.I)
FOLIO = re.compile(r"\b(\d{1,3}\s*[rv])\b")
EVID = re.compile(r"\[(?:H\s*vid|G\s*vid|E\s*vid|S\s*vid|A|B|C|Rep|Ed|Aut)(?:\s*;\s*[ABC])?\]", re.I)
SIGLA_CELL = re.compile(r"\b(H|G|E|S|Krohn|Rose|Bud[eé]|Callebat|Fleury|Gros|Soubiran|Granger|Marini|Vulg)\b")
# Palabras que identifican la cabecera de una tabla de colación.
HEAD_WORDS = ("locus",)
HEAD_HINTS = ("esta edición", "cette édition", "this edition", "hvid", "h ut vid", "folio",
              "krohn", "vulg", "testigo", "témoin", "witness", "lectura", "leçon", "reading",
              "decisión", "décision", "decision", "valoración", "appréciation", "assessment",
              "grado", "degré", "degree", "estado", "état", "status", "justificación",
              "justification", "problema", "problème")


def norm_locus(raw):
    raw = re.sub(r"\s+", "", str(raw or "")).replace(",", ".")
    m = re.match(r"^((?:[IVX]{1,4}|\d{1,2}))\.(praef\.?|pr[ée]f(?:ace)?\.?|pr\.?|\d{1,2})(?:\.(\d{1,3}))?$", raw, re.I)
    if not m:
        return None
    head = m.group(1).upper()
    book = ROM.get(head) if head in ROM else (int(head) if head.isdigit() else None)
    if not book or book > 10:
        return None
    cap = "praef" if re.match(r"^(praef|pr[ée]f|pr)", m.group(2), re.I) else str(int(m.group(2)))
    return f"{book}.{cap}.{int(m.group(3))}" if m.group(3) else f"{book}.{cap}"


def columns(line):
    """Desplazamientos donde empieza cada columna, por carreras de 2+ espacios."""
    cols, at = [], 0
    for m in re.finditer(r"\S+(?:\s\S+)*?(?=\s{2,}|$)", line):
        if m.group(0).strip():
            cols.append(m.start())
    return cols


def is_header(line):
    low = line.lower()
    if not any(w in low for w in HEAD_WORDS):
        return False
    return sum(1 for h in HEAD_HINTS if h in low) >= 1 and len(columns(line)) >= 3


def slice_row(line, cols):
    out = []
    for i, start in enumerate(cols):
        end = cols[i + 1] if i + 1 < len(cols) else len(line)
        out.append(line[start:end].strip())
    return out


def parse_page(text, page):
    """Filas de las tablas de una página, con la cabecera que las gobierna."""
    lines = text.split("\n")
    rows, header, cols, pending = [], None, None, None
    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            continue
        if is_header(line):
            if pending:
                rows.append(pending); pending = None
            cols = columns(line)
            header = slice_row(line, cols)
            continue
        if cols is None:
            continue
        cells = slice_row(line, cols)
        first = cells[0] if cells else ""
        m = LOCUS_CELL.match(first)
        if m and norm_locus(m.group(1)):
            if pending:
                rows.append(pending)
            pending = {"header": header, "page": page, "locus": norm_locus(m.group(1)),
                       "locusRaw": " ".join(m.group(1).split()),
                       "cells": [c for c in cells[1:]]}
            if m.group(2):
                pending["cells"] = [m.group(2).strip()] + pending["cells"][1:] if pending["cells"] else [m.group(2).strip()]
        elif pending:
            for i, c in enumerate(cells[1:]):
                if not c:
                    continue
                while len(pending["cells"]) <= i:
                    pending["cells"].append("")
                pending["cells"][i] = (pending["cells"][i] + " " + c).strip()
        # Una línea de continuación sin fila abierta se ignora: es prosa del anexo.
    if pending:
        rows.append(pending)
    return rows


def label_columns(header):
    """Nombra las celdas segun la cabecera impresa, sin forzar un esquema único."""
    names = []
    for h in (header or [])[1:]:
        low = (h or "").lower()
        if re.search(r"esta edici|cette [ée]dition|this edition|texto impreso|texte imprim|printed", low):
            names.append("estaEdicion")
        elif re.search(r"h\s*vid|h ut vid|^h$|h / folio|h/folio", low):
            names.append("testigoH")
        elif re.search(r"folio", low):
            names.append("folio")
        elif re.search(r"krohn", low):
            names.append("krohn")
        elif re.search(r"vulg", low):
            names.append("vulgata")
        elif re.search(r"lectura visible|le[çc]on visible|visible reading", low):
            names.append("lecturaVisible")
        elif re.search(r"callebat|bud[eé]|rose|fleury|gros|soubiran", low):
            names.append("edicionCotejada")
        elif re.search(r"valoraci|appr[ée]ciation|assessment|justificaci|justification|decisi|d[ée]cision", low):
            names.append("valoracion")
        elif re.search(r"grado|degr[ée]|degree", low):
            names.append("grado")
        elif re.search(r"estado|[ée]tat|status|acci[óo]n|action", low):
            names.append("estado")
        elif re.search(r"lectura|le[çc]on|reading|problema|probl[èe]me", low):
            names.append("lectura")
        elif re.search(r"testigo|t[ée]moin|witness", low):
            names.append("testigo")
        else:
            names.append("col%d" % (len(names) + 1))
    return names


def main():
    cache = pathlib.Path("/tmp/apcache")
    for i, a in enumerate(sys.argv):
        if a == "--cache" and i + 1 < len(sys.argv):
            cache = pathlib.Path(sys.argv[i + 1])
    cache.mkdir(parents=True, exist_ok=True)

    entries, tablas = [], collections.Counter()
    for ed, ver, lang, pdf, (lo, hi) in ED:
        txt = cache / f"{ed}.txt"
        if not txt.exists():
            subprocess.run(["pdftotext", "-layout", str(ROOT / pdf), str(txt)], check=True)
        pages = txt.read_text(encoding="utf8", errors="replace").split("\f")
        for idx, body in enumerate(pages):
            page = idx + 1
            if not (lo <= page <= hi):
                continue
            for row in parse_page(body, page):
                names = label_columns(row["header"])
                cell = {}
                for n, v in zip(names, row["cells"]):
                    if v:
                        cell[n] = re.sub(r"\s+", " ", v).strip()
                if not cell:
                    continue
                todo = " ".join(cell.values())
                folios = sorted({re.sub(r"\s+", "", f) for f in FOLIO.findall(cell.get("folio", "") or todo)})
                tablas[" · ".join(x for x in (row["header"] or []) if x)[:70]] += 1
                entries.append({
                    "id": f"{ver}-T-p{row['page']}-{len(entries)}",
                    "edition": ed, "version": ver, "language": lang,
                    "page": row["page"], "pdf": f"{pdf}#page={row['page']}",
                    "locus": row["locus"], "locusImpreso": row["locusRaw"],
                    "campos": cell,
                    "folios": folios,
                    "codigosDeEvidencia": sorted({re.sub(r"\s+", "", c) for c in EVID.findall(todo)}),
                    "siglaCitadas": sorted(set(SIGLA_CELL.findall(todo))),
                    "cabecera": [h for h in (row["header"] or []) if h],
                })

    canon = set()
    for ed, *_ in [(e[0],) for e in ED]:
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        canon.update(p["locus"] for p in st.get("passages", []))
    fuera = sorted({e["locus"] for e in entries if e["locus"] not in canon
                    and not any(e["locus"] + "." in c or c.startswith(e["locus"] + ".") for c in canon)})

    doc = {
        "schema": "vitruvius-collatio-codicum/1",
        "generated": datetime.date.today().isoformat(),
        "fuente": ("Apéndice T «Collatio codicum et editionum» de las ediciones de Diego A. Kurilo: "
                   "V514 (castellano, pp. 1087–1155) y V554 (français, pp. 1097–1163). Texto leído del PDF "
                   "conservando la disposición de columnas; cada entrada remite a la página impresa donde "
                   "puede verificarse."),
        "advertencia": ("Este archivo transcribe el aparato publicado por el autor. Los códigos de evidencia "
                        "([Hvid], [Gvid], [A], [Rep; B], [Ed; C]) son los del propio aparato y se conservan sin "
                        "reinterpretación. La transcripción es mecánica: una celda puede arrastrar texto de la "
                        "columna vecina y debe comprobarse contra la página citada antes de citarse como lectura."),
        "ediciones": [{"id": e[0], "version": e[1], "language": e[2], "pdf": e[3],
                       "paginasApendiceT": [e[4][0], e[4][1]]} for e in ED],
        "recuentos": {
            "entradas": len(entries),
            "lociDistintos": len({e["locus"] for e in entries}),
            "entradasConFolio": sum(1 for e in entries if e["folios"]),
            "foliosDistintos": len({f for e in entries for f in e["folios"]}),
            "conCodigoDeEvidencia": sum(1 for e in entries if e["codigosDeEvidencia"]),
            "lociFueraDelCanon": len(fuera),
        },
        "lociFueraDelCanon": fuera[:40],
        "tablasDetectadas": [{"cabecera": k, "filas": v} for k, v in tablas.most_common()],
        "entradas": entries,
    }
    out = ROOT / "data/apparatus/collatio-codicum.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1024:.0f} KB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")
    print("\n   tablas detectadas (cabecera · filas):")
    for t in doc["tablasDetectadas"][:14]:
        print(f"     {t['filas']:4d}  {t['cabecera']}")


if __name__ == "__main__":
    main()
