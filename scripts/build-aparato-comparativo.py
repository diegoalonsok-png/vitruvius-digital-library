#!/usr/bin/env python3
"""Aparato crítico comparativo: H, G, E, S y la consensio codicum en cada locus.

Reúne, sin añadir lecturas propias:
  · las decisiones del aparato de V514 (data/index/registro-ecdotico.json);
  · las entradas del aparato de Rose (1899) y de Krohn (1912) de la página donde está el locus
    (data/collation-loci.json), tomadas del OCR (data/text/*.json) y filtradas por las palabras
    del pasaje;
  · los sigla de cada entrada, para contar con qué frecuencia concuerdan los testimonios.

Las entradas de Rose y Krohn proceden del OCR: deben comprobarse en la página impresa, a la que
se enlaza. Una concordancia entre sigla dentro de una entrada no es por sí sola una prueba
estemática; es el material con el que se discute un stemma.

Uso: python3 scripts/build-aparato-comparativo.py
"""
import json, re, unicodedata, itertools, os
from collections import Counter, defaultdict

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/"
J = lambda p: json.load(open(R + p, encoding="utf-8"))
SIGLA = ["H", "G", "E", "S", "x"]          # x = consensus codicum en Rose y Krohn
ROSE_PDF = "https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf"
KROHN_PDF = "documents/krohn-1912.pdf"

