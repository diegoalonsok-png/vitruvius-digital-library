/* Execute the ordinary search, including a slow optional-module load.
 * Fixtures establish orchestration, not the availability of public APIs. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('assets/vitruvia-search.js','utf8');
const code=source.slice(source.indexOf('async function search(){'),source.indexOf('\nfunction language('));
const elements=new Map();
const $=id=>{
 if(!elements.has(id))elements.set(id,{value:'',dataset:{},setAttribute(){},replaceChildren(){}});
 return elements.get(id);
};
const S={mode:'all',lang:'es',searchId:0,ready:true,supplementalReady:true,works:[],lexicon:[]};
const events=[],calls=[],paints=[];
let release;
const optionalModules=new Promise(resolve=>{release=resolve});
const identity={kind:'person',canonical:'Jorge Luis Borges',wikidataId:'Q236'};
const window={
 VitruviaFeatures:{load(group){calls.push('load:'+group);return optionalModules}},
 VitruviaEntityResolver:{subject:q=>q,resolve:async()=>identity,resolveFast:async()=>identity},
 VitruviaWebRouting:{plan:()=>({providers:['wikidata','openLibrary','crossref']})},
 VitruviaResearchEngine:{classify:()=>({}),query:async()=>({rows:[]})},
 VitruviaData:{json:async()=>({entries:[]}),defer:task=>Promise.resolve().then(task)},
 VitruviaExternalTexts:{search:async()=>{calls.push('Wikisource');return {rows:[],sources:[]}}},
 addEventListener(){},removeEventListener(){},
 dispatchEvent(event){events.push(event.type)}
};
const sandbox={window,S,$,AbortController,URLSearchParams,setTimeout,clearTimeout,
 performance:{now:()=>0},history:{replaceState(){}},
 CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
 document:{body:{classList:{add(){}}}},
 currentAuthorityFor:()=>null,identifyHistoricalPerson:()=>null,topicQuery:q=>q,
 T:()=>({heading:'Resultados',waiting:'Buscando',searching:'Buscando'}),node:()=>({}),
 restoreFeature(){},promotePrimaryManuscript(){},sourceLinks(){},applyFeatured(){},considerFeatured(){},
 authorityResult:x=>({type:'wikipedia',title:x.canonical,wikidataId:x.wikidataId}),
 display(rows,q,phase){paints.push({rows:[...rows],q,phase});window.VitruviaSearchSnapshot={query:q,rows}},
};
for(const name of ['onomasticonSubjectRows','authorCatalogueRows','associatedClassicalWorks',
 'classicalSubjectRows','academicRows','liveBooks','liveManuscripts','liveHistoricalEditions',
 'liveEditions','livePages','matchingAuthorWorks','authorityRows'])sandbox[name]=()=>[];
for(const name of ['wiki','wikidata','openLibrary','crossref'])sandbox[name]=async()=>{
 calls.push(name);
 return name==='openLibrary'?[{type:'openlibrary',title:'Ficciones',author:'Jorge Luis Borges'}]:[];
};
vm.runInNewContext(code+';globalThis.runSearch=search',sandbox);
$('query').value='Jorge Luis Borges';
const running=sandbox.runSearch();
await new Promise(resolve=>setTimeout(resolve,0));
assert(paints.some(p=>p.rows.some(r=>r.title==='Jorge Luis Borges')),
 'The first identity must be painted while optional modules are still pending');
assert.equal(calls.includes('openLibrary'),false,'Bibliography must not delay the first identity');
release();await running;
assert(calls.includes('openLibrary'),'Ordinary All search must fetch books without an expand click');
assert(calls.includes('crossref'),'Ordinary All search must include scholarly records');
assert(calls.includes('Wikisource'),'Ordinary All search must discover original literary texts');
assert(paints.at(-1).rows.some(r=>r.title==='Ficciones'),'Book records must reach the final result set');
assert.equal(events.filter(x=>x==='vitruvia:search').length,1,'Enrichment must not restart/erase the query');
assert.equal($('expand-search-sources').hidden,true,'Normal search already includes expanded sources');

// A new query must cancel in-flight work and discard the previous result snapshot.
let oldAborted=false;S.searchController.signal.addEventListener('abort',()=>{oldAborted=true});
$('query').value='Andrea Palladio';await sandbox.runSearch();
assert(oldAborted,'Consecutive searches must abort the previous controller');
assert.equal(window.VitruviaSearchSnapshot.query,'Andrea Palladio');
const ranking={};
vm.runInNewContext('const norm=s=>String(s||"").toLowerCase().trim();'+source.slice(
 source.indexOf('function creatorWorkRelevance('),source.indexOf('\nfunction titleMatch('))+
 ';globalThis.boost=creatorWorkRelevance',ranking);
assert(ranking.boost({type:'openlibrary',title:'Ficciones',author:'Jorge Luis Borges'},identity)>0,
 'Works attributed to the identified author must receive a relevance boost');
assert.equal(ranking.boost({type:'openlibrary',title:'Jorge Luis Borges',author:'Unrelated researcher'},identity),0,
 'A book about the person must not be classified as their own work');
const readers={window:{},URL,location:{href:'https://library.test/vitruvia.html',origin:'https://library.test'}};
vm.runInNewContext(readFileSync('assets/vitruvia-local-manuscripts.js','utf8'),readers);
assert.equal(readers.window.VitruviaLocalManuscripts.locate('codex-h-folios-local.html?folio=f.1r'),'https://library.test/codex-h-folios-local.html?folio=f.1r');
assert.equal(readers.window.VitruviaLocalManuscripts.locate('https://library.test/codex-h-folios-local.html?folio=f.1r'),'https://library.test/codex-h-folios-local.html?folio=f.1r');
assert.equal(readers.window.VitruviaLocalManuscripts.locate('https://other.test/codex-h-folios-local.html'),null);
assert.equal(readers.window.VitruviaLocalManuscripts.locate('https://library.test/unrelated.html'),null);
console.log('PASS: identity before optional modules; automatic books, scholarship and texts; one search event; consecutive-query cancellation.');
