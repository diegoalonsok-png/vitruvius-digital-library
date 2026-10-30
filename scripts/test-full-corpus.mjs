// Verify full-text indexing without manually enumerating vocabulary.
// node scripts/test-full-corpus.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findMatches,searchCorpus,tokens,parseLocus} from '../assets/search-core.mjs';
const datasets=await Promise.all(['recensio-es','recensio-fr','theory-en'].map(async id=>{
 const data=JSON.parse(await readFile(new URL('../data/structured/'+id+'.json',import.meta.url),'utf8'));
 assert.equal(data.edition,id);assert.ok(Array.isArray(data.passages));
 return data;
}));
let tested=0, missing=[], words=new Set(), perEdition=[];
for(const data of datasets){
 let count=0;
 for(const passage of data.passages){
  for(const [language,text] of [['la',passage.latin],[data.language,passage.translation]]){
   if(!text?.trim())continue;
   const t=tokens(text);
   for(const token of t)words.add(token.value);
   if(!t.length)continue;
   const fragment=t.slice(0,Math.min(5,t.length)).map(x=>x.raw).join(' ');
   if(!findMatches(text,fragment,{phrase:true}).length)
     missing.push({edition:data.edition,locus:passage.locus,language,fragment});
   tested++;count++;
  }
  assert.ok(parseLocus(passage.locus),'Invalid locus: '+passage.locus);
 }
 perEdition.push({edition:data.edition,passages:data.passages.length,fields:count});
}
assert.deepEqual(missing.slice(0,20),[],JSON.stringify(missing.slice(0,20)));
for(const data of datasets){
 for(const passage of data.passages.filter((_,i)=>i%31===0)){
  const fragment=tokens(passage.latin).slice(0,5).map(x=>x.raw).join(' ');
  if(!fragment)continue;
  const result=searchCorpus([data],{query:fragment,kind:'words',mode:'phrase',language:'la'});
  assert.ok(result.results.some(r=>r.locus===passage.locus),data.edition+' '+passage.locus+' '+fragment);
 }
}
for(const term of ['arch','symmetr','machin']){
 const result=searchCorpus(datasets,{query:term,kind:'words',mode:'words',language:'all',prefixFallback:true});
 assert.ok(result.results.length,'No prefix results for '+term);
}
console.log(JSON.stringify({status:'PASS',testedFields:tested,distinctTokens:words.size,perEdition,smokePrefixes:['arch','symmetr','machin']},null,2));
