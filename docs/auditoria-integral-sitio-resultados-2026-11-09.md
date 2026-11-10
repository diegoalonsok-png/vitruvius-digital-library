# Auditoría integral de Vitruvius Digital Library — informe de ejecución

**Fecha local:** 9 de noviembre de 2026. **Repositorio:** `diegoalonsok-png/vitruvius-digital-library`.

**Ejecución verificada:** [GitHub Actions #42729907391](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42729907391), estado **success**. Complementan este resultado los workflows de validación de sitio y protección de folios de la misma revisión.

## 1. Resultado técnico de la batería

| Ámbito | Resultado | Alcance |
| --- | --- | --- |
| Pruebas independientes de regresión | **25 aprobadas, 0 fallidas** | Integridad, navegación, léxicos, corpus, búsqueda y lectores |
| Recorrido real por Chromium | **119 páginas, 0 errores JavaScript, 0 errores HTTP locales** | Páginas HTML de nivel superior; no garantiza exhaustividad de todo el repositorio ni de enlaces externos |
| Pruebas de interfaz | **sin fallos en la batería** | Scriptorium, PDF, códices, bibliografía, búsqueda, índices, atlas, visores y botones incluidos en las pruebas |
| Indices locorum | **95 consultas, 2.821 enlaces, 659 atestaciones, 0 fallos** | Comprobación funcional contra datos originales indexados |
| Integridad catalográfica | **222 fichas, 246 versiones, 0 rutas inexistentes en registros locales** | Fichas y rutas, no colación de ediciones antiguas |
| Preservación | **controles aprobados** | Folios y ediciones madre protegidos por workflow específico |

Existen **131 archivos HTML** en todo el repositorio según la auditoría estructural, de los que **119 páginas de nivel superior** se abrieron en Chromium mediante `all-pages-check`. Las páginas dentro de subdirectorios y las referencias externas necesitan auditorías separadas. Los tiempos medidos para búsquedas locales **no representan latencia de Internet** y la herramienta externa de lectura web no pudo acceder directamente a la publicación de GitHub Pages.

## 2. Cobertura de la biblioteca

- 222 registros de obras y tratados.
- 181 originales localmente indexados y 24 originales externos indexados: **205 en total**.
- 17 registros pendientes de original indexable: **14 obras independientes más 3 registros de edición relacionados con Vitruvio**.
- No se detectaron IDs de catálogo duplicados, registros de búsqueda con rutas locales inexistentes ni obras indexadas con IDs ajenos al catálogo.

**Este pendiente es de cobertura**, no de funcionamiento de los 205 originales ya indexados.

## 3. Registro filológico: candidatos, NO errores confirmados

Los corpus estructurados contienen **731 loci en V514 castellano**, **731 en V554 francés** y **728 en V297 inglés**, sin loci duplicados ni traducciones vacías en las tres representaciones analizadas.

**El registro automático incluye 9 incidencias preliminares**: seis registros de correspondencia por identificador y tres grupos de variantes latinas. No son 9 errores editoriales confirmados.

### VII.7 — resultado de una comprobación puntual posterior

Se verificó, usando secuencias normalizadas de palabras del texto latino, la correspondencia siguiente:

| V514 castellano | V297 inglés | Resultado del texto latino |
| --- | --- | --- |
| VII.7.1 | VII.7.1 | 65/65 palabras seguidas, en orden |
| VII.7.2 | VII.7.1 | 30/30 palabras seguidas, en orden |
| VII.7.3 | VII.7.1 | 21/21 palabras seguidas, en orden |
| VII.7.4 | VII.7.4 | 27/27 palabras seguidas, en orden |
| VII.7.5 | VII.7.4 | 19/19 palabras seguidas, en orden |

**Conclusión limitada:** los tres loci no homónimos VII.7.2, VII.7.3 y VII.7.5 **no representan omisiones del latín** en el capítulo inglés analizado. El inglés agrupa cinco pasajes bajo dos identificadores. Falta revisar si la traducción inglesa segmentada y los enlaces de los lectores presentan una alineación correcta. **No se alteran los identificadores ni los textos automáticamente.**

### Otras diferencias latinas detectadas

| Pareja editorial | Loci compartidos con texto latino diferente tras normalizar |
| --- | ---: |
| V514 (ES) / V554 (FR) | 280 |
| V514 (ES) / V297 (EN) | 556 |
| V554 (FR) / V297 (EN) | 601 |

Estos son **contadores de diferencias**, no contadores de errores. Variantes puntuacionales, ediciones o resegmentaciones requieren clasificación previa; el cotejo automático todavía no valida la traducción ni el aparato crítico completo de DOCX/PDF.

### Prioridades siguientes

1. Revisar por capítulo las correspondencias del inglés frente al castellano y francés, empezando por los casos con diferencias de segmentación y menor solapamiento de latín.
2. Generar una tabla de **errores editoriales verdaderamente confirmados**, con versión, locus, frase latina, traducción, evidencia, gravedad y propuesta; **no corregir sin aprobación**.
3. Auditar las páginas dentro de subdirectorios, enlaces externos, disponibilidad de folios/IIIF y velocidad real del sitio publicado.
4. Revisar los 17 registros pendientes de indexación sin borrar originales, códices o folios.

## 4. Documentos e informes fuente

- Informe JSON transversal: `reports/site-audit-unified.json` (artefacto de la ejecución).
- Cotejo preliminar trilingüe JSON: `reports/vitruvius-trilingual-alignment.json` (artefacto de la ejecución).
- Lista preliminar: `reports/vitruvius-trilingual-incidencias.md` (artefacto de la ejecución).
- Prueba de índices: `reports/indices-locorum-battery.json`.
- Workflow reproducible: [site-regression-total.yml](../.github/workflows/site-regression-total.yml).

**Política:** auditar y documentar ahora; corregir versiones, traducciones y aparato crítico únicamente después del cotejo probatorio y de la aprobación del autor. No se modificaron fuentes, folios ni manuscritos durante esta auditoría.
