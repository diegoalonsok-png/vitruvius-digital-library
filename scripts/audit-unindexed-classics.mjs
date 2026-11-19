#!/usr/bin/env node
/** Non-destructive check of locally registered classical editions vs inverted index.
 * Never assumes R2 URLs are accessible or that catalogue-only works contain text.
 * Writes a machine-readable diagnostic; only locally readable originals/editions
 * with source passages can qualify for indexing.
 */
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const registry=load('data/classics-corpus/search-registry.json');
const manifest=load('data/index/classics/manifest.json');
if(!Array.isArray(registry.entries)||!Array.isArray(manifest.index))throw Error('Registry/manifest missing entries');
const indexed=new Map(manifest.index.filter(e=>e.id&&e.lang&&Number(e.passages)>0).map(e=>[e.id+'|'+e.lang,e]));
const r2ManifestPath='data/index/classics-r2/manifest.json';
const r2StatusPath='data/r2/classics-sync-status.json';
const r2Status=existsSync(r2StatusPath)?load(r2StatusPath):null;
const r2Manifest=existsSync(r2ManifestPath)?load(r2ManifestPath):null;
const r2Verified=new Map();
if(r2Status?.status==='all-registered-r2-originals-verified-and-lexically-indexed'
   &&r2Status?.verifiedOriginals===r2Manifest?.index?.length){
 for(const item of r2Manifest.index){
  if(item.id&&item.lang&&item.file&&item.sha256&&item.passages>0)
   r2Verified.set(item.id+'|'+item.lang,item);
 }
}
const gateIndexed=new Map();
const htmlGateIndexed=new Map();
for(const e of manifest.index){
 if(!Array.isArray(e.gate))continue;
 for(const identity of e.gate){
  if(e.gateOnly&&e.tokens>0&&e.file?.endsWith('.html'))htmlGateIndexed.set(identity,e);
  else if(Number(e.passages)>0)gateIndexed.set(identity,e);
 }
}
const records=[];
const seen=new Set();
for(const entry of registry.entries){
 const id=entry.workId,language=entry.language;
 if(!id||!language)continue;
 const key=id+'|'+language;
 if(seen.has(key))continue;
 seen.add(key);
 const entries=registry.entries.filter(e=>e.workId===id&&e.language===language);
 const registeredFiles=entries.filter(e=>typeof e.path==='string'&&e.path.trim()).map(e=>e.path);
 const local=registeredFiles.filter(p=>!/^https?:\/\//i.test(p));
 const remote=registeredFiles.filter(p=>/^https?:\/\//i.test(p));
 const present=local.filter(existsSync);
 const absent=local.filter(p=>!existsSync(p));
 const index= indexed.get(key);
 const r2Index=r2Verified.get(key);
 const alias=gateIndexed.get(key);
 const htmlGate=htmlGateIndexed.get(key);
 const formats=new Set(entries.map(e=>e.format));
 let state='catalogue-or-external-only';
 if(absent.length)state='registered-local-file-missing';
 else if(index&&present.length)state='indexed-local';
 else if(alias&&present.length)state='indexed-through-edition-alias';
 else if(htmlGate&&present.includes(htmlGate.file))state='indexed-html-word-gate';
 else if(index||alias||htmlGate)state='index-without-local-source-confirmation';
 else if(present.length&&formats.has('html-text'))state='html-reader-not-in-lexical-index';
 else if(present.length&&formats.has('historical-ocr-pages'))state='historical-ocr-separate-index';
 else if(present.length&&formats.has('critical-indexed-latin')){
  // Krohn/Rose have a separate 731-locus scholarly apparatus, not a
  // classics lexical-index shard. Confirm real indexed loci before excluding.
  const confirmed=present.some(file=>{
   try{
    const edition=load(file);
    return edition.schema==='vdl-critical-edition-text-v1'
      &&Array.isArray(edition.passages)&&edition.passages.length>=700
      &&edition.passages.every(p=>p.locus&&p.text);
   }catch{return false}
  });
  state=confirmed?'indexed-in-critical-apparatus':'local-text-pending-index';
 }
 else if(present.length)state='local-text-pending-index';
 else if(remote.length&&r2Index&&entries.some(e=>e.path===r2Index.file&&e.sha256===r2Index.sha256&&e.passages===r2Index.passages))state='indexed-r2-last-verified';
 else if(remote.length)state='remote-unverified';
 records.push({workId:id,language,state,registeredFiles,missingLocalFiles:absent,indexedPassages:index?.passages||0});
}
const counts={};
for(const r of records)counts[r.state]=(counts[r.state]||0)+1;
const pending=records.filter(x=>!['indexed-local','indexed-through-edition-alias','indexed-html-word-gate','historical-ocr-separate-index','indexed-r2-last-verified','indexed-in-critical-apparatus'].includes(x.state));
const report={
 schema:'vdl-classics-unindexed-audit-v1',
 method:'Registry versus lexical-index manifest and local filesystem; remote R2 URLs were not probed. Duplicated work/language registrations are combined. HTML word-gate editions are searchable by word but have no source-locus posting positions. Historical OCR is separately reported and never passed off as critical text. R2 remote editions are matched by work, language, exact URL, SHA256 and passage count against the last independently verified remote index manifest; this is not a fresh live probe. Vitruvius multilingual registry identities map through the index edition gate. The inverted index is root-based and is not morphological lemmatization.',
 registeredWorkLanguages:records.length,
 r2VerifiedAt:r2Status?.verifiedAt||null,
 counts,
 missing:pending,
};
mkdirSync('data/classics-corpus',{recursive:true});
writeFileSync('data/classics-corpus/unindexed-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({registeredWorkLanguages:records.length,counts,pending:pending.length},null,2));
if(records.some(x=>x.state==='registered-local-file-missing'))process.exitCode=1;
