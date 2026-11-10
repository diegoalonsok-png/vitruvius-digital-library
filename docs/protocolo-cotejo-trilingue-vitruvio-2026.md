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