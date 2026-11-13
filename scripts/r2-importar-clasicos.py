#!/usr/bin/env python3
"""Importa a Cloudflare R2 ediciones clásicas de dominio público (Internet Archive).

* Solo R2: los PDF NO entran al repositorio (GitHub Pages está al límite de 1 GB).
  En el repositorio quedan únicamente el catálogo y el índice semántico (livianos).
* No repite: salta obras ya catalogadas y PDF cuya huella SHA-256 ya está en la
  biblioteca (data/r2/manifiesto-r2.json).
* Comprobaciones por libro: fecha <= 1928 y sin marca de copyright en IA; PDF con
  capa de texto; el autor buscado aparece en las primeras páginas; SHA-256 del
  objeto descargado desde https://libros.vitruvius-digital-library.org idéntico.
* Índice semántico: términos atestiguados del diccionario Conceptus
  (data/lexicon/conceptus.json) buscados página por página en el OCR. Se declara
  como OCR no revisado: localiza páginas, no reemplaza la lectura.
* Nunca borra nada, ni en R2 ni en el repositorio.
"""
import hashlib, io, json, os, sys, time, urllib.parse, urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_classics_semantic_index import dictionary, tokens  # noqa: E402

CAND = ROOT / "data/r2/clasicos-candidatos.json"
CATALOGO = ROOT / "data/r2/catalogo-clasicos-r2.json"
CONCEPTUS_OUT = ROOT / "data/r2/conceptus-clasicos-r2.json"
MANIFIESTO = ROOT / "data/r2/manifiesto-r2.json"
CONCEPTS = ROOT / "data/lexicon/conceptus.json"
CUENTA = "4e936bf2c4f185a87075ca506de93e69"
ENDPOINT = f"https://{CUENTA}.r2.cloudflarestorage.com"
BUCKET = "vitruvius-bibliotheca"
PUBLICO = "https://libros.vitruvius-digital-library.org"
UA = {"User-Agent": "VitruviusDigitalLibrary/1.0 (+https://vitruvius-digital-library.org)"}


def get(url, binario=False, intentos=4, timeout=120):
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                d = r.read()
                return d if binario else json.loads(d)
        except Exception as e:  # noqa: BLE001
            if i == intentos - 1:
                raise RuntimeError(f"{url[:120]}: {e}")
            time.sleep(3 * (i + 1))


def fold(s):
    return " ".join(tokens(s))


def buscar_ia(o, anio_max):
    base = f'creator:({o["creador"]}) AND mediatype:texts AND date:[1800-01-01 TO {anio_max}-12-31]'
    kw = " AND ".join(f'title:("{t}")' for t in o["titulo"])
    consultas = [f'{base} AND {kw} AND title:("english translation")', f"{base} AND {kw}"]
    vistos, out = set(), []
    for q in consultas:
        url = ("https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
            {"q": q, "rows": 30, "output": "json", "sort[]": "downloads desc"}) +
            "&fl[]=identifier&fl[]=title&fl[]=date&fl[]=creator&fl[]=volume&fl[]=language")
        for d in get(url)["response"]["docs"]:
            if d["identifier"] not in vistos:
                vistos.add(d["identifier"])
                out.append(d)
    return out


def elegir_pdf(ident, anio_max, max_bytes):
    meta = get(f"https://archive.org/metadata/{ident}")
    m = meta.get("metadata", {})
    anio = str(m.get("date", ""))[:4]
    if not anio.isdigit() or int(anio) > anio_max:
        raise ValueError(f"fecha {anio!r} fuera de dominio público")
    estado = m.get("possible-copyright-status") or ""
    if estado and estado != "NOT_IN_COPYRIGHT":
        raise ValueError("estado de derechos: " + estado)
    pdfs = [f for f in meta.get("files", []) if f.get("name", "").lower().endswith(".pdf") and f.get("size")
            and int(f["size"]) <= max_bytes]
    pdfs.sort(key=lambda f: (f.get("format") != "Text PDF", int(f["size"])))
    if not pdfs:
        raise ValueError("sin PDF dentro del límite de tamaño")
    return m, pdfs[0], anio


