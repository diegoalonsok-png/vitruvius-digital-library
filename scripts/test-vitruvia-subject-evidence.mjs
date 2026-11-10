#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync("assets/vitruvia-search.js","utf8");
const start=source.indexOf("function documentarySubjectEvidence(");
const end=source.indexOf("\nfunction authorityWeight(",start);
assert(start>0&&end>start,"Academic subject guard must exist");
const fn=source.slice(start,end);
const sandbox={
 queryTokens:q=>[...new Set(String(q||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu," ").split(/\s+/).filter(x=>x.length>=3))],
 topicQuery:q=>q,
 matchingWorkIds:()=>[]
};
vm.runInNewContext(fn+";globalThis.check=documentarySubjectEvidence",sandbox);
const check=sandbox.check;
const page=(title,excerpt,extra={})=>({type:"passage",title,excerpt,...extra});
assert.equal(check(page("Vitruvio · De architectura 3.2.6","Obra de arquitectura romana"),"Panteón de Roma"),false,
 "An unrelated mention of Rome cannot prove a Pantheon subject");
assert.equal(check(page("Panteón de Roma · historia", "Edificio de Roma"),"Panteón de Roma"),true);
assert.equal(check(page("Vitruvio · De architectura","domus aedificiorum"),"domus"),true,
 "A single-word Latin concordance must still be found");
assert.equal(check(page("Edición · The Rolling Stones","obra musical"),"The Rolling Stones"),true);
assert.equal(check(page("Historia de arquitectura","Panorama de Roma",{
 externalFulltext:true}),"Panteón de Roma"),true,
 "A source claiming a genuine external full-text hit is evaluated separately");
sandbox.matchingWorkIds=()=>["caesar-gallico"];
assert.equal(check(page("Commentarii de bello Gallico","Pasaje latino",{
 workId:"caesar-gallico"}),"Julius Caesar"),true,
 "Directly catalogued work-author links must remain discoverable");
assert.equal(check(page("Vitruvio · De architectura","Nilus Aegypti"),"Nilo"),true);
assert.match(source,/documentarySubjectEvidence\(r,query\)/,
 "The production result-list sorter must actually invoke the guard");
console.log("PASS: subject-specific evidence rejects incidental multiword hits, preserves named topics, direct works and simple Latin terms");
