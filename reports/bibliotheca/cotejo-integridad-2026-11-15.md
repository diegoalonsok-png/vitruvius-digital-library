# Bibliotheca - cotejo de titulos, interiores y partes (15-XI-2026)

**Estado:** auditoria automatica completada con reservas; NO se certifica integridad textual o cotejo autoptico para ninguna obra solo mediante OCR, coincidencia de hash o metadatos.

## Universo conciliado
- 271 obras del catalogo principal y 10 adicionales en R2 = **281** registros de obras declaradas. La cifra solicitada de 300 aun presenta **19 registros por identificar**: no se infiere perdida.
- 117 ediciones PDF R2, 117 OCR por pagina, 279 versiones textuales registradas y 28 originales adicionales en ramas externas.
- 6 pares PDF/OCR R2 carecen de ficha conciliada: ninguno se borro ni se incorporo automaticamente.

## Pruebas ejecutadas
- **279 versiones textuales:** 252 legibles sin avisos estructurales del auditor; 21 requieren conciliacion de titulos editoriales o equivalentes en otras lenguas; 6 HTML requieren cotejo especializado. Se encontraron 1.668 grupos de loci divididos en fragmentos consecutivos y diferentes: no son, por si solos, textos duplicados.
- **28 originales externos:** 28 se abrieron; nueve necesitan revision de variantes bibliograficas del titulo. Estos textos no equivalen a ediciones criticas cotejadas.
- **117 PDF:** los 117 se descargaron. SHA-256, tamano y recuento de paginas concordaron con sus fichas. 110 generan advertencias de reconocimiento de texto/autor/titulo o reservas catalograficas que NO prueban archivos erroneos; siete no generaron esas advertencias.
- **117 OCR R2:** se pudieron leer todos. En 35 ediciones atribuidas a obras griegas no se detecto escritura griega en el OCR; examinar edicion, lengua impresa y extraccion antes de declarar busqueda griega.
- **6 huerfanos:** seis OCR leidos. Precisan cotejo documental antes de catalogar, con especial prioridad a justino-trogo-es, juliano-obras e historia-augusta.

## Incidencias editoriales prioritarias
1. Alcances de volumen o parte: Antologia griega (vol. V/5), Euclides Elementa (libros I-VI), Polibio (vol. III/6), Ciceron De oratore (libro I), Celso De medicina (I-IV), Isidoro Etymologiae (vol. I), Petronio (PDF Bellum civile, no todo Satyrica), Valerio Flaco (libro I), Amiano Marcelino (tomo II).
2. Un unico PDF de poliorcetica (446 pp.) enlazado a cuatro obras: apollodorus-poliorcetics, athenaeus-mechanicus, biton-kataskeuai, philo-belopoeica. Identificar los pasajes de cada tratado, no multiplicar ni suprimir el archivo.
3. Galeno: galeno-opera-kuhn y galeno-kuhn-vol01 corresponden al mismo PDF de volumen XIV; no se acredita un volumen I por el identificador legado.
4. Textos parciales bajo ficha de obra: Naturalis historia de Plinio (libros XXXIII-XXXVI), De re rustica de Columela (libros I-IX en archivo registrado), Diodoro (libros XVIII-XX en su archivo), De usu partium de Galeno (I-XI declarados). El estado editorial debe distinguir obra, edicion y cobertura preservada.
5. De aedificiis de Procopio sigue sin version textual propia ni OCR de edicion vinculados en los inventarios cruzados. Una fuente externa potencial no se publica como si ya estuviera indexada.

## Acceso a los resultados originales
- [Auditoria del registro, 117 PDF y 117 OCR](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/43677667448)
- [Auditoria de los 28 originales externos y 6 objetos sin ficha](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/43677821980)
- [Auditor estructural](../../scripts/audit-bibliotheca-full-integrity.py)
- [Auditor de documentos PDF](../../scripts/audit-book-interiors.py)
- [Auditor de originales externos y huerfanos](../../scripts/audit-bibliotheca-external-originals.py)

Los ZIP de evidencias incluyen un registro individual por obra y edicion. **Ninguna verificacion automatizada de titulos prueba ausencia de lagunas o equivalencia con manuscritos originales.** Ante una anomalia se conserva el archivo y se requiere cotejo humano con portada, indice, colofon, editor, ano, libro/seccion y testimonio material.
