import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const reader=readFileSync("buscador-facsimiles-clasicos.html","utf8");
for(const marker of ["Descargar PDF libre","Descargar texto OCR (JSON)","libre&&permitido(f.pdf)","libre&&permitido(f.texto)"])
 assert.ok(reader.includes(marker),"Missing rights-guarded download: "+marker);
const catalogue=JSON.parse(readFileSync("data/r2/catalogo-clasicos-r2.json","utf8"));
for(const edition of catalogue.items||[]){
 assert.ok(edition.derechos,"Missing declared rights on "+edition.id);
 assert.match(edition.pdf||"",/^https:\/\/libros\.vitruvius-digital-library\.org\/clasicos\/pdf\//);
 assert.match(edition.texto||"",/^https:\/\/libros\.vitruvius-digital-library\.org\/clasicos\/texto\//);
}
new vm.Script(reader.match(/<script>([\s\S]*?)<\/script>/)?.[1]||"",{filename:"facsimile-inline.js"});
console.log("PASS: public-domain PDF/OCR links guarded by edition rights and approved R2 URLs");
