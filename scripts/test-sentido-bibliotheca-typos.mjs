#!/usr/bin/env node
/* Regressions: the sense search resolves documented Latin lemmas and
 * small typing errors without inventing historical translations or OCR.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=read("assets/sentido-bibliotheca.js");
const start=source.indexOf("const fold="),end=source.indexOf("function resaltar(",start);
assert(start>=0&&end>start,"The resolver was removed");
const fetched=[];
const sandbox={
 fetch:async url=>{
  fetched.push(url);
  assert(["data/lexicon/conceptus.json","data/lexicon/etymologicum.json"].includes(url),"Unexpected source "+url);
  return {ok:true,json:async()=>JSON.parse(read(url))};
 },
};
vm.runInNewContext(source.slice(start,end)+"\nthis.resolver=terminos;",sandbox,{timeout:5000});
const tests=[
 ["firmitas","firmitas",false],
 ["firmmitas","firmitas",true],
 ["fimmitas","firmitas",true],
 ["utilitas","utilitas",false],
 ["venustas","venustas",false],
 ["logos","λόγος",false]
];
for(const [typed,expected,corrected] of tests){
 const resolved=await sandbox.resolver(typed);
 assert(resolved.terms.some(term=>term===expected),typed+" did not retrieve "+expected);
 assert.equal(Boolean(resolved.correcciones.length),corrected,typed+" correction flag is wrong");
 if(corrected)assert(resolved.correcciones.every(c=>c.fuente==="Etymologicum"),"Correction without a named source");
}
const original=JSON.parse(read("data/structured/recensio-es.json"));
const locus=original.passages.find(p=>p.locus==="1.3.2");
assert(locus&&/firmitatis/.test(locus.latin),"V514 De architectura 1.3.2 was not preserved");
const stem="firmitas".slice(0,-2);
assert(locus.latin.toLowerCase().includes(stem),"The literal stem did not find V514 1.3.2");
assert.equal(new Set(fetched).size,2,"Etymologicum and Conceptus must be cached per page");
console.log("PASS: firmitas, firmmitas, fimmitas; documented corrections; logos alias; V514 locus 1.3.2.");
