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
const engine=read('assets/bibliotheca-simple.js');
const corpus=read('assets/bibliotheca-corpus-search.js');
const index=read('index-codicum.html');
assert(html.includes('id="classic-query"'),'The Bibliotheca needs one search field');
assert(html.includes('id="classic-work"'),'The Bibliotheca needs a complete work selector');
assert(!html.includes('classic-view-colorbar')&&!html.includes('classics-study-tools.js'),
 'The minimal Bibliotheca must not embed readers, palettes or extra tools');
assert(html.includes('assets/bibliotheca-simple.js'),'Single concordance script must be mounted');
assert(html.includes('assets/bibliotheca-corpus-search.js')&&html.includes('assets/bibliotheca-simple.css'),'Lexicon-style monochrome design must be mounted');
assert(engine.includes('allMatches:true,includeFullText:true,includeOCR:false'),
 'Search must include full passages and all attested occurrences while excluding unverified OCR');
assert(engine.includes('works.length-indexed.size'),
 'Every query must disclose how many catalogued works were not indexed');
assert(engine.includes('vitruvia-lexicon.html')&&engine.includes('searchParams.set("mode","palabra")'),
 'Lexicon must receive the user search term');
assert(corpus.includes('completeMatches(p.text,q)'),
 'Complete documentary concordances must not be limited to 80 hits per passage');
assert(engine.includes('dateRank(')||engine.includes('dating('),
 'Every result must sort by the ancient work dating');
assert(html.includes('id="language-toggle"')&&!html.includes('data-lang='),
 'Bibliotheca must expose one language switch, not three separate selectors');
assert(engine.includes('es:"en",en:"fr",fr:"es"'),
 'The single language switch must cycle only ES EN FR');
const separateReader=read('assets/bibliotheca-graeca-latina.js');
assert(separateReader.includes('function witnessYear(w)'),
 'Documented manuscript witness date logic should remain preserved in its archival module');
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
