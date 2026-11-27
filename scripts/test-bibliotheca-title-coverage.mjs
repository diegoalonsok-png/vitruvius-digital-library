#!/usr/bin/env node
/**
 * Catalogue coverage smoke test. Metadata discovery != indexed primary text.
 * Does not fetch or modify R2, claim verified loci, or change the original editions.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const json = p => JSON.parse(readFileSync(p,'utf8'));
const roadmap=json('data/classics-corpus/indexation-roadmap-222.json');
const registry=json('data/classics-corpus/search-registry.json');
const manifest=json('data/r2/corpus-manifest.json');
const js=readFileSync('assets/bibliotheca-work-search.js','utf8');
assert.equal(roadmap.items.length,roadmap.targetWorks);
assert.equal(new Set(roadmap.items.map(w=>w.id)).size,roadmap.targetWorks,'duplicate ancient work IDs');
for(const work of roadmap.items){
 assert.match(work.id,/^[a-z0-9-]+$/,'invalid catalogue ID');
 assert.ok(typeof work.title==='string' && work.title.trim(),'missing original catalogue title: '+work.id);
 assert.ok(typeof work.author==='string' && work.author.trim(),'missing author: '+work.id);
}
assert.equal(registry.entries.length,registry.count);
const textIDs=new Set(registry.entries.map(e=>e.workId));
const catalogueIDs=new Set(roadmap.items.map(e=>e.id));
const registryOnly=[...textIDs].filter(id=>!catalogueIDs.has(id));
const r2=new Set(manifest.obras.map(e=>manifest.base+e.archivo));
for(const file of ["data/r2/classics-expansion-manifest.json","data/r2/classics-translation-manifest.json"]){for(const e of json(file).editions||[])r2.add(e.url);}
const titles=json("data/classics-corpus/title-search-aliases-multilingual.json");
for(const [id,entry] of Object.entries(titles.titleAuthorities||{})){
 assert(registry.entries.some(e=>e.workId===id&&e.sourceUrn===entry.urn),"Title authority lacks exact registered URN: "+id);
 assert(/^https:\/\//.test(entry.source),"Title authority lacks source");
 assert(entry.displayTitle||/\p{Script=Greek}/u.test(entry.greekTitle||""),"Missing documented title");
 assert((titles.aliases[id]||[]).includes(entry.displayTitle||entry.greekTitle),"Authority title not searchable");
}
for(const edition of registry.entries.filter(e=>e.path.startsWith(manifest.base)))
 assert.ok(r2.has(edition.path),'R2 edition not declared: '+edition.workId);
assert.match(js,/function addRoadmap\(roadmap\)/);
assert.match(js,/Ver catálogo completo/);
assert.match(js,/addRoadmap\(roadmap\)/);
assert.match(js,/model\.index\.set\(entry\.id,work\)/);
console.log(JSON.stringify({
 cataloguedWorks:roadmap.targetWorks,
 searchableTitlesFromRoadmap:catalogueIDs.size,
 registeredTextVersions:registry.count,
 registryOnlyTitlesAlsoSearchable:registryOnly.length,
 registeredR2Originals:manifest.obras.length,
 originalTextsStillPending:roadmap.counts.effectiveOriginalsMissing,
 note:'Metadata search coverage, not full-text coverage or proof of runtime behavior.'
},null,2));

// Cooperative author/title search regression: exercise production search code
// with the real roadmap metadata, not a downloaded full-text corpus.
const section=(a,b)=>{const start=js.indexOf(a),end=js.indexOf(b,start);assert(start>=0&&end>start);return js.slice(start,end)};
const code=section("const normal=","const ancientGenres=")+section("const authorNameVariants=","// Cache the normalised fields")+
 "const aliasAuthority={};let loadedAliases={};"+
 section("// Cache the normalised fields","function originalTitle(")+
 section("function spanishAuthorName(","function spanishWorkTitle(")+
 section("function singleLetter(","function readingEditions(")+
 section("// Cooperative search:","function render(){");
let clock=0,yields=0;
const engine=new Function("performance","setTimeout","items",code+";let model={items};return {plainMatches,cooperativeFilter};")(
 {now:()=>clock++},cb=>{yields++;cb()},roadmap.items.map(w=>({...w,forms:[w.title,w.author],originalAliases:[]})));
for(const [query,expected] of [["Platón","plato"],["Πλάτων","plato"],["Aristóteles","aristotle"],["Julio César","caesar"],["Vitruvio","vitruvius"],["De architectura","vitruvius"],["Homero","homer"],["Ciceron","cicero"]]){
 const rows=await engine.plainMatches(query,"",()=>true);
 assert(rows?.some(w=>w.id.startsWith(expected)),"Missing expected author/title: "+query);
}
const initial=await engine.plainMatches("A","a",()=>true);
assert(initial.length>0);
const matches=await engine.cooperativeFilter(Array.from({length:3000},(_,i)=>i),x=>x%3===0,()=>true,2);
assert.equal(matches.length,1000);
assert.equal(await engine.cooperativeFilter([1,2,3],()=>true,()=>false,2),null);
assert(yields>0,"Long search must yield to the input loop");
console.log("PASS: cooperative author/title lookups, Greek aliases, cancellation, alphabetical browsing.");
