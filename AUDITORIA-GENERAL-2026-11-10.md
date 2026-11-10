# Auditoría general del sitio · 10 de noviembre de 2026

**Alcance:** Vitruvius Digital Library (portada, Vitruvia, Vitruvia Lexicon, Bibliotheca Graeca et Latina, lectores, folios y GitHub Actions).

**Política editorial:** revisión no destructiva. No se modifican textos madre, folios, aparatos críticos, manuscritos, traducciones ni identificadores bibliográficos sin cotejo. Una prueba técnica aprobada no equivale a certificación filológica.

## Diagnóstico con evidencia

| Área | Estado verificable | Limitación / acción |
| --- | --- | --- |
| GitHub Pages | Despliegue exitoso del commit `cf426e8d765363d69afa8131a99d9709dc87315e`, tras fusionar PR #276 | Verificar siempre la versión desplegada frente a la caché del navegador |
| Seguridad / validación | Workflows de seguridad y validación general aprobados sobre ese commit | No constituyen una auditoría de penetración |
| Vitruvia | PR #276 fusionada: carga de índices en etapas, ficha principal anticipada, resultados más compactos | Evaluar latencias reales con red lenta y relevancia sobre corpus amplio |
| Lexicon y lectores | Lexicon activo; ampliación de fichas de palabras resaltadas y scrollbars en PR #278 | Integración no certificada hasta pruebas y fusión; no equiparar propuesta con función desplegada |
| Lector paralelo | Fallo reproducido en la prueba `scripts/classics-visor-smoke.mjs`, sección de colores y navegación | Investigar estado CSS calculado e interacción por `postMessage`; no ignorar la prueba |
| Biblioteca clásica | Validaciones automáticas de catálogo, búsquedas textuales, PDF y fuentes | Falta verificación de todas las ediciones, licencias, enlaces externos y OCR |
| Cobertura de originales | El manifiesto de conciliación declara **222 obras**, **181 originales alojados indexados**, **28 originales remotos** y **13 originales sin índice** | Son métricas del manifiesto, no garantía de integridad de cada obra ni de edición crítica |
| Manuscritos / facsímiles | Navegación IIIF y PDF comprobada en casos del conjunto de regresión | Resta validar signaturas, disponibilidad de proveedores y derechos individualmente |
| Interfaz secundaria | Barra compartida de idioma / tema existe en el código de páginas secundarias | Su cobertura y calidad visual integral en móvil no están acreditadas |
| Contraste WCAG | El barrido automatizado de tema claro/oscuro reportó **5.890 instancias** por debajo del umbral de 3:1; incluye repeticiones entre vistas y no constituye auditoría manual | Priorizar estilos de textos secundarios, enlaces y controles; no alterar globalmente el aspecto de folios ni la personalización del lector |
| Buscador semántico | Integración y fallback existen en el proyecto | No se certifica funcionamiento E5 universal, precisión ni tiempos de descarga por dispositivo |

## Acciones aplicadas en esta revisión

1. Se reparó el conflicto de datos que impedía fusionar la mejora de búsqueda. Se conservaron los **28 registros remotos** más recientes, incluidas las incorporaciones de Plutarco y Macrobio, en lugar de reponer el archivo antiguo de 25.
2. Se fusionó **PR #276** (búsqueda progresiva, primer resultado documentado, distribución compacta, pruebas de regresión). Commit de integración: `cf426e8d765363d69afa8131a99d9709dc87315e`.
3. Se examinó el fallo del lector paralelo en CI y se corrigió una expectativa de prueba que inspeccionaba el estilo inline en vez del color calculado de CSS. Al persistir el fallo, se incorporaron diagnósticos adicionales a la rama de PR #278. **No declarar resuelto hasta CI verde.**
4. Se mantuvieron intactos los textos y facsímiles originales.

## Prioridades recomendadas

1. **P0 — lector paralelo:** reproducir el paso exacto y reparar la propagación de apariencia entre paneles si la regresión persiste; comprobar funcionalidad real después del arreglo.
2. **P0 — publicación segura:** fusionar PR #278 únicamente si supera regresiones de navegador, integridad, protección de folios y seguridad.
3. **P1 — experiencia de búsqueda:** medir tiempo a primer resultado, tiempo a índice completo, y calidad de búsquedas para personas, nombres históricos y vocablos griegos y latinos.
4. **P1 — diseño:** resolver paneles vacíos y desbordamientos en vistas de 390, 960 y 1440 px. Evitar CSS global que afecte folios o ediciones.
5. **P1 — biblioteca:** hacer que cada ficha distinga con claridad **obra**, **testimonio**, **edición**, **transcripción OCR**, **traducción** y **lector externo**; indicar lo incompleto y la procedencia.
6. **P2 — coherencia visual:** normalizar botones de idioma, apariencia, impresión y exportación en páginas secundarias, con comprobación de accesibilidad por teclado.
7. **P2 — rendimiento:** medir peso y número de descargas, persistencia de índices e interrupción de consultas obsoletas, con comparaciones reproducibles.
8. **P2 — academia:** completar la validación de citas, Chicago 18, enlaces DOI/ISBN, repertorios y manuscritos antiguos sin inventar variantes o equivalencias.

## Evidencias y reproducibilidad

- GitHub Actions: https://github.com/diegoalonsok-png/vitruvius-digital-library/actions
- Mejora integrada: https://github.com/diegoalonsok-png/vitruvius-digital-library/pull/276
- Ampliación pendiente de verificación: https://github.com/diegoalonsok-png/vitruvius-digital-library/pull/278
- Scripts: `scripts/all-pages-check.mjs`, `scripts/audit-site-links.mjs`, `scripts/classics-visor-smoke.mjs`, `scripts/test-public-site-integrity.mjs`, `scripts/test-vitruvia-performance.mjs`, `scripts/test-vitruvia-entity-identity.mjs`.
- Historial de limitaciones: `AUDITORIA-FUNCIONAL-PENDIENTES.md`, `AUDITORIA-CORPUS-CLASICO.md`, `AUDITORIA-VISUAL-VITRUVIA-LEXICON-2026-11-07.md`.

**Límite del alcance:** esta revisión contrastó código del repositorio, documentación y resultados CI. No se ha completado una inspección visual interactiva de todas las páginas públicas, un muestreo exhaustivo de cada texto ni una auditoría de seguridad externa. Los estados «pendiente» son deliberados y no deben convertirse en «aprobado» sin evidencia.
