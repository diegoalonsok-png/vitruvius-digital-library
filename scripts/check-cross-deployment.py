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

# Strip ONLY the analytics script Cloudflare injects into served HTML.
# Other markup, whitespace, local scripts and text are kept byte-exact.
_CLOUDFLARE_BEACON = re.compile(
    rb"""<script\b(?=[^>]*\bsrc\s*=\s*["']https://static\.cloudflareinsights\.com/beacon\.min\.js(?:/[^"']*)?["'])[^>]*>\s*</script>[ \t]*(?:\r?\n)?""",
    re.IGNORECASE,
)


def html_edition_bytes(raw):
    return _CLOUDFLARE_BEACON.sub(b"", raw)


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Vitruvius-deployment-integrity/1.0", "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req, timeout=23) as response:
            data = response.read()
            # Raw hashes retain forensic evidence. Only *.html is compared with
            # the known injected Cloudflare analytics tag removed.
            is_html = url.split("?", 1)[0].lower().endswith(".html")
            normalized = html_edition_bytes(data) if is_html else data
            return {
                "status": response.status,
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "comparable_sha256": hashlib.sha256(normalized).hexdigest(),
                "cloudflare_beacon_removed": is_html and len(normalized) != len(data),
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
              "origins": ORIGINS, "paths": {}, "differences": [], "ignored_beacon_differences": [], "unavailable": []}
    for path in ASSETS:
        states = {name: request(root + "/" + path) for name, root in ORIGINS.items()}
        report["paths"][path] = states
        for name, value in states.items():
            if "error" in value or value.get("status") != 200:
                report["unavailable"].append({"path": path, "origin": name, "state": value})
        left, right = states.values()
        if "sha256" in left and "sha256" in right:
            raw_differs = left["sha256"] != right["sha256"]
            substantive_differs = left["comparable_sha256"] != right["comparable_sha256"]
            if substantive_differs:
                difference = {"path": path, "github_sha256": left["sha256"], "cloudflare_sha256": right["sha256"],
                              "github_comparable_sha256": left["comparable_sha256"],
                              "cloudflare_comparable_sha256": right["comparable_sha256"]}
                if path.endswith(".html"):
                    difference["html_diagnostic"] = diagnostic_html_difference(path)
                report["differences"].append(difference)
            elif raw_differs:
                report["ignored_beacon_differences"].append({"path": path, "reason": "Cloudflare-injected analytics beacon only",
                    "github_sha256": left["sha256"], "cloudflare_sha256": right["sha256"]})
    report["summary"] = {"assets_checked": len(ASSETS),
                         "divergent_assets": len(report["differences"]),
                         "html_beacon_only_differences": len(report["ignored_beacon_differences"]),
                         "unavailable_assets": len(report["unavailable"])}
    target = Path("reports/deployment/cross-deployment-audit.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    for item in report["ignored_beacon_differences"]:
        print("DIFERENCIA INOCUA · solo beacon Cloudflare", item["path"])
    for item in report["differences"]:
        print("DIVERGENCIA", item["path"])
        if item["path"] == "scriptorium.html":
            print("SCRIPTORIUM_HTML_DIAGNOSTIC", json.dumps(item.get("html_diagnostic", {}), ensure_ascii=False))
    for item in report["unavailable"]:
        print("SIN VERIFICAR", item["origin"], item["path"], item["state"])
    # An incomplete check never becomes a false PASS.
    return 1 if report["differences"] or report["unavailable"] else 0

if __name__ == "__main__":
    sys.exit(main())
