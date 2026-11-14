# Bibliotheca Graeca et Latina — protocolo de incorporación y control académico

## Objetivo
Ampliar progresivamente los textos clásicos griegos y latinos, sin duplicación injustificada. Toda incorporación deberá contemplar originales, traducciones verificadas cuando estén disponibles, indexación semántica y filológica, y lectura pública funcional.

## Requisitos previos
1. Comparar título canónico, autor, identificadores CTS/URN, lengua, tradición textual, edición y archivos presentes en el catálogo web, el registro de búsquedas y el inventario real de Cloudflare R2.
2. No incorporar duplicados textuales. Una edición distinta puede incorporarse como testimonio editorial independiente si se documenta su valor crítico.
3. Consignar fuente, editor, año, volumen, URL persistente, titular de derechos y licencia; no confundir dominio público de la obra antigua con derechos de transcripciones, traducciones o facsímiles modernos.
4. Buscar traducciones castellanas, inglesas y francesas de calidad e identificar traductor, edición y permiso para alojar el texto. Si no existe traducción apta, documentar fuente externa, sin reproducirla.

## Paquete mínimo de cada obra
- Identificador estable de obra y versiones, autor, título original y variantes lingüísticas.
- Texto íntegro por pasajes con numeración canónica conservada, Unicode griego politónico y normalización Unicode explícita.
- Traducciones alineadas por pasaje solo cuando se haya verificado la correspondencia, con los desajustes señalados.
- Índice léxico por lema, forma flexionada, rasgos morfológicos y frecuencia; conservar el texto diplomático/editorial de origen.
- Índice semántico separado y trazable: acepciones, conceptos, personas, topónimos, relaciones de sinonimia y conceptos cognados; no convertir hipótesis automáticas en afirmaciones filológicas.
- Concordancias, citas por locus, metadatos de proveniencia, licencia y control de versiones.
- Estado verificable: identificado / derechos revisados / texto incorporado / indexado / traducción incorporada / QA aprobado / publicado.

## Publicación
Almacenar los objetos pesados y corpus en Cloudflare R2; mantener en GitHub solo la interfaz, registros ligeros y enlaces configurados para R2. No incluir credenciales en el repositorio. Integrar y probar Bibliotheca, Vitruvia y Lexicon. Verificar las rutas de dominio propio y GitHub Pages, y no aumentar las cifras de obras legibles hasta confirmar que el lector y la búsqueda responden correctamente.

## Criterios de calidad
Distinguir texto original, traducción, aparato crítico, comentario e índice derivado; consignar cobertura real y lagunas; preservar atribución editorial; usar identificadores específicos y no inventar DOI ni ISBN. Las relaciones semánticas deben poder rastrearse a pasajes y a un método documentado.

## Flujo continuo
En cada revisión, contrastar los inventarios actualizados, seleccionar candidatos no repetidos, verificar licencias, incorporar si existe acceso operativo a R2 y ejecutar controles. Si falta acceso, preparar registros y fuentes sin declarar una carga inexistente.
