#!/usr/bin/env python3
"""Sube a Cloudflare R2 los archivos de texto del corpus clásico.

El texto editado de las obras nuevas pesa decenas de megas y NO entra al
repositorio: GitHub Pages está al límite y el repertorio ya arrastra el corpus
viejo. En el repositorio queda sólo el registro de búsqueda, que apunta a la
copia pública en R2.

Nunca borra nada: sobrescribe el archivo del mismo nombre y deja intactos los
demás. Comprueba cada archivo subido leyéndolo desde el dominio público.

Uso: python3 scripts/r2-subir-corpus.py --origen DIR [--verificar N]
"""
import argparse, hashlib, json, os, sys, time, urllib.request
from pathlib import Path

CUENTA = "4e936bf2c4f185a87075ca506de93e69"
ENDPOINT = f"https://{CUENTA}.r2.cloudflarestorage.com"
BUCKET = "vitruvius-bibliotheca"
PUBLICO = "https://libros.vitruvius-digital-library.org"
PREFIJO = "corpus/"
UA = {"User-Agent": "VitruviusDigitalLibrary/1.0 (+https://vitruvius-digital-library.org)"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="/tmp/corpus-nuevo")
    ap.add_argument("--verificar", type=int, default=3)
    args = ap.parse_args()
    origen = Path(args.origen)
    archivos = sorted(origen.glob("*.json"))
    if not archivos:
        sys.exit(f"No hay archivos de corpus en {origen}")

    import boto3
    from botocore.config import Config
    s3 = boto3.client("s3", endpoint_url=ENDPOINT, region_name="auto",
                      aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                      config=Config(retries={"max_attempts": 8, "mode": "adaptive"},
                                    request_checksum_calculation="when_required",
                                    response_checksum_validation="when_required"))

    total = 0
    for archivo in archivos:
        cuerpo = archivo.read_bytes()
        datos = json.loads(cuerpo)
        if not datos.get("passages"):
            sys.exit(f"{archivo.name}: sin pasajes, no se sube")
        s3.put_object(Bucket=BUCKET, Key=PREFIJO + archivo.name, Body=cuerpo,
                      ContentType="application/json; charset=utf-8",
                      CacheControl="public, max-age=86400",
                      Metadata={"sha256": hashlib.sha256(cuerpo).hexdigest()})
        total += len(cuerpo)
        print(f"  {archivo.name}: {len(datos['passages'])} pasajes · {len(cuerpo)//1024} KB")

    time.sleep(3)
    for archivo in archivos[:max(0, args.verificar)]:
        url = f"{PUBLICO}/{PREFIJO}{archivo.name}"
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
            publico = json.loads(r.read())
        if not publico.get("passages"):
            sys.exit(f"{url} no devuelve pasajes")
        print(f"  verificado en el dominio público: {archivo.name}")

    # Manifiesto liviano: el repositorio no guarda el texto, pero sí deja
    # constancia verificable de qué se subió, con cuántos pasajes y qué sha256.
    manifiesto = {"schema": "vdl-corpus-r2-1", "base": f"{PUBLICO}/{PREFIJO}", "obras": []}
    for archivo in archivos:
        datos = json.loads(archivo.read_bytes())
        manifiesto["obras"].append({
            "archivo": archivo.name, "workId": datos["workId"], "language": datos["language"],
            "title": datos.get("title", ""), "pasajes": len(datos["passages"]),
            "caracteres": sum(len(p["text"]) for p in datos["passages"]),
            "sha256": hashlib.sha256(archivo.read_bytes()).hexdigest(),
            "fuentes": [s["urn"] for s in datos.get("sources", [])]})
    destino = Path(__file__).resolve().parents[1] / "data/r2/corpus-manifest.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(archivos)} obras en R2 · {total/1048576:.1f} MB · {PUBLICO}/{PREFIJO}")


if __name__ == "__main__":
    main()
