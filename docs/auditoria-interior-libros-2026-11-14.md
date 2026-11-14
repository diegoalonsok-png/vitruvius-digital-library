# Auditoría documental de identidad libro ↔ ficha — 14 de noviembre de 2026

**Conservación:** ningún PDF, DOCX, códice, folio o fotografía se borra, sustituye ni modifica. Toda corrección afecta solo metadatos y fichas.

## Resultado de la ejecución completa

GitHub Actions: [Bibliotheca · comprobar el contenido real de PDF y DOCX, ejecución 43630431241](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/43630431241). Cuatro lotes: `0–29`, `30–59`, `60–89`, `90–116`.

| Estado del comprobador | Archivos |
| --- | ---: |
| Compatible en metadatos examinados, **edición no certificada** | 6 |
| Revisión manual necesaria | 108 |
| No se pudo inspeccionar plenamente | 3 |
| **Total procesado** | **117** |

Criterios técnicos: descarga de R2, huella SHA256, bytes, páginas digitales, texto inicial y final, títulos y volumen encontrados por búsqueda heurística; la versión posterior del script incluye muestras interiores al 25 %, 50 % y 75 %. **Ni una búsqueda textual positiva ni la coincidencia de bytes aseguran que la portada y todo el libro respondan al título anunciado.** Estos resultados no son una collatio, ni certifican contenido íntegro ni traducción.

Los informes por lote se conservan como artefactos de la ejecución de GitHub Actions, con los registros individuales. La clasificación `manual_review_needed` incluye indicios no detectados y advertencias preexistentes: **no significa que haya 108 archivos erróneos**.

## Correcciones editoriales conservativas de esta tanda

**No se modifica la clave interna histórica ni el original digital.** Se corrige el rótulo de la obra tal como aparece al lector y se añade una advertencia documental.

- `galeno-kuhn-vol01`: la clave heredada sugiere volumen I; el catálogo de la reproducción y su SHA256 apuntan al volumen XIV también inscrito como `galeno-opera-kuhn`. No publicitar como volumen I ni eliminar ninguna de las dos referencias.
- `galeno-opera-kuhn`: dejar visible la declaración documental de volumen XIV, sin fingir inspección autóptica.
- `rose-vitruvius-1899`: año 1899 en la clave, 1867 en el registro bibliográfico; no adjudicar fecha definitiva al ejemplar antes del cotejo de la portada.
- `petrarca-secretum`: impreso colectivo, no edición individual; localizar hojas concretas del *Secretum*.
- `valerio-flaco-argonautica`: solo libro I.
- `platon-protagoras`: registro del *Protágoras*, no asegurar Laques, Menón o Eutidemo.
- `platon-teeteto-sofista`: registro de *Teeteto*; no asegurar *Sofista*.
- `higino-fabulas`: *Fabulae*; no anunciar *Astronomía poética* como contenido acreditado.
- `serlio-architettura`: *Regole generali*, no colección *Tutte l'opere* completa.
- `isidoro-etymologiae`: volumen I, no asegurar cobertura completa de veinte libros.
- `paladio-opus-agriculturae`: traducción medieval inglesa, parte I; no edición íntegra del latín.
- `galeno-scripta-minora`: volumen III, no toda la serie.
- `luciano-obras`: volumen I, no obras completas.
- Advertencias ya visibles y mantenidas: `euclides-elementos` (libros I–VI), `celso-de-medicina` (libros I–IV), `columela-de-re-rustica` (libro X, traducción italiana), `petronio-satiricon` (poema *Bellum civile*), `amiano-marcelino-es` (tomo II), y cuatro textos técnicos incluidos en un mismo volumen de Wescher (1867).

## Prioridad de revisión real de cada libro

1. Comparar en el facsímil portada y pie editorial con título, autor, editor, traductor, fecha, volumen y lengua anunciados.
2. Leer índice, advertencias, colofón o preliminares para fijar el **contenido real**, incluidos límites y unidades o libros presentes.
3. Confirmar páginas o folios de comienzo y final de la obra. En antologías, asignar página inicial/final a cada texto **sin dividir ni borrar el PDF colectivo**.
4. Guardar evidencia exacta: página del PDF (contador digital), página impresa si existe, cita bibliográfica, fuente original y resultado `verificado / discrepante / no concluyente`.
5. Resolver los tres casos que no se pudieron inspeccionar sin sustituir documentos y repetir los cotejos de los 108 restantes.

**Nota editorial:** las correcciones basadas en títulos catalográficos no equivalen a haber observado las páginas internas de esos ejemplares. Las fichas no deben publicitar una cobertura más amplia de la que su fuente acredita.
