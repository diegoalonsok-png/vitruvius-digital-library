# Norma de codificación académica interoperable — Vitruvia Bibliotheca
**Versión: 14 de noviembre de 2026.** Política editorial de preservación: ninguna corrección elimina folios, códices, PDF, DOCX, fuentes TEI o archivos de R2. La identidad de una obra no se confunde con la identidad de sus ediciones, traducciones, manuscritos ni facsímiles.

## Autoridades y unidades distintas
| Unidad | Identificación estable | Fuente probatoria |
| --- | --- | --- |
| Autor/persona | VIAF, ISNI, BnF o autoridad LC cuando esté efectivamente registrada | catálogo de autoridad con URL |
| Obra intelectual | ID interno inmutable; CTS URN *work* cuando esté atestiguado; eventualmente TLG/PHI/CPG/CPL | catálogo CTS o repertorio disciplinar |
| Edición griega/latina | CTS URN *version* únicamente si la edición la tiene | registro de edición, TEI header, portada |
| Traducción | identificador de versión distinta, lengua destino y traductor | bibliografía y paratextos propios de la traducción |
| Testimonio manuscrito físico | ciudad, institución, fondo, signatura vigente | institución custodia, no simple fuente comercial |
| Manuscrito griego | número Diktyon **solo si** aparece en Pinakes | IRHT / Pinakes (CNRS) |
| Recurso BnF | ARK real proporcionado por BnF | Archives et Manuscrits / Gallica |
| Facsímil | URL de visor y URI de *IIIF Manifest* real | custodio de los objetos, derechos |
| Imagen de folio | URI de *IIIF Canvas* existente + foliación acreditada | IIIF Presentation, catálogo del códice |
| Pasaje de texto | locus canónico más edición precisa, CTS passage URN cuando corresponda | edición que establece el locus |
| Archivo R2 | clave del objeto + SHA-256 + comprobación de existencia | inventario de objetos, sin imputarlo al manuscrito físico |
| Publicación con DOI | DOI de esa **publicación** solamente | agencia registradora / landing page |

## Formato mínimo de cada ficha de obra
1. Identificador local; autor normalizado y aliases; título original y títulos comunes; lengua, cronología, género.
2. Descripción filológica: naturaleza del testimonio, autoría atribuida o disputada, alcance real, división canónica, tradiciones textuales, recensiones y bibliografía pertinente.
3. Una ficha independiente **por versión editorial**: editor crítico, traductor (si corresponde), fecha, editorial, lugar, tomo, paginación del impreso, imágenes digitalizadas, licencia, fuente digital y, de existir, CTS de edición verificado.
4. Por cada manuscrito identificado: **msIdentifier, msContents, physDesc, history, additional** (TEI P5), signatura actual, datación con fuente, soporte, manos, foliación, tradición, proveniencia y enlaces institucionales.
5. Relación locus↔folio únicamente cuando un cotejo o un catálogo dé fundamento explícito. Nunca inferirla a partir del número ordinal de imagen.
6. Citas independientes para obra, edición, folio, pasaje y ficha digital; DOI del proyecto separado de DOI de edición.

## Sintaxis
Una CTS URN, cuando existe en la fuente, se conserva **sin regenerarla ni corregirla adivinando**:
`urn:cts:greekLit:tlg0012.tlg002.perseus-grc2:1.1` es un **ejemplo de estructura**, no una declaración de que esa edición esté alojada en Bibliotheca.
Los campos están separados: espacio de nombres; grupo textual; obra; versión; referencia de pasaje.
Una signatura como `Plut. 32.24` y un Diktyon no se convierten en URN CTS; una versión editorial no se convierte en códice.

## Almacenamiento JSON recomendado
```json
{
  "workId": "homer-odyssey",
  "workAuthority": {"localId": "homer-odyssey", "ctsWorkUrn": null, "ctsEvidence": null},
  "version": {
    "language": "grc",
    "role": "original_language_edition",
    "editor": null,
    "translator": null,
    "ctsVersionUrn": null,
    "citation": null,
    "sourceUrl": null
  },
  "witness": {
    "shelfmark": "Plut. 32.24",
    "repository": "Biblioteca Medicea Laurenziana",
    "catalogueUrl": "https://tecabml.contentdm.oclc.org/digital/collection/plutei/id/735325",
    "manifestUrl": "https://cdm21059.contentdm.oclc.org/iiif/plutei:735325/manifest.json",
    "ctsVersionUrn": null
  },
  "audit": {"status": "partial", "missing": ["edition_editor", "cts_version"], "lastReviewed": "2026-11-14"}
}
```
Los `null` son declaraciones honestas de ausencia de **metadatos documentados**; no se rellenan por conjetura.

## Normas consultadas
- TEI P5 — Manuscript Description: https://tei-c.org/release/doc/tei-p5-doc/en/html/MS.html
- TEI P5 — msDesc: https://www.tei-c.org/Vault/P5/current/doc/tei-p5-doc/en/html/ref-msDesc.html
- IIIF Presentation API 3.0: https://iiif.io/api/presentation/3.0/
- CTS URN Specification: https://cite-architecture.github.io/ctsurn_spec/
- Pinakes / IRHT: https://pinakes.irht.cnrs.fr/
- Biblioteca Apostolica Vaticana: https://digi.vatlib.it/
- BnF / Gallica: https://gallica.bnf.fr/
- Biblioteca digital Heidelberg: https://digi.ub.uni-heidelberg.de/
- DataCite DOI: https://datacite.org/

**Control editorial:** esta norma documenta cómo registrar identificadores sin atribuir a ninguna institución una afiliación o aval al proyecto. No implica que todos los campos existentes estén ya revisados.
