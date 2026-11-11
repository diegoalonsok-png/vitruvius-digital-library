# Vitruvia · especificación del buscador

Sistema **Vitruvius**, tres piezas:

| Pieza | Papel |
| --- | --- |
| `index.html` · **Vitruvius** | Biblioteca. Indexa los libros de Diego Kurilo sobre Vitruvio y los códices antiguos y clásicos. |
| `vitruvia.html` · **Vitruvia** | Buscador de internet tipo Google o Wikipedia, centrado en humanidades. |
| `vitruvia-lexicon.html` · **Lexicon** | Buscador de términos latinos, griegos y hebreos con árboles de raíz y significados. |

Valoración de partida del autor: **8,8–9 sobre 10**. El objetivo de este trabajo
es el tramo que falta, no una refundación.

## Requisitos del autor (11 de noviembre de 2026)

Se registran como criterios de aceptación comprobables.

| # | Requisito | Criterio de aceptación | Estado |
| --- | --- | --- | --- |
| R1 | «Tiene que buscar rápido». Hoy tarda **8 segundos** en abrir. | Primer pintado por debajo de 2,5 s en 4G simulada; menos de 30 peticiones antes del primer pintado. | **en curso** |
| R2 | «Y coherente», igual que Google o Wikipedia, pero de humanidades. | Un resultado por entidad (sin duplicados entre fuentes), agrupado por tipo de material y ordenado dentro de cada grupo. | **módulo listo y probado; falta conectarlo** |
| R3 | «Si escribo Alejandro Magno no es una pizzería, es el emperador». | La primera posición es la entidad histórica. El ruido comercial queda fuera de los diez primeros. | **probado en el módulo; falta conectarlo** |
| R4 | «Si busco a Dalí tiene que aparecer primero el artista plástico y organizar cuadros, fotos, pinturas y escritos de forma coherente y por orden de aparición». | Panel de entidad, luego obras ordenadas por fecha de ejecución, imágenes, escritos propios y estudios. | pendiente |
| R5 | «Con miniaturas de caras y foto de perfil o busto». | El panel de entidad muestra retrato o busto; cada resultado con imagen disponible muestra miniatura. Toda imagen lleva crédito y licencia. | pendiente |
| R6 | «Para libros con sus tapas y link de consulta; lo mismo para discos». | Las fichas de libro muestran cubierta y enlace de consulta; las de grabación, su portada. | pendiente |
| R7 | «En el caso de Egipto faraónico organizar las titulaciones reales como renders o fotos y por orden real». | Las cinco grandes nombres de la titulatura en orden canónico, con render Unicode rotulado como codificación editorial (no facsímil) y foto cuando exista; los reyes, en orden de reinado. | pendiente |
| R8 | «Alta academia: toda la ciencia ecdótica y filológica moderna». | Los datos ya existentes (`philologia.json`: Maas, signos con mapeo TEI, tipología de errores, *principia*, codicología, hermenéutica) quedan instrumentados, no sólo listados. | pendiente |
| R9 | Lexicon: términos latinos, griegos y hebreos con **árboles de raíz semánticas y significados**. | Árbol navegable raíz → lenguas atestiguadas → lemas derivados → acepciones → *loci*, construido sobre `etymologicum.json` y `hebrew-roots.json`, con sus referencias a de Vaan, Beekes, LSJ, BDB y HALOT. | pendiente |
| R10 | Página de IA: estilo minimalista tipo Grok, «sin tantos botones». | Una columna, un campo, dos controles icónicos. | **en espera por decisión del autor: «no cambiar por ahora la estética del site»** |
| R11 | Estética general de alta academia, tipo Yale o Cambridge. | Capa tipográfica común a las tres piezas. | **en espera por decisión del autor: «no cambiar por ahora la estética del site»** |
| R13 | Lexicon: mejorar las búsquedas léxicas y semánticas sobre las **222 obras clásicas**. | Índice invertido por lema construido sobre el corpus local, concordancia KWIC, frecuencia por autor, obra y período. Sin descargar el corpus entero para una consulta. | **hecho y medido** |
| R14 | Los folios de los códices están en GitHub, pero **la minúscula carolina es difícil de indexar**: la indexación va por frases, prefacios y folios. | Búsqueda tolerante a la paleografía: tabla de confusiones documentada (c/e, t/c, n/u, m/in, s larga/f) y expansión de abreviaturas (barra de nasal, ⁊, ꝯ, -bus, -que). Alineación folio ↔ locus de la edición crítica, para llegar a la imagen sin depender del OCR. Los resultados se presentan como candidatos, no como lecturas. | pendiente |
| R15 | La búsqueda de palabra dentro de los libros arma visores y traducciones automáticas; «hay que ver que sea de calidad». | Toda traducción automática queda rotulada como tal y nunca se presenta como traducción de autor; si existe una publicada, se cita y se prefiere. Informe de cobertura reproducible. | pendiente |
| R16 | Búsqueda de **frases**, no sólo de palabras, en los dos buscadores. | Frase entre comillas y consulta de dos o más palabras probada como bloque contiguo, por delante de las palabras dispersas. | **hecho y probado** |
| R17 | «Cuando se encuentra una palabra en una frase de Vitruvio o de los clásicos, si hacemos clic no muestra diccionario latín». | El clic sobre la coincidencia resaltada, o sobre cualquier palabra de un pasaje declarado en latín, griego o hebreo, abre la ficha del léxico en cualquier página del sitio. | **hecho** |
| R18 | «Cuando se hace clic en un botón del buscador no se ve si se apretó; pasa con la mayoría». | Toda pulsación se ve, con duración mínima garantizada, y los botones que lanzan una búsqueda quedan en estado ocupado anunciado para lectores de pantalla. En las 81 páginas con botones. | **hecho** |
| R12 | «Las líneas de tiempo son buena idea pero no siempre cargan bien». | La cronología se dibuja siempre que haya una fecha disponible: entidad de Wikidata, datación del catálogo propio o año bibliográfico, con caché y reintento. Estado vacío sólo cuando no hay ninguna fecha. | **hecho** |

