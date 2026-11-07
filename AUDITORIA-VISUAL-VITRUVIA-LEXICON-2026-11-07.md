# Auditoría de identidad visual — Vitruvius Digital Library

**Fecha:** 7 de noviembre de 2026  
**Referencia de diseño obligatoria:** **Vitruvia (buscador)** y **Vitruvia Lexicon (buscador léxico)**.  
**Repositorio y revisión:** `diegoalonsok-png/vitruvius-digital-library`, rama `main`, commit base `697de38e875d68fd6f22ba352a35c80e2d62af20`.

## Alcance y nivel de evidencia

- El árbol de la rama principal contiene **111 archivos HTML** (100 en la raíz). Se leyó y examinó la estructura HTML y CSS de **16 páginas representativas**; no es una certificación visual de las 111.
- Se verificó que el último despliegue y las pruebas de geometría en Chromium para Vitruvia finalizaron correctamente, en el commit base, según GitHub Actions. Estas pruebas usan contenido simulado para medir anchuras: **no prueban la disponibilidad real de fuentes externas ni la precisión de imágenes**.
- No fue posible realizar en esta revisión una inspección visual interactiva completa del sitio publicado. Los defectos indicados son hallazgos **del código fuente** o riesgos de diseño, salvo donde se cita expresamente una prueba de navegador.

## Norma de identidad visual

1. **Base oscura** negro / grafito (`#0d0d0e`, `#171719`, `#232326`) y textos claros (blanco roto / grises). Luz o colores personalizados cuando el lector los elige; no imponer un modo oscuro a un visor personalizado.
2. **Controles únicos:** botones y pestañas de superficies neutras oscuras, bordes discretos, radios moderados, foco visible, contraste suficiente y `aria-pressed` cuando corresponda.
3. **Jerarquía editorial:** títulos con serif académica, controles y metadatos con sans serif, griego politónico con fuentes adecuadas; no normalizar ni reemplazar grafías originales.
4. **Una columna principal legible:** los artículos enciclopédicos y resultados ocupan el ancho disponible; el material complementario aparece debajo o en una columna útil de verdad, nunca dejando grandes vacíos negros.
5. **Lectores independientes:** controles de fondo, tipografía, ampliación y selección por visor, sin reemplazar el texto madre, las notas ni los facsímiles.
6. **Eliminar las barras azul marino con marcos dorados heredados** como identidad visual. El dorado puede usarse con discreción para citas o marcas semánticas, no como marco de navegación omnipresente.
7. **Procedencia visible:** original, traducción, OCR, edición y testimonio físico se distinguen sin inventar colaciones o alineaciones.

## Diagnóstico de la muestra de 16 páginas

| Página | Evidencia en código | Prioridad | Acción |
| --- | --- | --- | --- |
| `vitruvia.html` | 83.819 caracteres de CSS embebido más 17 hojas CSS vinculadas; varias generaciones de reglas de lectura y paneles | **Alta (mantenibilidad)** | Consolidar cascada y reducir `!important` sin deshacer la regresión Chromium aprobada |
| `vitruvia-lexicon.html` | Hoja propia y diseño oscuro de referencia; integra `lexicon-header-unified.css` y `lexicon-library-unified.css` | Referencia | Usar como patrón de controles e identidad |
| `lexicon-vitruvianum.html` | Valores heredados explícitos `#14283a`, `#132b42` y fondos blancos, aunque incluye `concordance-lexicon-design.css` | **Alta** | Sustituir estética de filtros/navegación por la de Lexicon **sin romper personalización del texto** |
| `index-locorum.html` | Tema negro mayoritario, pero estilo autónomo y reglas inline | Media | Validar uniformidad de navegación, idioma, enlaces y fichas léxicas |
| `index.html` | Estructura antigua `wrap`, múltiples hojas y acentos dorados | Media | Modernizar controles sin perder la identidad académica de portada |
| `bibliotheca-graeca-latina.html` | Conviven fondos claros embebidos y hojas finales monocromáticas | **Alta** | Comprobar cascada real en escritorio y móvil; lectores de dos/tres visores deben ocupar el ancho útil |
| `scriptorium.html` | Filtros, formularios y visores aún incluyen azules `#203447`, `#24384b` y superficies papel | **Alta** | Unificar el cromado de la interfaz; **conservar la imagen de folio sin filtros destructivos** |
| `lector-bilingue.html` | Usa apariencia especializada y hojas académicas | Media | Verificar opciones independientes por visor y contraste |
| `aparato-critico.html` | Bordes/acento heredados y algunas superficies blancas | **Alta** | Unificar controles y notas sin sacrificar variantes, cita de locus o procedencia |
| `apparatus-criticus.html` | Usa estilos compartidos académicos | Media | Comprobar consistencia de lectura con el aparato en castellano |
| `buscador-documental-clasicos.html` | Hoja propia con azules `#243b4d` y botones dorados | **Alta** | Migrar navegación y búsqueda al estilo Vitruvia |
| `buscador-facsimiles-clasicos.html` | Hoja propia con azules `#243c4e` y blancos cálidos | **Alta** | Migrar controles sin cambiar el visor y sus enlaces |
| `concordancia-historica.html` | Barra `.perrault-toolbar` azul `#192735`, botón `#2b4050`; dos columnas funcionales | **Alta** | Pasar botones a grafito; conservar la comparación de dos paneles cuando ambos tengan contenido |
| `papyrologia-ostraca.html` | Predomina negro, pero sobreviven acentos y paneles individuales | Media | Auditar ergonomía de controles de imágenes y zonas de arrastrar |
| `metodologia-filologica.html` | `.ph-card` crema, pestañas `#203c54`, modo oscuro azul `#283a4a` | **Alta** | Aplicar estilo grafito y conservar jerarquía científica / accesibilidad |
| `registro-ecdotico.html` | Acentos azulados y dorados en controles de registro | Media | Unificar superficie de notas y evidencia |

