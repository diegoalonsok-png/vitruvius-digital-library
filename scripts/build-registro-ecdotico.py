# -*- coding: utf-8 -*-
"""Índice del Registro ecdótico: todo el aparato del autor buscable por locus.

Reúne, sin reescribir nada, cuatro fuentes y declara el tipo y la procedencia
de cada registro:

  decision   collatio codicum del Apéndice T (V514/V554): lema adoptado y
             lectura de los testimonios, con grado de comprobación
             (data/apparatus/collatio-validada.json).
  glosa      comentario lematizado (lema ] explicación) de V514, V554 y V297,
             anclado al locus por el lema (data/apparatus/aparato-autoral.json).
  nota       notas al pie de los DOCX de las tres ediciones
             (data/critical-notes.json), con locus explícito o candidato.
  lectura-h  lecturas de H sobre la imagen que difieren de V514: cotejos de
             folios leídos (data/codex-h/lecturas/) y observaciones puntuales
             (data/codex-h/observaciones-h.json). Siempre «a revisar».

Un locus que no existe en el repertorio canónico de 731 no se descarta en
silencio: el registro se conserva con locusEstado «no canónico».
"""
import json, os, re, glob, unicodedata

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
J = lambda p: json.load(open(R + p, encoding="utf-8"))
canon = J("data/academic-integrity.json").get("canonicalReferences", [])
CANON = set(canon)
ORDEN = {l: i for i, l in enumerate(canon)}
VERS = {"recensio-es": "V514", "recensio-fr": "V554", "theory-en": "V297"}
LENG = {"recensio-es": "es", "recensio-fr": "fr", "theory-en": "en"}

def plegar(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if not unicodedata.combining(c)).lower().replace("j", "i").replace("v", "u")

def estado_locus(l, base):
    if not l:
        return "sin locus"
    return base if l in CANON else "no canónico"

out = []

# 1. Decisiones de la collatio
GR = {"doble-fuente": "comprobada en V514 y V554", "fuente-unica": "una sola edición",
      "transcripcion-por-comprobar": "transcripción por comprobar", "orden-dudoso": "orden de folio dudoso",
      "conflicto-con-el-facsimil": "en conflicto con el facsímil", "aparato-en-prosa": "aparato en prosa"}
for e in J("data/apparatus/collatio-validada.json")["entradas"]:
    c = e.get("campos", {})
    lema = c.get("estaEdicion") or c.get("lecturaVisible") or ""
    test = {}
    if c.get("testigoH"): test["H"] = c["testigoH"]
    if c.get("krohn"): test["Krohn"] = c["krohn"]
    if c.get("vulgata"): test["vulgata"] = c["vulgata"]
    if c.get("testigo"): test["testimonio"] = c["testigo"]
    otros = [c[k] for k in ("lectura", "lectura2", "lectura3", "valoracion", "edicionCotejada", "col2", "col3", "col4", "estado") if c.get(k)]
    linea = (lema + " ] " + "; ".join(f"{v} {k}" if k in ("H", "Krohn") else v for k, v in test.items())) if lema and test else ""
    out.append({"id": e["id"], "tipo": "decision", "version": e.get("version"), "lengua": e.get("language"),
        "locus": e["locus"], "locusEstado": estado_locus(e["locus"], "explícito en el aparato"),
        "lema": lema, "aparato": linea, "testimonios": test, "texto": " · ".join(otros),
        "folios": e.get("folios", []), "sigla": sorted(set(e.get("siglaCitadas", []) + list(test))),
        "grado": e.get("grado"), "gradoRotulo": GR.get(e.get("grado"), e.get("grado")),
        "pagina": e.get("page"), "pdf": e.get("pdf")})

# 2. Glosas
AG = {"verificado-por-lema": "locus por el lema", "verificado-por-lema-y-pagina": "locus por lema y página",
      "verificado-por-lema-y-seccion": "locus por lema y sección", "lema-en-varios-loci": "lema en varios loci",
      "sin-anclaje": "sin locus"}
for g in J("data/apparatus/aparato-autoral.json")["glosas"]:
    l = g.get("locus")
    out.append({"id": g["id"], "tipo": "glosa", "version": g.get("version"), "lengua": g.get("language"),
        "locus": l, "locusEstado": estado_locus(l, AG.get(g.get("grado"), "")),
        "lociPosibles": g.get("lociPosibles", []), "lema": g.get("lemma", ""),
        "aparato": (g.get("lemma", "") + " ] " + g.get("glosa", "")) if g.get("lemma") else "",
        "texto": g.get("glosa", ""), "sigla": sorted({(a.get("siglum") or a.get("nombre") or "") if isinstance(a, dict) else str(a) for a in g.get("autoridades", [])} - {""}), "grado": g.get("grado"),
        "gradoRotulo": AG.get(g.get("grado"), g.get("grado")), "pagina": g.get("page"), "pdf": g.get("pdf")})

