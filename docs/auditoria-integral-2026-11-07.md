# Auditoría integral de Vitruvius Digital Library
**Corte:** 7 de noviembre de 2026. **Repositorio:** `diegoalonsok-png/vitruvius-digital-library`. **Commit auditado:** `697de38e875d68fd6f22ba352a35c80e2d62af20`.

## Alcance, método y límites
Examen de los archivos del repositorio, los informes JSON de cobertura e integridad, el motor de imágenes, la composición CSS de Vitruvia, los ensayos automatizados y la situación de los pull requests abiertos. No se han corregido aquí los textos originales, las traducciones, los loci, ni los datos de las ediciones. No hubo acceso navegable al dominio público desde esta sesión; las URL del sitio no se pudieron inspeccionar en vivo. Tampoco se inspeccionaron todas las páginas, imágenes, licencias o vínculos externos de manera individual. En consecuencia, **CI aprobado no significa que toda búsqueda real de fuentes externas, ni toda edición académica, esté certificada**.

## Conclusión ejecutiva
**La plataforma publica y supera las pruebas técnicas principales, pero sus índices no abarcan el catálogo completo y su aparato crítico aún contiene relaciones no cotejadas.** La versión consultada es un proyecto editorial y de investigación con buena trazabilidad y amplitud funcional, pero no puede calificarse como corpus universal completamente editado, revisado e indexado.

## Evidencias de publicación y funcionamiento
- [GitHub Pages: publicación exitosa del commit auditado](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420819535).
- [Validar sitio Vitruvio: success](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420819774).
- [Auditoría automatizada de la biblioteca: success](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420819914).
- [Rendimiento y referencias: success](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420820028).
- [Geometría de Vitruvia: success](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420819684). La prueba de Chromium usa un dossier sintético sobre «Cristos negros de Centroamérica», un resultado sintético y ventanas de 1440, 960 y 390 píxeles, **sin solicitudes a servicios externos**. Demuestra ausencia de columnas vacías dentro de ese escenario, no la pertinencia ni la recepción de imágenes reales.

## Cobertura corpus · instantánea del 7 de noviembre
Fuentes: `data/classics-corpus/coverage-audit.json`, `search-registry.json`, `translation-availability-222.json`.
- **222** fichas de obras: **27** declaradas como lectura local completa, **1** parcial, **21** con fuente externa identificada, **129** repertoriadas para búsqueda externa y **44** pendientes de incorporar. Una ficha no prueba que su texto esté indexado.
- **24** obras distintas tienen alguna versión textual buscable; **50** versiones textuales registradas (17 latinas, 7 griegas, 19 inglesas, 5 castellanas y 2 francesas).
- **21** obras tienen al menos una traducción alojada/indexada; **201** aún no la tienen; original textual indexado para **24**, sin original indexado para **198** según el informe de traducciones.
- Cobertura por obras con texto indexado: **24/222 = 10,8 %**; no es cobertura del universo total de clásicos.
- `data/classics-corpus/semantic-conceptus-postings.json`: **66** conceptos documentados, 50 versiones en el registro, 49 elegibles y 47 indexadas semánticamente bajo el método declarado; no es lematización universal ni búsqueda vectorial certificada.
- `data/classics-alignment/manifest.json`: **16** parejas de original/traducción con navegación por loci editoriales; ninguna constituye automáticamente colación semántica verificada.
- `data/classics-corpus/pdf-inventory.json`: **10** PDF clásicos históricos catalogados, sin certificación individual del OCR de esos mismos PDF.

### Discrepancia verificable (prioridad alta)
El backlog `data/classics-corpus/indexation-backlog.json` declara **199** originales faltantes mientras `translation-availability-222.json` declara **198**. Se localizó la causa: **`ovid` (Ovidio, *Metamorphoses*) aparece con versión latina `data/classics-corpus/ovid-la.json` en el registro y el informe de cobertura, pero el backlog lo marca sin ningún idioma indexado**. La lista de pendientes derivada debe regenerarse desde el registro actual, no corregirse mediante una cifra manual aislada. Contrastar además la fecha de generación del informe viejo `data/academic-integrity.json` (5/11: 221 fichas y 20 lecturas locales declaradas) con la nueva capa de 222 fichas y 50 versiones del 7/11.

## Texto vitruviano y aparato crítico
Fuentes: `data/academic-integrity.json` (corte 5/11), `data/structured/latin-collation-audit.json` (7/11), `data/structured/index-report.json`.
- Tres ediciones estructuradas de `De architectura`, referencia común de **731 loci**. V514 y V554 contienen 731 bloques; V297 contiene 728 bloques con agrupaciones de loci. La ausencia de un ID puntual no demuestra pérdida de texto.
- Comparación automática del latín: **636** loci idénticos, **41** cercanos, **14** moderados, **37** con alerta y **3** identificadores de locus faltantes/agrupados. Las alertas exigen cotejo por capítulo antes de modificar lecturas. Son **95** coincidencias no clasificadas como idénticas, incluidas las 3 incidencias de identificadores.
- Informe académico anterior: **1393** entradas en aparato/índice, de las que **519** se clasificaban como «locus candidato sin verificar» y **77** como «estimado por posición»; solo **41** como «locus explícito» bajo ese método. Estos recuentos son históricos y deben refrescarse antes de tratarlos como cifras vigentes. El índice no equivale a una collatio autóptica.
- No sobrescribir ni borrar el texto madre para ajustar diferencias numéricas; conservar variantes y traducciones, y anotar discrepancia, evidencia, edición, folio y decisión ecdótica.

