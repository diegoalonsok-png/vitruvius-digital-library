import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findRanges,termsFor,searchPages,parseReference,lociFor,wordBoxes} from '../assets/modern-edition-search.mjs';
assert.equal(parseReference('III.1.2').key,'3.1.2');
assert.equal(parseReference('II.pr.5').key,'2.praef.5');
assert.equal(parseReference('Libro X prefacio 1').key,'10.praef.1');
assert.equal(parseReference('1.2').key,'1.2');
assert.equal(parseReference('XI.2.1'),null);
assert.equal(parseReference('decor'),null);
assert.equal(parseReference('1.0.1'),null);
const text='De symmetriā et symmetriis. Decoris, decor atque indecorus. firmitas.';
const ranges=findRanges(text,termsFor('simetría'));
assert.deepEqual(ranges.map(([a,b])=>text.slice(a,b)),['symmetriā','symmetriis']);
assert.deepEqual(findRanges(text,termsFor('decor')).map(([a,b])=>text.slice(a,b)),['Decoris','decor']);
const split='de symme-\ntria VITRVVII ratio';
assert.equal(findRanges(split,['symmetria']).length,1);
assert.equal(findRanges(split,['vitruvii']).length,1);
assert.equal(searchPages([{page:1,text},{page:2,text:'decor'}],'decor firmitas','words').length,1);
assert.equal(searchPages([{page:1,text:'de symmetria ratio'}],'de symmetria','phrase').length,1);
assert.equal(searchPages([{page:1,text:'de ratio symmetria'}],'de symmetria','phrase').length,0);
assert.equal(lociFor({loci:{'2.praef.1':{page:12},'2.1.1':{page:13}}},parseReference('II.praef')).length,1);
assert.equal(wordBoxes([{start:0,end:4,x:.1,y:.2,w:.1,h:.02},{start:5,end:9,x:.3,y:.2,w:.1,h:.02}],[[1,3]]).length,1);
for(const slug of ['rose-1899','krohn-1912']){
 const pages=JSON.parse(readFileSync('data/text/'+slug+'.json','utf8'));
 for(const query of ['symmetria','decor','firmitas'])assert.ok(searchPages(pages,query).length>0,slug+' '+query);
}
console.log('PASS: Rose and Krohn real OCR, concepts, inflections, phrases, all-word search, Roman loci, prefaces and image boxes');
