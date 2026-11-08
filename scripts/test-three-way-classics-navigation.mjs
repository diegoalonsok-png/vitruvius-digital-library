import assert from "node:assert/strict";
import fs from "node:fs";

// Audit cross-platform wiring without loading, modifying or duplicating codices.
const read=path=>fs.readFileSync(path,"utf8");
for(const page of ["vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html"]){
 const text=read(page),greek=text.indexOf("assets/bibliotheca-offsite-greek.js");
 const search=text.indexOf(page==="bibliotheca-graeca-latina.html"?
  "assets/bibliotheca-corpus-search.js":"assets/classics-corpus-search.js");
 assert.ok(greek>=0&&search>=0&&greek<search,
  "Remote Greek originals must load before the shared search engine in "+page);
}
const library=read("assets/bibliotheca-simple.js");
assert.match(library,/new URL\("vitruvia\.html",location\.href\)/);
assert.match(library,/new URL\("vitruvia-lexicon\.html",location\.href\)/);
assert.match(library,/toVitruvia\.searchParams\.set\("q",term\)/);
assert.match(library,/toLexicon\.searchParams\.set\("q",term\)/);

const lexicon=read("assets/lexicon-classics-bridge.js");
assert.match(lexicon,/vitruviaUrl\.searchParams\.set\("q",input\.value\.trim\(\)\)/);
assert.match(lexicon,/workUrl\.searchParams\.set\("work",row\.workId\)/);
assert.match(lexicon,/b\.searchParams\.set\("work",row\.workId\)/);

const vitruvia=read("assets/vitruvia-search.js");
assert.match(vitruvia,/d\.kind==="classic-text"/);
assert.match(vitruvia,/bibliotheca-graeca-latina\.html\?/);
assert.match(vitruvia,/vitruvia-lexicon\.html\?/);
assert.match(vitruvia,/work:d\.workId/);

for(const file of ["assets/classics-corpus-search.js","assets/bibliotheca-corpus-search.js"]){
 const src=read(file);
 assert.match(src,/\["json-passages","structured-bilingual","remote-json-passages"\]\.includes\(e\.format\)/,
  "Remote semantic matches must link to a verified locus in "+file);
}
console.log("PASS: Bibliotheca, Lexicon and Vitruvia are mutually linked with work IDs and search terms; remote Greek loci preserved.");