## Vitruvia: interfaz, imágenes y relevancia
- La última versión incluye reparaciones para ancho completo, eliminación de las retículas laterales heredadas, muestra automática de la galería cuando hay imágenes identificadas y desactivación visual provisional de la consulta filológica multilingüe. Test de geometría de Chromium aprobado.
- `vitruvia.html` incluye **56** scripts externos y **17** hojas de estilo, más estilos en línea. Es una señal de complejidad, no una prueba de mala velocidad. Debe medirse latencia, solicitudes, memoria y rendimiento móvil antes de intervenir.
- La búsqueda «logos/λόγος» dispone de un fallback identificado en Wikimedia Commons (`File:Logos.svg`), presentado correctamente como **grafía tipográfica moderna**, no como manuscrito antiguo. La pertinencia del resto de imágenes de Commons y Wikipedia requiere verificación viva, relevancia histórica y control de licencias.
- El buscador debe privilegiar identidades históricas precisas frente a homónimos y multimedia inapropiados. La prueba actual de geometría no detecta sustituciones de Julio César por deportistas ni de San Martín por imágenes artificiales. Recomendada prueba de relevancia con consultas «logos», «Cristos negros de Centroamérica», «Julio César», «José de San Martín», «domus» y `λόγος`, comparando título, identidad, autoridad, imágenes y fuentes.

## Lexicon
- `data/lexicon/etymologicum.json` tiene **115** fichas etimológicas; `sententiae.json` tiene **60** entradas; `conceptus.json` tiene **66** conceptos semánticos. Hay pruebas reproducibles de correspondencia de citas y loci de V514 en `scripts/audit-vitruvia-lexicon.mjs`, pero el reconocimiento morfológico y las lecturas de papiros/códices no se certifican con estos conteos.
- Controlar por separado latín, griego, grafías históricas, etimologías reconstruidas, correspondencias semánticas y testimonios físicos. Nunca presentar equivalencia léxica como cognación, ni «primera atestiguación» a partir de una simple búsqueda que confunda fecha de composición con datación del manuscrito.
- Probar visualmente búsqueda por `logos` en castellano, `λόγος` en griego, `domus`, `loci` y saltos al lector original/traducción.

## PR abiertos: no fusionar a ciegas
Al corte, GitHub indica que estas propuestas requieren resolución de conflictos con `main` (`mergeable: false`):
- [#139](https://github.com/diegoalonsok-png/vitruvius-digital-library/pull/139): subrayado por clic en dossier filológico; borrador.
- [#137](https://github.com/diegoalonsok-png/vitruvius-digital-library/pull/137): auditoría de procedencia del aparato; borrador.
- [#114](https://github.com/diegoalonsok-png/vitruvius-digital-library/pull/114): recuperación semántica y cobertura de traducciones; borrador.
- [#110](https://github.com/diegoalonsok-png/vitruvius-digital-library/pull/110): evidencia comparada griego/latín en Lexicon; abierta.
Las pruebas de estos PR deben repetirse sobre sus bases actualizadas; no mezclar modificaciones en textos críticos con cambios de diseño.

## Priorización operativa
| Urgencia | Acción | Criterio para cierre |
| --- | --- | --- |
| P0 | Regenerar inventario pendiente corrigiendo el caso Ovidio; renovar informes con cifras vigentes | Backlog y reportes concuerdan obra por obra y no declaran índices inexistentes |
| P0 | Prueba real de búsqueda e imágenes con los seis casos indicados; captura móvil/escritorio y comparación de identidades | Render, fuente, imágenes, orden y ancho comprobados sin stubs |
| P1 | Revisar los 37 loci en alerta y los 3 ID agrupados; crear decisiones de lectura con fuente y versión | Acta de cotejo por capítulo, original y traducción intactos |
| P1 | Actualizar la trazabilidad de 519 candidatos y 77 posiciones estimadas del aparato (recuento histórico) | Cada vínculo con estado de evidencia, sin declaración falsa de equivalencia |
| P1 | Incrementar cobertura indexada desde 24 obras, en tandas con editor/idioma/licencia/obra/locus | Crece el registro textual; pruebas para términos y traducciones; ningún PDF se marca indexado por mera presencia |
| P2 | Reducir complejidad de 56 scripts/17 estilos mediante perfilado y módulos condicionales | Métricas reproducibles de carga y funcionamiento sin regresiones |
| P2 | Revisar PR #110, #114, #137 y #139 individualmente | Sin conflictos, CI + navegación real, documentación de alcance |
| P2 | Verificar signaturas, URLs IIIF, licencias, bibliografía y accesibilidad con validación humana | Pruebas y fuentes documentadas por registro |

## Calificación interna orientativa (no evaluación de una universidad)
Escala 0–10: infraestructura y CI **8**, interfaz **7**, relevancia del buscador e imágenes **5**, cobertura textual **4**, rigor filológico verificable **6**, transparencia de límites **8**. Ponderaciones: 20 %, 15 %, 15 %, 20 %, 20 % y 10 %, respectivamente. **Resultado ponderado: 6,2/10, provisional**. No puede sustituir una auditoría externa con navegación en vivo, evaluación de accesibilidad y cotejo filológico independiente.

**Criterio editorial:** ante toda falta de evidencia, preferir «no verificado» a ocultar o inventar pasajes, resultados, manuscritos, fuentes o correspondencias.
