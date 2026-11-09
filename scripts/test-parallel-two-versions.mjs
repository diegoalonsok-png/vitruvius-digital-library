#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

const read=path=>readFileSync(path,"utf8");
const parallel=read("classics-parallel-reader.html");
const reader=read("classics-text-reader.html");
const js=read("assets/classics-text-reader.js");
const scripts=[...parallel.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,1,"Debe haber un controlador único para el lector enfrentado");
new Script(scripts[0],{filename:"classics-parallel-reader.html:inline.js"});
new Script(js,{filename:"assets/classics-text-reader.js"});
assert.match(parallel,/id="left-query"/);
assert.match(parallel,/id="right-query"/);
assert.match(parallel,/id="parallel-find"/);
assert.match(parallel,/id="parallel-clear"/);
assert.match(parallel,/structured-bilingual/);
assert.match(parallel,/qLeft/);
assert.match(parallel,/qRight/);
assert.match(parallel,/locusKey/);
assert.match(parallel,/equivalencia semántica/);
assert.match(js,/vitruvia-parallel-find/);
assert.match(js,/vitruvia-parallel-search-result/);
assert.match(reader,/cl-parallel-hit/);
assert.match(reader,/id="parallel-link"/);
const registry=JSON.parse(read("data/classics-corpus/search-registry.json"));
const editionRows=registry.entries.filter(e=>["json-passages","structured-bilingual"].includes(e.format));
const langs=new Map();
for(const e of editionRows)if(["la","grc","es","en","fr"].includes(e.language)){
 if(!langs.has(e.workId))langs.set(e.workId,new Set());
 langs.get(e.workId).add(e.language);
}
const expect={
 "apuleius-metamorphoses":["la","en","es"],
 "seneca-de-brevitate":["la","es","fr","en"],
 "vitruvius":["la","es","fr","en"],
 "theophrastus-characters":["grc","en"]
};
for(const [id,wanted] of Object.entries(expect)){
 const found=langs.get(id);
 assert(found,id+" sin versiones");
 for(const lang of wanted)assert(found.has(lang),id+" sin "+lang);
}
const comparable=[...langs].filter(([,languages])=>languages.size>=2).length;
assert(comparable>=16,"Cobertura insuficiente para el lector enfrentado");
assert.equal([...read("classics-parallel-reader.html").matchAll(/<iframe\b/g)].length,2);
console.log(JSON.stringify({ok:true,worksWithAtLeastTwoEditions:comparable,checked:Object.keys(expect)}));
