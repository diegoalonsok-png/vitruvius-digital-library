#!/usr/bin/env node
/* Auditoría GitHub/R2: no confundir registro, OCR, objeto ni texto cotejado. */
import {readFileSync,writeFileSync,readdirSync,existsSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const cat=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const overlay=read("data/bibliotheca-expansion-publicada-2026-11-16.json").works;
const pdf=read("data/r2/catalogo-clasicos-r2.json").items;
const links=read("data/r2/vinculos-repertorio.json");
const reg=read("data/classics-corpus/search-registry.json").entries;
const corpusR2=read("data/r2/corpus-manifest.json");
const semantic=read("data/r2/indice-semantico-manifest.json");
const quality=read("data/classics-corpus/catalogue-quality-audit-2026-11-14.json");
const candidates=read("data/r2/clasicos-candidatos.json").obras;
const issues=[],critical=[];
function ids(rows,key,label){
 const seen=new Set();
 for(const row of rows){const id=key(row);if(!id||seen.has(id))critical.push(label+" duplicado: "+id);seen.add(id)}
 return seen;
}
const works=ids(cat,w=>w.id,"Obra"),overlayIds=ids(overlay,w=>w.id,"Obra suplementaria"),pdfIds=ids(pdf,e=>e.id,"PDF R2");
for(const id of overlayIds)if(works.has(id))critical.push("Obra suplementaria duplicada en catálogo principal: "+id);
const allWorks=new Set([...works,...overlayIds]);
ids(reg,e=>[e.workId,e.language,e.path,e.edition||""].join("|"),"Registro textual");
// El registro remoto utiliza tres manifiestos complementarios: originales iniciales,
// ampliaciones TEI y traducciones humanas. Comprobarlos juntos evita falsos faltantes.
const expansionR2=read("data/r2/classics-expansion-manifest.json");
const translationsR2=read("data/r2/classics-translation-manifest.json");
const declaredR2=[
 ...corpusR2.obras.map(e=>({url:corpusR2.base+e.archivo,sha256:e.sha256})),
 ...expansionR2.editions.map(e=>({url:e.url,sha256:e.sha256})),
 ...translationsR2.editions.map(e=>({url:e.url,sha256:e.sha256}))
];
const hashesByUrl=new Map();
for(const e of declaredR2){
 if(!e.url||!e.url.startsWith(corpusR2.base)||!e.sha256)critical.push("Manifiesto R2 sin URL/hash válido: "+String(e.url));
 if(hashesByUrl.has(e.url)&&hashesByUrl.get(e.url)!==e.sha256)critical.push("Manifiestos R2 discordantes (SHA-256): "+e.url);
 hashesByUrl.set(e.url,e.sha256);
}
const availableR2=new Set(hashesByUrl.keys());
const indexedWorks=new Set(),indexedOriginals=new Set(),indexedLocalFiles=new Set(),indexedRemoteFiles=new Set();
for(const e of reg){
 if(!allWorks.has(e.workId)&&e.format!=="critical-indexed-latin")critical.push("Edición textual sin ficha: "+e.workId);
 if(e.format!=="critical-indexed-latin")indexedWorks.add(e.workId);
 const master=cat.find(w=>w.id===e.workId)||overlay.find(w=>w.id===e.workId);
 if(master&&master.language===e.language&&["grc","la"].includes(e.language))indexedOriginals.add(e.workId);
 if(/^https?:\/\//.test(e.path)){
  indexedRemoteFiles.add(e.path);
  if(!availableR2.has(e.path))critical.push("Texto R2 no declarado en manifiesto: "+e.path);
 }else{
  indexedLocalFiles.add(e.path);
  if(!existsSync(e.path))critical.push("Archivo local inexistente: "+e.path);
 }
}
for(const p of availableR2)if(!indexedRemoteFiles.has(p))issues.push("R2 sin registro: "+p);
const orphans=readdirSync("data/classics-corpus").filter(n=>/-(la|grc|en|es|fr)\.json$/.test(n))
 .map(n=>"data/classics-corpus/"+n).filter(p=>!indexedLocalFiles.has(p));
const map=links.mapa||{};
for(const [id,targets] of Object.entries(map)){
 if(!pdfIds.has(id))issues.push("Vínculo R2 sin PDF catalogado: "+id);
 for(const target of targets)if(!works.has(target))critical.push("Vínculo a ficha inexistente: "+id+" → "+target);
}
const newWorks=links.obrasNuevas||[];
const additionalIds=ids(newWorks,x=>x.r2,"Obra adicional");
for(const row of newWorks){
 if(works.has(row.r2))critical.push("Obra adicional duplicada en repertorio principal: "+row.r2);
 if(!pdfIds.has(row.r2))critical.push("Obra adicional sin edición R2: "+row.r2);
 if(!row.autor||!row.obra||!row.lengua)critical.push("Obra adicional sin ficha bibliográfica mínima: "+row.r2);
}
// Una clave mapa presente pero vacía NO equivale a un vínculo de obra.
// Las obras adicionales (Palladio, Alberti, etc.) no son ediciones huérfanas.
const unlinked=pdf.filter(x=>{
 const mapped=map[x.id];
 return !(Array.isArray(mapped)&&mapped.length)&&!works.has(x.id)&&!additionalIds.has(x.id);
}).map(x=>x.id);
if(semantic.obras!==pdf.length)issues.push("Índice facsimilar declara "+semantic.obras+" obras frente a "+pdf.length+" registros PDF; identificar la diferencia en fragmentos.json");
if(orphans.length)issues.push(orphans.length+" transcripciones locales sin indexar");
if(unlinked.length)issues.push(unlinked.length+" ediciones R2 con vínculo pendiente");
const missing=[...cat,...overlay].filter(w=>!indexedWorks.has(w.id)).map(w=>({id:w.id,author:w.author,title:w.title,language:w.language}));
const missingOriginal=[...cat,...overlay].filter(w=>!indexedOriginals.has(w.id)).map(w=>({id:w.id,author:w.author,title:w.title,language:w.language}));
const pending=candidates.filter(x=>!pdfIds.has(x.id)).map(x=>({id:x.id,title:x.obra,language:x.lengua}));
const summary={masterWorks:cat.length,supplementaryGreekWorks:overlay.length,additionalWorks:newWorks.length,totalWorksDeclared:cat.length+overlay.length+newWorks.length,
 r2PdfEditions:pdf.length,r2IndexWorksDeclared:semantic.obras,r2IndexPagesDeclared:semantic.paginasIndexadas,
 textVersions:reg.length,localTextFiles:indexedLocalFiles.size,remoteTextFilesDeclared:indexedRemoteFiles.size,
 indexedWorks:indexedWorks.size,indexedOriginalWorks:indexedOriginals.size,
 worksWithoutAnyText:missing.length,worksWithoutOriginal:missingOriginal.length,uncataloguedLocalTexts:orphans.length,
 r2AdditionalEditionRecords:additionalIds.size,r2PendingEditionRecords:unlinked.length,
 unlinkedR2Editions:unlinked.length,candidateEditionsNotInR2:pending.length,
 externalMetadataPending:quality.totals.externalMetadataPending,liveR2ObjectCheck:false};
const result={schema:"vdl-bibliotheca-federated-status-v1",generated:new Date().toISOString(),
 methodology:"Cruce de archivos GitHub y manifiestos R2. No acredita disponibilidad HTTP ni cotejo autóptico. El índice es léxico por raíces/conceptos, no semántica editorial validada.",
 summary,critical,issues,
 pending:{uncataloguedLocalTexts:orphans,unlinkedR2Edits:unlinked,withoutText:missing,withoutOriginal:missingOriginal,candidatesNotInR2:pending}};
if(!process.argv.includes("--check"))writeFileSync("data/r2/bibliotheca-panel-sync.json",JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({summary,critical,issues},null,2));
if(critical.length||process.argv.includes("--strict")&&orphans.length)process.exitCode=1;