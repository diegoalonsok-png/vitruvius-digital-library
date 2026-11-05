# Navegación, búsqueda y trazabilidad académica — 5 de noviembre de 2026

Las páginas conservan enlaces y navegación completos. El destino de un enlace interno se prepara por intención de puntero, teclado o toque, sin descargar PDF ni imágenes de manuscritos. Las páginas visitadas recientemente pueden responder desde caché y actualizarse en segundo plano; los documentos antiguos tienen una espera de red limitada cuando existe una copia de respaldo.

El buscador comparte las descargas y el análisis JSON de los índices entre motores. Cancela las solicitudes externas de la consulta anterior, reutiliza respuestas recientes, respeta las revisiones de los índices y aplica pausas a proveedores que responden 429 o 410. Las tarjetas conservan sus nodos y el artículo deja de reconstruirse con cada respuesta parcial.

En el lector bilingüe se completan etiquetas, opciones dinámicas y estados de interfaz en inglés y francés, conservando las lenguas y la identidad editorial de los textos, las traducciones y las citas. Se preservan las incorporaciones de textos y los filtros de evidencia de la actualización general anterior.

## Control académico

`control-academico.html` presenta un informe reproducible de cobertura e identificación documental. La comprobación exige los mismos 731 loci en las tres ediciones. V297 conserva 728 bloques, incluidos VII.7.1–3 y VII.7.4–5; no se inventan unidades de traducción para desagregarlos. Los 23 testimonios del repertorio incluyen biblioteca, signatura, datación y fuente. Las 1.393 entradas del aparato mantienen su método de vinculación: 519 siguen clasificadas como candidatos sin verificar.

Esta validación comprueba integridad del índice y trazabilidad. No acredita autopsia de manuscritos, revisión por pares ni cotejo filológico completo. Las correcciones de lecturas, traducciones y numerales requieren comprobaciones documentales individuales y deben conservar las variantes justificadas.

## Verificación

- `node scripts/vitruvia-regression-check.mjs`
- `node tests/locus-aliases.mjs`
- `node scripts/test-vitruvia-resilience.mjs`
- `node scripts/test-vitruvia-performance.mjs`
- `node scripts/test-navigation.mjs`
- `node scripts/academic-integrity.mjs`

Comparación local sobre 4.163 pasajes: 24 búsquedas repetidas, 30.481 ms antes y 888 ms después, conservando los resultados y sus puntuaciones. Esta medición corresponde a recuperación local con índices cargados; no mide la latencia de Internet ni garantiza esos tiempos en otros dispositivos. En la vista de prueba, la consulta «Lucrecio» presentó sus primeros resultados en 194 ms; las fuentes externas continuaron completándose después.

La revisión visual comprobó la resolución de `2.pr.1`, el latín con las tres traducciones y el cambio de controles a inglés y francés. La navegación normal, los enlaces directos y el historial permanecen a cargo del navegador.

## Accesos instalables en celulares

Vitruvius conserva su manifiesto e identidad de instalación. Vitruvia incorpora otro manifiesto, identificador, icono y página de inicio. Son accesos complementarios de una plataforma: comparten origen, service worker, documentos y preferencias; no se presentan como aplicaciones con almacenamiento aislado. La apertura desde los iconos dirige a la biblioteca o al buscador respectivamente. El comportamiento de captura de enlaces puede variar entre navegadores al compartir origen.

`instalar-apps.html` explica los pasos de Android y Safari en iPhone/iPad. El botón de instalación abre la petición nativa únicamente tras una acción del usuario; cuando el navegador no ofrece esa petición, enlaza la guía. Los recursos externos siguen necesitando conexión y la instalación no descarga el corpus completo. Las pruebas verifican identidades distintas, destinos, iconos, metadatos en el `head` y apertura de la petición por acción explícita; la instalación en un teléfono físico debe comprobarse en el dispositivo del usuario.
