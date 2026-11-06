# Auditoría funcional: problemas confirmados y verificaciones pendientes

**Corte de revisión:** 5 de noviembre de 2026. Esta bitácora diferencia correcciones hechas en el código de pruebas **aprobadas efectivamente**. No debe interpretarse como certificación de funcionamiento total.

## Corregido en código y verificado en navegador

1. **Fallo al mostrar la lista de obras del catálogo clásico.** En `assets/bibliotheca-graeca-latina.js`, `render()` utilizaba `q` en `matchingWitness(w,q)` antes de declararla (`ReferenceError`). La declaración fue adelantada al comienzo de `render()` (commit `1f773689`). Se comprobó la sintaxis JavaScript y se añadió una prueba de regresión; **verificado posteriormente mediante Playwright**.
2. **Falta de detección temprana de errores de representación.** `scripts/classics-visor-smoke.mjs` ahora comprueba que el catálogo muestra al menos 190 fichas, que existe la tira de pestañas de la obra solicitada y que no aparecen errores JavaScript en la carga. Esto evita siete tiempos de espera consecutivos sin explicar la causa común. **Prueba incorporada y aprobada en ejecución posterior**.
3. **Integridad y ordenación de códices.** El corpus tiene 221 obras; la colección estructurada consultada tiene 23 testimonios y 63 ediciones sin identificadores de obra huérfanos. Se asignaron fechas aproximadas de inicio a los 23 testimonios, preservando sus rótulos de datación y controversias. Se incorporaron búsquedas por signatura e identificación del testimonio, más pruebas de integridad. **No equivale a cotejo académico de cada fuente**.

## Resueltos en la batería de navegador posterior a la corrección

Los siete errores anteriores aparecieron en una ejecución de un código que contenía el fallo de referencia a `q`. Una nueva batería de **17 pruebas de navegador** aprobó tanto la carga del catálogo como las funciones listadas abajo.

| Componente | Resultado posterior |
| --- | --- |
| Aristóteles, *Poética*: visor PDF griego | **RESUELTO EN LA PRUEBA** · PDF y número de páginas |
| Virgilio, *Eneida*: PDF parcial | **RESUELTO EN LA PRUEBA** · edición parcial identificada |
| Virgilio, *Eneida*: Vaticanus Romanus | **RESUELTO EN LA PRUEBA** · selector y enlace profundo |
| Cicerón, *De officiis*: lector triple | **RESUELTO EN LA PRUEBA** · pestañas presentes |
| Aristóteles: original y traducción inglesa | **RESUELTO EN LA PRUEBA** · selector de ediciones |
| Lucrecio: lector paralelo | **RESUELTO EN LA PRUEBA** · tres paneles independientes |
| Virgilio, *Geórgicas*: PDF latino | **RESUELTO EN LA PRUEBA** · PDF local |
| Búsqueda real de poemas de Catulo y Lucrecio | **RESUELTO EN LA PRUEBA** · coincidencias textuales |
| Auditoría pública del corpus grecolatino | **RESUELTO EN LA PRUEBA** · 221 fichas y filtros |

Evidencia aprobada: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42137984014

## No resuelto / sin verificación suficiente

| Componente | Estado |
| --- | --- |
| Lectura humana de todas las obras, traducciones y ediciones | **PENDIENTE ACADÉMICO** |
| OCR de las páginas de los 10 PDF clásicos | **NO CERTIFICADO**; inventario específico disponible |
| Comprobación externa de catálogos, licencias, signaturas y IIIF | **PENDIENTE** |
| Rendimiento en dispositivos móviles y concurrencia masiva | **PENDIENTE** |
| Cobertura universal de la literatura grecolatina | **NO GARANTIZABLE**; lagunas documentadas, como Safo y Menandro |
| Publicación de última versión en GitHub Pages | **PENDIENTE DE CONFIRMACIÓN DEL DESPLIEGUE** |

**Interpretación:** las pruebas de navegador posteriores corrigen el diagnóstico funcional de los siete lectores, pero no equivalen a cotejar todas las fuentes ni a garantizar la estabilidad de servicios externos.

## Evidencias registradas

- Ejecución anterior de lectores con **7 fallos** (histórico): https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42127872727
- Ejecución posterior de **17 pruebas aprobadas**: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42137984014
- Regresión Vitruvia anterior: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42127801939
- Prueba de integridad del catálogo: `node scripts/test-classical-catalogue-integrity.mjs`
- Prueba de navegación y visores: `node scripts/classics-visor-smoke.mjs`
- Panel de ejecución: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions

**Criterio de cierre:** solo marcar **RESUELTO** cuando una ejecución posterior a la corrección complete satisfactoriamente la prueba correspondiente y, para funciones de UI, se observe el control en un navegador. La existencia de archivos PDF no implica que sus lectores sean funcionales. La aprobación técnica no sustituye la revisión filológica.
