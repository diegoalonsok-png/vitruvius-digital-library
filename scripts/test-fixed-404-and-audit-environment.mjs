#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=p=>readFileSync(p,"utf8");
for(const p of ["assets/iconografia-vitruviana.js","assets/gudiani-reader.mjs","scripts/test-vitruvia-cultural-works.mjs"]){
 new Script(read(p),{filename:p});
}
const barbaro=read("assets/barbaro-parallel.mjs");
assert.match(barbaro,/if\(c\.image_url\)result\.push\(c\.image_url\)/);
assert.match(barbaro,/!\/\^images\\\/barbaro-1567\\\/\//);
const atlas=read("assets/iconografia-vitruviana.js");
const data=JSON.parse(read("data/iconografia-vitruviana.json"));
const failures=[
"images/retratos/marcus-vitruvius-roman-leipzig-55-45.jpg",
"images/hombre-vitruvio/cesariano-1521-homo-ad-circulum-50r.jpg",
"images/hombre-vitruvio/duerer-proporciones-hombre-1528.jpg",
"images/hombre-vitruvio/goujon-martin-1547-p28.jpg",
"images/hombre-vitruvio/goujon-martin-1547-p28v.jpg"
];
for(const path of failures){
 assert(atlas.includes(path),"Ruta no protegida: "+path);
 const record=data.primaryRecords.find(x=>x.localImage===path);
 assert(record&&record.image?.startsWith("https://"),"La reproducción institucional falta: "+path);
}
assert.match(read("assets/gudiani-reader.mjs"),/const pdfHosted=false/);
assert.match(read(".github/workflows/site-regression-total.yml"),/Instalar dependencias para pruebas que importan Playwright[\s\S]*?npm install --no-save playwright@1\.56\.1[\s\S]*?Integridad, navegación/);
console.log("PASS: links to real institutional images preferred, absent PDFs not requested, browser tests have dependency.");
