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
const documentedHeader=records.filter(r=>r.ctsStatus==="declared_and_checked_in_source_tei_header");
const documented=verified.concat(documentedHeader);
// Work identifiers are not edition identifiers; passages must be separated
// from editions by a colon. Never rewrite upstream CTS identifiers.
const WORK_URN=/^urn:cts:(?:latinLit|greekLit):[A-Za-z0-9]+\\.[A-Za-z0-9]+$/;
const EDITION_URN=/^urn:cts:(?:latinLit|greekLit):[A-Za-z0-9]+\\.[A-Za-z0-9]+\\.[A-Za-z0-9][A-Za-z0-9_-]*$/;
assert.equal(EDITION_URN.test("urn:cts:latinLit:phi0474_phi037_perseus-lat2.1.1.segment-1"),false);
assert.equal(EDITION_URN.test("urn:cts:latinLit:phi0474.phi037.perseus-lat2:1.1.segment_1"),false);
assert.equal(EDITION_URN.test("urn:cts:latinLit:stoa0040.stoa001.opp-lat1"),true);
for(const path of ["data/clasicos-perseus.json","data/clasicos-perseus-extra.json"]){
  const catalog=JSON.parse(read(path));
  for(const work of catalog.works||[])assert.match(work.urn||"",WORK_URN,"Invalid work-level CTS URN in "+path+": "+work.id);
}
assert.equal(report.counts.worksWithCandidateWorkCodes,candidateWorks);
assert.equal(report.counts.versions,textVersions);
assert.equal(report.counts.worksWithPerseusSourceDescription,describedWorks);
assert.equal(report.counts.verifiedEditionUrns,documented.length,"Documented TEI-header URNs are distinct from externally resolved editions");
for(const r of records){
  assert.ok(typeof r.workId==="string"&&r.workId);
  assert.ok(Array.isArray(r.versions),"Version list missing for "+r.workId);
  assert.equal(r.perseusAffiliation,false,"Institutional affiliation must not be inferred: "+r.workId);
  if(r.ctsStatus==="verified"){
    assert.match(r.ctsEditionUrn||"",EDITION_URN,"Malformed verified edition URN: "+r.workId);
    assert.match(r.ctsSourceUri||"",/^https:\/\//i,"A verified edition requires a citable source: "+r.workId);
    assert.ok(typeof r.sourceRights==="string"&&r.sourceRights.trim(),"A verified edition requires a rights statement: "+r.workId);
  }else if(r.ctsStatus==="declared_and_checked_in_source_tei_header"){
    assert.match(r.ctsEditionUrn||"",EDITION_URN,"Malformed TEI-declared URN: "+r.workId);
    assert.match(r.ctsEvidence||"",/TEI/i,"TEI-header evidence must be explicit: "+r.workId);
    assert.match(r.ctsNote||"",/no implica|not verified|not proof/i,"TEI declaration is not public CTS resolution: "+r.workId);
  }else{
    assert.equal(r.ctsEditionUrn,null,"An unverified edition must not publish a confirmed CTS URN: "+r.workId);
  }
}
for(const id of ["prov-works","prov-candidates","prov-mentions","prov-verified","prov-current-status"])assert.ok(page.includes('id="'+id+'"'),"Dashboard count/status missing: "+id);
assert.match(page,/fetch\('data\/perseus-provenance-audit\.json'/);
assert.match(page,/Scaife Viewer/);
assert.match(page,/canonical-latinLit\/wiki/);
assert.match(page,/actualización de licencias de Perseus/);
for(const [id,count] of [["prov-works",report.counts.works],["prov-candidates",candidateWorks],["prov-mentions",describedWorks],["prov-verified",documented.length]]){
  assert.ok(page.includes('id="'+id+'">'+count+'</b>'),"Fallback count is stale for "+id);
}
console.log("PASS: "+records.length+" provenance records, "+textVersions+" versions, "+candidateWorks+" work-code candidates, "+documented.length+" TEI-documented edition URNs ("+verified.length+" externally verified).");
