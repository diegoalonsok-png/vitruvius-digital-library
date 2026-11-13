#!/usr/bin/env python3
"""Indexa en lote las obras del repertorio que todavía no tienen texto buscable.

Toma las fuentes declaradas en data/perseus-obras-faltantes.json (TEI de
PerseusDL y First1KGreek, CC BY-SA 4.0), las convierte al contrato de pasajes
del sitio y las deja en data/classics-corpus/<ficha>-<lengua>.json, con el URN
y el sha256 de cada archivo descargado. Una ficha puede reunir varias obras
(los discursos de Lisias, los diálogos de Platón): cada pasaje conserva el
título y el URN de la obra de la que viene, sin fundir las citas.

Uso: python3 scripts/indexar-perseus-lote.py [ficha ...] [--limite N]
"""
import hashlib, json, pathlib, re, sys, urllib.request
import xml.etree.ElementTree as ET

TEI = "{http://www.tei-c.org/ns/1.0}"
RAIZ = pathlib.Path(__file__).resolve().parent.parent
FUENTES = RAIZ / "data/perseus-obras-faltantes.json"
DESTINO = RAIZ / "data/classics-corpus"
REGISTRO = DESTINO / "search-registry.json"
MIN_PASAJES, MIN_CARACTERES = 3, 1200

def limpiar(t):
    return re.sub(r"\s+", " ", (t or "")).strip()

def texto_de(nodo):
    partes = []
    for e in nodo.iter():
        et = e.tag
        if et in (TEI + "note", TEI + "bibl", TEI + "ref", TEI + "head"):
            continue
        if e.text: partes.append(e.text)
        if e.tail: partes.append(e.tail)
    return limpiar(" ".join(partes))

def numero(d):
    return d.attrib.get("n") or d.attrib.get("{http://www.w3.org/XML/1998/namespace}id") or ""

def pasajes_de(raiz, urn, titulo):
    """Divisiones más hondas con @n; si la obra es en verso, agrupa por decenas."""
    cuerpo = raiz.find(".//" + TEI + "body")
    if cuerpo is None: cuerpo = raiz
    hojas = [d for d in cuerpo.iter(TEI + "div")
             if not any(h.tag == TEI + "div" for h in d) and numero(d)]
    fuera = []
    padres = {h: p for p in cuerpo.iter() for h in p}
    for d in hojas:
        cita = []
        n = d
        while n is not None and n.tag == TEI + "div":
            if numero(n): cita.append(numero(n))
            n = padres.get(n)
        cita = ".".join(reversed(cita))
        # algunas ediciones numeran las divisiones con el URN entero: no repetirlo
        if cita.startswith("urn:"): urn_cita, cita = cita, ""
        else: urn_cita = None
        versos = [l for l in d.iter(TEI + "l")]
        if len(versos) > 12:
            for i in range(0, len(versos), 10):
                bloque = versos[i:i + 10]
                t = limpiar(" ".join(texto_de(v) for v in bloque))
                if len(t) < 8: continue
                desde = numero(bloque[0]) or str(i + 1)
                base = urn_cita or (f"{urn}:{cita}" if cita else urn)
                fuera.append({"locus": f"{base}.{desde}",
                              "text": t, "title": titulo})
        else:
            t = texto_de(d)
            if len(t) < 8: continue
            fuera.append({"locus": urn_cita or (f"{urn}:{cita}" if cita else urn), "text": t, "title": titulo})
    if not fuera:  # obras sin div útil: párrafos sueltos
        for i, p in enumerate(cuerpo.iter(TEI + "p"), 1):
            t = texto_de(p)
            if len(t) >= 8:
                fuera.append({"locus": f"{urn}:{i}", "text": t, "title": titulo})
    return fuera

