# Auditoría de exactitud académica — Vitruvius Digital Library
**Corte:** 2026-11-11 UTC (2026-11-10, Buenos Aires). **Alcance:** revisión documental **parcial** de registros y afirmaciones institucionales, no colación total de las 222 obras ni certificación por pares.

## Método y criterios
1. Comprobar afirmaciones sobre manuscritos contra el **catálogo de la institución custodiante**, conservando URL y signatura.
2. Separar *obra antigua*, *testimonio manuscrito*, *unidad codicológica*, *folio*, *imagen digital*, *transcripción*, *edición* y *traducción*.
3. «Más antiguo conservado» solo se declara cuando la institución o estudios especializados lo documentan expresamente; **«más importante para la recensio» es una evaluación independiente**.
4. No completar fechas, foliación, escritura, procedencias, lagunas o stemmata sin fuentes verificables; dataciones aproximadas y atribuciones hipotéticas permanecen marcadas.
5. Los indicadores automáticos de cobertura, acceso, concordancias o coincidencia de loci **no acreditan exactitud histórica ni textual**. Este informe registra tanto verificaciones positivas como errores concretos.

## Comprobación A · Vitruvio, *De architectura*, Harley MS 2767
**Referencia institucional primaria:** [British Library, Harley MS 2767](https://searcharchives.bl.uk/catalog/040-002048598).

| Atributo | Datos institucionales verificados |
|---|---|
| Biblioteca y signatura | British Library, Londres, **Harley MS 2767** |
| Lengua | Latín |
| Fecha del códice | **Primer cuarto del siglo IX (800–824)**; no fecha exacta de copia |
| Antigüedad | La institución lo describe expresamente como **la copia conservada más antigua conocida** de *De architectura*; esto **no prueba automáticamente su autoridad crítica superior** |
| Folios de Harley MS 2767 | **ff. 1r–162v, 162 folios**; las hojas **Rawlinson MS D. 893, ff. 135–136** están ahora en la Bodleian Library, Oxford: no se deben confundir ambos conjuntos de foliación |
| Soporte y escritura | Pergamino, minúscula carolina; rúbricas y algunos inicios en uncial |
| Dimensiones | **280 × 200 mm**, caja escrita **210 × 145 mm** |
| Pautado | Hardpoint / punta seca; signaturas de cuaderno presentes |
| Encuadernación | Reencuadernado en **1977** por la British Museum/British Library |
| Origen | Posiblemente Colonia o Aquisgrán, Alemania occidental; **atribución no segura** |
| Elementos paratextuales | **Diagrama de los vientos en f. 16v**; no afirmar ausencia absoluta de diagramas |

**Hallazgo editorial corregible:** la matriz `data/classics-corpus/tei-codicology-research-matrix-89.json` conserva `ruling` en `missingKeys` y un `missingCount` elevado, aunque el mismo campo `fields.physical.ruling.value` ya registra el pautado. Hay asimismo datos de **dimensiones y encuadernación** disponibles en la ficha institucional que la matriz aún dejaba vacíos. Es un error del índice de campos pendientes, **no del códice ni de su transcripción**.

## Comprobación B · Cicerón, *De officiis*, Harley MS 2716
**Referencia institucional primaria:** [British Library, Harley MS 2716](https://searcharchives.bl.uk/catalog/040-002048547).

| Atributo | Datos institucionales verificados |
|---|---|
| Biblioteca y signatura | British Library, Londres, **Harley MS 2716** |
| Datación | **975–999**, último cuarto del siglo X |
| Lengua | Latín |
| Unidad codicológica | Volumen **compuesto de dos manuscritos** elaborados en Alemania occidental. Primera unidad: ff. 1–33 y 75–77; segunda: ff. 34–74 |
| *De officiis* | **ff. 34r–74r**, no todo el volumen |
| Foliación del volumen | **77 folios**, más hojas de guarda modernas sin foliar |
| Soporte y escritura | Pergamino; minúscula carolina |
| Dimensiones | **255 × 215 mm**, caja escrita **180 × 140/145 mm** |
| Encuadernación | Encuadernación «Harleian» posterior a 1600, marroquín rojo, atribuida a Thomas Elliott; lomo restaurado |
| Procedencia | Monasterio benedictino de San Ulrico y Santa Afra (Augsburgo), colección Graevius, colección Harley |
| Antigüedad crítica | **Testimonio temprano documentado**; el registro institucional **no lo acredita como copia conservada más antigua del mundo** |

**Hallazgo:** los datos de dimensiones, encuadernación, escritura, origen y procedencia constan en el catálogo institucional, pero varios están todavía vacíos en la matriz de investigación. Conviene agregar estas **referencias editoriales derivadas**, sin modificar la ficha original de la obra.

## Estado cuantitativo verificado en la matriz codicológica (antes de posibles correcciones)
- **100 fichas** de testimonios, **22 campos por ficha**, **2.200 espacios**.
- **441 valores presentes**, **1.759 vacíos**, recuento recalculado directamente a partir de `fields.*.*.value`.
- **1 inconsistencia estructural** entre `missingKeys`, `missingCount` y los campos realmente vacíos: `vitruvius-h`, categoría «ruling».
- Los datos «vacíos» incluyen campos que podrían resultar **no aplicables** (p. ej., filigranas en pergamino); no equivalen automáticamente a 1.759 errores académicos.

## Prioridades para el control total de contenido
1. Completar datos verificables **por testimonio y por obra** con referencia institucional, página o folio, fecha de consulta y estado «confirmado», «probable», «discutido» o «sin evidencia».
2. Separar «códice más antiguo», «testigo fundamental para recensio» y «edición de referencia»: no son categorías intercambiables.
3. Validar las 222 obras una a una (título uniforme, lengua, autoría, datación, testimonios, loci, ediciones, traducciones y derechos); preservar los originales sin reescrituras.
4. Colación de los **731 loci canónicos** de las ediciones de Vitruvio V514/V554/V297 con Krohn, Rose y Budé; la coincidencia estructural no es aún prueba de equivalencia de lecturas.
5. Revisar textos de interfaz, citas, cronologías, titulares de búsqueda y resultados automáticos para evitar que «posible», «más antiguo en nuestro registro», «sin verificar» o «traducción automática» se conviertan en afirmaciones categóricas.
6. Validar cada afirmación de antigüedad, extensión física o prioridad ecdótica en la fuente custodiante; conservar el historial de correcciones.

## Resultado provisional
**Confirmadas:** dos signaturas, dos dataciones, lenguas, unidades y foliaciones documentadas, con fuentes primarias de la British Library.

**Error de metadatos demostrado:** una clave de pauta ya completada seguía declarada «faltante» (`vitruvius-h`). **Omisiones documentales verificables:** información institucional disponible sin transferir a los campos derivados de estas dos fichas.

**Límite:** no se han comparado, una por una, todas las afirmaciones narrativas del sitio ni las lecturas de todas las obras. No es académicamente lícito certificar ausencia de errores globales ni adjudicar 9,75/10 por el mero paso de tests.
