#!/usr/bin/env node
/**
 * Test the isolated R2 lexical builder with synthetic fixtures only.
 * Never fetches or changes a real original or an existing index.
 */
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
const temp=mkdtempSync(join(tmpdir(),"bibliotheca-r2-isolation-"));
const input=join(temp,"source"),output=join(temp,"index");
mkdirSync(input);
const original=[
 {workId:"r2-test-la",language:"la",title:"Original latino de prueba",passages:[{locus:"1.1",text:"domus et symmetria"},{locus:"1.2",text:"decor et firmitas"}]},
 {workId:"r2-test-grc",language:"grc",title:"Original griego de prueba",passages:[{locus:"1.1",text:"λόγος καὶ τέχνη"}]}
];
try{
 for(const book of original)writeFileSync(join(input,book.workId+".json"),JSON.stringify(book));
 const result=spawnSync(process.execPath,["scripts/build-classics-lexical-index.mjs","--source-dir",input,"--out-dir",output,"--no-structured"],{encoding:"utf8",maxBuffer:2*1024*1024});
 assert.equal(result.status,0,"Generator failed: "+(result.stderr||result.stdout));
 const manifest=JSON.parse(readFileSync(join(output,"manifest.json"),"utf8"));
 assert.equal(manifest.works,2,"Builder accidentally included Lexicon, HTML, Vitruvius or other local works");
 assert.equal(manifest.passages,3,"Builder must preserve the complete number of synthetic loci");
 assert.deepEqual(new Set(manifest.index.map(x=>x.id)),new Set(["r2-test-la","r2-test-grc"]));
 assert.deepEqual(new Set(manifest.index.map(x=>x.lang)),new Set(["la","grc"]));
 console.log("PASS: R2-only builder isolates exactly two synthetic editions and all 3 passages");
}finally{rmSync(temp,{recursive:true,force:true})}
