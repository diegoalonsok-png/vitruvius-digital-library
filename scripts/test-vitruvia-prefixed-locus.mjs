#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
// Exercise the REAL browser research engine, not a reimplemented parser.
const window={};
vm.runInNewContext(fs.readFileSync("assets/vitruvia-research-engine.js","utf8"),
 {window,URLSearchParams,console,fetch:()=>{throw Error("no network required")}});
const E=window.VitruviaResearchEngine;
assert(E?.parseReference&&E?.passageRows&&E?.classify);
for(const query of ["1.1.1","locus 1.1.1","Locus: I.1.1","loc. 1.1.1","loci 1.1.1"]){
 const p=E.parseReference(query);
 assert.equal(JSON.stringify(p),JSON.stringify({book:1,chapter:1,section:1}),query);
 assert.equal(E.classify(query).locus,"1.1.1",query);
}
assert.equal(E.parseReference("locus sensu genetico"),null);
const source=JSON.parse(fs.readFileSync("data/structured/recensio-es.json","utf8"));
const rows=E.passageRows("locus 1.1.1",source.passages.map(p=>({
 ...p,edition:source.edition,language:source.language,version:source.version||"V514",
 pdfPages:p.pdf_pages
})),{concept:false});
assert(rows.length>=1,"A requested locus should return its real indexed passage");
assert.equal(rows[0].locus,"1.1.1");
assert.match(rows[0].title,/De architectura 1\.1\.1/);
assert(rows[0].links.some(x=>x.url.includes("locus=1.1.1")),"A source passage needs a direct reader link");
const core=fs.readFileSync("assets/vitruvia-search.js","utf8");
assert(core.includes("const exactLocusRequest="));
assert.match(core,/const wikiEnabled=.*!exactLocusRequest/);
assert.match(core,/const academicEnabled=.*!exactLocusRequest/);
console.log("PASS: explicit loci 1.1.1 and prefixed forms resolve to indexed De architectura, with direct reader link and no unrelated web providers.");
