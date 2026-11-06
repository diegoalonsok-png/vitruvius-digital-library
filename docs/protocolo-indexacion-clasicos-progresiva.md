# Protocolo de incorporación progresiva de textos clásicos

**Objetivo:** incorporar obras una por una, sin duplicar archivos existentes ni atribuir correspondencias filológicas no verificadas.

## Ciclo de incorporación (una obra por cambio)

1. Registrar autor, título, identificador estable (CTS u otro), lengua original, edición, fuente y condiciones de reutilización.
2. Comprobar si el original ya existe como TEI-XML, HTML o JSON; **no exigir PDF ni DOCX**. Si sólo hay imágenes o PDF escaneado, marcar «pendiente de transcripción» y conservar el enlace al testimonio.
3. Normalizar a pasajes indexables sin cambiar el texto fuente. Preservar original y registrar las decisiones de segmentación en un archivo nuevo y en el historial de Git.
4. Ejecutar búsqueda literal por palabras y frases; comprobar acentos, griego politónico, mayúsculas y vínculos a loci.
5. Vincular una traducción histórica en inglés, castellano o francés con autor, edición y procedencia acreditados. Si no hay versión utilizable, declarar la ausencia expresamente.
6. Cotejar a nivel **obra / libro / capítulo / sección / frase** según evidencia real. Nunca presentar como equivalencia por locus una traducción que sólo consta de segmentos sucesivos.
7. Habilitar consultas por concepto sólo mediante equivalencias editoriales documentadas; las hipótesis morfológicas o etimológicas se etiquetan como tales.
8. Añadir una prueba de regresión que abra el lector, encuentre un fragmento verificable y compruebe la atribución, el locus y el enlace de origen.
9. Publicar únicamente después de las verificaciones técnicas, editoriales y de reutilización. Guardar copias de cualquier texto madre afectado; preferir no modificarlo.

## Grados de correspondencia

| Estado | Definición |
| --- | --- |
| `none` | No se ha incorporado traducción vinculada |
| `unaligned` | Traducción legible, sin loci compartidos demostrados |
| `work` | Misma obra, sin segmentación equivalente |
| `book` | Correspondencia documentada por libro |
| `chapter` | Correspondencia documentada por capítulo |
| `section` | Correspondencia documentada por sección o locus |
| `passage` | Pasaje cotejado directamente por un editor |
| `phrase` | Equivalencia revisada al nivel de frase; no implica calco literal |

**Advertencia:** compartir una cadena de locus no demuestra por sí solo equivalencia textual ni calidad de traducción.

## Primera cola documentada (sin importar archivos duplicados)

- **Teofrasto, Caracteres:** original griego indexado; traducción inglesa Bennett–Hammond (1902) propuesta en PR #111, pendiente de integración y comprobación de correspondencia por capítulo.
- **Homero, Ilíada:** original griego indexado; falta traducción local EN/ES/FR indexada en el registro de búsqueda.
- **Catulo, Carmina:** original latino indexado como HTML; falta traducción local EN/ES/FR indexada.
- **Apuleyo, Metamorfosis:** versiones inglesa y castellana ya presentes, marcadas como no alineadas por loci; se requiere colación futura.
- **Petronio, Satiricón:** original latino e inglés existentes; falta cotejo de los segmentos ingleses con los capítulos latinos.

La auditoría reproducible de cobertura se ejecuta mediante `node scripts/audit-classical-translation-coverage.mjs`. Un registro externo de Perseus no cuenta como traducción local indexada hasta que el archivo y su lectura se hayan comprobado.

## Tratamiento futuro de Codex H

Harley MS 2767 requiere acceso al facsímil, transcripción paleográfica/HTR revisada, folios citables y separación entre lectura del códice y edición latina. No debe incluirse en la búsqueda semántica como transcripción validada antes de estas comprobaciones.
