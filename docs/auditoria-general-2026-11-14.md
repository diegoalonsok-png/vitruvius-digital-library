# Auditoría general · Vitruvius Digital Library

Revisión iniciada el 14 de noviembre de 2026 (Argentina), completada técnicamente el 15 de noviembre UTC. Base examinada: `7e439890c4cc85b548c7f9ab883ee1236b68fe71`, más las correcciones de esta entrega.

## Resultado

**56 programas de comprobación satisfactorios.** Sintaxis: 540 archivos JavaScript/MJS sin errores. Datos: 10541 JSON válidos. Los resultados reproducibles están en [checks.json](../reports/general-audit-2026-11-14/checks.json) y sus registros individuales. La auditoría comprueba software e integridad documental; no sustituye una colación humana de todas las ediciones.

El nuevo lector de facsímiles ya está integrado en la rama principal mediante `d8ca5e069afe6464e29b346ecf4aedcc38225783`. Su flujo de GitHub «Visor de facsímiles enfrentados · regresión» terminó correctamente, al igual que sus despliegues de GitHub Pages y Cloudflare Pages. La revisión final no vuelve a introducir una copia antigua del sitio.

## Facsímil y traducción de la misma hoja

El [lector de Accio](https://vitruvius-digital-library.org/buscador-facsimiles-clasicos?obra=accius-fragmenta) presenta el PDF a la izquierda y la traducción automática al castellano a la derecha. Se puede elegir francés o inglés, consultar el OCR original o mostrar OCR y traducción. La navegación superior mantiene la misma página digital en ambos paneles. Incluye ampliación del PDF, inversión y tamaño de letra.

Accio tiene 456 páginas digitales, 439 con OCR registrado. La primera cubierta carece de texto. La apertura sin número explícito elige la primera hoja con texto suficiente; todas las cubiertas siguen disponibles por número. El texto largo se procesa íntegro por fragmentos. Una respuesta tardía no puede sustituir la traducción de otra hoja. Los errores y resultados parciales se indican, y desactivar el modo automático detiene nuevas consultas.

Si falla la carga del JSON OCR, el lector intenta la capa textual de esa misma página PDF. Una imagen sin OCR y sin capa textual necesita reconocimiento óptico; el visor no toma texto de otro pasaje. Las traducciones de MyMemory o Google Translate son versiones automáticas no revisadas. En griego antiguo, el proveedor emplea soporte de griego moderno: es necesaria revisión filológica.

## Correcciones de esta revisión final

- Los lectores y buscadores esperan el HTML actualizado de red en rutas con y sin `.html`, incluido el subdirectorio de GitHub Pages. Conservan lectura en caché sin conexión. La prueba de regresión ahora verifica este comportamiento en vez de exigir una forma concreta del código.
- Se actualizaron las copias de estados del catálogo y el recuento de testimonios, que aún mostraba 23 frente a los 106 registrados. La tabla pública distingue las filas R2 de los archivos locales; su filtro de búsqueda incluye correctamente ambos grupos y sus cifras se calculan desde el registro.
- La sincronización conserva la distinción vigente del sitio: **original local**, **original declarado en R2** e **índice externo**. Los campos de compatibilidad utilizados por los lectores permanecen estables; se añaden campos explícitos para archivos locales y objetos R2. Regenerar los datos no convierte una declaración remota en una verificación de disponibilidad.
- Se completaron los estados CTS no verificados de 49 registros y se actualizó el generador. El contador estático de procedencia muestra las 271 obras actuales. No se atribuye afiliación a Perseus ni resolución CTS sin evidencia.
- La prueba de los diez prefacios del códice H cierra sus ventanas, concluye normalmente y devuelve error si falla algún folio.
- Se añadió un flujo de regresión con permisos de lectura para cobertura, navegación, caché y procedencia. No cambia ni publica textos originales.

## Cifras reconciliadas y su alcance

| Concepto | Cantidad |
|---|---:|
| Obras del catálogo maestro | 271 |
| Originales en archivos del repositorio | 182 |
| Originales adicionales declarados en R2 propio | 32 |
| Originales registrados del proyecto, sin duplicados | 214 |
| Índices externos adicionales documentados | 28 |
| Unión de originales locales e índices externos documentados | 210 |
| Unión de todos los originales registrados, incluido R2 declarado | 242 |
| Versiones textuales registradas, incluido R2 | 279 |
| Versiones en archivos del repositorio | 247 |
| Obras con traducción alojada registrada | 59 |
| Obras sin traducción alojada registrada | 212 |
| Testimonios documentados | 106 |

Los 210 originales de la conciliación histórica y los 242 registrados incluyendo R2 tienen distinto alcance. Las 32 declaraciones R2 se cuentan separadamente y no se presentan como objetos comprobados en vivo por esta auditoría. Los 281 resultados posibles del buscador público de títulos incluyen suplementos R2 y no equivalen a los 271 registros maestros.

## Límites de la verificación pública

Durante la fase inicial se comprobaron en el navegador la portada, la Bibliotheca, la búsqueda `numen` del Lexicon y H `f.18r` (imagen 43 de 341). La inspección visual del lector nuevo quedó bloqueada por la revisión automática del navegador debido a un límite de uso. No se presenta como comprobada visualmente su traducción en producción. Los despliegues y las pruebas de sincronización se verificaron por separado; la disponibilidad de los proveedores de traducción sigue siendo externa.

El flujo adicional «Workers Builds» también falla en la rama principal de referencia, mientras Cloudflare Pages y GitHub Pages despliegan correctamente. No se confunde ese estado con un fallo de ambos sitios. Otros controles históricos de navegador deben revisarse separadamente cuando difieren de las pruebas locales actuales.

## Tareas académicas pendientes

- De 811 notas con procedencia documental, 41 tienen anclaje explícito y 770 necesitan revisión de locus. Estas cifras corresponden al inventario de notas, no al nuevo aparato comparativo selectivo desarrollado en otras partes del sitio.
- 47 de 115 entradas etimológicas carecen de loci locales citados.
- Tres parejas de lenguas no comparten identificadores de locus; se conservan íntegros sus textos para comparación independiente.
- Las 37 alertas heurísticas latinas son candidatos de cotejo, no errores demostrados ni variantes manuscritas certificadas.
- V514 y V554 contienen 731 loci; V297 tiene 728 segmentos con unidades agrupadas en VII.7. La diferencia de segmentación no demuestra pérdida de texto.
- El control de citas encuentra 15 versiones locales pendientes de una cita específica de edición. No se completan datos bibliográficos desconocidos por inferencia.
- La resolución externa de los DOI no pudo validarse en esta ejecución. Los controles internos de formato y referencias pasaron; no se clasifican como enlaces rotos por esa limitación.

Se conservaron todos los originales, folios, imágenes, PDF, DOCX, traducciones editoriales y registros maestros. No se asigna una puntuación académica global a partir de pruebas de software.
