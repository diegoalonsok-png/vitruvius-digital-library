#!/usr/bin/env python3
"""Evaluación continua de Vitruvia contra las fuentes reales (Wikipedia, Wikidata, catálogos).

Para cada consulta de referencia abre vitruvia.html?q=…, espera el panel «Destacado» y comprueba que la
entidad elegida es la esperada. Mide el tiempo hasta el Destacado y registra los errores de JavaScript.
Pensado para GitHub Actions (con acceso a Internet): no bloquea publicaciones, informa.

Uso: python3 -m http.server 8765 &  python3 scripts/eval-vitruvia-live.py [--base URL] [--out informe.json]
"""
import argparse, asyncio, json, os, re, time
from playwright.async_api import async_playwright

# (consulta, expresión que debe aparecer en el título destacado; None = no debe destacarse nada ajeno)
CASES = [
    ("vitruvio", r"Vitruvi|De architectura"), ("libros de plinio", r"Plinio"), ("banda de musica radio head", r"Radiohead"),
    ("radiohead", r"Radiohead"), ("columna dorica", r"[Dd][óo]ric"), ("augusto", r"Augusto"), ("partenon", r"Parten[óo]n"),
    ("panteon de agripa", r"Pante[óo]n"), ("leonardo da vinci", r"Leonardo"), ("pitagoras", r"Pit[áa]goras"),
    ("euclides elementos", r"Euclides|Elementos"), ("le corbusier", r"Le Corbusier"), ("palladio", r"Palladio"),
    ("coliseo", r"Coliseo|Anfiteatro Flavio"), ("acueducto de segovia", r"Acueducto de Segovia"), ("arquimedes", r"Arqu[íi]medes"),
    ("arquiedes", r"Arqu[íi]medes"), ("brunelleschi", r"Brunelleschi"), ("the beatles", r"Beatles"), ("borges", r"Borges"),
    ("hagia sophia", r"Santa Sof[íi]a|Hagia"), ("frank lloyd wright", r"Frank Lloyd Wright"), ("zaha hadid", r"Zaha Hadid"),
    ("teatro de epidauro", r"Epidauro"), ("domus aurea", r"Domus Aurea"), ("alberti de re aedificatoria", r"Alberti|aedificatoria"),
    ("cristobal colon", r"Col[óo]n"), ("piramide de keops", r"Keops|Gran Pir[áa]mide"), ("ciceron", r"Cicer[óo]n"), ("mozart", r"Mozart"),
]


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8765")
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    rows, ok = [], 0
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        for q, expect in CASES:
            pg = await b.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
            t0 = time.time()
            await pg.goto(f"{a.base}/vitruvia.html?q={q.replace(' ', '%20')}")
            title, secs = "", None
            for _ in range(40):
                await pg.wait_for_timeout(500)
                if await pg.locator("#featured-title").count():
                    t = (await pg.locator("#featured-title").inner_text()).strip()
                    if t and not re.search(r"Codex Harleianus", t):
                        title, secs = t, round(time.time() - t0, 1)
                        break
            good = bool(title and re.search(expect, title))
            ok += good
            rows.append({"q": q, "expected": expect, "featured": title, "seconds": secs, "ok": good, "js_errors": errs})
            print(("OK  " if good else "FAIL"), f"{q!r} → {title or '(sin destacado)'}", f"· {secs}s" if secs else "", f"· errores JS: {len(errs)}" if errs else "")
            await pg.close()
        await b.close()
    times = [r["seconds"] for r in rows if r["seconds"]]
    summary = {"precision": round(ok / len(CASES), 3), "ok": ok, "total": len(CASES),
               "median_seconds": sorted(times)[len(times) // 2] if times else None, "js_errors": sum(len(r["js_errors"]) for r in rows)}
    print("RESUMEN", json.dumps(summary, ensure_ascii=False))
    if a.out:
        json.dump({"summary": summary, "rows": rows}, open(a.out, "w"), ensure_ascii=False, indent=1)
    md = os.environ.get("GITHUB_STEP_SUMMARY")
    if md:
        with open(md, "a") as f:
            f.write(f"## Evaluación de Vitruvia\n\nPrecisión del Destacado: **{ok}/{len(CASES)}** · mediana {summary['median_seconds']} s · errores JS {summary['js_errors']}\n\n| Consulta | Destacado | s | |\n|---|---|---|---|\n")
            for r in rows:
                f.write(f"| {r['q']} | {r['featured'] or '—'} | {r['seconds'] or '—'} | {'✅' if r['ok'] else '❌'} |\n")


asyncio.run(main())
