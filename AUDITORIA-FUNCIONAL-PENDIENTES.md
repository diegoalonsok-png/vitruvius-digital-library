# Auditoría funcional: problemas confirmados y verificaciones pendientes

**Corte de revisión:** 5 de noviembre de 2026. Esta bitácora diferencia correcciones hechas en el código de pruebas **aprobadas efectivamente**. No debe interpretarse como certificación de funcionamiento total.

## Corregido en código; requiere validación posterior

1. **Fallo al mostrar la lista de obras del catálogo clásico.** En `assets/bibliotheca-graeca-latina.js`, `render()` utilizaba `q` en `matchingWitness(w,q)` antes de declararla (`ReferenceError`). La declaración fue adelantada al comienzo de `render()` (commit `1f773689`). Se comprobó la sintaxis JavaScript y se añadió una prueba de regresión; **falta confirmar en una ejecución nueva de navegador**.
2. **Falta de detección temprana de errores de representación.** `scripts/classics-visor-smoke.mjs` ahora comprueba que el catálogo muestra al menos 190 fichas, que existe la tira de pestañas de la obra solicitada y que no aparecen errores JavaScript en la carga. Esto evita siete tiempos de espera consecutivos sin explicar la causa común. **Prueba incorporada, todavía sin resultado nuevo confirmado**.
3. **Integridad y ordenación de códices.** El corpus tiene 221 obras; la colección estructurada consultada tiene 23 testimonios y 63 ediciones sin identificadores de obra huérfanos. Se asignaron fechas aproximadas de inicio a los 23 testimonios, preservando sus rótulos de datación y controversias. Se incorporaron búsquedas por signatura e identificación del testimonio, más pruebas de integridad. **No equivale a cotejo académico de cada fuente**.

## No resuelto / sin verificación suficiente

| Componente | Observación de la última prueba de navegador disponible | Estado |
| --- | --- | --- |
| Aristóteles, *Poética*: visor PDF griego | No apareció la barra del PDF en el plazo de prueba | **NO VERIFICADO después de la corrección** |
| Virgilio, *Eneida*: PDF parcial | No se confirmó la vista PDF y su información sobre libro I | **NO VERIFICADO después de la corrección** |
| Virgilio, *Eneida*: vínculo directo a Vaticanus Romanus | No apareció el selector de manuscrito | **NO VERIFICADO después de la corrección** |
| Cicerón, *De officiis*: lector triple | No apareció la barra de pestañas | **NO VERIFICADO después de la corrección** |
| Aristóteles: original y traducción inglesa | No apareció el selector de ediciones PDF | **NO VERIFICADO después de la corrección** |
| Lucrecio: lector paralelo | No apareció el selector de ediciones | **NO VERIFICADO después de la corrección** |
| Virgilio, *Geórgicas*: PDF latino | No se confirmó la carga del visor | **NO VERIFICADO después de la corrección** |
| Enlaces internos y recursos externos | El auditor informó errores en ejecuciones anteriores; la nueva ejecución completa aún no fue examinada | **PENDIENTE** |
| Carga simultánea, desempeño móvil y búsqueda por imagen/audio | No hay prueba completa que certifique estas prestaciones | **PENDIENTE** |
| Traducciones y datación de cada manuscrito | Existen registros provisionales; no se cotejó todo el corpus con las bibliotecas custodias | **PENDIENTE ACADÉMICO** |

**Importante:** los siete casos de lector proceden de una ejecución anterior al arreglo de `render()`, y pueden haber sido síntomas de un único bloqueo. No deben marcarse ni como definitivamente rotos ni como solucionados hasta pasar la prueba posterior.

## Evidencias registradas

- Ejecución de lectores con **7 fallos**: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42127872727
- Regresión Vitruvia anterior: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42127801939
- Prueba de integridad del catálogo: `node scripts/test-classical-catalogue-integrity.mjs`
- Prueba de navegación y visores: `node scripts/classics-visor-smoke.mjs`
- Panel de ejecución: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions

**Criterio de cierre:** solo marcar **RESUELTO** cuando una ejecución posterior a la corrección complete satisfactoriamente la prueba correspondiente y, para funciones de UI, se observe el control en un navegador. La existencia de archivos PDF no implica que sus lectores sean funcionales. La aprobación técnica no sustituye la revisión filológica.
