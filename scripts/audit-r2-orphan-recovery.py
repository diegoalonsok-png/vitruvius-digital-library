#!/usr/bin/env python3
"""Read-only forensic report of R2 PDF/OCR objects not in GitHub's catalogue.

The report is not an editorial registration and never mutates or deletes R2 data.
Check object metadata, paired OCR, per-edition index and source identities.
No claim about complete historical PDF identity or verified translation is made.
"""
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CAT = ROOT / "data/r2/catalogo-clasicos-r2.json"
CAND = ROOT / "data/r2/clasicos-candidatos.json"
OUT = ROOT / "data/r2/r2-orphan-recovery-audit.json"
BUCKET = os.getenv("R2_BUCKET") or "vitruvius-bibliotheca"
ACCOUNT = os.getenv("R2_ACCOUNT_ID") or "4e936bf2c4f185a87075ca506de93e69"
BASE = "https://libros.vitruvius-digital-library.org/"
MAX_JSON_BYTES = 25 * 1024 * 1024


def read(path):
    return json.loads(path.read_text(encoding="utf8"))


def write(report):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"status": report["status"], "counts": report["counts"],
                      "pendingIds": [r["id"] for r in report["entries"]]}, ensure_ascii=False))


def keys(client, prefix):
    result = set()
    paging = client.get_paginator("list_objects_v2")
    for page in paging.paginate(Bucket=BUCKET, Prefix=prefix):
        result.update(r["Key"] for r in page.get("Contents", []))
    return result


def head(client, key, present):
    if key not in present:
        return {"exists": False}
    try:
        obj = client.head_object(Bucket=BUCKET, Key=key)
        metadata = obj.get("Metadata", {})
        return {
            "exists": True, "bytes": int(obj.get("ContentLength", 0)),
            "sha256Metadata": metadata.get("sha256"),
            "archiveIdentifier": metadata.get("ia"),
            "etag": str(obj.get("ETag", "")).strip('"'),
        }
    except Exception as error:
        return {"exists": None, "error": str(error)[:250]}


def read_json(client, key, h):
    if not h.get("exists"):
        return None, None, "Object not present or HEAD unavailable"
    if h.get("bytes", 0) > MAX_JSON_BYTES:
        return None, None, "JSON exceeds forensic size limit"
    try:
        blob = client.get_object(Bucket=BUCKET, Key=key)["Body"].read(MAX_JSON_BYTES + 1)
        if len(blob) > MAX_JSON_BYTES:
            return None, None, "JSON exceeds forensic size limit"
        return json.loads(blob), hashlib.sha256(blob).hexdigest(), None
    except Exception as error:
        return None, None, str(error)[:250]


