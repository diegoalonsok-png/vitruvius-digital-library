#!/usr/bin/env node
/* Read-only audit of recent classic editions, manifest parity and machine translation policy. */
import assert from "node:assert/strict";
import {readFileSync,existsSync,mkdirSync,writeFileSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const reg=read("data/classics-corpus/search-registry.json");
const idx=read("data/index/classics/manifest.json");
const r2idx=read("data/index/classics-r2/manifest.json");
const r2=read("data/r2/corpus-manifest.json");
const main=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const supplement=read("data/bibliotheca-expansion-publicada-2026-11-16.json").works;
const catalog=new Map([...main,...supplement].map(w=>[w.id,w]));
const local=new Set(idx.index.map(e=>e.id+"|"+e.lang));
const remote=new Set(r2idx.index.map(e=>e.id+"|"+e.lang));
const recent=[
 ["apollonius-conica","grc"],["aristarchus-magnitudines","grc"],
 ["geminus-isagoge","grc"],["pappus-synagoge","grc"],
 ["apuleius-de-deo-socratis","la"],["censorinus-die-natali","la"],
 ["isidore-etymologiae","la"],["seneca-naturales","la"],
 ["velleius-historia","la"]
];
const verified=[];
for(const [id,lang] of recent){
 const work=catalog.get(id);
 assert(work,"Missing catalogue record "+id);
 const row=reg.entries.filter(e=>e.workId===id&&e.language===lang&&e.format==="json-passages");
 assert.equal(row.length,1,"Missing/duplicate registered edition "+id);
 const item=row[0];
 assert(item.path.startsWith("data/classics-corpus/")&&existsSync(item.path),"Missing edition source "+id);
 const text=read(item.path);
 assert.equal(text.workId,id);assert.equal(text.language,lang);
 assert(Array.isArray(text.passages)&&text.passages.length>0,"No source passages "+id);
 assert(local.has(id+"|"+lang),"Missing lexical index "+id);
 assert(idx.index.some(e=>e.id===id&&e.lang===lang&&e.passages===text.passages.length),
  "Lexical index passage count mismatch "+id);
 const declared=work.corpusFiles?.[lang]||work.localVersions?.find(v=>v.language===lang)?.path;
 assert.equal(declared,item.path,"Catalogue edition differs "+id);
 assert.equal(item.reader,"classics-text-reader.html?work="+id+"&lang="+lang);
 verified.push({id,lang,passages:text.passages.length,reader:item.reader,indexed:true});
}
const remoteRegistered=reg.entries.filter(e=>e.path.startsWith(r2.base));
const r2Files=new Map(r2.obras.map(e=>[r2.base+e.archivo,e]));
assert.equal(remoteRegistered.length,r2idx.index.length,"Remote index and registry cardinality mismatch");
for(const e of remoteRegistered){
 const obj=r2Files.get(e.path);
 assert(obj&&obj.workId===e.workId&&obj.language===e.language,"R2 manifest mismatched "+e.workId);
 assert(remote.has(e.workId+"|"+e.language),"R2 lexical index missing "+e.workId);
}
const diff=reg.entries.filter(e=>!local.has(e.workId+"|"+e.language));
const exceptions={remoteR2:0,criticalIndices:0,structuredVitruvius:0,unclassified:[]};
for(const e of diff){
 if(e.path.startsWith(r2.base)&&remote.has(e.workId+"|"+e.language))exceptions.remoteR2++;
 else if(e.format==="critical-indexed-latin"&&
  ["krohn-1912-indexed","rose-1899-indexed"].includes(e.workId)&&existsSync(e.path))exceptions.criticalIndices++;
 else if(e.workId==="vitruvius"&&e.format==="structured-bilingual"&&existsSync(e.path))exceptions.structuredVitruvius++;
 else exceptions.unclassified.push({id:e.workId,language:e.language,path:e.path,format:e.format});
}
assert.equal(exceptions.unclassified.length,0,"Unclassified source without lexical entry");
const search=readFileSync("assets/bibliotheca-work-search.js","utf8");
const explorer=readFileSync("assets/bibliotheca-works-explorer.js","utf8");
const reader=readFileSync("assets/classics-text-reader.js","utf8");
const page=readFileSync("bibliotheca-graeca-latina.html","utf8");
assert(search.includes('fetch("data/classics-corpus/search-registry.json")'),"Work search missing registry");
assert(search.includes('fetch("data/bibliotheca-expansion-publicada-2026-11-16.json")'),
 "Work search missing supplementary catalogue");
assert(explorer.includes("data/index/classics/manifest.json"),"Catalogue explorer missing index");
assert(reader.includes('fetch("data/classics-corpus/search-registry.json")'),"Reader missing registry");
assert(page.includes("assets/bibliotheca-work-search.js"),"Bibliotheca does not load work search");
const auto=readFileSync("assets/academic-inline-translation.js","utf8");
const simple=readFileSync("classics-simple-parallel.html","utf8");
assert(auto.includes("Traducción automática")&&auto.includes("orientativ"),
 "Automatic output must be explicitly qualified");
assert(auto.includes('source==="grc"?"el":source'),"Greek modern fallback policy changed");
assert(auto.includes("suspiciousGreekRomanization"),"Romanization rejection removed");
assert(simple.includes("Traducción automática orientativa"),
 "Simplified reader must distinguish machine translation");
const report={
 schema:"bibliotheca-acquisitions-index-quality-audit-v1",
 scope:"Manifest and code only; live JS browser interactions not demonstrated",
 registryEntries:reg.entries.length,localLexicalEditions:idx.index.length,
 r2LexicalEditions:r2idx.index.length,
 recentAcquisitions:verified,registryEntriesOutsideLocalIndex:exceptions,
 bibliotheca:{workSearchLoaded:true,catalogueAndSupplementLoaded:true,
  readerUsesRegistry:true,liveBrowserTest:"NOT COMPLETED"},
 machineTranslation:{qualityCertified:false,
  status:"Orientative only; not an accredited historical translation",
  ancientGreekUsesModernGreekModel:true,
  limitations:["Greek grammatical moods and negations","technical vocabulary","Latin polysemy",
               "historical context","partial passages and provider variability"],
  recommendation:"Prefer attested historical EN, then FR, then ES, when available"}
};
const out="reports/bibliotheca/acquisitions-index-translation-quality-2026-11-20.json";
mkdirSync("reports/bibliotheca",{recursive:true});
writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({recentIndexed:verified.length,local:idx.index.length,remote:r2idx.index.length,
 exceptions,autoTranslationQuality:"not certified"},null,2));
