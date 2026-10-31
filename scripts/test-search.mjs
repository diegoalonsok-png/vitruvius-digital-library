import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLocus,searchCorpus,findMatches,citation} from '../assets/search-core.mjs';
const read=id=>JSON.parse(readFileSync(new URL('../data/structured/'+id+'.json',import.meta.url)));
const es=read('recensio-es'),fr=read('recensio-fr'),en=read('theory-en');
const search=(query,overrides={})=>searchCorpus([es,fr,en],{query,kind:'words',language:'la',...overrides});
for(const input of ['8.1.4','VIII.1.4','Vitr., De arch. VIII.1.4'])assert.deepEqual(parseLocus(input),{book:8,chapter:1,section:4});
assert.deepEqual(parseLocus('II.praef.3'),{book:2,chapter:'praef',section:3});
for(const input of ['loci','symmetria','XI.1.1','3.0.1','3.1.0'])assert.equal(parseLocus(input),null);
for(const data of [es,fr,en]){
 assert.equal(new Set(data.passages.map(p=>p.locus)).size,data.passages.length);
 assert.deepEqual([...new Set(data.passages.map(p=>p.book))].sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
 for(const p of data.passages){assert(p.latin.length>10&&p.translation.length>10);assert.equal(p.source_paragraphs.length,2);assert.equal(p.locus,[p.book,p.chapter,p.section].join('.'));}
}
const water=search('VIII.1.4');assert.equal(water.results.length,3);assert(water.results.every(p=>p.locus==='8.1.4'&&p.latin.includes('Fodiatur')));assert(water.results.find(p=>p.edition==='recensio-es').translation.includes('Cávese'));
assert(search('architecti est scientia',{mode:'phrase'}).results.every(p=>p.locus==='1.1.1'));
assert(search('symmetria',{book:3,chapter:1}).results.every(p=>p.book===3&&p.chapter===1));
assert.equal(search('zzzzqxyabcdef').results.length,0);assert.equal(search('3.99.99').results.length,0);
assert.equal(findMatches('locus locus, locum','locus',{phrase:true}).length,2);
assert.equal(findMatches('locus locus, locum','loc',{prefix:true}).length,3);
const count=search('locus',{kind:'count',language:'la'});let expected=0;
for(const d of [es,fr,en])for(const p of d.passages)expected+=findMatches(p.latin,'locus',{phrase:true}).length;
assert.equal(count.countSummary.total,expected);assert.equal(count.results.length,expected);
assert(count.results.every(r=>r.snippet.slice(r.context_start,r.context_start+r.context_length).toLowerCase()==='locus'));
assert.equal(search('VII.7.2').results.length,3);
assert.equal(search('VII.7.5').results.length,3);
assert.equal(citation({book:8,chapter:'praef',section:1}),'Vitr., De arch. VIII.praef.1');
for(const lang of ['es','fr','en'])assert(search(lang==='es'?'arquitectura':lang==='fr'?'architecture':'water',{language:lang}).results.every(r=>r.language===lang));

// Regression: lexical concordance must tokenize complete Unicode words, not the letter "p".
const lexicalSource=readFileSync(new URL('../assets/latin-suggest.js',import.meta.url),'utf8');
assert(!lexicalSource.includes('\\\\p{'), 'Duplicated Unicode escape in lexical concordance');
const lexicalTokens='proslambanómenos symmetria ἀρχιτεκτονική'.match(/[\p{L}\p{M}]+/gu);
assert.deepEqual(lexicalTokens,['proslambanómenos','symmetria','ἀρχιτεκτονική']);

// Scientific reproducibility: exact quotations must never silently become approximate hits.
assert.equal(findMatches('alpha beta gamma delta epsilon zeta eta theta','alpha beta gamma delta epsilon zeta omega theta',{phrase:true}).length,0);
assert.equal(findMatches('alpha beta gamma delta epsilon zeta eta theta','alpha beta gamma delta epsilon zeta',{phrase:true}).length,1);
assert.equal(findMatches('De aquaeductu urbis Romae','De aquæductu urbis Romæ',{phrase:true}).length,1);
assert.equal(findMatches('architectura architectus architecti','architectura',{phrase:true}).length,1);
assert.equal(search('De aquæductu urbis Romæ',{mode:'phrase'}).results.length,0);
for(const [query,locus] of [
 ['Cum divina tua mens et numen, imperator Caesar','1.praef.1'],
 ['Decor autem est emendatus operis aspectus probatis rebus compositi cum auctoritate','1.2.5'],
 ['Eius autem capituli symmetria sic est facienda','4.1.11'],
 ['Namque temperatissimae ad utramque partem et corporum membris','6.1.11'],
 ['Itaque qui putant se altitudine, qua sunt grumi','8.3.3'],
 ['Deinde ansae rudentum induntur per foramina capitulorum','10.12.2']
]){const hits=search(query,{mode:'phrase'}).results;assert.equal(hits.length,3,query);assert(hits.every(x=>x.locus===locus&&!x.partial_match),query);}
console.log('Search checks passed: loci, chapter filters, phrases, prefix and exact counts, language filters, missing references, source integrity.');
console.log(JSON.stringify({es:es.passages.length,fr:fr.passages.length,en:en.passages.length,locusOccurrences:expected}));
