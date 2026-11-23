# Bibliotheca · política permanente de preservación

Esta política tiene precedencia sobre rutinas de importación, limpieza y sincronización.

1. **NUNCA borrar libros**, originales, traducciones, manuscritos, facsímiles, ediciones, PDF, transcripciones o índices ya publicados. No eliminar los vínculos históricos del catálogo o del buscador. Tampoco sobrescribir un objeto R2 existente con contenido diferente.
2. **Cloudflare R2 aloja todo el contenido bibliográfico**: originales griegos, latinos y otras lenguas clásicas; traducciones humanas; fuentes TEI/XML; textos indexables; índices grandes; imágenes; PDF y facsímiles. **GitHub solo contiene código, flujos, fichas y metadatos ligeros**.
3. **Una obra = un registro bibliográfico**. Si un título y autor coinciden —o las fuentes acreditan un identificador CTS de la misma obra—, no crear un libro nuevo automáticamente. Una edición distinta o la traducción de otro traductor constituye **otra versión de la misma obra**, incluso si comparte idioma.
4. **Nunca sustituir una versión anterior.** Una nueva edición recibe identificador de edición, procedencia, editor/traductor, fecha si consta, licencia, URN o identificador equivalente, hash SHA-256, URL inmutable en R2, índice y enlace de lectura independientes. Se preserva el enlace y la selección predeterminada anteriores.
5. **No repetir archivos idénticos**. Antes de importar, cotejar identidad bibliográfica, URN/identificador de edición, URL de origen, hashes y registros existentes. Un título idéntico por sí solo **no demuestra** que dos ediciones sean duplicadas.
6. **Incorporación condicionada**: acreditar licencia reutilizable, descargar y validar la fuente, publicar texto e índices en R2, comprobar integridad y acceso, y solo entonces anexar las referencias en GitHub. En caso de duda o falla, diferir la operación sin tocar registros previos.
7. **Catálogo y estadísticas**: las versiones y traducciones suman **ediciones**, no **obras distintas**. No incrementar el total de obras cuando únicamente se incorpora otra versión de un autor/título ya registrado. No disminuir los contadores como sustituto de preservar libros.

Protecciones implementadas: `scripts/check-bibliotheca-github-metadata-only.py` y pruebas de regresión `scripts/test-bibliotheca-no-delete.py` / `scripts/test-bibliotheca-versioning.py`. Los procesos automáticos de originales y traducciones deben superar esas comprobaciones antes de actualizar catálogos.