## Lo ya hecho y medido

### R1 · velocidad (primera entrega)

| Medida | Antes | Después |
| --- | --- | --- |
| Hojas de estilo bloqueantes en Vitruvia | 22 peticiones | 5 |
| Hojas de estilo en el Lexicon y en la portada | 9 y 9 | 5 y 5 |
| JSON descargado antes del primer pintado | 836 KB | 0 |
| Recuentos del catálogo visibles al abrir | tras descargar 836 KB | inmediatos, desde instantánea |
| Familias tipográficas antiguas del Lexicon | bloqueaban el pintado | asíncronas |
| Precarga del *service worker* al instalarse | 502 KB en 20 peticiones, compitiendo con la primera carga | diferida al primer rato libre |

### R13 · índice léxico sobre el corpus clásico

El Lexicon buscaba léxicamente en sus propios `corpus-la.json` y
`corpus-grc.json`: **14 obras latinas y 9 griegas**. Las 238 ediciones del
corpus clásico quedaban fuera, y cada consulta literal del motor descargaba
**todas** las ediciones registradas para escanearlas.

`scripts/build-classics-lexical-index.mjs` construye un índice invertido de
candidatos sobre las 238 ediciones **y sobre las propias ediciones de Vitruvio**
(que no estaban indexadas: su recensio vive en `data/structured`, con otra
forma de campo).

| Medida | Valor |
| --- | --- |
| Ediciones indexadas | 238 |
| Pasajes | 127.056 |
| Palabras | 10.513.361 |
| Raíces distintas | 549.319 |
| Peso del índice | 21,6 MB en 4.446 fragmentos |
| Tiempo de construcción | 17 s |

Coste por consulta, medido con el motor real en un navegador simulado
(`scripts/test-corpus-index-gate.mjs` y la batería de
`scripts/test-classics-lexical-index.mjs`):

| Consulta | Antes | Después |
| --- | --- | --- |
| `symmetria` | 132 ediciones · 42,0 MB | 9 ediciones · 4,9 MB |
| `eurythmia` | 132 ediciones · 42,0 MB | 8 ediciones · 4,7 MB |
| `columna` | 132 ediciones · 42,0 MB | 21 ediciones · 13,8 MB |
| `ἀρχιτέκτων` | 97 ediciones · 69,1 MB | 11 ediciones · 19,7 MB |
| `λόγος` | 97 ediciones · 69,1 MB | 16 ediciones · 38,8 MB |

Con los mismos resultados y las mismas obras en todos los casos, comprobado en
la prueba. El ahorro es grande con las palabras propias de un autor y pequeño
con las palabras frecuentes, porque λόγος está de verdad en 98 ediciones: ahí
lo que ahorra es el acotado por recuento, no la exclusión.

Por eso se añade además una **vía inmediata**: `indexSummary()` devuelve el
recuento por edición, la frecuencia por diez mil palabras y los loci sin
descargar ningún texto, y el puente del Lexicon la muestra antes de leer los
pasajes. Las fichas de esa vía declaran que el pasaje todavía no se ha leído
del original; cuando llegan los pasajes verificados, sustituyen al resumen.
Regla de autoridad del índice: **propone candidatos; si discrepa de la
edición, manda la edición.**

Primeros resultados reales: `symmetria` 77 apariciones, todas en Vitruvio
(13,29 por cada 10.000 palabras); `architectus` 74 en 17 ediciones; `columna`
286 en 33; `λόγος` 9.861 en 98; `ἀρχιτέκτων` 18 en 11.

Reproducible con:

