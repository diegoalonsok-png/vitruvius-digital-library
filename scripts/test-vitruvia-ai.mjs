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
    {locus:'1',text:'Τῶν μορίων χρεία καὶ φύσις ἐστὶν ἐν σώματι.'}]}
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
  return {engine:window.VitruviaAI,calls};
}
{
  const {engine}=createEngine();
  const r=await engine.search('Ὑγιεινὸν',{method:'bm25'});
  assert.equal(r.mode,'bm25-fallback');
  assert.ok(r.rows.some(x=>x.workId==='galen-ars-medica'),'Greek passage.text must be searchable');
  assert.equal(r.stats.loadedSources,6,'All mocked sources loaded');
  assert.equal(r.stats.declaredSources,6);
  assert.equal(r.stats.unavailable.length,0);
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
  assert.equal(calls.filter(x=>x.includes('ai-corpora.json')).length,1,'Manifest requested once');
}
console.log('PASS: 3 engine scenarios, 6-source manifest, Greek/Latin hits, provenance and partial-coverage warning.');
console.log('SCOPE: mocked fetch only; not an HTTP availability or scholarly accuracy test.');
