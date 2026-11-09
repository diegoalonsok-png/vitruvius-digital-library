/** Read-only consistency gate for the classical corpus.
 * Run: node scripts/check-classics-integrity.mjs
 * This verifies catalogues/registries, not manuscript collation or full-text accuracy.
 */
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const road=read("data/classics-corpus/indexation-roadmap-222.json");
const translations=read("data/classics-corpus/translation-availability-222.json");
const registry=read("data/classics-corpus/search-registry.json");
assert.equal(road.schema,"vitruvius-classics-indexation-roadmap-v1");
assert.equal(registry.schema,"vitruvia-classics-search-registry-v1");
assert.equal(road.items.length,road.targetWorks,"catalogue and stated size differ");
const known=new Map(road.items.map(x=>[x.id,x]));
assert.equal(known.size,road.targetWorks,"duplicate work identifiers");
const originals=road.items.filter(x=>x.originalIndexed);
const hosted=road.items.filter(x=>x.translationHosted);
assert.equal(originals.length,road.counts.originalsIndexed);
assert.equal(road.counts.originalsMissing,road.targetWorks-originals.length);
assert.equal(hosted.length,road.counts.worksWithHostedTranslation);
assert.equal(translations.totals.cataloguedWorks,road.targetWorks);
assert.equal(translations.totals.locallyIndexedWorks,originals.length);
assert.equal(translations.totals.translatedWorksLocal,hosted.length);
assert.equal(registry.count,registry.entries.length);
assert.equal(registry.count,road.counts.textVersions);
const versionKeys=new Set();
for(const e of registry.entries){
 assert(known.has(e.workId),"version outside catalogue: "+e.workId);
 assert(["la","grc","en","es","fr"].includes(e.language),"unexpected language: "+e.language);
 assert(typeof e.path==="string"&&e.path.length>0,"missing version source path");
 assert(typeof e.sourceDescription==="string"&&e.sourceDescription.trim(),"missing edition description: "+e.path);
 const key=e.workId+"|"+e.language+"|"+e.path;
 assert(!versionKeys.has(key),"duplicate text version: "+key);
 versionKeys.add(key);
}
for(const w of originals){
 assert(registry.entries.some(e=>e.workId===w.id&&e.language===w.originalLanguage),
  "original marked indexed but absent from searchable registry: "+w.id);
}
console.log(JSON.stringify({
 status:"OK",scope:"local-manifests-only",
 catalogued:known.size,originalsLocal:originals.length,
 translationsHosted:hosted.length,textVersionsLocal:registry.count,
 externalOriginals:"not validated in this offline check",
 note:"Indexed does not certify complete text, accurate OCR, manuscript collation or translation alignment."
},null,2));
