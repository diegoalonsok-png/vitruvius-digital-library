import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=p=>JSON.parse(readFileSync(p,"utf8"));
const reg=load("data/classics-corpus/search-registry.json"),cat=load("data/bibliotheca-expansion-publicada-2026-11-16.json");
const originals=[["disticha-catonis",205],["publilius-syrus-sententiae",733],["eutropius-breviarium",225],["aurelius-victor-liber-caesaribus",42]];
for(const [id,n] of originals){
 const path="data/classics-corpus/"+id+"-la.json",d=load(path);
 assert.equal(d.workId,id);assert.equal(d.language,"la");assert.equal(d.passages.length,n);
 assert.equal(new Set(d.passages.map(p=>p.locus)).size,n);
 assert.ok(d.passages.every(p=>p.locus&&p.text&&p.text.trim().length>2));
 assert.ok(d.source&&d.license&&d.editorialStatus);
 assert.equal(reg.entries.filter(e=>e.workId===id&&e.language==="la"&&e.path===path).length,1);
 assert.equal(cat.works.filter(w=>w.id===id).length,1);
}
const d=load("data/classics-corpus/disticha-catonis-la.json");
assert.equal(d.passages.filter(p=>/^[1-4]\.\d+$/.test(p.locus)).length,144);
for(const [b,n] of [[1,40],[2,31],[3,24],[4,49]])
 for(let k=1;k<=n;k++)assert.ok(d.passages.some(p=>p.locus===b+"."+k),"Disticha missing "+b+"."+k);
const e=load("data/classics-corpus/eutropius-breviarium-la.json");
const en=load("data/classics-corpus/eutropius-breviarium-en.json");
assert.equal(en.language,"en");assert.equal(en.passages.length,225);
assert.match(en.translator,/John Selby Watson/);
assert.match(en.license,/public domain/i);
assert.equal(reg.entries.filter(x=>x.workId==="eutropius-breviarium"&&x.language==="en").length,1);
assert.deepEqual(en.passages.map(x=>x.locus),e.passages.map(x=>x.locus),"parallel book/chapter loci");
assert.ok(en.passages.find(x=>x.locus==="7.14").text.includes("NERO"));
assert.ok(en.passages.find(x=>x.locus==="7.21").text.includes("TITUS"));
assert.ok(en.passages.every(x=>x.text.length>30));
assert.ok(!en.passages.at(-1).text.includes("[Notes moved to the end"));
const chapters=[20,28,23,27,9,25,23,23,28,18];
for(let b=1;b<=chapters.length;b++)
 for(let n=1;n<=chapters[b-1];n++)assert.ok(e.passages.some(x=>x.locus===b+"."+n));
const v=load("data/classics-corpus/aurelius-victor-liber-caesaribus-la.json");
for(let n=1;n<=42;n++)assert.ok(v.passages.some(x=>x.locus===String(n)));
assert.equal(reg.count,reg.entries.length);
assert.equal(reg.works,new Set(reg.entries.map(x=>x.workId)).size);
assert.equal(reg.entries.filter(x=>originals.some(e=>e[0]===x.workId)).length,5);
console.log("PASS: four Latin originals, 225-chapter public-domain Watson English Eutropius, parallel loci, no duplicate records.");
