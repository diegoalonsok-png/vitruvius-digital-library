#!/usr/bin/env node
/**
 * Non-destructive guard for missing local bibliography facsimiles.
 * Does not validate the image content nor availability of institutional servers.
 */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(p,"utf8");
const atlas=JSON.parse(read("data/iconografia-vitruviana.json"));
const icon=read("assets/iconografia-vitruviana.js");
const parallel=read("assets/barbaro-parallel.mjs");
const gud=read("assets/gudiani-reader.mjs");
const culturalTest=read("scripts/test-vitruvia-cultural-works.mjs");
new vm.Script(icon,{filename:"assets/iconografia-vitruviana.js"});

assert.match(parallel,/return \[\.\.\.new Set\(\[c\.image_url\]/);
assert.match(icon,/x\.image\|\|null/);
assert.match(icon,/images\/barbaro-1567\//);
assert.match(gud,/file\.addEventListener\('change'/);
assert.doesNotMatch(gud,/fetch\(remotePath/);
assert.match(culturalTest,/requestQueries\[0\],'Jorje Luis Borjes'/);
const sourceFiles=atlas.primaryRecords.filter(r=>r.localImage);
for(const item of sourceFiles){
  if(!existsSync(item.localImage)){
    assert(item.image?.startsWith("https://"),
      "No hay imagen externa citada para "+item.id);
    assert(item.record||item.viewer,
      "Falta enlace documental si no hay imagen local: "+item.id);
  }
}
const exceptional=["images/barbaro-1567/0001.jpg","documents/gudianus-69-facsimile.pdf","documents/gudianus-132-facsimile.pdf"];
assert(exceptional.every(x=>!existsSync(x)),"El test se debe actualizar si se suben versiones autorizadas de los documentos");
console.log("PASS: imágenes externas documentadas y fuentes enlazadas; los originales no se borraron ni se sustituyeron por reproducciones inventadas.");
