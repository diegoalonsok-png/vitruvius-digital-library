#!/usr/bin/env python3
"""OCR de las dos ediciones de Barbaro (Venecia, 1567) para búsqueda y sincronización.

Italiano: e-rara DOI 10.3931/e-rara-19468 (manifiesto 6125674).
Latín:    e-rara DOI 10.3931/e-rara-19438 (manifiesto 6105281), Stiftung Bibliothek Werner Oechslin.
Ambos con Public Domain Mark. Se descargan las imágenes IIIF a 1200 px (sin guardarlas en el repositorio),
se reconocen con Tesseract (ita / lat) y se guarda:
  data/text/barbaro-1567-{it,la}.json   texto por imagen digital, con la etiqueta de página impresa
  data/ocr/barbaro-1567-{it,la}/NNNN.json   palabras con su caja (milésimas del ancho y alto) para resaltar
  data/iiif/barbaro-latin-1567.json     índice de imágenes de la edición latina (para el visor)
El OCR de tipografía del siglo XVI tiene errores: se presenta siempre como texto de consulta, no como edición.
"""
import concurrent.futures as cf, csv, io, json, os, pathlib, subprocess, sys, time, urllib.request

# Un hilo por proceso de Tesseract: con varios trabajos en paralelo, OpenMP saturaba los núcleos y
# una página podía tardar más de cinco minutos.
os.environ.setdefault("OMP_THREAD_LIMIT", "1")

ROOT = pathlib.Path(__file__).resolve().parents[1]
HEADERS = {"User-Agent": "VitruviusDigitalLibrary/1.0 (research archive; https://github.com/diegoalonsok-png/vitruvius-digital-library)",
           "Accept": "application/json,image/jpeg,*/*"}
EDITIONS = {
    "it": {"manifest": "https://www.e-rara.ch/i3f/v20/6125674/manifest", "lang": "ita", "index": ROOT / "data/iiif/barbaro-1567.json"},
    "la": {"manifest": "https://www.e-rara.ch/i3f/v20/6105281/manifest", "lang": "lat", "index": ROOT / "data/iiif/barbaro-latin-1567.json"},
}

def fetch(url, attempts=5):
    err = None
    for i in range(attempts):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=90) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"No se pudo descargar {url}: {err}")

def label_of(c):
    s = c.get("label", "")
    if isinstance(s, str):
        return s
    return " · ".join(str(t) for v in s.values() for t in v)

def canvases(manifest):
    doc = json.loads(fetch(manifest))
    items = doc.get("sequences", [{}])[0].get("canvases") or doc.get("items") or []
    out = []
    for n, c in enumerate(items, 1):
        body = (c.get("images") or [{}])[0].get("resource") or (((c.get("items") or [{}])[0].get("items") or [{}])[0].get("body")) or {}
        svc = body.get("service") or body.get("services") or {}
        if isinstance(svc, list):
            svc = svc[0] if svc else {}
        sid = str(svc.get("@id") or svc.get("id") or "").rstrip("/")
        out.append({"page": n, "iiif_label": label_of(c), "canvas_id": c.get("@id") or c.get("id"),
                    "image_url": (sid + "/full/1200,/0/default.jpg") if sid else (body.get("@id") or body.get("id") or "")})
    return out

def ocr(image_bytes, lang):
    try:
        p = subprocess.run(["tesseract", "stdin", "stdout", "-l", lang, "--psm", "3", "tsv"], input=image_bytes,
                           capture_output=True, timeout=240)
    except subprocess.TimeoutExpired:
        return {"w": 0, "h": 0, "words": [], "error": "timeout"}, ""
    rows = list(csv.reader(io.StringIO(p.stdout.decode("utf-8", "replace")), delimiter="\t", quoting=csv.QUOTE_NONE))
    if not rows:
        return {"w": 0, "h": 0, "words": []}, ""
    head = rows[0]
    idx = {k: i for i, k in enumerate(head)}
    W = H = 0
    words, lines, cur, last = [], [], [], None
    for r in rows[1:]:
        if len(r) < len(head):
            continue
        if r[idx["level"]] == "1":
            W, H = int(r[idx["width"]]), int(r[idx["height"]])
            continue
        if r[idx["level"]] != "5":
            continue
        t = r[idx["text"]].strip()
        if not t:
            continue
        key = (r[idx["block_num"]], r[idx["par_num"]], r[idx["line_num"]])
        if last is not None and key != last:
            lines.append(" ".join(cur)); cur = []
        last = key; cur.append(t)
        x, y, w, h = (int(r[idx[k]]) for k in ("left", "top", "width", "height"))
        if W and H:
            words.append([t, round(1000 * x / W), round(1000 * y / H), round(1000 * w / W), round(1000 * h / H), len(lines)])
    if cur:
        lines.append(" ".join(cur))
    return {"w": W, "h": H, "words": words}, "\n".join(lines)

def run(ed):
    cfg = EDITIONS[ed]
    pages = canvases(cfg["manifest"])
    if ed == "la":
        cfg["index"].write_text(json.dumps({"schema": "vitruvius-iiif-index/1",
            "title": "Vitruvius, De architectura libri decem cum commentariis Danielis Barbari (Venecia, 1567)",
            "iiif_manifest": cfg["manifest"], "record": "https://doi.org/10.3931/e-rara-19438",
            "institution": "Stiftung Bibliothek Werner Oechslin, Einsiedeln", "rights": "Public Domain Mark",
            "total": len(pages), "canvases": pages}, ensure_ascii=False, indent=0), encoding="utf-8")
    outdir = ROOT / f"data/ocr/barbaro-1567-{ed}"; outdir.mkdir(parents=True, exist_ok=True)
    texts = [None] * len(pages)

    def one(c):
        f = outdir / f"{c['page']:04d}.json"
        if f.exists():
            d = json.loads(f.read_text(encoding="utf-8"))
            return c, d.get("text", "")
        try:
            boxes, text = ocr(fetch(c["image_url"]), cfg["lang"])
        except Exception as e:  # una imagen que falla no detiene el resto
            print("aviso", ed, c["page"], e, flush=True)
            return c, ""
        boxes["text"] = text
        f.write_text(json.dumps(boxes, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return c, text

    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        for n, (c, text) in enumerate(pool.map(one, pages), 1):
            texts[c["page"] - 1] = {"page": c["page"], "label": c["iiif_label"], "text": text}
            if n % 10 == 0:
                print(ed, n, "/", len(pages), flush=True)
    (ROOT / f"data/text/barbaro-1567-{ed}.json").write_text(json.dumps(texts, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(ed, "OCR listo:", len(texts), "imágenes")

if __name__ == "__main__":
    for ed in (sys.argv[1:] or ["it", "la"]):
        run(ed)
