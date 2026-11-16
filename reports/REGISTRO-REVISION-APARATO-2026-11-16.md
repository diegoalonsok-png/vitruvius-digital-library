# Registro de revisión ecdótica — cola de trabajo (2026-11-16)

**Ámbito:** aparato Budé, aparato comparativo, aparato autoral, dossier de colación, ediciones Rose 1899 y Krohn 1912 y H (Harley MS 2767).

**Estado:** incidencias localizadas en datos digitales; NO son enmiendas paleográficas certificadas.

## Incidencias con referencia exacta

| ID | locus | fuente/ubicación | hallazgo | tratamiento |
|---|---|---|---|---|
| OCR-K-001 | 1.1.1 | `data/apparatus/aparato-comparativo.json`, Krohn p. 20, línea OCR 12 | `cuiuB iudicio probantur omnia` frente a `cuius iudicio probantur omnia` en la nota de Rose p. 38; alta sospecha OCR | **PENDIENTE**: contrastar imagen de la página impresa de Krohn; no sustituir en registro documental automáticamente |
| TAB-V-001 | 1.1.4 | V514, p. 1094 | El lema incluye `paraciones sin valor crítico` y secuencias de columnas vecinas | **PENDIENTE**: cotejar la tabla original, delimitar lema, lectura y comentario |
| TAB-V-002 | 1.1.4 | V554, p. 1103 | Lema incorpora `coupes sans valeur critique` y prosa francesa | **PENDIENTE**: cotejar columnas de V554, preservar texto diplomático de la obra |
| DUP-V-001 | 1.1.1 | V514, pp. 1109 y 1118 | Repite `ornata, cuius iudicio probantur omnia` en entradas distintas | **PENDIENTE**: comprobar si son comentario, variantes o decisiones diferentes antes de fusionar |

## Criterios para decidir una corrección

1. Ver página impresa y anotar volumen, página, línea y, si procede, folio del testigo.
2. Registrar **texto leído de la fuente**, texto digital anterior, propuesta, motivo, responsable y fecha.
3. Si solo existe acuerdo entre dos impresos derivados de una misma transcripción, etiquetar **concordancia de ediciones**, no colación independiente.
4. No usar similitud de palabras como prueba definitiva de *locus*: marcar asignación automática.
5. No generalizar una enmienda OCR a todas las apariciones ni reconstruir la lectura de H a partir de Krohn/Rose.
6. Sin prueba impresa o autopsia disponible, conservar la lectura recibida y publicarla como pendiente de cotejo.

## Reproducibilidad

`node scripts/audit-apparatus-critical-review.mjs` produce `reports/apparatus-critical-review-queue.json` como informe derivado. El informe no cambia `data/text`, `data/apparatus`, índices, testimonios, corpus, PDFs o R2.

**Condición de cierre:** para cada entrada corregida, incluir referencia a imagen de la página o folio, transcripción revisada y diferencia verificable. Sin ese soporte, no se declara resuelta.

## Rectificación esencial de procedencia (16 de noviembre)

- **V514, V554 y V297 son ediciones autorales de Diego Kurilo, NO reproducciones OCR.** Su latín editorial sigue principalmente la tradición textual de Krohn (1912), con lecturas de Rose (1899) y decisiones propias que deben respetarse y atribuirse.
- **Krohn:** `data/critical-editions/krohn-1912-tei-loci.json`, transcripción TEI de Perseus, 731 loci. La procedencia declara extracción TEI, no OCR, aunque no afirma cotejo exhaustivo con el impreso.
- **Rose:** `data/critical-editions/rose-1899-transcribed-loci.json`, transcripción textual de Project Gutenberg, 731 loci, 26 alineaciones ambiguas según su manifiesto. No es OCR.
- **Solo determinadas notas históricas del aparato comparativo** provienen todavía de `data/text/krohn-1912.json` y `data/text/rose-1899.json` mediante extracción OCR, según `scripts/build-aparato-comparativo.py`.
- **Regla de auditoría:** no identificar problemas en una extracción digital con erratas de los libros del autor. Los textos latinos reindexados son la base del cotejo textual; el aparato crítico impreso se coteja separadamente con sus fuentes. Ninguna decisión editorial se sustituye automáticamente por la lectura de otra edición.
