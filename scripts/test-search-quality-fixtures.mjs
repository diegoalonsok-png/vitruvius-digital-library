#!/usr/bin/env node
/**
 * Academic search quality fixture audit.
 * The tests verify attested text/locus/provenance, NOT live ranking, OCR quality,
 * semantic relevance, peer review, translation equivalence or competitor metrics.
 */
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {dirname} from "node:path";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const fixture=read("data/academic-evaluation/search-fixtures.json");
const registry=read("data/classics-corpus/search-registry.json");
const roadmap=read("data/classics-corpus/indexation-roadmap-222.json");
const alignment=read("data/classics-alignment/manifest.json");
assert.equal(fixture.schema,"vitruvius-search-quality-fixtures-v1");
assert(fixture.cases.length>=18,"The test set should contain at least 18 independently specified examples.");
const normalize=text=>String(text??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replaceAll("ς","σ").replace(/\s+/g," ").trim();
const out=[],sourceCache=new Map();
for(const test of fixture.cases){
 let status="pass",reason="",source="",len=0;
 try{
  const records=registry.entries.filter(e=>e.workId===test.workId&&e.language===test.language&&
    ["json-passages","structured-bilingual"].includes(e.format));
  assert(records.length>=1,"La edición no está registrada.");
  const edit=records[0];assert(/^data\/(?:classics-corpus|structured)\/[\w/-]+\.json$/.test(edit.path),"Ruta local no reconocida.");
  const item=roadmap.items.find(x=>x.id===test.workId);assert(item,"No consta la obra en el catálogo.");
  let raw=sourceCache.get(edit.path);
  if(!raw){raw=read(edit.path);sourceCache.set(edit.path,raw);}
  const sourceMeta=raw.source||raw.attribution||edit.source||edit.attribution;
  assert(sourceMeta,"Falta la referencia editorial o procedencia declarada.");
  const passages=raw.passages||[],passage=passages.find(p=>String(p.locus)===test.locus);
  assert(passage,"No existe el locus editorial solicitado.");
  const value=edit.format==="structured-bilingual"?(test.language==="la"?passage.latin:passage.translation):passage.text;
  assert(typeof value==="string"&&value.trim(),"El locus existe pero no contiene texto.");
  len=value.length;
  assert(normalize(value).includes(normalize(test.query)),"La frase literal no está atestiguada en ese locus.");
  source=typeof sourceMeta==="string"?sourceMeta:JSON.stringify(sourceMeta);
 }catch(e){status="fail";reason=e.message}
 out.push({...test,status,reason,characters:len,hasDeclaredSource:!!source});
}
const found=out.filter(x=>x.status==="pass").length;
const actualWorks=[...new Set(out.map(x=>x.workId))].length;
const languages=[...new Set(out.map(x=>x.language))].sort();
const sourceCoverage=out.filter(x=>x.hasDeclaredSource).length;
const byPhenomenon={};
for(const t of out){
 const k=t.phenomenon;
 byPhenomenon[k]??={passed:0,total:0};
 byPhenomenon[k].total++;
 if(t.status==="pass")byPhenomenon[k].passed++;
}
assert.equal(registry.count,registry.entries.length,"El total de versiones registrado no coincide.");
assert.equal(roadmap.counts.effectiveOriginalsIndexed+roadmap.counts.effectiveOriginalsMissing,roadmap.targetWorks);
assert(alignment.count===alignment.pairs.length,"El manifiesto de comparaciones no coincide.");
const apuleius=alignment.pairs.filter(p=>p.workId==="apuleius-metamorphoses");
assert(apuleius.every(p=>p.status!=="verified-semantic-alignment"),"La segmentación apuleyana no puede convertirse automáticamente en cotejo semántico.");
const report={
 schema:"vitruvius-search-quality-fixture-report-v1",
 generated:new Date().toISOString(),
 disclaimer:"Auditoría de pasajes documentados y su fuente en un subconjunto manual. No mide ranking ni latencia del buscador en vivo; no es comparación experimental con Perseus, Logeion, Google o Bing.",
 total:out.length,passed:found,failed:out.length-found,
 passRate:out.length?Number((found/out.length).toFixed(4)):null,
 documentedSourceRate:out.length?Number((sourceCoverage/out.length).toFixed(4)):null,
 distinctWorks:actualWorks,languages,byPhenomenon,
 originalIndexCoverage:{local:roadmap.counts.originalsIndexed,external:roadmap.counts.offsiteOriginalsIndexed,effective:roadmap.counts.effectiveOriginalsIndexed,total:roadmap.targetWorks},
 tests:out
};
const path="reports/search-quality-fixtures.json";
mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({passed:found,total:out.length,works:actualWorks,languages,failed:out.filter(x=>x.status==="fail")},null,2));
if(found!==out.length)process.exitCode=1;
