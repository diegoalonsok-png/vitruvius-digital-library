#!/usr/bin/env python3
"""Compare static assets published by GitHub Pages and Cloudflare.
Read-only HTTP audit. Never infer R2 contents from a linked HTML page.
A mismatched hash is a deployment difference, not necessarily an incorrect source.
"""
import hashlib
import json
import os
import re
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
    # Portada: paridad del buscador principal, el buscador de obras y el bloqueo del duplicado.
    "index.html",
    "assets/unified-books-discovery.js",
    "assets/bibliotheca-works-explorer.css",
    # Aparato comparativo: HTML y componentes compartidos del cotejo, incluidos prefacios.
    "aparato-comparativo.html",
    "bibliotheca-graeca-latina.html",
    # Cotejo latino indexado: el navegador y los tres archivos fuente deben coincidir en ambas publicaciones.
    "scriptorium.html",
    "assets/scriptorium-triple.js",
    "data/critical-editions/krohn-1912-tei-loci.json",
    "data/critical-editions/rose-1899-transcribed-loci.json",
    "data/structured/recensio-es.json",
    "assets/bibliotheca-work-search.js",
    "assets/bibliotheca-work-search.css",
    "assets/bibliotheca-works-explorer.js",
    "assets/comparative-bude-units.js",
    "assets/dossier-integrado-731.js",
    "assets/comparative-five-editions.js",
    "assets/apparatus-cite-tools.js",
    "assets/edition-references.js",
    "assets/vdl-edition-identity-strip.js",
    "assets/site-bar.js",
    "assets/classics-study-actions.js",
    "assets/vitruvia-lexicon.js",
    "assets/lexicon-ngram-engine.js",
    "assets/classics-lexical-popup.js",
    "assets/classics-academic-reader.js",
    "assets/classics-text-reader.js",
    "assets/secondary-reader-controls.js",
    "assets/secondary-reader-controls.css",
    "assets/ui-idioma.js",
    "assets/classics-work-dossier.js",
    "assets/auditoria-academica-i18n.js",
    "data/r2/vinculos-repertorio.json",
    "data/r2/catalogo-clasicos-r2.json",
    "data/classics-corpus/semantic-conceptus-postings.json",
)

def source_bytes(url, data):
    """Exclude only Cloudflare's automatic analytics beacon from HTML comparisons.
    Raw SHA-256 remains recorded; any other HTML change still fails the parity check.
    """
    if not url.lower().endswith(".html"):
        return data
    beacon = rb'<script\\b(?=[^>]*https://static\\.cloudflareinsights\\.com/beacon\\.min\\.js)[^>]*>\\s*</script>(?:\\r?\\n)?'
    return re.sub(beacon, b"", data, flags=re.IGNORECASE)


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Vitruvius-deployment-integrity/1.0", "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req, timeout=23) as response:
            data = response.read()
            return {
                "status": response.status,
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "source_sha256": hashlib.sha256(source_bytes(url, data)).hexdigest(),
                "content_type": response.headers.get("Content-Type", ""),
            }
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
        return {"error": str(exc)}

def diagnostic_html_difference(path):
    """Inspect only public HTML to identify version drift; do not alter either deployment."""
    def get_html(base):
        req = urllib.request.Request(
            base + "/" + path,
            headers={"User-Agent": "Vitruvius-deployment-integrity/1.0", "Cache-Control": "no-cache"},
        )
        with urllib.request.urlopen(req, timeout=23) as response:
            return response.read().decode("utf-8", errors="replace")
    try:
        pages, cloud = get_html(ORIGINS["github_pages"]), get_html(ORIGINS["cloudflare"])
        offset = next((i for i, (a, b) in enumerate(zip(pages, cloud)) if a != b), min(len(pages), len(cloud)))
        def markers(html):
            match = re.search(r"scriptorium-triple[.]js(?:[?]v=[A-Za-z0-9_-]+)?", html)
            return {
                "triple_script": match.group(0) if match else None,
                "latin_triad_intro": "latín original indexado" in html and "Rose (1899" in html,
                "legacy_ocr_intro": "se muestran como <strong>OCR sin corregir</strong>" in html,
                "home_books_search": 'id="home-books-search"' in html,
                "main_search": 'id="search-form"' in html,
                "old_duplicate_loader": 'src="assets/unified-books-discovery.js' in html,
                "new_home_style": "20261119-match-main-search-v1" in html,
                "cloudflare_analytics": "static.cloudflareinsights.com/beacon.min.js" in html,
            }
        return {
            "first_difference_at": offset,
            "github_near_difference": pages[max(0, offset - 60): offset + 120],
            "cloudflare_near_difference": cloud[max(0, offset - 60): offset + 120],
            "github_html": markers(pages),
            "cloudflare_html": markers(cloud),
        }
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
        return {"diagnostic_error": str(exc)}


def main():
    report = {"schema": "vdl-cross-deployment-audit-v1",
              "checked_utc": datetime.now(timezone.utc).isoformat(),
              "origins": ORIGINS, "paths": {}, "differences": [],
              "hosting_instrumentation_only": [], "unavailable": []}
    for path in ASSETS:
        states = {name: request(root + "/" + path) for name, root in ORIGINS.items()}
        report["paths"][path] = states
        for name, value in states.items():
            if "error" in value or value.get("status") != 200:
                report["unavailable"].append({"path": path, "origin": name, "state": value})
        left, right = states.values()
        if "sha256" in left and "sha256" in right and left["sha256"] != right["sha256"]:
            if left["source_sha256"] == right["source_sha256"]:
                report["hosting_instrumentation_only"].append({"path": path, "type": "cloudflare-analytics-beacon"})
                continue
            difference = {"path": path, "github_sha256": left["sha256"], "cloudflare_sha256": right["sha256"]}
            if path.endswith(".html"):
                difference["html_diagnostic"] = diagnostic_html_difference(path)
            report["differences"].append(difference)
    report["summary"] = {"assets_checked": len(ASSETS),
                         "divergent_assets": len(report["differences"]),
                         "hosting_instrumentation_only": len(report["hosting_instrumentation_only"]),
                         "unavailable_assets": len(report["unavailable"])}
    target = Path("reports/deployment/cross-deployment-audit.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    for item in report["differences"]:
        print("DIVERGENCIA", item["path"])
        if item["path"] in ("scriptorium.html", "index.html"):
            tag = "INDEX_HTML_DIAGNOSTIC" if item["path"] == "index.html" else "SCRIPTORIUM_HTML_DIAGNOSTIC"
            print(tag, json.dumps(item.get("html_diagnostic", {}), ensure_ascii=False))
    for item in report["unavailable"]:
        print("SIN VERIFICAR", item["origin"], item["path"], item["state"])
    # An incomplete check never becomes a false PASS.
    return 1 if report["differences"] or report["unavailable"] else 0

if __name__ == "__main__":
    sys.exit(main())
