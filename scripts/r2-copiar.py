#!/usr/bin/env python3
"""Copia verificada de los recursos pesados de la biblioteca a Cloudflare R2.

Principios:
  * SOLO COPIA. Nunca borra ni mueve nada: ni en el repositorio ni en el bucket.
  * Idempotente: un archivo cuyo objeto en R2 ya lleva la misma huella SHA-256
    (metadato x-amz-meta-sha256) no se vuelve a subir.
  * Verificación de extremo a extremo: cada archivo subido se descarga desde el
    dominio público (https://libros.vitruvius-digital-library.org) y su SHA-256
    se compara con el del original en el repositorio. Con --verificar-todo se
    descarga y compara la colección completa.
  * Escribe un informe JSON y sale con código distinto de cero ante cualquier
    discrepancia.

Variables de entorno: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (secretos de GitHub).
"""
import argparse, hashlib, json, os, subprocess, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

CUENTA = "4e936bf2c4f185a87075ca506de93e69"
ENDPOINT = f"https://{CUENTA}.r2.cloudflarestorage.com"
BUCKET = "vitruvius-bibliotheca"
PUBLICO = "https://libros.vitruvius-digital-library.org"
CARPETAS = ("documents/", "images/")
EXTENSIONES = (".pdf", ".jpg", ".jpeg", ".webp", ".png", ".tif", ".tiff")
TIPOS = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
         ".webp": "image/webp", ".png": "image/png", ".tif": "image/tiff", ".tiff": "image/tiff"}


def archivos():
    salida = subprocess.run(["git", "ls-files", "-z", "--", *CARPETAS], capture_output=True, check=True).stdout
    return sorted(p for p in salida.decode().split("\0") if p.lower().endswith(EXTENSIONES))


def sha256(datos):
    return hashlib.sha256(datos).hexdigest()


