/* Offline fixtures for the existing semantic pipeline and named museum witnesses.
No browser, network, historical collation, or live image availability is certified. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const corpus=read("assets/classics-corpus-search.js"),ai=read("assets/vitruvia-ai.js"),dossier=read("assets/vitruvia-egypt-dossier.js");
const lex=JSON.parse(read("data/lexicon/conceptus.json"));
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
const code=corpus.slice(corpus.indexOf("async function conceptTerms("),corpus.indexOf("let semanticPostingTask="));
const makeConcept=concepts=>new Function("fold","conceptTask","semanticConcept",code+"return conceptTerms;")(normalize,Promise.resolve(concepts),async()=>null);
const lookup=makeConcept(lex.concepts);
for(const q of ["justicia","justice","droit"]){
 const v=await lookup(q);
 assert.ok(v?.la.includes("ius"),q);
 assert.ok(v?.grc.includes("δίκη"),q);
}
const arch=await lookup("architecture");
assert.ok(arch?.la.includes("architectura"));
assert.ok(!arch.grc.includes("τέχνη"),"Broad association must not become an equivalence");
assert.equal(await lookup("unlisted concept 123"),null);
assert.equal(await makeConcept([{id:"a",modern:{es:["ambiguo"]}},{id:"b",modern:{es:["ambiguo"]}}])("ambiguo"),null);
const segment=ai.slice(ai.indexOf("async function prepareCorpus(query)"),ai.indexOf("function diversity("));
let request;
const retrieval=new Function("window","terms","normalize","notify","sliceIntoChunks",segment+"return {prepareCorpus,lexicalRanking};")({ClassicsCorpusSearch:{
 conceptTerms:lookup,
 searchPassages:async(q,o)=>{request=o;o.onComplete({registered:100,targeted:3,loaded:3,indexGate:true,failures:[]});return [
 {workId:"a",title:"Latin",language:"la",source:"fixture",locus:"1",link:"reader?a",term:"ius",originalText:"ius est ars"},
 {workId:"b",title:"Greek",language:"grc",source:"fixture",locus:"2",link:"reader?b",term:"δίκη",originalText:"δίκη καλή"},
 {workId:"c",title:"Translation",language:"es",source:"fixture",locus:"3",link:"reader?c",term:"justicia",originalText:"La justicia"},
 {workId:"ocr",title:"OCR",language:"la",source:"fixture",locus:"4",link:"reader?d",term:"ius",originalText:"ius OCR",ocr:true}];
 }}},s=>normalize(s).split(/\s+/),normalize,()=>{},s=>[s]);
const result=await retrieval.prepareCorpus("justicia");
assert.equal(request.strictBudget,24);
assert.equal(request.structuredOnly,true);
assert.ok(request.languageTerms.la.includes("ius")&&request.languageTerms.grc.includes("δίκη"));
assert.equal(result.documents.length,3);
assert.ok(result.documents.every(d=>d.sourceText));
assert.equal(result.documents.find(d=>d.language==="es").original,"");
assert.equal(result.documents.find(d=>d.language==="es").translation,"La justicia");
assert.ok(retrieval.lexicalRanking("justicia",result).every(r=>r.score>0));
const map=dossier.slice(dossier.indexOf("const NAME_WITNESSES="),dossier.indexOf("function showNameWitness("));
const witness=new Function(map+"return nameWitness;")();
assert.equal(witness("hatshepsut","nomen").accession,"27.3.203");
assert.equal(witness("tutankhamun","prenomen").id,567747);
assert.equal(witness("hatshepsut","horus"),null);
assert.equal(witness("unknown","nomen"),null);
console.log("PASS Conceptus expansion, ambiguity, source language, bounded request, OCR exclusion, named witnesses.");
