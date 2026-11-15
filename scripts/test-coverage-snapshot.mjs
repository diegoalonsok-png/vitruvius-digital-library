import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const catalog=read('data/bibliotheca-graeca-latina-I-bce-I-ce.json').works;
const registry=read('data/classics-corpus/search-registry.json').entries;
const translations=read('data/classics-corpus/translation-availability-222.json');
const coverage=read('data/classics-corpus/coverage-audit.json');
const road=read('data/classics-corpus/indexation-roadmap-222.json');
const external=read('data/classics-corpus/external-index-reconciliation.json');
const local=new Set(registry.filter(e=>['la','grc'].includes(e.language)&&!e.path.startsWith('https:')).map(e=>e.workId));
const r2=new Set(registry.filter(e=>['la','grc'].includes(e.language)&&e.path.startsWith('https:')).map(e=>e.workId));
const offsite=new Set(external.remoteEntries.map(e=>e.workId));
assert.equal(translations.works.length,catalog.length);
assert.equal(new Set(translations.works.map(w=>w.id)).size,catalog.length);
assert.equal(translations.totals.originalTextIndexed,local.size,'Local originals must not silently include remote URLs');
assert.equal(translations.totals.declaredR2OriginalWorks,r2.size);
assert.equal(translations.totals.registeredOriginalWorks,new Set([...local,...r2]).size);
for(const w of translations.works){assert.equal(w.originalIndexed,local.has(w.id));assert.equal(w.originalR2Registered,r2.has(w.id));}
assert.equal(road.counts.originalsIndexed,local.size);
assert.equal(road.counts.effectiveOriginalsIndexed,new Set([...local,...offsite]).size);
assert.equal(road.counts.registeredOriginalsWithExternal,new Set([...local,...r2,...offsite]).size);
assert.equal(external.counts.combinedOriginalsIndexed,road.counts.effectiveOriginalsIndexed);
const statuses={};for(const w of catalog)statuses[w.publicStatus]=(statuses[w.publicStatus]||0)+1;
assert.deepEqual(coverage.counts.catalogueStatuses,statuses);
assert.equal(coverage.counts.manuscriptWitnesses,read('data/bibliotheca-testimonia-verified.json').records.length);
assert.equal(coverage.counts.indexedTextVersions,registry.length);
assert.equal(translations.totals.translatedWorksLocal,translations.works.filter(w=>w.translationLanguages.length).length);
assert.equal(translations.totals.worksWithoutHostedTranslation+translations.totals.translatedWorksLocal,catalog.length);
const manifest=read('data/r2/corpus-manifest.json');
for(const e of registry.filter(e=>e.path.startsWith('https:'))){
 const source=manifest.obras.find(x=>x.workId===e.workId&&x.language===e.language&&e.path===manifest.base+x.archivo);
 assert(source&&source.pasajes>0&&/^[a-f0-9]{64}$/.test(source.sha256),'Declared R2 text needs its recorded object identity');
}
// Exercise the published inventory table, including its distinction between
// local files and remote declarations after derived metadata is refreshed.
const dom=new JSDOM(readFileSync('auditoria-textos-clasicos.html','utf8'),{url:'https://example.org/auditoria-textos-clasicos',runScripts:'outside-only'});
const w=dom.window;
w.fetch=async url=>({ok:true,json:async()=>read(String(url).split('?')[0])});
w.eval([...w.document.querySelectorAll('script:not([src])')].map(s=>s.textContent).find(s=>s.includes('let all=[],remoteIndexedIds=')));
for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
const filter=w.document.getElementById('audit-filter');filter.value='indexed';filter.dispatchEvent(new w.Event('change'));
assert.equal(w.document.querySelectorAll('#audit-rows tr').length,new Set(registry.map(e=>e.workId)).size);
const remoteRow=w.document.querySelector('a[href$="work=apolonio-argonauticas"]').closest('tr');
assert.match(remoteRow.cells[2].textContent,/^R2 · registro declarado/);
assert.equal(w.document.getElementById('audit-local-originals').textContent,String(local.size));
assert.equal(w.document.getElementById('audit-r2-originals').textContent,String(r2.size));
filter.value='local';filter.dispatchEvent(new w.Event('change'));
assert.equal(w.document.querySelectorAll('#audit-rows tr').length,coverage.counts.locallyReadableClaims);
w.close();
console.log('PASS: current catalog, witnesses, translations, local originals, declared R2 texts, external sources and public table agree without promoting declarations to live verification');
