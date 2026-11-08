// Reproducible catalogue integrity checks; run: node scripts/test-classical-catalogue-integrity.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const works=JSON.parse(read('data/bibliotheca-graeca-latina-I-bce-I-ce.json')).works;
const witnesses=JSON.parse(read('data/bibliotheca-testimonia-verified.json'));
const inventory=JSON.parse(read('data/corpus-expansion-inventory.json')).records;
const ids=new Set(works.map(w=>w.id));
assert.equal(ids.size,works.length,'Duplicate work identifier');
for(const ms of witnesses.records){
 assert(ms.shelfmark&&ms.library,'Witness lacks shelfmark or holding library: '+ms.id);
 assert(Number.isFinite(ms.dateStart)&&ms.dateStart>0,'Witness lacks approximate sortable date: '+ms.id);
 assert(ms.date,'Witness lacks its original textual dating description: '+ms.id);
 for(const workId of ms.workIds||[])assert(ids.has(workId),'Orphan witness: '+ms.id+' -> '+workId);
}
for(const edition of witnesses.editions)assert(ids.has(edition.workId),'Orphan edition: '+edition.workId);
const html=read('bibliotheca-graeca-latina.html');
const app=read('assets/bibliotheca-graeca-latina.js');
const index=read('index-codicum.html');
assert(html.includes('id="classic-sort"'),'Missing academic ordering control');
assert(app.includes('function matchingWitness(w,q)'),'Missing shelfmark matching');
assert(app.includes('function render(){const data=filters(),t=terms(),q="";'),
 'Bibliographic listing must remain complete, independently of the textual word/phrase search');
assert(!app.includes('const hit=q?matchingWitness(w,q):null;')||app.indexOf('function render(){const data=filters(),t=terms(),q=')<app.indexOf('const hit=q?matchingWitness(w,q):null;'),
 'Manuscript match must not reference an uninitialized query');
assert(html.includes('assets/bibliotheca-unified-search.js'),'Single textual search must be mounted');
assert(html.includes('assets/bibliotheca-unified.css'),'Lexicon dark theme must be mounted');
const indexEngine=read('assets/bibliotheca-unified-search.js');
assert(indexEngine.includes("searchPassages([q],{allMatches:true,workId})")&&indexEngine.includes("semanticVariants(q)"),
 'Full-text search must examine the index without a fixed results cap');
assert(indexEngine.includes('catalog.length-indexed().size'),
 'Search must disclose precisely how many catalogue works were not indexed');
assert(app.includes('function witnessYear(w)'),'Missing documented witness ordering');
assert(index.includes('id="codex-query"'),'Missing dedicated codex index search');
assert(index.includes('metadata_status'),'Missing provisional/documented status');
assert(index.includes('bibliotheca-graeca-latina.html?'),'Missing manuscript-to-work discovery link');
const codices=inventory.filter(x=>x.group==='manuscripts');
const fold=v=>String(v??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const matches=q=>codices.filter(x=>fold(q).split(/\s+/).every(t=>fold([x.display_title,x.shelfmark,x.siglum,x.institution,x.place,x.date_display,x.date,...(x.aliases||[])].join(' ')).includes(t)));
assert(matches('Harley MS 2767').length>=1,'Harley signatura not indexed');
assert(matches('Gudianus').length>=2,'Gudianus manuscript variants not indexed');
assert.equal(matches('unspecifiedimpossiblecode987').length,0,'Unrelated query returned manuscript results');
console.log('PASS classical catalogue integrity:',works.length,'works,',witnesses.records.length,'manuscripts,',witnesses.editions.length,'editions,',codices.length,'codex inventory entries');
