#!/usr/bin/env node
/* Conciliación no destructiva de indexación federada de Bibliotheca.
 * Uso: node scripts/audit-federated-indexation.mjs [--check]
 * Nunca equipara una ficha, PDF, URL o índice histórico no probado con
 * un texto navegable e indexado en la búsqueda pública.
 */
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const check=process.argv.includes('--check');
const inventory=read('data/r2/bibliotheca-inventario-unificado.json');
const registry=read('data/classics-corpus/search-registry.json');
const external=read('data/classics-corpus/external-index-reconciliation.json');
const counters=read('data/cifras-corpus.json');
const works=[...inventory.works,...inventory.supplementaryWorks,...inventory.additionalWorks];
const byId=new Map();
for(const w of works){
 if(!w?.id||byId.has(w.id))throw Error('Ficha sin ID o duplicada: '+w?.id);
 byId.set(w.id,w);
}
const registered=new Map();
for(const entry of registry.entries||[]){
 if(!registered.has(entry.workId))registered.set(entry.workId,[]);
 registered.get(entry.workId).push(entry);
}
const legacyExternal=new Map();
for(const item of external.remoteEntries||[]){
 if(!legacyExternal.has(item.workId))legacyExternal.set(item.workId,[]);
 legacyExternal.get(item.workId).push(item);
}
const editorial=new Set(['vitruvio-v514-pdf','vitruvio-v554-pdf','theory-v297-pdf']);
const missing=works.filter(w=>!registered.has(w.id)).map(w=>{
 const archived=legacyExternal.get(w.id)||[];
 const facsimiles=w.r2FacsimileEditions||[];
 let action='locate-and-verify-primary-source';
 if(archived.length)action='verify-existing-external-text-and-integrate-search';
 else if(editorial.has(w.id))action='link-existing-edition-to-parent-work-without-new-work-count';
 else if(facsimiles.length)action='verify-r2-facsimile-and-find-or-extract-licensed-text';
 return {
  id:w.id,author:w.author||'',title:w.title||'',catalogue:w.catalogue||'',
  action,
  evidence:{
   historicalExternalIndex:archived.map(x=>({
    language:x.language,branch:x.branch,textPath:x.textPath,
    sourceUrl:x.sourceUrl||null,sourceSha256:x.sourceSha256||null,
    passages:x.passages||null
   })),
   r2FacsimileCount:facsimiles.length,
   r2PdfUrls:facsimiles.map(x=>x.pdf).filter(Boolean)
  },
  status:'not-in-main-search-registry',
  caveat:'La presencia de un facsímil o un registro externo histórico no verifica lectura HTTP actual ni indexación en el buscador principal.'
 };
});
const counts={
 federatedCatalogue:works.length,
 registeredDistinctWorksInCatalogue:[...registered.keys()].filter(id=>byId.has(id)).length,
 registeredOutsideFederatedInventory:[...registered.keys()].filter(id=>!byId.has(id)).length,
 missingMainSearchRegistry:missing.length,
 indexedPublishedCounter:counters.obrasConTextoIndexado,
 externalHistoricalIndexCandidates:missing.filter(x=>x.action==='verify-existing-external-text-and-integrate-search').length,
 editorialManifestations:missing.filter(x=>x.action==='link-existing-edition-to-parent-work-without-new-work-count').length,
 facsimileSourceNeeded:missing.filter(x=>x.action==='verify-r2-facsimile-and-find-or-extract-licensed-text').length,
 sourceDiscoveryNeeded:missing.filter(x=>x.action==='locate-and-verify-primary-source').length
};
if(counts.federatedCatalogue!==counters.obrasTotalesDeclaradas)throw Error('Catálogo federado y contador publicados no concuerdan');
if(counts.registeredDistinctWorksInCatalogue+counts.missingMainSearchRegistry!==counts.federatedCatalogue)throw Error('Conciliación incompleta');
if(missing.some(x=>x.evidence.historicalExternalIndex.some(y=>!y.textPath||!y.sourceSha256)))throw Error('Índice externo con prueba documental incompleta');
const report={
 schema:'vdl-federated-indexation-backlog-v1',
 generated:'2026-11-17',
 sources:['data/r2/bibliotheca-inventario-unificado.json','data/classics-corpus/search-registry.json','data/classics-corpus/external-index-reconciliation.json','data/cifras-corpus.json'],
 method:'Diferencia por ID entre inventario federado y registro principal. No confirma disponibilidad HTTP, integridad textual, derechos ni cobertura del índice invertido. El contador de obras indexadas se presenta por separado.',
 counts,missing
};
const path='data/classics-corpus/federated-indexation-backlog.json';
const body=JSON.stringify(report,null,2)+'\n';
if(check){
 if(!fs.existsSync(path)||fs.readFileSync(path,'utf8')!==body)throw Error('La cola federada está desactualizada. Ejecutar: node scripts/audit-federated-indexation.mjs');
}else fs.writeFileSync(path,body,'utf8');
console.log(JSON.stringify(counts,null,2));
