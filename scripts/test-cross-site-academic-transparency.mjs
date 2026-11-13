#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(path,"utf8");
const audit=read("auditoria-academica.html");
for(const name of ["index.html","vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html"]){
 assert.match(read(name),/href="auditoria-academica\.html"/,"Missing public transparency link: "+name);
}
const scripts=[...audit.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
for(const source of scripts) new vm.Script(source,{filename:"auditoria-academica.html:inline"});
assert.match(audit,/id="external-coverage-status"/);
assert.match(audit,/corpus-originales-griegos-20261108/);
assert.match(audit,/corpus-originales-latinos-20261108/);
assert.match(audit,/remote.size!==entries.length/);
assert.match(audit,/localIds\.has\(id\)/);
assert.match(audit,/No se alojan aquí copias nuevas de obras/);
assert.match(audit,/no acredita por sí solo/);
assert.match(audit,/Chicago, 18\.ª edición/);
assert.match(audit,/IIIF Presentation API 3\.0/);
assert.match(audit,/W3C PROV-O/);
const road=JSON.parse(read("data/classics-corpus/indexation-roadmap-222.json"));
const coverage=JSON.parse(read("data/classics-corpus/coverage-audit.json"));
const registry=JSON.parse(read("data/classics-corpus/search-registry.json"));
const works=new Set(road.items.filter(w=>w.originalIndexed).map(w=>w.id));
assert(road.items.length>=222,"El catálogo no debe perder los 222 registros del inventario original");
assert.equal(road.targetWorks,road.items.length,"Inventario objetivo desincronizado");
assert.equal(coverage.works.length,road.items.length,"Las fichas deben concordar con la auditoría de cobertura");
assert.equal(coverage.counts.cataloguedWorks,road.items.length);
assert.equal(road.counts.originalsIndexed,works.size);
assert.equal(works.size,road.counts.originalsIndexed,"Los originales locales indexados deben corresponder al roadmap");
const searchableWorks=new Set(registry.entries.map(e=>e.workId));
assert.equal(coverage.counts.indexedDistinctWorks,searchableWorks.size,"Los distintos registros indexados deben concordar con el registro de búsqueda");
assert.equal(registry.entries.length,coverage.counts.indexedTextVersions);
assert.equal(registry.works,searchableWorks.size);
console.log("PASS: All four sites link a provenance dashboard and count only verified local works.");
