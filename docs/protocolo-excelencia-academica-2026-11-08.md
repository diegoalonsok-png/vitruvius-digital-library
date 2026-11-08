# Vitruvius Digital Library — Protocolo de excelencia académica verificable

**Corte:** 8 de noviembre de 2026. **Alcance:** repositorio `diegoalonsok-png/vitruvius-digital-library` y sus índices editoriales; la fecha de este documento no implica certificación de los enlaces externos ni de las interfaces en navegadores reales.

## Objetivo

Alcanzar la calidad que exigen la filología clásica, la ecdótica, la codicología, la historia de la arquitectura y la edición académica digital. La meta orientativa de **9,75/10** no es una nota académica concedida por una universidad: requiere una rúbrica publicada y una evaluación por especialistas independientes.

**Reglas inmutables:** no modificar los folios ni facsímiles de Vitruvio, nombres/rutas/resolución de imágenes, originales DOCX/PDF, textos madre, traducciones, visores ni la estética funcional. El crecimiento de los índices derivados debe ser pequeño y compatible con el límite de alojamiento. Toda intervención reversible se valida antes de fusionarla.

## Estado documentado de la cobertura

Fuente: `data/classics-corpus/search-registry.json`, `data/classics-corpus/coverage-audit.json`, `data/classics-corpus/translation-availability-222.json`, `data/critical-notes.json`, `data/ecdotic-decisions.json`, `data/bibliotheca-testimonia-verified.json` y `data/classics-documents/manifest.json`.

- **222** obras catalogadas; **176** poseen textos registrados para búsqueda en el índice principal y **46** no.
- **240** versiones textuales buscables; esto no equivale a 240 ediciones críticas independientes.
- **58** obras con al menos una traducción local declarada; **164** no cuentan con una alojada.
- **811** notas de autor extraídas; **41** con locus explícito en ancla y **770** pendientes de revisión de atribución. Ni siquiera el locus explícito acredita por sí solo una variante manuscrita.
- **0** decisiones de lectura con evidencia formalizada en `data/ecdotic-decisions.json`: esquema preparado sin variantes ficticias.
- **23** testimonios manuscritos identificados y **63** ediciones/repertorios bibliográficos registrados; son **registros**, no 23 cotejos autópticos.
- **30** DOCX clásicos ya extraídos, **25.794** párrafos recuperados, con SHA-256 de archivo madre. Pueden consultarse y buscarse separadamente, sin atribuirles lengua, locus ni alineación no verificados.

Las auditorías anteriores quedan como cortes históricos; por ejemplo, el informe del 7 de noviembre con 24 obras indexadas **no describe** el registro más reciente. No sobrescribirlo para simular que siempre se alcanzó la cobertura actual.

## Rúbrica de referencia propuesta para una revisión externa (100 puntos)

| Dimensión académica | Máximo | Evidencia para obtener puntuación alta |
| --- | ---: | --- |
| Procedencia, conservación y autenticidad documental | 15 | Signatura, repositorio, datación justificada, derechos, URL institucional y huella de fuente |
| Constitución del texto y crítica ecdótica | 20 | Base editorial declarada, testigos siglados, lecturas en conflicto, criterios de selección y registro de revisiones |
| Aparato crítico y atribución por locus | 15 | Notas del autor localizadas con evidencia, distinción explícita entre comentario, lectura y variante; citas a folio/página |
| Filología, léxico e historia de la lengua | 10 | Formas originales, lematización contrastada, datación de testimonios, etimologías con diccionario/cita especializada |
| Traducciones y alineación editorial | 10 | Traducción identificada por responsable/licencia, cobertura explícita y cotejo; preservar segmentos no alineados |
| Referencias académicas y citabilidad | 10 | Chicago 18, bibliografía primaria/secundaria separada, identificadores estables y cita exacta por edición/locus |
| Transparencia editorial, licencia y reproducibilidad | 10 | Versiones, límites del OCR, historial de cambios, atribución, archivos/DOI y pruebas de integridad |
| Usabilidad, accesibilidad y fiabilidad técnica | 10 | Ensayos reales de escritorio/móvil, teclado, contraste, accesibilidad, enlaces y tiempos; pruebas automatizadas limpias |
| **Total** | **100** | **No equivale a una calificación alcanzada** |

