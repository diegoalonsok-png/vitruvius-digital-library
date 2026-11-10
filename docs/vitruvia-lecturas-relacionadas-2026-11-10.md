# Vitruvia · estante de lecturas relacionadas

**Fecha:** 10 de noviembre de 2026.

## Comportamiento

La página `vitruvia.html` incorpora el sector `#vitruvia-reading-shelf` después del dossier de investigación y antes de las demás fuentes. Su ancho acompaña el tablero de resultados; las tarjetas bibliográficas se desplazan horizontalmente con rueda/trackpad, gesto táctil o flechas. Al seleccionar una tarjeta aparece debajo una explicación y un enlace a la ficha de origen.

Hay dos categorías diferenciadas:

1. **Libros sobre el tema:** bibliografía que estudia específicamente la entidad buscada o registros de Open Library cuyo título coincide con los términos de la consulta.
2. **Libros para comprender la época:** selección editorial documentada que sirve de contexto; nunca se declara influencia, autoría o relación histórica directa sin prueba.

Se conserva el dossier bibliográfico existente, que cumple funciones distintas. El nuevo estante solo organiza **lecturas recomendables o localizables** en un bloque de rápida exploración.

## Reglas de fiabilidad

- Para Pink Floyd, la selección inicial no depende de una búsqueda en tiempo real; sus referencias editoriales se contrastaron con la página oficial del grupo y catálogos.
- Para otras búsquedas se utiliza la API pública `https://openlibrary.org/search.json` con límite de 25 registros; se descartan claves de obra que no respondan a `/works/OL...W` y títulos no coincidentes.
- Las coincidencias automáticas son **propuestas de catálogo**, no juicios académicos de importancia. Si no hay resultados confiables, la sección no aparece.
- Las cubiertas externas proceden de `covers.openlibrary.org`; algunos ISBN corresponden a reediciones. La fecha mostrada indica la primera publicación indicada por la ficha editorial, no necesariamente el año de la cubierta ilustrada.
- Los enlaces abren registros, reseñas o páginas editoriales. El lector **no promete texto íntegro** de libros protegidos por derechos.
- No se almacenan búsquedas privadas en el dispositivo ni se envían documentos personales a la API; la búsqueda externa utiliza exclusivamente el término público escrito.
- Si la red falla, la bibliografía curada de Pink Floyd permanece disponible sin portadas externas, cuando correspondan.
- Se utiliza una petición remota independiente y cancelable, que no bloquea el buscador principal.

## Bibliografía de ejemplo: Pink Floyd

**Libros sobre la banda**

- Nick Mason, *Inside Out: A Personal History of Pink Floyd* (2004). Ficha oficial: https://archive.pinkfloyd.com/history/books_inside_out
- Mark Blake, *Pigs Might Fly: The Inside Story of Pink Floyd* (2007). Ficha oficial: https://archive.pinkfloyd.com/history/books_pigs_might_fly
- Glenn Povey, *Echoes: The Complete History of Pink Floyd*. Ficha oficial: https://archive.pinkfloyd.com/history/books_complete_history
- Storm Thorgerson, *Mind Over Matter 4: The Images of Pink Floyd* (2007). Ficha oficial: https://archive.pinkfloyd.com/history/books_mind_over_matter

**Contexto de época (sin afirmar influencia directa)**

- Tom Wolfe, *The Electric Kool-Aid Acid Test* (1968). Registro WorldCat: https://search.worldcat.org/title/168063
- Theodore Roszak, *The Making of a Counter Culture* (1969). Registro WorldCat: https://search.worldcat.org/title/1036384802

## Validación

Ejecutar `npm run check:reading-shelf`. Comprueba sintaxis JS, carga de archivos, bibliografía curada, recuperación temática estricta, rechazo de resultados no relacionados y limpieza al cambiar de consulta.

**Pendiente de verificar fuera del repositorio:** navegación y contraste visual en navegadores reales, fallos de carga de cubiertas, disponibilidad de servicios externos y despliegue efectivo en GitHub Pages.
