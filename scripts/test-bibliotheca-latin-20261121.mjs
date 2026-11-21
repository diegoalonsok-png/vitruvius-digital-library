import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=p=>JSON.parse(readFileSync(p,"utf8"));
const registry=load("data/classics-corpus/search-registry.json");
const catalogue=load("data/bibliotheca-expansion-publicada-2026-11-16.json");
for(const [id,n] of [["disticha-catonis",205],["publilius-syrus-sententiae",733]]){
 const filename="data/classics-corpus/"+id+"-la.json",data=load(filename);
 assert.equal(data.workId,id);assert.equal(data.language,"la");assert.equal(data.passages.length,n);
 assert.equal(new Set(data.passages.map(p=>p.locus)).size,n,"unique loci");
 assert.ok(data.passages.every(p=>p.locus&&p.text&&p.text.length>10));
 assert.ok(data.source&&data.license&&data.editorialStatus);
 const reg=registry.entries.filter(e=>e.workId===id&&e.language==="la");
 assert.equal(reg.length,1);assert.equal(reg[0].path,filename);
 assert.equal(reg[0].reader,"classics-text-reader.html?work="+id+"&lang=la");
 assert.equal(catalogue.works.filter(w=>w.id===id).length,1);
}
const d=load("data/classics-corpus/disticha-catonis-la.json");
assert.equal(d.passages.filter(p=>/^[1-4]\.\d+$/.test(p.locus)).length,144);
for(const [book,total] of [[1,40],[2,31],[3,24],[4,49]])for(let k=1;k<=total;k++)assert.ok(d.passages.some(p=>p.locus===book+"."+k));
assert.match(d.passages.find(p=>p.locus==="4.9").text,/Quod tibi suspectum est/);
const s=load("data/classics-corpus/publilius-syrus-sententiae-la.json");
assert.ok(s.passages.every(p=>/^[A-Z]\.\d+$/.test(p.locus)));
assert.equal(registry.count,registry.entries.length);
console.log("PASS: two Latin texts, internal segmentation, catalogue and reader routes; lexical/vector indexes and live R2 not covered.");
