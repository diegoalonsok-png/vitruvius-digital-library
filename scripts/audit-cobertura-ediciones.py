#!/usr/bin/env python3
"""¿Qué parte de las ediciones impresas es consultable desde el sitio?

Las ediciones no se reparten sólo entre texto latino y aparato. Hay una tercera
masa, de prosa analítica —introducción, estudios, excursus, status quaestionis—
que no es aparato ni traducción y que hasta ahora no entraba en ningún índice.
Esta auditoría clasifica cada página de las tres ediciones y dice qué está
publicado, qué no, y qué queda por decidir.

Uso: python3 scripts/audit-cobertura-ediciones.py
"""
import json, re, pathlib, datetime, collections, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
ED = [("recensio-es", "V514", "es"), ("recensio-fr", "V554", "fr"), ("theory-en", "V297", "en")]
# Rangos de los apéndices que son índices o tablas, no prosa que convenga indexar.
INDICES = re.compile(r"index\s+(?:analítico|analytique|analytical|locorum|nominum|verborum|rerum)"
                     r"|índice\s+analítico|conspectus\s+rerum|table\s+des|tabla\s+de", re.I)


def fold(s):
    t = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in t if not unicodedata.combining(c)).lower()


def main():
    idx = json.loads((ROOT / "data/apparatus-index.json").read_text(encoding="utf8"))
    col = json.loads((ROOT / "data/apparatus/collatio-validada.json").read_text(encoding="utf8"))
    paginas_aparato = collections.defaultdict(set)
    for e in idx["entries"]:
        if e.get("page"):
            paginas_aparato[e["edition"]].add(e["page"])
    paginas_collatio = collections.defaultdict(set)
    for e in col["entradas"]:
        paginas_collatio[e["edition"]].add(e["page"])

    informe = {"schema": "vitruvius-cobertura-ediciones/1",
               "generated": datetime.date.today().isoformat(),
               "metodo": ("Cada página de cada edición se clasifica por su contenido: texto latino y "
                          "traducción según los pasajes estructurados, aparato según el índice del "
                          "aparato y la collatio, y el resto por su volumen de texto. La clase "
                          "«prosa analítica» reúne lo que no es texto, traducción ni aparato: "
                          "introducción, estudios y excursus."),
               "ediciones": []}

    for ed, ver, lang in ED:
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        latin_p, trad_p = set(), set()
        for p in st.get("passages", []):
            pp = p.get("pdf_pages") or {}
            if isinstance(pp.get("latin"), int):
                latin_p.add(pp["latin"])
            if isinstance(pp.get("translation"), int):
                trad_p.add(pp["translation"])
        raw = json.loads((ROOT / f"data/{ed}-pages.json").read_text(encoding="utf8"))
        pages = {p["page"]: p.get("text") or "" for p in (raw if isinstance(raw, list) else raw.get("pages", []))
                 if isinstance(p.get("page"), int)}
        total = len(pages)
        clase = {}
        for n, t in pages.items():
            largo = len(t.strip())
            if n in paginas_collatio[ed]:
                clase[n] = "collatio del Apéndice T"
            elif n in paginas_aparato[ed]:
                clase[n] = "aparato y comentario"
            elif n in latin_p and n in trad_p:
                clase[n] = "texto latino y traducción"
            elif n in latin_p:
                clase[n] = "texto latino"
            elif n in trad_p:
                clase[n] = "traducción"
            elif largo < 120:
                clase[n] = "lámina o página casi vacía"
            elif n < 190:
                clase[n] = "preliminares"
            elif INDICES.search(t[:220]):
                clase[n] = "índices y tablas"
            elif largo >= 700:
                clase[n] = "prosa analítica sin indexar"
            else:
                clase[n] = "página breve sin clasificar"
        reparto = collections.Counter(clase.values())
        # páginas de prosa analítica, agrupadas en tramos contiguos
        sueltas = sorted(n for n, c in clase.items() if c == "prosa analítica sin indexar")
        tramos, ini, prev = [], None, None
        for n in sueltas:
            if ini is None:
                ini = prev = n
            elif n == prev + 1:
                prev = n
            else:
                tramos.append((ini, prev)); ini = prev = n
        if ini is not None:
            tramos.append((ini, prev))
        informe["ediciones"].append({
            "id": ed, "version": ver, "language": lang, "paginas": total,
            "reparto": dict(reparto.most_common()),
            "publicado": sum(v for k, v in reparto.items()
                             if k in ("collatio del Apéndice T", "aparato y comentario",
                                      "texto latino y traducción", "texto latino", "traducción")),
            "prosaAnaliticaSinIndexar": {
                "paginas": len(sueltas),
                "tramos": [{"desde": a, "hasta": b, "paginas": b - a + 1} for a, b in tramos if b - a >= 2][:20],
            },
        })

    informe["resumen"] = {
        "paginasTotales": sum(e["paginas"] for e in informe["ediciones"]),
        "paginasPublicadas": sum(e["publicado"] for e in informe["ediciones"]),
        "prosaAnaliticaSinIndexar": sum(e["prosaAnaliticaSinIndexar"]["paginas"] for e in informe["ediciones"]),
        "collatioLeida": col["recuentos"]["entradasLeidas"],
        "collatioPublicada": col["recuentos"]["publicadas"],
        "collatioSinPublicar": col["recuentos"]["entradasLeidas"] - col["recuentos"]["publicadas"],
        "aparatoEnElIndice": idx["counts"],
    }
    out = ROOT / "reports/cobertura-ediciones.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(informe, ensure_ascii=False, indent=1) + "\n", encoding="utf8")

    print(f"→ {out.relative_to(ROOT)}\n")
    for e in informe["ediciones"]:
        print(f"{e['version']} · {e['paginas']} páginas · publicadas {e['publicado']} "
              f"({100*e['publicado']//e['paginas']} %)")
        for k, v in e["reparto"].items():
            print(f"     {v:5d}  {k}")
        pa = e["prosaAnaliticaSinIndexar"]
        if pa["tramos"]:
            print(f"     tramos mayores de prosa analítica: " +
                  ", ".join(f"pp. {t['desde']}–{t['hasta']}" for t in pa["tramos"][:6]))
        print()
    r = informe["resumen"]
    print(f"TOTAL · {r['paginasTotales']} páginas en las tres ediciones")
    print(f"   publicadas o consultables: {r['paginasPublicadas']}")
    print(f"   prosa analítica sin indexar: {r['prosaAnaliticaSinIndexar']}")
    print(f"   collatio: {r['collatioPublicada']} publicadas de {r['collatioLeida']} leídas "
          f"· sin publicar: {r['collatioSinPublicar']}")
    print(f"   aparato en el índice: {r['aparatoEnElIndice']}")


if __name__ == "__main__":
    main()
