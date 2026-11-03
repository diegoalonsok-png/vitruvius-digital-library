# Vitruvius Digital Library — registro de cambios

## 3 de noviembre de 2026 — hoja de ruta: biblioteca contextual de la Antigüedad

**Estado: propuesta registrada; no implementada todavía.** Crear una biblioteca general de obras antiguas próxima a la época de Vitruvio, independiente de la bibliografía vitruviana existente. Núcleo temporal orientativo **125 a. C.–75 d. C.**, con expansión claramente separada para siglos II–IV d. C. y otras obras posteriores relevantes.

- Catálogo alfabético por **autor antiguo, título original y traducción moderna**, con filtros por siglo, período, género y lengua latina/griega.
- Géneros: poesía, historiografía, retórica, filosofía, matemáticas, medicina, astronomía, ingeniería e hidráulica, derecho, geografía, religión y textos cristianos antiguos.
- Lector paralelo para versiones latinas/griegas históricas y traducciones cuando existan archivos de acceso legítimo; enlace siempre a la institución editora o custodial, metadatos de edición, traducción, procedencia y derechos.
- Autores potenciales del núcleo: Cicerón, Lucrecio, Catulo, Virgilio, Horacio, Ovidio, Tito Livio, Séneca y otros con cronología y obras verificados.
- Obras que **no deben clasificarse falsamente como contemporáneas**: *Didaché* (habitualmente datada entre finales del siglo I y comienzos del II d. C., según hipótesis), *Pastor de Hermas* (siglo II d. C.) y Marco Cetius Faventino (Antigüedad tardía). Se situarán en un anexo cronológico posterior.
- No copiar obras modernas bajo derechos; priorizar ediciones históricas digitalizadas, textos de dominio público y colecciones con licencias claras.
- Campos por obra: autor griego/latino, título original, traducción, fecha e incertidumbre, tradición textual, género, lengua, sigla o edición, fuentes institucionales, DOI/URN, estado de digitalización y enlace a visor.
- **Pendiente:** verificar los registros, construir el JSON y el visor; esta anotación no certifica disponibilidad de ningún texto.

## 3 de noviembre de 2026 — Atlas Geographicus Vitruvianus

**Estado: implementación inicial de atlas y datos en desarrollo.** Mapa interactivo enlazado con el Onomasticon V514 y la descripción de la basílica de Fanum Fortunae (V.1). Debe permitir búsqueda libre y filtro por libro I–X, ficha por lugar, nombre **latino normalizado / variantes textuales / griego histórico / nombre moderno**, referencia a los loci, estado de atestiguación e identificación geográfica.

La georreferenciación se refiere a la ciudad o al sitio general y no debe confundirse con la localización exacta de un edificio. Las regiones, accidentes hidrográficos y topónimos filológicamente dudosos se mantienen en un listado, sin puntos inventados. No se presentan las formas griegas eruditas como testimonios directamente leídos en el Codex H.


## 2 de noviembre de 2026 — ampliación bibliográfica y búsqueda por PDF seleccionado (segunda actualización)

- Scriptorium: búsqueda por la edición o el PDF seleccionado (V514, V554, V297, Krohn 1912 y Rose 1899), conservando la consulta conjunta de todas las ediciones.
- Se habilita búsqueda documental por conceptos técnicos relacionados en latín, griego, castellano, francés e inglés, con equivalencias controladas; no se presenta como un modelo neuronal ni como colación manuscrita.
- Se mantiene el resaltado amarillo del OCR y se indica cuándo el PDF no tiene capa de texto para localizar la palabra sobre el facsímil.
- Estudios académicos: 69 referencias, 30 con metadatos o ISBN/DOI parcialmente verificados en fuentes institucionales, 39 pendientes; ISBN de los diez volúmenes Budé documentados y 3 monografías universitarias agregadas.
- Se incorporan ISBN e identificadores en el buscador bibliográfico y en las exportaciones BibTeX y RIS.
- No se modifica portada, estética general, buscador principal ni índices latinos de los libros.

## 2 de noviembre de 2026 — transparencia académica y citación

- Se incorpora una página `status-textus.html` diferenciando la recensio provisional y el aparato comparativo de V514/V554 de la edición de lectura V297 con notas y comentario.
- Se indican como fuentes editoriales Krohn (1912), Rose (1899) y los volúmenes Budé; la colación de manuscritos declarada en los libros se diferencia de la alineación automática de los índices del sitio.
- Se actualiza la auditoría del sitio según sus datos actuales: 66 estudios modernos (13 contrastados y 53 pendientes); 811 notas de los DOCX (41 con locus explícito, 519 con posible anclaje y 251 sin anclaje localizado).
- Se añaden a la documentación los DOI registrados del proyecto (10.5281/zenodo.23868911) y las ediciones V514 (10.5281/zenodo.23884757), V554 (10.5281/zenodo.23885110) y V297 (10.5281/zenodo.23885404).
- Se aclara que los cotejos digitales de 731 loci y 91 loci con griego constituyen controles de cobertura estructural, no validación definitiva de lecturas ni revisión por pares.
- Alcance: documentación académica y metadatos bibliográficos exclusivamente. **No se modifican portada, estilos visuales, motores de búsqueda, lectores, índices del corpus ni facsímiles.**


## 30 de octubre de 2026

- Índices de lectura extraídos de los DOCX V514 (castellano), V554 (francés) y V297 (inglés). Los tres localizan 731 loci; V297 conserva 728 bloques por sus pasajes agrupados.
- Búsqueda por libro, capítulo, locus, palabras y frases, con selección de lengua y edición.
- Auditoría académica y editorial publicada. Se distinguen las fichas bibliográficas contrastadas de las pendientes.
- Catálogo histórico reformulado por signatura, datación, sede, lugar de copia o de impresión, alcance y fuente. Se documentan las diferencias de datación del Gudianus 69 y la compilación del Gudianus 132.
- Búsqueda bibliográfica por variantes del nombre, signatura, ciudad y año; aviso cuando un filtro oculta coincidencias.
- Texto latino y traducciones justificados, sin guionado automático.
- Citas de las tres ediciones con título completo, versión y procedencia del ISBN; referencia académica al consultar e imprimir pasajes.
- Buscador inferior: sugerencias ortográficas explícitas y búsqueda opcional de las formas flexionadas del léxico, sin alterar los recuentos literales.
- Contadores iniciales derivados de los datos reales de catálogo; principios editoriales resumidos desde el DOCX V297 con procedencia identificada.

Este registro documenta cambios del sitio. No atribuye nuevas fechas de composición ni cambios al contenido de los libros V297, V514 o V554.

## 30 de octubre de 2026 (revisión académica, tarde)

- «La vida de un texto» amplía la tradición manuscrita con las siglas H, G y E, y suma dos etapas: la circulación medieval ininterrumpida (Krinsky 1967; corrección del mito del «redescubrimiento» de 1416) y la filología crítica de Galiani a la Collection des Universités de France. Se añaden Alberti (c. 1450) y Fra Giocondo (1511).
- Estudios académicos: ocho fichas nuevas en estado «cotejo pendiente» (Fensterbusch 1964; Gros, Corso y Romano 1997; Rowland y Howe 1999; Rose y Müller-Strübing 1867; Krinsky 1967; Baldwin 1990; Wallace-Hadrill 2008; Wittkower 1949).
