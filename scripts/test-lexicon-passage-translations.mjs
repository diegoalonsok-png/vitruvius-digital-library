#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=path=>readFileSync(path,"utf8");
const bridge=read("assets/lexicon-classics-bridge.js");
new vm.Script(bridge,{filename:"assets/lexicon-classics-bridge.js"});
assert.match(bridge,/translationSelect\.id="lx-library-translation-lang"/);
assert.match(bridge,/async function prepareTranslation/);
assert.match(bridge,/translationContext=await prepareTranslation\(workId,currentEditions\)/);
assert.match(bridge,/translationContext\.map\.has/);
assert.match(bridge,/No existe correspondencia única de locus/);
assert.match(bridge,/No hay traducción textual consultable/);
assert.match(bridge,/classics-parallel-reader\.html/);
assert.match(bridge,/function appendTranslation\(card,row,editions\)/);
assert.match(bridge,/window\.VitruviaInlineTranslation\?\.attach\(anchor/);
assert.match(bridge,/IntersectionObserver/);
assert.match(read("assets/classics-corpus-search.js"),/originalText:p\.text/);
assert.match(read("assets/vitruvia-lexicon.js"),/function addUnverifiedTranslationOption\(D,p,box\)/);
assert.match(read("assets/vitruvia-lexicon.js"),/vitruvia-lexicon-translation-default-v2/);
assert.match(read("vitruvia-lexicon.html"),/lexicon-classics-bridge\\.js\\?v=[^"\x27<>]+/,"Lexicon must load its attested passage translation bridge");

const reg=JSON.parse(read("data/classics-corpus/search-registry.json"));
const entries=reg.entries||[];
const by=(id,lang)=>entries.find(e=>e.workId===id&&e.language===lang&&e.format==="json-passages");
for(const [id,a,b] of [
 ["seneca-de-brevitate","la","fr"],
 ["seneca-de-brevitate","la","es"],
 ["apuleius-metamorphoses","la","en"],
 ["apuleius-metamorphoses","la","es"]
]){
 const orig=by(id,a),translated=by(id,b);
 assert(orig&&translated,id+" "+a+"/"+b+" missing");
 const o=JSON.parse(read(orig.path)),t=JSON.parse(read(translated.path));
 assert(o.passages.length&&t.passages.length);
 const ids=new Set(o.passages.map(x=>String(x.locus)));
 const matches=t.passages.filter(x=>ids.has(String(x.locus))).length;
 if(id==="apuleius-metamorphoses")assert.equal(matches,0,"Do not invent Apuleius alignment");
 if(id==="seneca-de-brevitate")assert(matches>=15,"Seneca shared chapter labels expected");
}
console.log("PASS: Lexicon translations are selected from attested, source-linked loci and mismatches stay explicit.");
