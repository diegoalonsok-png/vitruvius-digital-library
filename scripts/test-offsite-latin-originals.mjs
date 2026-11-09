import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const registry=JSON.parse(fs.readFileSync("data/classics-corpus/search-registry.json","utf8"));
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-latinos-20261108/data/offsite-latin/";
const id="seneca-de-ira";
const url=root+id+"-la.json";
const source="https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/stoa0255/stoa010/stoa0255.stoa010.perseus-lat2.xml";
const hash="1".repeat(64);
const passages=[
 {locus:"1.1~p1",editorialLocus:"1.1",text:"De ira disputamus: ira animus commotus est."},
 {locus:"1.1~p2",editorialLocus:"1.1",text:"Iram et rationem distinguit."},
 {locus:"1.2~p1",editorialLocus:"1.2",text:"Sapientia moderatur affectus."},
 {locus:"1.3~p1",editorialLocus:"1.3",text:"Homo naturam contemplatur."},
 {locus:"1.4~p1",editorialLocus:"1.4",text:"Ira non est recta ratio."}
];
const manifest={
 schema:"vitruvius-offsite-latin-originals-manifest-v1",
 branch:"corpus-originales-latinos-20261108",count:1,
 entries:[{workId:id,author:"Séneca",title:"De ira",language:"la",
  path:"data/offsite-latin/"+id+"-la.json",source,sourceSha256:hash,passages:5}]
};
const book={schema:"vitruvius-offsite-latin-original-v1",workId:id,
 language:"la",sourceSha256:hash,attribution:"Séneca, De ira. Basore (1928).",passages};
const requested=[];
const fetch=async input=>{
 const path=String(input);
 requested.push(path);
 const data=path==="data/classics-corpus/search-registry.json"?registry:
  path==="data/lexicon/conceptus.json"?{concepts:[{id:"anger",modern:{es:["ira"],en:["anger"]},la:["ira"],grc:[]}]}:
  path===root+"manifest.json"?manifest:path===url?book:null;
 return {ok:!!data,status:data?200:404,json:async()=>data};
};
const window={};
const context=vm.createContext({window,fetch,console,URL,atob,encodeURIComponent,Promise,Intl});
for(const path of ["assets/bibliotheca-offsite-latin.js","assets/classics-corpus-search.js"]){
 vm.runInContext(fs.readFileSync(path,"utf8"),context,{filename:path});
}
const entries=await window.ClassicsOffsiteLatin.entries();
assert.equal(entries.length,1);
assert.equal(entries[0].language,"la");
assert.equal(entries[0].format,"remote-json-passages");
assert.equal(await window.ClassicsOffsiteLatin.load({...entries[0],sourceSha256:"2".repeat(64)}),null);
const full=await window.ClassicsCorpusSearch.registry();
assert.equal(full.length,registry.entries.length+1);
const hits=await window.ClassicsCorpusSearch.searchPassages(["ira"],{
 workId:id,language:"la",allMatches:true,includeFullText:true
});
assert.ok(hits.length>0,"Latin passage retrieval must find attested word");
assert.equal(hits[0].locus,"1.1~p1");
assert.ok(hits[0].link.includes("classics-remote-latin-reader.html"));
assert.ok(hits[0].link.includes("locus=1.1"));
assert.ok(requested.includes(url));
const conceptual=await window.ClassicsCorpusSearch.semanticSearch("anger",{limit:10});
assert.ok(conceptual.some(row=>row.workId===id),"Lexicon concept must retrieve attested Latin passage");
for(const page of ["vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html"]){
 assert.ok(fs.readFileSync(page,"utf8").includes("assets/bibliotheca-offsite-latin.js"),page+" lacks Latin loader");
}
assert.ok(fs.readFileSync("assets/bibliotheca-simple.js","utf8").includes("ClassicsOffsiteLatin?.entries()"));
const reader=fs.readFileSync("classics-remote-latin-reader.html","utf8");
const inline=[...reader.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,1);
new vm.Script(inline[0][1],{filename:"latin-reader.inline.js"});
assert.ok(reader.includes('unit.lang="la"'));
assert.ok(reader.includes("ClassicsOffsiteLatin"));
console.log("PASS protected offsite Latin TEI: corpus search, Conceptus and reader connected; no source files touched.");
