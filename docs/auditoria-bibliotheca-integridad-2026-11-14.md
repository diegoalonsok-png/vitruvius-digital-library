# Auditoría de integridad de Vitruvia Bibliotheca — 14 de noviembre de 2026

## Alcance y distinciones

El inventario vigente separa **271 fichas de obra**, **117 registros de edición PDF en R2** y **279 versiones en el registro de búsqueda**. No deben sumarse: representan entidades distintas y parcialmente solapadas. El control existente documenta **54 obras antiguas sin original indexado**, **140 sin testimonio manuscrito individualizado**, **53 sin lectura directa registrada** y **49 con fuentes OCR por revisar**. Fuente: `data/audits/bibliotheca-source-gaps-2026-11-14.json`.

No se ha inspeccionado aún cada objeto binario en producción ni cada folio. Los registros de R2 proporcionan SHA-256 publicados, pero la presente revisión es **de metadatos**.

## Anomalías identificadas

1. **PDF compartido por cuatro obras de poliorcética.** `apollodorus-poliorcetics`, `athenaeus-mechanicus`, `biton-kataskeuai` y `philo-belopoeica` registran el mismo SHA-256 y la misma edición de Wescher (1867). La edición colectiva puede contener los cuatro tratados: no eliminar los vínculos intelectuales, pero **no contar los cuatro como cuatro PDF distintos**. Usar un único objeto físico y localizar páginas/loci específicos para cada tratado.
2. **Galeno, edición de Kühn.** `galeno-opera-kuhn` y `galeno-kuhn-vol01` comparten SHA-256; ambos describen en el campo de título el **volumen XIV**, pese a que el segundo ID dice `vol01`. **Bloquear la identificación del supuesto volumen I** hasta inspeccionar portada, tomo y paginación del PDF real.
3. **Palladio, `Opus agriculturae`.** La auditoría previa identifica como candidato la edición latina de J. C. Schmitt (Leipzig: Teubner, 1898), publicada como `Opus agriculturae`, archivo IA `opusagriculturae00pall`. El registro local señala que el PDF latino aún no se incorporó a R2: comprobar existencia y derechos de la reproducción antes de descargar. Autor **Rutilius Taurus Aemilianus Palladius** (Paladio), **no Andrea Palladio**. Referencias: https://openlibrary.org/books/OL19421459M/Opus_agriculturae_ex_recensione_J._C._Schmittii. y https://atlas.perseus.tufts.edu/library/urn:cts:latinLit:stoa0218.stoa002.nd-dlc-lat1/.

## Regla editorial obligatoria

- **Obra**: autor, título uniforme, lengua, cronología, forma textual y localización canónica (libro, capítulo, sección o verso).
- **Testimonio físico (manuscrito)**: custodio, fondo, signatura, datación y fundamento, soporte, extensión, foliación, escritura, manos, pautado, procedencia, lagunas y fuentes institucionales (TEI P5 `msDesc`).
- **Edición histórica impresa**: transcripción bibliográfica completa (editor, lugar, editor comercial, año, volumen, páginas), fuente y reproducción digital. **No** describir una edición de 1898 como códice antiguo.
- **Traducción**: lengua, traductor, fecha de primera edición y edición digital, derechos y correspondencia con loci; no confundir coincidencia temática con alineación crítica.
- **Archivo**: formato, URL, SHA-256, bytes, permiso de redistribución y comprobación `HEAD/GET` real, separada de los metadatos declarados.
- **Cotejo filológico**: sigla sustentada en edición crítica, variantes y testimonios; no inferir `stemma codicum` de la mera edad de un manuscrito.
- **Duplicación**: primero comprobar SHA-256; después identificadores editoriales, tomos, traducciones y páginas. Varios títulos pueden compartir lícitamente una colección en un solo PDF; varias traducciones de la misma obra sí pueden merecer fichas editoriales propias.

## Prioridades de intervención

1. Reparar las relaciones PDF↔obra para los cuatro tratados griegos de poliorcética y establecer la página inicial de cada tratado, sin copiar cuatro veces el volumen.
2. Resolver el conflicto de tomos de Galeno mediante portada e índice del PDF, antes de modificar URLs o eliminar referencias.
3. Identificar las 54 obras sin original indexado y las 53 sin lectura directa mediante el fichero de auditoría; priorizar aquellas con fuente histórica descargable legalmente.
4. Reconciliar títulos y lenguas de cada PDF: una traducción inglesa de Aristóteles **no** es un texto original griego aunque la obra tenga lengua original `grc`.
5. Revisión de los 49 OCR para distinguir PDF escaneado, OCR mecánico, texto transcrito y texto filológicamente controlado.
6. Probar enlaces del dominio Cloudflare y la ruta GitHub Pages antes de anunciar incorporación publicada.

## Instrumento de comprobación

Ejecutar desde el repositorio:

```bash
python scripts/audit-bibliotheca-editions.py
```

Produce JSON con conteos, agrupaciones por SHA-256, identificadores Archive.org reutilizados y contradicciones de tomo. No altera archivos ni atribuciones.

**Estado**: auditoría documental y primera normalización de interfaz realizadas. No se declara completada la revisión autóptica de 271 fichas ni la verificación en vivo del bucket R2.
