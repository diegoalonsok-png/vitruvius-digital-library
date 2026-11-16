# Cierre conservador de simetría GitHub ↔ R2 — 16 de noviembre de 2026

## Qué se puede certificar ahora

Se cotejaron los manifiestos versionados `data/r2/corpus-manifest.json` y `data/index/classics-r2/manifest.json`: **44/44 versiones de originales coinciden por identificador e idioma**, sin entradas sobrantes en ninguno de los dos índices. El certificado de origen `data/r2/classics-sync-status.json` registra una comprobación de SHA durante la generación anterior del índice; este informe no afirma una nueva descarga íntegra de todos los objetos.

## Diferencia de facsímiles aún abierta

- Catálogo PDF: **117** ediciones.
- Índice facsimilar R2: **119** identificadores.
- ID adicionales presentes en el índice, sin ficha PDF verificada: `boecio-institutione-musica` y `historia-augusta`.
- El último informe S3 detectó seis pares PDF+OCR existentes pero no acreditados como ediciones en el catálogo: `boecio-institutione-musica`, `estacio-obras`, `historia-augusta`, `juliano-obras`, `justino-trogo-es`, `prudencio-poemas`.
- Varios tienen conflictos directos de atribución o fuentes previamente excluidas. En particular `justino-trogo-es` remite a `apologia-i-de-san-justino`, no a la obra de Trogo. La identificación de `boecio-institutione-musica` incluye también aritmética en el título de la fuente. No promocionar ninguno al catálogo verificado hasta comprobar la edición real.

## Corrección introducida

- Se creó `data/r2/recatalogacion-pendiente-2026-11-16.json`: inventario editorial de los seis pares, con IDs, procedencia, situación, rutas físicas y decisión expresa de **preservación sin promoción**.
- Se amplió `scripts/test-r2-reconciliation-integrity.mjs` para exigir que cada objeto no catalogado tenga correspondencia exacta en el inventario de cuarentena y que no sea presentado como libro verificado.
- Se modificó `.github/workflows/bibliotheca-sync-audit.yml` para ejecutar la prueba también después de cambios en el inventario.
- No se han alterado claves ni bytes de los objetos R2. No se ha forzado una igualdad ficticia de 117 contra 119 eliminando entradas.

## Por completar para certificar la simetría facsimilar

1. Identificar por portada, tabla de contenido y colofón los seis PDF conservados, y cotejar sus primeros pasajes con el original esperado.
2. Asignar una ficha editorial real o una condición de descarte bibliográfico **sin borrar el archivo preservado**, y documentar la corrección de identificador si procede.
3. Regenerar el índice facsimilar a partir de ediciones autenticadas, manteniendo las entradas no verificadas fuera de los resultados acreditados.
4. Ejecutar la auditoría R2 con credenciales, verificar HEAD/GET, e idealmente comparar SHA256 integral del archivo de cada edición; después probar búsquedas y visores públicos.
5. Revisar el resultado de GitHub Actions; la inclusión de una prueba en el flujo no acredita que este haya terminado exitosamente.

**Estado:** índice textual R2 simétrico por manifiestos; índice facsimilar pendiente de conciliación editorial y posterior reconstrucción. La seguridad de preservación tiene prioridad sobre igualar contadores.
