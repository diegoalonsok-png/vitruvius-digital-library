import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const works=JSON.parse(read('data/bibliotheca-graeca-latina-I-bce-I-ce.json')).works;
const catalogue=JSON.parse(read('data/bibliotheca-testimonia-verified.json'));
const S={works,witnesses:catalogue.records,editions:catalogue.editions};
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const source=read('assets/vitruvia-search.js');
const ctx=vm.createContext({window:{},S,norm,URLSearchParams,score:(a,b)=>norm(a).includes(norm(b))?100:0,workString:w=>[w.title,w.author,...(w.aliases||[])].join(' '),verified:w=>!!w.localHtml,witnessesFor:id=>S.witnesses.filter(r=>r.workIds.includes(id)),editionsFor:id=>S.editions.filter(r=>r.workId===id),libraryURL:(id,view)=>'bibliotheca-graeca-latina.html?work='+id+(view?'&view='+view:''),topicQuery:q=>q});
vm.runInContext(source.slice(source.indexOf('function codexDateStart('),source.indexOf('function promotePrimaryManuscript(')),ctx);
vm.runInContext(source.slice(source.indexOf('function liveManuscripts('),source.indexOf('/* Vetted institutional records:')),ctx);
vm.runInContext(source.slice(source.indexOf('function liveBooks('),source.indexOf('function livePages(')),ctx);
vm.runInContext(read('assets/vitruvia-author-reading.js'),ctx);
for(const [author,oldest,translation] of [['Catulo','Latin 8071','Cornish'],['Cicerón','Vat. lat. 5757','Miller'],['Marco Aurelio','Vat. gr. 1950, parte 2','Haines']]){
 ctx.query=author;
 const rows=vm.runInContext('[...liveBooks(query,false),...liveManuscripts(query)]',ctx);
 const selected=ctx.window.VitruviaAuthorReading.select(rows,author);
 assert(selected.books.length,author);
 assert.equal(selected.witnesses[0].codexShelfmark,oldest,author);
 assert(selected.translations.some(r=>[r.title,r.note].join(' ').includes(translation)),author);
 assert(selected.witnesses.every(r=>r.codexDate<9999),author);
}
// Original-language reading actions must be linked to genuinely available texts.
const lucretius=ctx.window.VitruviaAuthorReading.select(vm.runInContext('[...liveBooks("Lucrecio",false),...liveManuscripts("Lucrecio")]',ctx),'Lucrecio');
const nature=lucretius.books.find(b=>b.workId==='lucretius');
assert(nature?.originalReadings?.some(r=>r.url==='corpus/lucretius-de-rerum-natura-la.html'&&r.language==='la'), 'Lucretius Latin original missing');
const marcus=ctx.window.VitruviaAuthorReading.select(vm.runInContext('[...liveBooks("Marco Aurelio",false),...liveManuscripts("Marco Aurelio")]',ctx),'Marco Aurelio');
const meditations=marcus.books.find(b=>b.workId==='marcus-aurelius-meditations');
assert(meditations, 'Marcus Aurelius bibliography missing');
assert.equal(meditations.originalLanguage,'grc');
assert(meditations.originalReadings.some(r=>r.language==='grc'&&r.kind==='external'&&r.url.startsWith('https://el.wikisource.org/wiki/')), 'Greek Meditations must link to the documented external original and not pretend to host it');
const catullus=ctx.window.VitruviaAuthorReading.select(vm.runInContext('[...liveBooks("Catulo",false),...liveManuscripts("Catulo")]',ctx),'Catulo');
assert(catullus.books.some(b=>b.originalReadings?.some(r=>r.language==='la'&&r.url.includes('catullus-carmina'))));
const authorUI=read('assets/vitruvia-author-reading.js');
assert(authorUI.includes('article-original-reading-cta'),'Prominent original-language reading CTA missing');
assert(authorUI.includes('originalReading(b)'),'Original text availability guard missing');

const cat=ctx.window.VitruviaAuthorReading.select(vm.runInContext('[...liveBooks("Catulo",false),...liveManuscripts("Catulo")]',ctx),'Catulo');
assert.match(cat.witnesses[0].excerpt,/únicamente carmen 62/);
assert(cat.witnesses.some(r=>r.codexShelfmark==='MS. Canon. Class. Lat. 30'));
assert(cat.translations.every(r=>r.fulltext===false));
assert(source.includes('workIds:ms.workIds||[]'));
const article=read('assets/vitruvia-article.js');
assert(article.indexOf('appendBiographyExtract(data.extract,data.fullurl||wiki?.link);',article.indexOf('async function renderTopic'))<article.indexOf('window.VitruviaAuthorReading?.render'));
assert(article.indexOf('window.VitruviaAuthorReading?.render')<article.indexOf('const body=$("article-body"),previousNodes='));
console.log('Author reading checks passed: Catulo, Cicerón, Marco Aurelio; oldest dated witnesses first, partial coverage, scholarly translations, and placement after biography outside collapsed sources.');
// Internal author viewers retain the holding institution and jump to the actual work.
const ms=catalogue.records.find(r=>r.id==='marcus-aurelius-vat1950');
assert.equal(ms.startFolio,'341r');assert.match(ms.coverage,/341r–392v/);
assert(catalogue.records.find(r=>r.id==='catullus-oxford-o').manifest.startsWith('https://iiif.bodleian.ox.ac.uk/'));
assert(!catalogue.records.find(r=>r.id==='catullus-thuaneus-8071').manifest);
const viewer=read('assets/classical-facsimile-viewer.js');
assert(viewer.includes('const viewerUrl="visor-codex.html?"'));
assert(viewer.includes('viewerParams.set("folio",record.startFolio)'));
const html=read('visor-codex.html');assert(html.includes('id="folio-select"'));assert(html.includes('params.get("folio")'));
