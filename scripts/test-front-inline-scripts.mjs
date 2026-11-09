import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("index.html","utf8");
const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert(tags.length>10,"No se encontraron los scripts de la portada");
let checked=0;
for(const [i,tag] of tags.entries()){
  const attrs=tag[1];
  const body=tag[2];
  if(/type\s*=\s*["']application\/ld\+json["']/i.test(attrs))continue;
  if(/\bsrc\s*=/.test(attrs))continue;
  if(!body.trim())continue;
  assert(!/<script\b/i.test(body),"Etiqueta de script anidada en inline JS: "+i);
  new vm.Script(body,{filename:"index.html inline #"+i});
  checked++;
}
assert(checked>0,"No se verificó ningún inline JS");
assert.equal(html.split('src="assets/classics-audited-coverage.js?v=').length-1,1,
  "La auditoría debe cargarse exactamente una vez, fuera de la plantilla de impresión");
console.log("PASS portada: "+checked+" scripts inline y etiqueta de contadores no anidada");

const lexical=readFileSync("assets/inline-lexical-card.js","utf8");
new vm.Script(lexical,{filename:"assets/inline-lexical-card.js"});
assert(html.includes("assets/inline-lexical-card.js"),"La portada debe cargar la ficha contextual");
assert(lexical.includes('event.target.closest?.("#search-results mark.search-hit")'),
 "Las palabras resaltadas deben abrir una ficha por clic");
const match=lexical.match(/if\(!((?:\/\^\[[^\n]+?\$\/u))\.test\(term\)\)return;/);
assert(match,"Falta validación Unicode de vocablos clicables");
const accept=new Function("term","return "+match[1]+".test(term)");
for(const word of ["domus","loci","campus","λόγος","οἶκος","τέχνη"]){
 assert(accept(word),"La ficha debe aceptar el vocablo "+word);
}
assert(!accept("1234"),"La ficha no debe tratar números como lemas");
console.log("PASS fichas: clic en resaltado y vocablos latinos/griegos válidos");
