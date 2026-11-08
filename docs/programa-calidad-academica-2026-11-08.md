# Programa de mejora académica verificable · Vitruvius Digital Library

**Fecha de corte:** 8 de noviembre de 2026. **Alcance:** catálogo grecolatino, edición de Vitruvio, manuscritos, bibliografía, indexación y control de procedencia. **Carácter:** evaluación editorial interna, **no** una certificación universitaria, referato externo ni dictamen TEI.

## Objetivo de calidad

Alcanzar un nivel de investigación académica donde cada afirmación, pasaje, edición, traducción, lectura manuscrita y comentario pueda verificarse en su fuente. Una meta numérica de **9,75/10** solo sería defendible con una **rúbrica explícita y evaluación independiente**. No corresponde elevar una puntuación cambiando etiquetas, ocultando ausencias o equiparando un índice a una edición crítica cotejada.

## Indicadores observados y significado

| Indicador | Estado actual | Interpretación y reserva |
| --- | ---: | --- |
| Fichas de obras clásicas | 222 | Registro bibliográfico; no 222 ediciones críticas verificadas |
| Obras con alguna versión en el registro de búsqueda | 176 | Indización de al menos un texto; no implica integridad de todas las obras |
| Versiones de texto en el registro | 240 | Textos originales, traducciones y otros formatos registrados por separado |
| Obras con traducción alojada | 58 | Cobertura por obra, no equivalencia frase a frase ni calidad de la traducción |
| Fichas con al menos una cita de edición estructurada en bibliografía o versiones locales | 54 | Presencia de cita; corrección académica todavía por revisar |
| Testimonios manuscritos con registro individual | 23 | Identificados por institución, signatura, datación y referencia; no colación universal |
| Ediciones históricas documentadas | 63 | Ediciones y traducciones impresas, distintas de testimonios manuscritos |
| Documentos DOCX extraídos para consulta documental | 30 | 25.794 párrafos; el índice derivado no certifica atribución lingüística ni alineación |

Fuentes internas: `data/classics-corpus/coverage-audit.json`, `data/classics-corpus/translation-availability-222.json`, `data/classics-corpus/search-registry.json`, `data/bibliotheca-graeca-latina-I-bce-I-ce.json`, `data/bibliotheca-testimonia-verified.json`, `data/classics-documents/manifest.json`.

## Criterios para una evaluación académica exigente

1. **Integridad y fuente de cada texto:** original digital identificado, autor, título normalizado, editor, edición, impresor/editorial, fecha, versión, institución, licencia y checksum cuando se dispone. Distinguir composición antigua de datación del ejemplar conservado.
2. **Cotejo ecdótico verdadero:** una lectura variante necesita testigo individual, sigla, folio/página, lectura exacta, locus, criterio editorial, editor responsable y fecha de revisión. Registrar hipótesis sin ascenderlas a variantes verificadas. Un árbol cronológico de códices no es por sí mismo un `stemma codicum`.
3. **Citación y persistencia:** referencia estable por obra, edición y pasaje; nota y bibliografía al estilo Chicago 18; vínculo a facsímil o ficha institucional. No inventar bibliografía para completar fichas.
4. **Acceso y cobertura:** lectura completa cuando exista, original y traducción conservados aunque no sea posible alinearlos. Indicar PDF solo imagen, OCR sin revisión, pasajes fragmentarios, traducciones incompletas y textos externos no indexados localmente.
5. **Lexicología, morfología y etimología:** lema y forma atestiguada separados; ortografías y lenguas históricas preservadas; referencias concretas y grado de certeza de raíces y conexiones lingüísticas. No confundir asociación temática con parentesco etimológico.
6. **Interoperabilidad:** exportación TEI P5 responsable; usar `<app>`, `<lem>`, `<rdg>` y `@wit` **solo** con testigos y lecturas verificadas; `<note>` y `<ref>` para comentario o remisión; no producir un falso aparato crítico.
7. **Reproducibilidad y revisión:** historial editorial, pruebas CI, reporte de cobertura y de inconsistencias, procedimientos de recuperación y anotaciones de revisores externos identificados. No atribuir arbitraje académico a un algoritmo.

