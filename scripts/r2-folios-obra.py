#!/usr/bin/env python3
"""Baja los folios de una obra, uno por uno, y los aloja en Cloudflare R2.

Es el mismo procedimiento que se usó con el Códex H, con dos diferencias: las
imágenes van a R2 y no al repositorio, y la fuente se declara con sus derechos.

Fuentes admitidas, en data/r2/folios-fuentes.json:
  · «ia-iiif»: un ejemplar de Internet Archive servido por su API IIIF de
    imágenes. Se pide cada página al tamaño declarado.
  · «iiif»: cualquier manifiesto IIIF (Presentation 2 o 3). Se recorren los
    lienzos en orden y se pide cada imagen por su servicio.

Lo que NO hace, a propósito:
  · No inventa foliación. El índice guarda el número de imagen digital y deja
    «folio» y «paginaImpresa» vacíos hasta que alguien los lea en el ejemplar;
    imagen digital y folio histórico no son la misma cosa.
  · No rehospeda una digitalización cuyos derechos no lo permitan: si la fuente
    declara uso no comercial u otra restricción, hay que poner
    «rehospedar»: false, y entonces el índice guarda el enlace al visor de la
    institución en vez de la imagen propia.
  · No borra nada.

Uso: python3 scripts/r2-folios-obra.py --obra palladio-quattro-libri [--desde 1]
     [--hasta 0] [--ancho 1800] [--prueba 3]
"""
import argparse
import hashlib
import io
import json
import os
import sys
import time
import urllib.error
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FUENTES = ROOT / "data/r2/folios-fuentes.json"
INDICES = ROOT / "data/r2/folios"
CUENTA = "4e936bf2c4f185a87075ca506de93e69"
ENDPOINT = f"https://{CUENTA}.r2.cloudflarestorage.com"
BUCKET = "vitruvius-bibliotheca"
PUBLICO = "https://libros.vitruvius-digital-library.org"
UA = {"User-Agent": "VitruviusDigitalLibrary/1.0 (+https://vitruvius-digital-library.org)"}


def pedir(url, intentos=4, espera=3):
    for n in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
                return r.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            if isinstance(e, urllib.error.HTTPError) and e.code in (403, 404):
                raise
            if n == intentos - 1:
                raise
            time.sleep(espera * (n + 1))
    raise RuntimeError("sin respuesta: " + url)


def lienzos_iiif(manifiesto, ancho=0):
    """Devuelve [(etiqueta, url de imagen)] de un manifiesto IIIF 2 o 3.

    La URL se toma del servicio de imágenes que declara el propio manifiesto; no
    se construye por patrón, porque cada repositorio nombra sus recursos a su
    manera y un patrón adivinado devuelve 404.
    """
    datos = json.loads(pedir(manifiesto))
    region = f"full/{ancho},/0/default.jpg" if ancho else "full/full/0/default.jpg"
    salida = []
    if datos.get("@type") == "sc:Manifest" or "sequences" in datos:
        for sec in datos.get("sequences", []):
            for c in sec.get("canvases", []):
                for img in c.get("images", []):
                    recurso = img.get("resource", {})
                    servicio = (recurso.get("service") or {}).get("@id")
                    url = f"{servicio}/{region}" if servicio else recurso.get("@id")
                    if url:
                        salida.append((str(c.get("label") or len(salida) + 1), url))
                    break
    else:  # Presentation 3
        for c in datos.get("items", []):
            etiqueta = c.get("label") or {}
            texto = next(iter(etiqueta.values()), [len(salida) + 1])[0] if etiqueta else len(salida) + 1
            for pagina in c.get("items", []):
                for anot in pagina.get("items", []):
                    cuerpo = anot.get("body") or {}
                    servicio = (cuerpo.get("service") or [{}])
                    sid = servicio[0].get("id") if isinstance(servicio, list) and servicio else None
                    url = f"{sid}/{region}" if sid else cuerpo.get("id")
                    if url:
                        salida.append((str(texto), url))
                    break
    return salida


