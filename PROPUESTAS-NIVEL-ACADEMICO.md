# Propuestas para elevar el nivel académico de Vitruvius

Escrito el 11 de noviembre de 2026 después de leer el sitio por dentro: los
tres buscadores, los 262 archivos del corpus clásico, los índices del Lexicon,
`philologia.json`, `etymologicum.json`, los 238 guiones de `scripts/` y los
flujos de integración continua.

## Valoración

Tu 8,8–9 me parece exacta, y conviene decir por qué, porque el tramo que falta
no se ve si no se reconoce lo que ya está.

Lo que coloca a este proyecto por encima de lo habitual en humanidades
digitales independientes:

1. **Los datos filológicos son datos, no adorno.** `etymologicum.json` tiene
   115 fichas con raíz protoindoeuropea en notación laringalista, cognados
   sánscritos y avésticos, equivalencias hebreas distinguidas de los
   préstamos, y referencias a de Vaan, Beekes y LSJ. `philologia.json` trae la
   bibliografía de Maas, los *signa* del aparato con su correspondencia TEI,
   la tipología de errores, los *principia* de la recensión y trece sentidos
   hermenéuticos incluido el *peshat*. Eso no se improvisa.
2. **Las afirmaciones están graduadas.** El código distingue sistemáticamente
   lo verificado de lo no verificado: `showCatalogueMetric` escribe «N/D» en
   lugar de cero cuando una fuente falla, con el comentario «una fuente que
   falla no es un cero medido»; el visor egipcio rotula los signos Unicode
   como codificación editorial y no como facsímil; la auditoría funcional
   separa «corregido en código» de «verificado en navegador». Esa disciplina
   epistémica es la parte más difícil de un proyecto así y está resuelta.
3. **Hay identificadores canónicos.** URN CTS correctos
   (`urn:cts:latinLit:phi1056.phi001`), DOI por edición en Zenodo, metadatos
   Dublin Core y Highwire, `CITATION.cff`, y referencias entrantes de
   LibGuides de Cambridge y de *AWOL*.
4. **Hay pruebas.** Integración continua con auditorías reproducibles y
   pruebas de navegador; `site-check.mjs` comprueba 463 aserciones.

Lo que falta no es más contenido. Es **instrumentar lo que ya tenés** y cerrar
tres huecos de infraestructura académica.

---

## A · Ecdótica: pasar del listado al instrumento

`philologia.json` describe el método; el sitio todavía no lo *ejecuta*.

1. **Motor de colación.** Ya hay un panel `collatio` con testimonios y sigla.
   Falta el algoritmo: alineación de testimonios por tokens, generación del
   *apparatus criticus* en forma positiva y negativa, y clasificación
   automática de la variante según la tipología de `errores` (haplografía,
   ditografía, *saut du même au même*). Salida en TEI
   `<app><lem/><rdg wit="#A"/></app>`, que es lo que espera cualquier
   repositorio. El estándar de referencia es CollateX; no hace falta
   importarlo, pero conviene producir su formato de salida para poder cotejar
   resultados.
2. **Estemma navegable.** Con 100 testimonios catalogados y 63 ediciones, el
   grafo de dependencias es publicable: *eliminatio codicum descriptorum*
   declarada caso por caso, contaminación señalada donde la haya, y el
   arquetipo como hipótesis fechada y firmada. Un estemma dibujado obliga a
   explicitar decisiones que hoy están implícitas.
3. **Búsqueda tolerante a la paleografía** (lo que me señalaste de la minúscula
   carolina). Tabla documentada de confusiones —c/e, t/c, n/u, m/in, s larga/f,
   a/u— y expansión de abreviaturas: barra de nasal, ⁊ tironiana, ꝯ, -bus,
   -que, p̄. Con eso, `architectura` encuentra una transcripción imperfecta sin
   depender del OCR. Los resultados se presentan como **candidatos**, no como
   lecturas: es la diferencia entre ayudar a buscar y afirmar un texto.
4. **Alineación folio ↔ locus.** El camino fiable al folio no es el OCR sino la
   correspondencia estructural con la edición crítica. Ya existen
   `collation-loci.json` y `assign-apparatus-loci.py`: completar la tabla
   folio→rango de loci convierte cada búsqueda textual en un enlace a la
   imagen del testimonio.
5. **Conjeturas con autoría y fecha.** Toda *divinatio* propia debería quedar
   registrada con autor, fecha y argumento, separada de las conjeturas
   heredadas de la tradición editorial. Es lo que permite que otro filólogo
   discuta una decisión concreta en lugar del sitio entero.

## B · Lexicografía: los árboles de raíz

El README ya promete concordancia KWIC y colocaciones; el salto está en la
estructura.

6. **Árbol de raíz navegable.** Del dato que ya tenés sale un árbol honesto:
   raíz reconstruida (marcada como reconstrucción) → lenguas atestiguadas →
   lemas → acepciones → *loci*, con los cognados en su rama y la referencia
   bibliográfica en cada nudo. Para el hebreo, la raíz consonántica según BDB y
   HALOT, con la derivación discutida señalada como tal —`hebrew-roots.json` ya
   lo hace en `בית` y `ברית`.
7. **Índice invertido completo sobre las 262 ediciones.** Hoy el índice
   semántico cubre sólo los 74 términos del *Conceptus*; cualquier otra palabra
   exige recorrer corpus de 6,7 MB. Un índice de posting por lema, construido
   en `scripts/` y servido por fragmentos, convierte eso en milisegundos. Es la
   mejora de mayor efecto por unidad de trabajo en todo el sitio.
