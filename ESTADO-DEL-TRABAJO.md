# Estado del trabajo · 11 de noviembre de 2026

Sesión de mejoras sobre **Vitruvius** (biblioteca), **Vitruvia** (buscador de
humanidades) y **Lexicon** (términos griegos, latinos y hebreos).

Todo lo descrito aquí está en `main` y publicado. Los requisitos del autor, con
su criterio de aceptación y su estado, están en
`ESPECIFICACION-VITRUVIA-BUSCADOR.md`. Las propuestas para elevar el nivel
académico, en `PROPUESTAS-NIVEL-ACADEMICO.md`.

## Hecho y medido

| Qué | Antes | Ahora |
| --- | --- | --- |
| Hojas de estilo bloqueantes en Vitruvia | 22 peticiones | 5 |
| JSON descargado antes del primer pintado | 836 KB | 0 |
| Precarga del *service worker* en la primera carga | 502 KB en 20 peticiones | diferida al primer rato libre |
| Búsqueda léxica en el corpus clásico | 42 MB · 132 ediciones | 4,9 MB · 9 ediciones |
| Obras buscables por palabra | 23 | 238 ediciones, Vitruvio incluido |
| Fichas con testimonios y códice más antiguo | 0 de 222 | 122 |
| Fichas con siglo y período | 35 | 216 |
| Diccionario al pulsar una palabra | 4 contenedores | 9 páginas, cualquier pasaje |
| Respuesta visible al pulsar | 1 página, lista fija | 81 páginas |
| Griego politónico y hebreo | sin pila declarada | 25 páginas |

## Herramientas nuevas, todas reproducibles

```
npm run build:styles     # regenera los paquetes de CSS tras editar una hoja
npm run build:index      # reconstruye el índice léxico del corpus clásico
npm run build:records    # completa las fichas de las obras clásicas
npm run check:boot       # excepciones de arranque (necesita: npm i --no-save jsdom)
npm run check:philology  # 60 pruebas de grafía, flexión, citas y onomástica
npm run check:rank       # 29 pruebas de ordenación
npm run check:index      # 28 pruebas del índice léxico
npm run check:gate       # mide el ahorro de descarga del motor del corpus
node scripts/build-vitruvia-metrics.mjs   # instantánea de recuentos del catálogo
```

**Importante**: después de editar cualquier hoja de estilo empaquetada hay que
ejecutar `npm run build:styles`. Sin eso el cambio no se ve, porque la página
enlaza el paquete y no la hoja.

## Lo primero que conviene retomar

1. **Códices de las 100 obras sin testimonio catalogado.** Están listadas una
   por una, con enlaces de búsqueda preparados, en
   `reports/fichas-clasicas-pendientes.md`. Cada hallazgo debe entrar en
   `data/bibliotheca-testimonia-verified.json` con signatura, repositorio,
   datación, base de la datación y URL de catálogo, como los 100 que ya hay; y
   después `npm run build:records`. Ningún códice se afirma sin fuente.
2. **Licencia.** `CITATION.cff` declara `license: NOASSERTION` y no hay
   `LICENSE`. Es la decisión del autor y bloquea la catalogación en OpenAIRE,
   DOAB y bibliotecas. Conviene separar código, datos propios y materiales de
   terceros.
3. **Peso del sitio.** 1,1 GB publicados, por encima del límite recomendado de
   GitHub Pages; las imágenes son 442 MB y los documentos 249 MB. Decidir si los
   folios en alta resolución siguen en el repositorio o pasan a un servidor
   IIIF o a Zenodo, dejando derivados livianos.
4. **Árboles de raíz del Lexicon** (R9) sobre `data/lexicon/etymologicum.json`,
   que ya tiene 115 fichas con raíz protoindoeuropea, cognados y referencias a
   de Vaan, Beekes y LSJ.
5. **Búsqueda tolerante a la paleografía** (R14) para la minúscula carolina, y
   alineación folio ↔ locus, que es el camino fiable a la imagen sin depender
   del OCR.

## En espera por decisión del autor

- **Estética**: «no cambiar por ahora la estética del site». Quedan en espera la
  página de IA en estilo minimalista (R10) y la capa tipográfica académica
  (R11). Nada de lo hecho en esta sesión cambió la estética salvo lo que se
  pidió expresamente: respuesta al pulsar, interlínea del griego politónico y
  colapso de las regiones vacías.

## Una advertencia honesta

Durante esta sesión introduje un error que dejó el buscador sin resultados unos
cuarenta minutos: una edición incompleta dejó una llamada a una función que no
se había escrito. Está corregido, y `scripts/test-page-boot.mjs` existe
precisamente para que ese tipo de error se detecte en segundos y no por correo
veinte minutos después de publicarlo. Conviene ejecutar `npm run check:boot`
antes de cada publicación.