def bajar(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()

def main():
    crudos = sys.argv[1:]
    args, saltar = [], False
    for i, a in enumerate(crudos):
        if saltar: saltar = False; continue
        if a in ("--limite", "--destino"): saltar = True; continue
        if a.startswith("--"): continue
        args.append(a)
    limite = None
    if "--limite" in sys.argv:
        limite = int(sys.argv[sys.argv.index("--limite") + 1])
    destino = DESTINO
    if "--destino" in sys.argv:
        destino = pathlib.Path(sys.argv[sys.argv.index("--destino") + 1])
        destino.mkdir(parents=True, exist_ok=True)
    # Con --r2 el texto no entra al repositorio: el registro apunta a la copia pública.
    base = "https://libros.vitruvius-digital-library.org/corpus/" if "--r2" in sys.argv else None
    fuentes = json.loads(FUENTES.read_text(encoding="utf-8"))["fichas"]
    fichas = args or list(fuentes)
    if limite: fichas = fichas[:limite]
    registro = json.loads(REGISTRO.read_text(encoding="utf-8"))
    por_id = {(e["workId"], e.get("language")): e for e in registro["entries"]}
    nuevas, fallidas = [], []
    for wid in fichas:
        ficha = fuentes[wid]
        pasajes, fuentes_usadas = [], []
        for obra in ficha["obras"]:
            try:
                crudo = bajar(obra["url"])
            except Exception as e:
                fallidas.append(f"{wid} · {obra['urn']}: {e}")
                continue
            try:
                raiz = ET.fromstring(crudo)
            except ET.ParseError as e:
                fallidas.append(f"{wid} · {obra['urn']}: XML ilegible ({e})")
                continue
            p = pasajes_de(raiz, obra["urn"], obra["titulo"])
            if not p:
                fallidas.append(f"{wid} · {obra['urn']}: sin pasajes legibles")
                continue
            pasajes += p
            fuentes_usadas.append({"urn": obra["urn"], "titulo": obra["titulo"],
                                   "url": obra["url"],
                                   "sha256": hashlib.sha256(crudo).hexdigest()})
        caracteres = sum(len(p["text"]) for p in pasajes)
        if len(pasajes) < MIN_PASAJES or caracteres < MIN_CARACTERES:
            fallidas.append(f"{wid}: texto insuficiente ({len(pasajes)} pasajes, {caracteres} caracteres)")
            continue
        lengua = ficha["lengua"]
        datos = {
            "workId": wid, "language": lengua, "title": ficha["titulo"],
            "sourceType": "edited-greek-tei" if lengua == "grc" else "edited-latin-tei",
            "editorialStatus": "Texto editado, no transcripción diplomática ni OCR del códice",
            "sources": fuentes_usadas,
            "attribution": ficha.get("atribucion", "PerseusDL / OpenGreekAndLatin, TEI, CC BY-SA 4.0"),
            "license": "CC BY-SA 4.0 (conservar atribución y compartir adaptaciones)",
            "alignment": "Locus = cita de la propia edición (URN CTS); sin correspondencia automática con folios",
            "passages": pasajes,
        }
        salida = destino / f"{wid}-{lengua}.json"
        salida.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        entrada = {"workId": wid, "language": lengua, "title": ficha["titulo"],
                   "author": ficha["autor"], "path": (base + f"{wid}-{lengua}.json") if base else f"data/classics-corpus/{wid}-{lengua}.json",
                   "format": "json-passages", "reader": ficha.get("reader", f"classics-text-reader.html?work={wid}"),
                   "sourceDescription": ficha.get("procedencia", "Perseus/First1KGreek TEI · edición atribuida en el archivo · sin cotejo ni alineación automática")}
        por_id[(wid, lengua)] = entrada
        nuevas.append(f"{wid}: {len(pasajes)} pasajes · {caracteres} caracteres · {len(fuentes_usadas)} fuentes")
    registro["entries"] = sorted(por_id.values(), key=lambda e: (e["workId"], e.get("language") or ""))
    registro["count"] = len(registro["entries"])
    registro["works"] = len({e["workId"] for e in registro["entries"]})
    REGISTRO.write_text(json.dumps(registro, ensure_ascii=False, indent=1), encoding="utf-8")
    # El informe público de cobertura declara las mismas cifras: si no se
    # rehace, las auditorías lo dan por vencido y el sitio anuncia de menos.
    cobertura = RAIZ / "data/classics-corpus/coverage-audit.json"
    if cobertura.exists():
        informe = json.loads(cobertura.read_text(encoding="utf-8"))
        informe.setdefault("counts", {})["indexedTextVersions"] = registro["count"]
        informe["counts"]["indexedDistinctWorks"] = registro["works"]
        por_obra = {}
        for e in registro["entries"]:
            por_obra.setdefault(e["workId"], set()).add(e["path"])
        for w in informe.get("works", []):
            w["indexedTextFiles"] = sorted(por_obra.get(w["id"], []))
        cobertura.write_text(json.dumps(informe, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("\n".join(nuevas) or "(ninguna obra nueva)")
    if fallidas:
        print("\nSIN INDEXAR:")
        print("\n".join(fallidas))
    print(f"\nregistro: {len(registro['entries'])} entradas")

if __name__ == "__main__":
    main()
