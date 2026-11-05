#!/usr/bin/env python3
"""Importa al repositorio las láminas históricas de data/laminas-historicas.json.

Fuentes admitidas, con verificación de derechos en origen:
  · Wikimedia Commons (Special:FilePath, ancho máximo 1800 px);
  · The Metropolitan Museum of Art (API: solo si isPublicDomain es true);
  · Yale University Art Gallery (manifiesto IIIF con rights CC0).
Una descarga fallida no se sustituye por otra imagen. Límite: 6 MB por archivo."""
import json, time, pathlib, urllib.parse
from urllib.request import Request, urlopen
ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = {"User-Agent": "VitruviusDigitalLibrary-ScholarlyArchive/1.0 (https://diegoalonsok-png.github.io/vitruvius-digital-library/)"}
def get(url, accept="*/*"):
    for i in range(3):
        try:
            with urlopen(Request(url, headers={**UA, "Accept": accept}), timeout=60) as r:
                return r.read(6_500_000), r.headers.get("Content-Type", "")
        except Exception as e:
            last = e; time.sleep(3)
    raise last
def image_url(e):
    if e.get("commons"):
        return "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(e["commons"].replace(" ", "_")) + "?width=1800", "Wikimedia Commons"
    if e.get("met"):
        data, _ = get(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{e['met']}", "application/json")
        o = json.loads(data)
        if not o.get("isPublicDomain"): raise ValueError("el Met no declara dominio público")
        if not o.get("primaryImage"): raise ValueError("sin imagen primaria en el Met")
        e["metObject"] = {"title": o.get("title"), "objectDate": o.get("objectDate"), "accession": o.get("accessionNumber")}
        return o["primaryImage"], "The Metropolitan Museum of Art (Open Access)"
    if e.get("yale"):
        m = json.loads(get(e["yale"], "application/json")[0])
        if "publicdomain/zero" not in str(m.get("rights", "")): raise ValueError("el manifiesto no declara CC0")
        canvas = (m.get("items") or [])[0]
        body = canvas["items"][0]["items"][0]["body"]
        svc = body.get("service") or []
        svc = svc[0] if isinstance(svc, list) and svc else svc
        sid = (svc or {}).get("id") or (svc or {}).get("@id")
        return (sid.rstrip("/") + "/full/!1800,1800/0/default.jpg") if sid else body["id"], "Yale University Art Gallery (CC0)"
    raise ValueError("sin fuente importable")
def main():
    p = ROOT / "data/laminas-historicas.json"; d = json.loads(p.read_text(encoding="utf8")); report = []
    for e in d["entries"]:
        dest = ROOT / e["local"]
        if e.get("status") == "en el repositorio" or (dest.exists() and dest.stat().st_size > 2000):
            if dest.exists(): e["status"] = "en el repositorio"
            continue
        try:
            url, prov = image_url(e)
            data, kind = get(url, "image/*")
            if len(data) < 2000 or not (kind.startswith("image/") or data[:3] == b"\xff\xd8"): raise ValueError("respuesta no es una imagen: " + kind)
            dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(data)
            e["status"] = "en el repositorio"; e["importedFrom"] = url; e["provider"] = prov; e["imported"] = time.strftime("%Y-%m-%d")
            report.append("OK " + e["id"] + " " + str(len(data)))
        except Exception as ex:
            e["status"] = "por importar"; e["importError"] = str(ex)[:200]; report.append("FALLO " + e["id"] + ": " + str(ex)[:120])
        time.sleep(1)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print("\n".join(report))
if __name__ == "__main__":
    main()
