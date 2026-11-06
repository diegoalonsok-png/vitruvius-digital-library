#!/usr/bin/env python3
"""Pruebas de humo de Vitruvia Lexicon en un navegador real (Playwright + Chrome).

Uso:  python3 -m http.server 8765  (en la raíz del repositorio)
      python3 scripts/smoke-vitruvia-lexicon.py [--base http://localhost:8765] [--tr /ruta/traducciones]

Comprueba que cada consulta de referencia devuelve resultados dentro de rangos esperados, que las
citas tienen la forma canónica y que la página no lanza errores de JavaScript. Las consultas a
Wiktionary y Wikidata se simulan (404) para que la prueba no dependa de la red; si se da --tr, las
traducciones de Perseus se sirven desde esa carpeta local.
"""
import argparse, asyncio, os, re, sys
from playwright.async_api import async_playwright

# (consulta, mínimo de coincidencias, máximo, texto que debe aparecer en el estado o en la página)
CASES = [
    ("q=columna&mode=palabra&lang=la", 200, 400, "Vitr."),
    ("q=symmetria&mode=palabra&lang=la", 60, 200, "Vitr."),
    ("q=λόγος&mode=palabra", 50, 3000, "Pl. Ap."),
    ("q=κύκλος&mode=palabra", 300, 2000, "Euclides"),
    ("q=constructor&mode=palabra&lang=la", 0, 50, "constructor"),
    ("q=%22firmitatis%20utilitatis%20venustatis%22&mode=frase", 1, 5, "Vitr. 1.3.2"),
    ("q=arma%20virumque&mode=frase", 1, 3, "Verg. A. 1.1"),
    ("q=masonry%20mason%20constructor&mode=grupo", 50, 5000, "faber"),
    ("q=aqueduct,%20pipe&mode=grupo", 20, 5000, "fistula"),
    # Errores de tipeo y grafías vulgares: deben corregirse a la forma canónica más próxima
    ("q=masonery,%20arkitecto&mode=grupo", 50, 5000, "corregido"),
    ("q=columa,%20simetria&mode=grupo", 50, 5000, "symmetria"),
    # Citas en lenguaje natural (castellano, latín, abreviaturas, números romanos)
    ("q=libro%20I,%20ii%20del%20libro%20de%20vitruvio&mode=palabra", 0, 0, "Vitr. 1.2.1"),
    ("q=vitruvius%20pref%20I,%20II&mode=palabra", 0, 0, "Vitr. 1.praef.2"),
    ("q=Her%C3%B3doto%20II%2035&mode=palabra", 0, 0, "Hdt. 2.35"),
]


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8765")
    ap.add_argument("--tr", default="")
    a = ap.parse_args()
    fails = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        pg = await b.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route(re.compile(r"https://(en\.wiktionary|www\.wikidata)\.org/.*"), lambda r: r.fulfill(status=404, body="{}"))
        if a.tr:
            async def rt(route):
                f = os.path.join(a.tr, route.request.url.split("/")[-1])
                await (route.fulfill(path=f, content_type="text/xml") if os.path.exists(f) else route.fulfill(status=404, body=""))
            await pg.route("https://raw.githubusercontent.com/**", rt)
        for q, lo, hi, must in CASES:
            await pg.goto(f"{a.base}/vitruvia-lexicon.html?{q}")
            try:
                await pg.wait_for_function("document.querySelector('.lx-hit')||/Sin coincid|No se pudo|Ningún término|Cita reconocida/.test(document.querySelector('#lx-state').textContent)", timeout=60000)
            except Exception:
                pass
            st = await pg.locator("#lx-state").inner_text()
            m = re.search(r"([\d.]+)\+? coincidencia", st)
            n = int(m[1].replace(".", "")) if m else 0
            body = await pg.locator("main").inner_text() if await pg.locator("main").count() else await pg.locator("body").inner_text()
            ok = lo <= n <= hi and must in body
            fails += not ok
            print(("OK  " if ok else "FAIL"), q, "·", n, "coincidencias", "" if must in body else f"· falta «{must}»")
        if a.tr:
            await pg.goto(f"{a.base}/vitruvia-lexicon.html?q=arma&mode=palabra&lang=la")
            await pg.wait_for_selector(".lx-hit", timeout=60000)
            await pg.click(".lx-readbar button >> nth=0")
            await pg.wait_for_timeout(4000)
            t = await pg.locator(".lx-hit-tr").first.inner_text()
            ok = "Arms and the man" in t or "alineación" in t
            fails += not ok
            print(("OK  " if ok else "FAIL"), "traducción alineada ·", t[:80].replace("\n", " "))
        if errs:
            fails += 1
            print("FAIL errores de JavaScript:", errs[:5])
        await b.close()
    print("0 fallos" if not fails else f"{fails} fallo(s)")
    sys.exit(1 if fails else 0)


asyncio.run(main())
