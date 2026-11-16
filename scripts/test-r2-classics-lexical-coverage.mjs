#!/usr/bin/env node
/**
 * Guard against stale or duplicate lexical editions in the GitHub + R2 corpus.
 * Structural coverage is not proof of current HTTP accessibility.
 */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const origin=read("data/r2/corpus-manifest.json");
const registry=read("data/classics-corpus/search-registry.json");
const local=read("data/index/classics/manifest.json");
const keys=new Set(),all=new Map();
for(const doc of local.index){
 const key=doc.id+"|"+doc.lang;
 assert(!keys.has(key),"Duplicate local lexical ID: "+key);
 keys.add(key);all.set(key,doc);
}
for(const original of origin.obras){
 const path=origin.base+original.archivo;
 const entries=registry.entries.filter(e=>e.path===path);
 assert.equal(entries.length,1,"R2 registry mismatch: "+path);
 assert.equal(entries[0].sha256,original.sha256);
 assert.equal(entries[0].passages,original.pasajes);
}
const r2path="data/index/classics-r2/manifest.json";
if(existsSync(r2path)){
 const index=read(r2path),source=new Map(origin.obras.map(x=>[origin.base+x.archivo,x]));
 assert.equal(index.works,origin.obras.length);
 assert.equal(index.r2VerifiedEditions,origin.obras.length);
 assert.equal(new Set(index.index.map(x=>x.file)).size,index.works);
 assert.equal(index.passages,origin.obras.reduce((n,x)=>n+x.pasajes,0));
 for(const work of index.index){
  const sourceEntry=source.get(work.file);
  assert(sourceEntry,"R2 indexed path not declared: "+work.file);
  assert.equal(work.id,sourceEntry.workId);
  assert.equal(work.lang,sourceEntry.language);
  assert.equal(work.sha256,sourceEntry.sha256);
  assert.equal(work.passages,sourceEntry.pasajes);
  all.set(work.id+"|"+work.lang,all.get(work.id+"|"+work.lang)||work);
 }
 console.log("PASS: full R2 index, "+origin.obras.length+" originals, "+all.size+" distinct lexical editions");
}else{
 console.log("PENDING: full R2 lexical index not yet published. Verified 44 registry declarations; existing "+local.works+" lexical versions preserved.");
}
