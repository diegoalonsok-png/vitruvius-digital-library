#!/usr/bin/env node
/** Structural smoke test for the public Bibliotheca counters.
 * Uses real versioned local reconciliation data to create deterministic
 * remote-manifest fixtures. Does NOT certify that remote endpoints are
 * online, texts are complete, manuscripts collated or translations correct.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const roadmap=read("data/classics-corpus/indexation-roadmap-222.json");
const snapshot=read("data/classics-corpus/external-index-reconciliation.json");
const code=fs.readFileSync("assets/classics-audited-coverage.js","utf8");
const specs=[
 {branch:"corpus-originales-griegos-20261108",path:"data/offsite-originals/manifest.json",language:"grc",
  schema:"vitruvius-offsite-greek-originals-manifest-v1"},
 {branch:"corpus-originales-latinos-20261108",path:"data/offsite-latin/manifest.json",language:"la",
  schema:"vitruvius-offsite-latin-originals-manifest-v1"}
];
assert.equal(roadmap.items.length,roadmap.targetWorks);
assert.equal(snapshot.counts.worksCatalogued,roadmap.targetWorks);
assert.equal(snapshot.counts.hostedOriginalsIndexed,roadmap.counts.originalsIndexed);
assert.equal(snapshot.counts.remoteOriginalsIndexed,roadmap.counts.offsiteOriginalsIndexed);
assert.equal(snapshot.counts.combinedOriginalsIndexed,roadmap.counts.effectiveOriginalsIndexed);
assert.equal(snapshot.counts.originalsStillWithoutIndex,roadmap.counts.effectiveOriginalsMissing);
assert.equal(snapshot.remoteEntries.length,snapshot.counts.remoteOriginalsIndexed);
const known=new Set(roadmap.items.map(x=>x.id));
const local=new Set(roadmap.items.filter(x=>x.originalIndexed).map(x=>x.id));
const remoteIds=new Set(snapshot.remoteEntries.map(x=>x.workId));
assert.equal(known.size,roadmap.targetWorks,"Duplicate work identity in indexation roadmap");
assert.equal(local.size,roadmap.counts.originalsIndexed);
assert.equal(remoteIds.size,snapshot.remoteEntries.length,"Duplicate external work identity");
for(const entry of snapshot.remoteEntries){
 assert(known.has(entry.workId),"Remote work not catalogued: "+entry.workId);
 assert(!local.has(entry.workId),"Remote work counted twice: "+entry.workId);
 assert(/^[0-9a-f]{64}$/.test(entry.sourceSha256),"Remote source hash missing: "+entry.workId);
 assert(Number.isInteger(entry.passages)&&entry.passages>0,"Invalid passage count: "+entry.workId);
 assert(entry.sourceUrl?.startsWith("https://"),"Source URL missing: "+entry.workId);
}
assert.equal(local.size+remoteIds.size+roadmap.counts.effectiveOriginalsMissing,roadmap.targetWorks);
const base="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/";
const urls=specs.map(s=>base+s.branch+"/"+s.path);
const fixtures=specs.map(s=>{
 const entries=snapshot.remoteEntries.filter(e=>e.language===s.language).map(e=>({
  workId:e.workId,language:e.language,path:e.textPath,passages:e.passages,
  source:e.sourceUrl,sourceSha256:e.sourceSha256
 }));
 assert.equal(entries.length,snapshot.counts[s.language==="grc"?"remoteGreek":"remoteLatin"]);
 return {schema:s.schema,branch:s.branch,count:entries.length,entries};
});
async function render({mutate=null,unavailable=false}={}){
 const elements=new Map(),requests=[];
 const host={dataset:{},querySelector(selector){
  const match=selector.match(/^\[data-classics="([^"]+)"\]$/);
  if(!match)return null;
  if(!elements.has(match[1]))elements.set(match[1],{textContent:""});
  return elements.get(match[1]);
 }};
 const fixturesCopy=JSON.parse(JSON.stringify(fixtures));
 if(mutate)mutate(fixturesCopy);
 const fetch=async url=>{
  requests.push(url);
  const index=urls.indexOf(url);
  const data=url==="data/classics-corpus/indexation-roadmap-222.json"?roadmap:
   url==="data/classics-corpus/external-index-reconciliation.json"?snapshot:
   index>=0?fixturesCopy[index]:null;
  const ok=!!data&&!(unavailable&&index===0);
  return {ok,status:ok?200:503,json:async()=>data};
 };
 vm.runInNewContext(code,{document:{getElementById:id=>id==="classics-audit-coverage"?host:null},fetch,console,Intl,Set,Map});
 await new Promise(resolve=>setTimeout(resolve,45));
 return {state:host.dataset.state,values:Object.fromEntries([...elements].map(([k,v])=>[k,v.textContent])),requests};
}
const good=await render();
assert.equal(good.state,"verified","Metadata agreement should be visible, not called peer review");
assert.equal(good.values.catalog,String(roadmap.targetWorks));
assert.equal(good.values.local,String(local.size));
assert.equal(good.values.remote,String(remoteIds.size));
assert.equal(good.values.searchable,String(local.size+remoteIds.size));
assert.equal(good.values.pending,String(roadmap.counts.effectiveOriginalsMissing));
assert.equal(good.values.translations,String(roadmap.counts.worksWithHostedTranslation));
assert.equal(good.values.versions,String(roadmap.counts.textVersions));
assert.equal(good.requests.length,4,"Must inspect local inventory, two manifests and reconciliation");
assert.match(good.values.method,/NO certifica/);
const drift=await render({mutate:docs=>{docs[0].entries[0].passages++}});
assert.equal(drift.state,"unavailable","A conflicting source may never be called verified");
assert.equal(drift.values.remote,"Sin datos conciliados");
const offline=await render({unavailable:true});
assert.equal(offline.state,"remote-unavailable","Offline remote source must not be counted as verified");
assert.equal(offline.values.remote,"Consulta remota indisponible");
for(const file of ["index.html","bibliotheca-graeca-latina.html"]){
 const html=fs.readFileSync(file,"utf8");
 assert(html.includes('id="classics-audit-coverage"'),file+" missing counter");
 assert(html.includes("assets/classics-audited-coverage.js"),file+" missing linked script");
}
console.log("PASS: local "+local.size+", documented remote "+remoteIds.size+
 ", combined "+(local.size+remoteIds.size)+", pending "+roadmap.counts.effectiveOriginalsMissing+
 "; tested drift and offline safeguards. Metadata only; no textual certification.");
