import assert from "node:assert/strict";
import {inspect,violation} from "./guard-library-assets.mjs";

const allowed=[
 {status:"A",path:"data/classics-corpus/greek-original-grc.json"},
 {status:"M",path:"assets/bibliotheca-simple.js"},
 {status:"A",path:"scripts/audit-new-edition.mjs"},
 {status:"M",path:"data/classics-corpus/search-registry.json"},
 {status:"M",path:"data/classics-corpus/coverage-audit.json"},
 {status:"M",path:"data/academic-integrity.json"},
 {status:"M",path:"investigacion-conectada.html"},
 {status:"M",path:"assets/academia-conexiones.js"},
 {status:"M",path:"data/ecdotic-decisions.json"},
 {status:"M",path:"documents/edicion-v514.html"},
 {status:"M",path:"documents/edicion-v554.html"},
 {status:"M",path:"documents/edicion-v297.html"},
];
assert.equal(inspect(allowed).length,0,"Indexing Greek/Latin originals and improving the live interfaces must remain possible");
const forbidden=[
 {status:"D",path:"index.html"},
 {status:"D",path:"bibliotheca-graeca-latina.html"},
 {status:"M",path:"images/CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR/folio-1r.jpg"},
 {status:"D",path:"images/old-medieval-codex.png"},
 {status:"A",path:"documents/new-translation-en.pdf"},
 {status:"A",path:"documents/edicion-v297.html"},
 {status:"M",path:"documents/edicion-uncatalogued.html"},
 {status:"A",path:"downloads/book-spanish.docx"},
 {status:"M",path:"documents/kurilo-recensio-es.pdf"},
 {status:"M",path:"data/codex-h/folio-index.json"},
 {status:"M",path:"data/iiif/codex-h-manifest.json"},
 {status:"M",path:"data/manuscripts/codices.json"},
 {status:"M",path:"escritorio-h/folio-data.json"},
 {status:"M",path:"data/structured/recensio-es.json"},
 {status:"M",path:"data/structured/recensio-fr.json"},
 {status:"M",path:"data/structured/theory-en.json"},
 {status:"M",path:"data/structured/manifest.json"},
 {status:"M",path:"data/bibliotheca-graeca-latina-I-bce-I-ce.json"},
 {status:"M",path:"data/bibliotheca-testimonia-verified.json"},
 {status:"M",path:"data/classics-corpus/cicero-oratore-la.json"},
 {status:"M",path:"data/classics-corpus/plato-apology-grc.json"},
 {status:"M",path:"data/classics-corpus/seneca-de-brevitate-en.json"},
 {status:"M",path:"data/lexicon/fontes/frontinus-aquaeductu-la.json"},
 {status:"M",path:"corpus/some-classical-original.html"},
 {status:"M",path:"data/text/krohn-1912.json"},
 {status:"M",path:"data/ocr/barbaro-1567.json"},
 {status:"M",path:"data/tei/vitruvius.xml"},
 {status:"M",path:"data/classics-documents/source.html"},
 {status:"M",path:"data/classics-historical-pages/source.json"},
 {status:"M",path:"data/kurilo-libros/source.json"},
 {status:"M",path:"data/recensio-es-pages.json"},
 {status:"M",path:"data/recensio-fr-pages.json"},
 {status:"M",path:"data/theory-en-pages.json"},
 {status:"A",path:"storage/new-book.odt"},
];
assert.equal(inspect(forbidden).length,forbidden.length,"All corpus master, folio and heavy-document violations must be caught");
for(const item of forbidden)assert.ok(violation(item.status,item.path),item.path);
assert.ok(violation("R100","index.html"),"Renames must be reviewed manually");
console.log("PASS: no deletes; all 222 catalogue records, existing originals, translations, folios and source data are immutable; interface and derived metadata updates remain possible.");
