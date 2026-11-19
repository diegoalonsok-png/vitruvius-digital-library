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
const r2Index=existsSync('data/index/classics-r2/manifest.json')?read('data/index/classics-r2/manifest.json'):null;
const r2Status=existsSync('data/r2/classics-sync-status.json')?read('data/r2/classics-sync-status.json'):null;
const r2ByKey=new Map((r2Index?.index||[]).map(e=>[key(e.id,e.lang),e]));
const verifiedR2=r2Status?.status==='all-registered-r2-originals-verified-and-lexically-indexed'
 &&r2Status.verifiedOriginals===r2Index?.index?.length
 ?remote.filter(e=>{const x=r2ByKey.get(key(e.workId,e.language));return x&&x.file===e.path&&x.sha256===e.sha256&&x.passages===e.passages;})
 :[];
const remoteUnverified=remote.filter(e=>!verifiedR2.includes(e));
// Krohn/Rose critical editions are indexed by the separate apparatus, not the classics lexical shards.
const localUnindexed=local.filter(e=>!['historical-ocr-pages','critical-indexed-latin'].includes(e.format)&&existsSync(e.path)&&!recognized.has(key(e.workId,e.language)));
const distinct=arr=>new Set(arr.map(e=>e.workId)).size;
const catalogue=read('data/classics-corpus/indexation-roadmap-222.json');
const additionalR2=read('data/r2/vinculos-repertorio.json');
// One work ID is one title; languages, editions and PDF copies are not extra works.
const listedIDs=new Set((catalogue.items||[]).map(w=>w.id));
const primaryTotal=listedIDs.size;
for(const w of supplement.works||[])if(w?.id)listedIDs.add(w.id);
const textCatalogueIDs=new Set(listedIDs);
const supplementaryTotal=listedIDs.size-primaryTotal;
for(const work of additionalR2.obrasNuevas||[])if(work?.r2)listedIDs.add(work.r2);
const r2AdditionalTotal=listedIDs.size-textCatalogueIDs.size;
const cataloguedTotal=listedIDs.size;
// An original is indexable only when its source file is locally checked and
// present in the lexical manifest, or R2 has an exact previously verified SHA.
const originalIndexedIDs=new Set(
 [...localIndexed,...verifiedR2]
 .filter(e=>['la','grc'].includes(e.language)&&textCatalogueIDs.has(e.workId))
 .map(e=>e.workId)
);
const indexedOriginalTotal=originalIndexedIDs.size;
if(primaryTotal!==catalogue.targetWorks||supplementaryTotal!==supplement.works.length)
 throw Error('Catalog IDs are missing or overlapping; refuse to publish invented totals');
if(indexedOriginalTotal>cataloguedTotal)throw Error('Indexed works exceed catalogued works');
const counts={
 schema:'vdl-classics-public-counts-v2',
 generated:new Date().toISOString(),
 method:'Local text files and index manifest cross-checked by original work/language; HTML word gates are not passage indices; historical OCR excluded from critical-text counts; R2 indexed editions are matched to last verified SHA256 manifest, without claiming live checking.',
 cataloguedWorks:cataloguedTotal,
 indexedOriginalWorks:indexedOriginalTotal,
 registryEntries:registered.length,
 registryDistinctWorks:distinct(registered),
 localRegisteredEditions:local.length,
 localIndexedEditions:localIndexed.length,
 htmlWordGateEditions:localIndexed.filter(e=>recognized.get(key(e.workId,e.language)).status==='html-word-gate').length,
 localLexicallyIndexedDistinctWorks:distinct(localIndexed),
 localUnindexedEditions:localUnindexed.map(e=>({workId:e.workId,language:e.language,format:e.format})),
 remoteR2EditionsIndexedLastVerified:verifiedR2.length,
 remoteR2VerifiedAt:r2Status?.verifiedAt||null,
 remoteR2EditionsDeclaredNotLiveVerified:remoteUnverified.length,
 historicalOcrEditions:local.filter(e=>e.format==='historical-ocr-pages').length,
 auditCounts:audit.counts,
 supplementaryDossiers:supplement.works.length
};
counts.localIndexPassageEditions=localIndexed.length-counts.htmlWordGateEditions;
writeFileSync('data/classics-corpus/public-counts.json',JSON.stringify(counts,null,2)+'\n');
const old=read('data/cifras-corpus.json');
old.actualizado=new Date().toISOString().slice(0,10);
old.obras=primaryTotal;
old.obrasSuplementarias=supplementaryTotal;
old.obrasAdicionales=r2AdditionalTotal;
old.obrasTotalesDeclaradas=cataloguedTotal;
old.obrasConTextoIndexado=indexedOriginalTotal;
old.notaTotal=cataloguedTotal+' fichas únicas por ID comprobadas: '+primaryTotal+' repertorio principal + '+supplementaryTotal+' incorporaciones textuales suplementarias + '+r2AdditionalTotal+' fichas R2 adicionales sin solapamiento. Versiones lingüísticas y ediciones históricas se contabilizan aparte.';
old.faltanParaObjetivo=Math.max(0,(old.objetivoObras||500)-cataloguedTotal);
old.versionesTextuales=registered.length;
old.edicionesLexicasLocales=manifest.index.length;
old.estadoIndexacion={
 metodo:'Auditoría local y cotejo R2 con manifiesto y comprobación SHA registrada; sin nueva prueba HTTP en esta ejecución. OCR histórico separado.',
 edicionesLocalesBuscables:counts.localIndexedEditions,
 edicionesLocalesConPasajes:counts.localIndexPassageEditions,
 edicionesHTMLBuscablesPorPalabra:counts.htmlWordGateEditions,
 edicionesR2IndexadasConSHA:counts.remoteR2EditionsIndexedLastVerified,
 ultimaVerificacionR2:counts.remoteR2VerifiedAt,
 edicionesR2PendientesVerificacion:counts.remoteR2EditionsDeclaredNotLiveVerified,
 edicionesOCRHistorico:counts.historicalOcrEditions,
 edicionesLocalesPendientes:localUnindexed.length
};
writeFileSync('data/cifras-corpus.json',JSON.stringify(old,null,2)+'\n');
console.log(JSON.stringify({registry:counts.registryEntries,localIndex:counts.localIndexedEditions,remoteUnverified:remoteUnverified.length,localUnindexed:localUnindexed.length,cataloguedTotal,indexedOriginalTotal},null,2));
if(localUnindexed.length)process.exitCode=1;
