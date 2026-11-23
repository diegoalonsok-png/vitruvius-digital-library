#!/usr/bin/env python3
"""Bloquea libros, transcripciones e índices completos en commits automáticos de Bibliotheca.

R2 almacena obras, traducciones, TEI, PDF, facsímiles, pasajes e índices pesados.
GitHub conserva código y solo catálogos/referencias livianos; nunca se borran
archivos existentes como parte de una importación.
"""
from __future__ import annotations

import json
import subprocess
import sys

ALLOWED = {
    "data/bibliotheca-graeca-latina-I-bce-I-ce.json",
    "data/classics-corpus/search-registry.json",
    "data/r2/classics-expansion-index.json",
    "data/r2/classics-expansion-manifest.json",
    "data/r2/classics-translation-manifest.json",
    "data/classics-corpus/coverage-audit.json",
    "data/classics-corpus/translation-availability-222.json",
    "data/r2/bibliotheca-inventario-unificado.json",
    "data/cifras-corpus.json",
    "data/perseus-provenance-audit.json",
    "perseus-procedencia-textual.html",
}
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_BATCH_BYTES = 16 * 1024 * 1024

def git(*args):
    return subprocess.run(
        ["git", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
    ).stdout

def _records(document, key, label):
    """Extract stable identities: every previously published record must survive."""
    if not isinstance(document, dict):
        raise ValueError(f"{label}: formato inesperado")
    rows = document.get(key)
    if not isinstance(rows, list):
        raise ValueError(f"{label}: falta la colección {key}")
    return rows


def _identities(document, key, fields, label):
    rows = _records(document, key, label)
    ids = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f"{label}: registro no es objeto")
        identity = tuple(str(row.get(k) or "") for k in fields)
        if not all(identity):
            raise ValueError(f"{label}: falta identidad {fields}")
        if identity in ids:
            raise ValueError(f"{label}: identidad duplicada {identity}")
        ids.add(identity)
    return ids


def forbid_book_deletions(path, before, after):
    """No title, original, translation, indexed edition or archived R2 object vanishes.

    Each comparison is against Git HEAD, not the previous synchronization step.
    Metadata can grow or be enriched; an old ID/version must remain addressable.
    """
    rules = {
        "data/bibliotheca-graeca-latina-I-bce-I-ce.json": [
            ("works", ("id",)),
        ],
        "data/classics-corpus/search-registry.json": [
            ("entries", ("workId", "language", "path")),
        ],
        "data/r2/classics-expansion-manifest.json": [
            ("editions", ("workId", "language", "url")),
            ("githubPreserved", ("path", "sha256", "r2Key")),
        ],
        "data/r2/classics-translation-manifest.json": [
            ("editions", ("workId", "language", "url")),
        ],
        "data/r2/bibliotheca-inventario-unificado.json": [
            ("works", ("id",)),
            ("supplementaryWorks", ("id",)),
            ("additionalWorks", ("id",)),
        ],
    }
    for key, fields in rules.get(path, []):
        old = _identities(before, key, fields, path + " (HEAD)")
        new = _identities(after, key, fields, path + " (nuevo)")
        missing = sorted(old - new)
        if missing:
            raise ValueError(
                "CLAUSULA: NO SE BORRAN LIBROS NI EDICIONES. "
                + path + " / " + key + ": desaparecen "
                + str(len(missing)) + " registros: " + repr(missing[:5])
            )
    if path == "data/cifras-corpus.json":
        for field in ("obras", "obrasSuplementarias", "obrasAdicionales", "obrasTotalesDeclaradas"):
            if field in before and field in after and int(after[field]) < int(before[field]):
                raise ValueError(
                    "CLAUSULA: NO SE BORRAN LIBROS. Disminuye " + field
                )


def check():
    deleted = [
        x.decode() for x in git("diff", "--cached", "--name-only", "-z", "--diff-filter=D").split(b"\0") if x
    ]
    if deleted:
        raise ValueError("No borrar archivos de GitHub: " + ", ".join(deleted))
    staged = [
        x.decode() for x in git("diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR").split(b"\0") if x
    ]
    total = 0
    for path in staged:
        if path not in ALLOWED:
            raise ValueError("Archivo no autorizado en GitHub: " + path)
        raw = git("show", ":" + path)
        total += len(raw)
        if len(raw) > MAX_FILE_BYTES:
            raise ValueError("Metadatos de más de 8 MiB; trasladar a R2: " + path)
        if path.endswith(".json"):
            obj = json.loads(raw.decode("utf-8"))
            if isinstance(obj, dict) and isinstance(obj.get("passages"), list):
                raise ValueError("Contiene pasajes de texto completo; solo R2: " + path)
            try:
                original = git("show", "HEAD:" + path)
            except subprocess.CalledProcessError:
                original = b""
            if original:
                forbid_book_deletions(path, json.loads(original.decode("utf-8")), obj)
    if total > MAX_BATCH_BYTES:
        raise ValueError("Lote de metadatos demasiado voluminoso; alojar en R2")
    print(f"GitHub solo metadatos: {len(staged)} archivos, {total} bytes")

if __name__ == "__main__":
    try:
        check()
    except Exception as exc:
        print("Carga GitHub bloqueada: " + str(exc), file=sys.stderr)
        sys.exit(1)
