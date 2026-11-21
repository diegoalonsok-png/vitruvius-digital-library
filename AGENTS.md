# Reglas permanentes para agentes y asistentes — Vitruvius Digital Library

> **Regla obligatoria de arquitectura de almacenamiento, establecida por el responsable del proyecto.** Leer antes de importar, descargar, indexar, publicar o fusionar obras de **Bibliotheca Graeca et Latina**.

## 1. Cloudflare R2 es el único depósito de libros

**TODOS los libros nuevos y todas sus versiones deben almacenarse en Cloudflare R2, NUNCA en GitHub**, incluidos:

- Textos completos originales en latín o griego.
- Traducciones humanas en inglés, francés y castellano, cuando existan.
- PDF, EPUB, XML/TEI, TXT, JSON extensos y demás archivos íntegros de las obras.
- Corpus completos, transcripciones y archivos de pasajes.
- Índices extensos/invertidos/semánticos derivados del contenido de los libros.
- Facsímiles y otros objetos voluminosos de Bibliotheca.

**Prohibido** añadir estos archivos a `main` o a ramas temporales de GitHub, incluso como paso de preparación. El procesamiento temporal debe realizarse fuera del repositorio y la publicación del contenido debe dirigirse a R2.

## 2. GitHub almacena exclusivamente la aplicación y referencias ligeras

En GitHub pueden quedar el código del sitio y los visores, configuración, manifiestos compactos, catálogos livianos, fichas bibliográficas, procedencia, licencias, IDs y URL de los objetos alojados en R2. No copiar textos completos ni generar grandes índices allí.

## 3. Flujo obligatorio de incorporación

1. Comprobar que la obra y cada edición/traducción NO existan ya en el catálogo completo ni en R2: comparar autor, título normalizado, ID, edición, idioma, URL y, cuando corresponda, hash. No confundir edición nueva de una obra existente con obra nueva.
2. Verificar fuente y derechos de reutilización, y registrar editor/traductor, año, idioma, atribución y enlace a la fuente original. Nunca inventar textos, traducciones ni equivalencias.
3. Priorizar el texto original griego o latino y traducciones humanas, preferentemente **inglés → francés → castellano**. Una traducción de máquina no se presenta como traducción humana.
4. Subir originales, traducciones y archivos derivados a **Cloudflare R2**. Indexar allí; conservar claves estables y enlaces entre original, traducciones y loci.
5. Actualizar en **GitHub únicamente** los metadatos y referencias ligeras necesarios para catálogo, búsquedas y visores.
6. Verificar **simetría GitHub ↔ R2**: que las referencias existan, que no haya duplicados, huérfanos ni objetos faltantes y que el inventario y los índices coincidan según su alcance.
7. Probar la obra y sus traducciones en la **Bibliotheca pública y el visor académico**, incluida la lectura enfrentada cuando haya originales y traducciones compatibles.
8. Fusionar/publicar solo después de controles satisfactorios y sin modificar otras partes del proyecto que no hayan sido solicitadas.

## 4. Restricciones de verificación y despliegue

- **No afirmar «subido», «indexado», «sincronizado» o «fusionado» sin evidencia de la operación efectuada y su comprobación.**
- Si no hay acceso autenticado de escritura a R2, detener la publicación y explicar el bloqueo. **Nunca usar GitHub como almacenamiento sustituto o temporal.**
- No sobrescribir ni borrar objetos existentes sin comprobación expresa de procedencia y correspondencia.
- No alterar diseño, componentes ni funciones ajenos al cambio solicitado.
- No usar el número de entradas del índice facsimilar R2 como si fuese necesariamente el total de obras de Bibliotheca: son inventarios con alcances distintos.

## 5. Corrección histórica pendiente

En la rama provisional `bibliotheca-staging-aelian-20261121` se prepararon archivos grandes de *Claudio Eliano, Varia historia* antes de establecerse esta norma. **No fusionar esa rama**. Migrar su contenido a R2 únicamente cuando haya acceso de escritura y se complete la verificación; después, retirar los archivos voluminosos de la rama sin afectar a `main`. No confundir esta excepción histórica con autorización para repetir el procedimiento.

**Esta norma prevalece en todos los trabajos futuros de incorporación de libros a Bibliotheca.**
