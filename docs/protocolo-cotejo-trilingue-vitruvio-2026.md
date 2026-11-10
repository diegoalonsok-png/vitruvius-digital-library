# Protocolo de cotejo trilingüe de *De architectura*
 
**Estado:** protocolo editorial preparatorio; no se ha realizado todavía una colación trilingüe definitiva.
**Fuentes estructuradas:** V514 (`recensio-es`, español), V554 (`recensio-fr`, francés), V297 (`theory-en`, inglés).
**Prioridad declarada por el autor (9 de noviembre de 2026):** V514 como base de referencia inicial; V554 como segunda edición editorial consolidada; V297 como versión inglesa más breve y con menor revisión. Esta jerarquía establece una **prioridad de revisión**, no superioridad textual automática de cada lectura latina.

## Principio irrenunciable
No modificar, eliminar ni sobrescribir DOCX, PDF, folios, códices, manuscritos, índices o versiones textuales por discrepancias detectadas algorítmicamente. No igualar recuentos de párrafos moviendo, cortando o inventando texto. Cada edición puede usar divisiones, títulos, traducciones y aparato crítico diferentes.

## Objetos distintos a comparar
1. **Texto latino:** identificar omisiones reales, variantes ortográficas, cambios de lectura, duplicaciones y divergencias de edición. Conservar el testimonio propio de cada edición.
2. **Loci y segmentación:** cotejar libro, capítulo, sección y contexto a nivel de oración y secuencias; una diferencia de identificadores no demuestra una omisión textual.
3. **Traducciones:** verificar porciones correspondientes del original y posibles saltos, inversiones, repeticiones o traducciones asignadas a otro pasaje. La traducción no debe validarse solo por compartir el mismo número de locus.
4. **Aparato crítico:** estudiar presencia, ausencia, variantes, conjeturas, fuentes y referencias. La menor extensión del inglés puede ser legítima; cualquier nota agregada requiere respaldo bibliográfico y revisión humana.
5. **Trazabilidad:** registrar versión, identificador de pasaje, fragmento breve identificador, tipo de diferencia, evidencia y resolución editorial. Toda corrección futura se hará como cambio propuesto, comprobable y reversible.

## Prioridades de la futura investigación
**P0 — posible error sustantivo:** párrafo latino ausente sin correspondencia en capítulos adyacentes; traducción que contradice el latín asociado; pasaje inglés vinculado a capítulo incorrecto; duplicación o salto real.
**P1 — discrepancia editorial:** locus no coincidente, segmentación dividida o fusionada, traducción inglesa más breve, diferencias de lección latina.
**P2 — aparato y referencias:** notas ausentes o más condensadas, variantes citadas sin atribución, referencias cruzadas que requieren revisión.
**P3 — presentación:** títulos, paginación, enlaces de lectura y formato.

## Método
- Inventariar loci y cobertura de los diez libros de cada edición; cotejar por capítulo antes de inferir pérdidas.
- Comparar secuencias de palabras latinas y fragmentos adyacentes (no solo el número de locus). Las coincidencias parciales son candidatos, no prueba.
- Generar informe de incidencias sin cambios automáticos: `reports/vitruvius-trilingual-alignment.json`.
- Priorizar lectura humana ES↔FR, luego contrastar EN con ambas, anotando dónde existe acuerdo o divergencia.
- En todos los resultados distinguir explícitamente: **ausencia de locus homónimo**, **ausencia de texto demostrada** y **nota o comentario ausente**. Son fenómenos distintos.
- Antes de cualquier modificación a la versión inglesa: identificar el pasaje y sus paralelos, comprobar la fuente original y pedir aprobación editorial.

## Hallazgo preliminar, todavía no una corrección
En V514 existen los loci VII.7.2, VII.7.3 y VII.7.5 que no aparecen **con esos identificadores** en el índice V297. Hay indicios de segmentación diferente del capítulo VII.7. No deben declararse «tres párrafos ingleses faltantes» ni repararse automáticamente; se necesita cotejo por contenido y contexto.

La comparación automática futura no podrá certificar por sí misma la fidelidad crítica: requerirá cotejar los textos completos y, si corresponde, los PDF/DOCX originales y el aparato crítico.

## Regla editorial de corrección posterior (confirmada por el autor)

**Primero identificar y listar; después corregir.** La auditoría emitirá dos grupos claramente separados: (a) discrepancias o posibles errores que requieren cotejo de los originales y (b) errores confirmados documentalmente. Cada incidencia deberá contener edición, libro, capítulo, locus, evidencia contrastada, categoría y grado de certeza. Los errores confirmados se presentarán en una lista antes de preparar cualquier modificación. **Ningún cambio automático en ES V514, FR V554 ni EN V297**; tampoco se tocarán folios, códices, notas críticas o PDFs. Toda propuesta correctiva será reversible, documentada y requerirá aprobación editorial expresa del autor.

Archivo de salida previsto: `reports/vitruvius-trilingual-incidencias.md`. El inventario de candidatos no se presentará como catálogo de errores confirmados.


## Cuarto control editorial: Budé / Pierre Gros

Se incorpora la *Collection des universités de France*, serie latina (Budé, Les Belles Lettres), para los diez libros, más la **Editio Minor** de Pierre Gros (2015) como otra referencia editorial, distinta de los diez tomos. Los registros bibliográficos con libro, editor, año, ISBN y enlace oficial están en `data/structured/bude-bibliographic-witnesses.json`.

- **Krohn 1912** y **Rose 1899**: cotejar el OCR con las páginas reales y registrar variantes frente al texto latino de las tres ediciones.
- **Budé, volúmenes I–X**: contrastar lecturas latinas, conjeturas, testimonios manuscritos, siglas y aparato crítico cuando se disponga de acceso legítimo. No equiparar las propuestas editoriales de Budé con un error de las ediciones de Kurilo.
- **Editio Minor (Pierre Gros, 2015)**: control adicional para los diez libros, claramente diferenciado de la serie Budé en tomos.
- **Copyright**: no copiar ni subir texto integral, PDFs o escaneos de Budé sin autorización o base legal adecuada. La ficha y enlaces públicos sí pueden incluirse en los registros de la auditoría.
- **Evidencia**: toda futura incidencia debe atribuir la lectura específica a su editor, libro, locus, página y fuente consultada. Mientras no haya texto cotejable, marcar `pendiente de consulta`, nunca calcular un supuesto porcentaje Budé–Kurilo.

El umbral orientativo de **97 %** sirve para localizar posibles divergencias, pero la calidad filológica no se determina exclusivamente por similitud de cadenas. Se conservan variantes críticas justificadas y la decisión final requiere aprobación editorial.
