#!/usr/bin/env python3
"""Índice de presencia Conceptus para las 32 versiones TEI alojadas en R2.

Auditoría no destructiva. Descarga cada JSON por API S3 R2, compara el SHA-256
de sus bytes con el manifiesto académico, valida workId/idioma/loci y calcula
solo conceptos realmente presentes. No copia textos a Pages ni inventa loci.
La búsqueda pública vuelve a contrastar las coincidencias con el texto real.
"""
from __future__ import annotations
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re

from build_classics_semantic_index import dictionary, tokens

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/r2/corpus-manifest.json"
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
CONCEPTS = ROOT / "data/lexicon/conceptus.json"
OUTPUT = ROOT / "data/classics-corpus/semantic-conceptus-r2-summary.json"
REMOTE = "https://libros.vitruvius-digital-library.org/corpus/"
BUCKET = os.getenv("R2_BUCKET") or "vitruvius-bibliotheca"


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def compute():
    import boto3
    from botocore.config import Config
    if not os.getenv("R2_ACCESS_KEY_ID") or not os.getenv("R2_SECRET_ACCESS_KEY"):
        raise RuntimeError("Faltan credenciales R2; no se publica un índice no verificado")
    account = os.getenv("R2_ACCOUNT_ID") or "4e936bf2c4f185a87075ca506de93e69"
    s3 = boto3.client(
        "s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        region_name="auto",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(retries={"max_attempts": 5, "mode": "adaptive"}),
    )
    manifest_raw, concepts_raw = MANIFEST.read_bytes(), CONCEPTS.read_bytes()
    manifest = json.loads(manifest_raw)
    registry = json.loads(REGISTRY.read_bytes())
    concepts = json.loads(concepts_raw)["concepts"]
    if manifest.get("schema") != "vdl-corpus-r2-1":
        raise ValueError("Manifiesto R2 incorrecto")
    declared = {(r["workId"], r["language"]): r for r in manifest["obras"]}
    remote_registry = [e for e in registry["entries"] if
                       e.get("path", "").startswith(REMOTE)]
    if len(remote_registry) != len(declared) or len(declared) != len(manifest["obras"]):
        raise ValueError("Cantidad de versiones R2 del manifiesto y del registro no coincide")
    keys = {(e["workId"], e["language"]) for e in remote_registry}
    if keys != set(declared):
        raise ValueError("Versiones de R2 no coinciden con el registro de búsqueda")
    lex = dictionary(concepts)
    results = []
    for entry in sorted(remote_registry, key=lambda e: (e["workId"], e["language"])):
        key = entry["workId"], entry["language"]
        ref = declared[key]
        filename = ref["archivo"]
        if not re.fullmatch(r"[a-z0-9-]+\.json", filename):
            raise ValueError("Nombre de texto inseguro: " + filename)
        if entry["path"] != REMOTE + filename:
            raise ValueError("Ruta registrada distinta del manifiesto: " + filename)
        raw = s3.get_object(Bucket=BUCKET, Key="corpus/" + filename)["Body"].read()
        actual = digest(raw)
        if actual != ref["sha256"]:
            raise ValueError("SHA real difiere del manifiesto para " + filename)
        obj = json.loads(raw)
        passages = obj.get("passages")
        if obj.get("workId") != key[0] or obj.get("language") != key[1] or not isinstance(passages, list):
            raise ValueError("Identidad editorial o pasajes inválidos: " + filename)
        if len(passages) != ref["pasajes"]:
            raise ValueError("Cantidad de pasajes desigual para " + filename)
        seen_loci = set()
        counted = Counter()
        matched_passages = 0
        words_total = 0
        for passage in passages:
            locus = passage.get("locus")
            value = passage.get("text")
            if not isinstance(locus, str) or not locus or not isinstance(value, str):
                raise ValueError("Locus o texto inválidos: " + filename)
            if locus in seen_loci:
                raise ValueError("Locus duplicado en una misma edición: " + filename + " : " + locus)
            seen_loci.add(locus)
            words = tokens(value)
            words_total += len(words)
            found_here = False
            for i, word in enumerate(words):
                for concept_id, term, phrase in lex[key[1]].get(word, []):
                    if words[i:i + len(phrase)] == phrase:
                        counted[concept_id] += 1
                        found_here = True
            if found_here:
                matched_passages += 1
        results.append({
            "workId": key[0], "language": key[1], "source": entry["path"],
            "sha256": actual, "passages": len(passages),
            "words": words_total, "matchedPassages": matched_passages,
            "concepts": sorted(counted),
            "matches": sum(counted.values()),
        })
        print(f"VALIDADO {filename}: {len(passages)} pasajes; {len(counted)} conceptos; SHA coincide")
    output = {
        "schema": "vdl-r2-conceptus-presence-v1",
        "method": "Conceptus por coincidencia exacta de término, con normalización Unicode; el SHA se cotejó leyendo el JSON completo de R2. Índice de presencia, no loci ni lematización. Cada resultado de búsqueda debe verificarse contra el texto original.",
        "corpusManifestSha256": digest(manifest_raw),
        "conceptusSha256": digest(concepts_raw),
        "registryEditionCount": len(remote_registry),
        "dictionaryConcepts": len(concepts),
        "indexedEditions": len(results),
        "versions": results,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Índice R2 validado: " + str(len(results)) + " versiones · " +
          str(sum(x["matchedPassages"] for x in results)) + " pasajes con coincidencia Conceptus")


if __name__ == "__main__":
    compute()
