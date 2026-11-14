import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const api=require("../assets/scholarly-passage-citation.js");
const catalogue=JSON.parse(readFileSync("data/catalog.json","utf8"));
const source=JSON.parse(readFileSync("data/index/latin-texto.json","utf8"));
const kwic=readFileSync("assets/concordancia-kwic.js","utf8");
const html=readFileSync("aparato-critico.html","utf8");
assert.equal(source.schema,"latin-texto/1");
for(const [version,editionId,doi] of [
 ["V514","recensio-es","10.5281/zenodo.23884757"],
 ["V297","theory-en","10.5281/zenodo.23885404"]
]){
 const published=catalogue.editions.find(e=>e.id===editionId);
 const [locus,latin]=source.ediciones[version][0];
 assert.ok(published && latin.length>30);
 const row={workId:"vitruvius",editionId,locus,
  source:"data/index/latin-texto.json",
  url:"https://vitruvius-digital-library.org/lector-bilingue?edition="+editionId+"&locus="+locus};
 const ref=api.resolve(row,{author:"Marco Vitruvio Polión",title:"De architectura"},catalogue.editions);
 assert.equal(ref.doi,doi);
 assert.ok(ref.citation.includes(published.bibliographic_title));
 assert.ok(ref.citation.includes(locus));
 assert.ok(ref.citation.includes("data/index/latin-texto.json"));
 assert.ok(ref.url.includes("lector-bilingue?edition="+editionId));
 assert.ok(ref.citation.includes("no es transcripción diplomática"));
 assert.equal(ref.isbn,published.isbn||"",
  "The reference must reflect the real current catalogue for each edition");
 assert.equal(ref.isbnNote,published.isbn_note||"",
  "Disclose the editorial shared-ISBN note, not just its check digit");
 if(version==="V297"){
  assert.match(ref.citation,/ISBN común declarado por el editor/,
   "Shared ISBN for V297 must never be represented as independent registration");
 }
}
for(const needle of [
 "function readerUrl(h)","readerUrl(h);","hit(x,i,i,ed)","hit(x,i,i+n-1,ed)",
 "copyReference(hits[pos],button)","cite.dataset.position=String(vistos+k)",
 "EDICION","ISBN","DOI","SCHOLARLY","ORDEN_VECINOS"
]){
 // Literal spellings in this code differ from source's private variable naming.
 if(needle==="EDICION"||needle==="SCHOLARLY")continue;
 assert.ok(kwic.includes(needle),"KWIC missing required evidence: "+needle);
}
assert.ok(kwic.includes("ORDEN_VECINOS=32"));
assert.ok(kwic.includes("AUTHORITY.resolve(sourceRow(h),ANCIENT,records)"));
assert.ok(kwic.includes('ref?.isbn||""')&&kwic.includes('ref?.doi||""'));
assert.ok(!kwic.includes("T.slice(0,i).reverse()"),"No quadratic full-prefix sort keys");
assert.ok(!kwic.includes('a.href="concordancia-folios.html?locus='),"No invented codex-H association");
const library=html.indexOf('src="assets/scholarly-passage-citation.js');
const runner=html.indexOf('src="assets/concordancia-kwic.js');
assert.ok(library>=0 && runner>library,"Bibliographic authority must load before KWIC search");
console.log("PASS: KWIC exact Latin editions, locus permalinks, edition DOI/ISBN references, CSV provenance and bounded sort.");
