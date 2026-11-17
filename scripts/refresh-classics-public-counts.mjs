#!/usr/bin/env node
/** Publish source-grounded edition counts; no R2 availability is inferred. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const registry=read('data/classics-corpus/search-registry.json');
const manifest=read('data/index/classics/manifest.json');
const supplement=read('data/bibliotheca-expansion-publicada-2026-11-16.json');
const audit=read('data/classics-corpus/unindexed-audit.json');
const key=(id,lang)=>id+'|'+lang;
const registered=registry.entries;
const index=new Map(manifest.index.filter(w=>w.id&&w.lang).map(w=>[key(w.id,w.lang),w]));
const recognized=new Map();
for(const m of manifest.index){
 if(Array.isArray(m.gate))for(const alias of m.gate){
  const status=m.gateOnly?'html-word-gate':'source-passages';
  if((m.tokens||0)>0)recognized.set(alias,{status,source:m.file,passages:m.passages||0});
 }
 if(m.passages>0&&!m.gateOnly)recognized.set(key(m.id,m.lang),{status:'source-passages',source:m.file,passages:m.passages});
}
const local=registered.filter(e=>typeof e.path==='string'&&!/^https?:\/\//i.test(e.path));
const localIndexed=local.filter(e=>existsSync(e.path)&&recognized.has(key(e.workId,e.language)));
const remote=registered.filter(e=>/^https?:\/\//i.test(e.path||''));
const localUnindexed=local.filter(e=>e.format!=='historical-ocr-pages'&&existsSync(e.path)&&!recognized.has(key(e.workId,e.language)));
const distinct=arr=>new Set(arr.map(e=>e.workId)).size;
const counts={
 schema:'vdl-classics-public-counts-v2',
 generated:new Date().toISOString(),
 method:'Local text files and index manifest cross-checked by original work/language; HTML word gates are not passage indices; historical OCR and unverified R2 are excluded from verified source-passage totals.',
 cataloguedWorks:read('data/cifras-corpus.json').obrasTotalesDeclaradas,
 registryEntries:registered.length,
 registryDistinctWorks:distinct(registered),
 localRegisteredEditions:local.length,
 localIndexedEditions:localIndexed.length,
 htmlWordGateEditions:localIndexed.filter(e=>recognized.get(key(e.workId,e.language)).status==='html-word-gate').length,
 localLexicallyIndexedDistinctWorks:distinct(localIndexed),
 localUnindexedEditions:localUnindexed.map(e=>({workId:e.workId,language:e.language,format:e.format})),
 remoteR2EditionsDeclaredNotLiveVerified:remote.length,
 historicalOcrEditions:local.filter(e=>e.format==='historical-ocr-pages').length,
 auditCounts:audit.counts,
 supplementaryDossiers:supplement.works.length
};
counts.localIndexPassageEditions=localIndexed.length-counts.htmlWordGateEditions;
writeFileSync('data/classics-corpus/public-counts.json',JSON.stringify(counts,null,2)+'\n');
const old=read('data/cifras-corpus.json');
old.actualizado=new Date().toISOString().slice(0,10);
old.versionesTextuales=registered.length;
old.edicionesLexicasLocales=manifest.index.length;
old.estadoIndexacion={
 metodo:'Auditoría local por obra/idioma y manifiesto; R2 remoto no verificado aquí; el OCR histórico se informa separado.',
 edicionesLocalesBuscables:counts.localIndexedEditions,
 edicionesLocalesConPasajes:counts.localIndexPassageEditions,
 edicionesHTMLBuscablesPorPalabra:counts.htmlWordGateEditions,
 edicionesR2PendientesVerificacion:counts.remoteR2EditionsDeclaredNotLiveVerified,
 edicionesOCRHistorico:counts.historicalOcrEditions,
 edicionesLocalesPendientes:localUnindexed.length
};
writeFileSync('data/cifras-corpus.json',JSON.stringify(old,null,2)+'\n');
console.log(JSON.stringify({registry:counts.registryEntries,localIndex:counts.localIndexedEditions,remoteUnverified:remote.length,localUnindexed:localUnindexed.length},null,2));
if(localUnindexed.length)process.exitCode=1;
