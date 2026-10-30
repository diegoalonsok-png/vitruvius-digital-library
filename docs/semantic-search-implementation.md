# Búsqueda semántica gratuita — prototipo de rama
No modificar ni sustituir el buscador literal. Esta implementación añade un control opt-in al formulario existente.

## Preparar corpus
1. Crear entorno Python e instalar `sentence-transformers` y `numpy`.
2. Ejecutar `python scripts/build-embeddings.py` desde la raíz del repositorio.
3. Verificar que se generen `data/embeddings-e5-small-int8.bin` y `data/embeddings-e5-small-index.json`.
4. Confirmar que la matriz tenga exactamente `rows.length × dimensions` bytes; revisar cobertura del corpus y tamaño de archivos antes de publicar.

## Modelo
Los vectores se construyen con `intfloat/multilingual-e5-small`, entrada `passage: `, pooling medio y normalización L2. En el navegador se utiliza la versión ONNX `Xenova/multilingual-e5-small`, entrada `query: `, para comparar por similitud coseno aproximada. Transformers.js se importa únicamente tras activar el control.

## Criterios de aceptación para la integración
- Ejecutar regresiones de búsqueda literal con palabra, frase y locus antes y después de integrar.
- Probar `liver iv` **en el motor literal**, no esperar que un modelo semántico interprete una referencia bibliográfica.
- Probar conceptos `proporción del templo`, `cómo se templa la cal`, `temple proportions` y evaluar manualmente pertinencia.
- Probar en navegador real frío y con caché; verificar tamaño/descarga del modelo, errores offline y compatibilidad móvil.
- No atribuir como cita verificada un resultado semántico, ni asegurar cobertura de pasajes omitidos del índice.
- El corpus procede solo de los JSON estructurados: los encabezados/editoriales fuera de esos JSON no están cubiertos.
- No fusionar hasta disponer de binarios generados y de un informe de resultados.

## Limitaciones
Esta rama incluye código de preparación y búsqueda, pero **no incluye todavía los vectores entrenados/calculados**, y por ello no está preparada para fusionarse a producción.

## Generación desde GitHub Actions
La rama incluye `.github/workflows/build-semantic-embeddings.yml`, que se ejecuta **solo manualmente** (`workflow_dispatch`). Descarga dependencias, genera la matriz, valida dimensiones y cobertura, y confirma los archivos únicamente en la rama de la funcionalidad. No modifica `main`.

## Regresiones literales
Ejecutar `node scripts/test-search-regression.mjs` para comprobar referencias alternativas y ejemplos literales. Además es obligatorio pasar un conjunto de pruebas contra **todas** las citas extraídas del corpus completo y verificar el navegador publicado antes de aprobar el PR.