## Riesgos confirmados en la arquitectura visual

- **Cascada fragmentada:** el CSS embebido de Vitruvia más numerosas hojas externas multiplica las oportunidades de colisiones.
- **Identidad inconsistente:** varias páginas usan aún azules marinos, marcos dorados, fondos crema y tipografías de controles diferentes a los buscadores canónicos.
- **Regresiones recurrentes:** los `grid-template-columns`, `max-width`, `position:sticky` y `display` heredados pueden recrear columnas vacías.
- **Peligro de “arreglo global”:** una sobreescritura CSS universal sin inspeccionar cada lector puede romper imágenes, paneles de cotejo, colores personalizados y edición crítica.

## Criterios de aceptación (para cualquier futura fusión)

- Capturas de escritorio (1440 px), tablet (960 px) y móvil (390 px), **en estados reales tras una búsqueda** y también sin resultados.
- Buscar `logos`/`λόγος`, `domus`, `loci`, `Julio César`, `San Martín` y `Cristos negros de Centroamérica`; comprobar pertinencia de primeras fichas, presencia de fuentes de imágenes y ninguna imagen inventada.
- El artículo y los resultados ocupan al menos el 90% del ancho disponible de su contenedor, sin desbordes horizontales ni zonas negras vacías; salvo lectores paralelos expresamente solicitados.
- No puede mostrarse un panel de consulta filológica experimental mientras carezca de función verificable.
- Verificar versión del CSS/JS, Service Worker y despliegue para no atribuir a la corrección una caché antigua.
- Mantener íntegros texto original, traducciones, aparato crítico y notas. Registrar todo cambio editorial en expediente separado.
- Ejecutar CI de sintaxis/integridad, pruebas Chromium y comprobar manualmente la consulta a API de imágenes. **Un pase en CI no equivale a aprobación filológica ni a garantía de servicios externos.**

## Orden de implementación recomendado

1. **P0** Vitruvia: preservar los arreglos ya desplegados, validar búsquedas reales y fijar pruebas de no-regresión.
2. **P1** Reemplazar cromados azul/dorado en Scriptorium, metodología filológica, concordancia histórica y buscadores clásicos independientes.
3. **P1** Unificar Lexicon Vitruvianum y el aparato crítico, sin borrar la personalización del lector.
4. **P2** Revisar Bibliotheca y visores multicolumna, y continuar luego por el resto de las 111 páginas.
5. **P3** Extraer un pequeño sistema común de tokens y componentes solo tras validar visualmente dos o tres páginas piloto; no incorporar otra hoja universal de reglas `!important` como solución permanente.

## Resultados técnicos de referencia

- Despliegue `main` comprobado: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420819535
- Geometría Chromium (1440/960/390 px) aprobada: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420819684
- Validación general: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42420819774

**Estado:** auditoría de estructura y diseño CSS de una muestra representativa; las páginas restantes, el comportamiento real de imágenes externas y la accesibilidad con lector de pantalla requieren pruebas complementarias.