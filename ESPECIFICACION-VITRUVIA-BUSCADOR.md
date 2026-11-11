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
| R2 | «Y coherente», igual que Google o Wikipedia, pero de humanidades. | Un resultado por entidad (sin duplicados entre fuentes), agrupado por tipo de material y ordenado dentro de cada grupo. | pendiente |
| R3 | «Si escribo Alejandro Magno no es una pizzería, es el emperador». | La primera posición es la entidad histórica. El ruido comercial queda fuera de los diez primeros. | pendiente |
| R4 | «Si busco a Dalí tiene que aparecer primero el artista plástico y organizar cuadros, fotos, pinturas y escritos de forma coherente y por orden de aparición». | Panel de entidad, luego obras ordenadas por fecha de ejecución, imágenes, escritos propios y estudios. | pendiente |
| R5 | «Con miniaturas de caras y foto de perfil o busto». | El panel de entidad muestra retrato o busto; cada resultado con imagen disponible muestra miniatura. Toda imagen lleva crédito y licencia. | pendiente |
| R6 | «Para libros con sus tapas y link de consulta; lo mismo para discos». | Las fichas de libro muestran cubierta y enlace de consulta; las de grabación, su portada. | pendiente |
| R7 | «En el caso de Egipto faraónico organizar las titulaciones reales como renders o fotos y por orden real». | Las cinco grandes nombres de la titulatura en orden canónico, con render Unicode rotulado como codificación editorial (no facsímil) y foto cuando exista; los reyes, en orden de reinado. | pendiente |
| R8 | «Alta academia: toda la ciencia ecdótica y filológica moderna». | Los datos ya existentes (`philologia.json`: Maas, signos con mapeo TEI, tipología de errores, *principia*, codicología, hermenéutica) quedan instrumentados, no sólo listados. | pendiente |
| R9 | Lexicon: términos latinos, griegos y hebreos con **árboles de raíz semánticas y significados**. | Árbol navegable raíz → lenguas atestiguadas → lemas derivados → acepciones → *loci*, construido sobre `etymologicum.json` y `hebrew-roots.json`, con sus referencias a de Vaan, Beekes, LSJ, BDB y HALOT. | pendiente |
| R10 | Página de IA: estilo minimalista tipo Grok, «sin tantos botones». | Una columna, un campo, dos controles icónicos. | pendiente |
| R11 | Estética general de alta academia, tipo Yale o Cambridge. | Capa tipográfica común a las tres piezas. | pendiente |
| R12 | «Las líneas de tiempo son buena idea pero no siempre cargan bien». | La cronología se dibuja siempre que haya una fecha disponible: entidad de Wikidata, datación del catálogo propio o año bibliográfico, con caché y reintento. Estado vacío sólo cuando no hay ninguna fecha. | pendiente |

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

Reproducible con:

```
node scripts/build-style-bundles.mjs --check
node scripts/build-vitruvia-metrics.mjs --check
```

### Motor · comprensión de la consulta

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
