import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base='http://127.0.0.1:8787/';
const server=spawn('python3',['-m','http.server','8787','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;let failed=0;
async function check(label,callback){
 try{await callback();console.log('PASS',label)}
 catch(e){failed++;console.error('FAIL',label,e.message)}
}
async function open(path){
 const page=await browser.newPage({viewport:{width:1320,height:850}});
 page.on('pageerror',e=>console.error('PAGE ERROR',path,e.message));
 const res=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(res?.status(),200,'HTML inaccessible: '+path);
 return page;
}
try{
 await sleep(1300);browser=await chromium.launch({headless:true});
 await check('All five verified historical PDF files remain present',async()=>{
  const files=[
   'plato-apologia-socratis-adam-1891.pdf','lucretius-on-nature-things-1880.pdf',
   'aristotle-poetics-greek-christ-1893.pdf','lucretius-de-rerum-natura-latin-1813.pdf',
   'virgil-georgica-latin-forbiger-1849.pdf',
   'virgil-aeneid-book-i-walpole-1893.pdf','caesar-de-bello-gallico-smith-1842.pdf',
   'aristotle-poetics-english-1819.pdf'
  ];
  for(const file of files){
   const path='documents/classics/'+file;const fd=fs.openSync(path,'r');
   try{
    const head=Buffer.alloc(5);fs.readSync(fd,head,0,5,0);
    assert.equal(head.toString(),'%PDF-','Not PDF: '+file);
    assert(fs.statSync(path).size>80000,'PDF too small: '+file);
   }finally{fs.closeSync(fd)}
  }
 });
 await check('Vitruvia loads the full classical catalogue (≥196 works) and searches Spanish aliases',async()=>{
  const p=await open('vitruvia.html?q=Po%C3%A9tica&mode=site');
  try{
   await p.waitForFunction(()=>Number(document.querySelector('#metric-works')?.textContent)>=196,{timeout:20000});
   await p.locator('#result-list a[href*="work=aristotle-poetics"]').first().waitFor({state:'attached',timeout:15000});
   assert.match(await p.locator('#result-list').innerText(),/Poética|Περὶ ποιητικῆς/);
  }finally{await p.close()}
 });
 await check('Modern Juan Domingo Perón is not represented by ancient Acts of John or classical codices',async()=>{
  const p=await open('vitruvia.html?q=Juan%20Domingo%20Peron&mode=all');
  try{
   await p.waitForFunction(()=>window.VitruviaSearchSnapshot?.query?.toLowerCase().includes('juan domingo peron')
    &&document.querySelector('#result-list')?.getAttribute('aria-busy')==='false',{timeout:55000});
   const state=await p.evaluate(()=>{
    const rows=window.VitruviaSearchSnapshot?.rows||[];
    return {
     articleTitle:document.querySelector('#article-title')?.textContent||'',
     featureTitle:document.querySelector('#featured-title')?.textContent||'',
     articleText:document.querySelector('#vitruvia-article')?.innerText?.slice(0,10000)||'',
     rows:rows.map(r=>({type:r.type,title:r.title,author:r.author})),
     guardVersion:window.VitruviaContextGuard?.version||''
    };
   });
   assert.equal(state.guardVersion,'1.0','Ancient-context provenance guard must be active');
   assert(!/hechos de juan|acts of john/i.test(state.articleTitle+' '+state.featureTitle+' '+state.articleText),
    'The encyclopedia must not replace Perón with Acts of John');
   assert(!/per[oó]n:\s*a history/i.test(state.articleTitle+' '+state.featureTitle),
    'A modern biography must not be mistaken for the identity of its subject');
   assert(!state.rows.some(r=>['book','manuscript','edition','preface','passage','apparatus','fragment'].includes(r.type)),
    'Unrelated ancient books or codices must not be listed for the modern person');
   // The large top dossier is rendered by a DIFFERENT module from the
   // result cards and article: previously it made this exact false match.
   await p.waitForFunction(()=>!!window.VitruviaTermPanel?.classicalWorks,{timeout:10000});
   const matches=await p.evaluate(async()=>({
    peron:(await window.VitruviaTermPanel.classicalWorks('Juan Domingo Peron')).map(x=>x.w.title),
    peronAccent:(await window.VitruviaTermPanel.classicalWorks('Juan Domingo Perón')).map(x=>x.w.title),
    acts:(await window.VitruviaTermPanel.classicalWorks('Hechos de Juan')).map(x=>x.w.title),
    cicero:(await window.VitruviaTermPanel.classicalWorks('Cicerón')).map(x=>x.w.title)
   }));
   assert.deepEqual(matches.peron,[],'Top dossier must not classify Perón as a classical author');
   assert.deepEqual(matches.peronAccent,[],'Accented Perón must not classify as a classical author');
   assert(matches.acts.some(t=>/acta joannis/i.test(t)),
    'An intentional search for Acts of John must still find its ancient work');
   assert(matches.cicero.length>0,'Cicerón must remain a valid classical author search');
   await p.waitForTimeout(1400);
   const topPanel=await p.locator('#vitruvia-term-panel').innerText();
   assert(!/autor u obra cl[aá]sica|hechos de juan|acts of john|per[oó]n:\s*a history/i.test(topPanel),
    'The visible top dossier must not combine Perón with Acts of John or a modern book title');
  }finally{await p.close()}
 });
 await check('Perrault 1673 navigates actual numbered IIIF canvases without bulk image loading',async()=>{
  const p=await open('perrault-1673.html?year=1673');
  try{
   await p.waitForFunction(()=>Number(document.getElementById('pr-number').max)>30,{timeout:40000});
   const initial=await p.evaluate(()=>({
    max:Number(document.getElementById('pr-number').max),
    src:document.getElementById('pr-image').src,
    label:document.getElementById('pr-label').textContent,
    counter:document.getElementById('pr-counter').textContent
   }));
   assert(/https:\/\/www\.e-rara\.ch\//.test(initial.src)||/\/images\/perrault\/1673\/page-0001\.webp(?:$|[?#])/.test(initial.src),'First facsimile must be the documented e-rara page or its verified local 1673 mirror');
   assert(initial.counter.startsWith('1 / '),'Initial digital page must be image 1');
   await p.locator('#pr-next').click();
   await p.waitForFunction(()=>document.getElementById('pr-counter').textContent.startsWith('2 /'),{timeout:12000});
   const second=await p.locator('#pr-image').getAttribute('src');
   assert.notEqual(second,initial.src,'Next must request a different actual IIIF canvas');
   await p.locator('#pr-prev').click();
   assert((await p.locator('#pr-counter').innerText()).startsWith('1 /'),'Previous must return to image 1');
   assert.equal(await p.locator('#pr-folios').isVisible(),false,'1673 must not duplicate the 1684 folio catalogue');
   await p.locator('#pr-number').fill('25');
   await p.locator('#pr-go').click();
   assert((await p.locator('#pr-counter').innerText()).startsWith('25 /'),'Numeric go-to must navigate to image 25');
  }finally{await p.close()}
 });
 await check('Perrault 1684 opens the distinct verified IIIF copy',async()=>{
  const p=await open('perrault-1673.html?year=1684');
  try{
   await p.waitForFunction(()=>Number(document.getElementById('pr-number').max)>30,{timeout:40000});
   assert.equal(await p.locator('#pr-year').inputValue(),'1684');
   assert.match(await p.locator('#pr-shelfmark').innerText(),/Rar 9852/);
   assert.match(await p.locator('#pr-manifest').getAttribute('href'),/14701133/);
   assert.equal(await p.locator('#pr-folio-grid button').count(),390,'1684 must present exactly 390 verified image entries');
   assert.equal(await p.locator('#pr-folios').isVisible(),true,'1684 folio catalogue not visible');
   await p.locator('#pr-folio-grid button[data-index="24"]').click();
   assert.match(await p.locator('#pr-counter').innerText(),/^25 \/ 390$/,'Folio 25 must navigate by image number');
  }finally{await p.close()}
 });
 await check('Bibliotheca simple: one search, one work selector, monochrome Lexicon and three real UI languages',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#classic-work option').length>=220,{timeout:28000});
   const state=await p.evaluate(()=>({
    searches:document.querySelectorAll('input[type="search"]').length,
    books:document.querySelectorAll('#classic-work option').length,
    colors:document.querySelectorAll('input[type="color"]').length,
    iframes:document.querySelectorAll('iframe').length,
    languageButtons:document.querySelectorAll('#language-toggle').length,
    languageLabel:document.querySelector('#language-toggle')?.textContent,
    body:getComputedStyle(document.body).backgroundColor,
    button:getComputedStyle(document.querySelector('#search-submit')).borderColor,
    coverage:document.querySelector('#catalogue-status').textContent,
    scripts:!!document.querySelector('script[src*="bibliotheca-simple.js"]')
   }));
   assert.equal(errors.length,0,'Bibliotheca must not throw JavaScript errors: '+errors.join('; '));
   assert(state.scripts,'New minimal Bibliotheca script must be loaded');
   assert.equal(state.searches,1);
   assert(state.books>=223,'Catalogue must include all 222 works plus All books');
   assert.equal(state.colors,0,'No ineffective color controls');
   assert.equal(state.iframes,0,'No embedded reader or facsimile viewer');
   assert.equal(state.languageButtons,1,'There must be exactly one functional language button');
   assert.equal(state.languageLabel,'Idioma · ES','Default language button should show Spanish');
   assert.equal(state.body,'rgb(13, 13, 14)','Use Lexicon black');
   assert.equal(state.button,'rgb(62, 62, 63)','Gray button stroke consistent with Lexicon');
   const controlAppearance=await p.evaluate(()=>Object.fromEntries(
    ['.searchform','.searchform button','#language-toggle','#classic-work'].map(selector=>{
     const style=getComputedStyle(document.querySelector(selector));
     return [selector,{radius:style.borderRadius,stroke:style.borderColor}];
    })
   ));
   const expected={
    '.searchform':{radius:'9px',stroke:'rgb(55, 55, 55)'},
    '.searchform button':{radius:'7px',stroke:'rgb(62, 62, 63)'},
    '#language-toggle':{radius:'7px',stroke:'rgb(65, 65, 65)'},
    '#classic-work':{radius:'7px',stroke:'rgb(65, 65, 65)'}
   };
   for(const [selector,style] of Object.entries(controlAppearance)){
    assert.deepEqual(style,expected[selector],'Subtle gray Lexicon control: '+selector);
   }
   await p.locator('#language-toggle').focus();
   assert.equal(await p.locator('#language-toggle').evaluate(e=>getComputedStyle(e).borderColor),
    'rgb(146, 146, 149)','The focused language control must visibly acknowledge the interaction');
   assert.match(state.coverage,/222|obras catalogadas/);
   const chronology=await p.locator('#classic-work option').evaluateAll(els=>els.map(e=>e.value));
   const positions=['homer-iliad','sophocles-oedipus','cicero-catilinariae','vitruvius']
    .map(id=>chronology.indexOf(id));
   assert(positions.every(x=>x>=0),'All four known ancient works must be in the catalogue');
   assert(positions.every((x,i)=>i===0||positions[i-1]<x),
    'Bibliotheca must order works by ancient composition, not modern editions');
   assert.equal(await p.locator('#capitula-nav').getAttribute('href'),'bibliotheca-capitula.html');
   await p.locator('#language-toggle').click();
   assert.equal(await p.locator('#search-submit').innerText(),'Search');
   assert.equal(await p.locator('#language-toggle').innerText(),'Language · EN');
   await p.locator('#language-toggle').click();
   assert.equal(await p.locator('#search-submit').innerText(),'Chercher');
   assert.equal(await p.locator('#language-toggle').innerText(),'Langue · FR');
   await p.locator('#language-toggle').click();
   assert.equal(await p.locator('#search-submit').innerText(),'Buscar');
   assert.equal(await p.locator('#language-toggle').innerText(),'Idioma · ES');
   assert.equal(await p.locator('#classic-work option').count(),state.books);
  }finally{await p.close()}
 });
 await check('Bibliotheca: logos in Latin characters finds documented Greek λόγος',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#classic-work option').length>=223,{timeout:28000});
   await p.locator('#classic-work').selectOption('aristotle-poetics');
   await p.locator('#classic-query').fill('logos');
   await p.locator('#search-submit').click();
   await p.waitForFunction(()=>[...document.querySelectorAll('#classic-results .hit mark')]
    .some(m=>/λόγο[ςσ]/u.test(m.textContent||'')),{timeout:20000});
   assert.match(await p.locator('#search-status').innerText(),/Transliteración griega documentada: λόγος/);
   assert.equal(await p.locator('#classic-results .hit[lang="el"]').count()>0,true,
    'Romanized logos must recover Greek textual loci, not invented semantic matches');
   const visual=await p.locator('#classic-results .hit mark').first().evaluate(el=>{
    const css=getComputedStyle(el);return {decoration:css.textDecorationLine,background:css.backgroundColor};
   });
   assert.equal(visual.decoration,'none','Searched word must not be underlined');
   assert.equal(visual.background,'rgb(255, 227, 79)','Searched word must have yellow highlight');
   await p.locator('#classic-results .hit mark.lexical-hit').first().click();
   await p.locator('.bibliotheca-dictionary:not([hidden])').waitFor({state:'visible',timeout:10000});
   assert.equal(await p.locator('.dictionary-actions .passage-action').count(),4,
    'Dictionary must offer Lexicon, PDF, Mail and WhatsApp');
   assert.match(await p.locator('.hit .passage-link').first().getAttribute('href'),
    /classics-text-reader\.html\?work=aristotle-poetics/,'Concordance must open its real cited reader');
  }finally{await p.close()}
 });
 await check('Bibliotheca concordance: actual Latin term, full black-background paragraph and Lexicon query link',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#classic-work option').length>200,{timeout:28000});
   await p.locator('#classic-work').selectOption('catullus-carmina');
   await p.locator('#classic-query').fill('Viuamus');
   await p.locator('#search-submit').click();
   await p.waitForFunction(()=>document.querySelectorAll('.hit').length>0,{timeout:65000});
   assert.match(await p.locator('.group h3').first().innerText(),/Carmina/i);
   assert.match(await p.locator('.hit .locus').first().innerText(),/Locus/);
   assert.match(await p.locator('.hit p').first().innerText(),/Viuamus/i);
   assert((await p.locator('.hit p').first().evaluate(e=>getComputedStyle(e).color))==='rgb(255, 255, 255)');
   const href=await p.locator('#lexicon-link').getAttribute('href');
   assert.match(href,/vitruvia-lexicon\.html\?q=Viuamus&mode=palabra/);
   assert.match(await p.locator('#search-status').innerText(),/apariciones/);
   assert.match(await p.locator('#unindexed').innerText(),/no examinadas/);
   assert.equal(await p.locator('iframe').count(),0);
  }finally{await p.close()}
 });
 await check('Documented semantic retrieval finds real Greek and Latin passages for the concept casa',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  try{
   await p.waitForFunction(()=>typeof window.ClassicsCorpusSearch?.semanticSearch==='function',{timeout:20000});
   const rows=await p.evaluate(()=>window.ClassicsCorpusSearch.semanticSearch('casa',{limit:12}));
   assert(rows.length>0,'Conceptus casa must match attested indexed Greek or Latin forms');
   assert(rows.every(x=>['la','grc'].includes(x.language)),
    'Conceptus casa must return only attested Greek and Latin passages, not unindexed translations');
   assert(rows.some(x=>x.language==='la'),'Latin equivalents of casa must be searchable');
   assert(rows.some(x=>x.language==='grc'),'Greek equivalents of casa must be searchable');
   assert(rows.every(x=>/CORRESPONDENCIA SEMÁNTICA EDITORIAL/.test(x.meta)));
   assert(rows.every(x=>/Locus /.test(x.excerpt)&&/locus=|#/.test(x.link)),
    'Every semantic result must refer to an actual source locus or text fragment');
  }finally{await p.close()}
 });
  await check('Vitruvia and Lexicon retrieve real Greek/Latin Conceptus loci using the indexed corpus',async()=>{
  for(const target of ['vitruvia.html','vitruvia-lexicon.html']){
   const p=await open(target);
   try{
    await p.waitForFunction(()=>typeof window.ClassicsCorpusSearch?.semanticSearch==='function',{timeout:25000});
    const found=await p.evaluate(async()=>{
     const api=window.ClassicsCorpusSearch;
     const rows=await api.semanticSearch('casa',{limit:20});
     return {rows,diagnostics:api.diagnostics()};
    });
    assert(found.rows.some(r=>r.language==='la'&&r.link),'Latin source locus missing in '+target);
    assert(found.rows.some(r=>r.language==='grc'&&r.link),'Greek source locus missing in '+target);
    assert(found.rows.every(r=>r.kind==='classic-text'&&r.link&&/locus=|#:~:text=|#/.test(r.link)),
     'Semantic results must link to actual attested sources in '+target);
    assert.equal(found.diagnostics.failed,0,'Failed classical source load in '+target);
    assert.equal(found.diagnostics.staticIndexUsed,true,'Conceptus index must accelerate '+target);
   }finally{await p.close()}
  }
 });
await check('Shared Latin originals reuse Lexicon sources; Pliny is explicitly partial',async()=>{
  for(const [work,unit,term] of [
   ['varro-rustica',97,'1.1'],
   ['frontinus',130,'1'],
   ['pliny',745,'33.1']
  ]){
   const page=await open('classics-text-reader.html?work='+work+'&lang=la&locus='+term);
   try{
    await page.waitForFunction(expected=>document.querySelector('#source-title')?.textContent?.includes(expected+' unidades textuales'),unit,{timeout:25000});
    assert((await page.locator('#passages').innerText()).trim().length>40,'No Latin passage for '+work);
    if(work==='pliny')assert.match(await page.locator('#method-note').innerText(),/PARCIAL|parcial|XXXIII.*XXXVI|33.*36/,'Pliny must visibly declare partial coverage');
   }finally{await page.close()}
  }
  // Preserve the historical Spanish translation without offering it as a
  // general-library edition; Spanish and French remain for Vitruvius only.
  const archived=JSON.parse(fs.readFileSync('data/classics-corpus/apuleius-metamorphoses-es.json','utf8'));
  assert.equal(archived.language,'es');
  assert.equal(archived.passages.length,312,'Do not delete archived Apuleius passages');
  const page=await open('classics-text-reader.html?work=apuleius-metamorphoses&lang=es');
  try{
   await page.waitForFunction(()=>document.querySelector('#source-title')?.textContent?.includes('unidades textuales'),null,{timeout:25000});
   assert.equal(await page.locator('#language option[value="es"]').count(),1,'La traducción histórica acreditada debe estar disponible');
   assert.equal(await page.locator('#language').inputValue(),'es','La edición castellana solicitada debe poder leerse');
   assert.match(await page.locator('#method-note').innerText(),/no hay alineación|sin recortar|alineación/i,'El lector debe declarar la limitación de correspondencias');
  }finally{await page.close()}
 });
 await check('Full-text registry searches Catullus poetry, Lucretius and English translations',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  try{
   await p.waitForFunction(()=>!!window.ClassicsCorpusSearch&&!!document.querySelector('#classic-query'),{timeout:20000});
   const check=await p.evaluate(async()=>{
    const api=window.ClassicsCorpusSearch;
    const manifest=await api.registry();
    const catullus=await api.search('Viuamus',{limit:24});
    const lucretius=await api.search('Aeneadum',{limit:24});
    const translation=await api.search('William Adlington',{limit:24});
    return {
     total:manifest.length,
     offsite:manifest.filter(e=>e.format==='remote-json-passages').map(e=>e.workId),
     catullus:catullus.find(r=>r.workId==='catullus-carmina'&&r.language==='la')?.link||'',
     lucretius:lucretius.find(r=>r.workId==='lucretius'&&r.language==='la')?.link||'',
     translation:translation.find(r=>r.workId==='apuleius-metamorphoses'&&r.language==='en')?.link||'',
     diagnostics:api.diagnostics()
    };
   });
   const expected=JSON.parse(fs.readFileSync('data/classics-corpus/search-registry.json','utf8'));
   // Bibliotheca intentionally shows Greek/Latin originals and English,
   // except Vitruvius, whose Spanish/French editions remain visible.
   // The shared source registry remains complete for Vitruvia and Lexicon.
   const publicEditions=expected.entries.filter(e=>e.workId==='vitruvius'||['la','grc','en'].includes(e.language));
   assert.equal(check.total,publicEditions.length+check.offsite.length,
    'The public edition count must include separately verified remote Greek originals');
   assert.ok(check.offsite.length>=14,'At least 14 verified Greek TEI originals must be accessible outside Pages');
   assert.ok(check.offsite.includes('euclid-phaenomena'),'Euclid Phaenomena must be accessible as a verified Greek TEI edition');
   assert.equal(expected.count,expected.entries.length,'Registry declared count must match entries');
   assert.match(check.catullus,/corpus\/catullus-carmina-la\.html\?q=/,'Catullus verses are not indexed');
   assert.match(check.lucretius,/corpus\/lucretius-de-rerum-natura-la\.html\?q=/,'Lucretius Latin poem not indexed');
   assert.match(check.translation,/classics-text-reader\.html\?work=apuleius-metamorphoses&lang=en/,'English version not indexed');
   assert.equal(check.diagnostics.failed,0,'A registered text failed to load');
  }finally{await p.close()}
 });
 await check('Vitruvius original and three translations are searchable by structured locus',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  try{
   await p.waitForFunction(()=>typeof window.ClassicsCorpusSearch?.search==='function',{timeout:20000});
   const result=await p.evaluate(async()=>{
    const registry=await window.ClassicsCorpusSearch.registry();
    const structured=registry.filter(e=>e.workId==='vitruvius'&&e.format==='structured-bilingual');
    const italian=await window.ClassicsCorpusSearch.search('imperator Caesar',{limit:40});
    return {structured:structured.map(e=>e.language),latin:italian.find(x=>x.workId==='vitruvius'&&x.language==='la')?.link||'',
     indexStatus:window.ClassicsCorpusSearch.diagnostics()};
   });
   assert.deepEqual(result.structured.sort(),['en','es','fr','la']);
   assert.match(result.latin,/lector-bilingue\.html\?edition=recensio-es.*locus=/,
     'Vitruvius Latin locus must open its existing bilingual reader');
   assert.equal(result.indexStatus.failed,0,'All structured classical texts should load');
  }finally{await p.close()}
 });
 await check('Public classical corpus audit lists all works and distinguishes indexed originals from PDF records',async()=>{
  const p=await open('auditoria-textos-clasicos.html');
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#audit-rows tr').length>=221,null,{timeout:20000});
   assert.equal(await p.locator('#audit-rows tr').count(),JSON.parse(fs.readFileSync('data/bibliotheca-graeca-latina-I-bce-I-ce.json','utf8')).works.length,'Incomplete catalogue audit');
   await p.locator('#audit-filter').selectOption('indexed');
   const expectedIndex=JSON.parse(fs.readFileSync('data/classics-corpus/search-registry.json','utf8'));
   assert.equal(await p.locator('#audit-rows tr').count(),expectedIndex.works,'Indexed classical works should be distinct from language versions');
   await p.locator('#audit-filter').selectOption('local');
   assert.equal(await p.locator('#audit-rows tr').count(),JSON.parse(fs.readFileSync('data/classics-corpus/coverage-audit.json','utf8')).counts.locallyReadableClaims,'Local catalogue entries should remain distinguishable from PDF-only holdings');
   await p.locator('#audit-query').fill('cicero-officiis');
   assert.equal(await p.locator('#audit-rows tr').count(),1,'Direct work identifiers must be searchable');
  }finally{await p.close()}
 });
 await check('Theophrastus Greek text: word search highlights in yellow and the dictionary answers',async()=>{
  const p=await open('classics-text-reader.html?work=theophrastus-characters&q='+encodeURIComponent('κολακ'));
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#passages mark.cl-hit').length>=3,{timeout:20000});
   const bg=await p.locator('#passages mark.cl-hit').first().evaluate(m=>getComputedStyle(m).backgroundColor);
   assert.match(bg,/rgb\(255, (2[0-9]{2}|18[0-9]), /,'el resaltado no es amarillo: '+bg);
   await p.locator('#passages mark.cl-hit').first().click();
   await p.waitForFunction(()=>/κολακεία/.test(document.querySelector('#lexicon')?.textContent||'')&&/flattery/.test(document.querySelector('#lexicon')?.textContent||''),{timeout:20000});
  }finally{await p.close()}
 });
 await check('Latin text: Caesar word search and Lewis & Short dictionary',async()=>{
  const p=await open('classics-text-reader.html?work=caesar-gallico&q=virtute');
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#passages mark.cl-hit').length>=1,{timeout:20000});
   await p.locator('#passages mark.cl-hit').first().click();
   await p.waitForFunction(()=>/virt[uū]s/.test(document.querySelector('#lexicon')?.textContent||''),{timeout:20000});
  }finally{await p.close()}
 });
 await check('Collation by locus: Rose y Krohn con OCR declarado como no cotejado',async()=>{
  const p=await open('colacion.html?locus=1.3.2');
  try{
   await p.waitForFunction(()=>document.querySelector('#coll-body .coll-base')?.textContent?.includes('V514')&&
    document.querySelector('#coll-body .coll-witnesses')?.textContent?.includes('Rose 1899'),{timeout:20000});
   const content=await p.locator('#coll-body').innerText();
   assert.match(content,/I\.3\.2/);
   assert.match(content,/Rose 1899/);
   assert.match(content,/Krohn 1912/);
   assert.match(content,/OCR no validado/);
   assert.ok(await p.locator('#coll-body .coll-witnesses a').count()>=2,'Se conservan ambos facsímiles externos');
  }finally{await p.close()}
 });
 await check('Indices locorum group Latin forms by lemma (symmetria)',async()=>{
  const p=await open('indices-locorum.html?q=symmetri');
  try{await p.waitForFunction(()=>{const h=[...document.querySelectorAll('.index-row h3')].map(x=>x.textContent);return h.length===1&&h[0]==='symmetria'},{timeout:20000})}finally{await p.close()}
 });
 await check('Vitruvia: Cicero biography first, Latin Vitruvius passages second',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route(/https:\/\/(?:es|en)\.wikipedia\.org\/w\/api\.php/,async route=>{
   const req=new URL(route.request().url()),en=req.hostname.startsWith("en.");
   const id=en?135791:246802;
   const payload=req.searchParams.get("list")==="search"?
    {query:{search:[{pageid:id,title:en?"Cicero":"Cicerón",snippet:"Biografía histórica documentada de prueba.",wordcount:1100}]}}:
    req.searchParams.get("prop")==="pageimages"?
     {query:{pages:{[id]:{pageid:id,title:en?"Cicero":"Cicerón"}}}}:
     {query:{pages:{[id]:{pageid:id,title:en?"Cicero":"Cicerón",
       extract:"Biografía de prueba para verificar el orden del artículo.\n\n== Trayectoria histórica ==\nSegundo párrafo biográfico de prueba con documentación.\n\n== Obras ==\nTercer párrafo sobre obras, sin inventar hechos en producción.",
       fullurl:"https://es.wikipedia.org/wiki/Cicer%C3%B3n"}}}};
   await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},
     body:JSON.stringify(payload)});
  });
  try{
   const res=await page.goto(base+'vitruvia.html?q=Cicer%C3%B3n&mode=site',
      {waitUntil:'domcontentloaded',timeout:40000});
   assert.equal(res?.status(),200);
   // El encabezado editorial cambió a «Dossier de investigación»; lo que se verifica es el orden:
   // primero la biografía y después los pasajes documentados de Vitruvio.
   await page.waitForFunction(()=>/BIOGRAF|Dossier/i.test(document.querySelector('#article-kicker')?.textContent||''),
    {timeout:20000});
   const LOCI=/Pasajes de Vitruvio|Coincidencias documentadas en el tratado de Vitruvio/;
   await page.waitForFunction(()=>document.querySelector('#article-body')?.textContent.includes('Biografía de prueba')&&
    /Pasajes de Vitruvio|Coincidencias documentadas en el tratado de Vitruvio/.test(document.querySelector('#article-body')?.textContent||''),{timeout:20000});
   const text=await page.locator('#article-body').innerText();
   assert(text.indexOf('Biografía de prueba')<text.search(LOCI),
    'The biography must precede the relevant Vitruvius passages');
   assert.match(await page.locator('#article-title').innerText(),/Cicerón/);
   const passages=await page.locator('.person-locus-entry').count();
   console.log('CICERO VERIFIED LOCI',passages);
   assert(passages>=1,'No verified Vitruvian passage was recovered for Cicero');
  }finally{await page.close()}
 });

 await check('Parallel reader buttons, independent colors, zoom and synchronized chapter navigation',async()=>{
  const p=await open('classics-parallel-reader.html?work=didache&left=grc&right=en');
  try{
   await p.waitForFunction(()=>{
    const l=document.getElementById('pane-left'),r=document.getElementById('pane-right');
    return l?.contentDocument?.getElementById('current-locus')?.textContent?.includes('1') &&
      r?.contentDocument?.getElementById('current-locus')?.textContent?.includes('1') &&
      !document.getElementById('sync-next')?.disabled;
   },null,{timeout:30000});
   const old=await p.frameLocator('#pane-left').locator('#current-locus').innerText();
   await p.locator('#sync-next').click();
   await p.waitForFunction((previous)=>{
    const l=document.getElementById('pane-left')?.contentDocument?.getElementById('current-locus')?.textContent;
    const r=document.getElementById('pane-right')?.contentDocument?.getElementById('current-locus')?.textContent;
    return l&&r&&l!==previous&&/^Capítulo|^Unidad|^Chapter|^Locus/i.test(l)?true:!!(l&&r&&l!==previous&&document.getElementById('sync-position')?.textContent?.startsWith('2 /'));
   },old,{timeout:12000});
   assert((await p.locator('#sync-position').innerText()).startsWith('2 / '),'Forward sync did not advance');
   await p.locator('#sync-start').click();
   assert((await p.locator('#sync-position').innerText()).startsWith('1 / '),'Return to beginning failed');
   await p.locator('#left-night').click();
   await p.waitForFunction(()=>document.getElementById('pane-left')?.contentDocument?.querySelector('.reader')?.style.backgroundColor==='rgb(23, 38, 51)',{timeout:7000});
   await p.locator('#left-invert').click();
   assert.notEqual(await p.locator('#left-bg').inputValue(),'#172633','Invert colors button does not change the background');
   await p.locator('#right-larger').click();
   assert.equal(await p.locator('#right-size').innerText(),'22 px','Right zoom button did not update');
   await p.locator('#left-font').selectOption('sans');
   assert.equal(await p.locator('#left-font').inputValue(),'sans');
   await p.locator('#right-sepia').click();
   assert.equal(await p.locator('#right-bg').inputValue(),'#e6d5b7','Right palette did not update independently');
   await p.locator('#sync-prev').count();
  }finally{await p.close()}
 });
 await check('Papyrology image upload, magnifiers, colors, contrast and character editor',async()=>{
  const p=await open('papyrologia-ostraca.html');
  try{
   const image=await p.evaluate(()=>{
    const c=document.createElement('canvas');c.width=320;c.height=140;
    const ctx=c.getContext('2d');ctx.fillStyle='#e8d6ae';ctx.fillRect(0,0,320,140);
    ctx.fillStyle='#343026';ctx.font='34px Georgia';ctx.fillText('ΑΒΓ LAT',22,72);
    return c.toDataURL('image/png').split(',')[1];
   });
   assert.equal(await p.locator('#pap-ink-canvas').isVisible(),false,'Blank extracted image should not occupy page space');
   assert.equal(await p.locator('#pap-detail').isVisible(),false,'Detail should stay collapsed below the ostracon until opened');
   assert.equal(await p.locator('#pap-extraction-fold').evaluate(el=>el.open),false,'Advanced extraction must start collapsed');
   // User drop populates the same file input used by extraction.
   await p.evaluate(base64=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),dt=new DataTransfer();
    dt.items.add(new File([bytes],'fragment.png',{type:'image/png'}));
    const target=document.getElementById('pap-stage');
    target.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:dt}));
    if(!target.classList.contains('pap-drag-over'))throw new Error('Drop highlight missing');
    target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));
    target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
   },image);
   await p.waitForFunction(()=>document.getElementById('pap-status')?.textContent.includes('fragment.png'),null,{timeout:8000});
   assert.equal(await p.locator('#pap-file').evaluate(el=>el.files?.[0]?.name),'fragment.png','Drop upload missing in file input');
   assert.equal(await p.locator('#pap-stage').evaluate(el=>el.classList.contains('pap-drag-over')),false,'Drop overlay persisted');

   await p.waitForFunction(()=>!document.getElementById('pap-ocr').disabled,{timeout:8000});
   await p.locator('#pap-tone-exposure').evaluate(el=>{el.value='30';el.dispatchEvent(new Event('input',{bubbles:true}))});
   assert.equal(await p.locator('#pap-tone-exposure-value').innerText(),'30','Exposure slider is inert');
   await p.locator('#pap-tone-highlights').evaluate(el=>{el.value='-25';el.dispatchEvent(new Event('input',{bubbles:true}))});
   assert.equal(await p.locator('#pap-tone-highlights-value').innerText(),'-25','Highlights slider is inert');
   await p.locator('#pap-tone-papyrus').click();
   assert.equal(await p.locator('#pap-tone-shadows-value').innerText(),'35','Ink preset did not update shadows');
   await p.locator('#pap-tone-original').click();
   assert.equal(await p.locator('#pap-tone-original').getAttribute('aria-pressed'),'true','Original comparison is inert');
   await p.locator('#pap-tone-original').click();
   await p.locator('#pap-tone-reset').click();
   assert.equal(await p.locator('#pap-tone-gamma-value').innerText(),'1,00','Tonal reset did not reset gamma');
   await p.locator('#pap-light-level').click();
   assert.equal(await p.locator('#pap-light-level').getAttribute('aria-pressed'),'true','Light normalization button failed');
   await p.locator('#pap-black-extract').click();
   assert.equal(await p.locator('#pap-black-extract').getAttribute('aria-pressed'),'true','Black extraction button failed');
   const inkPixels=await p.locator('#pap-image').evaluate(c=>{
    const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let black=0,white=0,other=0;
    for(let k=0;k<a.length;k+=4){if(a[k]===0&&a[k+1]===0&&a[k+2]===0)black++;else if(a[k]===255&&a[k+1]===255&&a[k+2]===255)white++;else other++}
    return {black,white,other};
   });
   assert(inkPixels.black>0&&inkPixels.white>0&&inkPixels.other===0,'Black-only result must contain black and white pixels');
   await p.locator('#pap-black-level-reset').click();
   assert.equal(await p.locator('#pap-black-extract').getAttribute('aria-pressed'),'false');
   const initial=await p.locator('#pap-zoom-value').innerText();
   await p.locator('#pap-zoom-in').click();
   assert.notEqual(await p.locator('#pap-zoom-value').innerText(),initial,'Zoom button is inert');

   // The advanced extraction workshop is intentionally collapsed below the image.
   await p.locator('#pap-extraction-fold').evaluate(el=>{el.open=true});
   await p.locator('#pap-ink-papyrus').click();
   await p.locator('#pap-ink-run').click();
   await p.waitForFunction(()=>document.getElementById('pap-ink-canvas')?.width>100&&
    document.getElementById('pap-ink-status')?.textContent.includes('Máscara creada'),null,{timeout:12000});
   assert.equal(await p.locator('#pap-ink-canvas').isVisible(),true,'Extracted mask must appear after generation');
   assert.equal(await p.locator('#pap-ink-placeholder').isVisible(),false,'Initial ink placeholder must disappear after extraction');
   const blackOnWhite=await p.locator('#pap-ink-canvas').evaluate(c=>{
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let white=0,black=0;
    for(let i=0;i<d.length;i+=4){if(d[i]===255&&d[i+1]===255&&d[i+2]===255)white++;if(d[i]===0&&d[i+1]===0&&d[i+2]===0)black++}
    return {white,black};
   });
   assert(blackOnWhite.white>0&&blackOnWhite.black>0,'Ink extraction did not create black pixels on white');
   await p.locator('#pap-ink-alphabet').selectOption('grc');
   await p.locator('#pap-ink-segment').click();
   assert.match(await p.locator('#pap-ink-status').innerText(),/regiones oscuras aisladas/i);
   await p.locator('#pap-invert').click();
   assert.equal(await p.locator('#pap-invert').getAttribute('aria-pressed'),'true','Invert button is inert');
   await p.locator('#pap-saturation').evaluate(el=>{el.value='180';el.dispatchEvent(new Event('input',{bubbles:true}))});
   assert.equal(await p.locator('#pap-saturation-value').innerText(),'180 %','Saturation control is inert');
   await p.locator('#pap-loupe-mode').selectOption('rect');
   await p.locator('#pap-loupe-power').selectOption('8');
   await p.locator('#pap-image').hover();
   assert.equal(await p.locator('#pap-loupe').evaluate(el=>getComputedStyle(el).display),'block','Magnifier does not open');
   assert.equal(await p.locator('#pap-ocr-detail').isEnabled(),true,'Detail OCR is unavailable after upload');
   await p.locator('#pap-experimental-ocr').evaluate(el=>{el.open=true});
   await p.locator('#pap-ocr-lang').selectOption('heb');
   assert.equal(await p.locator('#pap-transcription').getAttribute('dir'),'rtl','Hebrew requires RTL transcription');
   assert.equal(await p.locator('#pap-transcription').getAttribute('lang'),'he');
   await p.locator('#pap-ocr-lang').selectOption('arc-heb');
   assert.equal(await p.locator('#pap-transcription').getAttribute('lang'),'arc','Aramaic metadata was not applied');
   assert.match(await p.locator('#pap-script-note').innerText(),/modelo heb/i);
   await p.locator('#pap-ocr-lang').selectOption('syr');
   assert.equal(await p.locator('#pap-transcription').getAttribute('dir'),'rtl');
   assert.equal(await p.locator('#pap-transcription').getAttribute('lang'),'syr');
   await p.locator('#pap-ocr-lang').selectOption('grc');
   assert.equal(await p.locator('#pap-transcription').getAttribute('dir'),'ltr');
   await p.locator('#pap-build-script').selectOption('phn');
   await p.locator('#pap-build-letter').fill('𐤀');
   await p.locator('#pap-build-add').click();
   await p.locator('#pap-build-letter').fill('𐤁');
   await p.locator('#pap-build-add').click();
   assert.match(await p.locator('#pap-build-word').innerText(),/𐤀𐤁/,'Letters were not assembled into a word');
   await p.locator('#pap-build-word-end').click();
   await p.locator('#pap-build-phrase-end').click();
   assert((await p.locator('#pap-build-sentences li').count())===1,'Word was not committed to a sentence');
   await p.locator('#pap-build-transcribe').click();
   assert.match(await p.locator('#pap-transcription').inputValue(),/𐤀𐤁/,'Sentence was not transferred to transcription');
   await p.locator('#pap-transcription').fill('');
   const geminiFixture={
    schema:'vitruvia-papyrology-multimodal-draft-v1',verified:false,model:'test-offline',
    analysis:{writing_system_candidates:[{name:'Greek'}],language_candidates:[{name:'Ancient Greek'}],
     lines:[{line_number:1,diplomatic_text:'ΑΒΓ',reading_direction:'ltr',
       signs:[{visible:'Α',suggested:'Α',status:'clear',alternatives:[]},
              {visible:'Β',suggested:'Β',status:'uncertain',alternatives:['Ρ']}]}]}
   };
   await p.locator('#pap-gemini-json').setInputFiles({
    name:'hypothesis.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(geminiFixture),'utf8')
   });
   await p.waitForFunction(()=>document.getElementById('pap-gemini-import-report')?.textContent.includes('NO VERIFICADA'));
   assert.match(await p.locator('#pap-transcription').inputValue(),/ΑΒΓ/,'Gemini JSON reader did not populate transcript');
   assert.match(await p.locator('#pap-gemini-import-report').innerText(),/dudosos o perdidos: 1/i);
   await p.locator('#pap-transcription').fill('ΑΒΓ');
   assert.equal(await p.locator('#pap-graphemes button').count(),3,'Individual character editor failed');
   await p.locator('#pap-clear').click();
   assert.equal(await p.locator('#pap-transcription').inputValue(),'','Clear transcription button is inert');
  }finally{await p.close()}
 });
}finally{if(browser)await browser.close();server.kill()}
if(failed){console.error('CLASSICAL VIEWER CHECK FAILURES',failed);process.exitCode=1}
else console.log('CLASSICAL VIEWER CHECKS: ALL PASS');
