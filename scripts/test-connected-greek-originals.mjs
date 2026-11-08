import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const registry=JSON.parse(fs.readFileSync("data/classics-corpus/search-registry.json","utf8"));
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-griegos-20261108/data/offsite-originals/";
const path=root+"ps-aristotle-mechanica-grc.json";
const upstream="https://raw.githubusercontent.com/OpenGreekAndLatin/First1KGreek/master/data/tlg0086/tlg023/tlg0086.tlg023.1st1K-grc1.xml";
const digest="1".repeat(64);
const fixture={
 manifest:{
  schema:"vitruvius-offsite-greek-originals-manifest-v1",
  branch:"corpus-originales-griegos-20261108",count:1,
  entries:[{workId:"ps-aristotle-mechanica",language:"grc",author:"Pseudo-Aristóteles",title:"Μηχανικά",
   source:upstream,sourceSha256:digest,passages:2,path:"data/offsite-originals/ps-aristotle-mechanica-grc.json"}]
 },
 book:{
  schema:"vitruvius-offsite-greek-original-v1",workId:"ps-aristotle-mechanica",
  language:"grc",sourceSha256:digest,passages:[
   {locus:"0.1",text:"Ὁ λόγος τῆς μηχανικῆς τέχνης."},
   {locus:"0.2",text:"Ἡ ἀρχὴ τῆς φύσεως."}
  ]
 }
};
const requests=[];
const fetch=async url=>{
 requests.push(url);
 const data=url==="data/classics-corpus/search-registry.json"?registry:
  url==="data/lexicon/conceptus.json"?{concepts:[{id:"mechanics",modern:{es:["mecánica"]},la:[],grc:["μηχανικῆς"]}]}:
  url===root+"manifest.json"?fixture.manifest:url===path?fixture.book:null;
 return {ok:!!data,status:data?200:404,json:async()=>data};
};
const window={};
const ctx=vm.createContext({window,fetch,URL,Promise,Intl,console,atob,encodeURIComponent});
for(const name of ["assets/bibliotheca-offsite-greek.js","assets/classics-corpus-search.js"])
 vm.runInContext(fs.readFileSync(name,"utf8"),ctx,{filename:name});
const editions=await window.ClassicsCorpusSearch.registry();
assert.equal(editions.length,registry.entries.length+1);
const hits=await window.ClassicsCorpusSearch.searchPassages(["λόγος"],{
 workId:"ps-aristotle-mechanica",language:"grc",allMatches:true
});
assert.equal(hits.length,1);
assert.equal(hits[0].locus,"0.1");
assert.ok(hits[0].excerpt.includes("λόγος"));
assert.ok(hits[0].link.includes("classics-remote-text-reader.html"));
assert.ok(hits[0].link.includes("locus=0.1"));
assert.ok(requests.includes(path));
const semantic=await window.ClassicsCorpusSearch.semanticSearch("mecánica",{limit:10});
assert.equal(semantic.length,1,"Vitruvia/Lexicon conceptual search must find the remote Greek original");
assert.equal(semantic[0].workId,"ps-aristotle-mechanica");
assert.ok(semantic[0].link.includes("locus=0.1"),"Conceptus must open the attested Greek locus");
assert.ok(semantic[0].link.includes("classics-remote-text-reader.html"));
for(const file of ["vitruvia.html","vitruvia-lexicon.html"]){
 const html=fs.readFileSync(file,"utf8");
 const offsite=html.indexOf("assets/bibliotheca-offsite-greek.js");
 const base=html.indexOf("assets/classics-corpus-search.js");
 assert.ok(offsite>=0&&base>=0&&offsite<base,"Offsite script must load before search engine: "+file);
}
console.log("PASS: both Vitruvia and Lexicon load the same verified remote Greek textual concordance by locus.");
