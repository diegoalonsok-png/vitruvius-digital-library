#!/usr/bin/env node
/**
 * Publish a source-and-index integrity certificate only after the full R2
 * lexical build and validation succeed. Does not mutate original texts.
 * This is a build-time SHA256 attestation, not a manuscript collation.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
const sourcePath="data/r2/corpus-manifest.json";
const indexPath="data/index/classics-r2/manifest.json";
const bytes=readFileSync(sourcePath);
const manifest=JSON.parse(bytes.toString("utf8"));
const index=JSON.parse(readFileSync(indexPath,"utf8"));
assert.equal(manifest.schema,"vdl-corpus-r2-1");
assert.equal(index.schema,"vitruvia-classics-lexical-index-v1");
assert.equal(index.works,manifest.obras.length);
assert.equal(index.r2VerifiedEditions,manifest.obras.length);
assert.equal(index.passages,manifest.obras.reduce((n,x)=>n+x.pasajes,0));
const byPath=new Map(manifest.obras.map(e=>[manifest.base+e.archivo,e]));
assert.equal(byPath.size,manifest.obras.length,"Duplicate originals in R2 manifest");
for(const doc of index.index){
 const original=byPath.get(doc.file);
 assert(original,"Indexed original not in R2 manifest: "+doc.file);
 assert.equal(doc.id,original.workId);
 assert.equal(doc.lang,original.language);
 assert.equal(doc.sha256,original.sha256);
 assert.equal(doc.passages,original.pasajes);
}
const status={
 schema:"vdl-r2-classics-sync-v1",
 verifiedAt:new Date().toISOString(),
 status:"all-registered-r2-originals-verified-and-lexically-indexed",
 scope:"R2 original JSON files listed in the source manifest only; not unregistered catalogue works or manuscript collation",
 sourceManifest:sourcePath,
 sourceManifestSha256:createHash("sha256").update(bytes).digest("hex"),
 indexManifest:indexPath,
 indexManifestSha256:createHash("sha256").update(readFileSync(indexPath)).digest("hex"),
 verifiedOriginals:index.works,
 verifiedPassages:index.passages,
 note:"Source bytes SHA256-checked during index build; indexed text candidates must still be verified against their edition when citing loci."
};
mkdirSync("data/r2",{recursive:true});
writeFileSync("data/r2/classics-sync-status.json",JSON.stringify(status,null,2)+"\n");
console.log("PASS: GitHub-R2 lexical synchronization certificate",status.verifiedOriginals,status.verifiedPassages);