```
node scripts/build-style-bundles.mjs --check
node scripts/build-vitruvia-metrics.mjs --check
node scripts/build-classics-lexical-index.mjs --check
node scripts/test-vitruvia-philology.mjs
node scripts/test-vitruvia-rank.mjs
node scripts/test-classics-lexical-index.mjs
node scripts/test-corpus-index-gate.mjs
```

### Motor · comprensión de la consulta y ordenación

`assets/vitruvia-philology.js`, con 60 pruebas en
`scripts/test-vitruvia-philology.mjs`. Resuelve lo que hacía perder resultados:

- **Grafía.** Griego con y sin acentos, sigma final, iota suscrita; latín con
  i/j y u/v intercambiables, ae/æ, macrones. Beta-code del TLG aceptado.
- **Flexión.** `symmetriae`, `symmetriam` y `symmetrias` encuentran
  `symmetria`; `λόγου` encuentra `λόγος`. Recorte de desinencias con umbral de
  cuatro caracteres en latín y tres en griego, que es donde empiezan las
  confusiones: `templum` **no** coincide con `tempus`.
- **Escritura cruzada.** Clave común a los dos alfabetos: `architekton`
  encuentra ἀρχιτέκτων, `θέατρον` coincide con `theatrum`.
- **Onomástica.** Vitruvio / Vitruvius / Vitruve, Cicerón / Cicero,
  Arquímedes / Archimedes. El catálogo del sitio y sus 164 obras con alias
  manda sobre las reglas ortográficas.
- **Citas.** `Vitr. 3.1.2`, `De arch. III 1, 2`, `Il. 1.1`, `Hdt. II 35` se
  reconocen y se convierten a locus normalizado.

Lo que este módulo **no** hace, deliberadamente: no analiza morfología, no
reconstruye etimologías y no afirma parentesco entre lenguas. Eso vive en los
datos del Lexicon, redactados sobre bibliografía citada. La coincidencia por
raíz recortada puntúa por debajo de la literal: una forma exacta gana siempre.

`assets/vitruvia-rank.js`, con 23 pruebas en `scripts/test-vitruvia-rank.mjs`,
sustituye la suma de coincidencias por:

- **BM25 con pesos por campo** (título 3,4 · autor 1,8 · fragmento 1,0 · metadatos 0,5),
  saturación de la repetición y normalización por longitud, con IDF calculado
  sobre el conjunto recuperado.
- **Coincidencia por niveles**: literal 1,0 · clave entre alfabetos 0,85 ·
  raíz recortada 0,6. Una aproximada nunca desplaza a una exacta.
- **Prioridad por fuente**: fondo propio 3,2 · autoridades 2,4 · textos
  primarios 2,3 · repositorios patrimoniales 2,2 · enciclopedia 2,0 ·
  bibliografía académica 1,9 · museos 1,7 · agregadores comerciales 1,2.
- **Señal de antigüedad** +2,2 e **indicio de persona histórica** +2,6;
  **ruido comercial** ×0,12, **forma societaria** ×0,45, **datos de contacto** ×0,4.
  Con esto, «Alejandro Magno» devuelve al rey de Macedonia en primer lugar y la
  pizzería cae detrás del estudio histórico (R3, probado).
- **Vinculación estructural**: una obra atribuida a la entidad resuelta entra
  sin repetir el nombre de su autor, porque lo dice el dato y no el título.
  «La persistencia de la memoria» aparece bajo Dalí (R4, probado).
- **Una entidad, un resultado**: deduplicación por QID de Wikidata o título
  normalizado, anexando los enlaces de las fuentes desplazadas; y tope por
  fuente para que ningún proveedor ocupe la primera pantalla (R2, probado).
- **Agrupación y orden**: identificación, obras, imágenes, escritos,
  testimonios, ediciones, estudios, enciclopedia, grabaciones, catálogos; el
  orden de los grupos depende del tipo de consulta y, dentro de cada grupo, se
  ordena por fecha cuando la mayoría de las fichas la tiene. Las dataciones por
  siglo se ordenan por el comienzo del siglo y quedan marcadas como aproximadas.

`explain(fila)` devuelve el desglose de la puntuación, para que la ordenación
sea auditable y no un oráculo.

## Pendiente, por orden de ejecución

1. R2, R3 — ranking BM25 con prioridades de fuente, señal de antigüedad,
   degradación del ruido comercial y deduplicación por entidad.
2. R4, R5, R6, R7 — resolución de entidad contra Wikidata y expediente
   ordenado: obras por fecha, imágenes con crédito, cubiertas de libro,
   titulatura egipcia en orden canónico.
3. R12 — fiabilidad de las líneas de tiempo, sobre la misma caché de entidades.
4. R1 — segunda entrega de velocidad, medida con el informe de proveedores.
5. R9 — árboles de raíz del Lexicon.
6. R8 — instrumentos ecdóticos.
7. R10, R11 — página de IA y capa tipográfica.
