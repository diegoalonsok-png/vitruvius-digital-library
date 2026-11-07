import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parallelHighlight,equivalentTerms} from "../assets/parallel-highlights.mjs";
const en=JSON.parse(readFileSync("data/structured/theory-en.json","utf8")).passages;
const es=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8")).passages;
const passage=(list,locus)=>list.find(p=>p.locus===locus);
for(const [language,original,translation,source,expected] of [
 ["en","loci","places","in his locis idonei","places"],
 ["es","loci","lugares","in his locis idonei","lugares"],
 ["fr","loci","lieux","in his locis idonei","lieux"],
 ["en","geometria","geometry","geometria autem","geometry"],
 ["es","symmetriarum","conmensurabilidades","difficilesque symmetriarum quaestiones","conmensurabilidades"]
]){
 const queries=equivalentTerms(original,language,source);
 assert.ok(queries.includes(expected),original+" → "+expected+" must be indexed");
 const hit=parallelHighlight(translation,{query:original,lang:language,latin:source});
 assert.ok(hit?.equivalent>=1,original+" → "+expected+" must highlight the translated word");
 assert.match(hit.html,/<mark class="search-hit search-hit-equivalent"/);
}
assert.ok(parallelHighlight("places",{query:"loci",lang:"en",latin:"silva et aqua"})?.equivalent===0,
 "Never invent translation highlights when no source lemma is attested");
for(const [list,locus,query,lang,expected] of [
 [en,"1.2.7","loci","en","places"],
 [es,"1.2.7","loci","es","lugares"],
 [en,"1.4.1","loci","en","site"]
]){
 const p=passage(list,locus);assert.ok(p,"Missing locus "+locus);
 const result=parallelHighlight(p.translation,{query,lang,latin:p.latin});
 assert.ok(result?.words?.some(w=>w.toLowerCase()===expected),locus+" should highlight "+expected);
}
const p=passage(en,"2.8.12");
assert.ok(p&&/\bloci\b/i.test(p.latin),"The reported 2.8.12 contains loci in Latin");
assert.equal(parallelHighlight(p.translation,{query:"loci",lang:"en",latin:p.latin})?.equivalent,0,
 "2.8.12 is paraphrased; do not manufacture a nonexistent English word");
const reader=readFileSync("assets/bibliotheca-text-reader.js","utf8");
assert.match(reader,/parallel-highlights\.mjs/);
assert.match(reader,/queryTerms\(q\.value,e\.value,p\.latin\|\|""\,shared,people\)/);
assert.match(reader,/cr-alignment-note/);
console.log("PASS: bilingual Latin/English/Spanish/French matching; shared reader wiring; 2.8.12 honest nonliteral notice");
