#!/usr/bin/env python3
"""Exportar metadatos codicológicos atribuidos a fuentes institucionales.

La salida deriva EXCLUSIVAMENTE de fichas ya existentes en el registro
verificado de Bibliotheca; nunca descarga ni copia prosa de terceros, imágenes
o facsímiles. El URL de una ficha prueba procedencia declarada, no cotejo actual.
Uso: python3 scripts/export-institutional-witness-metadata.py
     python3 scripts/export-institutional-witness-metadata.py --output /tmp/witnesses.json
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data/bibliotheca-testimonia-verified.json"
FIELDS = ("id", "workIds", "title", "library", "shelfmark", "date",
          "language", "coverage", "folioRange", "material", "dimensions",
          "script", "origin", "datingBasis", "verificationLevel")
# URLs de instituciones y repertorios reconocibles, no verificación por hostname.
HOSTS = (
    "bl.uk", "bnf.fr", "gallica.bnf.fr", "vaticanlibrary.va",
    "digi.vatlib.it", "vatlib.it", "bodleian.ox.ac.uk",
    "medieval.bodleian.ox.ac.uk", "digital.bodleian.ox.ac.uk",
    "e-codices.unifr.ch", "pinakes.irht.cnrs.fr", "loc.gov",
    "cam.ac.uk", "bibliotecaapostolica.va", "manuscripta-mediaevalia.de",
    "digitalcollections.library.yale.edu", "uni-heidelberg.de",
    "digitalcollections.nypl.org",
)

def institutional(url):
    if not isinstance(url, str):
        return False
    p = urlparse(url)
    host = (p.hostname or "").lower()
    return p.scheme == "https" and any(host == h or host.endswith("." + h) for h in HOSTS)

def export():
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    rows = []
    for witness in source.get("records", []):
        urls = []
        for key in ("verificationUrl", "record", "viewer", "manifest"):
            url = witness.get(key)
            if institutional(url) and url not in urls:
                urls.append(url)
        if not urls:
            continue
        # Whitelisted short identifying facts only. Longer institutional
        # catalogue descriptions and editorial commentary are NOT imported.
        row = {k: witness[k] for k in FIELDS if k in witness and witness[k] is not None}
        row["authorityUrls"] = urls
        row["sourceRegisterId"] = witness.get("id")
        row["evidenceStatus"] = "declared_in_existing_vitruvius_registry_not_live_rechecked"
        rows.append(row)
    return {"schema": "vitruvius-institutional-witness-crosswalk-v1",
            "method": "Extracto de metadatos identificativos del registro local, no copia de descripciones de catálogos externos ni consulta de API en vivo.",
            "records": rows, "count": len(rows)}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", help="Ruta JSON; sin --output imprime un resumen")
    args = ap.parse_args()
    result = export()
    if args.output:
        dest = Path(args.output)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{result['count']} testimonios exportados a {dest}")
    else:
        print(f"{result['count']} fichas con enlace de procedencia institucional declarada")
        for r in result["records"]:
            print(r.get("id"), r.get("shelfmark", ""), r["authorityUrls"][0])
