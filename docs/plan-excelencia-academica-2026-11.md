# Plan de excelencia académica (objetivo orientativo 9,75/10)

**Vitruvius Digital Library, 8 de noviembre de 2026.** El número **9,75** es una aspiración editorial y **no una calificación otorgada por una universidad**. No debe anunciarse como acreditación ni aval institucional. Los informes automáticos verifican metadatos, no lectura filológica autóptica ni arbitraje académico. El resultado final debe poder ser reproducido y revisado por especialistas externos.

## Prioridad cero: preservar el patrimonio y la continuidad

- No eliminar, mover, sustituir, comprimir o alterar imágenes y folios de Vitruvio: **Codex H, Sulpizio, Cesariano, Perrault** y demás facsímiles.
- No modificar originales, PDF, DOCX, transcripciones, traducciones, rutas históricas, visores ni estética cuando funcionan.
- Cada corrección de una lectura o traducción debe llevar registro de revisión e identificación de la versión anterior.
- Las propuestas deben pasar pruebas de GitHub antes de fusionarse en `main`. Un workflow rojo no demuestra por sí solo la caída del sitio público, pero sí exige identificar la causa.

## Medición reproducible y fuentes diferenciadas

Ejecutar `node scripts/audit-academic-excellence.mjs`. El informe `reports/academic-excellence.json` distingue **errores verificables** (fallan la integración) y **trabajo editorial** (se informa sin fabricar resultados ni disparar alertas de fallo). La comparación debe registrar la fecha, versión de código y corpus consultado.

Estado de partida en los inventarios revisados el 8/11/2026:

| Indicador | Resultado documental | Intervención |
|---|---:|---|
| Obras clásicas catalogadas | 222 | Mantener fichas de las 222, incluso sin texto local |
| Obras indexadas en el registro principal | 176 | Investigar las 46 restantes sin crear originales artificiales |
| Obras con traducción local | 58 | Indexar traducciones auténticas alojadas, separar referencias externas |
| Traducciones locales ausentes | 164 obras | Conservar referencias comprobadas y declarar lectura externa |
| DOCX clásicos extraídos | 30, con 25.794 párrafos | Mostrar lectura documental aparte del corpus crítico |
| Notas del autor | 811 | Identificar origen de cada nota, no vincular por mera similitud |
| Locus explícito en una nota | 41 | Mantener estado documental; no supone colación ni variante certificada |
| Notas con locus candidato | 519 | Cotejo humano antes de promover a anclaje explícito |
| Notas sin localizar | 251 | Mantener accesibles, sin asignar locus ficticio |
| Decisiones ecdóticas certificadas | 0 | Publicar solo decisiones con testigo, lectura, justificación y responsable |
| Referencias de versión local en catálogo | 59; 36 con `citationChicago18` específico | Completar las que carezcan de cita por versión, sin copiar automáticamente una cita ajena |

Estos valores deben actualizarse **a partir de datos del repositorio**. La ausencia de traducción o de aparato para una obra **no invalida** el texto original; significa que esa función no puede presentarse como disponible.

## Nueve dimensiones para una evaluación externa

La siguiente pauta es una propuesta de evaluación para profesores e investigadores, **no una nota producida por el propio sitio**.

