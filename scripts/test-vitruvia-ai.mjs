#!/usr/bin/env node
/** Regression tests for the shipped VitruviaAI browser engine.
 * Run: node scripts/test-vitruvia-ai.mjs
 * Uses a mocked local fetch; does NOT certify live R2/Pages availability.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../assets/vitruvia-ai.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../data/ai-corpora.json',import.meta.url),'utf8'));
assert.equal(manifest.sources.length,6,'Expected explicitly scoped six sources');
assert.equal(new Set(manifest.sources.map(s=>s.url)).size,manifest.sources.length,'Duplicate source URLs');
for(const s of manifest.sources){
  for(const key of ['url','workId','workTitle','author','edition','language','reader','source'])
    assert.ok(typeof s[key]==='string'&&s[key].trim(),s.workId+': missing '+key);
  assert.ok(!s.url.startsWith('http')&&!s.url.includes('..'),'Site-local safe manifest source expected');
}
const greekSources=manifest.sources.filter(s=>s.workId.startsWith('galen-'));
assert.equal(greekSources.length,2,'Two Galen works are staged');

const samples={
  'data/structured/recensio-es.json': {edition:'recensio-es',passages:[
    {locus:'1.1.1',latin:'Architectura est scientia pluribus disciplinis et variis eruditionibus ornata.',translation:'La arquitectura es una ciencia adornada de muchas disciplinas.'}]},
  'data/structured/recensio-fr.json': {edition:'recensio-fr',passages:[
    {locus:'1.1.1',latin:'Architectura est scientia pluribus disciplinis ornata.',translation:'L’architecture est une science.'}]},
  'data/structured/theory-en.json': {edition:'theory-en',passages:[
    {locus:'1.1.1',latin:'Architectura est scientia pluribus disciplinis ornata.',translation:'Architecture is a science.'}]},
  'data/structured/homer-iliad-gr.json': {edition:'iliad',passages:[
    {locus:'1.1',greek:'Μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος.'}]},
  'data/classics-corpus/galen-ars-medica-grc.json': {edition:'galen-med',passages:[
    {locus:'1',text:'Ἰατρικὴ ἐπιστήμη ὑγιεινῶν καὶ νοσωδῶν.'},
    {locus:'2',text:'Ὑγιεινὸν σῶμα καὶ συμμετρία τῶν μορίων.'}]},
  'data/classics-corpus/galen-de-usu-partium-grc.json': {edition:'galen-usu',passages:[
    {locus:'1',text:'Τῶν μορίων χρεία καὶ φύσις ἐστὶν ἐν σώματι.'},
    {text:'Unlocated passage should never become a search result.'}]}
};
function createEngine(failing=[]){
  const calls=[];
  const dom={getElementById:()=>null};
  const window={dispatchEvent(){}};
  const context={
    window,document:dom,navigator:{connection:{saveData:false}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},
    fetch:async input=>{
      calls.push(input);
      const path=input.startsWith('./')?input.slice(2):input;
      if(path==='data/ai-corpora.json')return {ok:true,json:async()=>manifest};
      if(failing.includes(path))throw Error('simulated unavailable '+path);
      if(!(path in samples))return {ok:false,status:404};
      return {ok:true,json:async()=>samples[path]};
    },
    console,Map,Set,Math,Float32Array,Error,Promise,Number,String,Array,
    URLSearchParams
  };
  vm.runInNewContext(script,context,{filename:'vitruvia-ai.js'});
  assert.ok(window.VitruviaAI,'Engine must expose public API');
  return {engine:window.VitruviaAI,calls,window};
}
{
  const {engine}=createEngine();
  const r=await engine.search('Ὑγιεινὸν',{method:'bm25'});
  assert.equal(r.mode,'bm25-fallback');
  assert.ok(r.rows.some(x=>x.workId==='galen-ars-medica'),'Greek passage.text must be searchable');
  assert.ok(r.rows.filter(x=>x.workId==='galen-ars-medica').every(x=>x.originalLanguage==='grc'&&x.greek&&!x.latin),'Greek evidence must not be labelled Latin');
  assert.equal(r.stats.loadedSources,6,'All mocked sources loaded');
  assert.equal(r.stats.declaredSources,6);
  assert.equal(r.stats.unavailable.length,0);
  assert.ok(r.rows.every(x=>x.locus),'Unlocated passages must never be indexed');
  assert.ok(r.stats.candidateEditions>=4,'Candidate pool should represent multiple editions');
  assert.ok(r.stats.candidateWorks>=3,'Candidate pool should represent multiple ancient works');
  assert.ok(r.rows.every(x=>x.link&&x.locus&&x.source),'All hits need provenance and locus');
}
{
  const {engine}=createEngine(['data/classics-corpus/galen-de-usu-partium-grc.json']);
  const r=await engine.search('Ὑγιεινὸν',{method:'bm25'});
  assert.equal(r.stats.loadedSources,5);
  assert.equal(r.stats.unavailable.length,1);
  assert.ok(r.warning.includes('Cobertura parcial'),'Missing source must not be silent');
}
{
  const {engine,calls}=createEngine();
  const r=await engine.search('architectura scientia',{method:'bm25'});
  assert.ok(r.rows.some(x=>x.workId==='vitruvius'),'Latin passage must remain searchable');
  assert.ok(r.rows.filter(x=>x.workId==='vitruvius').every(x=>x.originalLanguage==='la'&&x.latin),'Bilingual editions must preserve Latin original');
  assert.equal(calls.filter(x=>x.includes('ai-corpora.json')).length,1,'Manifest requested once');
}
{
  const {engine}=createEngine();
  // Conceptual candidate generation should remain diverse even with zero
  // lexical overlap. BM25 correctly returns no fabricated evidence in this case.
  const r=await engine.search('concepto inexistente a prueba',{method:'bm25'});
  assert.equal(r.rows.length,0,'No fabricated lexical hits');
  assert.ok(r.stats.candidateEditions>=4,'Candidate pool must include multiple editions');
  assert.ok(r.stats.candidateWorks>=3,'Candidate pool must include multiple works');
}
{
  const {engine}=createEngine();
  const r=await engine.search('Ἀχιλῆοσ',{method:'bm25'});
  assert(r.rows.some(x=>x.workId==='homer-iliad'),'Greek final sigma must match medial sigma in lookup');
}
console.log('PASS: 5 engine scenarios, 6-source manifest, Greek/Latin hits, multi-work candidate coverage, provenance, no invented hits and partial-coverage warning.');
console.log('SCOPE: mocked fetch only; not an HTTP availability or scholarly accuracy test.');

{
 const {engine,window}=createEngine();
 const sources=Array.from({length:80},(_,i)=>({url:"data/test-"+i+".json",workId:"work-"+i,language:"la"}));
 const selection={sources,explicit:false,registryCount:sources.length};
 let lookups=0;
 window.VitruviaClassicsIndex={lookup:async()=>{lookups++;return {hits:sources.slice(40,75).map(s=>({work:{file:s.url},count:5,per10k:10}))}}};
 const narrowed=await engine.narrowBroad("historia filosofia",selection);
 assert.equal(narrowed.sources.length,24,"Broad searches must limit source downloads");
 assert(narrowed.sources.every(s=>sources.slice(40,75).includes(s)),"Prefer indexed candidate editions");
 assert.equal(narrowed.registryCount,80);
 assert.equal(narrowed.budgeted,true);
 assert.equal(lookups,2);
 assert.equal((await engine.narrowBroad("historia",{...selection,explicit:true})).sources.length,80,"Named works are not silently sampled");
 delete window.VitruviaClassicsIndex;
 const fallback=await engine.narrowBroad("historia",selection);
 assert.equal(fallback.sources.length,24);
 assert(fallback.candidateStrategy.includes("reserva"));
 console.log("PASS: bounded index-first broad retrieval, explicit query preservation and labelled fallback.");
}

{
 const {engine,window}=createEngine();
 const store=new Map();
 window.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const doc={workId:"vitruvius",sourcePath:"data/example.json",sha256:"abc",locus:"1.1.1",language:"la"};
 const row={...doc,sourceSha256:"abc"};
 assert.equal(engine.feedback("arquitectura",row,1).persisted,true);
 assert.equal(engine.feedbackState("arquitectura",doc),1);
 assert(Math.abs(engine.learnedScore("arquitectura",{doc,score:100},{})-112)<1e-8);
 assert.equal(engine.learnedScore("arquitectura",{doc,score:100},{locus:"1.1.1"}),100);
 assert.equal(engine.learnedScore("arquitectura",{doc,score:100},{},false),100);
 assert.equal(engine.learnedScore("arquitectura",{doc,score:0},{}),0);
 assert.equal(engine.feedbackState("medicina",doc),0);
 assert.equal(engine.feedbackState("arquitectura",{...doc,sha256:"new"}),0);
 assert.equal(engine.feedbackState("arquitectura",{...doc,locus:"1.1.2"}),0);
 assert.equal(engine.feedback("arquitectura",row,-1).accepted,true);
 assert.equal(engine.learnedScore("arquitectura",{doc,score:100},{}),88);
 assert.equal(engine.feedback("arquitectura",row,0).accepted,true);
 assert.equal(engine.feedbackState("arquitectura",doc),0);
 engine.feedback("arquitectura",row,1);
 assert.equal(engine.clearMemory(),true);
 assert.equal(store.size,0);
 assert.equal(engine.feedbackState("arquitectura",doc),0);
 assert.equal(engine.feedback("arquitectura",{locus:"1.1.1"},1).accepted,false);
 console.log("PASS: local feedback scope, bounded adjustment, private mode, exact-locus precedence and reset.");
}

{
 const {engine}=createEngine();
 const source={format:"json-passages",workId:"work-a",language:"grc"};
 const doc={workId:"work-a",language:"grc",passages:[{locus:"1",text:"source"}]};
 assert(engine.sourceIdentityOK(source,doc));
 assert(!engine.sourceIdentityOK(source,{...doc,workId:"work-b"}));
 assert(!engine.sourceIdentityOK(source,{...doc,language:"la"}));
 assert(!engine.sourceIdentityOK(source,{...doc,passages:null}));
 assert(engine.sourceIdentityOK({...source,sourceWorkId:"work-b"},{...doc,workId:"work-b"}));
 assert(engine.sourceIdentityOK({...source,format:"structured-bilingual"},{passages:doc.passages}));
 console.log("PASS: documentary identity checks and legitimate editorial aliases.");
}

{
 const {engine}=createEngine();
 assert(engine.normalizedPhrase("ars architectura","ars"));
 assert(!engine.normalizedPhrase("pars architectura","ars"));
 assert(!engine.normalizedPhrase("λογοσ","λογ"));
 assert(engine.normalizedPhrase("λόγος","λογοσ"));
 assert(!engine.literalPhrase("λόγος","λογοσ"));
 assert(engine.literalPhrase("ὁ λόγος.","λόγος"));
 assert(!engine.passagePhrase({excerptText:"ars ciencia",original:"ars",translation:"ciencia"},"ars ciencia"));
 assert(engine.passagePhrase({excerptText:"ars la ciencia",original:"ars",translation:"la ciencia"},"la ciencia"));
 assert(!engine.normalizedPhrase("ars",""));
 assert(!engine.literalPhrase("pars","ars"));
 console.log("PASS: literal versus normalized phrase, whole tokens, Greek and bilingual boundaries.");
}
