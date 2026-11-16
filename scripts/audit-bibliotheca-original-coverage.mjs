#!/usr/bin/env node
/**
 * Read-only exhaustive source coverage audit for the Bibliotheca.
 * Catalogue availability is distinct from verified lexical indexing.
 * Output: coverage by local original / R2 original / offsite source / missing source.
 * This script never uploads, edits, downloads or invents original text.
 */
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const roadmap=read("data/classics-corpus/indexation-roadmap-222.json");
const registry=read("data/classics-corpus/search-registry.json");
const remote=read("data/classics-corpus/external-index-reconciliation.json");
const r2=read("data/r2/corpus-manifest.json");
assert.equal(roadmap.targetWorks,roadmap.items.length);
assert.equal(registry.entries.length,registry.count);
assert.equal(r2.obras.length,roadmap.counts.declaredR2OriginalWorks);
const ids=new Set(roadmap.items.map(w=>w.id));
assert.equal(ids.size,roadmap.items.length,"Duplicate work IDs");
const local=new Set(roadmap.items.filter(w=>w.originalIndexed).map(w=>w.id));
const external=new Set(remote.remoteEntries.map(w=>w.workId));
const hosted=new Set(r2.obras.map(w=>w.workId));
const fromRegistry=new Set(registry.entries.filter(e=>e.path?.startsWith(r2.base)&&["grc","la"].includes(e.language)).map(e=>e.workId));
assert.deepEqual([...hosted].sort(),[...fromRegistry].sort(),"R2 manifest and registry disagree");
for(const item of r2.obras){
 const matching=registry.entries.filter(e=>e.path===r2.base+item.archivo);
 assert.equal(matching.length,1,"Missing or duplicate R2 edition: "+item.archivo);
 assert.equal(matching[0].sha256,item.sha256,"R2 SHA metadata: "+item.archivo);
 assert.equal(matching[0].passages,item.pasajes,"R2 passages: "+item.archivo);
}
const known=new Set([...local,...external,...hosted]);
const missing=roadmap.items.filter(w=>!known.has(w.id));
const r2Awaiting=roadmap.items.filter(w=>hosted.has(w.id)&&!w.effectiveOriginalIndexed);
const wronglyUncatalogued=[...known].filter(id=>!ids.has(id));
assert.equal(wronglyUncatalogued.length,0,"Source original absent from catalogue");
assert.equal(known.size+missing.length,roadmap.targetWorks);
assert.equal(known.size,roadmap.counts.originalWorksWithRegisteredSource);
assert.equal(missing.length,roadmap.counts.originalWorksWithoutRegisteredSource);
assert.equal(r2Awaiting.length,roadmap.counts.r2RegisteredNotEffective);
console.log(JSON.stringify({
 catalogued:roadmap.targetWorks,
 originalsWithRegisteredSource:known.size,
 originalsWithoutRegisteredSource:missing.length,
 registeredR2Originals:hosted.size,
 r2AwaitingIndexVerification:r2Awaiting.length,
 effectiveIndexedClaim:roadmap.counts.effectiveOriginalsIndexed,
 notice:"Registered source is not a certified effective lexical/semantic index.",
 missingSource:missing.map(w=>({id:w.id,title:w.title,language:w.originalLanguage})),
 r2Pending:r2Awaiting.map(w=>w.id)
},null,2));
