#!/usr/bin/env node
/**
 * Gate new editions and translations through the REAL lexical manifests.
 * No OCR, translation generation, source editing or R2 mutations.
 */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>JSON.parse(readFileSync(path,"utf8"));
const registry=read("data/classics-corpus/search-registry.json");
const local=read("data/index/classics/manifest.json");
const remote=read("data/r2/corpus-manifest.json");
const remoteIndex=read("data/index/classics-r2/manifest.json");
assert(Array.isArray(registry.entries)&&registry.count===registry.entries.length,"Search registry count stale");
const localIndex=new Map();
for(const row of local.index){
 const key=[row.id,row.lang,row.file].join("|");
 if(localIndex.has(key)) {
   // Indexed alternate fields may share one file; count it as an indexed edition, not a new work.
   continue;
 }
 localIndex.set(key,row);
}
const r2Index=new Map(remoteIndex.index.map(row=>[[row.id,row.lang,row.file].join("|"),row]));
const r2Sources=new Map(remote.obras.map(row=>[[row.workId,row.language,remote.base+row.archivo].join("|"),row]));
const failures=[];
const indexedLanguages=new Map();
const seen=new Set();
let localChecked=0,remoteChecked=0;
for(const entry of registry.entries){
 if(entry.format!=="json-passages") continue; // HTML readers are searchable through their separate text-word gate.
 const key=[entry.workId,entry.language,entry.path].join("|");
 if(seen.has(key))failures.push("Duplicate registered edition: "+key);
 seen.add(key);
 const isRemote=entry.path.startsWith(remote.base);
 const indexed=(isRemote?r2Index:localIndex).get(key);
 if(!indexed){
   failures.push("Edition registered but not indexed: "+key);
   continue;
 }
 if(indexed.passages<1)failures.push("Empty lexical index: "+key);
 if(isRemote){
   remoteChecked++;
   const original=r2Sources.get(key);
   if(!original) failures.push("Remote index lacks original source: "+key);
   else if(indexed.sha256!==original.sha256||indexed.passages!==original.pasajes)
      failures.push("R2 index/source mismatch: "+key);
 }else{
   localChecked++;
   if(!existsSync(entry.path)){failures.push("Missing local text: "+entry.path);continue;}
   const original=read(entry.path);
   if(original.language!==entry.language || (original.workId!==entry.workId && original.workId!==entry.sourceWorkId))
     failures.push("Text metadata mismatch: "+key);
   if(!Array.isArray(original.passages)||original.passages.length<1 ||
      !original.passages.every(p=>String(p.locus||"").trim()&&String(p.text||"").trim()))
     failures.push("Empty or unaddressable source passages: "+key);
   if(indexed.passages!==original.passages?.length)
     failures.push("Index/source passage count mismatch: "+key);
 }
 if(!indexedLanguages.has(entry.workId))indexedLanguages.set(entry.workId,new Set());
 indexedLanguages.get(entry.workId).add(entry.language);
}
const pairs=[...indexedLanguages].filter(([id,langs])=>
 (langs.has("grc")||langs.has("la"))&&["en","es","fr"].some(lang=>langs.has(lang)));
const summary={
 registeredVersions:registry.entries.length,
 localStructuredEditionsChecked:localChecked,
 remoteOriginalsChecked:remoteChecked,
 worksWithIndexedOriginalAndTranslation:pairs.length,
 note:"Presence at work level only; does not certify one-to-one locus/word alignment, translator provenance or philological equivalence.",
 errors:failures
};
console.log(JSON.stringify(summary,null,2));
if(failures.length)process.exitCode=1;
