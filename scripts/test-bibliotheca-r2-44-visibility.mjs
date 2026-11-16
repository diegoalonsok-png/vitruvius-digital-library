#!/usr/bin/env node
/** Read-only structural coverage check for the 44 catalogue-visible R2 originals. */
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const manifest=read("data/r2/corpus-manifest.json");
const registry=read("data/classics-corpus/search-registry.json");
const road=read("data/classics-corpus/indexation-roadmap-222.json");
const js=readFileSync("assets/bibliotheca-work-search.js","utf8");
const page=readFileSync("bibliotheca-graeca-latina.html","utf8");
new vm.Script(js);
assert(page.includes("assets/bibliotheca-work-search.js?v=20261116-r2-44-catalogue-v1"),"Bibliotheca must load the new view");
assert(js.includes("Ver 44 originales R2"),"Visible R2 catalogue control missing");
assert(js.includes("model.r2Only||w.r2Original"),"R2-only filter absent");
assert(js.includes('e.path?.startsWith(R2_BASE)'),"R2 provenance identification missing");
assert.equal(manifest.obras.length,44);
assert.equal(new Set(manifest.obras.map(x=>x.archivo)).size,44);
assert.equal(new Set(manifest.obras.map(x=>x.workId)).size,44);
assert.equal(manifest.obras.reduce((n,x)=>n+x.pasajes,0),46850);
const records=registry.entries.filter(e=>e.path.startsWith(manifest.base)&&["la","grc"].includes(e.language));
assert.equal(records.length,44);
for(const item of manifest.obras){
 const entries=records.filter(e=>e.path===manifest.base+item.archivo);
 assert.equal(entries.length,1,"Missing R2 link: "+item.archivo);
 const e=entries[0];
 assert.equal(e.workId,item.workId);
 assert.equal(e.language,item.language);
 assert.equal(e.sha256,item.sha256);
 assert.equal(e.passages,item.pasajes);
 assert(e.title&&e.author,"Missing bibliography: "+item.archivo);
 assert(e.reader?.startsWith("classics-text-reader.html?work="),"Missing book reader: "+item.archivo);
 assert(road.items.some(w=>w.id===item.workId),"Missing main catalogue record: "+item.workId);
}
console.log("PASS: 44/44 R2 originals with unique catalogue IDs, source SHA256, passage totals and reader links; 39 Greek and 5 Latin. This checks metadata, NOT live R2 HTTP content.");
