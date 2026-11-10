#!/usr/bin/env node
/* Small, offline, reproducible tests. No paid APIs, no remote translation,
   no manuscript text or editorial master modifications. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script,createContext} from "node:vm";
import {TextEncoder} from "node:util";
const read=p=>readFileSync(p,"utf8");
const dict=read("assets/lexicon-dictionaries-integrated.js");
const translator=read("assets/academic-inline-translation.js");
for(const [path,source] of [["diccionario",dict],["traducción",translator],
 ["Lexicon",read("assets/vitruvia-lexicon.js")],
 ["Bibliotheca",read("assets/bibliotheca-simple.js")],
 ["Vitruvia",read("assets/vitruvia-search.js")]]){
 new Script(source,{filename:path});
}
const start=dict.indexOf("function dictionaryIndex(doc,lang){"),
 end=dict.indexOf("function external(entry,lang){",start);
assert(start>0&&end>start,"Dictionary helpers absent");
const scope=createContext({
 indexes:new WeakMap(),
 normal:s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()
  .replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u").trim(),
 heb:s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").replace(/[^\u05d0-\u05ea]/g,""),
 greekRoman:s=>[...String(s).normalize("NFD").replace(/\p{M}/gu,"").replace(/ς/g,"σ")]
  .map(c=>({λ:"l",ο:"o",γ:"g",σ:"s",α:"a",ρ:"r",χ:"ch",ι:"i",τ:"t",ε:"e",κ:"k",υ:"y",μ:"m"}[c]||c)).join("")
});
new Script(dict.slice(start,end)+
 "\nthis.lookup=matchEntries;this.suggest=suggestions;this.clean=cleanQuery;this.meanings=meaningMentions;").runInContext(scope);
const la={
 entries:{domus:{lemma:"domus",gloss:"house"},architectura:{lemma:"architectura",gloss:"architecture"},iustitia:{lemma:"iustitia",gloss:"justice"}},
 forms:{domibus:["domus"],domorum:["domus"]}
};
const grc={entries:{"λογοσ":{lemma:"λόγος",gloss:"speech; account"}},forms:{"λογου":["λογοσ"]}};
assert.equal(scope.lookup(la,"domus","la")[0].kind,"lema exacto / grafía equivalente");
assert.equal(scope.lookup(la,"domibus","la")[0].kind,"forma flexionada indexada");
assert.equal(scope.lookup(la,"@DOMUS","la")[0].entry.lemma,"domus");
assert.equal(scope.lookup(la,"iustitia","la")[0].entry.lemma,"iustitia");
assert.equal(scope.lookup(grc,"λόγος","grc")[0].entry.lemma,"λόγος");
assert.equal(scope.lookup(grc,"logos","grc")[0].entry.lemma,"λόγος");
assert.equal(scope.lookup(grc,"λόγου","grc")[0].kind,"forma flexionada indexada");
assert.deepEqual(Array.from(scope.lookup(la,"domos","la")),[],
 "A misspelling MUST NOT be presented as a confirmed dictionary definition");
assert(scope.suggest(la,"domos","la").some(x=>x.lemma==="domus"));
assert(scope.suggest(la,"arch","la").some(x=>x.lemma==="architectura"));
const senses=JSON.parse(read("data/lexicon/senses-vitruvianos.json"));
const edition=JSON.parse(read("data/structured/recensio-es.json"));
const loci=new Map(edition.passages.map(p=>[p.locus,p]));
assert.equal(senses.schema,"vitruvia-lexicon-contextual-senses-v1");
assert.equal(senses.entries.length,20);
assert(scope.meanings(senses.entries,"planta","la").some(x=>x.lemma==="ichnographia"),
 "A literal architectural meaning must recover the cited Latin lemma");
assert(scope.meanings(senses.entries,"casa","la").some(x=>x.lemma==="domus"),
 "A recorded contextual meaning must be searchable");
assert(scope.meanings(senses.entries,"ordenación","grc").some(x=>x.lemma==="τάξις"),
 "A Greek equivalence must be supported by its contextual wording");
assert.equal(scope.meanings(senses.entries,"silla","la").length,0,
 "Unattested meanings must not create new dictionary entries");

const keys=new Set();
const norm=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"")
 .toLowerCase().replace(/[ςϲ]/g,"σ");
for(const sense of senses.entries){
 const k=sense.language+"|"+norm(sense.lemma);
 assert(!keys.has(k),"Duplicate contextual lemma "+k);keys.add(k);
 assert(["la","grc"].includes(sense.language));
 assert(sense.meaning.length>25,"Blank editorial meaning at "+k);
 assert(!/https?:\/\//.test(sense.meaning),"Meaning must not inject an unverified link");
 const source=loci.get(sense.locus);
 assert(source?.latin&&source?.translation,"Unknown V514 locus for "+sense.lemma);
 const stem=norm(sense.lemma).slice(0,Math.min(sense.language==="grc"?4:5,sense.lemma.length));
 assert(norm(source.latin).includes(stem),
  "Contextual claim lacks an attested lexical root: "+sense.lemma+" at "+sense.locus);
 assert.equal(sense.confidence,"contextual-editorial");
}
const trScope=createContext({window:{},TextEncoder});
new Script(translator).runInContext(trScope);
const api=trScope.window.VitruviaInlineTranslation;
assert(api,"Translation tool not exposed");
const fragments=api.chunkForTest("ἀρχιτεκτονική ".repeat(180));
assert(fragments.length>=1&&fragments.length<=3);
assert(fragments.every(x=>api.bytesForTest(x)<=420),"API per-fragment byte limit exceeded");
for(const [page,engine] of [
 ["bibliotheca-graeca-latina.html","assets/bibliotheca-simple.js"],
 ["vitruvia-lexicon.html","assets/vitruvia-lexicon.js"],
 ["vitruvia.html","assets/vitruvia-search.js"]]){
 const html=read(page),js=read(engine);
 assert(html.includes("assets/academic-inline-translation.js"),
  "Missing translation asset from "+page);
 assert(js.includes("VitruviaInlineTranslation?.attach("),
  "Missing explicit inline attachment from "+engine);
}
assert(translator.includes('button.addEventListener("click",async()=>'),
 "Translate must be initiated by the reader");
assert(!translator.includes("localStorage")&&!translator.includes("apiKey"),
 "Translator must not persist passage text or require a paid key");
console.log("PASS: dictionary exact/inflected/transliteration/suggestions; "+
 senses.entries.length+" cited contextual meanings; 3 opt-in translation integrations; no external network in tests.");
