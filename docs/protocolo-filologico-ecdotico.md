# Protocolo académico, filológico y ecdótico

**Vitruvius Digital Library · De architectura · versión de trabajo, 8 de noviembre de 2026**

## Principios

El objetivo es permitir investigación verificable sin presentar como edición crítica certificada lo que solo es transcripción, concordancia informática o interpretación editorial. Deben distinguirse cinco niveles de contenido:

1. **Testimonio material**: manuscrito, impreso o facsímil identificable por institución, signatura, folio/página, fecha y URL oficial.
2. **Transcripción / texto base**: edición, editor, fuente, lengua, versión y comprobación de integridad (checksum cuando existe); no equivale a lectura autóptica.
3. **Traducción**: versión y traductor acreditados, locus cuando consta o paralelismo solo indicativo cuando no existe correspondencia demostrada.
4. **Comentario exegético o técnico**: interpretación de un pasaje o de un concepto arquitectónico; no se confunde con variante textual.
5. **Aparato de variantes / decisión ecdótica**: `lemma`, lectura alternativa, testimonio, fuente, locus, justificación y responsable, con el estado real de revisión.

La ausencia de aparato crítico para un locus **no implica falta de traducción, falta de significado ni ausencia de estudio sobre un término**. El resultado puede presentar texto latino, traducciones y una orientación de lectura señalada expresamente como tal. Nunca debe fabricar citas, referencias a códices ni testimonios.

## Referencia canónica y vinculación

- Cada párrafo debe tener un identificador canónico estable: obra, libro, capítulo y sección, distinguiendo prefacio (`praef`).
- Las variantes de presentación (romanos/arabo, `pr`/`praef`) deben normalizarse **para la búsqueda**, sin alterar el original almacenado.
- Una nota en DOCX con locus explícito puede enlazarse a ese locus; un locus inferido por similitud temática, proximidad de párrafo o algoritmo solo se identifica como **candidato**, sujeto a revisión.
- Una coincidencia de palabras entre una traducción y un original no establece por sí sola alineación frase a frase. Los textos completos se conservan incluso cuando no se alinean.
- Cuando hay divergencias de latín entre V514, V554 y V297, hay que abrir expediente de cotejo; una diferencia textual entre ediciones **no demuestra** una variante de manuscrito.

## Niveles de evidencia visibles en la interfaz

| Nivel | Qué significa | Qué NO significa |
|---|---|---|
| A · Explicitado | Fuente y locus escritos explícitamente en la nota o encabezado | Variante manuscrita autóptica |
| B · Candidato | Vínculo sugerido por contexto o proximidad y pendiente de cotejo | Comentario verificado del locus |
| C · Sin localizar | Nota auténtica del libro sin anclaje comprobado | Ausencia de valor académico |
| E · Decisión ecdótica verificada | Lecturas y testimonios documentados, autoridad, referencia, fecha y justificación; estado verificado | Licencia para inferir otros testimonios |
| S · Sentido interpretativo | Glosa o paráfrasis identificada como explicación editorial | Nota del autor o lección textual |

Los niveles de localización, fuente y revisión son ejes distintos. No transformar una nota A en E sin testimonios ni examen documental.

## Vocabulario y Lexicon

- Clic sobre una palabra latina: forma tal como aparece, posible lema, categoría gramatical y acepción contextual **solo cuando está respaldada**.
- Distinguir las glosas léxicas de la explicación arquitectónica del concepto. Por ejemplo, *symmetria* en Vitruvio remite a relaciones proporcionales y no debe equipararse automáticamente a simetría axial moderna.
- Las formas flexionadas se vinculan con el lema cuando el análisis morfológico se ha contrastado; en caso contrario, mostrar «lema por verificar».
- Lexicon debe enlazar a los loci atestiguados, recuentos reproducibles y, cuando sea posible, diccionarios y repertorios con referencia bibliográfica. Las imágenes necesitan fuente, autor, derecho y contexto; no se generan retratos o facsímiles históricos por IA.

## Aparato digital y TEI P5

Para una futura exportación TEI P5, usar `<app>` con `<lem>` / `<rdg>` y `@wit` solo para lecturas documentadas; usar `<note>`, `<ref>` y enlaces de correspondencia para comentarios. TEI distingue expresamente el **lema de crítica textual** del **lema lexicográfico**. La anotación debe apuntar al identificador estable del pasaje. No usar una etiqueta de aparato para glosas generales sin evidencia ecdótica.

Referencias de método:
- [TEI P5, Critical Apparatus](https://vault.tei-c.de/P5/current/doc/tei-p5-doc/en/html/TC.html)
- [TEI P5, Linking, Segmentation and Alignment](https://vault.tei-c.org/P5/4.10.1/doc/tei-p5-doc/en/html/SA.html)

## Referencias académicas

Aplicar Chicago 18 **Notas y Bibliografía** en los estudios redactados: autor, título, editorial o revista, fecha, página o locus, enlace/DOI cuando exista y tipo de fuente. No atribuir revisión por pares, respaldo universitario ni lectura del artículo completo a partir de un registro bibliográfico solamente. Separar claramente bibliografía primaria, ediciones modernas, estudios y recursos enciclopédicos.

## Auditoría y publicación

El script `scripts/audit-scholarly-integrity.mjs` genera `reports/scholarly-integrity.json` con: identificadores duplicados, fuentes de originales, cobertura de traducciones, loci paralelos, diferencias textuales que requieren cotejo, notas A/B/C y decisiones ecdóticas certificadas. Esta salida **no es una nota de calidad universitaria automática** ni valida a nivel filológico las traducciones.

El proceso de integración no modifica los DOCX o PDFs de origen, las transcripciones existentes ni las traducciones. Cualquier enmienda editorial futura debe conservar un registro de revisiones y la lectura anterior. Los informes deben mostrar límites, errores de OCR, ausencias de cobertura y pendientes sin ocultarlos ni simular verificaciones.
