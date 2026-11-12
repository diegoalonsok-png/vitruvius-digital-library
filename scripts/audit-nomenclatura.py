#!/usr/bin/env python3
"""Auditoría de nomenclatura: que el sitio hable en términos ecdóticos y codicológicos.

Una edición pierde autoridad cuando describe su propio trabajo con vocabulario de
programa —«alertas», «errores», «chequear»— en lugar del de la disciplina. Este
control recorre el texto visible de las páginas y los rótulos de los datos, y
señala los términos impropios con el que corresponde.

No corrige por su cuenta: informa, porque alguna aparición puede ser legítima
(un mensaje de error de carga sí es un error).

Uso: python3 scripts/audit-nomenclatura.py [--todo]
"""
import json, re, sys, pathlib, datetime, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent

# término impropio → por qué, y qué corresponde en la disciplina
VOCABULARIO = [
 (r"\balertas?\b", "«alerta» es vocabulario de programa",
  "lectio diversa, divergencia, lugar que pide cotejo"),
 (r"\berrores? (?:del? (?:texto|manuscrito|c[óo]dice)|textuales?)\b", "una lectura divergente no es un error",
  "lectio diversa, varia lectio, corruptela si está probada"),
 (r"\bchequear|chequeo\b", "calco innecesario", "cotejar, comprobar, verificar"),
 (r"\btestear|testeo\b", "calco innecesario", "comprobar, ensayar"),
 (r"\bescane[oa]\b", "el objeto es una reproducción, no un escaneo",
  "reproducción digital, facsímil digital"),
 (r"\bfotos?\b(?!\w)", "en descripción de manuscrito", "reproducción, facsímil, imagen"),
 (r"\bp[áa]ginas? del c[óo]dice\b", "un códice tiene folios, no páginas", "folio, recto y verso"),
 (r"\bhojas? del c[óo]dice\b", "idem", "folio"),
 (r"\bversi[óo]n del manuscrito\b", "un manuscrito no tiene versiones",
  "estado del texto, recensión, familia"),
 (r"\bcopiar y pegar\b", "registro coloquial", "transcribir, reproducir"),
 (r"\bbug|fallo del? (?:sistema|programa)\b", "vocabulario de programa en texto académico",
  "defecto, incidencia"),
 (r"\bletra bonita|lindo|lind[ao]s\b", "registro coloquial", "—"),
 (r"\bprefacio del libro\b", "en contexto latino conviene el término de la obra",
  "praefatio, proemio"),
 (r"\btraducci[óo]n autom[áa]tica\b", "si la revisó una persona, no es automática",
  "traducción de servicio, versión provisional"),
 (r"\bpalabras? clave\b", "en un índice filológico", "lema, voz, término"),
 (r"\bbúsqueda difusa\b", "calco", "búsqueda aproximada, con tolerancia gráfica"),
]
RX = [(re.compile(p, re.I), motivo, bien) for p, motivo, bien in VOCABULARIO]

# términos que SÍ deben aparecer en una página de aparato o de códice
ESPERADOS = {
 "apparatus-criticus.html": ["lectio", "testimonio", "lemma", "collatio", "folio"],
 "scriptorium.html": ["collatio", "lectio", "testig"],  # «testigo» y «testimonio» valen por igual
 "codex-h-folios-local.html": ["folio", "rúbrica", "recto", "verso", "facsímil"],
 "concordancia-folios.html": ["folio", "locus", "rúbrica"],
 "registro-ecdotico.html": ["ecdótic", "locus", "testimonio"],
 "onomasticon.html": ["atestigua", "locus", "lema"],
 "indices-locorum.html": ["locus", "índice"],
}


def visible(html, base=None):
    """Texto que el lector ve: el del HTML más el que inyectan sus scripts.

    Mirar sólo el HTML estático daba un resultado engañoso, porque estas páginas
    construyen casi todo su texto desde los módulos: los términos de la
    disciplina estaban, pero en el JS.
    """
    cuerpo = html[html.find("<body"):] if "<body" in html else html
    cuerpo = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", cuerpo, flags=re.S)
    texto = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cuerpo))
    if base is None:
        return texto
    # Cadenas literales de los módulos que la página carga: es lo que se muestra.
    for rel in sorted(set(re.findall(r'src="(assets/[A-Za-z0-9._/-]+\.js)(?:\?[^"]*)?"', html))):
        f = base / rel
        if not f.exists():
            continue
        js = f.read_text(encoding="utf8", errors="replace")
        js = re.sub(r"/\*.*?\*/", " ", js, flags=re.S)
        js = re.sub(r"(?m)^\s*//.*$", " ", js)
        for m in re.finditer(r'"([^"\\]{3,200})"|\'([^\'\\]{3,200})\'|`([^`\\]{3,200})`', js):
            frag = m.group(1) or m.group(2) or m.group(3) or ""
            if re.search(r"[áéíóúñ ]", frag) and not re.match(r"^[a-z-]+$", frag):
                texto += " " + frag
    return re.sub(r"\s+", " ", texto)


# Una aparición puede ser legítima: cuando el texto NIEGA el término («no es una
# traducción automática»), cuando nombra una función del navegador, o cuando
# distingue expresamente el aviso de la enmienda. Esas no son impropias.
LEGITIMO = re.compile(
    r"\b(?:no|ni|sin|nunca|jam[áa]s)\s+(?:es\s+|son\s+|una\s+|un\s+|hay\s+)?[^.;]{0,30}$"
    r"|navegador|browser|Translator|API|motor de traducci[óo]n"
    r"|=\s*$|,\s*no\s+(?:enmiendas?|lecturas?|variantes?)", re.I)


