#!/usr/bin/env node
/* Auditoría GitHub ↔ R2 de Bibliotheca. Sólo lectura; nunca elimina ni
   sobrescribe objetos. Ejecutar: node scripts/audit-bibliotheca-r2-sync.mjs
   --remote: comprobar también el listado de índices y objetos publicados. */
import {readFileSync} from "node:fs";
const root="data/r2/";
const load=p=>JSON.parse(readFileSync(root+p,"utf8"));
const catalogue=load("catalogo-clasicos-r2.json");
const indexed=load("indice-semantico-manifest.json");
const panel=load("bibliotheca-panel-sync.json");
const status=load("r2-object-status.json");
const ids=new Set(),duplicateIds=[];
for(const e of catalogue.items||[]){
 if(!e.id||!e.pdf||!e.texto)throw Error("Ficha incompleta: "+JSON.stringify(e).slice(0,150));
 if(ids.has(e.id))duplicateIds.push(e.id);
 ids.add(e.id);
}
const result={
  generated:new Date().toISOString(),
  githubEditions:ids.size,
  declaredIndexEditions:indexed.obras,
  indexedWithoutCatalogue:[],
  catalogueWithoutIndex:[],
  duplicateIds,
  pdfOcrMissing:status.counts?.objectsMissing??null,
  claimedPublishedIndex:indexed.publicado||null,
  remoteChecked:false,
  warnings:[]
};
if(duplicateIds.length)result.warnings.push("IDs repetidos en catálogo: "+duplicateIds.join(", "));
if(panel.summary?.r2PdfEditions!==ids.size)result.warnings.push("Panel desactualizado respecto al catálogo GitHub");
if(indexed.obras!==ids.size)result.warnings.push("Diferencia entre índice R2 y catálogo: "+indexed.obras+" frente a "+ids.size);
if(status.counts?.objectsMissing>0)result.warnings.push("El último control R2 registra objetos faltantes");
if(process.argv.includes("--remote")){
 const base=indexed.base||"https://libros.vitruvius-digital-library.org/clasicos/indice/";
 try{
  const r=await fetch(new URL("fragmentos.json",base),{headers:{"Accept":"application/json"},signal:AbortSignal.timeout(25000),cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status);
  const manifest=await r.json();
  if(!Array.isArray(manifest.obras))throw Error("Faltan obras[] en fragmentos.json");
  const remoteIds=new Set(manifest.obras.map(e=>e.id));
  result.indexedWithoutCatalogue=[...remoteIds].filter(id=>!ids.has(id)).sort();
  result.catalogueWithoutIndex=[...ids].filter(id=>!remoteIds.has(id)).sort();
  result.remoteChecked=true;
  if(result.indexedWithoutCatalogue.length)result.warnings.push("Índice sin ficha: "+result.indexedWithoutCatalogue.join(", "));
  if(result.catalogueWithoutIndex.length)result.warnings.push("Ficha sin índice: "+result.catalogueWithoutIndex.join(", "));
  if(remoteIds.size!==indexed.obras)result.warnings.push("El índice público no coincide con el manifiesto GitHub");
 }catch(e){result.warnings.push("No se pudo verificar R2 en vivo: "+e.message)}
}
console.log(JSON.stringify(result,null,2));
if(duplicateIds.length||result.catalogueWithoutIndex.length||result.pdfOcrMissing>0)process.exitCode=1;
