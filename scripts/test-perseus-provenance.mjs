#!/usr/bin/env node
/* This CI gate checks published source-attribution claims and their provenance status.
   It does not certify the scholarly correctness of a manuscript or edition. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const report=JSON.parse(read("data/perseus-provenance-audit.json"));
const page=read("perseus-procedencia-textual.html");
const records=report.records;
assert.equal(report.schema,"vitruvius-perseus-provenance-audit-v1");
assert.ok(Array.isArray(records)&&records.length>0,"Missing provenance records");
assert.equal(report.counts.works,records.length,"Catalogue count differs from provenance records");
assert.equal(new Set(records.map(r=>r.workId)).size,records.length,"Duplicate work IDs in the provenance audit");
const candidateWorks=records.filter(r=>Array.isArray(r.candidateWorkCodes)&&r.candidateWorkCodes.length>0).length;
const textVersions=records.reduce((sum,r)=>sum+(r.versions?.length||0),0);
const describedWorks=records.filter(r=>r.versions?.some(v=>/Perseus/i.test(v.sourceDescription||""))).length;
const verified=records.filter(r=>r.ctsStatus==="verified");
assert.equal(report.counts.worksWithCandidateWorkCodes,candidateWorks);
assert.equal(report.counts.versions,textVersions);
assert.equal(report.counts.worksWithPerseusSourceDescription,describedWorks);
assert.equal(report.counts.verifiedEditionUrns,verified.length);
for(const r of records){
  assert.ok(typeof r.workId==="string"&&r.workId);
  assert.ok(Array.isArray(r.versions),"Version list missing for "+r.workId);
  assert.equal(r.perseusAffiliation,false,"Institutional affiliation must not be inferred: "+r.workId);
  if(r.ctsStatus==="verified"){
    assert.match(r.ctsEditionUrn||"",/^urn:cts:[a-z0-9-]+:[A-Za-z0-9_.-]+$/i,"Malformed verified edition URN: "+r.workId);
    assert.match(r.ctsSourceUri||"",/^https:\/\//i,"A verified edition requires a citable source: "+r.workId);
    assert.ok(typeof r.sourceRights==="string"&&r.sourceRights.trim(),"A verified edition requires a rights statement: "+r.workId);
  }else{
    assert.equal(r.ctsEditionUrn,null,"An unverified edition must not publish a confirmed CTS URN: "+r.workId);
  }
}
for(const id of ["prov-works","prov-candidates","prov-mentions","prov-verified","prov-current-status"])assert.ok(page.includes('id="'+id+'"'),"Dashboard count/status missing: "+id);
assert.match(page,/fetch\('data\/perseus-provenance-audit\.json'/);
assert.match(page,/Scaife Viewer/);
assert.match(page,/canonical-latinLit\/wiki/);
assert.match(page,/actualización de licencias de Perseus/);
for(const [id,count] of [["prov-works",report.counts.works],["prov-candidates",candidateWorks],["prov-mentions",describedWorks],["prov-verified",verified.length]]){
  assert.ok(page.includes('id="'+id+'">'+count+'</b>'),"Fallback count is stale for "+id);
}
console.log("PASS: "+records.length+" provenance records, "+textVersions+" versions, "+candidateWorks+" work-code candidates, "+verified.length+" verified edition URNs (not asserted without evidence).");