def fold(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return s.replace("v", "u").replace("j", "i")

def palabras(s):
    return set(w for w in re.findall(r"[a-z]{3,}", fold(s)))

# ---------- aparatos de la página impresa ----------
def entradas_rose(texto):
    """Rose separa las entradas con «||»; la primera sigue al cuerpo del texto."""
    t = re.sub(r"\s+", " ", texto)
    if "||" not in t:
        return []
    partes = t.split("||")
    m = list(re.finditer(r"(?:^|\s)(1|2|3)\s+[A-Za-z(]", partes[0]))
    partes[0] = partes[0][m[-1].start():] if m else ""
    out = []
    for p in partes:
        for sub in re.split(r"\s\|\s", p):          # «|» separa entradas de la misma línea
            sub = sub.strip(" |")
            mm = re.match(r"(\d{1,2})\s+(.*)", sub)
            if mm and len(mm.group(2)) > 2:
                out.append((int(mm.group(1)), mm.group(2).strip()))
            elif out and sub:
                out.append((out[-1][0], sub))
    return out

def entradas_krohn(texto):
    """Krohn pone el aparato al pie, con entradas separadas por blancos amplios."""
    lineas = texto.split("\n")
    ini = None
    for i, l in enumerate(lineas):
        if re.match(r"^\s*\d{1,2}\s+\S.*\s{3,}\d{1,2}\s+\S", l) or (re.match(r"^\s{4,}\d{1,2}\s+\S", l) and re.search(r"\b[HGESx]\b", l)):
            ini = i
            break
    if ini is None:
        return []
    bloque = " ".join(lineas[ini:])
    out = []
    for m in re.finditer(r"(\d{1,2}(?:\s*[—-]\s*\d{1,2})?)\s+(.+?)(?=\s{3,}\d{1,2}\s|\Z)", bloque):
        e = re.sub(r"\s+", " ", m.group(2)).strip()
        if len(e) > 2:
            out.append((int(re.match(r"\d+", m.group(1)).group()), e))
    return out

def sigla_de(e):
    return sorted({s for s in SIGLA if re.search(r"(?<![A-Za-z])" + s + r"(?![a-z])", e)} )

def grupos(e):
    """Divide «lema: lectura1 H, lectura2 G» en grupos de sigla que comparten lectura."""
    cuerpo = e.split(":", 1)[1] if ":" in e else e
    gs = []
    for trozo in re.split(r"[,;]", cuerpo):
        s = sigla_de(trozo)
        if s:
            gs.append(s)
    return gs

pag = defaultdict(list)
for wid, fun in (("rose-1899", entradas_rose), ("krohn-1912", entradas_krohn)):
    for p in J(f"data/text/{wid}.json"):
        pag[(wid, p.get("page"))] = fun(p.get("text") or "")

# ---------- loci ----------
loci = J("data/collation-loci.json")["loci"]
latin = {p["locus"]: p["latin"] for p in J("data/structured/recensio-es.json")["passages"]}
orden = list(latin)
reg = defaultdict(list)
for x in J("data/index/registro-ecdotico.json")["registros"]:
    if x["tipo"] == "decision":
        reg[x["locus"]].append({"lema": x.get("lema", ""), "aparato": x.get("aparato", ""),
                                "testimonios": x.get("testimonios", {}), "sigla": x.get("sigla", []),
                                "grado": x.get("gradoRotulo") or x.get("grado"), "pagina": x.get("pagina")})

# Cada entrada del aparato se asigna a un solo locus: el de la página con mayor coincidencia léxica.
pw_de = {L: palabras(latin[L]) for L in orden}
asignacion = defaultdict(list)   # (wid, locus) -> entradas
for wid in ("rose-1899", "krohn-1912"):
    por_pagina = defaultdict(list)
    for L in orden:
        info = loci.get(L, {}).get(wid)
        if info:
            for pg in [info["page"]] + ([info["pageEnd"]] if info.get("pageEnd") else []):
                por_pagina[pg].append(L)
    for pg, cands in por_pagina.items():
        for linea, e in pag.get((wid, pg), []):
            lema = re.sub(r"\([^)]*\)|\{[^}]*\)|\b(?:Kr|Bo|Ro|om|add|codd|cf)\b", " ", e.split(":", 1)[0] if ":" in e else " ".join(e.split()[:2]))
            lw = palabras(lema)
            rw = {w for w in palabras(e.split(":", 1)[1] if ":" in e else "") if len(w) >= 5}
            mejor, punt = None, 0
            for L in cands:
                pw = pw_de[L]
                sc = (len(lw & pw) / len(lw) if lw else 0) + 0.25 * min(2, len(rw & pw)) + (0.05 if loci[L][wid]["page"] == pg else 0)
                if sc > punt:
                    mejor, punt = L, sc
            if mejor and punt >= 0.3:
                asignacion[(wid, mejor)].append({"pagina": pg, "linea": linea, "texto": e, "sigla": sigla_de(e), "grupos": grupos(e)})

out, acuerdo, citas = [], Counter(), Counter()
for L in orden:
    vistos, dec = set(), []
    for d in reg.get(L, []):
        k = (d["lema"], d["aparato"], d["grado"])
        if (d["lema"] or d["aparato"]) and k not in vistos:
            vistos.add(k); dec.append(d)
    fila = {"locus": L, "v514": dec, "v514SinLema": sum(1 for d in reg.get(L, []) if not (d["lema"] or d["aparato"]))}
    for wid, pdf in (("rose-1899", ROSE_PDF), ("krohn-1912", KROHN_PDF)):
        info = loci.get(L, {}).get(wid)
        if not info:
            continue
        ents = sorted(asignacion.get((wid, L), []), key=lambda x: (x["pagina"], x["linea"]))
        fila[wid] = {"pagina": info["page"], "grado": info.get("score"), "pdf": f"{pdf}#page={info['page']}", "entradas": ents}
        for en in ents:
            for s in en["sigla"]:
                citas[(wid, s)] += 1
            for g in en["grupos"]:
                for a2, b2 in itertools.combinations(sorted(set(g) - {"x"}), 2):
                    acuerdo[(wid, a2, b2)] += 1
    n = len(fila.get("rose-1899", {}).get("entradas", [])) + len(fila.get("krohn-1912", {}).get("entradas", []))
    if n or fila["v514"]:
        fila["testigos"] = sorted({s for k in ("rose-1899", "krohn-1912") for en in fila.get(k, {}).get("entradas", []) for s in en["sigla"]}
                                  | {s for d in fila["v514"] for s in d["sigla"] if s in ("H", "G", "E", "S")})
        out.append(fila)

res = {
    "schema": "vdl-aparato-comparativo-1",
    "fecha": "2026-11-12",
    "metodo": __doc__.strip(),
    "testimonios": {
        "H": "London, British Library, Harley MS 2767 (s. IX¹; leído folio a folio en este sitio)",
        "G": "Wolfenbüttel, Herzog August Bibliothek, Cod. Guelf. 69 Gud. lat. (s. XI)",
        "E": "Wolfenbüttel, Herzog August Bibliothek, Cod. Guelf. 132 Gud. lat. (s. X)",
        "S": "Sélestat, Bibliothèque humaniste, Ms 17 (s. X)",
        "x": "consensus codicum en el aparato de Rose y de Krohn",
    },
    "facsimiles": {
        "H": "codex-h-folios-local.html",
        "E": "https://diglib.hab.de/?db=mss&list=ms&id=132-gud-lat",
        "G": "https://diglib.hab.de/?db=mss&list=ms&id=69-gud-lat",
        "S": "https://bhnumerique.ville-selestat.fr/",
    },
    "recuentos": {
        "lociConMaterial": len(out),
        "lociConDecisionV514": sum(1 for f in out if f["v514"] or f["v514SinLema"]),
        "entradasRose": sum(len(f.get("rose-1899", {}).get("entradas", [])) for f in out),
        "entradasKrohn": sum(len(f.get("krohn-1912", {}).get("entradas", [])) for f in out),
        "citas": {f"{w}:{s}": n for (w, s), n in sorted(citas.items())},
        "concordancias": {f"{w}:{a}+{b}": n for (w, a, b), n in sorted(acuerdo.items(), key=lambda kv: -kv[1])},
    },
    "loci": out,
}
json.dump(res, open(R + "data/apparatus/aparato-comparativo.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps(res["recuentos"], ensure_ascii=False, indent=1)[:1500])
