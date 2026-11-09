#!/usr/bin/env node
/* Cross-site academic transparency contract; does not touch any source text. */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join,dirname} from "node:path";

const read=path=>readFileSync(path,"utf8");
const pages=["index.html","vitruvia.html","vitruvia-lexicon.html",
 "bibliotheca-graeca-latina.html","classics-text-reader.html",
 "classics-parallel-reader.html","auditoria-academica.html"];
const methods=["metodologia-filologica.html","auditoria-academica.html","auditoria-textos-clasicos.html"];
for(const file of [...pages,...methods])assert(existsSync(file),file+" not present");
for(const file of pages){
 const html=read(file);
 assert.match(html,/<title>[^<]+<\/title>/i,file+" missing title");
 assert(!/<a\s+[^>]*href="javascript:/i.test(html),file+" unsafe href");
 assert(/metodologia-filologica\.html|auditoria-textos-clasicos\.html/.test(html),
  file+" lacks academic method access");
 assert(/auditoria-academica\.html/.test(html),file+" lacks audit access");
}
const manifest=JSON.parse(read("data/classics-corpus/indexation-roadmap-222.json"));
const registry=JSON.parse(read("data/classics-corpus/search-registry.json"));
assert.equal(manifest.items.length,manifest.targetWorks);
assert.equal(new Set(manifest.items.map(x=>x.id)).size,manifest.targetWorks);
assert.equal(registry.entries.length,registry.count);
assert.equal(new Set(registry.entries.map(x=>x.workId)).size,registry.works);
for(const item of registry.entries){
 assert(manifest.items.some(x=>x.id===item.workId),item.workId+" registry entry not in catalog");
 if(item.path&&!/^https?:/.test(item.path)){
  assert(existsSync(item.path),item.path+" missing source file");
 }
}
for(const path of ["data/classics-alignment/manifest.json","data/classics-corpus/translation-availability-222.json"]){
 assert(existsSync(path),path+" missing");
}
const alignment=JSON.parse(read("data/classics-alignment/manifest.json"));
assert.equal(alignment.count,alignment.pairs.length);
for(const pair of alignment.pairs){
 assert(pair.sharedLoci<=Math.min(pair.originalPassages,pair.translationPassages),
  pair.workId+" implausible claimed locus count");
 assert(pair.status!=="verified-semantic-alignment",
  "Unreviewed semantic collation claimed: "+pair.workId);
}
console.log(JSON.stringify({status:"pass",pages:pages.length,works:manifest.targetWorks,registryVersions:registry.count,alignmentPairs:alignment.count}));
