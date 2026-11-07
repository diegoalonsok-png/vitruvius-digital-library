#!/usr/bin/env node
/**
 * Audit of the extracted critical apparatus. This is a provenance check, NOT a
 * manuscript collation. It never edits the mother text or inferred loci.
 * Run: node scripts/audit-apparatus-provenance.mjs
 */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const index=load('data/apparatus-index.json');
const decisions=load('data/ecdotic-decisions.json');
const notes=load('data/critical-notes.json');
assert.ok(Array.isArray(index.entries),'Apparatus entries missing');
assert.ok(Array.isArray(notes.entries),'Critical notes missing');
assert.ok(Array.isArray(decisions.decisions),'Decisions missing');
const errors=[],warnings=[],byStatus={},byEdition={},seen=new Set();
const noteKeys=new Set(notes.entries.map(n=>n.edition+'|'+String(n.footnote_id)));
const plausible=/^(?:[1-9]|10)\.(?:praef\.)?\d+(?:\.\d+)?$/i;
const add=(arr,id,message)=>arr.push({id,message});
for(const e of index.entries){
 const id=String(e.id||'');
 if(!id||seen.has(id))add(errors,id,'ID inexistente o duplicado');
 seen.add(id);
 if(!['nota','bloque'].includes(e.source))add(errors,id,'Origen no reconocido');
 if(!['recensio-es','recensio-fr','theory-en'].includes(e.edition))add(errors,id,'Edición no reconocida');
 if(!String(e.text||'').trim())add(errors,id,'Texto crítico vacío');
 const links=Array.isArray(e.loci)?e.loci:[];
 if(!Array.isArray(e.loci))add(errors,id,'loci debe ser un arreglo');
 for(const loc of links){if(!plausible.test(String(loc)))add(warnings,id,'Locus no canónico: '+loc)}
 const state=String(e.locusLink||'sin declarar');
 byStatus[state]=(byStatus[state]||0)+1;
 byEdition[e.edition]=(byEdition[e.edition]||0)+1;
 if(e.source==='nota'){
  const number=id.match(/-n(.+)$/)?.[1];
  if(!number||!noteKeys.has(e.edition+'|'+number))add(errors,id,'Nota sin origen DOCX rastreable');
  if(state==='locus explícito'&&!e.locusMention)add(errors,id,'Se declara explícito sin mención registrada');
  if(/estimado|candidato|contexto de página/i.test(state))add(warnings,id,'Vínculo orientativo; no apto para acreditar lectio varia');
 } else {
  if(e.locusInHeading&&!e.locusMention)add(errors,id,'Encabezado explícito sin locus');
  if(/contexto de página|sin locus/i.test(state))add(warnings,id,'Locus contextual o ausente: no equivale a asignación ecdótica');
 }
}
const decisionIds=new Set();
for(const d of decisions.decisions){
 if(decisionIds.has(d.id))add(errors,d.id,'Decisión duplicada');
 decisionIds.add(d.id);
 if(d.recordStatus==='verified_with_source'&&d.evidenceType==='unverified')
  add(errors,d.id,'Decisión certificada con evidencia no verificada');
}
const report={
 schema:'vitruvius-apparatus-provenance-audit/1',
 indexSchema:index.schema,
 totals:{entries:index.entries.length,notes:index.entries.filter(x=>x.source==='nota').length,
 blocks:index.entries.filter(x=>x.source==='bloque').length,decisions:decisions.decisions.length},
 byEdition,byLocationState:byStatus,
 errorCount:errors.length,warningCount:warnings.length,
 errors:errors.slice(0,300),warningExamples:warnings.slice(0,100),
 limitation:'La validación controla procedencia y rótulos. No certifica variantes ni sustituye la colación de manuscritos.'
};
mkdirSync('reports',{recursive:true});
writeFileSync('reports/apparatus-provenance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({totals:report.totals,errorCount:errors.length,warningCount:warnings.length,byLocationState:byStatus},null,2));
if(errors.length){console.error('Errores de procedencia:',JSON.stringify(errors.slice(0,12)));process.exitCode=1}