def es_loeb(titulo, editor, anio):
    ed = " ".join(editor) if isinstance(editor, list) else (editor or "")
    return ("english translation" in fold(titulo) and anio >= 1911
            and any(w in fold(ed) for w in ("heinemann", "putnam", "harvard")))


def procesar(o, ctx):
    import fitz
    rechazos = []
    for doc in buscar_ia(o, ctx["anio_max"])[:12]:
        ident = doc["identifier"]
        if ident in o.get("excluir", []):
            continue
        try:
            titulo = doc.get("title") or ""
            if isinstance(titulo, list):
                titulo = titulo[0]
            if not all(fold(t) in fold(titulo) for t in o["titulo"]):
                raise ValueError("título no coincide")
            m, f, anio = elegir_pdf(ident, ctx["anio_max"], ctx["max_bytes"])
            datos = get(f"https://archive.org/download/{ident}/{urllib.parse.quote(f['name'])}", binario=True,
                        timeout=600)
            sha = hashlib.sha256(datos).hexdigest()
            if sha in ctx["shas"]:
                raise ValueError("PDF idéntico ya presente en la biblioteca")
            pdf = fitz.open(stream=datos, filetype="pdf")
            paginas = [p.get_text("text") for p in pdf]
            if len(paginas) < 20:
                raise ValueError(f"solo {len(paginas)} páginas")
            con_texto = sum(1 for t in paginas if len(t.strip()) > 200)
            if con_texto < len(paginas) * 0.4:
                raise ValueError("sin capa de texto suficiente")
            portada = fold(" ".join(paginas[:20]))
            if fold(o["creador"]).split()[0] not in portada:
                raise ValueError("el autor no aparece en las primeras páginas")
            clave_pdf = f"clasicos/pdf/{o['id']}.pdf"
            clave_txt = f"clasicos/texto/{o['id']}.json"
            texto = json.dumps({"schema": "vdl-r2-texto-paginas-1", "obra": o["id"], "fuente": ident,
                                "aviso": "OCR de Internet Archive sin revisar", "paginas": paginas},
                               ensure_ascii=False).encode()
            s3 = ctx["s3"]
            s3.put_object(Bucket=BUCKET, Key=clave_pdf, Body=datos, ContentType="application/pdf",
                          CacheControl="public, max-age=31536000", Metadata={"sha256": sha, "ia": ident})
            s3.put_object(Bucket=BUCKET, Key=clave_txt, Body=texto, ContentType="application/json; charset=utf-8",
                          CacheControl="public, max-age=86400")
            publico = get(PUBLICO + "/" + clave_pdf, binario=True, timeout=600)
            if hashlib.sha256(publico).hexdigest() != sha:
                raise ValueError("SHA-256 del objeto público distinto")
            ficha = {
                "id": o["id"], "autor": o["autor"], "obra": o["obra"], "lengua": o["lengua"],
                "tituloEdicion": titulo, "anio": int(anio), "volumen": m.get("volume") or doc.get("volume"),
                "editor": m.get("publisher"), "creadorIA": m.get("creator"),
                "bilingueLoeb": es_loeb(titulo, m.get("publisher"), int(anio)),
                "fuente": f"https://archive.org/details/{ident}", "identificadorIA": ident,
                "derechos": "Dominio público (publicación anterior a 1929); verificado en metadatos de Internet Archive",
                "pdf": PUBLICO + "/" + clave_pdf, "texto": PUBLICO + "/" + clave_txt,
                "bytes": len(datos), "sha256": sha, "paginas": len(paginas), "paginasConTexto": con_texto,
                "verificado": "SHA-256 del objeto público idéntico; autor presente en las primeras páginas",
            }
            return ficha, paginas, rechazos
        except Exception as e:  # noqa: BLE001
            rechazos.append(f"{ident}: {str(e)[:120]}")
    return None, None, rechazos


def postings(ficha, paginas, lex):
    out = defaultdict(list)
    langs = {ficha["lengua"], "en", "la", "grc"}
    for n, texto in enumerate(paginas, 1):
        tk = tokens(texto)
        hall = set()
        for i, w in enumerate(tk):
            for lang in langs:
                for cid, term, words in lex.get(lang, {}).get(w, []):
                    if tk[i:i + len(words)] == words:
                        hall.add(cid)
        for cid in hall:
            out[cid].append(n)
    return out


