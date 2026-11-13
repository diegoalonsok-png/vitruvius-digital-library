#!/usr/bin/env python3
"""Sube a Cloudflare R2 los fragmentos del índice semántico de los clásicos.

El índice lo construye scripts/r2-indexar-clasicos.mjs a partir del texto que ya
está en R2. Los fragmentos NO entran al repositorio: GitHub Pages está al límite
de 1 GB y el índice local del corpus ya ocupa 39 MB. En el repositorio queda
únicamente data/r2/indice-semantico-manifest.json, que declara las cifras y la
ruta pública.

Nunca borra nada: sobrescribe el fragmento con el mismo nombre y deja intactos
los que no vuelven a generarse.

Uso: python3 scripts/r2-subir-indice.py [--origen DIR]
"""
import argparse, hashlib, json, os, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFIESTO = ROOT / "data/r2/indice-semantico-manifest.json"
CUENTA = "4e936bf2c4f185a87075ca506de93e69"
ENDPOINT = f"https://{CUENTA}.r2.cloudflarestorage.com"
BUCKET = "vitruvius-bibliotheca"
PUBLICO = "https://libros.vitruvius-digital-library.org"
PREFIJO = "clasicos/indice/"
UA = {"User-Agent": "VitruviusDigitalLibrary/1.0 (+https://vitruvius-digital-library.org)"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="/tmp/indice-r2/indice")
    args = ap.parse_args()
    origen = Path(args.origen)
    archivos = sorted(origen.glob("*.json"))
    if not archivos:
        sys.exit(f"No hay fragmentos en {origen}: ejecutar primero r2-indexar-clasicos.mjs")

    import boto3
    from botocore.config import Config
    s3 = boto3.client("s3", endpoint_url=ENDPOINT, region_name="auto",
                      aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                      config=Config(retries={"max_attempts": 8, "mode": "adaptive"},
                                    request_checksum_calculation="when_required",
                                    response_checksum_validation="when_required"))

    subidos, bytes_totales = 0, 0
    for archivo in archivos:
        cuerpo = archivo.read_bytes()
        s3.put_object(Bucket=BUCKET, Key=PREFIJO + archivo.name, Body=cuerpo,
                      ContentType="application/json; charset=utf-8",
                      CacheControl="public, max-age=86400",
                      Metadata={"sha256": hashlib.sha256(cuerpo).hexdigest()})
        subidos += 1
        bytes_totales += len(cuerpo)
        if subidos % 25 == 0:
            print(f"  {subidos}/{len(archivos)} fragmentos")

    # Verificación desde el dominio público: el índice no sirve si no se lee.
    time.sleep(3)
    url = f"{PUBLICO}/{PREFIJO}fragmentos.json"
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        publico = json.loads(r.read())
    local = json.loads((origen / "fragmentos.json").read_text(encoding="utf-8"))
    if publico.get("fragmentos", []) != local.get("fragmentos", []):
        sys.exit("El listado público de fragmentos no coincide con el generado")
    muestra = local["fragmentos"][0]["f"]
    with urllib.request.urlopen(urllib.request.Request(f"{PUBLICO}/{PREFIJO}{muestra}", headers=UA), timeout=120) as r:
        if json.loads(r.read()).get("schema") != "vdl-r2-indice-clasicos-1":
            sys.exit(f"El fragmento público {muestra} no tiene el esquema esperado")

    datos = json.loads(MANIFIESTO.read_text(encoding="utf-8"))
    datos["publicado"] = time.strftime("%Y-%m-%d")
    datos["verificado"] = f"Listado y fragmento de muestra leídos desde {PUBLICO}/{PREFIJO}"
    MANIFIESTO.write_text(json.dumps(datos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{subidos} fragmentos subidos · {bytes_totales/1048576:.1f} MB · verificado en el dominio público")


if __name__ == "__main__":
    main()
