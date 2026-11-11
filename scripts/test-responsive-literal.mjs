import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
const read=p=>readFileSync(p,'utf8');
const source=read('assets/vitruvia-lexicon.js');
const forms=JSON.parse(read('data/lexicon/forms-la.json'));
const D={l:'la',forms};
const snippet=(begin,end)=>source.slice(source.indexOf(begin),source.indexOf(end,source.indexOf(begin)));
const lexical=vm.createContext({S:{D},residentLanguages:{la:D},decodeTag:()=>'',findCurated:()=>null});
vm.runInContext(snippet('function fold(s){','function foldMap(text){')+
 snippet('function analyses(D,k){','/* ---------- Morfología')+
 snippet('function quickWord(word,language){','async function renderEntry(')+'\nthis.quick=quickWord;',lexical);
vm.runInContext(snippet('function exactModernConcept(word,concepts,aliases=[]){','async function renderModernEquivalents(')+'\nthis.mapModern=exactModernConcept;',lexical);
const conceptData=JSON.parse(read('data/lexicon/conceptus.json')),concepts=conceptData.concepts;
for(const q of ['logos','logo']){const mapped=lexical.mapModern(q,concepts,conceptData.queryAliases);assert.equal(mapped.grc.join(','),'λόγος');assert.equal(mapped.la.length,0);}
for(const q of ['dios','god','dieu']){const mapped=lexical.mapModern(q,concepts);assert.equal(mapped.la.join(','),'deus');assert.equal(mapped.grc.join(','),'θεός');}
const architecture=lexical.mapModern('arquitectura',concepts);
assert.equal(architecture.la.join(','),'architectura');
assert(architecture.grc.includes('ἀρχιτεκτονική'));
for(const word of ['dimus','numen','symmetria','domus'])assert.equal(lexical.mapModern(word,concepts),null,word+' must remain a literal ancient-word query');
let fetched=0;
const context=vm.createContext({window:{VitruviaLexicon:{quickWord:lexical.quick}},document:{currentScript:null},fetch:()=>{fetched++;throw Error('Resident lookup must not download a dictionary')}});
vm.runInContext(read('assets/classical-lexicon.js'),context);
const api=context.window.ClassicalLexicon,started=performance.now();
for(const term of ['ordinatio','numen','domus','symmetria']){
 const result=await api.lookup(term,{lang:'la',online:false});
 assert.equal(result.entries[0]?.lemma,term);
 assert(result.entries[0]?.gloss.length>3);
}
assert.equal(fetched,0);
assert.equal(lexical.quick('dimus','la'),null);
assert.equal(api.find('domus domesticus domūs','domus',{prefix:false}).length,2);
assert.equal(api.find('symmetria et geometria','dimus',{prefix:false}).length,0);
assert.equal(api.find('λόγος καὶ λόγου','λογος',{prefix:false}).length,1);
const residentMs=performance.now()-started;
const text=JSON.parse(read('data/lexicon/corpus-la.json')).passages.map(p=>p[2]);
const scanStart=performance.now();let hits=0;
for(const p of text)hits+=api.find(p,'numen',{prefix:false}).length;
const scanMs=performance.now()-scanStart;assert(hits>0);
const worker={postMessage:value=>worker.result=value};
const workerContext=vm.createContext({self:worker});
vm.runInContext(read('assets/classics-search-worker.js'),workerContext);
worker.onmessage({data:{id:1,passages:['domus domesticus','numen atque numen','symmetria et geometria','λόγος'],terms:['domus','numen','dimus','λόγος'],allMatches:true}});
assert.equal(worker.result.results[0].count,1);assert.equal(worker.result.results[1].count,2);
assert.equal(worker.result.results[2],null);assert.equal(worker.result.results[3].count,1);
const books=JSON.parse(read('data/catalog.json'));
for(const id of ['recensio-es','recensio-fr','theory-en']){
 const e=books.editions.find(e=>e.id===id);assert(e.doi&&e.pages&&e.metadata_source);
 const ids={'recensio-es':'vitruvio-v514-pdf','recensio-fr':'vitruvio-v554-pdf','theory-en':'theory-v297-pdf'};
 const record=JSON.parse(read('data/bibliotheca-graeca-latina-I-bce-I-ce.json')).works.find(w=>w.id===ids[id]);
 assert.equal(record.bibliography.doi,e.doi);assert.equal(record.bibliography.isbn,e.isbn);
}
assert.equal(books.project.doi,'10.5281/zenodo.23868911');
console.log(JSON.stringify({passed:true,residentLookups:4,dictionaryNetworkRequests:fetched,residentMs:Math.round(residentMs*10)/10,latinPassages:text.length,numenHits:hits,fullLatinScanMs:Math.round(scanMs),note:'Node CPU measurements; not end-user network latency'}));
