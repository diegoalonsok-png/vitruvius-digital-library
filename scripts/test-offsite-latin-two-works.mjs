import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ids=["velleius-historia","frontinus-gromatica"];
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-latinos-20261108/data/offsite-latin/";
const source={
 "velleius-historia":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/vell1.txt",
 "frontinus-gromatica":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/frontinus/qualitate.txt"
};
const hash=Object.fromEntries(ids.map((id,i)=>[id,String.fromCharCode(97+i).repeat(64)]));
const entries=ids.map(id=>({
 workId:id,author:id,title:id,language:"la",source:source[id],
 path:"data/offsite-latin/"+id+"-la.json",sourceSha256:hash[id],passages:5
}));
const manifest={
 schema:"vitruvius-offsite-latin-originals-manifest-v1",
 branch:"corpus-originales-latinos-20261108",count:2,entries
};
const samples={
 "velleius-historia":"Imperium Romanum et res publica in historiis.",
 "frontinus-gromatica":"Ager et terra mensura distinguuntur."
};
const docs=Object.fromEntries(ids.map(id=>[root+id+"-la.json",{
 schema:"vitruvius-offsite-latin-original-v1",language:"la",workId:id,
 sourceSha256:hash[id],passages:Array.from({length:5},(_,i)=>({
  locus:id==="velleius-historia"?"liber1.caput"+(i+1):"opusculum1.segmentum"+(i+1),
  text:i===0?samples[id]:"Textus Latinus qui in fonte extat.",
 }))
}]));
const hosted=Array.from({length:14},(_,i)=>({
 workId:"fixture-"+i,language:"en",author:"Fixture",title:"Fixture "+i,
 path:"data/classics-corpus/fixture-"+i+"-en.json",
 format:"json-passages",reader:"classics-text-reader.html?work=fixture-"+i+"&lang=en"
}));
const registry={schema:"vitruvia-classics-search-registry-v1",count:hosted.length,entries:hosted};
const requests=[];
const fetch=async path=>{
 path=String(path);requests.push(path);
 const value=path===root+"manifest.json"?manifest:
  path==="data/classics-corpus/search-registry.json"?registry:
  path==="data/lexicon/conceptus.json"?{
   concepts:[{id:"land",modern:{es:["tierra"],en:["land"]},la:["ager","terra"],grc:["γῆ"]}]
  }:docs[path];
 return {ok:!!value,status:value?200:404,json:async()=>value};
};
const window={};
const context=vm.createContext({window,fetch,console,URL,Promise,Intl,atob,encodeURIComponent});
for(const path of ["assets/bibliotheca-offsite-latin.js","assets/classics-corpus-search.js"])
 vm.runInContext(fs.readFileSync(path,"utf8"),context,{filename:path});
const loader=window.ClassicsOffsiteLatin;
const allowed=new Set(loader.allowedWorkIds);
for(const id of ids)assert(allowed.has(id),"Unlisted original: "+id);
const indexed=await loader.entries();
assert.equal(indexed.length,2);
for(const e of indexed){
 assert.equal(e.language,"la");
 assert.equal(e.format,"remote-json-passages");
 assert.equal(e.source,source[e.workId]);
 assert.equal((await loader.load(e)).passages.length,5);
 assert.equal(await loader.load({...e,sourceSha256:"f".repeat(64)}),null,
  "A changed source hash must never be accepted");
}
const engine=window.ClassicsCorpusSearch;
const all=await engine.registry();
assert(ids.every(id=>all.some(e=>e.workId===id)));
const velleius=await engine.searchPassages(["imperium"],{
 workId:"velleius-historia",language:"la",allMatches:true
});
assert(velleius.some(x=>x.locus==="liber1.caput1"),"Velleius literal chapter not found");
assert(velleius[0].link.includes("classics-remote-latin-reader.html"));
const frontinus=await engine.semanticSearch("land",{limit:16});
assert(frontinus.some(x=>x.workId==="frontinus-gromatica"),
 "Documented Latin form ager must be found in the shared Conceptus index");
const combined=await engine.combinedSearch("land",{limit:16});
assert(combined.some(x=>x.workId==="frontinus-gromatica"),
 "Vitruvia must expose Conceptus-supported results");
const bridge=fs.readFileSync("assets/lexicon-classics-bridge.js","utf8");
assert(bridge.includes("ClassicsCorpusSearch.semanticSearch("));
assert(bridge.includes("ClassicsCorpusSearch.searchPassages("));
assert(fs.readFileSync("assets/vitruvia-search.js","utf8").includes("ClassicsCorpusSearch.combinedSearch("));
for(const page of ["index.html","vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html"]){
 assert(fs.readFileSync(page,"utf8").includes("assets/bibliotheca-offsite-latin.js"),page);
}
assert(fs.readFileSync("index.html","utf8").includes("CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR"));
assert(requests.includes(root+"velleius-historia-la.json"));
assert(requests.includes(root+"frontinus-gromatica-la.json"));
console.log("PASS two Latin classical works through Bibliotheca, Lexicon, Vitruvia; protected Vitruvian originals unchanged.");
