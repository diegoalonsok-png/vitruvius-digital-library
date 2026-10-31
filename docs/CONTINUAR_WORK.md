# Estado de continuación · 30 de octubre de 2026

Se preserva la estética Yale original. El usuario autorizó mejorar toda la plataforma y prioriza búsqueda semántica real, corpus completo y búsqueda en PDF.

## Implementado en esta rama

- Motor literal compartido: frases y recuentos exactos excluyen fragmentos aproximados; normalización de griego, ligaduras y palabras partidas.
- 19.394 unidades de los DOCX completos V514/V554/V297, incluidas tablas y 811 notas.
- Filtros por contenido, idioma, libro, capítulo y rango de loci; OCR histórico opcional separado.
- Lector de texto completo; PDF.js 6.4.299 con los tres PDF originales, búsqueda, resaltado y salto por locus.
- 30 páginas bilingües estáticas, catálogo sin JavaScript, 731 loci completos.
- Exportación de referencias Chicago/APA/MLA/BibTeX/RIS y consulta externa Crossref.
- Navegación multilingüe ampliada; estados de cobertura y manifiesto versionado.

## Antes de publicar en main

1. Ejecutar y verificar la matriz E5 y las pruebas temáticas. La generación segura usa scripts/build-embeddings.py con PyTorch y archivos locales; no usar el runtime ONNX nativo bloqueado por telemetría. El runtime del navegador sigue siendo WASM q8.
2. Actualizar scripts/test-semantic-index.py al esquema 2 (unit_id y corpus completo; los loci pueden ser null).
3. Reejecutar scripts/build-publication.py para marcar E5 publicado únicamente cuando existan índice y matriz válidos; después de cualquier cambio al corpus se deben regenerar sus embeddings.
4. Verificar en navegador: proslambanómenos, hermenéutica (comentarios), frase inexistente en modo exacto, filtros VIII–X, PDF p.527 con resaltado, comparación de traducciones, exportaciones y búsqueda E5.
5. Ejecutar scripts/audit_site.py, scripts/test-editorial.py y las pruebas JS. Actualizar el caché de módulos antes de desplegar.
6. Recalcular data/releases/2026-10-30.2.json. La página de auditoría conserva un balance histórico y debe incluir la actualización reproducible generada.

## Datos que NO deben inventarse

No asignar ISBN inglés, DOI, ORCID, siglas de testigos ni asociaciones de notas no verificadas. No llamar cotejo filológico a una correspondencia automatizada.

## Entorno de esta sesión

Checkout: /workspace/scratch/3af14512fcc6/vitruvius-digital-library
Fuentes autorizadas: /workspace/scratch/449a76356e48/sources
Modelo PyTorch local: /workspace/scratch/3af14512fcc6/e5-torch-model
PYTHONPATH: /workspace/scratch/3af14512fcc6/torch-runtime:/workspace/scratch/3af14512fcc6/transformer-runtime
HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 DO_NOT_TRACK=1
Comando: python scripts/build-embeddings.py /workspace/scratch/3af14512fcc6/e5-torch-model --threads 6
Vista local gestionada: http://terminal.local:4173/ (dist debe sincronizarse con los archivos actualizados).

La rama protege el trabajo antes del despliegue; su presencia no implica que toda la verificación funcional esté terminada.
