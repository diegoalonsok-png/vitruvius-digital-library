import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync('assets/vitruvia-search.js','utf8');
assert(src.includes('core.length>=1&&core.length<=5'),'Single-word proper names must not feature arbitrary Wikipedia text search results');
const a=src.indexOf(' const resolved=S.identifiedSubject;',src.indexOf('function display('));
const b=src.indexOf(' const titles=RESULT_TEXT',a);
assert(a>0&&b>a,'Verified entity ranking block must exist');
function reorder(rows,identity){
 const context={ordered:rows.slice(),S:{identifiedSubject:identity}};
 vm.runInNewContext(src.slice(a,b)+';this.output=ordered;',context);
 return context.output;
}
const jesus={type:'wikipedia',title:'Jesús de Nazaret',wikidataId:'Q302',preferredWiki:true};
const song={type:'book',title:'Jesucristo, la canción',rating:9100};
const town={type:'wikipedia',title:'Jesus, personaje de ficción',wikidataId:'Q999',preferredWiki:false};
const other={type:'book',title:'Historia del cristianismo'};
const results=[song,town,other,jesus];
const ranked=reorder(results,{wikidataId:'Q302',kind:'person'});
assert.equal(ranked[0].wikidataId,'Q302');
assert.equal(ranked.length,4,'Never discard other records');
assert.equal(ranked[1].title,song.title);
assert.equal(reorder(results,null)[0].title,song.title,'No false authority when unresolved');
assert.equal(reorder(results,{wikidataId:'Q123'})[0].title,song.title,'No invented authoritative result');
const washington={type:'wikipedia',title:'George Washington',wikidataId:'Q23',preferredWiki:true};
assert.equal(reorder([{type:'book',title:'George Washington grocery'},washington],{wikidataId:'Q23'})[0].title,'George Washington');
console.log('PASS: verified human identity first; namesakes preserved; unresolved identity unchanged');
