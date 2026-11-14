/* Strict academic apparatus compatibility path; no invented collations. */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>JSON.parse(readFileSync(path,"utf8"));
const manifest=read("data/r2/aparato-academico.json");
const editorial=read("data/academic-integrity.json");
const catalogue=read("data/catalog.json");
assert.equal(manifest.schema,"vitruvius-academic-apparatus-manifest/1");
assert.equal(manifest.kind,"bibliographic-index-manifest");
assert.equal(manifest.canonical_source,"data/apparatus-index.json");
assert.equal(manifest.integrity_source,"data/academic-integrity.json");
assert.equal(manifest.bibliographic_source,"data/catalog.json");
for(const path of [manifest.canonical_source,manifest.integrity_source,manifest.bibliographic_source])
 assert.ok(existsSync(path),"Missing actual source: "+path);
assert.equal(manifest.apparatus_entries,editorial.apparatus.entries);
assert.deepEqual(manifest.relation_status_counts,editorial.apparatus.relations);
assert.equal(manifest.fingerprint,editorial.sourceFingerprint);
assert.equal(manifest.canonical_loci,editorial.canonicalLoci);
assert.equal(manifest.editions.length,3);
for(const {id,version,bibliographic_title,doi,isbn,isbn_note} of manifest.editions){
 const e=catalogue.editions.find(x=>x.id===id);
 assert.ok(e&&version===e.version&&bibliographic_title===e.bibliographic_title);
 assert.equal(doi,e.doi);
 assert.equal(isbn,e.isbn||null);
 assert.equal(isbn_note,e.isbn_note||null);
}
assert.match(manifest.limits,/DOI identifica una edición/);
assert.match(manifest.limits,/Loci candidatos no equivalen a collatio/);
assert.match(manifest.limits,/asignación registral individual/);
assert.ok(manifest.editions.every(e=>e.isbn_note?.includes("ISBN común declarado por el editor")),
 "All three editions must disclose editorial common ISBN registration caveat");
assert.ok(!("registros" in manifest)&&!("entries" in manifest),"A bibliography manifest must never masquerade as the apparatus data itself");
console.log("PASS: apparatus manifest references true indexed data and the exact, documented editions; no fabricated witness readings.");
