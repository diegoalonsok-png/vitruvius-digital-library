# Cotejo de simetría GitHub ↔ Cloudflare R2 — 16 de noviembre de 2026

Auditoría conservadora basada en manifiestos versionados. **No implica cotejo SHA completo de todos los objetos R2 ni publicación terminada de los índices nuevos.** No borrar ni sustituir archivos sin reconciliación documental.

## Evidencia de R2
- `data/r2/classics-sync-status.json`, verificado 2026-11-16T17:17:27Z: 44 originales y 46 850 pasajes declarados y validados contra SHA de origen durante la construcción del índice.
- `data/r2/r2-object-status.json`, generado 2026-11-16T18:17:28Z: 117 PDF y 117 OCR presentes, 0 objetos faltantes y 0 desajustes de metadatos declarados.
- `data/r2/bibliotheca-r2-live-audit.json`: 119 identificadores indexados frente a 117 fichas de PDF; los dos IDs extra son `boecio-institutione-musica` y `historia-augusta`. No borrar: sus PDF/OCR están entre los objetos no vinculados.
- Otros PDF/OCR no vinculados en el listado de objetos: `estacio-obras`, `juliano-obras`, `justino-trogo-es` y `prudencio-poemas`. Son seis pares físicos contando los dos primeros.

## Búsqueda textual
- `data/classics-corpus/search-registry.json`: 295 registros textuales, 230 workId distintos tras tres incorporaciones griegas.
- `data/index/classics/manifest.json`: 247 entradas locales, fecha 2026-11-12, **anterior** al lote griego.
- `data/index/classics-r2/manifest.json`: 44 entradas remotas; las 44 coinciden por workId e idioma con `data/r2/corpus-manifest.json`.
- Unión por (workId, language): 290 pares léxicos; 9 registros del buscador sin pareja idéntica. **No interpretarlo como nueve textos perdidos**, por diferencias de identificadores y rutas especiales.

### Nueve correspondencias por revisar
1. `callimachus-hymni|grc`: archivo nuevo; regenerar índice local.
2. `theocritus-idyllia|grc`: archivo nuevo; regenerar índice local.
3. `menander-dyskolos|grc`: archivo nuevo; regenerar índice local.
4. `vegetius-epitoma|la`: examinar el archivo y su inclusión efectiva.
5. `krohn-1912-pdf|la`: fuente en `data/text/` que puede usar otro índice; no asumir ausencia.
6–9. `vitruvius|la`, `vitruvius|es`, `vitruvius|fr`, `vitruvius|en`: el índice estructurado utiliza IDs `vitruvius-recensio-*` y `vitruvius-theory-en`, por lo que se requiere mapear alias, no volver a descargar.

### Alerta de identidad editorial
En R2 ya figura `calimaco-himnos|grc`, mientras la nueva colección local es `callimachus-hymni|grc`. Son identificadores diferentes que pueden solaparse editorialmente. Mantener los archivos, pero **no duplicar recuentos de una misma edición sin distinguir sus URN, obras incluidas y cobertura**.

## Pendientes de cierre
1. Validar el resultado de GitHub Actions `index-new-greek-classics-2026-11-16.yml` y regenerar `data/index/classics/`.
2. Confirmar búsqueda y lectura en producción de los tres nuevos textos y test de términos griegos.
3. Conciliar 119/117 fichas PDF con los seis pares no vinculados; nunca eliminar objetos sólo porque no estén en el catálogo.
4. Comprobar R2 después de cualquier nueva subida: HEAD, tamaño, identidad de contenido, URN y URL del lector.
5. Verificar la correspondencia de `vegetius-epitoma`, Krohn y los alias de Vitruvio.
6. Mantener separados «texto original», «traducción», «PDF/OCR», «edición crítica» y «ficha bibliográfica».

**Conclusión:** simetría comprobada para los 44 originales R2; sin prueba suficiente para certificar simetría integral del catálogo y los índices locales de GitHub.
