import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {readSearchState,searchStateURL} from '../assets/home-search-state.mjs';
import {parseLocus,searchCorpus} from '../assets/search-core.mjs';
const window={};
runInNewContext(readFileSync(new URL('../assets/documentary-relevance.js',import.meta.url),'utf8'),{window});
const accepts=window.VitruviaDocumentaryRelevance.accepts;

test('search links round-trip exact Unicode queries and active filters',()=>{
 const state={query:'symmetria & proporción',kind:'words',scope:'recensio-es',match:'phrase',book:'3',chapter:'1',language:'la',count:'exact'};
 const url=searchStateURL('https://example.org/library/index.html?edition=old',state);
 assert.deepEqual(readSearchState(url.searchParams),state);
 assert.equal(url.hash,'#buscar');assert.equal(url.origin,'https://example.org');
 assert.equal(url.searchParams.has('edition'),false);
});
test('literal query delimiters cannot create filters or redirect parameters',()=>{
 const query='symmetria&scope=theory-en#https://example.net/';
 const url=searchStateURL('https://example.org/library/index.html',{query,redirect:'https://example.net/',q:'overwrite'});
 assert.deepEqual(readSearchState(url.searchParams),{query});
 assert.deepEqual([...url.searchParams.keys()],['q']);
});
test('malformed and external modes are rejected, and empty links never run a search',()=>{
 assert.equal(readSearchState(new URLSearchParams('q=  ')),null);
 assert.equal(searchStateURL('https://example.org/index.html',{query:''}),null);
 assert.deepEqual(readSearchState(new URLSearchParams({q:'III.1.2',scope:'unknown',kind:'internet',book:'11',chapter:'0',language:'xx'})),{query:'III.1.2'});
 assert.equal(readSearchState(new URLSearchParams({q:'x'.repeat(4000)})).query.length,2000);
});
test('all book-label forms retrieve the same actual Book IV corpus',()=>{
 const corpus=JSON.parse(readFileSync(new URL('../data/structured/recensio-es.json',import.meta.url)));
 const expected=corpus.passages.filter(p=>p.book===4).map(p=>p.locus);
 for(const query of ['liber IV','libro IV','Book IV','Livre IV','IV']){
  assert.deepEqual(parseLocus(query),{book:4,chapter:null,section:null});
  const result=searchCorpus([corpus],{query,kind:'words',language:'la'});
  assert.deepEqual(result.results.map(p=>p.locus),expected,query);
 }
});
test('prefacion, prefación and prefacio resolve to real prefatory loci',()=>{
 const corpus=JSON.parse(readFileSync(new URL('../data/structured/recensio-es.json',import.meta.url)));
 const all=corpus.passages.filter(p=>p.chapter==='praef').map(p=>p.locus);
 const second=corpus.passages.filter(p=>p.book===2&&p.chapter==='praef').map(p=>p.locus);
 for(const query of ['prefacion','prefación','prefacio','praefatio','proemio']){
  assert.deepEqual(parseLocus(query),{book:null,chapter:'praef',section:null},query);
  const result=searchCorpus([corpus],{query,kind:'words',language:'la'});
  assert.deepEqual(result.results.map(p=>p.locus),all,query);
 }
 for(const query of ['prefacion libro II','prefación del libro II','libro 2 prefacion','II.prefacion','2.praef']){
  assert.deepEqual(parseLocus(query),{book:2,chapter:'praef',section:null},query);
  assert.deepEqual(searchCorpus([corpus],{query,kind:'words',language:'la'}).results.map(p=>p.locus),second,query);
 }
 for(const query of ['II.prefacion.1','II.prefación.1','prefacion II.1','2.praef.1']){
  assert.deepEqual(parseLocus(query),{book:2,chapter:'praef',section:1},query);
  const result=searchCorpus([corpus],{query,kind:'locus',language:'la'});
  assert.deepEqual(result.results.map(p=>p.locus),['2.praef.1'],query);
 }
});

test('a modern homonymous author is not bibliography about the ancient Lucretius',()=>{
 assert.equal(accepts({type:'article',title:'Inteligencia artificial y Derechos fundamentales',author:'Lucrecio Rebollo Delgado'},'Lucrecio'),false);
 assert.equal(accepts({type:'article',title:'Jurisprudencia constitucional',author:'Lucrecio Rebollo Delgado'},'Lucrecio'),false);
 assert.equal(accepts({type:'article',title:'Armonía expresiva en Lucrecio',author:'Gregorio Andrés'},'Lucrecio'),true);
 assert.equal(accepts({type:'openlibrary',title:'De rerum natura',author:'Titus Lucretius Carus'},'Lucrecio'),true);
 assert.equal(accepts({type:'article',title:'On Lucretius and atomism',author:'A. Scholar'},'Lucrecio'),true);
 assert.equal(accepts({type:'article',title:'Titus and the Flavian dynasty'},'Lucrecio'),false);
});
test('a multiword subject cannot be satisfied by just Romanos in an unrelated title',()=>{
 assert.equal(accepts({type:'article',title:'Romanos the Melodist',author:'Gudrun Engberg, Alexander Lingas'},'acueductos romanos'),false);
 assert.equal(accepts({type:'article',title:'Los acueductos romanos',author:'C. Fernández Casado'},'acueductos romanos'),true);
 assert.equal(accepts({type:'article',title:'El acueducto romano de Toledo'},'acueductos romanos'),true);
 assert.equal(accepts({type:'article',title:'Bombas, estaciones de bombeo y acueductos'},'acueductos romanos'),false);
});
test('local source records and declared full-text matches remain available',()=>{
 assert.equal(accepts({type:'passage',title:'Vitr., De arch. VIII.1.4'},'aqua'),true);
 assert.equal(accepts({type:'book',title:'De aquaeductu urbis Romae',author:'Frontino'},'acueductos romanos'),true);
 assert.equal(accepts({type:'article',title:'A wider history',externalFulltext:true},'acueductos romanos'),true);
});
