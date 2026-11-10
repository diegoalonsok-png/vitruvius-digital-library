# Cotejo de los prefacios latinos de Vitruvio: V514 · V554 · V297

**Fecha de examen:** 9 de noviembre de 2026. **Estado:** auditoría textual realizada; ninguna edición ni PDF modificado.

## Método
Se compararon los 70 loci de prefacios de los libros I–X en los tres corpus estructurados del repositorio. Se examinaron **secuencias completas de palabras latinas**, después de normalizar mayúsculas, diacríticos, `u/v` y `i/j`, ignorando cambios de puntuación. Se cotejó también la concatenación de los párrafos de cada prefacio, para no confundir la distinta segmentación con pérdida del latín.

La verificación adicional en GitHub Actions utilizó **Poppler/pdftotext en las páginas publicadas** del PDF inglés y castellano, buscando secuencias de cuatro palabras completas. Para los fragmentos ausentes del texto indexado se revisó además el OCR de **Krohn 1912** y **Rose 1899**. Las OCR son corroboraciones auxiliares; no constituyen por sí solas una colación diplomática. Budé sigue pendiente de acceso textual autorizado.

## Resultado

| Referencia | Prefacios idénticos por locus | Prefacios completos idénticos como secuencia latina |
| --- | ---: | ---: |
| V514 castellana ↔ V554 francesa | **70 de 70 loci** | **10 de 10 libros** |
| V514 castellana ↔ V297 inglesa | **65 de 70 loci** | **7 de 10 libros** |

La comparación ampliada al conjunto de la obra encontró **731 de 731 loci normalizados idénticos entre castellano y francés**. En inglés coincidieron **632 loci** con los del castellano; otros **96 loci** compartidos tienen diferencias y **tres IDs** del castellano no tienen homónimo inglés por segmentación del capítulo VII.7, sin implicar tres pérdidas de texto.

La comparación por capítulos del latín español/inglés arroja un coeficiente Dice de **98,66 %**, ponderado por número de palabras normalizadas. Este indicador no exige conservar el orden de las palabras: **no demuestra una calidad filológica del 98,66 %**. En **18 capítulos** el solapamiento está por debajo del umbral exploratorio de 97 %.

## Cinco discrepancias de prefacio en el índice latino inglés

| Locus | Hallazgo verificable | Estado editorial |
| --- | --- | --- |
| **II, praef. 5** | La transcripción inglesa presenta formas como `materiationibus` frente al `materiae rationibus` de V514/V554, y `natura e` frente a `naturae`; hay más cambios dentro de la frase. Los tres párrafos contienen 111 palabras normalizadas. | **Variantes/defectos de transcripción por verificar contra PDF y testigos** |
| **VII, praef. 12** | Las siete palabras `Quibus vero felicitas maximum summumque contulit munus` se añadieron al final de esta entrada inglesa. | **Reparto diferente entre párrafos, sin pérdida del latín** |
| **VII, praef. 13** | La entrada inglesa comienza después de esas mismas siete palabras, que están en la entrada anterior. | **Reparto diferente entre párrafos, sin pérdida del latín** |
| **VIII, praef. 4** | El índice inglés omite **47 palabras finales**. No aparecen reubicadas en ningún otro locus latino del JSON V297. | **Omisión confirmada en el JSON indexado; el PDF inglés sí contiene el fragmento** |
| **IX, praef. 3** | El índice inglés omite **24 palabras finales**. No aparecen reubicadas en ningún otro locus latino del JSON V297. | **Omisión confirmada en el JSON indexado; el PDF inglés sí contiene el fragmento** |

### Contraste adicional con los PDF publicados

Ejecución: [Cotejo real PDF ES–EN en GitHub Actions](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42734925964) (**success**).

- **VIII, praef. 4:** el fragmento esperado está representado por **44 de 44** secuencias consecutivas de cuatro palabras en la extracción del **PDF inglés** (páginas cercanas a la 738). En el PDF castellano también se encuentra, con 29 de 44 secuencias por el resultado de extracción.
- **IX, praef. 3:** están presentes **21 de 21** secuencias consecutivas de cuatro palabras en el **PDF inglés** (páginas cercanas a la 782). En el PDF castellano se hallaron 17 de 21.
- **VII, praef. 12–13:** la secuencia desplazada figura en el PDF inglés y en el castellano.
- **II, praef. 5:** se identificaron 23 de 32 secuencias de cuatro palabras del tramo en el inglés; precisa revisar las palabras concretas para determinar si existe diferencia de fuente o ruido de extracción.

**Conclusión central:** no hay evidencia de pérdida material de esos dos finales de prefacio en el PDF inglés publicado. La intervención prioritaria debe ser en el **texto latino JSON y la alineación de su lector**, no reemplazar el libro entero ni reparar PDFs que conservan el texto.

## Prioridades para el resto del tratado

Los capítulos con menor solapamiento latino español/inglés en una primera comparación de palabras fueron **VII.6 (75,44 %), IX.2 (88,56 %), X.12 (91,76 %), VII.7 (91,78 %), I.1 (92,96 %)**. También conviene revisar los prefacios de VIII y IX tras corregir las transcripciones del índice. Una discrepancia de palabras **no equivale automáticamente** a traducción errónea ni a lección corrupta.

**No se modificarán V514, V554, V297, PDF, códices, folios ni los originales DOCX sin una propuesta concreta y aprobación del autor.** Los originales DOCX declarados en los manifiestos no figuran alojados como tales en el árbol actual del repositorio; los PDF de las tres ediciones sí están presentes.

## Evidencia reproducible
- [Comparación de los 70 loci, con páginas y categorías de incidencia](../data/audits/vitruvius-prefacios-latin-20261109.json).
- [Prueba del PDF ES/EN, código de solo lectura](../scripts/audit-vitruvius-preface-pdf.py).
- [Ejecución y artefacto descargable del cotejo PDF](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42734925964).
