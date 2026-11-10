# Vitruvia · seis prioridades académicas verificables

Fecha editorial: 2026-11-10. Esta nota documenta la implementación en repositorio, no certifica el despliegue en GitHub Pages ni resultados de pruebas de navegador.

## 1. IA semántica E5 / BM25

- Motor disponible: `assets/vitruvia-ai.js`, con `Xenova/multilingual-e5-small`, ejecución WASM y cuantización `q8`.
- Modo predeterminado: **BM25**, sin descarga neuronal; E5 es optativo a petición del lector.
- Etiquetas: `BM25` implica evidencia textual indexada; `E5 + coincidencia textual` indica reordenación neuronal con coincidencia literal; `E5 + BM25` no implica coincidencia literal.
- Una puntuación de ranking o similitud **no** equivale a cotejo manuscrito, corrección filológica, atribución segura ni revisión por pares.
- El manifiesto `data/ai-corpora.json` tiene alcance acotado; el resto de Bibliotheca usa otros mecanismos de búsqueda.
- No se publica una matriz de embeddings ni se declara una precisión experimental no medida. Para promover E5 a modo predeterminado, exigir un banco de pruebas de relevancia multilingüe y mediciones reales de descarga, RAM y latencia.

## 2. URL compartible y filtros

- La ruta `vitruvia.html?q=...&mode=...` conserva el estado compartible; el modo privado evita insertar la consulta en la URL.
- Hay filtros de clase documental, edición e idioma. Se añade el filtro **Libro** cuando el resultado lleva un locus formal; no se atribuye un libro a resultados sin localizador verificable.
- Los filtros actúan sobre las tarjetas recuperadas, no sobre todo el universo de documentos; sus recuentos no deben confundirse con frecuencias del corpus completo.

## 3. Loci y variantes

- `assets/vitruvia-research-engine.js` reconoce notaciones latinas, españolas, francesas e inglesas, números romanos y prefacios de `De architectura`.
- Las consultas de proximidad (`NEAR/n`) y `@lema` ya están implementadas en `assets/vitruvia-lexicon.js`; **no** se debe afirmar que se aplican a todos los proveedores de Vitruvia.
- Variantes de grafía, equivalencias griegas y morfología requieren fuentes lematizadas. Un sinónimo heurístico no debe figurar como prueba de equivalencia textual antigua.

## 4. Lector bilingüe y Codex H

- Los resultados estructurados de Vitruvio ofrecen un enlace con `edition` y `locus` al lector bilingüe, manteniendo el enlace previo al PDF.
- La consulta de `concordancia-folios.html?locus=...` es una **comprobación**; nunca implica que cada locus esté ya asociado a un folio de Harley MS 2767.
- Los códices y sus folios permanecen intactos; no se renombran, sustituyen ni eliminan testimonios.

## 5. Exportaciones

- Se conservan las exportaciones generales BibTeX, RIS, Chicago 18, CSV y loci Markdown.
- Las tarjetas que poseen metadatos citables reciben botones individuales BibTeX y RIS; se omiten campos no acreditados.
- Las exportaciones automáticas **requieren comprobación editorial** antes de su publicación académica. Un DOI se exporta solo si ya consta en la fuente, nunca se construye a partir del título.

## 6. Léxico

- `assets/vitruvia-lexicon.js` distingue formas y lemas, variantes y análisis morfológicos según sus datos de origen.
- La interfaz de resultados ya enlaza con `vitruvia-lexicon.html` para vocablos y fuentes clásicas.
- El enriquecimiento sistemático de acepciones técnicas, etimologías, equivalentes griegos y frecuencia por edición requiere cotejo caso por caso: no deben generarse glosas filológicas sin autoridad documentada.

## Criterios de aceptación pendientes de validación en navegador

1. Comprobar `?q=symmetria&mode=all` y el modo privado.
2. Comprobar BM25 sin descarga de modelo y E5 activado explícitamente.
3. Buscar `liber IV`, `Book IV`, `IV.1`, `Vitr. III.1.1` y comprobar cada enlace.
4. Filtrar por libro 3 y por edición en la página de resultados; verificar que no se mezclen resultados sin locus.
5. Exportar una ficha con DOI y otra sin DOI; validar archivos `.bib` y `.ris` en Zotero.
6. Entrar a un locus con traducción y consultar los vínculos al lector y a la concordancia, sin afirmar correspondencias ausentes.
7. Probar teclado, contraste en tema claro, idioma francés e inglés y diseño móvil.

La existencia de código y metadatos en GitHub no acredita por sí sola el funcionamiento del despliegue público.
