import assert from "node:assert/strict";
import fs from "node:fs";
const path="data/tablas-explicativas-v297.json";
const d=JSON.parse(fs.readFileSync(path,"utf8"));
assert.equal(d.schema,"vitruvius-explanatory-tables-v297-v1");
assert.equal(d.source.doi,"10.5281/zenodo.23885110");
assert.equal(d.source.sourceSha256,"5812cbc7c9c246db46a2e66d9e9291307afc03d6a7d3349eeb7ab80260b11c99");
assert.equal(d.source.detectedWordTables,26);
assert.equal(d.selectedTables.length,9);
const seen=new Set();
for(const t of d.selectedTables){
 assert(Number.isInteger(t.n)&&!seen.has(t.n)&&t.n>=1&&t.n<=26);
 seen.add(t.n);
 assert(t.title&&t.locus&&t.summary&&t.area);
 assert(t.rows.length>0&&t.columns.length>0);
 for(const row of t.rows)assert.equal(row.length,t.columns.length);
}
assert(d.selectedTables.some(t=>t.rows.flat().join(" ").includes("συμμετρία")));
assert(d.selectedTables.some(t=>t.n===10&&t.manuscriptLink==="codex-h-folios-local.html"));
const page=fs.readFileSync("tablas-explicativas.html","utf8");
assert(page.includes("https://doi.org/10.5281/zenodo.23885110"));
assert(page.includes("data/tablas-explicativas-v297.json"));
assert(page.includes("No constituye una nueva colación"));
assert(page.includes("index.html#buscar"));
for(const nav of ["index.html","bibliotheca-graeca-latina.html"]){
 assert(fs.readFileSync(nav,"utf8").includes('href="tablas-explicativas.html"'));
}
assert(fs.readFileSync("sitemap.xml","utf8").includes("/tablas-explicativas.html"));
console.log("PASS: 9 tablas reales V297, DOI, loci, códice H y enlaces preservados.");