def paginas_ia(identificador, ancho):
    """Páginas de un ejemplar de Internet Archive, por su manifiesto IIIF."""
    meta = json.loads(pedir(f"https://archive.org/metadata/{identificador}"))
    paginas = lienzos_iiif(f"https://iiif.archive.org/iiif/3/{identificador}/manifest.json", ancho)
    return paginas, meta.get("metadata", {})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obra", required=True)
    ap.add_argument("--desde", type=int, default=1)
    ap.add_argument("--hasta", type=int, default=0)
    ap.add_argument("--ancho", type=int, default=1800)
    ap.add_argument("--prueba", type=int, default=0, help="baja sólo N folios y no sube nada")
    ap.add_argument("--miniatura", type=int, default=260,
                    help="ancho de la miniatura para la galería; 0 para no generarlas")
    ap.add_argument("--solo-miniaturas", action="store_true",
                    help="no vuelve a bajar el folio completo: sólo las miniaturas que falten")
    args = ap.parse_args()

    fuentes = json.loads(FUENTES.read_text(encoding="utf-8"))["obras"]
    if args.obra not in fuentes:
        sys.exit(f"{args.obra} no está declarada en {FUENTES.relative_to(ROOT)}")
    fuente = fuentes[args.obra]
    if not fuente.get("rehospedar", False):
        sys.exit(f"{args.obra}: la fuente no permite rehospedar las imágenes "
                 f"({fuente.get('derechos')}). El visor debe enlazar al visor de la institución.")

    if fuente["tipo"] == "ia-iiif":
        paginas, meta_ia = paginas_ia(fuente["identificador"], args.ancho)
    elif fuente["tipo"] == "iiif":
        paginas, meta_ia = lienzos_iiif(fuente["manifiesto"], args.ancho), {}
    else:
        sys.exit("tipo de fuente no admitido: " + fuente["tipo"])

    hasta = args.hasta or len(paginas)
    seleccion = paginas[args.desde - 1:hasta]
    if args.prueba:
        seleccion = seleccion[:args.prueba]
    print(f"{args.obra}: {len(paginas)} imágenes en la fuente · se procesan {len(seleccion)}")

    s3 = None
    if not args.prueba:
        import boto3
        from botocore.config import Config
        s3 = boto3.client("s3", endpoint_url=ENDPOINT, region_name="auto",
                          aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                          aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                          config=Config(retries={"max_attempts": 8, "mode": "adaptive"},
                                        request_checksum_calculation="when_required",
                                        response_checksum_validation="when_required"))

    previo = {}
    archivo_previo = INDICES / f"{args.obra}.json"
    if args.solo_miniaturas and archivo_previo.exists():
        datos = json.loads(archivo_previo.read_text(encoding="utf-8"))
        previo = {f["imagenDigital"]: f for f in datos.get("folios", [])}
        print(f"  (sólo miniaturas: se conservan los {len(previo)} folios ya alojados)")

    folios, bytes_totales = [], 0
    for n, (etiqueta, url) in enumerate(seleccion, start=args.desde):
        cuerpo = None
        if not args.solo_miniaturas:
            try:
                cuerpo = pedir(url)
            except Exception as e:  # noqa: BLE001
                print(f"  ! imagen {n}: {e}")
                continue
        nombre = f"folios/{args.obra}/f{n:04d}.jpg"
        if s3 and cuerpo is not None:
            s3.put_object(Bucket=BUCKET, Key=nombre, Body=cuerpo,
                          ContentType="image/jpeg", CacheControl="public, max-age=2592000",
                          Metadata={"sha256": hashlib.sha256(cuerpo).hexdigest()})

        # Miniatura para la galería: se pide a la fuente al ancho chico, no se
        # reescala el folio grande, de modo que pese poco y se vea nítida.
        miniatura = ""
        if args.miniatura:
            url_min = re.sub(r"/full/[^/]+/0/default\.jpg$", f"/full/{args.miniatura},/0/default.jpg", url)
            try:
                cuerpo_min = pedir(url_min, intentos=2, espera=2)
                clave_min = f"folios/{args.obra}/t{n:04d}.jpg"
                if s3:
                    s3.put_object(Bucket=BUCKET, Key=clave_min, Body=cuerpo_min,
                                  ContentType="image/jpeg", CacheControl="public, max-age=2592000")
                miniatura = f"{PUBLICO}/{clave_min}"
                bytes_totales += len(cuerpo_min)
            except Exception as e:  # noqa: BLE001
                print(f"  ! miniatura {n}: {e}")
        anterior = previo.get(n, {})
        folios.append({
            "imagenDigital": n,
            # La foliación se lee en el ejemplar; si ya estaba leída, se conserva.
            "folio": anterior.get("folio", ""),
            "paginaImpresa": anterior.get("paginaImpresa", ""),
            "libro": anterior.get("libro", ""),
            "etiquetaFuente": etiqueta,
            "imagen": f"{PUBLICO}/{nombre}",
            "miniatura": miniatura,
            "bytes": len(cuerpo) if cuerpo is not None else anterior.get("bytes", 0),
            "sha256": hashlib.sha256(cuerpo).hexdigest() if cuerpo is not None else anterior.get("sha256", ""),
        })
        if cuerpo is not None:
            bytes_totales += len(cuerpo)
        if n % 25 == 0:
            print(f"  {n}/{hasta} · {bytes_totales/1048576:.0f} MB")
        time.sleep(0.2)

    indice = {
        "schema": "vdl-folios-obra-1",
        "obra": args.obra,
        "titulo": fuente["titulo"],
        "autor": fuente["autor"],
        "edicion": fuente["edicion"],
        "lengua": fuente["lengua"],
        "fuente": fuente.get("enlaceFuente") or fuente.get("manifiesto"),
        "derechos": fuente["derechos"],
        "imagenes": len(folios),
        "imagenesEnLaFuente": len(paginas),
        "ancho": args.ancho,
        "base": f"{PUBLICO}/folios/{args.obra}/",
        "signatura": fuente.get("signatura"),
        "institucion": fuente.get("institucion"),
        "colacion": fuente.get("colacion"),
        "criterioEcdotico": "Sin collatio ni variantes verificadas; la digitalización es un testimonio de la edición, no una edición crítica.",
        "nomenclatura": ("Las imágenes se numeran por su orden digital. «folio» y «paginaImpresa» quedan "
                         "vacíos hasta leerlos en el ejemplar: imagen digital y folio histórico no son "
                         "equivalentes, y la foliación no se deduce del número de imagen."),
        "folios": folios,
    }
    if meta_ia:
        indice["metadatosFuente"] = {k: meta_ia.get(k) for k in ("title", "creator", "date", "publisher", "language", "licenseurl") if meta_ia.get(k)}

    if args.prueba:
        print(json.dumps({k: v for k, v in indice.items() if k != "folios"}, ensure_ascii=False, indent=1))
        print(f"--prueba: {len(folios)} imágenes bajadas, nada subido ni escrito.")
        return

    # Nunca publicar un índice vacío o parcial como si fuera el volumen completo.
    # Si la fuente falla, conservar el índice anterior y señalar fallo de la tarea.
    if not folios or len(folios) != len(seleccion):
        sys.exit(f"DESCARGA INCOMPLETA: {len(folios)} de {len(seleccion)} imágenes; se conserva el índice anterior.")
    if args.desde != 1 or hasta != len(paginas):
        sys.exit("Corrida parcial: no reemplazar el manifiesto completo. Ejecutar la obra entera.")

    INDICES.mkdir(parents=True, exist_ok=True)
    destino = INDICES / f"{args.obra}.json"
    destino.write_text(json.dumps(indice, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    cuerpo = json.dumps(indice, ensure_ascii=False).encode("utf-8")
    s3.put_object(Bucket=BUCKET, Key=f"folios/{args.obra}/indice-folios.json", Body=cuerpo,
                  ContentType="application/json; charset=utf-8", CacheControl="public, max-age=3600")
    print(f"\n{len(folios)} folios en R2 · {bytes_totales/1048576:.1f} MB · índice: {destino.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
