import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const registry=JSON.parse(fs.readFileSync("data/classics-corpus/search-registry.json","utf8"));
const root="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-griegos-20261108/data/offsite-originals/";
const path=root+"ps-aristotle-mechanica-grc.json";
const source="https://raw.githubusercontent.com/OpenGreekAndLatin/First1KGreek/master/data/tlg0086/tlg023/tlg0086.tlg023.1st1K-grc1.xml";
const entry={
 workId:"ps-aristotle-mechanica",author:"Pseudo-Aristóteles",title:"Μηχανικά",
 language:"grc",format:"remote-json-passages",path,reader:"classics-remote-text-reader.html?work=ps-aristotle-mechanica",
 sourceSha256:"1".repeat(64),source,attribution:"Bekker (1837) · Open Greek and Latin",
 bloom:null
};
const text={
 schema:"vitruvius-offsite-greek-original-v1",workId:entry.workId,
 language:"grc",sourceSha256:entry.sourceSha256,
 passages:[{locus:"0.1",text:"Ὁ λόγος τῆς τέχνης εἶναι."},
 {locus:"0.2",text:"Τὰ μηχανικὰ θαύματα εἶναι."}]
};
const manifest={
 schema:"vitruvius-offsite-greek-originals-manifest-v1",branch:"corpus-originales-griegos-20261108",
 count:1,entries:[{
  workId:entry.workId,author:entry.author,title:entry.title,language:entry.language,
  path:"data/offsite-originals/"+entry.workId+"-grc.json",
  sourceSha256:entry.sourceSha256,source,passages:2,attribution:entry.attribution
 }]
};
const requests=[];
const fetch=async url=>{
 requests.push(url);
 const obj=url==="data/classics-corpus/search-registry.json"?registry:
   url===root+"manifest.json"?manifest:url===path?text:null;
 return {ok:!!obj,status:obj?200:404,json:async()=>obj};
};
const window={};
const ctx=vm.createContext({window,fetch,console,URL,atob,encodeURIComponent,Promise,Intl});
for(const file of ["assets/bibliotheca-offsite-greek.js","assets/bibliotheca-corpus-search.js"])
 vm.runInContext(fs.readFileSync(file,"utf8"),ctx,{filename:file});
const remote=await window.ClassicsOffsiteGreek.entries();
assert.equal(remote.length,1);
assert.equal(remote[0].path,path);
assert.equal((await window.ClassicsCorpusSearch.registry()).length,
 registry.entries.filter(x=>x.workId==="vitruvius"||["la","grc","en"].includes(x.language)).length+1);
const matches=await window.ClassicsCorpusSearch.searchPassages(["λόγος"],{
 workId:entry.workId,language:"grc",includeFullText:true,allMatches:true
});
assert.equal(matches.length,1,"Actual remote Greek passages must be searchable");
assert.equal(matches[0].locus,"0.1");
assert.ok(matches[0].link.includes("classics-remote-text-reader.html"));
assert.ok(matches[0].link.includes("locus=0.1"));
assert.ok(matches[0].passageText.includes("λόγος"));
assert.ok(requests.includes(path));
const bogus={...entry,sourceSha256:"2".repeat(64)};
assert.equal(await window.ClassicsOffsiteGreek.load(bogus),null,"Do not silently use an unverified TEI digest");
const html=fs.readFileSync("classics-remote-text-reader.html","utf8");
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,1);
new vm.Script(inline[0][1],{filename:"classics-remote-text-reader.inline.js"});
for(const id of ["work-title","work-meta","provenance","passages","next","previous"])
 assert.ok(html.includes('id="'+id+'"'));
assert.ok(fs.readFileSync("bibliotheca-graeca-latina.html","utf8").includes("assets/bibliotheca-offsite-greek.js"));
assert.ok(fs.readFileSync("assets/bibliotheca-simple.js","utf8").includes("ClassicsOffsiteGreek?.entries()"));
console.log("PASS: scholarly remote Greek original indexed and linked to Bibliotheca viewer, without a local PDF or facsimile.");
