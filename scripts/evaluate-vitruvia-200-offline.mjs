#!/usr/bin/env node
/* Reproducible OFFLINE evaluation of the 200 declared Vitruvia queries.
 * Checks only generic entity subject interpretation, not search results,
 * live availability, external services or scholarly identity verification.
 * No source fixture is modified, and no mismatch is silently counted as a pass.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const fixture=JSON.parse(fs.readFileSync("data/qa/vitruvia-regression-200.json","utf8"));
assert.ok(Array.isArray(fixture.cases)&&fixture.cases.length===200,"Expected exactly 200 declared queries");
const js=fs.readFileSync("assets/vitruvia-entity-resolver.js","utf8");
const win={};
vm.runInNewContext(js,{window:win,URL,URLSearchParams,AbortController,console});
assert.equal(typeof win.VitruviaEntityResolver?.subject,"function","Subject resolver unavailable");
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const seen=new Set(),rows=[];
for(const c of fixture.cases){
 assert.ok(c.id&&c.query&&c.expectedEntity&&c.category,"Invalid fixture record");
 assert.ok(!seen.has(c.id),"Duplicate fixture id "+c.id);
 seen.add(c.id);
 let actual="",error="";
 try{actual=String(win.VitruviaEntityResolver.subject(c.query)||"");}catch(e){error=String(e);}
 const equal=!error&&fold(actual)===fold(c.expectedEntity);
 rows.push({
  id:c.id,category:c.category,query:c.query,expectedEntity:c.expectedEntity,
  resolvedSubject:actual,offlineSubjectMatch:equal,
  result: error?"error":equal?"match":"mismatch",
  error:error||undefined,
  liveSearchChecked:false,
  editoriallyVerified:false
 });
}
const counts=rows.reduce((a,x)=>(a[x.result]=(a[x.result]||0)+1,a),{});
const report={
 schema:"vitruvia-200-offline-subject-evaluation-v1",
 scope:"200 offline subject resolver calls; NOT 200 full search executions, browser tests, academic attribution or external-result verification",
 fixture:"data/qa/vitruvia-regression-200.json",
 resolver:"assets/vitruvia-entity-resolver.js",
 total:rows.length,counts,
 cases:rows
};
fs.mkdirSync("reports",{recursive:true});
fs.writeFileSync("reports/vitruvia-200-offline-evaluation.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({total:rows.length,counts,discrepancies:rows.filter(x=>x.result!=="match").slice(0,20).map(x=>({id:x.id,query:x.query,expected:x.expectedEntity,actual:x.resolvedSubject}))},null,2));
if(rows.some(x=>x.result==="error"))process.exitCode=1;
