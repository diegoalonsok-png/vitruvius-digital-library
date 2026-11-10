# Auditoría de las 222 fichas: depuración documental

**Fecha:** 10 de noviembre de 2026.  
**Alcance:** catálogo maestro de 222 obras, registro de búsqueda, matriz Vitruvius y capa ecdótica.  
**Regla:** no se atribuyen códices, familias, ediciones de control ni URN CTS sin fuentes documentadas.

## Hallazgos estructurales comprobados

- 222 identificadores de obra únicos; 83 registros de testimonios manuscritos asociados a 102 obras, las otras 120 sin testigo individual vinculado.
- 179 obras con códigos PHI/TLG **candidatos**; una URN CTS de edición registrada, todavía pendiente de auditoría de fuente.
- Ninguna obra con edición base acreditada en el campo `digitalEdition.baseEdition` de la capa ecdótica; ninguna con `stemmaCodicum.status` establecido; todas registradas como nivel 0.
- 15 manuscritos con siglum registrado, 12 con tipo de escritura explícito, 35 con soporte, 35 con folios, 54 con visor declarado, 30 con manifiesto IIIF, 81 con enlace de catálogo.
- 20 líneas bibliográficas exactamente duplicadas en la matriz normalizada y, por propagación, otras 20 en la capa ecdótica.
- 112 fichas con índice local documentado en `search-registry.json` y un estado público anterior de búsqueda externa. Estas no constituyen prueba de integridad textual.
- El Excel se genera desde la matriz de 222 obras y contiene otras hojas relacionales. Un análisis de 97 filas no implica que el archivo de origen tenga solo 97 obras; revisar filtros, selecciones, exportación y visualización antes de atribuir truncamiento.

## Correcciones aplicadas

1. Se deduplicaron las 20 entradas bibliográficas repetidas en cada uno de los dos JSON derivados, conservando las citas originales no idénticas y su orden.
2. Se reconciliaron 112 fichas con `publicStatus = lectura-local-parcial`, preservando `indexationAudit.previousPublicStatus`, las rutas y la reserva `integrity = not_verified`. No se declaran textos completos.
3. El generador `scripts/build_ecdotics_222.py` ya elimina duplicados exactos de citas para evitar su reaparición.
4. Se conservaron los registros manuscritos originales: la repetición de un mismo códice en relaciones obra/testigo no constituye duplicación de objetos físicos.

## Límites y siguientes cotejos

La corrección anterior es una normalización **de metadatos**, no una `collatio codicum`. Antes de elevar una ficha a nivel 1 deben identificarse y comprobarse la edición base real, su procedencia, la cita bibliográfica completa y la identidad CTS de la edición correspondiente. Los códigos TLG/PHI candidatos no bastan. Revisión paleográfica y de accidentes materiales solo cuando el catálogo institucional o la bibliografía crítica los acreditan; no se infieren de la descripción en prosa. La presencia de un enlace no certifica su disponibilidad o correspondencia de folios.

Se requiere una prueba de navegador para confirmar que el Excel descargado contenga 222 ID únicos en la hoja principal y que el lector efectivamente abra los textos indexados.
