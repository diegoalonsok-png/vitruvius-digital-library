/**
 * Test the actual browser engine with synthetic, source-linked examples.
 * No repository originals, translations or facsimiles are modified.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync("assets/classics-corpus-search.js","utf8");
const entry=(workId,language,format="json-passages")=>({
 workId,language,format,author:workId,title:workId,
 path:format==="html-text"?"corpus/demo-en.html":"data/classics-corpus/"+workId+"-"+language+".json",
 reader:format==="html-text"?"corpus/demo-en.html":"classics-text-reader.html?work="+workId+"&lang="+language
});
const entries=[
 entry("house","la"),entry("wolf","la"),entry("people","grc"),
 entry("demo","en","html-text"),entry("spanish","es"),
 ...Array.from({length:9},(_,i)=>entry("extra-"+i,"es"))
];
const posting=(e,concepts=[])=>({
 workId:e.workId,language:e.language,format:e.format,source:e.path,
 edition:null,passages:1,words:10,matchedPassages:concepts.length,concepts
});
const postings={
 schema:"vitruvia-classics-semantic-postings-v1",
 registryEditionCount:entries.length,eligibleEditions:entries.length,indexedEditions:entries.length-1,errors:[],
 notIndexedFormats:[{
  path:"corpus/demo-en.html",format:"html-text",
  reason:"Hosted translation has no stable passage anchor; search literal text directly, not as a verified locus."
 }],
 versions:[
  posting(entries[0],[{concept:"home",count:1,loci:[["1","domus",1]]}]),
  posting(entries[1]),posting(entries[2]),posting(entries[4]),
  ...entries.slice(5).map(posting)
 ]
};
const data={
 "data/classics-corpus/search-registry.json":{
  schema:"vitruvia-classics-search-registry-v1",count:5,entries
 },
 "data/lexicon/conceptus.json":{
  concepts:[{id:"home",modern:{es:["casa"]},la:["domus"],grc:["οἶκος"]}]
 },
 "data/classics-corpus/house-la.json":{
  workId:"house",language:"la",passages:[{locus:"1",text:"Domus antiqua."}]
 },
 "data/classics-corpus/wolf-la.json":{
  workId:"wolf",language:"la",passages:[{locus:"1",text:"Lupus fugit."}]
 },
 "data/classics-corpus/people-grc.json":{
  workId:"people",language:"grc",passages:[{locus:"1",text:"ἄνθρωπος ἐστίν."}]
 }
};
function run(index){
 const window={},requests=[];
 const fetch=async path=>{
  requests.push(path);const obj=path==="data/classics-corpus/semantic-conceptus-postings.json"?index:data[path];
  if(!obj)return {ok:false,status:404,json:async()=>{throw Error("missing source")}};
  return {ok:true,status:200,json:async()=>obj};
 };
 const context=vm.createContext({window,fetch,console,URL,encodeURIComponent,Promise});
 vm.runInContext(source,context,{filename:"classics-corpus-search.js"});
 return {engine:window.ClassicsCorpusSearch,requests};
}
{
 const {engine,requests}=run(postings);
 const rows=await engine.semanticSearch("casa",{limit:10});
 const d=engine.diagnostics();
 assert.equal(rows.length,1,"Attested Latin source must remain searchable");
 assert.equal(rows[0].workId,"house");
 assert.equal(d.staticIndexUsed,true,"Full-registry index should be recognized");
 assert.equal(d.skippedNoHit,2,"Nonmatching Greek and Latin editions should be skipped");
 assert.equal(d.loaded,1,"Only matching text should be downloaded");
 assert.equal(requests.includes(entries[1].path),false);
 assert.equal(requests.includes(entries[2].path),false);
 assert.equal(requests.includes(entries[4].path),false,"ES translation not exposed by Bibliotheca policy");
}
{
 const stale={...postings,registryEditionCount:4};
 const {engine}=run(stale);
 const rows=await engine.semanticSearch("casa",{limit:10});
 const d=engine.diagnostics();
 assert.equal(rows.length,1,"Stale index must fall back to original-text search");
 assert.equal(d.staticIndexUsed,false);
 assert.equal(d.skippedNoHit,0,"Never skip sources from a stale index");
 assert.equal(d.loaded,3);
}
{
 const broken={...postings,indexedEditions:4,versions:postings.versions.slice(1)};
 const {engine}=run(broken);
 await engine.semanticSearch("casa",{limit:10});
 assert.equal(engine.diagnostics().staticIndexUsed,false,"Missing postings must disable filter");
}
// The general search must include all documentary search routes even when
// an attested literal hit exists (domus in Latin AND οἶκος in Greek).
{
 data["data/classics-corpus/people-grc.json"].passages=[{locus:"1",text:"Ὁ οἶκος ἐστίν."}];
 const withGreek={
  ...postings,
  versions:postings.versions.map(v=>v.workId==="people"
   ?{...v,concepts:[{concept:"home",count:1,loci:[["1","οἶκος",1]]}]}:v)
 };
 const {engine}=run(withGreek);
 const literal=await engine.search("domus",{limit:6});
 const semantic=await engine.semanticSearch("domus",{limit:6});
 assert.equal(literal.some(r=>r.language==="la"),true);
 assert.equal(literal.some(r=>r.language==="grc"),false);
 assert.equal(semantic.some(r=>r.language==="grc"),true);
 const both=await engine.combinedSearch("domus",{limit:6});
 assert.deepEqual([...new Set(both.map(r=>r.language))].sort(),["grc","la"]);
 assert.equal(both.length,2,"Identical Latin locus may not appear twice");
 assert(both.some(r=>r.language==="grc"&&r.meta.includes("SEMÁNTICA EDITORIAL")));
 assert(both.every(r=>r.link&&r.source&&r.count>0),"Only attested source-linked passages");
}
console.log("PASS: Vitruvia combines attested literal and Conceptus results, preserves Greek/Latin provenance, excludes unanchored HTML and falls back safely.");
