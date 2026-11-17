#!/usr/bin/env node
/** Derived counters: never count an unindexed registry record as indexed.
 * Run after build-classics-lexical-index.mjs, never before.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const registry=JSON.parse(readFileSync('data/classics-corpus/search-registry.json','utf8'));
const manifest=JSON.parse(readFileSync('data/index/classics/manifest.json','utf8'));
const supplement=JSON.parse(readFileSync('data/bibliotheca-expansion-publicada-2026-11-16.json','utf8'));
const indexed=new Set(manifest.index.filter(w=>w.passages>0&&!w.gateOnly).map(w=>w.id+'|'+w.lang));
const registered=registry.entries.filter(e=>['json-passages','structured-bilingual'].includes(e.format));
const localIndexed=registered.filter(e=>indexed.has(e.workId+'|'+e.language));
const independent=arr=>new Set(arr.map(x=>x.workId||x.id)).size;
const missing=registered.filter(e=>!indexed.has(e.workId+'|'+e.language)).map(e=>({workId:e.workId,language:e.language}));
const counters={
 schema:'vdl-classics-public-counts-v1',
 method:'Derived from literal search registry and built lexical index; excludes catalogue-only works. Historical HTML and remote corpora may have other search paths, not counted in indexed local editions.',
 registryEntries:registry.entries.length,
 registryDistinctWorks:registry.works,
 localRegisteredEditions:registered.length,
 localLexicallyIndexedEditions:localIndexed.length,
 localLexicallyIndexedDistinctWorks:independent(localIndexed),
 supplementaryDossiers:supplement.works.length,
 registeredEditionsNotInLexicalIndex:missing,
 newGreekWorks:['galen-adhortatio-artes','galen-optimus-medicus-philosophus','hippocrates-de-prisca-medicina'].map(id=>({
  id,registered:registered.some(e=>e.workId===id&&e.language==='grc'),
  lexicallyIndexed:indexed.has(id+'|grc')
 }))
};
writeFileSync('data/classics-corpus/public-counts.json',JSON.stringify(counters,null,2)+'\n');
if(counters.newGreekWorks.some(x=>!x.registered||!x.lexicallyIndexed)){
 console.error('New Greek texts missing search or inverted-index coverage');
 process.exitCode=1;
}
console.log(JSON.stringify({registryWorks:counters.registryDistinctWorks,lexicallyIndexed:counters.localLexicallyIndexedDistinctWorks,newGreek:counters.newGreekWorks},null,2));
