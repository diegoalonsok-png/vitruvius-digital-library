# Auditoría de realidad documental del aparato comparativo — 2026-11-16

**Estado:** diagnóstico automatizado preliminar con fuentes localizadas. No constituye revisión autóptica de los impresos ni del Codex H.

## Fuentes examinadas

- `data/apparatus/aparato-comparativo.json` (construido desde el registro de decisiones autorales y notas OCR del aparato impreso de Rose y Krohn).
- `data/critical-editions/krohn-1912-tei-loci.json` (731 loci del texto latino desde TEI de Perseus, no OCR).
- `data/critical-editions/rose-1899-transcribed-loci.json` (731 loci desde transcripción textual de Project Gutenberg, no OCR; 26 alineaciones ambiguas declaradas).
- `scripts/build-aparato-comparativo.py`: la atribución de una nota a un locus usa coincidencias léxicas de la página; por diseño es una atribución **candidata**, no una certificación del locus.

## Recuento verificado por lectura de JSON

| Variable | Resultado |
|---|---:|
| loci navegables | 731 |
| loci con material | 707 |
| loci sin entradas | 24 |
| notas Rose | 2236 |
| notas Krohn | 1473 |
| duplicaciones exactas en un mismo locus (página, línea y texto) | 0 |
| sospechas de OCR detectadas por patrones acotados | 28 Rose + 9 Krohn = 37 |

## Prueba de correspondencia léxica (NO equivale a validación textual)

La prueba tomó el segmento anterior a los dos puntos de cada nota, extrajo vocablos de al menos 4 caracteres y comprobó su presencia literal normalizada en el texto del mismo locus.

| Edición | al menos un vocablo coincidente | sin coincidencia aun teniendo vocablos de longitud suficiente |
|---|---:|---:|
| Rose | 1655 | 389 |
| Krohn | 1279 | 85 |

**Limitación:** los restantes casos son entradas sin tokens elegibles o no informativas; una ausencia de coincidencia no demuestra error porque el aparato puede describir una lectura eliminada, grafía divergente, signo editorial o desplazamiento de locus. Ningún caso puede corregirse masivamente con este criterio.

## Casos prioritarios

1. **Krohn 1.1.1 (p. 20, línea OCR 12):** `cuiuB iudicio...` apunta a corrupción OCR; comparar facsímil antes de publicar una transcripción reparada.
2. **Rose 1.1.3 (p. 39):** `descriptionib? figuraru vel pietur^` y `h§c` presentan caracteres de reconocimiento dudoso; comprobar caracteres y abreviaturas impresos.
3. **Kurilo 1.1.4 (V514 p. 1094, V554 p. 1103):** las entradas extraídas mezclan notas castellanas/francesas con el lema latino; revisar la extracción tabular, **no atribuir error al libro del autor**.
4. **Rose 1.1.2 (p. 38, nota `sunt (a. c.) G.`):** verificar localización exacta, porque el generador usa proximidad léxica y no una edición con localización de cada nota por locus.
5. **Krohn 1.1.4 (p. 21, entrada `graphidis S`):** verificar si corresponde realmente a 1.1.4 u otro pasaje cercano.

## Diagnóstico

**Sí existen registros con procedencia documental y textos reindexados confiablemente localizables, pero NO puede afirmarse que toda entrada crítica esté acreditada por cotejo impreso.** El indicador de 707/731 señala cobertura de navegación/material, no exhaustividad paleográfica.

Recomendación: conservar datos originales; publicar una capa separada con procedencia + nivel de verificación y corregir solo las entradas individualmente revisadas contra edición impresa o facsímil. No sustituir el latín autoral ni rehacer las indexaciones de Rose y Krohn.

## Siguiente criterio de aceptación

Para promover una nota del grado `ocr-candidato` a `impreso-verificado`, guardar URL/fuente, página y línea impresas, lectura normalizada, transcripción original, responsable, fecha, y justificación. Para atribuirla al Codex H, requiere además cotejo paleográfico de folio/canvas o citar explícitamente la lectura de editor moderno como testimonio indirecto.
