import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const reg=JSON.parse(readFileSync("data/ecdotic-decisions.json","utf8"));
assert.equal(reg.schema,"vitruvius-ecdotic-decisions-v1");
const b=reg.baseline;
assert.ok(Number.isInteger(b.extractedNotes)&&b.extractedNotes>=0);
assert.equal(b.explicitLocus+b.candidateLocus+b.unlocated,b.extractedNotes,"Inconsistent apparatus baseline");
assert.match(b.source,/\.html$/);
assert.ok(Array.isArray(reg.decisions));
const validEvidence=new Set(reg.methodology.evidenceTypes);
const validReview=new Set(reg.methodology.reviewStates);
const validLocation=new Set(reg.methodology.locationStates);
const ids=new Set();
for(const d of reg.decisions){
 assert.ok(d.id&&!ids.has(d.id),"Missing/duplicated decision id");ids.add(d.id);
 assert.ok(["V514","V554","V297"].includes(d.edition),"Unrecognized edition");
 assert.match(d.locus||"",/^(?:\d{1,2}\.)?(?:praef\.|\d+\.\d+|\d+\.[\d-]+)$/i);
 assert.ok(validEvidence.has(d.evidenceType),"Unknown evidence tier");
 assert.ok(validReview.has(d.recordStatus),"Unknown review state");
 assert.ok(validLocation.has(d.locationState),"Unknown location state");
 assert.ok(Array.isArray(d.revisionHistory));
 if(d.recordStatus==="verified_with_source"){
  assert.ok(d.evidenceType!=="unverified","Verified decision still unverified");
  assert.ok(d.baseReading&&d.adoptedReading&&d.responsibleEditor&&d.recordedOn&&d.reviewedOn&&d.justification,
   "Certified reading missing editorial justification or responsible reviewer");
  assert.ok((d.primarySourceUri&&d.institution&&d.shelfmark&&d.folio)||d.secondaryReference,
   "Certified reading missing source identification");
  if(d.evidenceType==="autoptic"){
   assert.ok(d.primarySourceUri&&d.institution&&d.shelfmark&&d.folio,"Autoptic evidence needs primary folio attribution");
  }
 }
}
console.log("Ecdotic evidence registry validated:",reg.decisions.length,"individually registered decisions; baseline",b.extractedNotes,"notes.");