def descargar(ruta, intentos=4):
    url = PUBLICO + "/" + urllib.parse.quote(ruta)
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "vdl-r2-verificacion/1"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == intentos - 1:
                raise RuntimeError(f"{url}: {e}")
            time.sleep(2 * (i + 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verificar-todo", action="store_true")
    ap.add_argument("--informe", default="r2-informe.json")
    ap.add_argument("--manifiesto", default="data/r2/manifiesto-r2.json")
    ap.add_argument("--solo-manifiesto", action="store_true", help="no sube: solo escribe el manifiesto local")
    a = ap.parse_args()

    lista = archivos()
    manifiesto = []
    for p in lista:
        with open(p, "rb") as f:
            d = f.read()
        manifiesto.append({"ruta": p, "bytes": len(d), "sha256": sha256(d)})
    os.makedirs(os.path.dirname(a.manifiesto), exist_ok=True)
    with open(a.manifiesto, "w", encoding="utf-8") as f:
        json.dump({"schema": "vdl-r2-manifiesto-1", "bucket": BUCKET, "publico": PUBLICO,
                   "politica": "copia sin borrado; los originales permanecen en el repositorio",
                   "archivos": len(manifiesto), "bytes": sum(m["bytes"] for m in manifiesto),
                   "items": manifiesto}, f, ensure_ascii=False, indent=0)
        f.write("\n")
    print(f"manifiesto: {len(manifiesto)} archivos, {sum(m['bytes'] for m in manifiesto)/1048576:.1f} MB")
    if a.solo_manifiesto:
        return 0

    import boto3
    from botocore.config import Config
    s3 = boto3.client("s3", endpoint_url=ENDPOINT, region_name="auto",
                      aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                      config=Config(retries={"max_attempts": 8, "mode": "adaptive"},
                                    request_checksum_calculation="when_required",
                                    response_checksum_validation="when_required"))

    # Diagnóstico previo, sin revelar valores: largo y alfabeto de cada clave.
    def forma(v):
        v = v or ""
        hexa = all(c in "0123456789abcdef" for c in v)
        return f"largo={len(v)} hex={'sí' if hexa else 'no'} espacios={'sí' if v != v.strip() else 'no'}"
    print("R2_ACCESS_KEY_ID:", forma(os.environ.get("R2_ACCESS_KEY_ID")), "(esperado: largo=32 hex=sí)")
    print("R2_SECRET_ACCESS_KEY:", forma(os.environ.get("R2_SECRET_ACCESS_KEY")), "(esperado: largo=64 hex=sí)")
    # Contraste: qué responde R2 con un identificador inventado y con un secreto inventado.
    for etiqueta, kid, sec in (("ID inventado + secreto real", "0" * 32, os.environ["R2_SECRET_ACCESS_KEY"]),
                               ("ID real + secreto inventado", os.environ["R2_ACCESS_KEY_ID"], "0" * 64)):
        c = boto3.client("s3", endpoint_url=ENDPOINT, region_name="auto", aws_access_key_id=kid,
                         aws_secret_access_key=sec, config=Config(request_checksum_calculation="when_required",
                                                                  response_checksum_validation="when_required"))
        try:
            c.list_objects_v2(Bucket=BUCKET, MaxKeys=1); print("contraste", etiqueta, ": OK (?)")
        except Exception as e:  # noqa: BLE001
            print("contraste", etiqueta, ":", str(e)[:160])
    for nombre, op in (("lectura (ListObjectsV2)", lambda: s3.list_objects_v2(Bucket=BUCKET, MaxKeys=1)),
                       ("escritura (PutObject de prueba)", lambda: s3.put_object(Bucket=BUCKET, Key="_prueba/acceso.txt", Body=b"ok", ContentType="text/plain"))):
        try:
            op(); print("prueba", nombre, ": OK")
        except Exception as e:  # noqa: BLE001
            print("prueba", nombre, ": FALLA:", str(e)[:200]); return 2

    def procesar(m):
        r = {"ruta": m["ruta"], "bytes": m["bytes"], "sha256": m["sha256"]}
        try:
            try:
                h = s3.head_object(Bucket=BUCKET, Key=m["ruta"])
                ya = h.get("Metadata", {}).get("sha256") == m["sha256"] and h["ContentLength"] == m["bytes"]
            except s3.exceptions.ClientError:
                ya = False
            if ya:
                r["accion"] = "ya-estaba"
            else:
                ext = os.path.splitext(m["ruta"])[1].lower()
                with open(m["ruta"], "rb") as f:
                    s3.put_object(Bucket=BUCKET, Key=m["ruta"], Body=f.read(),
                                  ContentType=TIPOS.get(ext, "application/octet-stream"),
                                  CacheControl="public, max-age=31536000, immutable",
                                  Metadata={"sha256": m["sha256"]})
                r["accion"] = "subido"
            if r["accion"] == "subido" or a.verificar_todo:
                r["verificado"] = sha256(descargar(m["ruta"])) == m["sha256"]
        except Exception as e:  # noqa: BLE001
            r["error"] = str(e)[:300]
        return r

    with ThreadPoolExecutor(max_workers=12) as ex:
        res = list(ex.map(procesar, manifiesto))

    errores = [r for r in res if r.get("error") or r.get("verificado") is False]
    resumen = {
        "archivos": len(res),
        "subidos": sum(r.get("accion") == "subido" for r in res),
        "ya_estaban": sum(r.get("accion") == "ya-estaba" for r in res),
        "verificados_sha256": sum(r.get("verificado") is True for r in res),
        "errores": len(errores),
    }
    with open(a.informe, "w", encoding="utf-8") as f:
        json.dump({"resumen": resumen, "errores": errores, "resultados": res}, f, ensure_ascii=False, indent=1)
    print(json.dumps(resumen, ensure_ascii=False))
    for e in errores[:30]:
        print("ERROR", e["ruta"], e.get("error", "sha256 distinto"))
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
