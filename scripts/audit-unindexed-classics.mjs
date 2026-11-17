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
const gateIndexed=new Map();
for(const e of manifest.index){
 if(Number(e.passages)<=0||!Array.isArray(e.gate))continue;
 for(const identity of e.gate)gateIndexed.set(identity,e);
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
 const alias=gateIndexed.get(key);
 const formats=new Set(entries.map(e=>e.format));
 let state='catalogue-or-external-only';
 if(absent.length)state='registered-local-file-missing';
 else if(index&&present.length)state='indexed-local';
 else if(alias&&present.length)state='indexed-through-edition-alias';
 else if(index||alias)state='index-without-local-source-confirmation';
 else if(present.length&&formats.has('html-text'))state='html-reader-not-in-lexical-index';
 else if(present.length&&formats.has('historical-ocr-pages'))state='historical-ocr-separate-index';
 else if(present.length)state='local-text-pending-index';
 else if(remote.length)state='remote-unverified';
 records.push({workId:id,language,state,registeredFiles,missingLocalFiles:absent,indexedPassages:index?.passages||0});
}
const counts={};
for(const r of records)counts[r.state]=(counts[r.state]||0)+1;
const pending=records.filter(x=>!['indexed-local','indexed-through-edition-alias'].includes(x.state));
const report={
 schema:'vdl-classics-unindexed-audit-v1',
 method:'Registry versus lexical-index manifest and local filesystem; remote R2 URLs were not probed. Duplicated work/language registrations are combined. HTML-only readers and historical OCR are separately reported, never counted as absent source or critically verified text. Vitruvius multilingual registry identities map through the index edition gate. The inverted index is root-based and is not morphological lemmatization.',
 registeredWorkLanguages:records.length,
 counts,
 missing:pending,
};
mkdirSync('data/classics-corpus',{recursive:true});
writeFileSync('data/classics-corpus/unindexed-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({registeredWorkLanguages:records.length,counts,pending:pending.length},null,2));
if(records.some(x=>x.state==='registered-local-file-missing'))process.exitCode=1;
