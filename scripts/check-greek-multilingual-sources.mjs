#!/usr/bin/env node
// Audit source leads, not claims that every linked work has been fully indexed.
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const reg=JSON.parse(readFileSync("data/classics-corpus/search-registry.json","utf8"));
const report=JSON.parse(readFileSync("data/classics-corpus/greek-multilingual-translation-sources-2026-11-18.json","utf8"));
const originals=reg.entries.filter(e=>e.language==="grc"),ids=new Set(originals.map(e=>e.workId));
assert.equal(report.works.length,ids.size,"Every original work must be accounted for exactly once");
const unique=new Set();
const statuses=new Set(["registered-local","pending-merge","candidate-perseus-tei","candidate-perseus-partial","candidate-work-page","readable-text-confirmed","not-yet-verified"]);
const counts={en:{},fr:{},es:{}};
for(const w of report.works){
 assert(ids.has(w.id),"Unknown Greek ID: "+w.id);
 assert(!unique.has(w.id),"Duplicate work: "+w.id);unique.add(w.id);
 assert.equal(w.original?.path,originals.find(e=>e.workId===w.id)?.path,"Original path changed: "+w.id);
 for(const lang of ["en","fr","es"]){
  const e=w.translations?.[lang];assert(e&&statuses.has(e.status),"Invalid translation status: "+w.id+" "+lang);
  counts[lang][e.status]=(counts[lang][e.status]||0)+1;
  if(e.status==="registered-local"){
   const current=reg.entries.find(r=>r.workId===w.id&&r.language===lang);
   assert(current&&current.path===e.path,"Registered language missing: "+w.id+"/"+lang);
   if(!e.path.startsWith("https:"))assert(existsSync(e.path),"Missing local edition: "+e.path);
  }
  if(e.status==="pending-merge")assert(e.pr===418,"Unattributed PR: "+w.id);
  if(["candidate-perseus-tei","candidate-perseus-partial","candidate-work-page","readable-text-confirmed"].includes(e.status)){
   const u=new URL(e.url);
   assert(["github.com","fr.wikisource.org","es.wikisource.org"].includes(u.hostname),"Untrusted external source "+e.url);
   assert(!u.search.includes("redlink=1"),"Nonexistent Wiki page "+e.url);
  }
  if(e.status==="readable-text-confirmed"){
   assert(e.readableCharacters>5000&&e.translator,"Unverified readable text: "+w.id);
   assert(e.usageRightsChecked===false&&e.locusAlignmentChecked===false,"Do not advertise publication rights or alignment without audit");
  }
 }
}
for(const lang of ["en","fr","es"])assert.deepEqual(counts[lang],report.statusByLanguage[lang],"Status total mismatch: "+lang);
console.log("PASS: "+ids.size+" Greek works × EN/FR/ES, trusted leads, no duplicate IDs");
console.log(JSON.stringify(counts,null,2));
