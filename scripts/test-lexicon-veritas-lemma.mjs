#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const src=fs.readFileSync("assets/classical-lexicon.js","utf8");
new vm.Script(src,{filename:"assets/classical-lexicon.js"});
const marker="function exactLatinLemmaOverride(word,lang){";
assert(src.includes(marker));
assert(src.includes("if(correctedLemma)return correctedLemma;"),"Override should precede unverified lemmatization");
const start=src.indexOf(marker),end=src.indexOf("\nasync function lookupUncached(",start);
const helper=src.slice(start,end);
const lookup=new Function("links",helper+"\nreturn exactLatinLemmaOverride;")((word,lang,lemma)=>[[word,lang,lemma]]);
for(const form of ["veritas","ueritas","Veritas","Ueritas"]){
 const entry=lookup(form,"la");
 assert(entry?.entries?.length);
 assert.equal(entry.entries[0].lemma,"veritas, veritatis");
 assert.match(entry.entries[0].es,/verdad/);
 assert(!/vereor|to fear/i.test(entry.entries[0].gloss));
}
assert.equal(lookup("vereor","la"),null);
assert.equal(lookup("veritas","grc"),null);
assert.equal(lookup("ueritasque","la"),null);
console.log("PASS: veritas/ueritas = verdad; Latin U/V search preserved; vereor not conflated.");
