#!/usr/bin/env node
/* Protección no destructiva: discrepancias editoriales de R2 no son "huecos"
 * que deban resolverse copiando, renombrando o borrando objetos. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=p=>JSON.parse(readFileSync(p,"utf8"));
const catalogue=load("data/r2/catalogo-clasicos-r2.json").items;
const originalManifest=load("data/r2/corpus-manifest.json");
const lexical=load("data/index/classics-r2/manifest.json");
const inventory=load("data/r2/r2-orphan-reconciliation.json");
const facsimile=load("data/r2/indice-semantico-manifest.json");
const candidates=load("data/r2/clasicos-candidatos.json").obras;
const quarantine=load("data/r2/recatalogacion-pendiente-2026-11-16.json").records;
const ids=(arr,k)=>new Set(arr.map(k));
const pdfIds=ids(catalogue,x=>x.id);
assert.equal(pdfIds.size,catalogue.length,"Duplicate PDF catalogue ID");
const originalKeys=ids(originalManifest.obras,x=>x.workId+"|"+x.language);
const lexicalKeys=ids(lexical.index,x=>x.id+"|"+x.lang);
assert.equal(originalKeys.size,originalManifest.obras.length,"Duplicate R2 text version");
assert.equal(lexicalKeys.size,lexical.index.length,"Duplicate R2 lexical version");
for(const key of originalKeys)assert.ok(lexicalKeys.has(key),"R2 original missing from lexical index: "+key);
for(const key of lexicalKeys)assert.ok(originalKeys.has(key),"R2 lexical version without original: "+key);
assert.equal(originalManifest.obras.length,lexical.index.length,"R2 text edition symmetry");
const quarantineById=new Map(quarantine.map(x=>[x.candidateId,x]));
assert.equal(quarantineById.size,quarantine.length,"Duplicate quarantine candidate IDs");
assert.deepEqual(new Set(quarantineById.keys()),new Set(inventory.records.map(x=>x.id)),"Every unresolved R2 holding must have a quarantine entry");
const seen=ids(inventory.records,x=>x.id);
assert.equal(seen.size,inventory.records.length,"Duplicate orphan diagnostics");
const proposed=Object.fromEntries(candidates.map(x=>[x.id,x]));
const problematic=[];
for(const r of inventory.records){
 assert.ok(!pdfIds.has(r.id),"Orphan already promoted to verified PDF without a new source-level review: "+r.id);
 if(!r.pdfPresent||!r.ocrPresent)throw Error("Previously reported R2 pair no longer fully present: "+r.id);
 const q=quarantineById.get(r.id);
 assert.ok(q,"Orphan not tracked in quarantine: "+r.id);
 assert.equal(q.sourceIdentifier,r.sourceIdentifierS3,"Quarantine provenance drift: "+r.id);
 assert.equal(q.includeInVerifiedCatalogue,false,"Unreviewed edition incorrectly approved: "+r.id);
 assert.equal(q.includeInSearchAsVerifiedWork,false,"Unreviewed OCR incorrectly searchable as verified: "+r.id);
 assert.equal(q.preserveObjects,true,"Orphan preservation invariant: "+r.id);
 const candidate=proposed[r.id];
 if(!candidate)throw Error("Orphan without candidate provenance: "+r.id);
 const explicitlyExcluded=(candidate.excluir||[]).includes(r.sourceIdentifierS3);
 const strongMislabel=r.id==="justino-trogo-es"&&r.sourceIdentifierS3==="apologia-i-de-san-justino";
 if(explicitlyExcluded||strongMislabel)problematic.push({id:r.id,sourceIdentifier:r.sourceIdentifierS3});
}
const indexExtra=facsimile.obras-catalogue.length;
if(indexExtra<0)throw Error("More facsimile catalogue entries than declared index works");
console.log(JSON.stringify({status:"review-required-not-destructive",pdfCatalogued:catalogue.length,r2Originals:originalManifest.obras.length,r2OriginalsLexicallyIndexed:lexical.index.length,facsimileIndexDeclared:facsimile.obras,facsimileDifference:indexExtra,unverifiedOrphans:inventory.records.length,explicitProvenanceConflicts:problematic},null,2));
// The existence of known historical discrepancies is NOT a reason to delete any R2 keys.
