# Protocolo de excelencia académica — Vitruvius Digital Library

**Versión:** 2026-11-16 · **Estado:** propuesta editorial sometida a revisión; NO acredita cumplimiento.
**Ámbito:** Vitruvio, Bibliotheca Graeca et Latina, lectores, índices, aparato crítico, Lexicon y documentación.  
**Principio:** ninguna nota de 10/10 se atribuye antes de superar controles observables; los resultados automáticos no sustituyen la colación filológica.

## A. Separar los tres estados

Cada ítem académico debe informar por separado:
1. **Implementado en código** (identificador de revisión y archivo).
2. **Verificado técnicamente** (prueba, fecha, resultado y URL/artefacto de ejecución).
3. **Revisado filológicamente** (persona responsable, fuentes impresas o imágenes consultadas, lugar textual, fecha y decisión).

**Prohibido** presentar OCR sin verificar como lectura diplomática, una transcripción de otra edición como el PDF concreto, la existencia de un enlace como derecho de reproducción o una búsqueda literal como lematización experta.

## B. Puertas de aceptación para una biblioteca de referencia

| Eje | Evidencia exigible | Criterio de aceptación |
| --- | --- | --- |
| 1. Inventario de obras | Catálogo + registros de GitHub + manifiestos R2, con identificadores estables | Cada ficha distingue obra, expresión/edición, traducción, testimonio, facsímil y presencia de texto; discrepancias publicadas |
| 2. Integridad del texto | Hash de cada objeto, formato, fuente, licencia y cantidad de unidades canónicas | Ningún registro “completo” contiene huecos no declarados; duplicados por contenido identificados sin borrar fuentes |
| 3. Edición crítica | Para cada variante: locus, lema, lecturas, testigos, fuente concreta, página/folio y estado de verificación | Las variantes automáticas quedan como candidatas; nada del Codex H se afirma cotejado sin imagen |
| 4. Traducciones | Idioma, traductor, fecha, edición, integridad, derechos y alineación declarada | Distinguir alineación validada, provisional, automática y ausente |
| 5. Búsqueda | Batería fija de consultas en latín/griego (flexiones, diacríticos, frase, ausencia) | Resultados reproducibles; “sin resultados” distinto de carga fallida; término y locus enlazados |
| 6. Índices | Index locorum y graeca/latina, KWIC, frecuencia por forma y lema | Denominador corpus/edición visible; recuentos separados Krohn, Rose, Kurilo; registrar normalización |
| 7. Identificadores | URN CTS, DOI, ISBN, TEI P5 y citas | CTS local identificado como local; DOI resuelto; TEI exportado validado con esquema declarado |
| 8. Testimonios e imágenes | Catálogos institucionales, signaturas, folios, derechos y IIIF | Enlaces comprobados; canvas vinculado al locus solo después de verificación |
| 9. Accesibilidad | Navegación teclado, roles, etiquetas, contraste, móvil | Auditoría WCAG 2.2 AA, con incidencias y excepciones documentadas |
| 10. Preservación | Copias versionadas y restauración ensayada de GitHub + R2 | Manifiesto con checksums, fecha, objeto, estado y procedimiento de restauración probado |
| 11. Calidad de publicación | Tests y revisión de diferencias antes de desplegar | No publicar con fallos críticos de lectores/búsqueda; rollback documentado |
| 12. Gobierno académico | Política de erratas, criterios de edición, atribuciones, citas y versiones | Historial público y revisión externa con decisión trazable |

## C. Brechas constatadas en los documentos consultados

- `CITATION.cff` declara `license: NOASSERTION`. **Pendiente de decisión del titular**: licencias separadas para código propio, datos originales y materiales de terceros. No elegir licencia ni relicenciar sin autorización.
- `METODOLOGIA-FILOLOGICA.md` indica que el TEI se genera dinámicamente y que todavía no equivale a XML estático validado con Relax NG.
- Las URN de las recensiones Kurilo son identificadores CTS **locales VDL**, no inscripción externa.
- La conexión folio–canvas del H aún necesita revisión puntual y el OCR no es prueba paleográfica.
- Las auditorías de corpus publicadas en fechas distintas manejan universos y estados diferentes: registrar fecha, fuente y definición de “obra catalogada”, “versión textual”, “texto alojado” e “indexado” antes de comparar números.
- El repositorio dispone de gran cantidad de workflows: preferir consolidar resultados y eliminar afirmaciones duplicadas; **no eliminar trabajos ni materiales sin inventario**.

## D. Plan de ejecución seguro, sin borrar datos

**P0 · Integridad (bloquea publicación si falla):**
- Inventariar todos los objetos GitHub y R2 con manifestación de hash/tamaño, fecha, tipo y obra;
- comparar catálogo, manifiestos, índice y lectores sobre la **misma fecha de corte**;
- guardar diferencias como informe, no modificar automáticamente obras ni índices de producción.

**P1 · Filología:**
- cerrar las lagunas de proveniencia; revisar loci dudosos con imagen original, Rose y Krohn;
- atribuir a cada variante estado: `verificada`, `candidata`, `no evaluada`;
- validar exportaciones TEI y comprobar los nombres de testigos contra el conspectus existente.

**P2 · Usabilidad e interoperabilidad:**
- publicar métrica reproducible de términos arquitectónicos por edición, separando forma exacta/flexiones;
- ensayar 100 consultas de búsqueda y 100 enlaces lector→locus→aparato;
- publicar tabla de derechos por tipo de contenido y procedimiento de cita;
- ejecutar evaluación de accesibilidad y restauración de un respaldo de prueba.

## E. Registro de evidencia por hallazgo

Usar el siguiente esquema en informes de auditoría:

```text
ID | área | URL/archivo | fecha UTC | versión Git/R2 | resultado
esperado | observado | gravedad | prueba reproducible | fuente
bibliográfica | responsable | estado (pendiente/corregido/verificado)
```

**Regla de puntuación:** 10/10 solo después de cerrar todos los hallazgos críticos, demostrar cobertura documental/filológica por cada corpus declarado y contar con revisión independiente. Una ejecución CI “verde” es condición necesaria, no prueba suficiente.

## F. No regresión

Esta propuesta es documental. No modifica el catálogo, los datos, el sitio visible, las referencias DOI/ISBN, las rutas del lector, el índice ni los objetos de R2. Toda implementación posterior debe introducirse como cambio pequeño, con prueba reproducible y revisión antes de fusionar a `main`.

## G. Unidad de evaluación: ecosistema completo, no cuatro productos aislados

La evaluación académica debe medir conjuntamente **Vitruvius + Vitruvia (buscador) + Bibliotheca Graeca et Latina + Lexicon**. El valor diferencial reside en las transiciones verificables entre estos instrumentos, no en el simple recuento de páginas o funciones.

**Pruebas de integración propuestas:** (a) consulta transversal por palabra o frase; (b) resultado identificado por autor, obra, edición, idioma y locus; (c) apertura del lector correcto; (d) selección del término y salto a Lexicon; (e) regreso al pasaje y comparación de ediciones y traducciones; (f) acceso al aparato crítico y, cuando existe una concordancia comprobada, al folio; (g) cita y exportación del resultado sin perder identificadores ni procedencia.

La nota del proyecto debe mostrar dos ejes distintos: **capacidad e integración funcional** y **validación académica y editorial**. Una buena nota en el primer eje no demuestra automáticamente el segundo. No comparar la especialización de una biblioteca temática con el volumen total de colecciones mucho más grandes sin normalizar por objetivo y recursos.
