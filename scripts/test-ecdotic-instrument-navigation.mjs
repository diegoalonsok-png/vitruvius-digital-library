import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Academic evidence and navigation contracts, not an independent textual collatio.
const read=path=>readFileSync(path,"utf8");
const json=path=>JSON.parse(read(path));
const registry=json("data/index/registro-ecdotico.json");
const originalNotes=json("data/critical-notes.json");
const strict=json("data/ecdotic-decisions.json");
const reviewQueue=json("data/ecdotic-note-review-queue-2026-11-14.json");
assert.equal(reviewQueue.schema,"vdl-ecdotic-note-review-queue-v1");
assert.equal(reviewQueue.items.length,reviewQueue.priority_candidate_count);
assert.equal(new Set(reviewQueue.items.map(item=>item.queue_id)).size,reviewQueue.items.length);
assert(reviewQueue.items.every(item=>item.verification_status==="pending_human_review"
 &&item.original_locus===null&&item.candidate_locus
 &&/^(1\.1|3\.1)\./.test(item.candidate_locus)
 &&item.source_file&&Number.isInteger(item.source_paragraph)
 &&!item.reviewer&&!item.reviewed_on&&!item.evidence_uri),
 "Reviewer worklist cannot silently certify candidate notes");
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
assert(guide.includes("data/ecdotic-note-review-queue-2026-11-14.json")
 &&read("registro-ecdotico.html").includes("data/ecdotic-note-review-queue-2026-11-14.json"),
 "The transparent candidate worklist must be accessible from the apparatus tools");
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
// Review UI contract: manual workflow only, never a change to editorial proof.
const reviewPage=read("revision-anclajes-ecdoticos.html");
const reviewClient=read("assets/ecdotic-review-queue.js");
const teiNotes=read("data/tei/notae-auctoris-locis-explicitis-2026-11-14.xml");
for(const page of ["guia-aparato-digital.html","registro-ecdotico.html","aparato-critico.html","cobertura-aparato-critico.html"])
 assert(read(page).includes("revision-anclajes-ecdoticos.html"),"Worklist not linked from "+page);
assert(read("sitemap.xml").includes("revision-anclajes-ecdoticos.html</loc>"),"Review worklist missing sitemap");
assert(reviewPage.includes("data/ecdotic-note-review-queue-2026-11-14.json")
 &&reviewPage.includes("data/tei/notae-auctoris-locis-explicitis-2026-11-14.xml"),
 "Review UI must identify original reviewed and unreviewed note sources");
assert(reviewClient.includes("pending_human_review")&&reviewClient.includes("original_locus===null")
 &&reviewClient.includes("no cambia el estado")&&reviewClient.includes("textContent"),
 "Client must never upgrade pending note status or inject original note text as HTML");
assert(teiNotes.includes("http://www.tei-c.org/ns/1.0")
 &&!/<app\\b|<rdg\\b|<lem\\b/.test(teiNotes),
 "TEI source-explicit notes cannot be encoded as certified manuscript variants");
new (await import("node:vm")).Script(reviewClient,{filename:"assets/ecdotic-review-queue.js"});
const viewer=read("assets/registro-ecdotico.js");
assert(viewer.includes('new URLSearchParams(location.search)') && viewer.includes('["tipo","re-tipo"]'),
 "The linked typed searches must be accepted from the URL");
console.log("PASS ecdotic tools: "+registry.registros.length+" source records; notes A/B/C "+
 [A,B,C].join("/")+"; 5 linked instruments and precise evidence disclosures.");
