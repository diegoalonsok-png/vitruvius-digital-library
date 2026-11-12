#!/usr/bin/env python3
"""Onomasticon plenum: todos los nombres propios y las voces griegas del texto latino.

El onomasticon del sitio tiene 59 fichas redactadas. El texto latino de V514
contiene 679 nombres propios distintos y 237 formas griegas, de modo que el
repertorio cubría menos del 9 %. Esta ampliación no redacta biografías —eso es
trabajo del autor— sino que levanta el repertorio filológico que falta:

  · las formas efectivamente atestiguadas de cada nombre, agrupadas por raíz
  · el locus de cada aparición y el recuento
  · el aparato crítico que toca esos loci, si lo hay
  · el folio del códice H, si está mapeado
  · la entrada del glosario del autor, si existe

No se inventa un nominativo que el texto no traiga: el grupo se nombra por su
forma más frecuente y se declara como tal. La flexión latina se agrupa por raíz
común de cuatro caracteres o más, criterio conservador que mantiene separadas
las raíces distintas aunque deje algún grupo sin unir.

Uso: python3 scripts/build-onomasticon-plenum.py
"""
import json, re, pathlib, datetime, collections, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Mayúscula inicial que no abre oración: candidata a nombre propio.
PROPIO = re.compile(r'(?<![.!?:;»"”]\s)\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b')
GRIEGO = re.compile(r'[Ͱ-Ͽἀ-῿]{2,}(?:\s+[Ͱ-Ͽἀ-῿]{2,})?')
# Palabras que empiezan oración o período y no son nombres.
FUNCION = set("""At Cum Ita Itaque Namque Non Sed Si Quae Qui Quod Quoniam Ergo Haec Hic Hoc Nam Nunc
Sic Tunc Vero Autem Enim Igitur Item Nec Neque Ne Et Ex In De Ad Per Pro Cur Quemadmodum Etiam Tamen
Praeterea Deinde Primum Eo Ea Id Is Ipse Idem Ille Iste Omnis Multi Pauci Alter Alius Utrum Quare
Ab Aut Cuius Dum Ideo Inde Modo Postea Quam Quia Quibus Quo Quoque Sive Tum Ubi Unde Una Vel Verum
Nihil Nisi Nos Omnia Omnes Quot Satis Semper Sine Super Supra Totus Tres Uti Vix Atque Contra Circa
Sin His Sunt Fiunt Eadem Eodem Easdem Eidem Erunt Fuerit Fuerint Habent Habet Oportet Potest Possunt
Videtur Videntur Dicitur Dicuntur Fit Sit Sint Erat Erant Esset Essent Facit Faciunt Ponitur Ponuntur
Ita Item Itaque Namque Igitur Quare Quoniam Quidem Siquidem Nonnulli Nonnullae Plures Pluribus
Reliqua Reliquis Cetera Ceterae Harum Horum Hunc Hanc Quorum Quarum Cuius Cui Quibus Isdem
Ante Apud Cetera Ceteri Ceterum Dein Denique Eius Enimvero Erit Esse Est Haud Hinc Huius Iam Ibi
Idcirco Illa Illud Inter Intra Ipsa Ipsum Nam Postquam Potius Praesertim Prope Propter Quasi Quidem
Quoad Rursus Scilicet Secundum Seu Simul Statim Tandem Tantum Ultra Usque Velut Veluti""".split())


