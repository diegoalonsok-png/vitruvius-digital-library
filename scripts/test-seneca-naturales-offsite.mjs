import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const id="seneca-naturales";
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-latinos-20261108/data/offsite-latin/";
const source="https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/sen/sen.qn1.txt";
const hash="a".repeat(64);
const passages=[
 {locus:"liber1.segmentum1",sectionLabelTranscribed:"1",text:"Natura rerum causas contemplamur."},
 ...Array.from({length:4},(_,i)=>({
  locus:"liber1.segmentum"+(i+2),sectionLabelTranscribed:String(i+2),
  text:"Seneca de caelis et rebus naturalibus disputat."
 }))
];
const manifest={
 schema:"vitruvius-offsite-latin-originals-manifest-v1",
 branch:"corpus-originales-latinos-20261108",count:1,
 entries:[{workId:id,author:"Séneca",title:"Naturales quaestiones",
   language:"la",source,sourceSha256:hash,passages:5,
   path:"data/offsite-latin/"+id+"-la.json"}]
};
const book={
 schema:"vitruvius-offsite-latin-original-v1",
 workId:id,language:"la",sourceSha256:hash,passages
};
const entries=Array.from({length:14},(_,i)=>({
 workId:"fixture-"+i,author:"Fixture",title:"Test "+i,
 language:"la",format:"json-passages",
 path:"data/classics-corpus/fixture-"+i+"-la.json",
 reader:"classics-text-reader.html?work=fixture-"+i+"&lang=la"
}));
const registry={schema:"vitruvia-classics-search-registry-v1",count:entries.length,entries};
const requests=[];
const fetch=async input=>{
 const path=String(input);requests.push(path);
 const value=path==="data/classics-corpus/search-registry.json"?registry:
  path==="data/lexicon/conceptus.json"?{
   concepts:[{id:"nature",modern:{en:["nature"],es:["naturaleza"]},
     la:["natura"],grc:["φύσις"]}]
  }:path===root+"manifest.json"?manifest:
  path===root+id+"-la.json"?book:
  path.startsWith("data/classics-corpus/fixture-")?{
   passages:[{locus:"1",text:"Sermo antiquus sine argumento naturali."}]
  }:null;
 return {ok:!!value,status:value?200:404,json:async()=>value};
};
const context=vm.createContext({window:{},fetch,console,URL,Promise,Intl,atob,encodeURIComponent});
for(const path of ["assets/bibliotheca-offsite-latin.js","assets/classics-corpus-search.js"])
 vm.runInContext(fs.readFileSync(path,"utf8"),context,{filename:path});
const loader=context.window.ClassicsOffsiteLatin;
assert(loader.allowedWorkIds.includes(id),"The added Latin work must be allowlisted");
const works=await loader.entries();
assert.equal(works.length,1);
assert.equal(works[0].workId,id);
assert.equal(works[0].source,source);
assert.equal((await loader.load(works[0])).passages.length,5);
assert.equal(await loader.load({...works[0],sourceSha256:"b".repeat(64)}),null);
const engine=context.window.ClassicsCorpusSearch;
assert((await engine.registry()).some(e=>e.workId===id));
const literal=await engine.searchPassages(["natura"],{
 workId:id,language:"la",allMatches:true
});
assert(literal.some(p=>p.locus==="liber1.segmentum1"),
 "Attested term must resolve to a real original-language passage");
const semantic=await engine.semanticSearch("nature",{limit:10});
assert(semantic.some(p=>p.workId===id && /natura/i.test(p.excerpt)),
 "Conceptus should retrieve Latin attestations without inventing alignment");
const combined=await engine.combinedSearch("nature",{limit:10});
assert(combined.some(p=>p.workId===id),
 "Vitruvia unified search should include the newly indexed Latin original");
assert(requests.includes(root+id+"-la.json"));
const lexicon=fs.readFileSync("assets/lexicon-classics-bridge.js","utf8");
assert(lexicon.includes("ClassicsCorpusSearch.semanticSearch("));
assert(lexicon.includes("ClassicsCorpusSearch.searchPassages("));
const vitruvia=fs.readFileSync("assets/vitruvia-search.js","utf8");
assert(vitruvia.includes("ClassicsCorpusSearch.combinedSearch("));
for(const page of ["vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html"]){
 assert(fs.readFileSync(page,"utf8").includes("assets/bibliotheca-offsite-latin.js"),
  "Shared loader absent: "+page);
}
assert(fs.readFileSync("index.html","utf8").includes("CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR"));
console.log("PASS: Seneca source attached to Bibliotheca, Lexicon and Vitruvia without changing Vitruvian originals.");
