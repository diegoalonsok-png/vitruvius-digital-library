#!/usr/bin/env python3
"""Indexar Conceptus sobre originales verificados en R2, sin tocar textos madre.

No lematiza ni crea loci. El índice en R2 sólo acelera la selección de textos
candidatos; el visor comprueba siempre el pasaje contra el original. Si un
objeto o SHA256 no coincide, se detiene toda la publicación.
"""
from __future__ import annotations
from collections import Counter, defaultdict
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
M = ROOT / "data/r2/corpus-manifest.json"
R = ROOT / "data/classics-corpus/search-registry.json"
C = ROOT / "data/lexicon/conceptus.json"
OUT = ROOT / "data/r2/corpus-conceptus-manifest.json"
HOST = "https://libros.vitruvius-digital-library.org"
BASE = HOST + "/corpus/"
KEY = "corpus/indice/semantic-conceptus-v1.json"
URL = HOST + "/" + KEY

def main():
    for variable in ("R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        if not os.getenv(variable):
            raise SystemExit("Credenciales de R2 ausentes; no se publica un índice supuesto")
    import boto3
    from botocore.config import Config
    module_spec = importlib.util.spec_from_file_location("conceptus_local",
        ROOT / "scripts/build_classics_semantic_index.py")
    mod = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(mod)
    manifest_bytes = M.read_bytes()
    manifest = json.loads(manifest_bytes)
    registry = json.loads(R.read_text(encoding="utf-8"))
    concepts = json.loads(C.read_text(encoding="utf-8"))["concepts"]
    lexicon = mod.dictionary(concepts)
    sources = manifest["obras"]
    expected = {BASE + e["archivo"]: e for e in sources}
    remote = [e for e in registry["entries"] if str(e.get("path", "")).startswith(BASE)]
    if len(expected) != len(sources) or len(remote) != len(sources):
        raise ValueError("Índice remoto sin correspondencia 1:1 en manifiesto y registro")
    if len({e["path"] for e in remote}) != len(remote):
        raise ValueError("Rutas duplicadas del corpus R2")
    if set(expected) != {e["path"] for e in remote}:
        raise ValueError("Fuentes R2 del registro no coinciden con el manifiesto")
    account = os.getenv("R2_ACCOUNT_ID") or "4e936bf2c4f185a87075ca506de93e69"
    bucket = os.getenv("R2_BUCKET") or "vitruvius-bibliotheca"
    client = boto3.client("s3",
        endpoint_url="https://" + account + ".r2.cloudflarestorage.com",
        region_name="auto", aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(retries={"max_attempts": 5, "mode": "standard"}))
    docs, seen = [], set()
    for entry in remote:
        name = entry["path"].removeprefix(BASE)
        if "/" in name or not name.endswith(".json"):
            raise ValueError("Ruta remota ajena a corpus")
        meta = expected[entry["path"]]
        body = client.get_object(Bucket=bucket, Key="corpus/" + name)["Body"].read()
        digest = hashlib.sha256(body).hexdigest()
        if digest != meta["sha256"]:
            raise ValueError("SHA256 discordante para " + name)
        d = json.loads(body)
        if d.get("workId") != entry["workId"] or d.get("language") != entry["language"]:
            raise ValueError("Edición, idioma o autoría de R2 discordante: " + name)
        passages = d.get("passages")
        if not isinstance(passages, list) or len(passages) != meta["pasajes"]:
            raise ValueError("Conteo de pasajes discordante: " + name)
        lang = entry["language"]
        terms = lexicon[lang]
        found = defaultdict(lambda: {"count": 0, "loci": []})
        words_total = 0
        for p in passages:
            raw = p.get("text", "")
            locus = str(p.get("locus", "")).strip()
            if not locus or not isinstance(raw, str):
                raise ValueError("Pasaje sin texto o localizador: " + name)
            tokens = mod.tokens(raw)
            words_total += len(tokens)
            hits = Counter()
            for i, word in enumerate(tokens):
                for concept_id, _term, phrase in terms.get(word, []):
                    if tokens[i:i + len(phrase)] == phrase:
                        hits[concept_id] += 1
            for cid, count in hits.items():
                row = found[cid]
                row["count"] += count
                if len(row["loci"]) < 12:
                    row["loci"].append(locus)
        if not words_total:
            raise ValueError("Texto original vacío: " + name)
        docs.append({
            "workId": entry["workId"], "language": lang,
            "path": entry["path"], "sha256": digest,
            "passages": len(passages), "words": words_total,
            "concepts": {key: value for key, value in sorted(found.items())}
        })
        seen.add(entry["workId"])
        print(name, "pasajes:", len(passages), "Conceptus:", len(found), flush=True)
    if len(docs) != len(remote):
        raise AssertionError("Indexación remota incompleta")
    result = {
        "schema": "vdl-r2-corpus-conceptus-index-v1",
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(),
        "method": "Términos Conceptus realmente atestiguados en textos R2, sin lematización, equivalencias inventadas ni cotejo crítico",
        "sourceManifestSha256": hashlib.sha256(manifest_bytes).hexdigest(),
        "dictionarySha256": hashlib.sha256(C.read_bytes()).hexdigest(),
        "editionCount": len(docs),
        "distinctWorks": len(seen),
        "documents": docs,
    }
    blob = json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    digest = hashlib.sha256(blob).hexdigest()
    client.put_object(Bucket=bucket, Key=KEY, Body=blob,
        ContentType="application/json; charset=utf-8",
        CacheControl="public, max-age=86400", Metadata={"sha256": digest})
    verified = client.get_object(Bucket=bucket, Key=KEY)["Body"].read()
    if hashlib.sha256(verified).hexdigest() != digest:
        raise ValueError("El índice publicado no conserva sus bytes")
    # También comprobar el dominio público: el navegador NO usa URLs S3 privadas.
    req = urllib.request.Request(URL, headers={"User-Agent": "VitruviusBibliothecaIndexAudit/1.0"})
    with urllib.request.urlopen(req, timeout=50) as response:
        published = response.read(len(blob) + 1)
    if hashlib.sha256(published).hexdigest() != digest:
        raise ValueError("El índice R2 público no coincide con el índice validado")
    summary = {
        "schema": "vdl-r2-corpus-conceptus-manifest-v1",
        "generated": result["generated"], "url": URL,
        "sha256": digest,
        "sourceManifestSha256": result["sourceManifestSha256"],
        "dictionarySha256": result["dictionarySha256"],
        "editionCount": len(docs), "distinctWorks": len(seen),
        "methods": result["method"],
        "verification": "SHA256 completo de los 32 originales, respuesta S3 y lectura pública del índice; los pasajes no están cotejados con manuscritos",
    }
    OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"indexedRemoteEditions": len(docs),
                      "conceptusIndexBytes": len(blob), "indexSha256": digest}, ensure_ascii=False))

if __name__ == "__main__":
    main()
