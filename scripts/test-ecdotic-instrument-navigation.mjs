import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Academic evidence and navigation contracts, not an independent textual collatio.
const read=path=>readFileSync(path,"utf8");
const json=path=>JSON.parse(read(path));
const registry=json("data/index/registro-ecdotico.json");
const originalNotes=json("data/critical-notes.json");
const strict=json("data/ecdotic-decisions.json");
assert.equal(registry.schema,"registro-ecdotico/1","Unexpected apparatus registry schema");
assert.equal(registry.recuentos.total,registry.registros.length,"Ecdotic registry total is stale");
const labels={"decision":"aparato editorial","glosa":"glosas","nota":"notas","lectura-h":"observaciones H"};
const counts={};
for(const type of Object.keys(labels)){
 counts[type]=registry.registros.filter(r=>r.tipo===type).length;
 assert.equal(registry.recuentos.porTipo[type],counts[type],
   "Incorrect "+labels[type]+" count");
}
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),registry.registros.length);
assert.equal(counts.nota,originalNotes.entries.length,"Source notes and ecdotic registry differ");
const notes=registry.registros.filter(r=>r.tipo==="nota");
const A=notes.filter(r=>r.grado==="explicito").length;
const B=notes.filter(r=>r.grado==="candidato").length;
const C=notes.filter(r=>r.grado==="sin-locus").length;
assert.equal(A+B+C,notes.length,"Nota A/B/C states must partition author notes");
assert(registry.registros.filter(r=>r.tipo==="lectura-h").every(r=>r.grado==="a-revisar"),
  "H observations must not be silently promoted to certified readings");
assert(Array.isArray(strict.decisions),"Strict scholarly decisions must have a distinct register");

const guide=read("guia-aparato-digital.html");
const pages=["aparato-critico.html","registro-ecdotico.html","colacion.html","comparador-loci.html","conspectus-testimoniorum.html"];
for(const page of pages){
 const html=read(page);
 assert(html.includes('href="guia-aparato-digital.html"'),page+" lacks methodological guidance");
 assert(/<h1\b/i.test(html),page+" lacks a title");
}
assert(guide.includes("data/ecdotic-decisions.json"),"Guide must name strict review register");
assert(guide.includes("no certifica")||guide.includes("no constituyen"),
 "Guide must distinguish editorial extraction from manuscript collation");
for(const [type,count] of Object.entries(counts)){
 assert(guide.includes('registro-ecdotico.html?tipo='+type),
   "Guide must link to the "+labels[type]+" view");
 assert(guide.includes(count.toLocaleString("es-AR")),
   "Guide's published "+labels[type]+" count is stale");
}
for(const count of [A,B,C]){
 assert(guide.includes(count.toLocaleString("es-AR")),
   "Guide's published A/B/C note count is stale");
}
assert(guide.includes("No se")||guide.includes("no contiene"),
 "The guide must explain certification limits");
assert(read("sitemap.xml").includes("<loc>https://vitruvius-digital-library.org/guia-aparato-digital.html</loc>"),
 "The methodological guide needs a discoverable sitemap URL");
const viewer=read("assets/registro-ecdotico.js");
assert(viewer.includes('new URLSearchParams(location.search)') && viewer.includes('["tipo","re-tipo"]'),
 "The linked typed searches must be accepted from the URL");
console.log("PASS ecdotic tools: "+registry.registros.length+" source records; notes A/B/C "+
 [A,B,C].join("/")+"; 5 linked instruments and precise evidence disclosures.");
