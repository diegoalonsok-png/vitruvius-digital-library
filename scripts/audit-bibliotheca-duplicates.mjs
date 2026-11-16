#!/usr/bin/env node
/* Detección NO destructiva de duplicaciones editoriales en Bibliotheca.
 * No borra, renombra ni reescribe archivos. Obras con varias ediciones
 * legítimas se mantienen. Ejecutar: node scripts/audit-bibliotheca-duplicates.mjs
 */
import {readFileSync} from 'node:fs';
const file='data/r2/catalogo-clasicos-r2.json';
const rows=JSON.parse(readFileSync(file,'utf8')).items||[];
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const keys=[
 ['id',x=>x.id],
 ['URL PDF',x=>x.pdf],
 ['URL texto',x=>x.texto],
 ['SHA256 PDF',x=>x.sha256],
 ['identificador de fuente + volumen',x=>x.identificadorIA && [x.identificadorIA,x.volumen].map(normalize).join('|')]
];
const exact=[],review=[];
for(const [label,fn] of keys){
 const seen=new Map();
 for(const x of rows){
  const value=String(fn(x)||'').trim();
  if(!value)continue;
  if(seen.has(value))exact.push({criterio:label,valor:value,primero:seen.get(value),segundo:x.id});
  else seen.set(value,x.id);
 }
}
const seenEdition=new Map();
for(const x of rows){
 const key=[x.autor,x.obra,x.anio,x.volumen,x.editor,x.tituloEdicion].map(normalize).join('|');
 if(key.replace(/\|/g,'')){
  if(seenEdition.has(key) && seenEdition.get(key)!==x.id)review.push({criterio:'metadatos de edición coincidentes',primero:seenEdition.get(key),segundo:x.id});
  else seenEdition.set(key,x.id);
 }
}
const out={archivo:file,ediciones:rows.length,duplicadosExactos:exact,revisionEditorial:review,
 nota:'El mismo título con otro año, volumen, traducción o edición NO es duplicación automática. No se realizan cambios.'};
console.log(JSON.stringify(out,null,2));
if(exact.length)process.exitCode=1;
