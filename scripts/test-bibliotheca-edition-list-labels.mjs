import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const data=JSON.parse(readFileSync("data/classics-corpus/edition-list-labels.json","utf8"));
assert.equal(data.schema,"bibliotheca-edition-list-labels-v1");
assert(Object.keys(data.works).length>50,"Edition metadata unexpectedly empty");
const cyclops=data.works["euripides-cyclops"];
assert(cyclops?.some(x=>x.language==="en"&&x.kind==="translation"&&x.publicationYear==="1891"
 &&/Coleridge/i.test(x.translator||"")),"Historic Cyclops translation year and author missing");
assert(data.works["seneca-epistulae"]?.some(x=>x.language==="la"&&x.kind==="original"),
 "Seneca must be presented as an original Latin text");
for(const [work,rows] of Object.entries(data.works)){
 const editions=new Set();
 for(const row of rows){
  assert(row.path,"Missing edition source path: "+work);
  const key=row.language+"|"+row.path;
  assert(!editions.has(key),"Duplicate edition shown on work "+work);editions.add(key);
  assert(["original","translation"].includes(row.kind));
  assert(row.kind==="original"||!row.publicationYear||/^\d{4}$/.test(row.publicationYear));
  assert(row.kind!=="original"||!row.translator,"Original cannot be labelled as a translation");
 }
}
const script=readFileSync("assets/bibliotheca-work-search.js","utf8");
assert(script.includes("appendEditionSummary(row,w)")&&script.includes("readingEditions(w)"),
 "Both author and work result rows must include edition details");
const registry=JSON.parse(readFileSync("data/classics-corpus/search-registry.json","utf8")).entries;
const manifest=JSON.parse(readFileSync("data/r2/classics-translation-manifest.json","utf8")).editions;
let matched=0;
for(const e of manifest){
 const registered=registry.find(r=>r.workId===e.workId&&r.language===e.language&&r.path===e.url&&r.sha256===e.sha256);
 if(!registered||!e.translators?.length||!e.publicationYear)continue;
 const row=data.works[e.workId]?.find(r=>r.path===e.url&&r.language===e.language);
 assert(row,"Missing registered translation: "+e.url);
 assert.equal(row.translator,e.translators.join(" · ").slice(0,160));
 assert.equal(row.publicationYear,String(e.publicationYear));
 matched++;
}
assert(matched>0,"No attributed R2 translations matched the registry");
console.log("Matched R2 editorial attributions: "+matched);
console.log("PASS: verified languages, historic translator, publication year, and display in work results.");
