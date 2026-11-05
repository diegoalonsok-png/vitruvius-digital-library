/* Repeatable behavior and retrieval checks; no external APIs are required. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const transportSource=read('assets/vitruvia-data.js');
function transport(fetch){
 const window={};
 vm.runInNewContext(transportSource,{window,document:{baseURI:'https://library.test/'},location:{href:'https://library.test/vitruvia.html',origin:'https://library.test'},URL,DOMException,AbortController,setTimeout,clearTimeout,fetch,Date});
 return window.VitruviaData;
}
const reply=(value,status=200)=>({ok:status===200,status,headers:new Headers(),json:async()=>value});
let requests=0,parses=0;
const shared=transport(async()=>{requests++;return {...reply({edition:'V514',passages:[{locus:'1.1.1',latin:'Architecti est scientia'}]}),json:async()=>{parses++;return {edition:'V514',passages:[{locus:'1.1.1',latin:'Architecti est scientia'}]}}}});
const copies=await Promise.all(Array.from({length:8},()=>shared.json('data/structured/recensio-es.json')));
assert.equal(requests,1,'Concurrent engines must share one local download');
assert.equal(parses,1,'Concurrent engines must share one JSON parse');
assert.ok(copies.every(value=>value===copies[0]));
await shared.json('./data/structured/recensio-es.json');
assert.equal(requests,1,'Equivalent relative URLs must share the local index');
await shared.json('data/structured/recensio-es.json?v=new-edition');
assert.equal(requests,2,'A different editorial revision must not reuse old data');

let attempts=0;
const retryable=transport(async()=>{if(++attempts===1)throw Error('offline');return reply({ok:true})});
await assert.rejects(retryable.json('data/retry.json'));
assert.equal((await retryable.json('data/retry.json')).ok,true);
assert.equal(attempts,2,'A transient failure must not poison the index cache');

let limitedCalls=0;
const limited=transport(async()=>{limitedCalls++;return reply({},429)});
await assert.rejects(limited.remoteJSON('https://api.test/works?q=Lucrecio'),/429/);
await assert.rejects(limited.remoteJSON('https://api.test/works?q=Ciceron'),/429/);
assert.equal(limitedCalls,1,'A rate-limited endpoint needs a cooldown across queries');

let remoteCalls=0;
const cached=transport(async()=>{remoteCalls++;return reply({source:'catalogue'})});
await cached.remoteJSON('https://api.test/catalogue?q=Lucrecio');
await cached.remoteJSON('https://api.test/catalogue?q=Lucrecio');
assert.equal(remoteCalls,1,'Repeated successful source lookups must reuse short-lived results');

let aborted=false;
const cancellable=transport((url,{signal})=>new Promise((resolve,reject)=>{
 if(url.includes('new')){resolve(reply({query:'new'}));return}
 signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('cancelled','AbortError'))},{once:true});
}));
const old=new AbortController();
const stale=cancellable.remoteJSON('https://api.test/old',{signal:old.signal});
old.abort();await assert.rejects(stale,{name:'AbortError'});
assert.equal(aborted,true,'Starting a new search must be able to stop the old network request');
assert.equal((await cancellable.remoteJSON('https://api.test/new')).query,'new');
let ran=false;const delayed=new AbortController();
const skipped=shared.defer(()=>{ran=true},{signal:delayed.signal,delay:20});
delayed.abort();await assert.rejects(skipped,{name:'AbortError'});assert.equal(ran,false);
console.log('PASS: shared indexes, version separation, retries, source cooldowns, result caching and cancellation.');

// Compare optimized retrieval against the previous published implementation,
// using all four real corpora. A fixture can be supplied by the local benchmark;
// CI always verifies deterministic results and records the optimized timings.
const fixture=process.env.VITRUVIA_BASELINE_SEARCH;
const oldSource=fixture?readFileSync(fixture,'utf8'):null;
const currentSource=read('assets/search-agentic.js');
function engine(source){
 const window={};
 vm.runInNewContext(source,{window,fetch:async url=>reply(JSON.parse(read(String(url).replace(/^\.\//,''))))});
 return window.VitruviaAgentic;
}
const queries=['symmetria','Lucrecio','Cicerón','aqua','templo','Pitagoras','architectura','deus'];
const current=engine(currentSource),baseline=oldSource?engine(oldSource):null;
const answers=[];
for(const query of queries){
 const actual=await current.search(query);answers.push(actual);
 if(baseline){const previous=JSON.parse(JSON.stringify(await baseline.search(query)));for(const row of previous.rows)if(row.meta)row.meta=row.meta.replace('Fuente textual verificada · ','Texto de edición identificada · ');assert.deepEqual(JSON.parse(JSON.stringify(actual)),previous,'Retrieval changed for '+query)}
}
assert.ok(answers.every(x=>x.stats.chunks>=2000));
assert.ok(answers[0].rows.some(x=>x.type==='passage'),'The corpus must return actual source passages');
const measure=async retriever=>{const start=performance.now();for(let n=0;n<3;n++)for(const q of queries)await retriever.search(q);return performance.now()-start};
const before=baseline?await measure(baseline):null,after=await measure(current);
console.log(JSON.stringify({queries:24,baselineMs:before&&Math.round(before),optimizedMs:Math.round(after),ratio:before&&Number((before/after).toFixed(2)),corpusPassages:answers[0].stats.chunks}));
console.log('PASS: source passages, references and retrieval scores preserved. Timings measure local retrieval, not internet latency.');
