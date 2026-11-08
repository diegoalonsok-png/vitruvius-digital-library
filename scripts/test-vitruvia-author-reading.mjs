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
assert(!source.includes('S.autoCodexOpened!==query'), 'Searching for a codex must not auto-open its viewer');
assert.match(source,/window\.VitruviaOldestSource=\{forWork:earliestSourceFor\}/,'Earliest catalogued witness link must be available');
const mediaDossier=read('assets/vitruvia-web-dossier.js');
assert(mediaDossier.includes("records.sort((a,b)=>String(a.releaseDate||'9999')"), 'Music albums must initially render in release-date order');
assert(mediaDossier.includes("if(['music','music-topic'].includes(topic.kind))void albums(section,topic,valid)"), 'Bands must retain their right-side album section');
assert(mediaDossier.includes("if(topic.person&&['author','literature','architect','cinema','visual','general'].includes(topic.kind))void books(section,topic,valid)"), 'Writers must retain their right-side book-cover section');

const article=read('assets/vitruvia-article.js');
// Exercise article assembly instead of depending on the position of functions
// in the source file. A later source refresh must preserve the biography and
// keep original-language readings outside the collapsed documentary sources.
class ArticleNode{
 constructor(tag,text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.parentNode=null;this.id='';this.className=''}
 get childNodes(){return this.children}
 append(...nodes){for(const n of nodes){if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);n.parentNode=this;this.children.push(n)}}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this.append(...nodes)}
 querySelector(selector){const match=n=>selector[0]==='#'?n.id===selector.slice(1):selector[0]==='.'?n.className.split(' ').includes(selector.slice(1)):n.tagName===selector.toUpperCase();for(const n of this.children){if(match(n))return n;const nested=n.querySelector(selector);if(nested)return nested}return null}
 before(node){const p=this.parentNode;node.parentNode=p;p.children.splice(p.children.indexOf(this),0,node)}
 replaceWith(node){const p=this.parentNode;node.parentNode=p;p.children.splice(p.children.indexOf(this),1,node);this.parentNode=null}
}
const articleBody=new ArticleNode('div'),articleTitle=new ArticleNode('h1');
articleBody.id='article-body';articleTitle.id='article-title';
const assemble=vm.createContext({
 window:{},active:1,normalized:norm,relevance:()=>100,isDeityQuery:()=>false,
 document:{documentElement:{lang:'en'},getElementById:id=>id==='article-body'?articleBody:id==='article-title'?articleTitle:articleBody.querySelector('#'+id)},
 make:(tag,text='',className='')=>Object.assign(new ArticleNode(tag,text),{className}),
 reset:()=>articleBody.replaceChildren(),phrase:(es,en)=>en||es,
 appendObjectContext:async()=>[],aside:()=>{},references:()=>{},optionalManuscriptAccess:()=>{},appendPersonLoci:()=>{},appendVerifiedTopicPassages:()=>{},appendAcademicLinks:()=>{},buildContents:()=>{}
});
vm.runInContext(`
 let articleBodyTarget=null;
 const $=id=>id==='article-body'&&articleBodyTarget?articleBodyTarget:document.getElementById(id);
 const paragraph=(text,className='')=>$('article-body').append(make('p',text,className));
 const heading=text=>$('article-body').append(make('h2',text));
 const href=(url,text)=>url?make('a',text):null;
 function appendBiographyExtract(text){const node=make('p',text,'fixture-biography');$('article-body').append(node);return 1}
 window.VitruviaAuthorReading={render(){const node=make('section','Original text and translations');node.id='fixture-readings';const prior=$('article-body').querySelector('#fixture-readings');if(prior)prior.replaceWith(node);else $('article-body').append(node)}};
 const appendSource=()=>$('article-body').append(make('p','Documented source'));
 const appendLocalRepositoryResources=appendSource,appendCuratedUniversities=appendSource,appendManuscriptHierarchy=appendSource,appendCuratedEvidence=appendSource,appendReferenceBooks=appendSource,appendOfficialHistoricalSources=appendSource,appendInstitutionalResearch=appendSource,addTopicBibliography=appendSource;
`,assemble);
const assemblyStart=article.indexOf('function refreshTopicSources('),assemblyEnd=article.indexOf('/* Separate verifiable article sections');
assert(assemblyStart>=0&&assemblyEnd>assemblyStart,'Article assembly entry points missing');
vm.runInContext(article.slice(assemblyStart,assemblyEnd),assemble);
assemble.rows=[{type:'wikipedia',pageid:1,title:'Catullus',link:'https://en.wikipedia.org/wiki/Catullus',wikiLang:'en',fullExtract:'Documented biography fixture.'}];
await vm.runInContext('renderTopic(null,rows,"Catullus",1)',assemble);
const biography=articleBody.querySelector('.fixture-biography'),readings=articleBody.querySelector('#fixture-readings'),details=articleBody.querySelector('#article-academic-expansion');
assert(biography&&readings&&details,'Biography, readings and documentary sources must all remain available');
assert.equal(readings.parentNode,articleBody,'Original-language readings must remain directly accessible');
assert.equal(details.tagName,'DETAILS');
assert(details.querySelector('summary'),'Documentary sources must have an accessible summary');
assert(articleBody.children.indexOf(biography)<articleBody.children.indexOf(readings),'Biography must precede author readings');
assert(articleBody.children.indexOf(readings)<articleBody.children.indexOf(details),'Author readings must precede collapsed sources');
details.open=true;
vm.runInContext('refreshArticleSources(rows,"Catullus",null)',assemble);
assert.equal(articleBody.querySelector('.fixture-biography'),biography,'A progressive source update must preserve the existing biography node');
assert.equal(articleBody.querySelector('#article-academic-expansion'),details,'A source refresh must retain the disclosure state');
assert.equal(details.open,true,'A source refresh must retain the user’s expanded sources');
assert.equal(articleBody.querySelector('#fixture-readings').parentNode,articleBody,'Readings must remain outside collapsed sources after refresh');
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