def legitimo(contexto, termino):
    """¿La aparición está negada o nombra una función, y por tanto es correcta?"""
    antes = contexto[:contexto.lower().rfind(termino.lower())] if termino.lower() in contexto.lower() else contexto
    despues = contexto[contexto.lower().rfind(termino.lower()) + len(termino):]
    return bool(LEGITIMO.search(antes[-60:]) or LEGITIMO.search(despues[:40]))


# Tableros internos de control de calidad: allí «alerta» nombra una tarea de
# documentación pendiente y no una lectura divergente, de modo que es el término
# correcto. Las propias páginas lo distinguen («alerta documental, no un
# diagnóstico textual»). No se marcan.
TABLEROS = {"auditoria-academica.html", "centro-control-academico.html",
            "control-calidad-corpus.html", "panel-calidad.html", "estado-del-sitio.html"}
# «Palabras clave» describe una extracción automática de términos frecuentes, que
# es lo que la página ofrece; no pretende ser un índice de lemas.
EXTRACCION = {"basilica-fano.html", "datos.html", "ediciones-historicas.html",
              "iconografia-vitruviana.html"}


def main():
    todo = "--todo" in sys.argv
    objetivo = sorted(ROOT.glob("*.html")) if todo else [
        ROOT / n for n in ESPERADOS if (ROOT / n).exists()]

    hallazgos, faltantes = [], []
    for f in objetivo:
        txt = visible(f.read_text(encoding="utf8", errors="replace"), ROOT)
        for rx, motivo, bien in RX:
            for m in rx.finditer(txt):
                ini = max(0, m.start() - 70)
                contexto = txt[ini:m.end() + 70].strip()
                if legitimo(contexto, m.group(0)):
                    continue
                if f.name in TABLEROS and re.search(r"alerta", m.group(0), re.I):
                    continue
                if f.name in EXTRACCION and re.search(r"palabras? clave", m.group(0), re.I):
                    continue
                hallazgos.append({
                    "pagina": f.name, "termino": m.group(0), "motivo": motivo,
                    "corresponde": bien, "contexto": txt[ini:m.end() + 70].strip(),
                })
        esperados = ESPERADOS.get(f.name)
        if esperados:
            bajo = txt.lower()
            ausentes = [t for t in esperados if t.lower() not in bajo]
            if ausentes:
                faltantes.append({"pagina": f.name, "ausentes": ausentes})

    # rótulos de los datos que se muestran al lector
    datos = []
    for rel in ("data/apparatus/collatio-validada.json", "data/apparatus/aparato-autoral.json",
                "data/codex-h/rubricas.json", "data/onomasticon-plenum.json"):
        p = ROOT / rel
        if not p.exists():
            continue
        crudo = p.read_text(encoding="utf8")
        d = json.loads(crudo)
        texto = " ".join(str(v) for k, v in d.items() if isinstance(v, (str,)) ) + " " + \
                " ".join(str(v) for v in (d.get("grados") or {}).values())
        for rx, motivo, bien in RX:
            for m in rx.finditer(texto):
                datos.append({"archivo": rel, "termino": m.group(0), "motivo": motivo, "corresponde": bien})

    informe = {
        "schema": "vitruvius-nomenclatura/1",
        "generated": datetime.date.today().isoformat(),
        "exenciones": {
            "tablerosDeControl": sorted(TABLEROS),
            "motivoTableros": ("En un tablero de control interno «alerta» nombra una tarea de "
                               "documentación pendiente, no una lectura divergente: es el término "
                               "correcto y las páginas lo distinguen expresamente."),
            "extraccionDeTerminos": sorted(EXTRACCION),
            "motivoExtraccion": ("«Palabras clave» describe una extracción de términos frecuentes, que "
                                 "es lo que esas páginas ofrecen; no se presentan como índice de lemas."),
        },
        "criterio": ("Se señala el vocabulario de programa o coloquial en el texto visible de las páginas "
                     "de aparato, códice e índices, con el término que le corresponde en ecdótica o "
                     "codicología. Se revisa el texto del HTML y el de las cadenas de los módulos que la "
                     "página carga, porque buena parte de lo que el lector ve se inyecta desde el JS. "
                     "No se corrige automáticamente: alguna aparición puede ser legítima."),
        "recuentos": {"paginasRevisadas": len(objetivo), "hallazgos": len(hallazgos),
                      "paginasConTerminologiaFaltante": len(faltantes), "enDatos": len(datos)},
        "hallazgos": hallazgos, "terminologiaFaltante": faltantes, "enDatos": datos,
    }
    out = ROOT / "reports/nomenclatura.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(informe, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}")
    for k, v in informe["recuentos"].items():
        print(f"   {k}: {v}")
    if hallazgos:
        print("\n   vocabulario impropio:")
        for h in hallazgos[:20]:
            print(f"     {h['pagina']:30s} «{h['termino']}» → {h['corresponde']}")
            print(f"        …{h['contexto'][:110]}…")
    if faltantes:
        print("\n   términos de la disciplina ausentes:")
        for x in faltantes:
            print(f"     {x['pagina']:30s} falta: {', '.join(x['ausentes'])}")
    if datos:
        print("\n   en los rótulos de los datos:")
        for x in datos[:10]:
            print(f"     {x['archivo']:42s} «{x['termino']}» → {x['corresponde']}")


if __name__ == "__main__":
    main()
