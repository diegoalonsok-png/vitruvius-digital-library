import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const page=fs.readFileSync("index.html","utf8");
const bib=fs.readFileSync("bibliotheca-graeca-latina.html","utf8");
for(const doc of [page,bib]){
 assert(doc.includes('assets/classics-corpus-counts.js'));
 assert(doc.includes('assets/bibliotheca-offsite-greek.js'));
 assert(doc.includes('assets/bibliotheca-offsite-latin.js'));
 assert(doc.includes("bibliotheca-graeca-latina.html"));
}
assert(bib.includes("assets/bibliotheca-academic-provenance.js"));
assert(page.includes('id="stat-records"'),"Las cifras vitruvianas anteriores permanecen");
assert(page.includes("CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR"));
assert(bib.includes("assets/bibliotheca-simple.js"));
const counts=fs.readFileSync("assets/classics-corpus-counts.js","utf8");
const prov=fs.readFileSync("assets/bibliotheca-academic-provenance.js","utf8");
for(const js of [counts,prov])new vm.Script(js);
for(const word of ["indexation-roadmap-222.json","translation-availability-222.json","search-registry.json","remote-json-passages"])
 assert(counts.includes(word),"Recuento no verificable por fuente: "+word);
assert(prov.includes("Testimonio más antiguo digitalizado"));
assert(prov.includes("sin acreditación documental suficiente"));
assert(prov.includes("codex-h-doble-folio.html"));
const road=JSON.parse(fs.readFileSync("data/classics-corpus/indexation-roadmap-222.json","utf8"));
const translations=JSON.parse(fs.readFileSync("data/classics-corpus/translation-availability-222.json","utf8"));
const registry=JSON.parse(fs.readFileSync("data/classics-corpus/search-registry.json","utf8"));
assert.equal(road.targetWorks,road.items.length);
assert.equal(road.counts.originalsIndexed,road.items.filter(w=>w.originalIndexed).length);
assert.equal(translations.totals.cataloguedWorks,road.targetWorks);
assert.equal(registry.entries.length,registry.count);
assert.equal(translations.totals.translatedWorksLocal,59);
console.log("PASS: contador compartido auditado, ficha ecdótica y núcleo Vitruviano preservado.");
