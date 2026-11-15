/* Local evidence and unavailable remote sources must have separate diagnostics. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
for(const engine of ['assets/classics-corpus-search.js','assets/bibliotheca-corpus-search.js']){
const dom=new JSDOM('<!doctype html><html lang="es"><head></head><body></body></html>',{url:'https://example.org/',runScripts:'outside-only'});
const w=dom.window;
w.fetch=async input=>{
 const path=String(input).split('?')[0];
 if(/^https?:/.test(path)||!fs.existsSync(path))return{ok:false,status:403,json:async()=>null,text:async()=>''};
 return{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(path,'utf8')),text:async()=>fs.readFileSync(path,'utf8')};
};
w.eval(fs.readFileSync(engine,'utf8'));
const rows=await w.ClassicsCorpusSearch.semanticSearch('casa',{limit:20});
const diagnostics=w.ClassicsCorpusSearch.diagnostics();
assert(rows.some(r=>r.language==='la')&&rows.some(r=>r.language==='grc'),'Real Latin and Greek source loci remain searchable');
assert.equal(diagnostics.staticIndexUsed,true,'Documented external exclusions must not disable the local semantic index');
assert.equal(diagnostics.localFailed,0,JSON.stringify(diagnostics.failedSources));
assert(diagnostics.remoteFailed>0,'Unavailable external texts are reported');
assert.equal(diagnostics.failed,diagnostics.localFailed+diagnostics.remoteFailed);
assert(diagnostics.failedSources.every(s=>s.remote&&s.path.startsWith('https://')));
assert(rows.every(r=>r.link&&r.excerpt));
for(const query of ['Viuamus','Aeneadum','William Adlington','imperator Caesar']){
 const found=await w.ClassicsCorpusSearch.search(query,{limit:40});
 const literal=w.ClassicsCorpusSearch.diagnostics();
 assert(found.length>0,engine+': '+query+' has real local source results');
 assert.equal(literal.localFailed,0,JSON.stringify(literal.failedSources));
 assert(literal.remoteFailed>0);
 assert.equal(literal.failed,literal.localFailed+literal.remoteFailed);
}
dom.window.close();
}
console.log('PASS: actual Greek/Latin semantic loci, valid local inverted index, and explicit separate diagnostics for unavailable external texts.');
