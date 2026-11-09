// Validación estática, no destructiva, del centro de control académico.
// No toca textos madre, traducciones ni archivos de manuscritos.
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("centro-control-academico.html","utf8");
const js=fs.readFileSync("assets/centro-control-academico.js","utf8");
const css=fs.readFileSync("assets/centro-control-academico.css","utf8");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"ID HTML duplicado");
for(const [,id]of js.matchAll(/\$\("#([a-z0-9-]+)"\)/g))assert(ids.includes(id),"Falta elemento #"+id);
for(const name of ["data/classics-corpus/coverage-audit.json","data/classics-corpus/search-registry.json","data/classics-corpus/pdf-inventory.json","data/bibliotheca-testimonia-verified.json","data/classics-alignment/manifest.json"]){assert(fs.existsSync(name),"Falta inventario "+name)}
assert(html.includes('assets/centro-control-academico.js?v=1'),"Falta conexión al JS");
assert(html.includes('assets/centro-control-academico.css?v=1'),"Falta conexión al CSS");
assert(!/\/(?:delete|remove|overwrite|replace)-?(?:master|original|folios)/i.test(js),"Posible operación destructiva");
assert(css.length>100&&js.length>2000,"Recursos no preparados");
console.log("PASS: panel separado, referencias y controles estructuralmente presentes; no certifica navegador ni calidad filológica.");