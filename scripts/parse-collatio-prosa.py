#!/usr/bin/env python3
"""Aparato crítico en prosa corrida del Apéndice T.

Parte del Apéndice T no está en tablas sino redactado en prosa, en la forma
canónica del aparato:

    3.3.8 XXXVIII] H; XXXIV Krohn. — 4.1.9 poculis] H, Gros (Budé), Loeb;
    pupulis Krohn. — 9.8.7 ex cuneis] H, Rose; †ex cuneis Krohn.

El lector de tablas no puede con esto, de modo que esas páginas quedaban fuera
aunque son las más densas en testigos: lema, lecturas separadas por punto y
coma, testigos y editores por lectura, y los signos ecdóticos del autor.

Cada entrada se registra con su locus, su lema, sus lecturas con los testigos
de cada una, y la página donde puede comprobarse. No se interpreta la decisión
editorial: se transcribe lo que el autor imprimió.

Uso: python3 scripts/parse-collatio-prosa.py
"""
import json, re, pathlib, datetime, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
ED = [("recensio-es", "V514", "es", "documents/kurilo-recensio-es.pdf"),
      ("recensio-fr", "V554", "fr", "documents/kurilo-recensio-fr.pdf")]
CACHE = pathlib.Path("/tmp/apcache")

ROM = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10}
# Marca de locus delante de un lema: «1 praef. 2», «3.3.8», «X.11.7».
LOCUS_MARCA = re.compile(r"(?<![\w.])((?:[IVX]{1,4}|\d{1,2})\s*[.,]?\s*(?:praef\.?|pr[ée]f(?:ace)?\.?|\d{1,2})"
                         r"(?:\s*[.,]\s*\d{1,3})?)\s+(?=[^\s\]])", re.I)
# Unidad: lema ] resto, hasta el siguiente guion largo separador o fin.
UNIDAD = re.compile(r"([^\s\]][^\]]{0,90}?)\]\s*([^—]{0,320}?)(?=\s+[—–]\s|\Z)", re.S)
SIGLA = re.compile(r"\b(H|G|E|S|Rose|Krohn|Bud[ée]|Callebat|Fleury|Gros|Soubiran|Granger|Marini|Corso|"
                   r"Loeb|Perseus|Fensterbusch|Morgan|Vulg|codd?|edd?)\b")
OPS = re.compile(r"\b(om|hab|secl|add|del|coni|corr|transp|iter|ut\s*vid|s\.\s*l|in\s*marg|a\.\s*c|p\.\s*c)\.|†")
RUIDO = re.compile(r"^(?:p[áa]g|v[ée]ase|voir|cf|nota|tabla|figura|tableau|los|las|el|la|une|les|the)\b", re.I)
# Un lema es una cita del texto, no una frase del redactor: se rechaza el que
# empieza por numeración de párrafo o trae vocabulario de prosa explicativa.
PROSA = re.compile(r"^\d+\.\s|\b(?:suplement|supresion|se conserv|se mantiene|criterio|registro|"
                   r"estado|cobertura|resumen|suppl[ée]ment|crit[èe]re|se conserve)\b", re.I)


def norm_locus(raw):
    raw = re.sub(r"\s+", "", str(raw or "")).replace(",", ".")
    m = re.match(r"^((?:[IVX]{1,4}|\d{1,2}))\.?(praef\.?|pr[ée]f(?:ace)?\.?|\d{1,2})(?:\.(\d{1,3}))?$", raw, re.I)
    if not m:
        return None
    h = m.group(1).upper()
    b = ROM.get(h) if h in ROM else (int(h) if h.isdigit() else None)
    if not b or b > 10:
        return None
    if re.match(r"^(praef|pr[ée]f)", m.group(2), re.I):
        c = "praef"
    else:
        n = int(m.group(2))
        if n < 1:          # «5.1.6–10» deja un «0» al partir el rango: no es capítulo
            return None
        c = str(n)
    if m.group(3) and int(m.group(3)) < 1:
        return None
    return f"{b}.{c}.{int(m.group(3))}" if m.group(3) else f"{b}.{c}"


def lecturas(resto):
    """Lecturas de una unidad, separadas por punto y coma, con sus testigos."""
    out = []
    for parte in re.split(r"\s*;\s*", resto.strip(" .")):
        parte = " ".join(parte.split())
        if len(parte) < 2:
            continue
        testigos = sorted(set(SIGLA.findall(parte)))
        signos = sorted({(m.group(1) or "†").strip(". ") for m in OPS.finditer(parte)})
        out.append({"texto": parte[:220], "testigos": testigos, "signos": signos})
    return out


