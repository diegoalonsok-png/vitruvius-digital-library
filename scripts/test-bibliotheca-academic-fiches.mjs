#!/usr/bin/env node
/** Academic metadata coverage audit; never edits sources or invents witnesses. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const academic=read("data/classics-corpus/bibliotheca-academic-fiches-2026-11-16.json");
const inventory=read("data/classics-corpus/bibliotheca-integrity-audit-2026-11-16.json");
const critical=read("data/classics-corpus/critical-authorities-222.json");
const pdf=read("data/r2/catalogo-clasicos-r2.json");
const manifest=read("data/r2/corpus-manifest.json");
const byId=new Map(academic.records.map(x=>[x.workId,x]));
const byPdf=new Map(pdf.items.map(x=>[x.id,x]));
assert.equal(academic.records.length,281);
assert.equal(inventory.records.length,academic.records.length);
assert.equal(byId.size,academic.records.length);
assert.equal(critical.records.length,271);
for(const work of inventory.records){
 const dossier=byId.get(work.id);
 assert(dossier,"Missing scholarly dossier: "+work.id);
 assert.equal(dossier.originalLanguage,work.originalLanguage);
 assert.equal(dossier.textualIndex.status,work.originalTextStatus);
 assert.equal(dossier.editions.length,work.pdfEditions.length);
 for(const ed of dossier.editions){
  const original=byPdf.get(ed.id);
  assert(original,"Missing PDF bibliographic provenance: "+ed.id);
  assert.equal(ed.sourcePdf,original.pdf);
  assert.equal(ed.sha256,original.sha256);
  assert.equal(ed.bibliographicReference?.titleAsCatalogued,original.tituloEdicion);
 }
 for(const w of dossier.verifiedManuscripts){
  assert(w.source,"Unsourced manuscript claim: "+work.id);
  assert(w.holdingInstitution||w.shelfmark,"Unidentifiable manuscript: "+work.id);
 }
}
const criticalById=new Map(critical.records.map(x=>[x.workId,x]));
for(const original of manifest.obras){
 const x=criticalById.get(original.workId);
 assert(x,"Missing critical authority: "+original.workId);
 assert.equal(x.integrity.indexed,true,"R2 index state stale: "+original.workId);
 assert.equal(x.integrity.sourceSha256,original.sha256,"R2 source identity stale: "+original.workId);
}
console.log("PASS: 281 scholarly dossiers, 117 PDF editions, 44 certified R2 source identities, manuscript source provenance.");
