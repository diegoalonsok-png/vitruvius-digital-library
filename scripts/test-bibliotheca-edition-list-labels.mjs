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
 const langs=new Set();
 for(const row of rows){
  assert(!langs.has(row.language),"Duplicate language shown on work "+work);langs.add(row.language);
  assert(["original","translation"].includes(row.kind));
  assert(row.kind==="original"||!row.publicationYear||/^\d{4}$/.test(row.publicationYear));
  assert(row.kind!=="original"||!row.translator,"Original cannot be labelled as a translation");
 }
}
const script=readFileSync("assets/bibliotheca-work-search.js","utf8");
assert(script.includes("appendEditionSummary(row,w)")&&script.includes("appendEditionSummary(row,match.w)"),
 "Both author and work result rows must include edition details");
console.log("PASS: verified languages, historic translator, publication year, and display in work results.");