def main():
    canon = set()
    for ed, *_ in [(e[0],) for e in ED]:
        st = json.loads((ROOT / f"data/structured/{ed}.json").read_text(encoding="utf8"))
        canon.update(p["locus"] for p in st.get("passages", []))

    tabla = json.loads((ROOT / "data/apparatus/collatio-codicum.json").read_text(encoding="utf8"))
    ya = {(e["edition"], e["page"]) for e in tabla["entradas"]}

    entradas = []
    for ed, ver, lang, pdf in ED:
        txt = CACHE / f"{ed}.txt"
        if not txt.exists():
            print(f"   falta el texto cacheado de {ed}; ejecute pdftotext -layout")
            continue
        paginas = txt.read_text(encoding="utf8", errors="replace").split("\f")
        rango = range(1080, 1170)
        for idx in rango:
            if idx - 1 >= len(paginas):
                break
            page = idx
            # El PDF parte palabras al final de renglón: «conser- van» debe volver
            # a ser «conservan» antes de leer nada, o el lema sale roto.
            crudo = paginas[page - 1].replace("-\n", "").replace("\u00ad\n", "")
            cuerpo = " ".join(crudo.split())
            cuerpo = re.sub(r"(\w)-\s+(\w)", r"\1\2", cuerpo)
            if len(cuerpo) < 200:
                continue
            # La página tiene que traer varias unidades y sigla: si no, es prosa común.
            if len(re.findall(r"\]", cuerpo)) < 3 or not SIGLA.search(cuerpo):
                continue
            actual = None
            # Se recorre por segmentos separados por el guion largo del aparato.
            for seg in re.split(r"\s+[—–]\s+", cuerpo):
                m = LOCUS_MARCA.match(seg)
                if m and norm_locus(m.group(1)):
                    actual = norm_locus(m.group(1))
                    seg = seg[m.end():]
                else:
                    m2 = LOCUS_MARCA.search(seg[:40])
                    if m2 and norm_locus(m2.group(1)):
                        actual = norm_locus(m2.group(1))
                        seg = seg[m2.end():]
                if "]" not in seg or not actual:
                    continue
                u = re.match(r"([^\]]{1,90})\]\s*(.{0,320})", seg, re.S)
                if not u:
                    continue
                lema = " ".join(u.group(1).split())
                if len(lema) < 2 or RUIDO.match(lema) or PROSA.search(lema):
                    continue
                # Un lema de más de ocho palabras es, casi siempre, prosa arrastrada.
                if len(lema.split()) > 8:
                    continue
                ls = lecturas(u.group(2))
                if not ls or not any(l["testigos"] for l in ls):
                    continue
                entradas.append({
                    "id": f"{ver}-Tp-p{page}-{len(entradas)}",
                    "edition": ed, "version": ver, "language": lang,
                    "page": page, "pdf": f"{pdf}#page={page}",
                    "locus": actual, "lemma": lema,
                    "lecturas": ls,
                    "testigos": sorted({t for l in ls for t in l["testigos"]}),
                    "signos": sorted({s for l in ls for s in l["signos"]}),
                    "enTabla": (ed, page) in ya,
                    "locusEnElCanon": actual in canon,
                    "locusDeCapitulo": actual.count(".") == 1,
                })

    por_pagina = collections.Counter(e["page"] for e in entradas if e["edition"] == "recensio-es")
    doc = {
        "schema": "vitruvius-collatio-prosa/1",
        "generated": datetime.date.today().isoformat(),
        "fuente": ("Aparato crítico redactado en prosa dentro del Apéndice T de las ediciones V514 y V554, "
                   "en la forma «lema] lectura, testigos; lectura, testigos». No está en tablas, de modo "
                   "que el lector de tablas no lo alcanzaba."),
        "advertencia": ("Transcripción mecánica de lo impreso. Los testigos y los signos son los que el "
                        "autor escribió; la decisión editorial no se interpreta. Conviene comprobar cada "
                        "entrada contra la página citada antes de citarla como lectura."),
        "recuentos": {
            "entradas": len(entradas),
            "lociDistintos": len({e["locus"] for e in entradas}),
            "lociFueraDelCanon": len({e["locus"] for e in entradas if e["locus"] not in canon}),
            "conMasDeUnaLectura": sum(1 for e in entradas if len(e["lecturas"]) > 1),
            "porVersion": dict(collections.Counter(e["version"] for e in entradas)),
            "paginasNuevas": sorted({e["page"] for e in entradas if not e["enTabla"]}),
        },
        "testigosCitados": dict(collections.Counter(t for e in entradas for t in e["testigos"]).most_common()),
        "entradas": entradas,
    }
    out = ROOT / "data/apparatus/collatio-prosa.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1024:.0f} KB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v if not isinstance(v, list) else str(v)[:90]}")
    print("\n   testigos citados:", doc["testigosCitados"])
    print("\n   muestra:")
    for e in entradas[:6]:
        print(f"     {e['locus']:10s} {e['lemma'][:34]:36s} ] " +
              " ; ".join(f"{l['texto'][:40]}" for l in e["lecturas"][:2]))


if __name__ == "__main__":
    main()
