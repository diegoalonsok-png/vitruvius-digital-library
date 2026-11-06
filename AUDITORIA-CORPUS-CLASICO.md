# Auditoría académica del corpus grecolatino

**Fecha de revisión:** 5 de noviembre de 2026  
**Alcance:** archivos del repositorio `diegoalonsok-png/vitruvius-digital-library`, catálogo `data/bibliotheca-graeca-latina-I-bce-I-ce.json`, registro de textos `data/classics-corpus/search-registry.json` y testimonios conservados.  
**Criterio:** una ficha catalográfica, una transcripción, una traducción, un PDF y un manuscrito son objetos bibliográficos diferentes. No se atribuye autorización, cotejo ni aval institucional por tener un enlace.

## 1. Resultado cuantitativo

| Categoría catalográfica | Registros |
|---|---:|
| Lectura local declarada completa | 19 |
| Lectura local declarada parcial | 1 |
| Fuente externa identificada | 22 |
| Repertoriado para búsqueda externa | 134 |
| Pendiente de incorporación | 45 |
| **Total catalogado** | **221** |

Se registran **121 etiquetas de autor** distintas (no es una autoridad prosopográfica normalizada), **23 testimonios** en `data/bibliotheca-testimonia-verified.json` y **19 fichas de manuscritos** en el inventario de expansión; son conjuntos relacionados que **no deben sumarse** como si fueran testimonios únicos.

Los archivos legibles que quedaron incorporados al buscador especializado de contenido comprenden **20 versiones textuales de 14 obras**, en latín (8), griego (6), inglés (4) y castellano (2): **14 archivos JSON con pasajes** y **6 archivos HTML**. El catálogo de obras y los textos indexados son capas distintas.

En `documents/classics/` existen **10 PDF clásicos históricos**. Su presencia se ha verificado por rutas de repositorio y en el conjunto de pruebas de visores, pero **no se certifica que sus páginas dispongan de una capa OCR indexable o revisada**. Las transcripciones de otras ediciones no deben confundirse automáticamente con el contenido exacto del PDF.

El núcleo de Vitruvio, separado del pequeño buscador de clásicos, contiene **10 archivos de índices por página** en `data/text/` y **tres ediciones estructuradas por loci** en `data/structured/manifest.json`. Las lecturas de OCR y las alineaciones deben cotejarse; tener datos extraídos no equivale a edición crítica certificada.

## 2. Textos incluidos en la búsqueda de contenido

| Obra | Versiones buscables alojadas |
|---|---|
| Apuleyo, *Metamorphoses* | latín, inglés, castellano |
| Aristóteles, *Poética* | griego |
| Catulo, *Carmina* | latín; 113 poemas según el índice específico |
| Cicerón, *De officiis* | latín, inglés |
| Epicteto, *Enchiridion* | griego |
| Homero, *Ilíada* | griego |
| Homero, *Odisea* | griego |
| Julio César, *De bello Gallico* | latín |
| Lucrecio, *De rerum natura* | latín, inglés, castellano |
| Petronio, *Satyrica* | latín, inglés |
| Platón, *Apología* | griego |
| Teofrasto, *Caracteres* | griego |
| Virgilio, *Eneida* | latín |
| Virgilio, *Geórgicas* | latín |

Los índices indican **idioma, procedencia del archivo y locus/bloque recuperado**. Una traducción histórica almacenada no está alineada automáticamente por folios, libros o párrafos con el original. La versión paralela HTML de Cicerón sigue disponible como lector, pero no se duplica en la búsqueda literal porque el latín y el inglés ya se indexan por separado.

## 3. Fallos corregidos

- El buscador de clásicos usaba una lista fija de 14 obras y no recorría versiones en inglés o castellano. Ahora obtiene una lista comprobable de 20 versiones desde `data/classics-corpus/search-registry.json`.
- Algunas transcripciones poéticas HTML quedaban fuera por utilizar `<pre>` o `<section><p class="poem">` en lugar de `main p`. Se amplió la detección sin indexar automáticamente el aparato crítico como texto antiguo.
- Los resultados ahora abren el lector y el idioma correspondientes, sin redirigir todas las traducciones al lector latino por defecto.
- Se advierte cuando no pudo cargarse alguna fuente, en lugar de presentar una búsqueda incompleta como una ausencia textual definitiva.
- Se renovaron las versiones de recursos JavaScript para evitar que un navegador conserve el índice antiguo.
- Se añadió `scripts/audit-classical-corpus.mjs` a la validación y una comprobación Playwright de Catulo, Lucrecio y una traducción inglesa de Apuleyo.

