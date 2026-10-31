# Motor semántico amplio — especificación técnica
**Estado: diseño para implementación, no IA vectorial activa.**

## Propósito
Indexar automáticamente los textos de los diez libros de *De architectura* en las ediciones V514 (latín–español), V554 (latín–francés) y V297 (latín–inglés), y las ediciones históricas con OCR validado. No cargar términos manualmente.

## Unidad canónica y evidencia
- Unidad de recuperación: pasaje por locus `libro.capítulo.sección`; conservar idioma, edición, cita, procedencia y enlaces al original.
- Fragmentar los pasajes largos en bloques solapados, sin perder su identificador de locus ni sus rangos de caracteres.
- Diferenciar coincidencia literal, coincidencia por variante/flexión, traducción alineada y similitud semántica. Las similitudes **no** se cuentan como ocurrencias ni se presentan como citas literales.
- La alineación ES–FR–EN–latín por locus es contextual y no demuestra que cada término individual sea traducción de otro.
- Para griego, indexar apariciones originales y un diccionario con procedencia verificable; nunca afirmar griego literal por hallar una forma latina.

## Recuperación híbrida
1. Índice invertido de tokens normalizados, palabras completas, variantes unicode y prefijos. Recuentos verdaderos, snippets y resaltado.
2. Índice de trigramas y distancia de edición para errores ortográficos; sugerencias visibles y confirmables, no sustitución silenciosa.
3. Embeddings multilingües *por pasaje* con un modelo documentado y versión fija, ejecutados en un proceso de generación de índice reproducible. Las consultas se codifican en el navegador usando el **mismo modelo y misma normalización**.
4. Recuperar candidatos por similitud coseno, mezclar con resultados léxicos (por ejemplo, Reciprocal Rank Fusion), y deduplicar por locus sin perder edición e idioma.
5. Exponer por resultado: tipo de coincidencia, fuente, locus, página, fragmento original, modelo y versión del índice.

## Publicación gratuita en GitHub Pages
- Generación offline de índice estático comprimido (por ejemplo, vectores cuantizados + metadatos por idioma/locus), no regenerar embeddings de miles de pasajes en cada navegador.
- Cargar el modelo de consulta bajo demanda (y comunicar claramente tamaño/descarga); si no hay recursos o falla el modelo, mantener búsqueda léxica funcional.
- Publicar checksum, fecha de indexación, conteos de pasajes y pruebas de integridad; nunca depender de una API de pago.
- Antes de adoptar modelo, probar soporte real para latín, griego clásico, español, francés e inglés; un modelo «multilingüe» no garantiza rendimiento en lenguas clásicas.

## Validación de calidad y honestidad académica
- Pruebas positivas de citas exactas, loci, flexiones y variantes; pruebas negativas de obras externas.
- Conjunto juzgado por humanos con preguntas por libro y lengua. Medir Recall@10, MRR y falsos positivos por tipo de consulta.
- Pruebas de rendimiento en navegadores reales, cache, memoria y accesibilidad; CI bloquea publicación de regresiones.
- No afirmar «IA semántica activada» mientras no existan pesos, embeddings, metadatos y pruebas de recuperación completa.
