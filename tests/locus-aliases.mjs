/**
 * Regression tests for editorial reference aliases.
 * Run from repository root: node tests/locus-aliases.mjs
 * Canonical storage uses 2.praef.1; aliases are reader input only.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {parseLocus, searchCorpus} from '../assets/search-core.mjs';

const cases = [
 ['2.pr.1',2,'praef',1], ['2.praef.1',2,'praef',1],
 ['II.pr.1',2,'praef',1], ['II.pref.1',2,'praef',1],
 ['prefacio I del libro II',2,'praef',1],
 ['prefacio del libro II sección 1',2,'praef',1],
 ['libro II prefacio 1',2,'praef',1],
 ['prologo del libro segundo',2,'praef',null],
 ['prefacio del libro 2',2,'praef',null],
 ['prefacio del libro II, párrafo 1',2,'praef',1],
 ['libro 2 - 1',2,1,null], ['2-1',2,1,null],
 ['libro 2 capítulo 1',2,1,null],
 ['libro 2 capítulo 1 sección 2',2,1,2],
 ['II.1.2',2,1,2], ['libro 2',2,null,null],
 ['III.1.1',3,1,1], ['VIII.praef.1',8,'praef',1],
 ['2.praef',2,'praef',null]
];
for(const [query,book,chapter,section] of cases){
 assert.deepEqual(parseLocus(query),{book,chapter,section},'Failed '+query);
}
assert.equal(parseLocus('symmetria'),null,'Normal words must remain lexical searches');
assert.equal(parseLocus('prefacio I del libro'),null,'Missing book must not be silently invented');

const corpus=JSON.parse(await readFile(new URL('../data/structured/recensio-es.json',import.meta.url),'utf8'));
for(const query of ['2.pr.1','2.praef.1','prefacio I del libro II']){
 const results=searchCorpus([corpus],{query,kind:'locus',language:'la'}).results;
 assert.ok(results.some(x=>(x.passage?.locus||x.locus)==='2.praef.1'),query+' must resolve canonical source');
}
const chapter=searchCorpus([corpus],{query:'libro 2 - 1',kind:'locus',language:'la'}).results;
assert.ok(chapter.length>0 && chapter.every(x=>(x.passage?.locus||x.locus).startsWith('2.1.')),
 'Unmarked shorthand means chapter 1, not a preface');

const window={};
const engine=await readFile(new URL('../assets/vitruvia-research-engine.js',import.meta.url),'utf8');
runInNewContext(engine,{window});
const route=window.VitruviaResearchEngine;
for(const query of ['2.pr.1','2.praef.1','prefacio I del libro II']){
 const intent=route.classify(query);
 assert.equal(intent.kind,'preface',query+' should use the preface index');
 assert.equal(intent.preface.book,2);
 assert.equal(intent.preface.section,1);
}
const incomplete=route.classify('prefacio I del libro');
assert.equal(incomplete.kind,'preface');
assert.equal(incomplete.preface.book,null);
assert.equal(incomplete.preface.section,1);
assert.equal(route.classify('libro 2 - 1').locus,'2.1');
assert.equal(route.classify('symmetria').kind,'concept');
console.log('Reference alias regression: '+(cases.length+9)+' checks passed.');
