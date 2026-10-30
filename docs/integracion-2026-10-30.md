# Integración editorial y técnica — 30 de octubre de 2026

Documento de continuidad para las sesiones de revisión del proyecto. Preservar sin modificaciones la estética de la portada, tipografía, colores, distribución y menús, salvo incorporar enlaces funcionales.

## Incorporado en la rama principal

- Buscador por palabra/frase y locus a partir de los índices estructurados de V514 (ES), V554 (FR) y V297 (EN).
- Resaltado amarillo de términos en los resultados; coincidencias y recuentos diferenciados.
- Opción de búsqueda de términos relacionados local, con correspondencias latinas, griegas selectivas y traducciones. **No** equivale aún a embeddings neuronales de corpus completo.
- Página /aparato-critico.html, vinculada desde portada, lector, bibliografía, estudios y principios editoriales.
- Consulta en esta página de loci de las tres ediciones estructuradas; Krohn 1912 como OCR histórico sin transcripción diplomática validada. Budé se presenta como referencia bibliográfica y no como texto íntegro redistribuido.

## Pendientes que no deben anunciarse como completados

1. Indexar el **aparato crítico y notas del autor**: extraer de DOCX completos la nota literal, locus, texto latino relacionado, tipos de anotación (variante, conjetura, explicación, remisión), siglas y fuentes, sin inventar atribuciones. Considerar las notas críticas preparadas en trabajos previos y cotejarlas con V514/V554/V297 actuales.
2. Verificar la existencia y procedencia de **V424 / V464**; no marcarlas indexadas sin documentos y estructuras completos. Identificar los archivos originales y generar índices de pasajes con referencias.
3. **IA semántica real gratuita**, opcional en navegador: revisar PR #4 y su pipeline de embeddings multilingües E5 antes de integrar, evaluar peso del modelo y precisión con las consultas de referencia. No fusionar sin pruebas.
4. Revisión de **PR #6** (aparato de V514), #5 (ficha editorial), #3 (historia y bibliografía) frente a cambios posteriores a su creación.
5. **Saltos del visor PDF**: abrir página correspondiente cuando la correspondencia sea comprobada, sin confundir página de PDF, página impresa y locus; habilitar zoom y pantalla completa.
6. Validar los botones de portada y lectores: Leer, PDF, Leer el pasaje, Comparar, imprimir/guardar PDF, CSV, preparar correo, consulta externa y ejemplos latinos.
7. Índices especializados: locorum latinos y griegos, personas, lugares, términos arquitectónicos y matemática del tratado.
8. Citas académicas completas (autor, edición, título, ISBN solo si está atestiguado, Chicago 18), aparato editorial para supresiones/corchetes en I.1.1, trazabilidad de las fuentes manuscritas.
9. Auditoría de navegaciones, enlaces internos, errores JavaScript, accesibilidad y pruebas de búsqueda real en el navegador publicado.

## Matriz mínima de pruebas funcionales

| Consulta | Resultado esperado |
| --- | --- |
| `symmetria`, `architectura`, `machina`, `dispositio` | Coincidencias reales y resaltadas en amarillo; cero resultados cuando proceda |
| `arch` | Respuesta útil de raíz/forma, sin falsificar un match exacto |
| `I.1.1`, `III.1.2`, `VIII.1` | Navegación por libro, capítulo y locus, referencia correcta |
| `architecti est scientia` | Frase latina literal y concordancia fiel |
| `cielo` | Recuperación de equivalencias como `caelum` cuando estén documentadas; indicar relación semántica |
| `proporciones de los templos` | Resultados de concepto, distinguidos de citas exactas |
| `συμμετρία` | Correspondencia griego-latín documentada |
| Consultas sin resultado | Aviso explícito, sin pantalla en blanco |
| Ediciones individuales y global | Solo contar/indexar las ediciones realmente disponibles |
| Krohn 1912 | OCR identificado y enlace a facsímil; no atribuir loci no verificados |

**Regla de integridad editorial:** diferenciar siempre texto literal, traducción, OCR, comentario, nota crítica verificada y recuperación por afinidad. Ninguna conjetura o lectura debe aparecer como testimonio de un códice sin prueba documental.
