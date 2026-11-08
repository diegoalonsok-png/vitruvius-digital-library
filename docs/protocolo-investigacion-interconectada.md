# Protocolo de investigación filológica interconectada
**Vitruvius Digital Library · revisión de 8 de noviembre de 2026**

Este documento regula la integración de **Vitruvia, Lexicon, Bibliotheca Graeca et Latina, Index Codicum, Aparato Crítico, lectores y corpus manuscritos**. Se añade una infraestructura de navegación; no se modifican originales, folios, visores ni estética vigente. El protocolo es una **norma editorial y de verificación**, no una acreditación por una universidad ni garantía de revisión humana de toda ficha.

## 1. Tipos de afirmación y lógica de la inferencia
| Categoría | Evidencia mínima | Lo que no demuestra |
|---|---|---|
| Ocurrencia | Texto recuperable, edición o fuente, consulta reproducible | Lematización, acepción, etimología o datación del original |
| Lema / flexión | Diccionario identificado, paradigma y contexto morfológico | Identidad de lecturas en códices diferentes |
| Dialecto antiguo | Forma documentada, región/periodo, inscripción o testimonio citado y bibliografía lingüística | Que la grafía Unicode sea un alfabeto o ductus paleográfico |
| Sentido contextual | Contexto, autor, género, sintaxis y crítica bibliográfica | Que la traducción sea la única interpretación posible |
| Filiación textual | Errores conjuntivos/separativos documentados y cotejo de testigos | Que el testimonio más antiguo sea el arquetipo |
| Variante ecdótica | Locus, lectura, testigo o edición y evidencia de colación individualizada | Que dos traducciones difieran por un manuscrito |
| Traducción alineada | Relación de pasajes cotejada explícitamente | Equivalencia palabra por palabra |
| Imagen/facsímil | Signatura, institución, folio y permisos o enlace institucional | Identidad entre folio y número de imagen digital |

**Regla lógica:** `coincidencia lexical` ⇒ candidato para examen, **no** prueba de `mismo lema`, `mismo sentido`, `misma genealogía` ni `dependencia documental`. Una interpretación debe distinguir premisas, citas, inferencias y conclusiones.

## 2. Ecdótica y colación de variantes
Emplear **TEI P5** para variantes realmente colacionadas: `<app>`, `<lem>`, `<rdg wit="#...">`, identidad de los testigos y responsabilidad editorial. El signo `wit` se reserva a un testimonio efectivamente examinado o a una edición crítica explícitamente citada. Una diferencia entre los latines de las recensiones V514, V554 y V297 se marca inicialmente **candidato al cotejo editorial**, no `<rdg>` atribuible al Codex H.

Todo cambio ecdótico debe registrar `canonical_locus`, `source_locus`, `edition_id`, `witness_id` si existe, `responsible_editor`, `source_reference`, `evidence_status`, lectura anterior, nueva, razón y fecha. Una etiqueta de incertidumbre nunca se borra por normalización automática.

## 3. Codicología y paleografía
La **composición de la obra** no fecha el códice que la transmite; tampoco la fecha aproximada de un manuscrito acredita la antigüedad de su lectura. Se conserva la signatura, repositorio, datación de catálogo, soporte, extensión/cobertura, folio o imagen digital, enlace de fuente, historia de transmisión y derechos de reproducción cuando constan.

Un **árbol documental cronológico** no es un *stemma codicum*: no se dibujan relaciones de descendencia entre códices sin análisis de errores compartidos, correcciones y contaminación textual documentados. El testimonio destacado es el más antiguo **entre los identificados en el catálogo**, no necesariamente el testimonio más antiguo mundial.

Queda prohibido borrar, mover, comprimir, renombrar o sustituir los folios originales de Vitruvio (Codex H, Cesariano, Sulpizio, Perrault y demás colecciones). Tampoco se alteran sus visores.