def fold(s):
    t = unicodedata.normalize("NFD", s or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t.lower().replace("j", "i").replace("v", "u")


def raiz(w):
    """Raíz conservadora: se quita una desinencia corriente, nunca más de una."""
    k = fold(w)
    for t in ("ibus", "orum", "arum", "erum", "ium", "ius", "is", "es", "em", "um", "os", "as", "ae", "e", "i", "o", "a", "us", "u"):
        if k.endswith(t) and len(k) - len(t) >= 4:
            return k[:len(k) - len(t)]
    return k


def ficha_de(formas):
    """Ficha redactada del autor, si alguna forma atestiguada la tiene.

    Se separa lo que está verificado de lo que no: la atestiguación textual
    (locus y formas en V514) está comprobada; la identificación prosopográfica
    es un resumen editorial sin autoridad externa citada, y se dice así en vez
    de rotular la ficha entera como pendiente.
    """
    global _FICHAS
    for f in formas:
        e = _FICHAS.get(fold(f))
        if not e:
            continue
        la = e.get("latin_attestation") or {}
        return {
            "id": e["id"], "nombre": e["name"], "clase": e.get("kind"),
            "periodo": e.get("period"), "resumen": e.get("summary"),
            "variantes": e.get("aliases") or [],
            "nombreGriego": e.get("greek_name"),
            "griegoEnV514": (e.get("greek_attestation") or {}).get("status") == "attested_in_v514",
            "atestiguacionTextual": {
                "verificada": bool(la.get("loci")),
                "fuente": la.get("source") or "V514 · texto latino editorial",
                "loci": la.get("loci") or e.get("loci") or [],
                "formas": e.get("latin_forms") or [],
                "estado": la.get("status"),
            },
            "autoridadProsopografica": {
                "citada": bool(e.get("source")),
                "fuente": e.get("source") or None,
                "etiqueta": e.get("sourceLabel") or None,
                "nota": ("Identificación con autoridad externa citada." if e.get("source")
                         else "Resumen editorial del autor; falta la autoridad externa que lo respalde "
                              "(repertorio prosopográfico o gacetero de lugares antiguos). La atestiguación "
                              "textual del nombre, en cambio, está verificada sobre los loci."),
            },
        }
    return None


_FICHAS = {}


def main():
    global _FICHAS
    st = json.loads((ROOT / "data/structured/recensio-es.json").read_text(encoding="utf8"))
    pasajes = {p["locus"]: p for p in st["passages"]}
    ono = json.loads((ROOT / "data/onomasticon-vitruvianum.json").read_text(encoding="utf8"))
    idx = json.loads((ROOT / "data/apparatus-index.json").read_text(encoding="utf8"))
    lex = json.loads((ROOT / "data/lexicon/lexicon-auctoris.json").read_text(encoding="utf8"))
    mapa = json.loads((ROOT / "data/codex-h/folio-locus-map.json").read_text(encoding="utf8"))

    # aparato por locus, con su texto plegado para poder preguntar si menciona un nombre
    aparato = collections.defaultdict(list)
    for e in idx["entries"]:
        reg = {"id": e["id"], "kind": e["kind"], "version": e["version"], "pdf": e.get("pdf"),
               "label": e.get("label"), "texto": e.get("text") or "", "_hay": fold(e.get("text") or "")}
        for l in ([e["locusMention"]] if e.get("locusMention") else []) + (e.get("loci") or []):
            if l:
                aparato[l].append(reg)
    folio_de = collections.defaultdict(list)
    for en in mapa["entries"]:
        for l in en.get("loci", []):
            folio_de[l["locus"]].append({"folio": en["folio"], "status": l.get("status") or en.get("folio_status"),
                                         "image": en.get("image_number")})
    glosario = {e["clave"]: e for e in lex["entradas"]}
    fichas = {}
    for e in ono["entities"]:
        for n in [e["name"]] + (e.get("aliases") or []) + (e.get("latin_forms") or []):
            fichas[fold(n)] = e

    # recolección
    _FICHAS = fichas
    globals()["_FICHAS"] = fichas
    grupos = collections.defaultdict(lambda: {"formas": collections.Counter(), "loci": collections.defaultdict(list)})
    griegos = collections.defaultdict(lambda: {"formas": collections.Counter(), "loci": set()})
    for locus, p in pasajes.items():
        lat = p.get("latin", "")
        for m in PROPIO.finditer(lat):
            w = m.group(1)
            if w.split()[0] in FUNCION:
                continue
            g = grupos[raiz(w.split()[0])]
            g["formas"][w] += 1
            g["loci"][locus].append(w)
        for m in GRIEGO.finditer(lat):
            w = " ".join(m.group(0).split())
            if len(fold(w)) < 3:
                continue
            gr = griegos[fold(w)]
            gr["formas"][w] += 1
            gr["loci"].add(locus)

    # Un nombre propio no aparece en minúscula en el mismo texto. Si la forma
    # también se usa en minúscula es voz común o gentilicio, no nombre propio: se
    # conserva pero en su propio apartado, para no inflar el repertorio onomástico.
    minusculas = set()
    for p_ in pasajes.values():
        for w in re.findall(r"\b([a-z]{3,})\b", p_.get("latin", "")):
            minusculas.add(fold(w))

    nombres, comunes = [], []
    for clave, g in grupos.items():
        formas = g["formas"]
        # El grupo se nombra por su forma de una sola palabra más frecuente: así
        # «Ephesi» no queda rotulado «Ephesi Dianae», que son dos nombres juntos.
        simples = [(f, n) for f, n in formas.most_common() if " " not in f]
        principal = (simples[0][0] if simples else formas.most_common(1)[0][0])
        loci = sorted(g["loci"], key=lambda l: tuple(int(x) if x.isdigit() else 0 for x in (l.split(".") + ["0", "0"])[:3]))
        # Glosa ecdótica: del aparato de esos loci, sólo lo que nombra alguna forma
        # atestiguada del grupo. Lo demás comparte el locus pero no habla del nombre.
        claves = {fold(f) for f in formas}
        vistos, ap = set(), []
        for l in loci:
            for a in aparato.get(l, []):
                if a["id"] in vistos:
                    continue
                if any(k in a["_hay"] for k in claves if len(k) > 3):
                    vistos.add(a["id"])
                    ap.append({k: v for k, v in a.items() if k != "_hay"} | {"locus": l})
        ap = ap[:10]
        fol = [f for l in loci for f in folio_de.get(l, [])][:6]
        gl = glosario.get(fold(principal)) or glosario.get(clave)
        destino = comunes if fold(principal) in minusculas else nombres
        destino.append({
            "clave": clave,
            "formaPrincipal": principal,
            "formasAtestiguadas": [{"forma": f, "apariciones": n} for f, n in formas.most_common()],
            "apariciones": sum(formas.values()),
            "loci": loci,
            "ficha": ficha_de(formas),
            "aparatoQueLoMenciona": ap,
            "foliosDelCodice": fol,
            "glosarioDelAutor": {"lemma": gl["lemma"], "graecum": gl.get("graecum")} if gl else None,
        })
    nombres.sort(key=lambda x: (-x["apariciones"], x["formaPrincipal"]))
    comunes.sort(key=lambda x: (-x["apariciones"], x["formaPrincipal"]))

    voces = []
    for clave, gr in griegos.items():
        loci = sorted(gr["loci"])
        voces.append({
            "clave": clave,
            "formaPrincipal": gr["formas"].most_common(1)[0][0],
            "formasAtestiguadas": [{"forma": f, "apariciones": n} for f, n in gr["formas"].most_common()],
            "apariciones": sum(gr["formas"].values()),
            "loci": loci,
            "aparatoQueLoMenciona": [
                {k: v for k, v in a.items() if k != "_hay"} | {"locus": l}
                for l in loci for a in aparato.get(l, [])
                if fold(gr["formas"].most_common(1)[0][0]) in a["_hay"]][:10],
            "foliosDelCodice": [f for l in loci for f in folio_de.get(l, [])][:6],
        })
    voces.sort(key=lambda x: (-x["apariciones"], x["formaPrincipal"]))

    doc = {
        "schema": "vitruvius-onomasticon-plenum/1",
        "generated": datetime.date.today().isoformat(),
        "fuente": "Texto latino de la edición V514 (data/structured/recensio-es.json), 731 pasajes.",
        "metodo": ("Se recogen las mayúsculas iniciales que no abren oración y las secuencias en alfabeto "
                   "griego. La flexión se agrupa por raíz común de cuatro caracteres o más; el grupo se "
                   "nombra por su forma más frecuente, que es una forma atestiguada y no un nominativo "
                   "reconstruido. A cada grupo se le adjunta el aparato crítico de sus loci, el folio del "
                   "códice H cuando está mapeado y la entrada del glosario del autor cuando existe."),
        "advertencia": ("Repertorio filológico, no prosopografía: la identificación de una persona o un "
                        "lugar es la de las fichas redactadas por el autor. Un grupo sin ficha registra "
                        "apariciones, no una identificación. La captura por mayúscula inicial puede "
                        "recoger un adjetivo gentilicio o el comienzo de un período no detectado."),
        "recuentos": {
            "gruposDeNombres": len(nombres),
            "aparicionesTotales": sum(n["apariciones"] for n in nombres),
            "conFichaRedactada": sum(1 for n in nombres if n["ficha"]),
            "sinFichaRedactada": sum(1 for n in nombres if not n["ficha"]),
            "conGlosaEcdotica": sum(1 for n in nombres if n["aparatoQueLoMenciona"]),
            "conAutoridadProsopografica": sum(
                1 for n in nombres if n["ficha"] and n["ficha"]["autoridadProsopografica"]["citada"]),
            "conFolioDelCodice": sum(1 for n in nombres if n["foliosDelCodice"]),
            "conEntradaDeGlosario": sum(1 for n in nombres if n["glosarioDelAutor"]),
            "vocesComunesOGentilicias": len(comunes),
            "vocesGriegas": len(voces),
            "aparicionesGriegas": sum(v["apariciones"] for v in voces),
        },
        "nombres": nombres,
        "vocesComunesOGentilicias": comunes,
        "vocesGriegas": voces,
    }
    out = ROOT / "data/onomasticon-plenum.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1048576:.2f} MB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")
    print("\n   muestra de nombres:")
    for n in nombres[:8]:
        g = f" · glosario: {n['glosarioDelAutor']['lemma']}" if n["glosarioDelAutor"] else ""
        f = f" · f.{n['foliosDelCodice'][0]['folio']}" if n["foliosDelCodice"] else ""
        fi = " · ficha" if n["ficha"] else ""
        print(f"     {n['formaPrincipal']:22s} {n['apariciones']:4d} aparic · {len(n['loci']):3d} loci · "
              f"glosa ecdótica: {len(n['aparatoQueLoMenciona'])}{f}{g}{fi}")
    print("\n   muestra de voces griegas:")
    for v in voces[:6]:
        print(f"     {v['formaPrincipal']:22s} {v['apariciones']:4d} aparic · {len(v['loci'])} loci")


if __name__ == "__main__":
    main()
