#!/usr/bin/env node
/**
 * Verify the public, dated corpus snapshot against editorial files.
 * Source hashes and Git blob identities are evidence of byte-level provenance,
 * not an independent philological collation or external peer review.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

const json=path=>JSON.parse(readFileSync(path,"utf8"));
const file="data/corpus-snapshot-2026-11-14.json";
const snapshot=json(file);
const source=json("data/structured/manifest.json");
const integrity=json("data/academic-integrity.json");
assert.equal(snapshot.schema,"vdl-corpus-snapshot-metadata-v1");
assert.match(snapshot.recorded_on,/^\d{4}-\d{2}-\d{2}$/);
assert.match(snapshot.source_commit,/^[0-9a-f]{40}$/);
assert.equal(snapshot.records.length,3);
assert.deepEqual(snapshot.records.map(r=>r.edition),["V514","V554","V297"]);
assert.equal(snapshot.canonical_loci,integrity.canonicalLoci);

const parsed=[];
for(const record of snapshot.records){
 const meta=source.editions.find(e=>e.version===record.edition);
 assert(meta,"Unknown edition "+record.edition);
 assert.equal(meta.path,record.path);
 assert.equal(meta.source.sha256,record.source_docx_sha256);
 const bytes=readFileSync(record.path);
 const object=json(record.path);
 const gitSha=createHash("sha1")
   .update(Buffer.from("blob "+bytes.length+"\0"))
   .update(bytes)
   .digest("hex");
 assert.equal(gitSha,record.git_blob_sha1,"Source JSON changed since the dated snapshot: "+record.edition);
 assert.equal(object.passages.length,record.passage_blocks);
 const ed=integrity.editions.find(e=>e.version===record.edition);
 assert.equal(ed?.loci,record.canonical_loci);
 assert.equal(ed?.blocks,record.passage_blocks);
 assert.match(record.doi,/^10\.5281\/zenodo\.\d+$/);
 parsed.push(object);
}
const fingerprint=createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
assert.equal(fingerprint,snapshot.source_fingerprint_sha256,"Source fingerprint changed");
assert.equal(fingerprint,integrity.sourceFingerprint);
assert.equal(new Set(snapshot.records.map(r=>r.doi)).size,3,"Edition DOIs must remain distinct");
console.log("PASS: dated corpus snapshot, three edition DOIs, 731 canonical loci, source hashes and provenance.");
