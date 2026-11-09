import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const id="siculus-flaccus";
const origin="https://la.wikisource.org/wiki/De_condicionibus_agrorum";
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-latinos-20261108/data/offsite-latin/";
const sha="47467398bd7b44b32ea84360ef23b231e2cf6f321daf6b2d0988f1beeca14e91";
const entry={workId:id,author:"Sículo Flaco",title:"De condicionibus agrorum",language:"la",
 path:"data/offsite-latin/siculus-flaccus-la.json",source:origin,sourceSha256:sha,passages:31};
const manifest={schema:"vitruvius-offsite-latin-originals-manifest-v1",
 branch:"corpus-originales-latinos-20261108",count:1,entries:[entry]};
const passages=Array.from({length:31},(_,i)=>({
 locus:"sectio."+(i+1),
 text:i===0?"Condiciones agrorum per totam Italiam diversas esse plerisque hominibus notum est."
     :"Agri et fines Romanorum per provincias dividuntur "+(i+1)+"."
}));
const book={schema:"vitruvius-offsite-latin-original-v1",workId:id,language:"la",
 sourceSha256:sha,sourceLicense:"Wikisource CC BY-SA 4.0",manuscriptCollated:false,passages};
const local={schema:"vitruvia-classics-search-registry-v1",count:14,entries:Array.from({length:14},(_,i)=>({
 workId:"fixture-"+i,language:"en",author:"Fixture",title:"Fixture "+i,
 path:"data/classics-corpus/fixture-"+i+"-en.json",format:"json-passages",
 reader:"classics-text-reader.html?work=fixture-"+i+"&lang=en"
}))};
const requested=[];
const fetch=async x=>{
 const url=String(x);requested.push(url);
 const data=url===root+"manifest.json"?manifest:url===root+id+"-la.json"?book:
   url==="data/classics-corpus/search-registry.json"?local:
   url==="data/lexicon/conceptus.json"?{concepts:[]}:null;
 return {ok:!!data,status:data?200:404,json:async()=>data};
};
const window={};
const ctx=vm.createContext({window,fetch,console,Promise,URL,Intl,atob,encodeURIComponent});
for(const path of ["assets/bibliotheca-offsite-latin.js","assets/classics-corpus-search.js"])
 vm.runInContext(fs.readFileSync(path,"utf8"),ctx,{filename:path});
const rows=await window.ClassicsOffsiteLatin.entries();
assert.equal(rows.length,1);
assert.equal(rows[0].workId,id);
assert.equal(rows[0].source,origin);
assert.equal(rows[0].reader,"classics-remote-latin-reader.html?work="+id);
assert.equal((await window.ClassicsOffsiteLatin.load(rows[0])).passages.length,31);
assert.equal(await window.ClassicsOffsiteLatin.load({...rows[0],sourceSha256:"f".repeat(64)}),null);
const all=await window.ClassicsCorpusSearch.registry();
assert(all.some(x=>x.workId===id));
const hits=await window.ClassicsCorpusSearch.searchPassages(["agrorum"],{
 workId:id,language:"la",allMatches:true,includeFullText:true
});
assert(hits.some(x=>x.locus==="sectio.1"),"Original Latin phrase should be recoverable");
assert(hits[0].link.includes("classics-remote-latin-reader.html"));
for(const page of ["index.html","vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html"])
 assert(fs.readFileSync(page,"utf8").includes("assets/bibliotheca-offsite-latin.js"),page);
assert(requested.includes(root+id+"-la.json"));
console.log("PASS: Siculus Flaccus external original, 31 sections, source and SHA, shared reader/search.");
