import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ids=[
 "seneca-de-ira","seneca-de-tranquillitate",
 "apuleius-de-deo-socratis","censorinus-die-natali","vegetius-epitoma"
];
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-latinos-20261108/data/offsite-latin/";
const source={
 "seneca-de-ira":"https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/stoa0255/stoa010/stoa0255.stoa010.perseus-lat2.xml",
 "seneca-de-tranquillitate":"https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/stoa0255/stoa013/stoa0255.stoa013.perseus-lat2.xml",
 "apuleius-de-deo-socratis":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/apuleius/apuleius.deosocratis.txt",
 "censorinus-die-natali":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/censorinus.txt",
 "vegetius-epitoma":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/vegetius1.txt"
};
const hashes=Object.fromEntries(ids.map((id,i)=>[id,String(i+1).repeat(64)]));
const entries=ids.map(id=>({
 workId:id,author:id,title:id,language:"la",source:source[id],
 path:"data/offsite-latin/"+id+"-la.json",
 passages:5,sourceSha256:hashes[id],
 attribution:"Transcripción documentada; sin cotejo manuscrito",
}));
const manifest={
 schema:"vitruvius-offsite-latin-originals-manifest-v1",
 branch:"corpus-originales-latinos-20261108",
 count:5,entries,
};
const books=Object.fromEntries(ids.map(id=>[root+id+"-la.json",{
 schema:"vitruvius-offsite-latin-original-v1",
 language:"la",workId:id,sourceSha256:hashes[id],
 passages:Array.from({length:5},(_,i)=>({
  locus:"liber1.segmentum"+(i+1),
  text:i===0?"Plato est in philosophia et sapientia":("testimonium latinum "+i)
 })),
}]));
const registry=JSON.parse(fs.readFileSync("data/classics-corpus/search-registry.json","utf8"));
const requested=[];
const fetch=async request=>{
 const url=String(request);requested.push(url);
 const data=url===root+"manifest.json"?manifest:
  url==="data/classics-corpus/search-registry.json"?registry:
  url==="data/lexicon/conceptus.json"?{
   concepts:[{id:"philosophy",modern:{en:["philosophy"],es:["filosofía"]},la:["plato"],grc:[]}]
  }:books[url];
 return {ok:!!data,status:data?200:404,json:async()=>data};
};
const window={};
const ctx=vm.createContext({window,fetch,console,Promise,URL,atob,encodeURIComponent,Intl});
for(const script of ["assets/bibliotheca-offsite-latin.js","assets/classics-corpus-search.js"])
 vm.runInContext(fs.readFileSync(script,"utf-8"),ctx,{filename:script});

const list=await window.ClassicsOffsiteLatin.entries();
assert.equal(list.length,5);
assert.deepEqual(new Set(list.map(x=>x.workId)),new Set(ids));
for(const e of list){
 assert.equal(e.language,"la");assert.equal(e.format,"remote-json-passages");
 assert.equal(e.source,source[e.workId]);
 assert.ok(e.reader.includes("classics-remote-latin-reader.html"));
 const book=await window.ClassicsOffsiteLatin.load(e);
 assert.equal(book.workId,e.workId);
 assert.equal(book.passages.length,5);
 assert.equal(await window.ClassicsOffsiteLatin.load({...e,sourceSha256:"f".repeat(64)}),null);
}
const reg=await window.ClassicsCorpusSearch.registry();
assert.equal(reg.length,registry.entries.length+5);
const matched=await window.ClassicsCorpusSearch.searchPassages(["plato"],{
 workId:"apuleius-de-deo-socratis",language:"la",allMatches:true,includeFullText:true
});
assert(matched.length>0,"La búsqueda debe hallar texto latino del nuevo original");
assert.equal(matched[0].locus,"liber1.segmentum1");
assert(matched[0].link.includes("classics-remote-latin-reader.html"));
const sem=await window.ClassicsCorpusSearch.semanticSearch("philosophy",{limit:30});
assert(sem.some(item=>item.workId==="apuleius-de-deo-socratis"),
 "La búsqueda de Conceptus debe encontrar originales latinos externos");
assert(requested.includes(root+"vegetius-epitoma-la.json"));
const reader=fs.readFileSync("classics-remote-latin-reader.html","utf8");
assert(reader.includes("ClassicsOffsiteLatin"));
const workflow=fs.readFileSync(".github/workflows/offsite-latin-supplement.yml","utf8");
assert(workflow.includes("corpus-originales-latinos-20261108"));
assert(workflow.includes("assert old[\"count\"]==5")===false); // no counts falsos preexistentes
assert(workflow.includes("assert old[\"count\"]==5")||workflow.includes('assert old["count"]==5'));
assert(workflow.includes("originals.items()"));
console.log("PASS: 3 latinos añadidos al manifiesto, búsqueda literal/semántica conectada, viejo Séneca protegido.");