## Prioridades operativas con orden de intervención

| Prioridad | Acciones verificables | Condición de cierre |
| --- | --- | --- |
| P0 · Estabilidad | Corregir únicamente fallos de enlaces, visores y tests confirmados en el último commit; verificar despliegue GitHub Pages | CI de la revisión final aprobado y navegador sin errores bloqueantes |
| P1 · Bibliografía | Resolver **primero** referencias estructuradas de las fichas con lectura local; cotejar sus ediciones exactas con fuentes identificables | Editor/traductor, fecha, título, edición y fuente ligados al texto correcto y revisados por persona |
| P1 · Cobertura | Indexar primero los originales griegos/latinos, PDF y DOCX **ya alojados**; mantener resultados documentales distintos de edición filológica | Cada archivo disponible tiene lector real o aviso de OCR/no extracción; búsqueda devuelve pasajes |
| P1 · Aparato crítico | Anclar solamente las notas explícitas a loci, mantener notas candidatas separadas; expediente de cotejo de discrepancias latinas | Nota con fuente, libro, pasaje; no se confunde comentario con lectura manuscrita |
| P2 · Historial académico | Publicar versión, criterios de cita y fecha de revisión por edición; mantener hashes | Historial de cambios consultable; versiones previas conservadas |
| P2 · Metadatos | Implementar exportaciones TEI P5, citas Chicago 18, códigos de manuscritos y enlaces institucionales | Validación TEI y localizadores persistentes, sin referencias ficticias |
| P3 · Evaluación externa | Solicitar revisión de latinistas, helenistas, historiadores de la arquitectura y especialistas en humanidades digitales | Dictámenes fechados, autores y método publicados con sus reservas |

## Política de preservación obligatoria

**No modificar, eliminar, mover, sustituir, comprimir ni renombrar los folios de Vitruvio.** Conservar códices, originales y facsímiles (Codex H, Cesariano, Perrault, Sulpizio y otras ediciones) y mantener inalterada la estética existente de los lectores, Lexicon, Bibliotheca y Vitruvia. Mejorar índices y metadatos mediante archivos **derivados**, por fuera de los originales. Conservar los originales y las traducciones aunque no haya correspondencia comprobada.

## Instrumentos de verificación implementados

- `scripts/audit-scholarly-integrity.mjs`: integridad de loci y notas atribuidas, no certificación autóptica.
- `scripts/audit-scholarly-citations.mjs`: control adicional de bibliografía estructurada por ficha, testimonios, ediciones e índices documentales; genera `reports/scholarly-citation-coverage.json`.
- `scripts/audit-academic-readiness.mjs`: métricas de corpus, etimología, parejas lingüísticas y discrepancias que requieren juicio humano.
- `scripts/test-classical-catalogue-integrity.mjs`: registros de obra, documentos, testimonios y referencias locales.
- `.github/workflows/academic-philology-audit.yml`: ejecuta controles y conserva reportes por revisión.

Estos mecanismos miden **consistencia e información disponible**, no la exactitud filológica de cada lectura. Las alertas sobre cobertura bibliográfica pendientes de revisión humana **no** se silencian para obtener una calificación numérica mayor.

## Referencias metodológicas

- TEI Consortium, [P5 Guidelines, Critical Apparatus (versión 4.12.0, 28 julio 2026)](https://vault.tei-c.de/P5/current/doc/tei-p5-doc/en/html/TC.html).
- [The Chicago Manual of Style, 18th edition (2024): notas y bibliografía](https://www.chicagomanualofstyle.org/home.html); ejemplos y aclaraciones: [Purdue OWL, Chicago 18](https://owl.purdue.edu/owl/research_and_citation/chicago_manual_18th_edition/cmos_formatting_and_style_guide/chicago_manual_of_style_18th_edition.html).
- `docs/protocolo-filologico-ecdotico.md`: política editorial de Vitruvius sobre testimonios, loci, traducciones y aparato.