8. **Colocaciones con medida declarada.** Razón de verosimilitud logarítmica o
   información mutua puntual, con el estadístico y el umbral escritos en
   pantalla. Una colocación sin medida declarada es una impresión.
9. **Distribución diacrónica y por género.** Frecuencia normalizada por autor,
   obra y período, con el tamaño del corpus a la vista: sin el denominador, una
   frecuencia no dice nada.

## C · Interoperabilidad: tres huecos concretos

10. **Licencia.** `CITATION.cff` declara `license: NOASSERTION` y no hay archivo
    `LICENSE`. Es el hueco más barato de cerrar y el que más cuesta dejar
    abierto: sin licencia legible por máquina, OpenAIRE, DOAB y los
    agregadores no pueden incluir el proyecto, y una biblioteca universitaria
    no puede catalogarlo. Conviene separar tres capas: el código (una licencia
    de software), los datos y metadatos descriptivos propios (CC BY o CC0), y
    los materiales de terceros (que siguen con su atribución institucional,
    como ya explicás en «Deployment and rights»).
11. **Manifiestos IIIF propios.** Se menciona IIIF en seis módulos y queda como
    pendiente de verificación. Publicar un manifiesto IIIF Presentation 3.0 por
    códice —aunque las imágenes se sirvan desde GitHub Pages— permite que
    Mirador, Universal Viewer y cualquier aula lo abran junto a otros
    testimonios. Es la vía por la que un códice entra en el circuito académico.
12. **`codemeta.json` y `.zenodo.json`.** Con ORCID y ROR. Hacen citable el
    software y automatizan el depósito; hoy el DOI existe pero el vínculo con
    el repositorio es manual.

## D · Método declarado

13. **Procedencia por dato, no por página.** Cada ficha ya cita su fuente; el
    paso siguiente es que cada *campo* la lleve, con fecha de consulta, de modo
    que una corrección de la fuente sea rastreable.
14. **Versiones citables de los datos.** Un volcado fechado del catálogo y de
    los índices, con suma de verificación, depositado en Zenodo. Permite que
    alguien cite «el catálogo tal como estaba el 11 de noviembre de 2026».
15. **Diario de decisiones editoriales.** Las bitácoras por versión existen
    (`biblos-v242`, `arko-bitacora`) y funcionan muy bien en tus libros. El
    sitio merece lo mismo: qué se cambió, por qué, y qué quedó sin resolver.
16. **Traducciones rotuladas.** Me lo señalaste: cuando el visor arma una
    traducción automática, debe decirlo en la misma línea donde se lee, y
    preferir y citar la publicada cuando exista. Sin ese rótulo, el lector
    atribuye a tu edición una decisión que no tomaste.

## E · Respaldo que no se compra con código

17. **Consejo editorial y revisión externa.** Ya hay una revisora acreditada en
    el *Pastor de Hermas* (Dra. Laura V. Fernández). Tres o cuatro nombres con
    especialidad declarada, y un procedimiento escrito de revisión por serie,
    cambian el estatuto de la colección.
18. **Reseña de la serie en una revista del ramo.** Una recensión de *Serie
    Aegyptiaca* o de la edición vitruviana en una revista con revisión por
    pares vale más, para la recepción académica, que cualquier mejora técnica
    de esta lista.
19. **Depósito en DOAB y registro en DOAJ** para lo que corresponda. Requiere
    la licencia del punto 10.

## F · Lectura y accesibilidad

20. **Tipografía de las lenguas antiguas.** Las familias ya están (Cardo,
    Gentium, Noto para hebreo, jeroglíficos, cuneiforme y fenicio). Falta
    altura de línea y tamaño diferenciados por escritura: el griego politónico
    y el hebreo con puntuación masorética necesitan más interlínea que el latín
    para que los diacríticos no se toquen.
21. **Lectura asistida en hebreo y griego.** Dirección del texto, anuncio
    correcto del idioma al lector de pantalla y navegación por versículo o
    locus.
22. **Impresión del locus.** Una hoja imprimible por pasaje, con aparato y
    cita formada, para uso en clase. Das clase en la UFLO: es el puente natural
    entre el sitio y el aula.

---

## Orden que propongo

| Prioridad | Qué | Por qué primero |
| --- | --- | --- |
| 1 | Licencia y metadatos (10, 12) | Horas de trabajo; desbloquea catalogación y agregadores |
| 2 | Índice invertido sobre las 262 ediciones (7) | Mayor efecto visible por unidad de esfuerzo |
| 3 | Árboles de raíz (6) | Es lo que el Lexicon promete y casi tiene |
| 4 | Traducciones rotuladas (16) | Riesgo de atribución, barato de cerrar |
| 5 | Búsqueda paleográfica y alineación folio ↔ locus (3, 4) | Hace útiles los folios ya publicados |
| 6 | Motor de colación con salida TEI (1) | Convierte el método declarado en instrumento |
| 7 | Manifiestos IIIF (11) | Abre los códices al circuito académico |
| 8 | Estemma (2) | Obliga a explicitar decisiones; conviene después de la colación |
| 9 | Revisión externa y reseña (17, 18) | No depende del código, y es lo que más mueve la recepción |

Los puntos 1 a 8 los puedo implementar. El 9 no, y probablemente sea el que más
pesa.