def main():
    catalog = read(CAT)["items"]
    existing = {row["id"] for row in catalog}
    candidates = {row["id"]: row for row in read(CAND)["obras"]}
    report = {
        "schema": "vdl-r2-uncatalogued-recovery-v1",
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "not-verified", "counts": {}, "entries": [],
        "method": "R2 LIST/HEAD and JSON GET, no PDF download, no source autopsy, no R2 writes.",
        "editorialWarning": "Objetos aún sin ficha: no acreditar autor, edición, idioma, dominio público o exactitud OCR hasta cotejar el documento y sus metadatos externos.",
    }
    if not all(os.getenv(k) for k in ("R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")):
        report["status"] = "credentials-missing"
        write(report)
        sys.exit("R2 no disponible; no se puede certificar conciliación")
    import boto3
    client = boto3.client("s3", endpoint_url="https://" + ACCOUNT + ".r2.cloudflarestorage.com",
                          region_name="auto", aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                          aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"])
    pdfkeys = keys(client, "clasicos/pdf/")
    ocrkeys = keys(client, "clasicos/texto/")
    indexkeys = keys(client, "clasicos/indice-obras/")
    def ids_for(paths, prefix, ext):
        return {p[len(prefix):-len(ext)] for p in paths
                if p.startswith(prefix) and p.endswith(ext)
                and re.fullmatch(r"[a-z0-9-]+", p[len(prefix):-len(ext)])}
    pdfids = ids_for(pdfkeys, "clasicos/pdf/", ".pdf")
    ocrids = ids_for(ocrkeys, "clasicos/texto/", ".json")
    pending = sorted((pdfids | ocrids) - existing)
    for ident in pending:
        pkey, tkey, ikey = ("clasicos/pdf/" + ident + ".pdf",
                             "clasicos/texto/" + ident + ".json",
                             "clasicos/indice-obras/" + ident + ".json")
        p = head(client, pkey, pdfkeys)
        t = head(client, tkey, ocrkeys)
        idx = head(client, ikey, indexkeys)
        td, tdsha, terr = read_json(client, tkey, t)
        ix, ixsha, ixerr = read_json(client, ikey, idx)
        problems = []
        if not p.get("exists") or not t.get("exists"):
            problems.append("PDF or OCR missing or HEAD unverified")
        if not idx.get("exists"):
            problems.append("Per-edition reading index missing or HEAD unverified")
        if not p.get("sha256Metadata") or not p.get("archiveIdentifier"):
            problems.append("PDF missing IA/SHA-256 provenance metadata")
        if terr:
            problems.append("OCR JSON: " + terr)
        if ixerr:
            problems.append("Index JSON: " + ixerr)
        if td is not None:
            if td.get("schema") != "vdl-r2-texto-paginas-1" or td.get("obra") != ident:
                problems.append("OCR schema/identity mismatch")
            if td.get("sourceSha256") != p.get("sha256Metadata"):
                problems.append("OCR PDF fingerprint mismatch")
            if td.get("fuente") != p.get("archiveIdentifier"):
                problems.append("OCR Internet Archive identifier mismatch")
        if ix is not None:
            if ix.get("schema") != "vdl-ingestion-reading-index-v1" or ix.get("workId") != ident:
                problems.append("Reading-index schema/identity mismatch")
            if ix.get("sourceSha256") != p.get("sha256Metadata"):
                problems.append("Reading-index PDF fingerprint mismatch")
            if ix.get("textSha256") != tdsha:
                problems.append("Reading-index OCR digest mismatch")
        candidate = candidates.get(ident)
        report["entries"].append({
            "id": ident, "catalogueStatus": "uncatalogued",
            "candidate": ({"authorProposed": candidate.get("autor"),
                           "workProposed": candidate.get("obra"),
                           "languageProposed": candidate.get("lengua")}
                          if candidate else None),
            "pdf": {"key": pkey, **p}, "ocr": {"key": tkey, **t},
            "readingIndex": {"key": ikey, **idx},
            "ocrPages": (len(td.get("paginas", [])) if isinstance(td, dict) else None),
            "ocrPagesWithSubstantialText": (sum(len(x.strip()) > 200 for x in td.get("paginas", [])
                                                 if isinstance(x, str))
                                            if isinstance(td, dict) else None),
            "evidenceStatus": ("internal-consistency-verified" if not problems
                               else "incomplete-or-inconsistent"),
            "problems": problems,
            "nextStep": "Verificar fuente IA, copyright, portada e identidad editorial antes de registrar esta edición.",
        })
    report["counts"] = {
        "cataloguedPdfEditions": len(existing),
        "uncataloguedEditionIds": len(pending),
        "internalConsistencyVerified": sum(r["evidenceStatus"] == "internal-consistency-verified"
                                           for r in report["entries"]),
        "incompleteOrInconsistent": sum(r["evidenceStatus"] == "incomplete-or-inconsistent"
                                       for r in report["entries"]),
    }
    report["status"] = "verified-with-pending-cataloguing" if pending else "verified-no-orphans"
    write(report)


if __name__ == "__main__":
    main()
