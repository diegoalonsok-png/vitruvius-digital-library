# Auditoría acotada: identidad bibliográfica, GitHub/R2 y rendimiento
Fecha: 2026-11-15. Alcance: no modificar aparato crítico, Lexicon, buscadores ni lectores que mantienen otros procesos.

## Evidencia y alcance
- `reports/bibliotheca/cotejo-integridad-2026-11-15.md`: 271 registros principales + 10 de R2 = 281 obras declaradas; la cifra nominal de 300 aún requiere identificar 19 registros, sin inferir pérdidas.
- `reports/bibliotheca/indexation-control.json`: 57 obras sin índice de contenido registrado (54 obras antiguas y 3 manifestaciones editoriales). Un PDF accesible no implica texto indexado ni integridad completa.
- `reports/bibliotheca/r2-live-integrity.json`: 234 objetos comprobados por HEAD (117 PDF + 117 OCR/textos), ninguno faltante; las huellas de metadatos no sustituyen el SHA-256 recalculado de bytes completos.
- `data/r2/catalogo-clasicos-r2.json`: 117 manifestaciones PDF; los 117 registros incluyen título, autor, año, fuente, identificador IA, páginas y SHA-256 declarado; 115 consignan editor, 64 un idioma de edición no vacío. De los 64, 53 indican `s/d` (por lo tanto, solo 11 tienen idioma explícito distinto de `s/d`). La ausencia de DOI/URN/manuscrito en este archivo **no demuestra** ausencia en otros catálogos del proyecto.
- `reports/all-pages-performance.json` (2026-11-13) no es medición válida: 143/143 páginas muestran ERR_CONNECTION_REFUSED al localhost del runner. Ignorar sus percentiles nulos como indicador de producción.

## Incidencias de identidad/alcance para cotejo con portada e índices
1. Galeno: `galeno-opera-kuhn` y `galeno-kuhn-vol01` apuntan al mismo binario de tomo XIV. No se puede afirmar tomo I por el ID legado.
2. Un PDF de poliorcética de 446 pp. se comparte entre Apolodoro, Ateneo Mecánico, Bitón y Filón; localizar las páginas de cada tratado antes de afirmar edición individual completa.
3. Antología Palatina: solo volumen V; Euclides Elementa: I–VI; Cicerón De oratore: libro I; Celso De medicina: I–IV.
4. Petronio: el PDF es de Bellum civile, no de toda Satyrica; Plinio Naturalis historia: XXXIII–XXXVI; Isidoro Etymologiae: vol. I.
5. 35 OCR vinculados a obras griegas no muestran escritura griega; debe verificarse lengua impresa y extracción antes de presentar una lectura griega buscable.
6. Hay dos identificadores del índice remoto sin ficha de PDF conciliada y seis pares OCR/PDF huérfanos identificados en auditoría previa. Preservar los objetos y examinar individualmente.

## Trabajo permitido en esta línea
- Ficha por **obra** + ficha por **manifestación/edición** + alcance de libros y páginas; marcar completa/parcial/no comprobada con fuente.
- Autor, título original griego/latino, títulos variantes, editor, imprenta, año, volumen, página inicial/final, procedencia, institución custodia y enlace a ficha primaria.
- URN CTS/DOI/ARK solo cuando el identificador se compruebe; no generarlos a partir de nombres de archivos ni de OCR.
- Para R2: GET/HEAD en el endpoint público, comprobación de tipos MIME, CORS, caché, hashes de muestra y detección de enlaces rotos sin borrar ni fusionar archivos.
- Rendimiento: mediciones repetidas en producción por entorno, TTFB, DOMContentLoaded y primera respuesta; resultados comparables por página y condiciones de red.

## Límites de certificación
Ningún cotejo automático por OCR, hash, listado o metadato certifica la ausencia de capítulos faltantes, identidad manuscrita o contenido completo. Toda edición parcial debe exhibir el alcance concreto.