# 3. Notas al pie
for n in J("data/critical-notes.json")["entries"]:
    l = n.get("locus") or n.get("candidate_locus")
    base = "locus explícito en la nota" if n.get("locus") else "locus candidato, sin cotejar"
    out.append({"id": f"{VERS.get(n['edition'], n['edition'])}-nota-{n.get('footnote_id')}", "tipo": "nota",
        "version": VERS.get(n["edition"]), "lengua": LENG.get(n["edition"]),
        "locus": l, "locusEstado": estado_locus(l, base), "lema": "", "aparato": "",
        "texto": n.get("text", ""), "contexto": (n.get("anchor") or "")[:420],
        "nota": n.get("footnote_id"), "parrafo": n.get("source_paragraph"),
        "grado": "explicito" if n.get("locus") else ("candidato" if n.get("candidate_locus") else "sin-locus"),
        "gradoRotulo": base if l else "sin locus", "pagina": None, "pdf": None})

# 4. Lecturas de H
for f in sorted(glob.glob(R + "data/codex-h/lecturas/*.json")):
    if f.endswith("index.json"):
        continue
    d = json.load(open(f, encoding="utf-8"))
    for i, x in enumerate(d.get("lecturasARevisar", [])):
        if x.get("op") == "omitido en H" and not x.get("V514"):
            continue
        h, v = x.get("H") or "", x.get("V514") or ""
        ap = (f"{v} ] {h} H" if h else f"{v} ] om. H") if v else f"{h} add. H"
        out.append({"id": f"H-{d['folio']}-{i}", "tipo": "lectura-h", "version": "H", "lengua": "la",
            "locus": x.get("locus"), "locusEstado": estado_locus(x.get("locus"), "por cotejo con V514"),
            "lema": v, "aparato": ap, "testimonios": {"H": h or "om."}, "texto": d.get("aviso", ""),
            "folios": [d["folio"]], "sigla": ["H"], "grado": "a-revisar",
            "gradoRotulo": "lectura del facsímil, a revisar", "pagina": None, "pdf": None,
            "imagen": d.get("digital_image")})
for o in J("data/codex-h/observaciones-h.json")["observaciones"]:
    out.append({"id": o["id"], "tipo": "lectura-h", "version": "H", "lengua": "la", "locus": o["locus"],
        "locusEstado": estado_locus(o["locus"], "por cotejo con V514"), "lema": o["V514"],
        "aparato": o["aparato"], "testimonios": {"H": o["H"]}, "texto": o["detalle"],
        "folios": [o["folio"]], "sigla": ["H"], "grado": "a-revisar",
        "gradoRotulo": "lectura del facsímil, " + o["estado"], "pagina": None, "pdf": None,
        "imagen": o.get("imagen"), "renglon": o.get("renglon")})

for r in out:
    r["libro"] = int(r["locus"].split(".")[0]) if r.get("locus") and re.match(r"^\d+\.", r["locus"]) else None
    r["orden"] = ORDEN.get(r.get("locus"), 10**6)
    r.pop("q", None)  # el plegado se hace en el navegador: no se duplica el texto
    _ = plegar(" ".join(str(r.get(k) or "") for k in ("lema", "aparato", "texto", "contexto", "locus", "id"))
                    + " " + " ".join(r.get("sigla") or []) + " " + " ".join(str(v) for v in (r.get("testimonios") or {}).values()))
out.sort(key=lambda r: (r["orden"], ["decision", "lectura-h", "glosa", "nota"].index(r["tipo"]), r["id"]))

from collections import Counter
doc = {"schema": "registro-ecdotico/1",
       "fuentes": ["data/apparatus/collatio-validada.json", "data/apparatus/aparato-autoral.json",
                   "data/critical-notes.json", "data/codex-h/lecturas/", "data/codex-h/observaciones-h.json"],
       "metodo": __doc__.strip(),
       "recuentos": {"total": len(out), "porTipo": dict(Counter(r["tipo"] for r in out)),
                     "conLocusCanonico": sum(1 for r in out if r.get("locus") in CANON),
                     "lociConRegistros": len({r["locus"] for r in out if r.get("locus") in CANON})},
       "registros": out}
json.dump(doc, open(R + "data/index/registro-ecdotico.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps(doc["recuentos"], ensure_ascii=False))
print("tamaño:", os.path.getsize(R + "data/index/registro-ecdotico.json") // 1024, "KB")
