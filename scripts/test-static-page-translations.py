#!/usr/bin/env python3
"""Tests for preservation of original sources in the static translation builder."""
import importlib.util
import tempfile
from pathlib import Path

root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("page_translations",root/"build-static-page-translations.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory() as temp:
    html=Path(temp)/"index.html"
    html.write_text("""<!doctype html><html lang="es"><head>
    <script>const dangerous = "La fuente manuscrita no puede traducirse";</script>
    </head><body>
    <nav><p>Buscá una palabra o frase en todos los libros indexados.</p></nav>
    <main><p>La biblioteca reúne textos y traducciones de varios períodos históricos.</p>
    <section lang="la"><p>Quamquam te, Marce fili, annum iam audientem Cratippum.</p></section>
    <div data-no-ui-i18n><p>La fuente manuscrita queda intacta para las ediciones críticas.</p></div>
    <blockquote><p>Una lectura histórica debe citarse siempre de forma precisa.</p></blockquote>
    <p lang="grc">Ἡ τῶν λόγων μέθοδος</p></main></body></html>""",encoding="utf-8")
    found=module.texts(html)
    assert any("La biblioteca reúne" in x for x in found),found
    assert any("Buscá una palabra" in x for x in found),found
    assert not any("Quamquam" in x or "manuscrita queda intacta" in x or "Una lectura histórica" in x or "dangerous" in x for x in found),found
    assert all(not module.GREEK.search(x) for x in found),found
    assert module.normalized("  texto  editorial\n  de prueba ")=="texto editorial de prueba"
print("OK: editorial ES is extracted; Latin, Greek, quotations, source witnesses and JS are protected.")
