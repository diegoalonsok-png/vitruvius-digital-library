#!/usr/bin/env python3
"""Compare static assets published by GitHub Pages and Cloudflare.
Read-only HTTP audit. Never infer R2 contents from a linked HTML page.
A mismatched hash is a deployment difference, not necessarily an incorrect source.
"""
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ORIGINS = {
    "github_pages": "https://diegoalonsok-png.github.io/vitruvius-digital-library",
    "cloudflare": "https://vitruvius-digital-library.org",
}
# These source files are not supposed to be rewritten by the hosting platform.
ASSETS = (
    "assets/site-bar.js",
    "assets/classics-study-actions.js",
    "assets/vitruvia-lexicon.js",
    "assets/secondary-reader-controls.js",
    "assets/secondary-reader-controls.css",
    "assets/ui-idioma.js",
    "assets/classics-work-dossier.js",
    "assets/auditoria-academica-i18n.js",
    "data/r2/vinculos-repertorio.json",
    "data/r2/catalogo-clasicos-r2.json",
)

def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Vitruvius-deployment-integrity/1.0", "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req, timeout=23) as response:
            data = response.read()
            return {
                "status": response.status,
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "content_type": response.headers.get("Content-Type", ""),
            }
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
        return {"error": str(exc)}

def main():
    report = {"schema": "vdl-cross-deployment-audit-v1",
              "checked_utc": datetime.now(timezone.utc).isoformat(),
              "origins": ORIGINS, "paths": {}, "differences": [], "unavailable": []}
    for path in ASSETS:
        states = {name: request(root + "/" + path) for name, root in ORIGINS.items()}
        report["paths"][path] = states
        for name, value in states.items():
            if "error" in value or value.get("status") != 200:
                report["unavailable"].append({"path": path, "origin": name, "state": value})
        left, right = states.values()
        if "sha256" in left and "sha256" in right and left["sha256"] != right["sha256"]:
            report["differences"].append({"path": path, "github_sha256": left["sha256"], "cloudflare_sha256": right["sha256"]})
    report["summary"] = {"assets_checked": len(ASSETS),
                         "divergent_assets": len(report["differences"]),
                         "unavailable_assets": len(report["unavailable"])}
    target = Path("reports/deployment/cross-deployment-audit.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    for item in report["differences"]:
        print("DIVERGENCIA", item["path"])
    for item in report["unavailable"]:
        print("SIN VERIFICAR", item["origin"], item["path"], item["state"])
    # An incomplete check never becomes a false PASS.
    return 1 if report["differences"] or report["unavailable"] else 0

if __name__ == "__main__":
    sys.exit(main())