**Evidencia:** [ejecución de visores y búsqueda aprobada](https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/runs/42137049222). La aprobación es funcional, no un cotejo filológico.

## 4. Ausencias y prioridades académicas

No existe un universo cerrado de «todos los clásicos»: hay obras perdidas, fragmentarias, de atribución dudosa, ediciones con distintos títulos y catálogos que siguen incorporando testigos. Por tanto **no se puede afirmar que no falte ningún autor o texto de la tradición grecolatina**.

En el catálogo consultado **no aparecen fichas** para Safo/Sappho, Menandro, Calímaco o Teócrito. Se recomienda abrir fichas cuidadosamente atribuidas y de cobertura parcial o fragmentaria cuando corresponda, usando ediciones y catálogos identificados; **no inventar textos completos ni facsímiles**.

Entre las obras **ya catalogadas sin lectura local completa declarada** que merecen prioridad para incorporación o enlace directo a una edición concreta se encuentran: la *Teogonía* de Hesíodo, *Edipo rey* de Sófocles, *Medea* de Eurípides, la *Orestíada* de Esquilo, la *Historia de la guerra del Peloponeso* de Tucídides, la *Política* de Aristóteles, la *Historia natural* de Plinio, las *Meditaciones* de Marco Aurelio y la *Geografía* de Estrabón.

Para cada incorporación debe constar: autor o atribución tradicional, título canónico y variantes, lengua, cronología de composición diferenciada de datación manuscrita, editor/recensor/traductor, edición concreta, licencia, cobertura real, URL estable, división textual y estado de transcripción/OCR.

## 5. Qué permanece sin verificar

1. **Lectura completa de los 221 registros:** no puede inferirse de la existencia de su ficha; solo hay 20 registros con lectura local declarada.
2. **PDF y OCR:** cada PDF requiere un diagnóstico individual de capa textual, páginas vacías, errores en griego, latín, abreviaturas y correspondencia entre número digital/impreso/folio. La prueba de existencia no es una prueba de OCR.
3. **Referencias externas:** se requiere confirmar redirecciones, derechos, acceso IIIF, ubicación y signatura vigentes en las bibliotecas custodias. El examen local de enlaces relativos no demuestra validez externa.
4. **Completitud de las traducciones:** se debe cotejar cada versión, cobertura y referencia a la edición de origen, especialmente donde existen materiales históricos abreviados o adaptados.
5. **Calidad del OCR histórico de Vitruvio:** hay ruido de reconocimiento visible en algunas páginas de las extracciones de ediciones antiguas; las búsquedas son orientativas, no una lectura diplomática.
6. **Ingesta automatizada de nuevas cargas:** `data/text-ingestion.json` configura la incorporación externa TEI, pero `localFiles` estaba vacío en esta auditoría. La búsqueda clásica cubre los archivos enumerados en el registro, no todos los documentos futuros de forma automática.
7. **Estado del despliegue público:** GitHub Actions validó la versión de prueba; se requiere comprobar los enlaces publicados tras el despliegue. La herramienta externa de consulta web no pudo abrir GitHub Pages desde esta sesión.

## 6. Controles y archivos verificables

- [Inventario por obra, JSON](data/classics-corpus/coverage-audit.json).
- [Registro de variantes indexadas, JSON](data/classics-corpus/search-registry.json).
- [Página de auditoría pública](auditoria-textos-clasicos.html).
- [Prueba reproducible](scripts/audit-classical-corpus.mjs).
- [Biblioteca de autores y obras](bibliotheca-graeca-latina.html).
- [Index codicum](index-codicum.html).

**Regla de publicación:** conservar siempre un estado de evidencia explícito; un título localizado no se presenta como leído, una traducción sin referencia no se presenta como cotejada y un PDF sin texto verificado no se presenta como indexado.
