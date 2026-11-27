#!/usr/bin/env python3
"""Diagnóstico NO destructivo de objetos R2 que no figuran en el catálogo GitHub.

HEAD para PDF/OCR/índice y lectura parcial de la cabecera JSON del OCR.
Los metadatos no equivalen a cotejo bibliográfico ni SHA de los bytes del PDF.
No modifica archivos, no crea fichas y no elimina objetos.
"""
import datetime as dt
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "data/r2/catalogo-clasicos-r2.json"
CANDIDATES = ROOT / "data/r2/clasicos-candidatos.json"
OUT = ROOT / "data/r2/r2-orphan-reconciliation.json"
REQUIRED = "--required" in sys.argv


def write(report):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    # Retain researched external bibliographic evidence only for the same
    # provenance and declared fingerprint. It never certifies PDF bytes.
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    reviewed = {r["id"]: r.get("editorialEvidence") for r in previous.get("records", [])
                if r.get("editorialEvidence")}
    entries = {x["id"]: x for x in catalogue["items"]}
    proposed = {x["id"]: x for x in candidates["obras"]}
    report = {
        "schema": "vdl-r2-orphan-ingestions-audit-v1",
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "not-checked",
        "method": "S3 LIST + HEAD + primeros 16 KiB del OCR, sin descarga del PDF",
        "limitations": "Metadatos S3 y prefijo OCR no comprueban identidad bibliográfica, integridad SHA real ni derechos. Ningún objeto se borra ni se incorpora automáticamente al catálogo.",
        "records": [], "counts": {},
    }
    if not os.getenv("R2_ACCESS_KEY_ID") or not os.getenv("R2_SECRET_ACCESS_KEY"):
        report["status"] = "credentials-unavailable"
        # Do not erase prior evidence merely because credentials are absent.
        if not OUT.exists():
            write(report)
        if REQUIRED:
            raise SystemExit("R2 sin credenciales: no se certifica revisión de huérfanos")
        return
    import boto3
    from botocore.exceptions import ClientError
    account = os.getenv("R2_ACCOUNT_ID") or "4e936bf2c4f185a87075ca506de93e69"
    bucket = os.getenv("R2_BUCKET") or "vitruvius-bibliotheca"
    s3 = boto3.client("s3", region_name="auto",
        endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"])
    keys = set()
    args = {"Bucket": bucket, "Prefix": "clasicos/"}
    while True:
        res = s3.list_objects_v2(**args)
        keys.update(o["Key"] for o in res.get("Contents", []))
        if not res.get("IsTruncated"):
            break
        args["ContinuationToken"] = res["NextContinuationToken"]
    expected = {f"clasicos/pdf/{item_id}.pdf" for item_id in entries}
    orphan_pdfs = sorted(k for k in keys if k.startswith("clasicos/pdf/") and k.endswith(".pdf") and k not in expected)
    expected_ocr = {f"clasicos/texto/{item_id}.json" for item_id in entries}
    orphan_ocr = sorted(k for k in keys if k.startswith("clasicos/texto/") and k.endswith(".json") and k not in expected_ocr)
    orphan_ids = sorted({pathlib.PurePosixPath(k).stem for k in orphan_pdfs + orphan_ocr})
    for ident in orphan_ids:
        pdf_key = f"clasicos/pdf/{ident}.pdf"
        ocr_key = f"clasicos/texto/{ident}.json"
        index_key = f"clasicos/indice-obras/{ident}.json"
        row = {
            "id": ident, "listedCandidate": ident in proposed,
            "candidateWork": proposed.get(ident, {}).get("obra"),
            "pdfPresent": pdf_key in keys,
            "ocrPresent": ocr_key in keys,
            "editionIndexPresent": index_key in keys,
            "pdfBytes": None, "ocrBytes": None,
            "sourceIdentifierS3": None, "sourceSha256Metadata": None,
            "ocrSourceSha256": None, "ocrSourceIdentifier": None,
            "metadataHashAgree": None,
            "status": "needs-review",
        }
        try:
            if row["pdfPresent"]:
                head = s3.head_object(Bucket=bucket, Key=pdf_key)
                row["pdfBytes"] = head["ContentLength"]
                meta = head.get("Metadata", {})
                row["sourceSha256Metadata"] = meta.get("sha256")
                row["sourceIdentifierS3"] = meta.get("ia")
            if row["ocrPresent"]:
                head = s3.head_object(Bucket=bucket, Key=ocr_key)
                row["ocrBytes"] = head["ContentLength"]
                body = s3.get_object(Bucket=bucket, Key=ocr_key,
                    Range="bytes=0-16383")["Body"].read().decode("utf-8", "replace")
                for field, target in (("sourceSha256", "ocrSourceSha256"), ("fuente", "ocrSourceIdentifier")):
                    match = re.search(r'"' + re.escape(field) + r'"\s*:\s*"([^"]+)"', body)
                    if match:
                        row[target] = match.group(1)
            if row["sourceSha256Metadata"] and row["ocrSourceSha256"]:
                row["metadataHashAgree"] = row["sourceSha256Metadata"].lower() == row["ocrSourceSha256"].lower()
            if row["metadataHashAgree"] is False:
                row["status"] = "metadata-mismatch"
            elif row["pdfPresent"] and row["ocrPresent"] and row["editionIndexPresent"] and row["metadataHashAgree"] and row["sourceIdentifierS3"] == row["ocrSourceIdentifier"]:
                row["status"] = "technical-metadata-consistent-not-bibliographically-verified"
            else:
                row["status"] = "incomplete-or-unverified-metadata"
        except ClientError as exc:
            row["status"] = "read-error"
            row["errorCode"] = str(exc.response.get("Error", {}).get("Code", "unknown"))
        evidence = reviewed.get(ident)
        if (evidence and evidence.get("sourceIdentifier") == row["sourceIdentifierS3"]
                and evidence.get("sourceSha256Metadata") == row["sourceSha256Metadata"]
                and row["sourceIdentifierS3"]):
            row["editorialEvidence"] = evidence
        report["records"].append(row)
    report["counts"] = {
        "pdfWithoutCatalogue": len(orphan_pdfs),
        "ocrWithoutCatalogue": len(orphan_ocr),
        "editionCandidatesInspected": len(orphan_ids),
        "metadataConsistent": sum(r["status"] == "technical-metadata-consistent-not-bibliographically-verified" for r in report["records"]),
        "externalCatalogueChecked": sum((r.get("editorialEvidence") or {}).get("status") == "external-catalogue-checked-r2-interior-pending" for r in report["records"]),
        "identitySuspect": sum((r.get("editorialEvidence") or {}).get("status") == "identity-suspect-source-not-accessible" for r in report["records"]),
        "metadataMismatch": sum(r["status"] == "metadata-mismatch" for r in report["records"]),
        "unverifiedOrIncomplete": sum(r["status"] in ("read-error", "incomplete-or-unverified-metadata") for r in report["records"]),
    }
    report["status"] = "checked-with-pending-editorial-review" if orphan_ids else "checked-no-uncatalogued-objects"
    write(report)
    print(json.dumps({"status": report["status"], "counts": report["counts"],
        "records": [{"id": r["id"], "status": r["status"], "sourceIdentifierS3": r["sourceIdentifierS3"]}
                    for r in report["records"]]}, ensure_ascii=False))
    if any(r["status"] in ("metadata-mismatch", "read-error") for r in report["records"]):
        raise SystemExit("Discordancia o lectura fallida en metadatos R2; revisar antes de catalogar")


if __name__ == "__main__":
    main()
