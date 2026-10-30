// node scripts/test-search-regression.mjs
// A small deterministic smoke suite for the exact same search-core module used by the website.
import assert from 'node:assert/strict';
import {parseLocus,searchCorpus,findMatches} from '../assets/search-core.mjs';
const latin='Cameris dispositis et intextis, imum caelum earum trullissetur, deinde harena dirigatur, postea autem creta aut marmore poliatur. In hisque minime gypsum debet admisceri.';
const sample={edition:'recensio-es',language:'es',passages:[{book:7,chapter:3,section:3,locus:'7.3.3',latin,translation:'En ellas no debe mezclarse yeso; después se pule con mármol.',pdf_pages:{}}]};
for(const [query,book,chapter,section] of [
 ['LIBER IV',4,null,null],['LIVER IV',4,null,null],['lib. IV',4,null,null],
 ['livre IV',4,null,null],['LIBER VII caput 3',7,3,null],['II praef 1',2,'praef',1],
 ['VII.3.3',7,3,3]
]){
 const ref=parseLocus(query);
 assert.ok(ref,query+' was not recognized');
 assert.equal(ref.book,book,query);
 assert.equal(ref.chapter,chapter,query);
 assert.equal(ref.section,section,query);
}
const options={query:'Cameris dispositis et intextis, imum caelum earum trullissetur',kind:'words',mode:'phrase',language:'all'};
assert.equal(searchCorpus([sample],options).results[0]?.locus,'7.3.3');
assert.equal(searchCorpus([sample],{...options,query:'gypsum'}).results[0]?.locus,'7.3.3');
assert.equal(searchCorpus([sample],{...options,query:'LIBER VII',kind:'locus'}).results[0]?.locus,'7.3.3');
assert.ok(findMatches(latin,'cameris dispositis et intextis')[0]);
assert.equal(searchCorpus([sample],{...options,query:'this phrase cannot be in vitruvius'}).results.length,0);
console.log('PASS: 7 references, Latin phrase, single term, book and negative query.');
