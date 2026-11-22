#!/usr/bin/env python3
"""Indexa fuentes TEI verificadas de obras pendientes SOLO en Cloudflare R2.

No escribe texto completo ni índices voluminosos en GitHub. No sobrescribe
objetos existentes: su SHA-256 debe ser idéntico o la publicación se detiene.
Conserva las 44+ versiones previas del manifiesto y del registro bibliográfico.
Los loci corresponden a la edición TEI fuente, NO a páginas de un facsímil.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / "data/r2/bibliotheca-tei-pendientes.json"
INVENTORY = ROOT / "data/r2/bibliotheca-inventario-unificado.json"
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
MANIFEST = ROOT / "data/r2/corpus-manifest.json"
BASE = "https://libros.vitruvius-digital-library.org/corpus/"
BUCKET = "vitruvius-bibliotheca"
TEI = "{http://www.tei-c.org/ns/1.0}"
NS = {"tei": "http://www.tei-c.org/ns/1.0"}
OMIT = {"note", "bibl", "ref", "head", "app", "rdg", "fw"}
UA = {"User-Agent": "VitruviusBibliothecaTEI/1.0 (+https://vitruvius-digital-library.org)"}


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, data: dict) -> None:
    temp = path.with_name(path.name + ".staging")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    temp.replace(path)


def text_of(node: ET.Element) -> str:
    """Exclude critical apparatus without discarding the following main text."""
    result = [node.text or ""]
    for child in node:
        if child.tag.rsplit("}", 1)[-1] not in OMIT:
            result.append(text_of(child))
        result.append(child.tail or "")
    return " ".join(" ".join(result).split())


def parse_source(row: dict) -> tuple[dict, bytes]:
    source = row["source"]
    if not re.fullmatch(
        r"https://raw\.githubusercontent\.com/OpenGreekAndLatin/First1KGreek/[0-9a-f]{40}/"
        r"data/tlg0086/tlg026/tlg0086\.tlg026\.1st1K-grc2\.xml", source
    ):
        raise ValueError("Origen no fijado a un commit verificable: " + row["id"])
    with urlopen(Request(source, headers=UA), timeout=120) as response:
        raw = response.read(8_000_001)
    if len(raw) > 8_000_000:
        raise ValueError("TEI fuera del máximo de seguridad")
    root = ET.fromstring(raw)
    if root.tag != TEI + "TEI":
        raise ValueError("El archivo no es TEI XML")
    license_nodes = root.findall(".//tei:publicationStmt//tei:licence", NS)
    if not any(x.get("target") == row["licenseURL"] for x in license_nodes):
        raise ValueError("Licencia de la edición no confirmada en el TEI fuente")
    edition = root.find(".//tei:body/tei:div[@type='edition']", NS)
    if edition is None or edition.get("n") != row["ctsUrn"]:
        raise ValueError("URN o edición TEI no coincide")
    author = " ".join(root.findtext(".//tei:titleStmt/tei:author", default="", namespaces=NS).split())
    if author.casefold() != "aristotle":
        raise ValueError("Identidad del autor no confirmada: " + author)
    books = edition.findall("./tei:div[@subtype='book']", NS)
    if len(books) != 4 or [b.get("n") for b in books] != ["1", "2", "3", "4"]:
        raise ValueError("Edición griega incompleta: no presenta los cuatro libros")
    passages = []
    for book in books:
        chapters = book.findall("./tei:div[@subtype='chapter']", NS)
        if not chapters:
            raise ValueError("Faltan capítulos en libro " + str(book.get("n")))
        for chapter in chapters:
            chap = chapter.get("n")
            if not chap or not chap.isdigit():
                raise ValueError("Número de capítulo inválido")
            parts = [text_of(p) for p in chapter.findall("./tei:p", NS)]
            content = " ".join(x for x in parts if x)
            if len(content) < 80:
                raise ValueError("Capítulo sin texto: " + book.get("n") + "." + chap)
            passages.append({
                "locus": row["ctsUrn"] + ":" + book.get("n") + "." + chap,
                "text": content,
                "title": row["title"],
            })
    if len({p["locus"] for p in passages}) != len(passages):
        raise ValueError("Loci editoriales duplicados")
    characters = sum(len(p["text"]) for p in passages)
    greek_letters = sum(len(re.findall(r"[\u0370-\u03ff\u1f00-\u1fff]", p["text"])) for p in passages)
    if len(passages) < 30 or characters < 50000 or greek_letters < characters * 0.45:
        raise ValueError(f"Edición demasiado corta o no griega: {len(passages)} pasajes, {characters} caracteres")
    source_sha = hashlib.sha256(raw).hexdigest()
    doc = {
        "schema": "vdl-tei-greek-edition-r2-v1",
        "workId": row["id"], "language": row["language"], "title": row["title"],
        "sourceType": "edited-greek-tei",
        "editorialStatus": "Texto griego de edición TEI acreditada; sin nueva recensio ni cotejo autóptico",
        "source": source, "sourceSha256": source_sha,
        "sourceUrn": row["ctsUrn"], "attribution": row["sourceEdition"],
        "license": row["license"], "licenseURL": row["licenseURL"],
        "alignment": "Capítulos identificados con URN CTS del TEI; no inferir correspondencia de folio ni con traducción sin cotejo",
        "passages": passages,
    }
    blob = (json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    return doc, blob


def get_s3():
    import boto3
    from botocore.config import Config
    account = os.environ.get("R2_ACCOUNT_ID") or "4e936bf2c4f185a87075ca506de93e69"
    for name in ("R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        if not os.environ.get(name):
            raise ValueError("Falta credencial R2: " + name)
    return boto3.client(
        "s3", endpoint_url="https://" + account + ".r2.cloudflarestorage.com",
        region_name="auto", aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(retries={"max_attempts": 7, "mode": "adaptive"},
                      request_checksum_calculation="when_required",
                      response_checksum_validation="when_required"),
    )


def publish(s3, row: dict, blob: bytes) -> str:
    from botocore.exceptions import ClientError
    filename = row["id"] + "-" + row["language"] + ".json"
    key = "corpus/" + filename
    sha = hashlib.sha256(blob).hexdigest()
    try:
        current = s3.get_object(Bucket=BUCKET, Key=key)
    except ClientError as exc:
        code = str(exc.response.get("Error", {}).get("Code", ""))
        if code not in ("404", "NoSuchKey", "NotFound"):
            raise
        current = None
    if current is not None:
        existing = current["Body"].read()
        if hashlib.sha256(existing).hexdigest() != sha:
            raise ValueError("R2 contiene una edición diferente bajo la clave " + key + "; no sobrescribir")
        print("Ya existe el mismo texto exacto en R2:", filename, flush=True)
    else:
        s3.put_object(
            Bucket=BUCKET, Key=key, Body=blob,
            ContentType="application/json; charset=utf-8",
            CacheControl="public, max-age=86400",
            Metadata={"sha256": sha, "cts": "tlg0086.tlg026", "source_sha256": row["sourceSha256"]},
        )
        print("Subido a R2:", filename, flush=True)
    remote = BASE + filename
    for attempt in range(6):
        try:
            with urlopen(Request(remote, headers=UA), timeout=120) as response:
                response_blob = response.read(len(blob) + 1)
            if hashlib.sha256(response_blob).hexdigest() == sha:
                return remote
        except HTTPError:
            pass
        time.sleep(min(2 + attempt * 3, 15))
    raise ValueError("La respuesta pública R2 no coincide con SHA256: " + filename)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Solo comprobar identidad y cola")
    args = parser.parse_args()
    queue = read(QUEUE)
    inventory = read(INVENTORY)
    registry = read(REGISTRY)
    manifest = read(MANIFEST)
    if queue.get("schema") != "vdl-bibliotheca-tei-pendientes-r2-v1":
        raise ValueError("Cola de fuentes con esquema inesperado")
    works = {x["id"]: x for x in [*inventory["works"], *inventory["supplementaryWorks"], *inventory["additionalWorks"]]}
    existing = {(x["workId"], x["language"]) for x in registry["entries"]}
    pending = []
    for row in queue["obras"]:
        ident = row["id"]
        if ident not in works:
            raise ValueError("Obra sin ficha en catálogo: " + ident)
        if row["language"] != "grc" or row["license"] != "CC BY-SA 4.0":
            raise ValueError("Idioma/licencia de fuente sin acreditación")
        if (ident, row["language"]) in existing:
            print("Salta original ya indexado:", ident)
            continue
        if works[ident]["locallyIndexedText"] or works[ident]["declaredRemoteIndexedText"]:
            raise ValueError("Existe ya una edición digital registrada de " + ident)
        if any(x["workId"] == ident and x["language"] == row["language"] for x in manifest["obras"]):
            raise ValueError("Edición ya inventariada en el manifiesto: " + ident)
        pending.append(row)
    if len({x["id"] for x in pending}) != len(pending):
        raise ValueError("ID duplicado en cola")
    if not pending:
        print("No hay fuentes TEI pendientes de indexar")
        return
    if args.dry_run:
        print(json.dumps({"pending": [x["id"] for x in pending]}, ensure_ascii=False))
        return
    s3 = get_s3()
    for row in pending:
        doc, blob = parse_source(row)
        row["sourceSha256"] = doc["sourceSha256"]
        url = publish(s3, row, blob)
        filename = row["id"] + "-" + row["language"] + ".json"
        sha = hashlib.sha256(blob).hexdigest()
        registry["entries"].append({
            "workId": row["id"], "author": row["author"], "title": row["title"],
            "language": row["language"], "format": "json-passages",
            "path": url, "reader": "classics-text-reader.html?work=" + row["id"] + "&lang=" + row["language"],
            "sourceDescription": row["sourceEdition"] + "; TEI CC BY-SA 4.0; cotejo independiente pendiente",
            "sha256": sha, "passages": len(doc["passages"]),
        })
        manifest["obras"].append({
            "archivo": filename, "workId": row["id"], "language": row["language"],
            "title": row["title"], "pasajes": len(doc["passages"]),
            "caracteres": sum(len(p["text"]) for p in doc["passages"]),
            "sha256": sha, "fuentes": [row["ctsUrn"]],
            "sourceSha256": doc["sourceSha256"],
            "sourceEdition": row["sourceEdition"], "license": row["license"],
        })
        print(f"VERIFICADA: {row['id']} · {len(doc['passages'])} capítulos · R2 SHA256 {sha}", flush=True)
    registry["entries"].sort(key=lambda x: (x["workId"], x["language"], x.get("edition") or ""))
    registry["count"] = len(registry["entries"])
    registry["works"] = len({x["workId"] for x in registry["entries"]})
    registry["updated"] = datetime.now(timezone.utc).date().isoformat()
    manifest["obras"].sort(key=lambda x: (x["workId"], x["language"]))
    if len({x["archivo"] for x in manifest["obras"]}) != len(manifest["obras"]):
        raise ValueError("Manifiesto de corpus R2 con archivo duplicado")
    if len({(x["workId"], x["language"]) for x in registry["entries"]}) != len(registry["entries"]):
        raise ValueError("Registro de búsqueda con obra/idioma repetido")
    remote = {x["path"] for x in registry["entries"] if x["path"].startswith(BASE)}
    declared = {BASE + x["archivo"] for x in manifest["obras"]}
    if remote != declared:
        raise ValueError("Manifiesto y registro R2 no son simétricos")
    write(REGISTRY, registry)
    write(MANIFEST, manifest)
    print(json.dumps({
        "r2TextEditions": len(manifest["obras"]),
        "registryTextVersions": registry["count"],
        "registeredWorks": registry["works"],
        "noGitHubSourceCorpus": True,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
