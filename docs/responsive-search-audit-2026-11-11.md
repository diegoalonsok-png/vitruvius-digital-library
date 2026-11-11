# Búsquedas y fichas · 11 de noviembre de 2026

La carga inicial de Vitruvia pasa de 80 scripts (1.264.089 bytes) a 34 (607.612 bytes). Se conserva el diseño; las imágenes se activan al pulsar Imágenes y las fuentes adicionales al ampliar la consulta. Los módulos y textos se conservan. La respuesta inicial consulta una edición estructurada; la ampliación incorpora las demás y las fuentes académicas.

La ordenación calcula una puntuación por registro. Las concordancias descartan los textos sin el término antes de construir mapas Unicode. No se agregan índices masivos. La biblioteca limpia el estado anterior al editar y presenta un primer lote sin esperar todas las ediciones; conserva la paginación de sesenta pasajes. Lexicon usa coincidencia literal y reutiliza las definiciones residentes al pulsar palabras.

Las pruebas cubren latín, griego, ausencia de sustitución de dimus por domus/symmetria/geometria, consultas consecutivas, URL, diecinueve casos de calidad y coherencia de los identificadores editoriales. Cuatro consultas residentes no descargaron diccionarios. El examen de 4.201 pasajes latinos para numen tardó aproximadamente 90–100 ms en Node. Esta medición de CPU no equivale a tiempo de navegación. La prueba Chromium de CI registra los tiempos completos; el objetivo de un segundo depende además de red y dispositivo.

Se contrastaron los DOI de Zenodo: V514 `10.5281/zenodo.23884757`, V554 `10.5281/zenodo.23885110`, V297 `10.5281/zenodo.23885404`, proyecto `10.5281/zenodo.23868911`. Las fichas de las ediciones incluyen sus metadatos, lectores y PDF. V514/V554 consignan ISBN `978-631-01-6651-3`, compartido por decisión editorial. El PDF V297 de Zenodo y sus metadatos no consignan ISBN: queda pendiente de acreditación, sin copiar por conjetura el de otra edición.

Las fichas antiguas exponen los 22 campos de la matriz codicológica existente, con fuente y estado de cotejo. El catálogo tiene 222 obras y ediciones; el registro reúne 100 testimonios y 93 objetos físicos. Ciento veintidós fichas tienen testimonio registrado; 96 fichas antiguas carecen todavía de uno en este registro. Algunas requieren distinguir transmisión indirecta, fragmentos y pérdida del original. Cincuenta y un testimonios tienen un campo de foliación no vacío. Estas cifras no certifican cotejo visual de todos los datos.

La investigación codicológica completa sigue requiriendo consultas individuales a catálogos custodios y ediciones críticas. Se muestran los datos y pendientes; no se declara terminada esa investigación. El desglose por obra está en `reports/responsive-records-audit-2026-11-11.json`.

## Recuperación y comprobación en navegador

Se recuperó el enrutamiento de consultas del commit d6a86bada86d3ece49f3fac9dde6145b0757d217 (10 de noviembre, hora argentina), conservando las correcciones de rendimiento. No es una reversión completa del sitio. Los alias explícitos logo/logos remiten a λόγος; dios/god/dieu buscan deus y θεός. Las relaciones más amplias permanecen optativas.

El diccionario contextual ahora atiende los resultados normales y los DOCX de la Bibliotheca. Se verificó numen en las Odas de Horacio. Micenas incorpora una ficha geográfica con fuentes UNESCO y Cambridge.

En Chrome sobre la vista previa estática local se observaron primeras respuestas de Vitruvia de 227 ms (domus), 357 ms (numen) y 352 ms (symmetria), sin imágenes en los resultados. El diccionario numen del DOCX se mostró en 11 ms. Son mediciones sintéticas de este entorno, no garantías de descarga en GitHub Pages. Resultados y límites en reports/responsive-browser-observations-2026-11-11.json.