| Dimensión | Peso sugerido | Evidencia exigible |
|---|---:|---|
| 1. Fidelidad filológica | 20 % | Identidad de edición fuente; transcripción contrastada por muestreo; distinción OCR/diplomática/normalizada |
| 2. Cobertura y recuperación textual | 15 % | Cada obra consultable efectivamente, búsquedas por palabra, flexión, frase y locus; recuentos reproducibles |
| 3. Aparato crítico y ecdótica | 15 % | Solo variantes con testigos y bibliografía verificables; separar exégesis, nota de autor y colación |
| 4. Bibliografía y citabilidad | 15 % | Citas Chicago 18 completas por versión, URL de locus, editor/traductor, año, derechos y registro de revisiones |
| 5. Lexicografía y semántica | 10 % | Etimología y lemas con obras académicas, morfología comprobada, loci atestiguados y niveles de certeza |
| 6. Codicología | 10 % | Institución, signatura, datación del manuscrito, folio, enlace institucional; árboles sin filiación ficticia |
| 7. Interoperabilidad | 5 % | DOI de proyecto/versión, CITATION.cff, URN/CTS cuando procede, TEI P5/IIIF como formatos documentados |
| 8. Accesibilidad y estabilidad técnica | 5 % | Regresión de buscadores, visores y móviles; enlaces internos y Pages correctos, capacidad disponible |
| 9. Gobernanza científica | 5 % | Protocolo público, registro de erratas, responsables editoriales y revisión externa trazable |

**Condiciones indispensables para un dictamen de excelencia:** revisión externa independiente, muestras filológicas y bibliográficas auditables y corrección documentada de observaciones. La apertura del código o los tests superados no sustituyen el arbitraje ni prueban un 9,75.

## Criterios de ecdótica, edición y citas

- **Obra** y fecha de composición no son **manuscrito** ni fecha de copia; un manuscrito no es edición impresa; una traducción no es transcripción; un enlace externo no constituye un índice local.
- **Árbol cronológico documental** no es un *stemma codicum*. Para declarar parentesco entre testimonios deben documentarse errores conjuntivos/separativos y metodología de colación.
- TEI P5 distingue `<app>`, `<lem>`, `<rdg>` y sus testigos; no codificar glosas interpretativas como variantes.
- Los sistemas de citas deben usar Chicago **18.ª edición**, notas y bibliografía en estudios de humanidades; una referencia sin editor, traductor o fecha no se completa por imaginación.
- Para citas digitales, enlazar por obra, edición, pasaje, versión de texto y, cuando existe, DOI o URL institucional. Una página de un PDF no prueba por sí sola un locus.
- Señalar explícitamente cuando la calidad de OCR, integridad del texto, equivalencia entre traducciones, licencia o enlace externo **no está verificada**.

## Orden de trabajo

**Primera etapa (integridad):** eliminar referencias a scripts inexistentes en ramas pendientes, asegurar pruebas verdes, validar que los 30 DOCX se consulten sin alterar los originales y proteger la estabilidad de GitHub Pages.

**Segunda etapa (cobertura):** inventariar las 46 obras sin original indexado y documentar fuente y derechos; incluir primero material que ya está alojado y comprobado. Mantener separación visual y numérica entre búsquedas del corpus, documentos DOCX, OCR histórico y traducciones externas.

**Tercera etapa (bibliografía):** completar fichas bibliográficas por versión cuando sean verificables, registrar fuentes y traductores de las traducciones históricas, y facilitar enlaces estables a las ediciones y loci. No atribuir la traducción inglesa de una obra al latín de una edición distinta por proximidad bibliográfica.

**Cuarta etapa (investigación):** revisar progresivamente las 519 asociaciones candidatas del aparato, cotejar divergencias entre recensiones, ampliar Lexicon con fuentes específicas y someter una muestra a especialistas en filología clásica, codicología y arquitectura antigua.

## Referencias normativas y metodológicas

- [TEI P5, Critical Apparatus](https://tei-c.org/release/doc/tei-p5-doc/en/html/TC.html).
- [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/).
- [The Chicago Manual of Style, 18th edition](https://www.chicagomanualofstyle.org/).
- [FAIR principles](https://www.go-fair.org/fair-principles/).
- [CITATION.cff de la biblioteca](../CITATION.cff).
- [Protocolo filológico y ecdótico de Vitruvius](protocolo-filologico-ecdotico.md).

El alcance de este documento es **control de calidad, guía de revisión y priorización**, nunca certificación de que los 222 libros estén filológicamente cotejados.