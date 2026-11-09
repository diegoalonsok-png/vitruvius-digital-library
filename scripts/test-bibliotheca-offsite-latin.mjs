import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Reproducible fixture: no network, no claim of actual manuscript collation.
const hosted=JSON.parse(fs.readFileSync("data/classics-corpus/search-registry.json","utf8"));
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-griegos-20261108/data/offsite-originals/";
const upstream="https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/stoa0255/";
const latin=[
 {id:"seneca-de-ira",urn:"stoa010",source:"stoa0255.stoa010.perseus-lat2.xml",title:"De ira",
  passages:[{locus:"1.1",text:"Ira est cupiditas puniendi et causa animi."},{locus:"1.2",text:"Ratio atque virtus naturam regunt."},{locus:"1.3",text:"Sapientia rerum providentia est."},{locus:"1.4",text:"Filosophia bonum vitae quaerit."},{locus:"1.5",text:"Mens humana consilium tenet."}]},
 {id:"seneca-de-tranquillitate",urn:"stoa013",source:"stoa0255.stoa013.perseus-lat2.xml",title:"De tranquillitate animi",
  passages:[{locus:"2.1",text:"Tranquillitas animi summa cura est."},{locus:"2.2",text:"Ratio non semper quieta manet."},{locus:"2.3",text:"Anima saepe consilium petit."},{locus:"2.4",text:"Fides et patientia bona sunt."},{locus:"2.5",text:"Sapientia curam moderatur."}]}
];
const fixture={
 schema:"vitruvius-offsite-latin-originals-manifest-v1",
 branch:"corpus-originales-griegos-20261108",count:2,
 entries:latin.map(e=>({workId:e.id,author:"Séneca",title:e.title,language:"la",
  path:"data/offsite-originals/"+e.id+"-la.json",passages:5,
  source:upstream+e.urn+"/"+e.source,sourceSha256:"a".repeat(64)}))
};
const contents=new Map(latin.map(e=>[root+e.id+"-la.json",{
 schema:"vitruvius-offsite-latin-original-v1",workId:e.id,language:"la",
 sourceSha256:"a".repeat(64),attribution:"Séneca · Basore · Perseus",passages:e.passages
}]));
const fetch=async url=>{
 const data=url===root+"latin-manifest.json"?fixture:
  url==="data/classics-corpus/search-registry.json"?hosted:
  url==="data/lexicon/conceptus.json"?{concepts:[{
   id:"ira",modern:{es:["ira"]},la:["ira"],grc:[]
  }]}:contents.get(url);
 return {ok:!!data,status:data?200:404,json:async()=>data};
};
for(const engine of ["assets/classics-corpus-search.js","assets/bibliotheca-corpus-search.js"]){
 const window={};
 const context=vm.createContext({window,fetch,console,URL,Promise,Intl,atob,encodeURIComponent});
 for(const file of ["assets/bibliotheca-offsite-latin.js",engine])
  vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
 const remote=await window.ClassicsOffsiteLatin.entries();
 assert.equal(remote.length,2,"Both original Latin works must be present, not just a catalogue row");
 const bogus={...remote[0],sourceSha256:"0".repeat(64)};
 assert.equal(await window.ClassicsOffsiteLatin.load(bogus),null,"Reject source hash mismatch");
 const registry=await window.ClassicsCorpusSearch.registry();
 assert.ok(registry.some(x=>x.workId==="seneca-de-ira"&&x.language==="la"));
 assert.ok(registry.some(x=>x.workId==="seneca-de-tranquillitate"&&x.language==="la"));
 const rows=await window.ClassicsCorpusSearch.searchPassages(["ira"],{
  workId:"seneca-de-ira",language:"la",allMatches:true,includeFullText:true
 });
 assert.equal(rows.length,1,engine+" must find the attested Latin passage");
 assert.equal(rows[0].locus,"1.1");
 assert.ok(rows[0].link.includes("classics-remote-latin-reader.html"));
 assert.ok(rows[0].link.includes("locus=1.1"));
 assert.ok((rows[0].passageText||rows[0].excerpt).includes("Ira"));
 const semantic=await window.ClassicsCorpusSearch.semanticSearch("ira",{limit:20});
 assert.ok(semantic.some(x=>x.workId==="seneca-de-ira"),
  "Attested Conceptus search must reach independently hosted Latin");
}
const html=fs.readFileSync("classics-remote-latin-reader.html","utf8");
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,1);
new vm.Script(inline[0][1],{filename:"latin-reader-inline.js"});
assert.ok(html.includes("window.ClassicsOffsiteLatin.load"));
assert.ok(html.includes('unit.lang="la"'));
assert.ok(html.includes("bibliotheca-graeca-latina.html"));
for(const file of ["bibliotheca-graeca-latina.html","vitruvia.html","vitruvia-lexicon.html"]){
 const text=fs.readFileSync(file,"utf8");
 const loader=text.indexOf("assets/bibliotheca-offsite-latin.js");
 const engine=text.indexOf("assets/"+(file==="bibliotheca-graeca-latina.html"?"bibliotheca-corpus-search.js":"classics-corpus-search.js"));
 assert.ok(loader>=0&&engine>loader,"Latin loader must precede search engine in "+file);
}
const bibliotheca=fs.readFileSync("assets/bibliotheca-simple.js","utf8");
assert.ok(bibliotheca.includes("ClassicsOffsiteLatin?.entries()"));
console.log("PASS Latin TEI external linkage in Bibliotheca, Vitruvia, Lexicon; no source/folio deletion.");
