#!/usr/bin/env python3
"""Localiza las rúbricas de Harley MS 2767 por el color de la tinta.

Para señalar dónde empieza un prefacio en el facsímil no hace falta leer la
escritura: las rúbricas están en tinta roja, que se separa de la tinta parda por
color. Este detector marca los píxeles cuyo canal rojo supera claramente al
verde y al azul, agrupa las filas densas en bandas y devuelve su caja.

Lo que se publica es una medición sobre la imagen —«aquí hay tinta roja»—, no una
lectura del texto: el subrayado señala la rúbrica, no afirma qué dice.

Uso: python3 scripts/detect-rubricas.py [--limite N]
"""
import json, re, sys, pathlib, datetime
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIR = ROOT / "images/CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR"
MIN_PIXELES = 300     # por debajo, son manchas o la foliación moderna
MIN_ALTURA = 4        # bandas más finas son ruido
# Una línea de rúbrica es ancha y densa; una inicial roja suelta es estrecha y
# tenue. Medido sobre los diez prefacios conocidos: sus bandas traen entre 666 y
# 1903 píxeles, mientras que las iniciales dispersas rondan los 190.
MIN_PIXELES_BANDA = 400
MIN_ANCHO_BANDA = 0.18   # fracción del ancho de la imagen
# Las cubiertas, guardas y el lomo no son folios de texto.
NO_FOLIO = ("spine", "front", "back", "fs-", "edge", "head", "tail")


def bandas_rojas(path):
    im = Image.open(path).convert("RGB")
    ancho, alto = im.size
    a = np.asarray(im).astype(np.int16)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    roja = (R - G > 38) & (R - B > 28) & (R > 90) & (G < 170)
    total = int(roja.sum())
    if total < MIN_PIXELES:
        return ancho, alto, total, []
    filas = np.bincount(np.nonzero(roja)[0], minlength=alto)
    umbral = max(8, int(filas.max()) // 6)
    activas = np.nonzero(filas >= umbral)[0]
    bandas, ini, prev = [], None, None
    for y in activas:
        if ini is None:
            ini = prev = int(y)
        elif y - prev <= 6:
            prev = int(y)
        else:
            bandas.append((ini, prev)); ini = prev = int(y)
    if ini is not None:
        bandas.append((ini, prev))
    out = []
    for y0, y1 in bandas:
        if y1 - y0 < MIN_ALTURA:
            continue
        franja = roja[y0:y1 + 1]
        cols = np.nonzero(franja.any(axis=0))[0]
        if not len(cols):
            continue
        x0, x1 = int(cols[0]), int(cols[-1])
        pix = int(franja.sum())
        anchoRel = (x1 - x0 + 1) / ancho
        if pix < MIN_PIXELES_BANDA or anchoRel < MIN_ANCHO_BANDA:
            continue
        out.append({
            "x": round(x0 / ancho, 4), "y": round(y0 / alto, 4),
            "w": round(anchoRel, 4), "h": round((y1 - y0 + 1) / alto, 4),
            "pixeles": pix,
        })
    return ancho, alto, total, out


def main():
    limite = None
    for i, a in enumerate(sys.argv):
        if a == "--limite" and i + 1 < len(sys.argv):
            limite = int(sys.argv[i + 1])

    indice = json.loads((DIR / "indice-folios.json").read_text(encoding="utf8"))
    imagenes = indice["imagenes"]
    mapa = json.loads((ROOT / "data/codex-h/folio-locus-map.json").read_text(encoding="utf8"))
    locus_de = {}
    for e in mapa["entries"]:
        for l in e.get("loci", []):
            locus_de.setdefault(e["folio"], []).append(l["locus"])

    folios, con = [], 0
    for n, im in enumerate(imagenes if limite is None else imagenes[:limite]):
        archivo = DIR / im.get("archivo", "")
        if not archivo.exists():
            continue
        if any(t in archivo.name.lower() for t in NO_FOLIO):
            continue
        etiqueta = str(im.get("etiquetaOriginal", ""))
        folio = (re.match(r"f\.?\s*(\d+\s*[rv])$", etiqueta) or [None, None])[1]
        folio = re.sub(r"\s+", "", folio) if folio else None
        ancho, alto, total, bandas = bandas_rojas(archivo)
        if bandas:
            con += 1
        folios.append({
            "imagen": im.get("numeroImagen"), "etiqueta": etiqueta, "folio": folio,
            "ancho": ancho, "alto": alto, "pixelesRojos": total,
            "rubricas": bandas,
            "loci": locus_de.get(folio or "", []),
        })
        if (n + 1) % 50 == 0:
            print(f"   {n+1} imágenes analizadas…", flush=True)

    doc = {
        "schema": "vitruvius-rubricas-h/1",
        "generated": datetime.date.today().isoformat(),
        "metodo": ("Detección de tinta roja por color sobre la reproducción digital: se marcan los píxeles "
                   "cuyo canal rojo supera al verde en 38 y al azul en 28, se agrupan las filas densas en "
                   "bandas y se devuelve su caja en coordenadas relativas (0–1) sobre la imagen."),
        "advertencia": ("Esto mide tinta, no lee texto. Una banda señala dónde hay rúbrica en el folio; no "
                        "afirma qué dice ni sustituye la lectura paleográfica. La foliación moderna y las "
                        "manchas se descartan por umbral, de modo que puede quedar alguna rúbrica tenue sin "
                        "detectar y alguna mancha roja detectada de más."),
        "umbrales": {"pixelesMinimos": MIN_PIXELES, "alturaMinimaDeBanda": MIN_ALTURA,
                     "pixelesMinimosPorBanda": MIN_PIXELES_BANDA, "anchoMinimoDeBanda": MIN_ANCHO_BANDA},
        "recuentos": {
            "imagenes": len(folios),
            "conRubricaDetectada": con,
            "bandas": sum(len(f["rubricas"]) for f in folios),
            "conLocusConocido": sum(1 for f in folios if f["loci"] and f["rubricas"]),
        },
        "folios": folios,
    }
    out = ROOT / "data/codex-h/rubricas.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1024:.0f} KB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")


if __name__ == "__main__":
    main()
