#!/usr/bin/env python3
"""Índice liviano de los 731 loci, para poblar selectores sin cargar la edición.

Las páginas que piden un locus obligaban a escribirlo. Para ofrecer un
desplegable hace falta la lista de loci, y cargar la edición entera (1 MB) sólo
para eso sería desproporcionado: este índice pesa unas decenas de kilobytes y
trae lo justo —libro, capítulo, sección, rótulo legible y las primeras palabras
del latín, que es lo que permite reconocer el pasaje en la lista.

Uso: python3 scripts/build-loci-index.py
"""
import json, re, pathlib, datetime, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
R = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]


def main():
    st = json.loads((ROOT / "data/structured/recensio-es.json").read_text(encoding="utf8"))
    col = json.loads((ROOT / "data/apparatus/collatio-validada.json").read_text(encoding="utf8"))
    idx = json.loads((ROOT / "data/apparatus-index.json").read_text(encoding="utf8"))

    con_aparato = collections.Counter()
    for e in idx["entries"]:
        for l in ([e.get("locusMention")] if e.get("locusMention") else []) + (e.get("loci") or []):
            if l:
                con_aparato[l] += 1
    con_collatio = collections.Counter(e["locus"] for e in col["entradas"])
    folio_de = {}
    mapa = json.loads((ROOT / "data/codex-h/folio-locus-map.json").read_text(encoding="utf8"))
    for en in mapa["entries"]:
        for l in en.get("loci", []):
            folio_de.setdefault(l["locus"], en["folio"])

    loci = []
    for p in st["passages"]:
        b, c, *resto = (p["locus"] + "..").split(".")
        seccion = resto[0] if resto and resto[0].isdigit() else None
        praef = c == "praef"
        inicio = " ".join(re.sub(r"\s+", " ", p.get("latin", "")).split()[:7])
        loci.append({
            "locus": p["locus"],
            "libro": int(b),
            "capitulo": "praef" if praef else int(c),
            "seccion": int(seccion) if seccion else None,
            "rotulo": f"{R[int(b)]}." + ("praef" if praef else c) + (f".{seccion}" if seccion else ""),
            "cita": f"Vitr. {R[int(b)]}." + ("praef" if praef else c) + (f".{seccion}" if seccion else ""),
            "incipit": inicio[:70],
            "aparato": con_aparato.get(p["locus"], 0),
            "collatio": con_collatio.get(p["locus"], 0),
            "folio": folio_de.get(p["locus"]),
        })

    libros = []
    for b in range(1, 11):
        dentro = [l for l in loci if l["libro"] == b]
        caps = []
        for cap in sorted({l["capitulo"] for l in dentro}, key=lambda c: (-1 if c == "praef" else c)):
            secs = [l for l in dentro if l["capitulo"] == cap]
            caps.append({"capitulo": cap,
                         "rotulo": "Praefatio" if cap == "praef" else f"Capítulo {cap}",
                         "loci": len(secs)})
        libros.append({"libro": b, "numeral": R[b], "loci": len(dentro), "capitulos": caps})

    doc = {
        "schema": "vitruvius-loci-index/1",
        "generated": datetime.date.today().isoformat(),
        "fuente": "data/structured/recensio-es.json · los 731 loci canónicos del tratado.",
        "recuentos": {
            "loci": len(loci),
            "libros": len(libros),
            "capitulos": sum(len(x["capitulos"]) for x in libros),
            "conAparato": sum(1 for l in loci if l["aparato"]),
            "conCollatio": sum(1 for l in loci if l["collatio"]),
            "conFolioDelCodice": sum(1 for l in loci if l["folio"]),
        },
        "libros": libros,
        "loci": loci,
    }
    out = ROOT / "data/index/loci.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print(f"→ {out.relative_to(ROOT)}  ({out.stat().st_size/1024:.0f} KB)")
    for k, v in doc["recuentos"].items():
        print(f"   {k}: {v}")
    print("   por libro: " + "  ".join(f"{x['numeral']}:{x['loci']}" for x in libros))


if __name__ == "__main__":
    main()
