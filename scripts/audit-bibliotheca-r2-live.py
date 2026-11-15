#!/usr/bin/env python3
"""Audita objetos R2 sin descargar los PDF (inventario S3 y manifiesto de índices).

La existencia de una clave acredita almacenamiento, NO calidad OCR, identidad
filológica ni texto cotejado. Ante un error no declara éxito ni borra objetos.
Uso: python scripts/audit-bibliotheca-r2-live.py [--required]
"""
import datetime as dt
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CAT = ROOT / "data/r2/catalogo-clasicos-r2.json"
CORPUS = ROOT / "data/r2/corpus-manifest.json"
PANEL = ROOT / "data/r2/bibliotheca-panel-sync.json"
REPORT = ROOT / "data/r2/bibliotheca-r2-live-audit.json"
ACCOUNT = os.getenv("R2_ACCOUNT_ID") or "4e936bf2c4f185a87075ca506de93e69"
BUCKET = os.getenv("R2_BUCKET") or "vitruvius-bibliotheca"
BASE = "https://libros.vitruvius-digital-library.org/"
REQUIRED = "--required" in sys.argv

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def key(url):
    if not isinstance(url, str) or not url.startswith(BASE):
        raise ValueError("URL de objeto R2 fuera del dominio autorizado")
    result = urlparse(url)
    if result.query or result.fragment:
        raise ValueError("URL de R2 con parámetros no permitidos")
    return result.path.lstrip("/")

def main():
    pdfs = read(CAT)["items"]
    remote = read(CORPUS)
    panel = read(PANEL)
    result = {
        "schema": "vdl-bibliotheca-r2-object-audit-v1",
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "not-checked", "objectIdentityCheck": "metadata only, no full PDF SHA re-download",
        "count": {}, "missing": {}, "indexedExtraIds": [], "issues": [],
    }
    credentials = all((os.getenv("R2_ACCESS_KEY_ID"), os.getenv("R2_SECRET_ACCESS_KEY")))
    if not credentials:
        result["status"] = "credentials-unavailable"
        result["issues"].append("No se pudo consultar inventario privado R2; no declarar comprobación exitosa.")
        write(REPORT, result)
        if REQUIRED:
            sys.exit("Faltan credenciales R2 para el control obligatorio")
        return
    import boto3
    s3 = boto3.client("s3", region_name="auto",
        endpoint_url="https://" + ACCOUNT + ".r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"])
    objects = set()
    for prefix in ("clasicos/", "corpus/"):
        args = {"Bucket": BUCKET, "Prefix": prefix}
        while True:
            response = s3.list_objects_v2(**args)
            for row in response.get("Contents", []):
                objects.add(row["Key"])
            if not response.get("IsTruncated"):
                break
            args["ContinuationToken"] = response["NextContinuationToken"]
    expected_pdf = {key(row["pdf"]) for row in pdfs}
    expected_ocr = {key(row["texto"]) for row in pdfs}
    expected_index = {"clasicos/indice-obras/" + row["id"] + ".json" for row in pdfs}
    expected_corpus = {remote["base"].removeprefix(BASE) + e["archivo"] for e in remote["obras"]}
    expected = {
        "pdf": expected_pdf, "ocr": expected_ocr, "editionIndex": expected_index,
        "originalText": expected_corpus,
    }
    for category, keys in expected.items():
        result["missing"][category] = sorted(keys - objects)
    index_key = "clasicos/indice/fragmentos.json"
    r2_index_ids = set()
    if index_key not in objects:
        result["issues"].append("Falta el índice principal de facsímiles: " + index_key)
    else:
        body = s3.get_object(Bucket=BUCKET, Key=index_key)["Body"].read()
        listing = json.loads(body)
        r2_index_ids = {e["id"] for e in listing.get("obras", [])}
        result["indexedExtraIds"] = sorted(r2_index_ids - {e["id"] for e in pdfs})
        result["missingIndexIds"] = sorted({e["id"] for e in pdfs} - r2_index_ids)
        listed_fragments = {e["f"] for e in listing.get("fragmentos", [])}
        result["missing"]["indexFragments"] = sorted(
            "clasicos/indice/" + name for name in listed_fragments
            if "clasicos/indice/" + name not in objects
        )
        result["count"]["indexListedWorks"] = len(r2_index_ids)
        result["count"]["indexListedFragments"] = len(listed_fragments)
    result["count"].update({
        "r2ObjectsScanned": len(objects), "pdfExpected": len(expected_pdf),
        "pdfPresent": len(expected_pdf & objects),
        "ocrExpected": len(expected_ocr), "ocrPresent": len(expected_ocr & objects),
        "editionIndexesPresent": len(expected_index & objects),
        "corpusOriginalsPresent": len(expected_corpus & objects),
    })
    if result["indexedExtraIds"]:
        result["issues"].append("El índice menciona " + str(len(result["indexedExtraIds"])) +
                                " ID(s) sin entrada PDF actual; revisar antes de eliminar o fusionar.")
    if result.get("missingIndexIds"):
        result["issues"].append("Hay PDF catalogados ausentes del índice invertido.")
    if any(result["missing"].values()):
        result["issues"].append("Algunos objetos R2 declarados faltan en el almacenamiento; revisar antes de anunciar disponibilidad.")
    result["status"] = "checked-with-discrepancies" if result["issues"] else "checked"
    panel["summary"]["liveR2ObjectCheck"] = True
    panel["summary"]["r2ObjectsScanned"] = len(objects)
    panel["summary"]["r2PdfObjectsPresent"] = len(expected_pdf & objects)
    panel["summary"]["r2CorpusTextsPresent"] = len(expected_corpus & objects)
    panel["r2LiveEvidence"] = {
        "generated": result["generated"], "status": result["status"],
        "indexExtraIds": result["indexedExtraIds"],
        "missing": {k: v[:15] for k, v in result["missing"].items() if v}
    }
    for issue in result["issues"]:
        if issue not in panel["issues"]:
            panel["issues"].append(issue)
    write(REPORT, result)
    write(PANEL, panel)
    print(json.dumps({"status": result["status"], "counts": result["count"],
                      "extraIndexIds": result["indexedExtraIds"],
                      "missingCounts": {k: len(v) for k, v in result["missing"].items()}}, ensure_ascii=False))
    if REQUIRED and any(result["missing"].values()):
        sys.exit("Control R2 detectó objetos faltantes: detener nuevas incorporaciones")

if __name__ == "__main__":
    main()
