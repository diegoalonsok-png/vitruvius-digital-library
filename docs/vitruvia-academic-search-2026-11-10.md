# Vitruvia · Búsqueda académica y transparencia (10 de noviembre de 2026)

Documento técnico de la rama `improve-vitruvia-search-academic-20261110`.
No acredita evaluación universitaria ni certificación filológica externa.

## Recuperación lexical y neuronal

- El modo **IA semántica** expone una elección explícita: **BM25** (predeterminado, sin descarga neuronal) o **E5** (opcional; `Xenova/multilingual-e5-small` en `q8`, WebAssembly, descarga inicial anunciada de aproximadamente 120 MB).
- BM25 recupera fragmentos textuales indexados. E5 calcula vectores en el navegador y reordena candidatos usando fusión recíproca de rangos; no constituye traducción, lectura manuscrita ni concordancia ecdótica.
- El modo seleccionado se indica en los resultados. E5 puede fallar y retroceder a BM25; el ahorro de datos fuerza BM25.
- La cobertura E5 depende exclusivamente de `data/ai-corpora.json` (actualmente las ediciones estructuradas V514/V554/V297 y una edición digital de la Ilíada). La cobertura de Bibliotheca y del Lexicon se consulta por índices distintos. **No se declara cobertura neuronal de todo el catálogo.**
- No se publica una matriz de embeddings: el modelo calcula vectores en el cliente. Su ausencia no impide la ejecución. Falta una evaluación formal de relevancia (`P@10`, `MRR`, latencia, memoria y pruebas móviles) para afirmar una calidad comparativa.

## URLs, filtros y exportación

- Se mantienen vínculos de consulta `vitruvia.html?q=...&mode=...`. El modo neuronal explícito conserva `engine=e5`; en ausencia de ese parámetro, BM25 evita la descarga E5. El modo privado elimina la consulta de la barra de direcciones, pero **no impide** que proveedores externos reciban las búsquedas solicitadas.
- Los filtros de clase de evidencia se conservan. Los filtros adicionales de **edición** y **idioma** operan sobre tarjetas ya recuperadas y con metadatos explícitos; no deben presentarse como filtros exhaustivos del corpus remoto.
- Las exportaciones **BibTeX**, **RIS**, **Chicago 18** y **CSV** existentes permanecen. Se añade un índice simple de loci en **Markdown** para registros con locus y vínculo documental declarado. La exportación nunca debe completar campos con metadatos inventados.

## Referencias, facsímiles y Lexicon

- `assets/vitruvia-research-engine.js` expone el analizador de referencias a las pruebas automáticas. Se contemplan las variantes `liber IV`, `lib. IV`, `libro 4`, `Book IV`, `IV.1`, `4.1` y abreviaturas de Vitruvio. Las equivalencias conceptuales no se consideran idénticas a lecturas literales.
- Desde un locus documentado de Vitruvio se ofrece el acceso a `concordancia-folios.html?locus=...`, que señala si la correspondencia con Harley MS 2767 está cotejada, provisional o no identificada. **Nunca se asigna un folio concreto por conjetura.**
- Los resultados de pasajes consultados con un vocablo único pueden abrir ese vocablo en **Vitruvia Lexicon**, donde se encuentran las herramientas morfológicas existentes. El enlace no equivale a confirmar una lematización.
- Se preservan todos los códices, imágenes, textos originales y traducciones; el módulo de enlaces no modifica fuentes primarias.

## Pruebas y límites

El control `node scripts/test-vitruvia-search-contract.mjs` valida la sintaxis JS, nueve variantes de referencia, recuperación BM25 sobre un corpus de prueba sin descargar E5 y los puntos de integración del buscador. Se incorpora al flujo CI de búsquedas.

Estas pruebas no sustituyen una sesión en navegador ni miden cobertura real de los enlaces externos, precisión de E5, posicionamiento en Google o validación humana de todos los loci. El funcionamiento en el sitio público debe comprobarse luego de la publicación de GitHub Pages.
