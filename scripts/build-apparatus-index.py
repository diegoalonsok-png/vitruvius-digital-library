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


def fold(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()


def category(label):
    v = fold(label)
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
            heads = list(HEAD.finditer(text))
            for i, m in enumerate(heads):
                end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
                snippet = text[m.start():min(end, m.start() + 2400)].strip()
                if len(snippet) < 60:
                    continue
                label = (m.group(1) or m.group(2)).strip()
                lead = LEAD_LOCUS.match(text[m.end():m.end() + 40])
                mention = lead or LOCUS.search(snippet[:200])
                # Loci impresos en la misma página o en la anterior (el aparato suele cerrar la página).
                ctx = by_page.get(num) or by_page.get(num - 1) or []
                n_block += 1
                out.append({
                    "id": f"{ver}-p{num}-{i+1}",
                    "source": "bloque",
                    "edition": ed, "version": ver, "language": lang,
                    "kind": category(label), "label": label,
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
    doc = {
        "schema": "vitruvius-apparatus-index/1",
        "generated": datetime.date.today().isoformat(),
        "method": "Bloques del aparato localizados por encabezado en el texto de los PDF y notas DOCX del autor. "
                  "El vínculo con el locus es el de la página impresa; no equivale a una collatio verificada.",
        "editions": [{"id": e[0], "version": e[1], "language": e[2], "pdf": e[3]} for e in ED],
        "counts": {"bloques": sum(1 for x in out if x["source"] == "bloque"), "notas": sum(1 for x in out if x["source"] == "nota")},
        "entries": out,
    }
    (ROOT / "data/apparatus-index.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(doc["counts"])


if __name__ == "__main__":
    main()
