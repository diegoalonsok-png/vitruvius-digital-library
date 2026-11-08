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
const minimal=read('assets/bibliotheca-simple.js');
const engine=read('assets/classics-corpus-search.js');
const index=read('index-codicum.html');
assert.equal((html.match(/type="search"/g)||[]).length,1,'Bibliotheca must have exactly one visible textual search');
assert(html.includes('id="classic-work"')&&html.includes('option value=""'),'The work selector must offer all works');
assert(html.includes('id="classic-lexicon"'),'The actual query must open Lexicon directly');
assert(html.includes('assets/bibliotheca-simple.js'),'Minimal reader must be mounted');
assert(html.includes('assets/bibliotheca-simple.css'),'Lexicon black/ivory theme must load');
assert(!/<iframe|<dialog|id="classic-sort"|id="classic-detail"/.test(html),'No old viewer, panels or duplicate sorting');
assert((html.match(/<option value="(?:es|en|fr)">/g)||[]).length===3,'Interface language must match ES EN FR');
assert(!html.includes('<option value="it">'),'Unsupported interface language must not reappear');
assert(minimal.includes('allMatches:true,includeFullText:true'),'Every matching paragraph must be preserved, with no 600-result cutoff');
assert(minimal.includes('workId:works.value||""'),'Single selected work must scope the search');
assert(minimal.includes('compareWork('),'Results must be sorted by approximate work composition age');
assert(minimal.includes('vitruvia-lexicon.html')&&minimal.includes('searchParams.set("q",q)'),
 'Lexicon deep link must carry the actual query');
assert(minimal.includes('catalog.length-indexed.size'),'Non-indexed books must be disclosed');
assert(engine.includes('includeFullText=false')&&engine.includes('fullText:p.text'),
 'Literal engine must allow complete paragraph output rather than snippets');
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
