#!/usr/bin/env python3
"""Diccionario vitruviano redactado por el autor, consolidado desde sus tres ediciones.

El Apéndice A («Glosario») y el Apéndice R.5 («Glossarium Vitruvianum») de las
ediciones contienen entradas de la forma «ABACUS [ἄβαξ]. El ábaco: losa cuadrada
que corona el capitel…», con su equivalente griego y, a menudo, el locus. La
página lexicon-vitruvianum.html del sitio es una concordancia de FORMAS GRÁFICAS
del latín y declara que no incluye glosas redactadas, de modo que este material
no era consultable.

Aquí se agrupan las entradas por lema, se conservan las tres lenguas en paralelo
y se registra la página impresa de cada definición para poder verificarla.

Uso: python3 scripts/build-lexicon-auctoris.py
"""
import json, re, pathlib, datetime, collections, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
LANG = {"recensio-es": "es", "recensio-fr": "fr", "theory-en": "en"}


def fold(s):
    t = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in t if not unicodedata.combining(c)).lower().replace("j", "i").replace("v", "u")


def main():
    src = json.loads((ROOT / "data/apparatus/aparato-autoral.json").read_text(encoding="utf8"))
    por_lema = collections.defaultdict(lambda: {"definiciones": [], "graeca": set(), "loci": set()})
    for e in src.get("diccionario", []):
        key = fold(e["lemma"])
        reg = por_lema[key]
        reg.setdefault("lemma", e["lemma"])
        reg["definiciones"].append({
            "idioma": e.get("language") or LANG.get(e["edition"], ""),
            "version": e["version"], "pagina": e["page"], "pdf": e["pdf"],
            "texto": e["definicion"],
        })
        if e.get("graecum"):
            reg["graeca"].add(e["graecum"])
        for l in e.get("lociCitados") or []:
            reg["loci"].add(l)

    # El latín del propio texto editado permite marcar si el lema está atestiguado.
    vocab = set()
    for ed in LANG:
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        for p in st.get("passages", []):
            vocab.update(re.findall(r"[a-z]+", fold(p.get("latin", ""))))
    # Un lema de diccionario es un nominativo, y Vitruvio a menudo sólo usa los casos
    # oblicuos: «atrium» no aparece, pero sí «atriorum». Por eso se admite también la
    # coincidencia por raíz con una forma atestiguada, y la presencia en los léxicos
    # latinos del repositorio.
    raices = {w[:i] for w in vocab for i in range(4, len(w) + 1)}

    lexica = set()
    for rel, clave in (("data/latin-lexicon.json", None), ("data/classical-dictionary.json", "latin")):
        f = ROOT / rel
        if not f.exists():
            continue
        try:
            d = json.loads(f.read_text(encoding="utf8"))
        except ValueError:
            continue
        pool = d.get(clave) if clave else d
        if isinstance(pool, dict):
            lexica.update(fold(k) for k in pool)

    def es_lema_latino(key, griego):
        if griego or key in vocab or key in lexica:
            return True
        # raíz de al menos cuatro caracteres compartida con una forma atestiguada
        return any(key[:i] in raices for i in range(len(key), 3, -1))

    # El detector de versales recoge también el sujeto de un rótulo («NOTA — APOYOS»),
    # que no es un lema de diccionario. Se admite un lema sólo si está atestiguado en el
    # texto latino editado o si trae equivalente griego; el resto se aparta sin perderlo.
    entradas, apartados = [], []
    for key, reg in sorted(por_lema.items()):
        defs = sorted(reg["definiciones"], key=lambda d: (d["idioma"] != "es", d["idioma"] != "fr", d["pagina"]))
        destino = entradas if es_lema_latino(key, reg["graeca"]) else apartados
        destino.append({
            "lemma": reg["lemma"], "clave": key,
            "graecum": sorted(reg["graeca"]) or None,
            "atestiguadoEnElTextoLatino": key in vocab,
            "lociCitados": sorted(reg["loci"]),
            "idiomas": sorted({d["idioma"] for d in defs}),
            "definiciones": defs,
        })

    doc = {
        "schema": "vitruvius-lexicon-auctoris/1",
        "generated": datetime.date.today().isoformat(),
        "fuente": ("Glosario (Apéndice A) y Glossarium Vitruvianum (Apéndice R.5) de las ediciones de "
                   "Diego A. Kurilo: V514 castellano, V554 français, V297 English. Cada definición remite "
                   "a la página impresa donde puede verificarse."),
        "advertencia": ("Diccionario redactado por el autor de la edición, no una concordancia automática. "
                        "«atestiguadoEnElTextoLatino» indica sólo que la forma del lema aparece en el texto "
                        "latino editado; no es un juicio sobre la definición."),
        "recuentos": {
            "lemas": len(entradas),
            "apartadosPorNoSerLemaLatino": len(apartados),
            "conEquivalenteGriego": sum(1 for e in entradas if e["graecum"]),
            "conLocusCitado": sum(1 for e in entradas if e["lociCitados"]),
            "trilingues": sum(1 for e in entradas if len(e["idiomas"]) == 3),
            "atestiguados": sum(1 for e in entradas if e["atestiguadoEnElTextoLatino"]),
        },
        "entradas": entradas,
        "apartados": apartados,
    }
    out = ROOT / "data/lexicon/lexicon-auctoris.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1024:.0f} KB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")
    print("\n   apartados (muestra): " + ", ".join(e["lemma"] for e in apartados[:12]))
    print("\n   muestra:")
    for e in entradas[:8]:
        g = f" [{', '.join(e['graecum'])}]" if e["graecum"] else ""
        print(f"     {e['lemma']}{g} · {', '.join(e['idiomas'])} · {e['definiciones'][0]['texto'][:62]}…")


if __name__ == "__main__":
    main()
