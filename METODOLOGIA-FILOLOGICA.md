# Metodología y procedencia de los instrumentos filológicos

## Estado y ámbito (14 de noviembre de 2026)

Los textos publicados V514 (español), V554 (francés) y V297 (inglés) se tratan como ediciones académicas de Diego Kurilo. Las erratas puntuales se registran por versión, página o locus, y motivo documental en `data/errata-editionum.json`. No son calificaciones genéricas sobre el valor de la obra.

## Fuentes y cadena documental

- Registro bibliográfico y citas: `data/catalog.json`. Las versiones comparten el ISBN editorial declarado 978-631-01-6651-3 y conservan DOI particulares. Para citar se utiliza Chicago Manual of Style 18 (notas y bibliografía).
- Pasajes: `data/structured/recensio-es.json`, `recensio-fr.json` y `theory-en.json`. Los registros incorporan procedencia de DOCX, lugar canónico y textos editados. Los archivos fuente no se sobreescriben en la interfaz.
- Notas autorales: `data/critical-notes.json`. Una nota sin locus explícito no recibe una atribución definitiva por coincidencia automática; `candidate_locus` es una hipótesis de alineación.
- Comentarios: `data/commentary/v514-libro-*.json` y `v554-libro-*.json`, reconstruidos desde los originales. La extracción por páginas del estudio preliminar es instrumental y necesita cotejo editorial ante cortes de OCR o líneas compuestas.
- Testimonios: `data/apparatus/aparato-comparativo.json`, `data/ecdotic-decisions.json` y `data/commentary/codex-h-illustrations.json`. Diferenciar lección de un manuscrito, lectura de edición impresa, OCR histórico y propuesta del editor.
- Facsímil institucional H: British Library, Harley MS 2767; ficha https://searcharchives.bl.uk/catalog/040-002048598 ; manifiesto IIIF https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001 . El enlace institucional no implica que se hayan verificado todos los canvas o que el repositorio posea derechos propios de las imágenes.

## Identificadores, interoperabilidad y exportación

- El lector `lector-bilingue.html` genera TEI XML P5 de un locus seleccionado y expone una referencia canónica CTS (Perseus para el texto latino donde corresponde).
- `corpus-tei.html` genera TEI P5 por libro completo y versión (V514/V554/V297), a demanda y a partir de `data/structured/`. Incluye encabezamiento de edición, DOI, ISBN, archivo fuente y loci. La descarga dinámica no equivale todavía a alojamiento de XML estáticos validados contra Relax NG.
- `assets/philological-core.mjs` genera URN **locales VDL** para las recensiones de Kurilo (`urn:cts:latinLit:phi1056.phi001.vdl-v514:<locus>` y equivalentes). Estos identificadores NO constituyen inscripción en un registro CTS externo.
- `quaestio-philologica.html` integra búsqueda literal en texto latino y traducciones, con exportaciones bibliográficas Chicago 18, RIS y BibTeX. La búsqueda de expresiones no ofrece lematización morfológica experta y no debe describirse como tal.
- `quaestio-philologica.html` enlaza la misma consulta a `indice-commentariorum.html`, `vitruvia-lexicon.html` (forma y lema) y `bibliotheca-graeca-latina.html`; esos índices no están incorporados en el mismo conteo de resultados y no se presentan como un único motor morfológico.
- `vitruvia-lexicon.html` mantiene los recursos lexicográficos del sitio; conviene vincular resultados a lemas documentados antes de atribuir información morfosintáctica verificada.
- `bibliotheca-graeca-latina.html` proporciona consulta de otros autores, con derechos y coberturas propios de cada fuente.
- Fuentes gráficas: `concordantia-harleiana.html` enlaza los doce recortes citados por V514 al manifiesto global H. La determinación de cada canvas sigue pendiente, sin enlaces fabricados.

## Control y pruebas

`scripts/test-philological-integrity.mjs` comprueba en cada ejecución de GitHub Actions:
- tres registros editoriales y DOI/ISBN;
- integridad mínima de las tres estructuras por loci;
- cita bibliográfica y formatos RIS/BibTeX;
- 811 notas esperadas en el conjunto fuente;
- inventario de doce recortes del manuscrito H;
- presencia del registro de erratas y de los archivos de interfaz.

El proceso no es una colación paleográfica ni verifica automáticamente la exactitud de cada lectura. Las pruebas de interfaz y enlaces se realizan adicionalmente en `.github/workflows/site-audit.yml`. Cada repositorio o fuente digital debe llevar identificación de procedencia y condiciones de derechos. No reutilizar imágenes/manuscritos sin atender a la institución conservadora y sus licencias.
