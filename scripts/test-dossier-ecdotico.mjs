/* Prueba reproducible del mapa ecdótico y su dossier comparativo.
 * No infiere verificación paleográfica de OCR, índices ni traducciones.
 */
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const txt=p=>fs.readFileSync(p,"utf8");
const json=p=>JSON.parse(txt(p));
const html=txt("cobertura-aparato-critico.html");
const js=txt("assets/dossier-ecdotico.js");
const coll=json("data/apparatus/collatio-validada.json");
const hist=json("data/apparatus/aparato-comparativo.json");
const h=json("data/codex-h/folio-locus-map.json");
const acad=json("data/academic-integrity.json");
const notes=json("data/critical-notes.json");
const appar=json("data/apparatus/aparato-autoral.json");

assert.equal(acad.canonicalReferences.length,731);
const canonical=new Set(acad.canonicalReferences);
const sourceLoci=new Set(hist.loci.filter(x=>
 (x["rose-1899"]?.entradas?.length||0)+(x["krohn-1912"]?.entradas?.length||0)>0).map(x=>x.locus));
const collLoci=new Set(coll.entradas.map(x=>x.locus).filter(x=>canonical.has(x)));
const hLoci=new Set(h.entries.flatMap(x=>(x.loci||[]).map(y=>y.locus)).filter(x=>canonical.has(x)));
assert.equal(sourceLoci.size,704,"El mapa distingue 704 loci con notas OCR de 707 loci con material comparativo");
assert.equal(collLoci.size,147,"El aparato del autor es selectivo");
assert.ok(hLoci.size>0);
assert.equal(notes.entries.length,811);
assert.equal(appar.glosas.length,803);
for(const u of ["assets/dossier-ecdotico.js","assets/dossier-ecdotico.css",
 "data/structured/recensio-es.json","data/structured/recensio-fr.json",
 "data/structured/theory-en.json","data/collation-loci.json",
 "data/apparatus/aparato-comparativo.json","data/codex-h/folio-locus-map.json",
 "data/codex-h/observaciones-h.json"])assert.ok(fs.existsSync(u),u+" debe existir");
assert.match(html,/id="dossier"/);
assert.match(html,/data-dossier/);
assert.match(html,/vdl:coverage-ready/);
assert.match(html,/rose_krohn_ocr/);
assert.match(html,/codex_h_folios/);
assert.match(html,/assets\/dossier-ecdotico\.js/);
assert.match(js,/OCR/);
assert.match(js,/No hay entrada del Apéndice T/);
assert.match(js,/No hay entradas de aparato histórico/);
assert.match(js,/Harley MS 2767/);
assert.match(js,/Consult[eai]/i);
const inline=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inline,"El mapa debe incluir código de consulta");
new vm.Script(inline[1],{filename:"cobertura-aparato-critico.inline.js"});
new vm.Script(js,{filename:"assets/dossier-ecdotico.js"});
console.log("PASS · 731 loci · "+collLoci.size+" con colación editorial · "+sourceLoci.size+" con notas OCR Rose/Krohn · "+hLoci.size+" con folios H");
console.log("PASS · Dossier y mapa enlazados, fuentes conservadas, scripts válidos");
