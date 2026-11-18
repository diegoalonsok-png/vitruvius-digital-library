import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const page=fs.readFileSync("index.html","utf8");
const bib=fs.readFileSync("bibliotheca-graeca-latina.html","utf8");
for(const doc of [page,bib]){
 assert(doc.includes('assets/bibliotheca-offsite-greek.js'));
 assert(doc.includes('assets/bibliotheca-offsite-latin.js'));
 assert(/bibliotheca-graeca-latina(\.html)?\b/.test(doc));
}
assert(bib.includes("assets/classics-corpus-counts.js"),"Bibliotheca must provide the catalogue counters");
assert(bib.includes("assets/bibliotheca-academic-provenance.js"));
assert(page.includes('data-cifra="obrasConTextoIndexado"'),"La portada debe mostrar obras realmente indexadas");
assert(page.includes('data-cifra="obrasTotalesDeclaradas"'),"La portada debe mostrar el catálogo federado sin duplicaciones");
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
const ids=new Set(road.items.map(w=>w.id));
const primaryEntries=registry.entries.filter(e=>ids.has(e.workId));
const human=new Set(primaryEntries.filter(e=>["en","es","fr"].includes(e.language)).map(e=>e.workId));
assert.equal(translations.totals.translatedWorksLocal,human.size,"Las traducciones humanas declaradas deben coincidir con el registro textual primario");
assert.equal(road.counts.worksWithHostedTranslation,human.size,"La hoja de ruta debe reflejar las traducciones humanas reales");
assert.equal(translations.totals.registeredTextVersions,primaryEntries.length);
assert.equal(road.counts.registeredTextVersions,primaryEntries.length);
const greek=JSON.parse(fs.readFileSync("data/classics-corpus/lucian-dialogi-mortuorum-grc.json","utf8"));
const english=JSON.parse(fs.readFileSync("data/classics-corpus/lucian-dialogi-mortuorum-en.json","utf8"));
assert.equal(greek.passages.length,113);
assert.equal(english.passages.length,113);
assert.equal(english.translator,"Matthew Donald Macleod");
assert.match(english.license,/CC BY-SA 4\.0/);
assert.equal(english.alignmentStatus,"section");
assert.deepEqual(english.passages.map(p=>p.locus.split(":").at(-1)),greek.passages.map(p=>p.locus.split(":").at(-1)),"Luciano: cotejo documental exacto de las 113 referencias");
assert(registry.entries.some(e=>e.workId==="lucian-dialogi-mortuorum"&&e.language==="en"&&e.path==="data/classics-corpus/lucian-dialogi-mortuorum-en.json"));

console.log("PASS: contador compartido auditado, ficha ecdótica y núcleo Vitruviano preservado.");