## 4. Lexicología del latín y del griego
Separar **token**, **forma gráfica**, **lema**, **flexión**, **etimología**, **acepción contextual** y **variación dialectal**. En griego clásico las variedades no se reducen a las etiquetas ático/dórico/jónico: las descripciones especializadas distinguen, entre otras, las familias jónico-ática, eólica, arcado-chipriota y griega occidental, con subdivisiones regionales. Las formas literarias, epigráficas, transliteradas y de copias bizantinas requieren tratamiento diferenciado.

La búsqueda flexible de acentos, espíritus, sigma, u/v o i/j **solo genera candidatos de recuperación**; no modifica la lectura de la fuente ni asigna dialecto. No se presenta una transcripción en griego politónico moderno como reproducción de un alfabeto epicórico o de un ductus paleográfico.

No se atribuyen acepciones a LSJ, Lewis & Short, OLD, Ernout–Meillet, Chantraine, Beekes u otros sin comprobar una entrada pertinente y su localización. La bibliografía genérica no equivale a una cita de diccionario para cada palabra.

## 5. Exégesis, hermenéutica y traductología
Un dossier de pasaje distinguible por capas: (a) texto de edición identificado; (b) variantes efectivamente verificadas; (c) traducciones con edición, autor y alcance; (d) sintaxis y morfología; (e) significado técnico en el uso vitruviano; (f) contexto histórico y recepción; (g) interpretación razonada con bibliografía; (h) límites y puntos abiertos. Una misma palabra puede expresar distintas acepciones según el pasaje y el registro.

Las notas del autor se atribuyen a un locus solo si el anclaje documental es explícito y verificable (`mapping_status: explicit_in_anchor` en el índice actualmente disponible). `requires_locus_review` nunca se presenta como comentario certificado de ese locus, aunque exista semejanza temática.

## 6. Interconexión sin pérdida de evidencia
La navegación entrega una consulta a otros instrumentos, conservando la **palabra original** y el **ID de obra**; ello **no** establece por sí mismo una correspondencia textual. Los motores antiguos se preservan. Los enlaces son localizadores de investigación, no afirmaciones de colación. Los documentos DOCX/PDF ya alojados conservan identidad y no se rebautizan como ediciones críticas sin cotejo.

La trazabilidad exige identificar procedencia, responsabilidad, edición de base, tipo de testimonio, límites de certeza y fecha de revisión. Las citas completas, cuando sean verificadas, se presentan en Chicago 18 (notas y bibliografía), sin inventar páginas, traductores, fondos bibliotecarios o DOI.

## 7. Estándares y fuentes de método
- **TEI Consortium**, *P5 Guidelines*, cap. 13, «Critical Apparatus»: https://guidelines.tei-c.de/en/html/TC.html (acceso 8-11-2026). Método de `app`, `lem`, `rdg`, `wit` y niveles de certeza.
- **EpiDoc**, *Guidelines: Ancient documents in TEI XML*, versión 9.8 (18 de marzo de 2026): https://epidoc.stoa.org/gl/latest/. Tratamiento de materialidad, inscripción, papiro y manuscrito.
- **Roger D. Woodard**, «Greek Dialects», en *The Ancient Languages of Europe*, ed. Roger D. Woodard (Cambridge: Cambridge University Press, 2008), 50–72. https://doi.org/10.1017/CBO9780511486814.006. Organización dialectal.
- **Perseus / Ancient Greek Vocabulary Tool**: https://vocab.perseus.org/ . Consulta de vocabulario lematizado y ocurrencias en corpus; los resultados deben contrastarse con la edición de origen.

## 8. Control reproducible
`node scripts/test-academic-research-bridge.mjs` comprueba integridad básica de identificadores, signaturas, cronología material, vínculos locales, asociación explícita de notas y separación entre edición/manuscrito. Se ejecuta en GitHub Actions de manera aislada y **no reescribe** los archivos fuente.

La cobertura no revisada se publica como pendiente, no como éxito. La puntuación académica solo puede ser una **autoevaluación de criterios documentales**; no se puede atribuir calificación o aval de universidad ajena.
