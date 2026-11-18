import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const registry=JSON.parse(readFileSync("data/classics-corpus/search-registry.json","utf8"));
const report=JSON.parse(readFileSync("data/classics-corpus/greek-translations-trilingual-audit-2026-11-18.json","utf8"));
const greek=registry.entries.filter(e=>e.language==="grc");
assert.equal(report.schema,"vdl-greek-es-en-fr-translations-research-v1");
assert.equal(report.summary.greekWorks,greek.length);
assert.equal(report.works.length,greek.length);
assert.equal(report.summary.totalCells,greek.length*3);
const seen=new Set;const validStates=new Set(["indexed-local","staged-not-published","external-candidate","not-yet-verified"]);
for(const w of report.works){
 assert(!seen.has(w.workId),"Duplicate "+w.workId);seen.add(w.workId);
 assert(greek.some(e=>e.workId===w.workId&&e.path===w.originalPath),"Orphan "+w.workId);
 for(const lang of ["en","fr","es"]){
  const ed=w.editions[lang];
  assert(validStates.has(ed.status),w.workId+":"+lang+" invalid state");
  const local=registry.entries.find(e=>e.workId===w.workId&&e.language===lang);
  assert.equal(ed.status==="indexed-local",!!local,w.workId+":"+lang+" wrong indexed state");
  if(local)assert.equal(ed.localPath,local.path,w.workId+":"+lang+" wrong local path");
  if(ed.status==="staged-not-published")assert(ed.candidates.some(c=>c.status==="github-pr-unmerged"));
  if(ed.status==="external-candidate")assert(ed.candidates.length>0);
  if(ed.status==="not-yet-verified")assert.equal(ed.candidates.length,0);
  for(const c of ed.candidates){
   assert(/^https:\/\//.test(c.url),"Source URL must be HTTPS "+w.workId);
   assert.equal(c.indexedLocally,false,"External source must not be marked imported");
   assert.equal(c.alignmentVerified,false,"Unverified loci cannot be marked aligned");
   assert.equal(c.licenseReviewed,false,"License status requires independent review");
  }
 }
}
for(const lang of ["en","fr","es"]){
 for(const status of validStates){
  const n=report.works.filter(w=>w.editions[lang].status===status).length;
  const field={"indexed-local":"indexedLocal","staged-not-published":"stagedNotPublished","external-candidate":"externalCandidates","not-yet-verified":"notYetVerified"}[status];
  assert.equal(report.summary[field][lang],n,"Count mismatch "+field+":"+lang);
 }
}
console.log("PASS: "+greek.length+" Greek works, "+(greek.length*3)+" language states, candidates and provenance are consistent with main. External sources remain unimported.");
