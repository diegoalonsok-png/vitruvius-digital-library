#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=path=>readFileSync(path,"utf8");
const modelScript=read("assets/vitruvia-source-model.js");
const cultureScript=read("assets/vitruvia-cultural-works.js");
const contextScript=read("assets/vitruvia-context-panel.js");
const html=read("vitruvia.html");
for(const [file,src] of [["source-model",modelScript],["culture",cultureScript],["context",contextScript]])
 new vm.Script(src,{filename:file+".js"});
const sandbox={window:{},URL};
vm.runInNewContext(modelScript,sandbox);
const model=sandbox.window.VitruviaSourceModel;
assert(model,"The generic ingestion module was not exported");

test("Universal retrieval rejects partial multiword namesakes and accepts exact identities",()=>{
 const records=[
  {type:"wikipedia",title:"Roma",link:"https://es.wikipedia.org/wiki/Roma",excerpt:"Capital de Italia"},
  {type:"wikipedia",title:"Panteón de Roma",link:"https://es.wikipedia.org/wiki/Pante%C3%B3n_de_Roma",excerpt:"Monumento romano"},
  {type:"passage",title:"Panteón de Roma · pasaje fuente",link:"https://example.edu/primary",excerpt:"Texto"},
  {type:"wikipedia",title:"Palladio",link:"https://es.wikipedia.org/wiki/Palladio",excerpt:"Arquitecto del Renacimiento"}
 ];
 const result=model.organize("Panteón de Roma",records);
 assert.equal(result.total,2);
 assert(result.records.every(x=>/Panteón/.test(x.title)));
 assert.equal(model.related({title:"Andrea Palladio",wikidataId:"Q2"},"Palladio",{qid:"Q2"}),true);
 assert.equal(model.related({title:"Andrés Palladio",wikidataId:"Q1"},"Andrea Palladio",{qid:"Q2"}),false);
});
test("Universal source ingestion deduplicates URLs/DOIs and classifies without granting endorsement",()=>{
 const records=[
  {type:"wikipedia",title:"Plato",link:"https://en.wikipedia.org/wiki/Plato?utm_source=foo",excerpt:"Philosopher"},
  {type:"wikipedia",title:"Plato",link:"https://en.wikipedia.org/wiki/Plato?utm_source=other",excerpt:"Philosopher"},
  {type:"article",title:"Plato and textual history",link:"https://journals.example.org/first",doi:"10.1234/TEST",excerpt:"Plato studies"},
  {type:"article",title:"Plato and textual history",link:"https://journals.example.org/second",doi:"10.1234/TEST",excerpt:"Plato studies"},
  {type:"museum",title:"Plato archival collection",link:"https://museum.example.org/archive",excerpt:"Collection"}
 ];
 const r=model.organize("Plato",records);
 assert.equal(r.total,3);
 assert.equal(r.records[0].category,"scholarly-record");
 assert.equal(r.records[1].category,"institution");
 assert.equal(r.records[2].category,"encyclopedia");
 assert(!JSON.stringify(r).includes("peer-reviewed"));
 assert.equal(model.organize("Unrelated",records).total,0);
 assert.equal(model.sourceType({type:"book",title:"Sample"}),"catalogue");
 assert.equal(model.sourceType({type:"passage"}),"primary");
 assert.equal(model.sourceType({type:"wikipedia"}),"encyclopedia");
});
test("All creator works receive a typed chronological date and a per-statement reference flag",()=>{
 const runtime={window:{},document:{documentElement:{lang:"es"}},URLSearchParams,URL,AbortController,setTimeout,clearTimeout};
 const source=cultureScript.replace("window.VitruviaCulturalWorks={render,catalogue,compare};",
  "window.VitruviaCulturalWorks={render,catalogue,compare,workRecord};");
 vm.runInNewContext(source,runtime);
 const make=(time,ref=false)=>({rank:"normal",mainsnak:{datavalue:{value:{time:"+"+time+"-01-01T00:00:00Z"}}},references:ref?[{snaks:{}}]:[]});
 const e=(id,desc,claims)=>({id,labels:{es:{value:"Registro "+id}},descriptions:{es:{value:desc}},claims});
 const works=runtime.window.VitruviaCulturalWorks;
 const building=works.workRecord(e("Q123","edificio",{P84:[{rank:"normal",mainsnak:{datavalue:{value:{id:"Q1"}}}}],P1619:[make("1550")],P571:[make("1540",true)]}),false);
 assert.equal(building.year,1540);
 assert.equal(building.dateKind,"inception");assert.equal(building.dateProperty,"P571");
 assert.equal(building.dateReferenced,true);
 const opening=works.workRecord(e("Q124","templo",{P1619:[make("1550")]}),false);
 assert.equal(opening.dateKind,"opening");assert.equal(opening.dateReferenced,false);
 const published=works.workRecord(e("Q125","libro",{P577:[make("1967",true)]}),true);
 assert.equal(published.dateKind,"publication");
 assert.equal(published.dateReferenced,true);
 const unknown=works.workRecord(e("Q126","obra cultural",{}),false);
 assert.equal(unknown.year,null);assert.equal(unknown.dateKind,"undated");
 assert.deepEqual(Array.from([opening,unknown,building].sort((a,b)=>works.compare(a,b,"year")),w=>w.id),["Q123","Q124","Q126"]);
});
test("Right rail reuses the ingestion model and does not borrow a homonym's first word",()=>{
 assert(contextScript.includes("ingest.organize(query,rows,entity,15)"));
 assert(contextScript.includes("sourceLedger(lastQuery,currentRows)"));
 assert(!contextScript.includes("norm(query).split(' ')[0]"));
 assert(html.includes("assets/vitruvia-source-model.js?v=20261109-universal-ingest-v1"));
 assert(html.indexOf("assets/vitruvia-source-model.js")<html.indexOf("assets/vitruvia-context-panel.js"));
 assert(html.includes("assets/vitruvia-cultural-works.js?v=20261109-typed-chronology-v1"));
});

test("DOI forms and canonical URL identity preserve academic records",()=>{
 const r=model.organize("Vitruvius",[
  {title:"Vitruvius - edición",link:"https://doi.org/10.1234/ABC"},
  {title:"Vitruvius - edición",link:"https://archive.example.org/item/123",doi:"DOI:10.1234/abc"},
  {title:"Vitruvius - edición",link:"https://archive.example.org/item/456",doi:"https://doi.org/10.1234/ABC"},
  {title:"Vitruvius codex folio",type:"manuscript",link:"https://archive.example.org/CodexA",year:null},
  {title:"Vitruvius codex folio",type:"manuscript",link:"https://archive.example.org/codexa",year:""},
  {title:"Vitruvius codex folio",type:"manuscript",link:"https://archive.example.org/CodexA?utm_source=search"}
 ]);
 assert.equal(r.total,3,"DOI variants and tracking URLs must collapse, case-sensitive paths must survive");
 assert.equal(r.records.filter(x=>x.doi==="10.1234/abc").length,1);
 assert.equal(r.records.find(x=>x.href.includes("/CodexA")).year,null,"Missing year is not the year zero");
 assert.equal(model.canonicalDOI("https://doi.org/10.1234/ABC"),"10.1234/abc");
 assert.equal(model.sourceType({link:"https://doi.org/10.1234/ABC"}),"scholarly-record");
 assert.equal(model.organize("Vitruvius",[{title:"Vitruvius",link:"https://user:password@archive.example.org/X"}]).total,0);
});
