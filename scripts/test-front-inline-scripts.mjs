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
assert.equal((html.match(/src="assets\\/classics-audited-coverage\\.js\\?v=[^"]+"/g)||[]).length,1,
  "La auditoría debe cargarse exactamente una vez, fuera de la plantilla de impresión");
console.log("PASS portada: "+checked+" scripts inline y etiqueta de contadores no anidada");
