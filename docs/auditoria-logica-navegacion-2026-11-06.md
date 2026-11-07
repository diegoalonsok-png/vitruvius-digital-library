# Auditoría de lógica, funcionalidad y navegación
**Vitruvius Digital Library · 6 de noviembre de 2026**

## Modelo de información que debe permanecer separado

1. **Vitruvius Digital Library `index.html`**: edición y estudio de `De architectura`, manuscritos, recensiones, citas y aparato crítico. No reemplazar este objetivo específico por un buscador genérico.
2. **Vitruvia `vitruvia.html`**: descubrimiento y búsqueda transversal; enlaza hacia fichas, pasajes, códices y obras. El resultado debe distinguir persona, obra, edición y testimonio, sin equivalencias inventadas.
3. **Vitruvia Lexicon `vitruvia-lexicon.html`**: análisis léxico, etimológico, morfológico y filológico; debe explicar límites de análisis heurístico.
4. **Bibliotheca Graeca et Latina `bibliotheca-graeca-latina.html`**: catálogo de obras originales y traducciones; distingue registro bibliográfico, texto alojado y facsímil externo.
5. **Lectores `classics-text-reader.html` y `classics-parallel-reader.html`**: lectura de textos completos y comparación manual o por unidad editorial; no requieren indexación léxica ni afirman alineación exacta.
6. **Scriptoria, facsímiles y códices**: vistas de manuscritos e impresos; folio, imagen digital, sección y locus no son numeraciones intercambiables.

## Resultados de la inspección del código

- Catálogo: 222 fichas, 20 obras distintas con entradas textuales y 43 versiones en el registro; las cifras coinciden con el informe público de cobertura examinado.
- La ruta principal `index.html` incluye más de cien enlaces directos. Es funcionalmente rica, pero necesita una jerarquía de enlaces esenciales, herramientas especializadas y documentos metodológicos.
- `vitruvia.html` importa decenas de módulos JS; riesgo de carga y dependencia excesiva. Priorizar carga diferida y medición real antes de eliminar módulos.
- `vitruvia-lexicon.html` es un documento HTML grande con numerosos accesos internos. Conviene agrupar el flujo de consulta inmediata por palabra, pasaje, etimología y herramientas avanzadas.
- Se incorporaron vínculos recíprocos Biblioteca ↔ Vitruvia ↔ Lexicon y se aclaró el rótulo del catálogo de testimonios en el lector individual.
- El lector doble conserva avance sincronizado **orientativo**. Si dos ediciones tienen diferente segmentación no se debe presentar la sincronización ordinal como equivalencia científica.

## Problemas/riesgos por prioridad

**P0: funcionalidad y publicación**
- Confirmar GitHub Actions para la última revisión: sintaxis JS, rutas, integridad bibliográfica y Playwright.
- Verificar click real de botones: buscar, limpiar, cambiar idioma, inicio/atrás/adelante, colores, inversión, zoom, enlace paralelo, PDF.
- Registrar como **pendiente**, no como resuelto, cualquier fallo por red externa/IIIF y ofrecer enlace institucional.

**P1: integridad y seguridad**
- Validar identificadores de obra/idioma/rutas de los corpus y referencias entre catálogo y buscador antes del despliegue.
- Aplicar lista segura de protocolos a vínculos generados por datos externos, sin destruir destinos académicos HTTPS válidos.
- Evitar interpolar contenido no escapado en HTML; priorizar `textContent` y elementos DOM.
- Permisos mínimos en pipelines, y alertar si fallan en lugar de suprimir notificaciones.
- Verificar licencias y atribución de traducciones **por edición**, sin atribuir dominio público automáticamente a toda transcripción moderna.

**P2: lógica editorial y rendimiento**
- Mantener visible el origen de cada texto (PDF institucional, facsímil, HTML, traducción local, edición bibliográfica).
- Cargar primero fichas y controles; descargar facsímiles/índices grandes bajo demanda.
- Establecer métricas de rendimiento (carga inicial, primera interacción, transición de página, móvil) basadas en Lighthouse/Playwright, sin cifras imaginadas.
- Centralizar navegación básica sin fusionar interfaces que tienen funciones académicas distintas.

## Recorrido que debe probarse

`Inicio → Bibliotheca → buscar Didaché → abrir original → lectura paralela griego/inglés → siguiente capítulo → cambiar tipografía y colores → volver al catálogo → abrir Lexicon → regresar a Vitruvia`.

Este documento es una **auditoría estática de arquitectura y catálogo**. No equivale a una certificación de accesibilidad, seguridad externa ni al aprobado de todos los botones en un navegador.
