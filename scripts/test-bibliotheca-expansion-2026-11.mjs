#!/usr/bin/env node
// Bibliotheca expansion: schema, lexical discoverability and non-destructive R2 identity checks.
// The local and R2 editions may overlap conceptually: treat them as editions, never as unique ancient works.
import {readFileSync,existsSync} from "node:fs";
import assert from "node:assert/strict";
const json=p=>JSON.parse(readFileSync(p,"utf8"));
const records=json("data/bibliotheca-expansion-publicada-2026-11-16.json").works;
const registry=json("data/classics-corpus/search-registry.json").entries;
const index=json("data/index/classics/manifest.json").index;
const r2=json("data/r2/corpus-manifest.json").obras;
const seven=["callimachus-hymni","theocritus-idyllia","menander-dyskolos","aristophanes-knights","aristophanes-thesmophoriazusae","aristophanes-ecclesiazusae","aristophanes-plutus"];
assert.equal(records.length,8,"Four original candidates and four later Aristophanes additions");
assert.equal(new Set(records.map(w=>w.id)).size,records.length,"No duplicate overlay IDs");
for(const id of seven){
 const w=records.find(w=>w.id===id);
 assert.ok(w,`Missing catalogue record: ${id}`);
 assert.equal(w.language,"grc");
 assert.equal(w.publicStatus,"lectura-local-completa");
 const p=`data/classics-corpus/${id}-grc.json`;
 assert.deepEqual(w.corpusFiles,{grc:p},"Public corpusFiles must be a language:path object");
 assert.ok(existsSync(p),`Missing Greek original: ${p}`);
 const text=json(p);
 assert.equal(text.workId,id);
 assert.equal(text.language,"grc");
 assert.ok(text.passages.length>200,`Short corpus: ${id}`);
 assert.ok(text.passages.every(x=>x.text&&x.locus),"Every passage must retain locus and text");
 assert.ok(registry.some(e=>e.workId===id&&e.language==="grc"&&e.path===p),`Missing search registration ${id}`);
 assert.ok(index.some(e=>e.id===id&&e.lang==="grc"&&e.file===p),`Missing lexical index entry ${id}`);
 assert.equal(w.reading?.url,`classics-text-reader.html?work=${id}&lang=grc`);
}
const sappho=records.find(w=>w.id==="sappho-fragmenta");
assert.ok(sappho,"Sappho bibliographic record is required");
assert.equal(sappho.textStatus,"not-indexed","Unverified fragmentary text must not be claimed indexed");
assert.ok(!sappho.corpusFiles,"Do not publish a Sappho original without verifying its edition");
const aliases=[["callimachus-hymni","calimaco-himnos"],["theocritus-idyllia","teocrito-bucolicos"]];
for(const [githubId,r2Id] of aliases){
 assert.ok(r2.some(w=>w.workId===r2Id&&w.language==="grc"),`Known R2 edition missing: ${r2Id}`);
 assert.ok(registry.some(w=>w.workId===githubId&&w.language==="grc"),`Known GitHub edition missing: ${githubId}`);
}
console.log("Bibliotheca: seven indexed Greek works + one clearly unindexed bibliographic fiche verified; R2 editorial aliases preserved.");
