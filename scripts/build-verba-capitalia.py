# -*- coding: utf-8 -*-
"""Voces capitales de De architectura, derivadas de dos fuentes del propio autor:

  1. el glosario de sus ediciones (data/lexicon/lexicon-auctoris.json), que fija
     qué términos considera dignos de entrada, y
  2. el latín editorial de V514 (data/structured/recensio-es.json), que fija
     cuáles están de hecho atestiguados y con qué reparto por libro.

No se lematiza: se cuentan las formas que comparten raíz con el lema, con la
plegadura filológica habitual (i/j, u/v, sin diacríticos). El recuento se
declara como «formas de la misma raíz», no como lemas, porque una raíz corta
puede recoger parientes morfológicos (decor- recoge decorare). Por eso se exige
además que el término sea nombre común: se descarta todo lema que no aparezca
nunca en minúscula en el latín, que es el filtro que separa Symmetria de Caesar.
"""
import json, re, unicodedata
from collections import defaultdict

import os
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"

def plegar(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().replace("j", "i").replace("v", "u")

# Terminaciones que se le quitan al lema para obtener una raíz consultable.
SUFIJOS = ("ationis","ationem","ation","ibus","orum","arum","ium","us","um","is","es","ae","a","e","i","o","s")

def raiz(lema):
    p = plegar(lema)
    for suf in SUFIJOS:
        if len(p) - len(suf) >= 4 and p.endswith(suf):
            return p[: len(p) - len(suf)]
    return p

lex = json.load(open(RAIZ + "data/lexicon/lexicon-auctoris.json"))
txt = json.load(open(RAIZ + "data/structured/recensio-es.json"))
pasajes = txt.get("passages", [])

# Vocabulario del texto: forma plegada -> ¿aparece alguna vez en minúscula?
minuscula = defaultdict(bool)
for p in pasajes:
    for bruto in re.findall(r"[A-Za-zÀ-ÿ]+", p.get("latin", "")):
        minuscula[plegar(bruto)] |= bruto[:1].islower()

salida = []
for e in lex.get("entradas", []):
    lema = e.get("lemma", "")
    # Sólo grafía latina: descarta BÉROSE, CALÍMACO y demás formas vernáculas.
    if not re.fullmatch(r"[A-Za-z]+", lema):
        continue
    if not e.get("atestiguadoEnElTextoLatino"):
        continue
    r = raiz(lema)
    if len(r) < 4:
        continue

    golpes, libros, loci = 0, set(), []
    comun = False
    for p in pasajes:
        n = 0
        for bruto in re.findall(r"[A-Za-zÀ-ÿ]+", p.get("latin", "")):
            if plegar(bruto).startswith(r):
                n += 1
                comun |= bruto[:1].islower()
        if n:
            golpes += n
            libros.add(p.get("book"))
            loci.append({"locus": p.get("locus"), "n": n})
    # Nombre común, no onomástico: debe atestiguarse en minúscula.
    if not comun or golpes < 3 or len(libros) < 2:
        continue

    defs = {}
    for d in e.get("definiciones", []):
        idi = d.get("idioma")
        if idi and idi not in defs:
            defs[idi] = {"texto": d.get("texto", ""), "pagina": d.get("pagina"),
                         "version": d.get("version"), "pdf": d.get("pdf")}
    loci.sort(key=lambda x: -x["n"])
    salida.append({
        "lemma": lema, "clave": plegar(lema), "raiz": r,
        "formas": golpes, "libros": sorted(x for x in libros if x),
        "graecum": e.get("graecum", []),
        "definiciones": defs,
        "lociPrincipales": loci[:40],
    })

# El glosario encabeza a veces con forma flexionada (RATIONIBUS, AQUARUM) y repite
# la misma raiz en dos entradas (DISPOSITIO / DISPOSITIONES). Se agrupa por raiz y se
# muestra el encabezamiento mas breve, conservando los demas como variantes: no se
# inventa un nominativo que el autor no escribio.
# Una raiz mas larga que empieza por otra mas corta es la misma voz
# (dispositi / disposition). Se exige que la diferencia sea morfologica
# (hasta cuatro letras) para no fundir pars con parsimonia.
por_raiz = {}
for v in sorted(salida, key=lambda x: len(x["raiz"])):
    destino = None
    for r in por_raiz:
        if v["raiz"].startswith(r) and len(v["raiz"]) - len(r) <= 4:
            destino = r
            break
    por_raiz.setdefault(destino or v["raiz"], []).append(v)
salida = []
for r, grupo in por_raiz.items():
    grupo.sort(key=lambda x: (len(x["lemma"]), x["lemma"]))
    jefe = dict(grupo[0])
    jefe["variantesDelGlosario"] = [g["lemma"] for g in grupo[1:]]
    # El recuento por raiz es comun a todo el grupo; se toma el mayor observado.
    jefe["formas"] = max(g["formas"] for g in grupo)
    libros = set()
    for g in grupo:
        libros.update(g["libros"])
    jefe["libros"] = sorted(libros)
    for g in grupo[1:]:
        for idi, d in g.get("definiciones", {}).items():
            jefe.setdefault("definiciones", {}).setdefault(idi, d)
    salida.append(jefe)

# Las seis partes que el tratado enumera en 1.2.1 se marcan como tales: es la
# taxonomia del propio Vitruvio, no una seleccion nuestra.
PARTES = {"ordinati", "dispositi", "eurythmi", "symmetri", "decor", "distributi"}
for v in salida:
    v["parsArchitecturae"] = v["raiz"] in PARTES

# Orden: las seis partes primero, despues el reparto por libros y la frecuencia.
salida.sort(key=lambda x: (not x["parsArchitecturae"], -len(x["libros"]), -x["formas"], x["clave"]))

doc = {
    "schema": "verba-capitalia/1",
    "fuente": {
        "glosario": "data/lexicon/lexicon-auctoris.json",
        "texto": "data/structured/recensio-es.json (latín editorial V514)",
    },
    "metodo": ("Lemas del glosario del autor atestiguados en el latín de V514. Se cuentan las "
               "formas que comparten raíz con el lema, con plegadura i/j y u/v; no es una "
               "lematización. Se exige atestiguación en minúscula (nombre común), al menos "
               "tres formas y presencia en dos libros o más."),
    "advertencia": ("El recuento es de formas de la misma raíz sobre el texto editorial V514, "
                    "no sobre el Codex H, y no equivale a un recuento de lemas."),
    "partesArchitecturae": ("Las seis voces marcadas parsArchitecturae son las que De architectura "
                            "1.2.1 enumera como partes del arte: ordinatio, dispositio, eurythmia, "
                            "symmetria, decor, distributio."),
    "recuentos": {"vocesCapitales": len(salida),
                  "entradasDelGlosario": len(lex.get("entradas", []))},
    "voces": salida,
}
import os
os.makedirs(RAIZ + "data/index", exist_ok=True)
with open(RAIZ + "data/index/verba-capitalia.json", "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=1)

print("voces capitales:", len(salida))
for v in salida[:18]:
    marca = "*" if v["parsArchitecturae"] else " "
    var = (" <- " + ", ".join(v["variantesDelGlosario"])) if v.get("variantesDelGlosario") else ""
    print(f" {marca}{v['lemma']:<15} formas={v['formas']:<5} libros={len(v['libros'])}{var}")

# ---------------------------------------------------------------------------
# Segunda pasada: ocurrencias en orden del texto y equivalentes de traducción.
#
# Para subrayar la voz también en la traducción hay que saber cómo la traduce
# el autor en cada edición. No se adivina: se mide. Para cada lengua se toma la
# raíz (seis letras plegadas) que más se concentra en los pasajes donde el latín
# trae la voz frente al resto del tratado, y sólo se acepta si aparece en la
# mitad o más de esos pasajes. Si ninguna cumple, no hay equivalente declarado.
# ---------------------------------------------------------------------------
import math
EDICIONES = {"es": "data/structured/recensio-es.json",
             "en": "data/structured/theory-en.json",
             "fr": "data/structured/recensio-fr.json"}
VACIAS = set("""que los las del por para con una uno como esta este estos estas sus
the and that which with this from they their them these those have been were
les des par pour une dans qui que est sont avec cette ces aux leur""".split())

def raices_traduccion(texto):
    out = set()
    for w in re.findall(r"[A-Za-zÀ-ÿ]+", texto or ""):
        p = plegar(w)
        if len(p) >= 5 and p not in VACIAS:
            out.add(p[:6])
    return out

trad = {}
for lang, ruta in EDICIONES.items():
    try:
        ps = json.load(open(RAIZ + ruta)).get("passages", [])
    except Exception:
        ps = []
    trad[lang] = {p["locus"]: raices_traduccion(p.get("translation", "")) for p in ps}

orden = [p["locus"] for p in pasajes]
for v in doc["voces"]:
    con = []
    for p in pasajes:
        n = sum(1 for b in re.findall(r"[A-Za-zÀ-ÿ]+", p.get("latin", "")) if plegar(b).startswith(v["raiz"]))
        if n:
            con.append({"locus": p["locus"], "n": n})
    v["ocurrencias"] = con
    v.pop("lociPrincipales", None)
    loci_con = {c["locus"] for c in con}
    v["equivalentes"] = {}
    for lang, mapa in trad.items():
        dentro = [mapa[l] for l in loci_con if l in mapa]
        fuera = [s for l, s in mapa.items() if l not in loci_con]
        if len(dentro) < 2:
            continue
        cuenta = {}
        for s in dentro:
            for r in s:
                cuenta[r] = cuenta.get(r, 0) + 1
        # Emparentada con el latín (decor > decorum, ordinatio > order): basta
        # con que se concentre en esos pasajes. Traducción no emparentada
        # (conmensurabilidad, propriety): ha de ser muy específica o constante.
        cand = []
        for r, c in cuenta.items():
            if c < 2:
                continue
            cobertura = c / len(dentro)
            base = (sum(1 for s in fuera if r in s) + 1) / (len(fuera) + 1)
            lift = cobertura / base
            pariente = r[:4] == v["raiz"][:4] or (r[:3] == v["raiz"][:3] and lift >= 15)
            # Una palabra emparentada con OTRA voz capital es de esa voz, no de ésta.
            ajena = any(r[:4] == o["raiz"][:4] for o in doc["voces"] if o is not v)
            pocos = len(dentro) < 8
            if ajena and not pariente:
                continue
            if (pariente and lift >= 5 and cobertura >= 0.2) or \
               (not pariente and not pocos and ((cobertura >= 0.5 and lift >= 8) or (lift >= 50 and cobertura >= 0.25))):
                cand.append((cobertura * math.log(lift), r, round(cobertura, 2)))
        cand.sort(reverse=True)
        if cand:
            v["equivalentes"][lang] = [{"raiz": r, "cobertura": c} for _, r, c in cand[:3]]

with open(RAIZ + "data/index/verba-capitalia.json", "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=1)
for v in doc["voces"][:10]:
    print(f"  {v['lemma']:<14} ocurrencias={len(v['ocurrencias']):<3} equivalentes={v['equivalentes']}")