La nota **9,75** equivaldría a **97,5/100** bajo esta rúbrica *si y solo si* un evaluador externo competente adoptara y aplicara estos criterios. El script de auditoría no asigna esa nota porque no puede verificar lecturas de códices, competencia lingüística de traducciones ni la legitimidad de una revisión por pares.

## Correcciones de máxima prioridad

1. **P0 — Confiabilidad:** mantener verdes las pruebas de integridad y los enlaces. Resolver los errores reproducibles de GitHub Actions. No silenciar fallos mediante `continue-on-error` ni convertirlos en falsos éxitos.
2. **P0 — Procedencia:** impedir que los resultados etiqueten OCR, coincidencias temáticas, archivos DOCX, traducciones o fechas editoriales como lecturas de manuscritos. Una coincidencia de locus puede ser solo *navegación aproximada*.
3. **P1 — Aparato crítico:** cotejar las **770 notas pendientes** con ancla y fuente. Ningún emparejamiento automático pasa a `explicit_in_anchor` sin evidencia documental. Registrar decisiones ecdóticas en un log con antes/después, fuente, testigo, folio, edición y responsable.
4. **P1 — Cobertura:** usar primero los textos ya alojados. Completar las **46** obras faltantes solo cuando sus originales sean atribuibles y legalmente reutilizables. Mantener las 164 traducciones faltantes como ausencia transparente; no fabricar versiones.
5. **P1 — Bibliografía:** por versión identificar editor/traductor, año, editorial, procedencia, idioma, número de volumen/página o locus y URL/DOI. En ausencia de un campo, usar “no acreditado”, nunca inventarlo. Almacenar datos Chicago 18 de forma separada al texto.
6. **P1 — Codicología:** dar acceso al facsímil disponible del testigo antiguo y diferenciar fecha de composición, fecha del códice, fecha de impresión, biblioteca, signatura, folio y derechos. Los árboles documentales cronológicos no son un *stemma codicum* sin errores conjuntivos y separativos demostrados.
7. **P2 — Transparencia:** publicar un registro de cobertura versionado y reproducible por edición; distinguir material completo, fragmentario, OCR y texto sin traducción alineable. Mantener todas las traducciones originales incluso sin correspondencia fiable.
8. **P2 — Validación especializada:** someter muestras representativas —al menos un pasaje de cada libro de Vitruvio y una selección de griego y latín— a revisión filológica independiente, conservando los dictámenes y rectificaciones.

## Controles automáticos incorporados

`node scripts/audit-academic-excellence.mjs` verifica coherencia del catálogo, registro de versiones, rutas de índices, cobertura, manifestación de traducciones, signaturas y fechas de testigos, aparato y registro de decisiones, DOCX extraídos y metadatos de citabilidad. Produce `reports/academic-evidence-gate.json` y falla ante incoherencias **objetivas**, pero deja como **pendientes** las lagunas académicas transparentemente declaradas.

Se ejecuta con `.github/workflows/academic-excellence-gate.yml` y conserva el JSON como artefacto de cada ejecución, sin almacenar copias nuevas de folios, PDF o DOCX. El flujo no certifica el derecho de reutilización, disponibilidad remota de los visores ni precisión filológica de cada palabra.

## Entregables para mejorar credibilidad y uso científico

- Hoja editorial por edición: identificación completa, decisión de texto base, alcance del aparato, norma ortográfica, criterios de traducción y derechos.
- Lista de lugares controvertidos: `locus → lecturas documentadas → fuente y folio → justificación → responsable → fecha`.
- Exportación de cita por pasaje en Chicago 18 y, cuando haya datos suficientes, una forma TEI P5; nunca usar `<rdg>` y `<wit>` para glosas no verificadas.
- Registro de cambios con fecha y comparación del texto anterior, sin sustituir o borrar el original.
- Dictámenes independientes antes de afirmar revisión por pares o aval de una universidad.

**Criterio de aceptación:** no perseguir una puntuación artificial, sino lograr que cualquier investigador pueda reconstruir las fuentes, reproducir una búsqueda y distinguir lo editado de lo todavía conjetural.