def main():
    cand = json.loads(CAND.read_text(encoding="utf-8"))
    cat = json.loads(CATALOGO.read_text(encoding="utf-8")) if CATALOGO.exists() else {"items": []}
    hechos = {x["id"] for x in cat["items"]}
    shas = {x["sha256"] for x in json.loads(MANIFIESTO.read_text(encoding="utf-8"))["items"]}
    shas |= {x["sha256"] for x in cat["items"]}
    lex = dictionary(json.loads(CONCEPTS.read_text(encoding="utf-8"))["concepts"])
    con = json.loads(CONCEPTUS_OUT.read_text(encoding="utf-8")) if CONCEPTUS_OUT.exists() else {"postings": {}}

    import boto3
    from botocore.config import Config
    s3 = boto3.client("s3", endpoint_url=ENDPOINT, region_name="auto",
                      aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                      config=Config(retries={"max_attempts": 8, "mode": "adaptive"},
                                    request_checksum_calculation="when_required",
                                    response_checksum_validation="when_required"))
    ctx = {"s3": s3, "shas": shas, "anio_max": cand["limites"]["anioMaximo"],
           "max_bytes": cand["limites"]["maxMiB"] * 1048576}
    pendientes = [o for o in cand["obras"] if o["id"] not in hechos]
    limite = int(os.environ.get("LIMITE", "0") or 0)
    if limite:
        pendientes = pendientes[:limite]
    print(f"pendientes: {len(pendientes)} (ya catalogadas: {len(hechos)})")
    informe = {"incorporadas": [], "no_encontradas": {}}
    with ThreadPoolExecutor(max_workers=3) as ex:
        for o, (ficha, paginas, rech) in zip(pendientes, ex.map(lambda o: procesar(o, ctx), pendientes)):
            if ficha:
                cat["items"].append(ficha)
                for cid, pags in postings(ficha, paginas, lex).items():
                    con["postings"].setdefault(cid, {})[ficha["id"]] = {"paginas": pags[:60], "total": len(pags)}
                informe["incorporadas"].append(ficha["id"])
                print(f"OK  {o['id']}: {ficha['identificadorIA']} ({ficha['anio']}, {ficha['paginas']} págs, "
                      f"{ficha['bytes']/1048576:.1f} MB)", flush=True)
                guardar(cat, con, informe)  # guardado incremental: un corte no pierde lo ya subido
            else:
                informe["no_encontradas"][o["id"]] = rech[:6]
                print(f"--  {o['id']}: sin edición que pase los controles ({len(rech)} descartes)", flush=True)
    guardar(cat, con, informe)
    print(f"incorporadas: {len(informe['incorporadas'])} · sin edición: {len(informe['no_encontradas'])} · "
          f"catálogo: {cat['total']} obras, {cat['bytes']/1048576:.0f} MB")


def guardar(cat, con, informe):
    cat.update({"schema": "vdl-r2-catalogo-clasicos-1", "actualizado": time.strftime("%Y-%m-%d"),
                "descripcion": "Ediciones clásicas de dominio público alojadas en Cloudflare R2 "
                               "(libros.vitruvius-digital-library.org). No duplican los PDF del repositorio.",
                "total": len(cat["items"]), "bytes": sum(x["bytes"] for x in cat["items"])})
    cat["items"].sort(key=lambda x: (x["lengua"], x["autor"], x["obra"]))
    CATALOGO.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    con.update({"schema": "vdl-r2-conceptus-1",
                "metodo": "Términos atestiguados del diccionario Conceptus (latín, griego, inglés y lengua de la "
                          "obra) buscados página por página en el OCR de Internet Archive; normalización de "
                          "acentos, mayúsculas e i/j u/v como en el índice semántico del corpus. OCR no revisado: "
                          "las páginas son localizaciones para leer, no citas verificadas. Hasta 60 páginas por "
                          "concepto y obra; 'total' da el número completo.",
                "obras": len(cat["items"])})
    CONCEPTUS_OUT.write_text(json.dumps(con, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    Path("r2-clasicos-informe.json").write_text(json.dumps(informe, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
