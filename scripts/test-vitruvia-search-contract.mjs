#!/usr/bin/env node
/**
 * Contract checks for Vitruvia's academic search integration.
 * These check parsing, BM25 opt-in, URLs, UI wiring and JavaScript syntax.
 * They do NOT certify web latency, E5 relevance, manuscript collation or external API availability.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script,runInNewContext} from "node:vm";
const read=p=>readFileSync(p,"utf8");
const scripts=[
 "assets/vitruvia-ai.js",
 "assets/vitruvia-search.js",
 "assets/vitruvia-research-engine.js",
 "assets/vitruvia-result-filters.js",
 "assets/vitruvia-scholarly-export.js"
];
for(const path of scripts)new Script(read(path),{filename:path});
const context={window:{}};
runInNewContext(read("assets/vitruvia-research-engine.js"),context);
const parse=context.window.VitruviaResearchEngine?.parseReference;
assert.equal(typeof parse,"function","Reference parser must be exported for reproducible tests");
for(const [q,book,chapter,section] of [
 ["liber IV",4,null,null],
 ["lib. IV",4,null,null],
 ["libro 4",4,null,null],
 ["Book IV",4,null,null],
 ["IV.1",4,1,null],
 ["4.1",4,1,null],
 ["Vitr. IV.1.2",4,1,2],
 ["De arch. IV, 1, 2",4,1,2],
 ["liber IV caput 1",4,1,null]
]){
 const found=parse(q);
 assert(found,"Failed to parse "+q);
 assert.equal(found.book,book,q+": book");
 assert.equal(found.chapter,chapter,q+": chapter");
 assert.equal(found.section,section,q+": section");
}
assert.equal(parse("unrelated-query"),null);
const manifest={sources:[{
 url:"data/structured/fixture.json",workId:"vitruvius",workTitle:"De architectura",
 author:"Vitruvio",edition:"V514",language:"es",
 reader:"lector-bilingue.html?edition=recensio-es",source:"Edición estructurada de prueba"
}]};
const passages={edition:"recensio-es",version:"V514",passages:[{
 locus:"1.1.1",
 latin:"Architectura scientia est quae pluribus disciplinis et variis eruditionibus ornatur, symmetria et proportione.",
 translation:"La arquitectura es ciencia vinculada a numerosas disciplinas, a la simetría y a la proporción."
}]};
const requested=[];
const aiContext={
 window:{dispatchEvent(){}},
 document:{getElementById(){return null}},
 navigator:{connection:{saveData:false}},
 CustomEvent:class{},
 fetch:async url=>{
  requested.push(String(url));
  if(String(url).endsWith("ai-corpora.json"))return {ok:true,json:async()=>manifest};
  if(String(url).endsWith("fixture.json"))return {ok:true,json:async()=>passages};
  throw Error("Unexpected network resource: "+url);
 }
};
runInNewContext(read("assets/vitruvia-ai.js"),aiContext);
const response=await aiContext.window.VitruviaAI.search("symmetria",{method:"bm25"});
assert.equal(response.mode,"bm25-fallback");
assert.equal(response.method,"bm25");
assert(response.rows.some(r=>r.locus==="1.1.1"&&r.aiEvidence&&r.aiSemantic===false));
assert(requested.every(x=>!x.includes("huggingface")&&!x.includes("jsdelivr")),"BM25 must not fetch the neural model");
const html=read("vitruvia.html");
assert(html.includes('id="ai-method"'),"Search motor control missing");
assert(html.includes('value="neural"')&&html.includes('value="bm25"'));
assert(html.includes('assets/vitruvia-result-filters.js'));
const search=read("assets/vitruvia-search.js");
assert(search.includes('new URLSearchParams({q,mode:S.mode'),"Shareable q/mode URLs missing");
assert(search.includes('engine:"e5"'),"Explicit neural mode URL missing");
assert(search.includes('concordancia-folios.html?locus='),"Evidence-graded folio link missing");
assert(search.includes('vitruvia-lexicon.html?'),"Lexicon deep link missing");
const filters=read("assets/vitruvia-result-filters.js");
for(const word of ["currentEdition","currentLanguage","Loci Markdown","BibTeX","RIS","Índice CSV"])
 assert(filters.includes(word),"Missing filter/export integration: "+word);
console.log(JSON.stringify({passed:true,referenceQueries:9,bm25WithoutModel:true,checkedScripts:scripts.length,scope:"static contract tests only"},null,2));
