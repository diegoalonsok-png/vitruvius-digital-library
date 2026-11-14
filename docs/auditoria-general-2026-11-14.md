# Auditoría general · Vitruvius Digital Library

Fecha: 14 de noviembre de 2026. Fuente de trabajo: `cb62211b774b2b822129d0e600c3c8b015dd2158` más las correcciones documentadas en esta entrega.

## Resultado y alcance

Se completaron 53 programas de comprobación con resultado satisfactorio. Se revisaron la navegación, los datos bibliográficos, el corpus, las búsquedas, las citas, los lectores, la privacidad de la medición, la caché y las referencias internas. El control inicial de sintaxis examinó 519 archivos JavaScript/MJS y 10.537 JSON sin errores. Los nuevos módulos y scripts se verificaron también por separado.

Estas pruebas comprueban integridad y comportamiento del software. No sustituyen una colación filológica humana de cada edición ni garantizan la disponibilidad de servicios externos. Se conservaron los originales, imágenes, PDF, DOCX, traducciones y registros maestros de obras y testimonios.

## Correcciones aplicadas

1. **Facsímil y traducción de la misma página.** El buscador de facsímiles clásicos presenta el PDF a la izquierda y la traducción automática al castellano a la derecha. Permite francés o inglés, consultar el OCR original, mostrar ambas lecturas y corregir el idioma de la hoja. La navegación superior, el número de página y la traducción comparten la misma página digital. Se añadieron ampliación del PDF y tamaño de letra independiente.
2. **Accio.** El objeto ya contenía OCR para 439 de sus 456 páginas. La cubierta inicial no tenía texto. La apertura sin página explícita selecciona la primera hoja con texto suficiente; las cubiertas siguen accesibles mediante su número. No se ha reemplazado el OCR por texto de otra obra.
3. **Traducción íntegra y respuestas tardías.** Se procesa el texto de la página en fragmentos dentro de los límites del servicio. Si falla un fragmento se informa del resultado parcial. Una respuesta de una hoja anterior no puede sobrescribir la hoja actual. Desactivar la traducción detiene nuevas consultas. Los servicios utilizados son externos; las versiones automáticas no son transcripciones diplomáticas ni traducciones críticas revisadas.
4. **PDF y OCR.** Un lienzo presenta una sola página del PDF mediante PDF.js. Si falla el motor, se conserva el visor nativo y se indica que debe usarse la navegación superior para sincronizar. Si falta el JSON OCR se intenta la capa textual de esa misma página PDF. Una imagen sin OCR y sin capa textual sigue necesitando reconocimiento óptico; no se inventa su contenido.
5. **Caché de lectores.** Los lectores actuales esperan el HTML de red y conservan la alternativa sin conexión. La regla cubre rutas con y sin `.html`, tanto en el dominio propio como bajo el subdirectorio de GitHub Pages.
6. **Cobertura coherente.** Se regeneraron las métricas derivadas y se diferenciaron originales del proyecto, originales externos y versiones textuales. Se preservaron las fuentes externas, sin sustituirlas por el corpus propio en R2.
7. **Procedencia editorial.** Se completaron campos explícitos de no afiliación a Perseus y estado CTS no verificado en 49 registros recientes. Se actualizó el generador para que conserve esa distinción en futuras incorporaciones.
8. **Validación y presentación.** Se corrigieron formas de interfaz que bloqueaban la validación, se incorporó la configuración de medición ya existente al lector simple y se cerraron las ventanas del ensayo de prefacios para evitar que quedara bloqueado. La navegación estática mantiene su prueba independiente de la actualización obligatoria de los lectores.

## Cifras reconciliadas

| Concepto | Cantidad | Alcance |
|---|---:|---|
| Obras del catálogo maestro | 271 | Registros maestros |
| Obras con texto registrado del proyecto | 214 | 182 locales y 32 en R2 propio |
| Versiones textuales registradas | 279 | Diferentes lenguas y ediciones |
| Originales externos adicionales | 28 | Índices externos documentados |
| Originales indexados en conjunto | 242 | Unión sin duplicados |
| Registros pendientes de original indexado | 29 | Incluye tres registros editoriales de Vitruvio |
| Obras con traducción alojada registrada | 59 | No cuenta generación automática |
| Obras sin traducción alojada registrada | 212 | Pueden disponer de traducción automática |
| Testimonios documentados | 106 | Registros de testimonios, no colaciones certificadas |

Los 281 resultados posibles del buscador público de títulos incluyen suplementos del catálogo R2 y tienen un alcance diferente de los 271 registros maestros.

## Verificación

Los resultados y los registros individuales se conservan en [checks.json](../reports/general-audit-2026-11-14/checks.json). Incluyen integridad de corpus y originales, enlaces locales, 30 huellas documentales, extracción de 25.794 párrafos, correspondencias por loci, prefacios del códice H, lectores Rose/Krohn, búsqueda literal y por significado, diccionarios, referencias y comportamiento de caché.

Las nuevas pruebas cubren la identidad PDF/OCR, la apertura útil sin ocultar cubiertas, el texto largo completo, el cambio de página, las respuestas tardías, la detención de peticiones y las rutas de publicación. El lector simple conserva el aparato editorial, los colores y el traductor incorporados por las actualizaciones contemporáneas del proyecto.

En el sitio público se comprobaron la portada, la Bibliotheca, la búsqueda `numen` del Lexicon y el códice H (`f.18r`, imagen 43 de 341). La comprobación pública final del nuevo lector enfrentado debe registrarse después del despliegue; estos ensayos locales no se presentan como una verificación de producción.

## Trabajo académico pendiente

- Hay **770 de 811 notas** con procedencia documental pero pendientes de una asignación precisa de locus; 41 tienen anclaje explícito. No deben adjudicarse automáticamente a pasajes por proximidad.
- **47 de 115 entradas etimológicas** carecen de loci locales citados. Se necesitan referencias textuales comprobables.
- **Tres de 16 parejas de lenguas** no comparten identificadores de locus. Se conservan los textos íntegros y la comparación independiente.
- Persisten **37 alertas heurísticas de colación latina**. Son candidatos de revisión, no errores demostrados ni variantes manuscritas certificadas.
- V514 y V554 tienen **731 loci**; V297 tiene **728 segmentos**, con unidades agrupadas en VII.7. Esta diferencia de segmentación no demuestra pérdida de texto.
- **207 registros** no incluyen una cita editorial estructurada en los campos de obra/versión examinados; 126 figuran como legibles. Esto no implica ausencia de toda fuente en sus lectores. Conviene normalizar esos campos, además de diez fichas bibliográficas parciales.
- La resolución externa de los DOI no pudo validarse en esta ejecución. Las comprobaciones internas de formato y referencias pasaron; no se clasificaron los DOI como rotos.

No se asigna una puntuación académica global a partir de pruebas de software.
