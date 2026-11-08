/* Test: shared Latin sources indexed in situ; no duplicated source text. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const registry=read("data/classics-corpus/search-registry.json");
const cases={
 "varro-rustica":["varro-rustica","data/lexicon/fontes/varro-rustica-la.json",97],
 frontinus:["frontinus-aquaeductu","data/lexicon/fontes/frontinus-aquaeductu-la.json",130],
 pliny:["pliny-naturalis","data/lexicon/fontes/pliny-naturalis-la.json",745]
};
for(const [id,[sourceWorkId,path,expected]] of Object.entries(cases)){
 const rows=registry.entries.filter(e=>e.workId===id&&e.language==="la");
 assert.equal(rows.length,1,"Original duplicate: "+id);
 assert.equal(rows[0].sourceWorkId,sourceWorkId);
 assert.equal(rows[0].path,path);
 const text=read(path);
 assert.equal(text.workId,sourceWorkId);
 assert.equal(text.language,"la");
 assert.equal(text.passages.length,expected);
 assert.equal(new Set(text.passages.map(p=>p.locus)).size,expected);
 assert(text.passages.every(p=>p.text?.trim()),"Blank passage: "+id);
}
assert(read(cases.pliny[1]).passages.every(p=>/^3[3-6]\./.test(p.locus)),"Pliny must remain partial: only books 33-36");
assert.equal(registry.count,registry.entries.length);
assert.equal(registry.works,new Set(registry.entries.map(e=>e.workId)).size);
console.log("PASS: 3 Latin originals reused in place; Pliny limited to books 33-36; no duplication.");
