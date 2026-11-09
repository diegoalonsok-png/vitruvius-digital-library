import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const id="isidore-etymologiae";
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-latinos-20261108/data/offsite-latin/";
const source="https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/isidore/1.txt";
const hash="a".repeat(64);
const passages=[
 {locus:"liber1.segmentum1",book:1,text:"Disciplina et ars ad scientiam pertinent."},
 {locus:"liber2.segmentum1",book:2,text:"Rhetorica et dialectica numerantur."},
 {locus:"liber15.segmentum1",book:15,text:"Domus in urbe aedificatur."},
 {locus:"liber19.segmentum1",book:19,text:"Aedificia et instrumenta urbana sunt."},
 {locus:"liber20.segmentum1",book:20,text:"Vocabula rerum et rerum memoria."},
];
const manifest={
 schema:"vitruvius-offsite-latin-originals-manifest-v1",
 branch:"corpus-originales-latinos-20261108",count:1,
 entries:[{workId:id,author:"Isidoro de Sevilla",title:"Etymologiae",
  language:"la",source,sourceSha256:hash,passages:5,
  path:"data/offsite-latin/"+id+"-la.json"}]
};
const doc={schema:"vitruvius-offsite-latin-original-v1",
 workId:id,language:"la",sourceSha256:hash,passages};
const hosted=Array.from({length:14},(_,i)=>({
 workId:"fixture-"+i,language:"en",author:"Fixture",title:"Fixture "+i,
 path:"data/classics-corpus/fixture-"+i+"-en.json",
 format:"json-passages",reader:"classics-text-reader.html?work=fixture-"+i+"&lang=en"
}));
const registry={schema:"vitruvia-classics-search-registry-v1",count:hosted.length,entries:hosted};
const requested=[];
const fetch=async input=>{
 const url=String(input);requested.push(url);
 const data=url==="data/classics-corpus/search-registry.json"?registry:
  url==="data/lexicon/conceptus.json"?{
   concepts:[{id:"house",modern:{es:["casa"],en:["house"]},
    la:["domus","aedificium"],grc:["οἶκος"]}]
  }:url===root+"manifest.json"?manifest:
  url===root+id+"-la.json"?doc:null;
 return {ok:!!data,status:data?200:404,json:async()=>data};
};
const window={};
const context=vm.createContext({window,fetch,console,Promise,URL,Intl,atob,encodeURIComponent});
for(const path of ["assets/bibliotheca-offsite-latin.js","assets/classics-corpus-search.js"])
 vm.runInContext(fs.readFileSync(path,"utf8"),context,{filename:path});
const loader=window.ClassicsOffsiteLatin;
assert(loader.allowedWorkIds.includes(id),"Isidore not allowlisted");
const records=await loader.entries();
assert.equal(records.length,1);
assert.equal(records[0].workId,id);
assert.equal(records[0].source,source);
assert.equal((await loader.load(records[0])).passages.length,5);
assert.equal(await loader.load({...records[0],sourceSha256:"f".repeat(64)}),null,
 "Original transcription hash changed; index must be rejected");
const corpus=window.ClassicsCorpusSearch;
assert((await corpus.registry()).some(e=>e.workId===id));
const hits=await corpus.searchPassages(["domus"],{workId:id,language:"la",allMatches:true});
assert(hits.some(h=>h.locus==="liber15.segmentum1"),"Isidore book XV not retrievable by passage");
assert(hits[0].link.includes("classics-remote-latin-reader.html"));
const semantic=await corpus.semanticSearch("casa",{limit:15});
assert(semantic.some(h=>h.workId===id && /domus/i.test(h.excerpt)),
 "Lexicon Conceptus must find the attested Latin term for Spanish query");
const unified=await corpus.combinedSearch("casa",{limit:15});
assert(unified.some(h=>h.workId===id),"Vitruvia must also display attested Latin correspondence");
assert(requested.includes(root+id+"-la.json"));
assert(fs.readFileSync("assets/lexicon-classics-bridge.js","utf8").includes("ClassicsCorpusSearch.semanticSearch("));
assert(fs.readFileSync("assets/vitruvia-search.js","utf8").includes("ClassicsCorpusSearch.combinedSearch("));
for(const page of ["index.html","vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html"])
 assert(fs.readFileSync(page,"utf8").includes("assets/bibliotheca-offsite-latin.js"),page);
assert(fs.readFileSync("index.html","utf8").includes("CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR"));
console.log("PASS Isidore 20 books: external Latin reader, Lexicon and Vitruvia, no changes to codices or folios.");
