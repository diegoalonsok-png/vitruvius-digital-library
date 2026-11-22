#!/usr/bin/env python3
"""Publish a complete immutable candidate index before any catalogue changes."""
import importlib.util
import json
from pathlib import Path
import sys
from concurrent.futures import ThreadPoolExecutor
spec = importlib.util.spec_from_file_location("expansion", Path(__file__).with_name("expand-classics-r2.py"))
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
folder = Path(sys.argv[1]); source = folder / "index"
manifest = (source / "manifest.json").read_bytes()
data = json.loads(manifest)
report = mod.read(folder / "prepared.json")
if not report["published"] or data["works"] != len(report["published"]): raise SystemExit("Índice no coincide con las ediciones publicadas")
s3, bucket = mod.client()
prefix = "corpus/indice/ampliacion/" + mod.digest(manifest)[:24] + "/"
def publish(path):
    mod.put_verified(s3, bucket, prefix + path.relative_to(source).as_posix(), path.read_bytes(), "application/json;charset=utf-8")
# Keep public Cloudflare verification below the transient 503 rate threshold.
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(publish, sorted(source.rglob("*.json"))))
descriptor = {"schema": "vdl-classics-expansion-index-v1", "url": mod.HOST + "/" + prefix + "manifest.json", "sha256": mod.digest(manifest), "works": data["works"], "passages": data["passages"], "generated": data["generated"], "verification": "SHA256 S3 y acceso público comprobados para cada corpus y fragmento"}
mod.save(folder / "index-descriptor.json", descriptor)
print(json.dumps(descriptor))
