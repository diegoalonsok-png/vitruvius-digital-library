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
 await check('Bibliotheca monochrome Lexicon design preserves all catalogue dropdowns and filtering',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#classic-list button').length>=190,{timeout:26000});
   const before=await p.evaluate(()=>{
    const options=id=>[...document.getElementById(id).options].map(o=>o.value);
    const rgb=sel=>getComputedStyle(document.querySelector(sel)).backgroundColor;
    return {
     cssLoaded:!!document.querySelector('link[href*="bibliotheca-monochrome.css"]'),
     body:rgb('body'),hero:rgb('.classic-head'),controls:rgb('.classic-controls'),
     list:rgb('#classic-list'),detail:rgb('#classic-detail'),
     options:{
      'classic-ui-language':options('classic-ui-language'),
      'classic-language':options('classic-language'),
      'classic-genre':options('classic-genre'),
      'classic-availability':options('classic-availability'),
      'classic-period':options('classic-period'),
      'classic-sort':options('classic-sort')
     },
     visible:document.querySelectorAll('#classic-list button').length
    };
   });
   assert(before.cssLoaded,'Bibliotheca monochrome stylesheet must be loaded');
   assert.equal(before.body,'rgb(13, 13, 14)','Page background must match Lexicon black');
   assert.equal(before.controls,'rgb(21, 21, 22)','Filters must use dark charcoal');
   assert.equal(before.list,'rgb(21, 21, 22)','Catalogue sidebar must use dark charcoal');
   assert.equal(before.detail,'rgb(21, 21, 22)','Work detail must use dark charcoal');
   assert.deepEqual(before.options['classic-ui-language'],['es','en','fr','it','de','pt']);
   assert.deepEqual(before.options['classic-language'],['','la','grc']);
   assert.deepEqual(before.options['classic-availability'],['','local','source','catalogue']);
   assert.deepEqual(before.options['classic-period'],['','focus']);
   assert.deepEqual(before.options['classic-sort'],['relevance','witness','author']);
   assert(before.options['classic-genre'].length>=2,'Genre filter options must still be populated');
   await p.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
   const afterTheme=await p.evaluate(()=>({
    body:getComputedStyle(document.body).backgroundColor,
    controls:getComputedStyle(document.querySelector('.classic-controls')).backgroundColor,
    list:getComputedStyle(document.getElementById('classic-list')).backgroundColor,
    detail:getComputedStyle(document.getElementById('classic-detail')).backgroundColor
   }));
   for(const [name,shade] of Object.entries(afterTheme))
    assert.equal(shade,name==='body'?'rgb(13, 13, 14)':'rgb(21, 21, 22)',
     'Saved dark-theme overrides must not restore navy on '+name);
   await p.locator('#classic-language').selectOption('la');
   await p.waitForFunction(n=>{
    const count=document.querySelectorAll('#classic-list button').length;
    return count>0&&count<n;
   },before.visible,{timeout:14000});
   assert.equal(await p.locator('#classic-language').inputValue(),'la');
   await p.locator('#classic-language').selectOption('');
   await p.waitForFunction(n=>document.querySelectorAll('#classic-list button').length===n,
    before.visible,{timeout:14000});
  }finally{await p.close()}
 });
 await check('Unified Bibliotheca book index is fast, grouped, searchable and includes both Perrault editions',async()=>{
  const p=await open('bibliotheca-graeca-latina.html');
  try{
   await p.waitForFunction(()=>document.querySelectorAll('#classic-list button').length>=190,{timeout:29000});
   await p.locator('#classic-query').focus();
   await p.waitForFunction(()=>!document.querySelector('#classic-search-suggestions').hidden,{timeout:9000});
   const overview=await p.evaluate(()=>{
    const options=[...document.querySelectorAll('#classic-search-suggestions button[role=option]')];
    return {
     number:options.length,groupCount:document.querySelectorAll('.classic-suggestion-group').length,
     more:document.querySelectorAll('.classic-suggestion-more:not([hidden])').length,
     summary:document.querySelector('.classic-suggestions-heading')?.textContent||'',
     perrault:[...options].filter(x=>x.textContent.includes('Perrault')).length
    };
   });
   assert(overview.number<=80,'Index must not render hundreds of entries on first focus');
   assert(overview.groupCount>=4,'Index must distinguish author, historical, classical and codex groups');
   assert(overview.more>=1,'A show-more control must retain access to the rest of the catalogue');
   assert(/títulos y testimonios/.test(overview.summary),'Index must disclose total match count');
   await p.locator('#classic-query').fill('Perrault');
   await p.waitForFunction(()=>[...document.querySelectorAll('#classic-search-suggestions button[role=option]')].filter(x=>x.textContent.includes('Perrault')).length>=2,{timeout:15000});
   const perrault=await p.evaluate(()=>[...document.querySelectorAll('#classic-search-suggestions button[role=option]')].filter(x=>x.textContent.includes('Perrault')).map(x=>x.textContent));
   assert(perrault.some(x=>x.includes('1673')),'Perrault first edition must appear');
   assert(perrault.some(x=>x.includes('1684')),'Perrault second edition must appear');
   await p.locator('#classic-query').fill('Krohn');
   await p.waitForFunction(()=>document.querySelector('#classic-search-suggestions')?.textContent?.includes('Krohn'),{timeout:10000});
   assert(await p.locator('#classic-search-suggestions').innerText().then(x=>x.includes('1912')),'Krohn historical edition must remain findable');
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
   assert(initial.src.includes('https://'),'First facsimile image must be obtained from e-rara');
   assert(initial.counter.startsWith('1 / '),'Initial digital page must be image 1');
   await p.locator('#pr-next').click();
   await p.waitForFunction(()=>document.getElementById('pr-counter').textContent.startsWith('2 /'),{timeout:12000});
   const second=await p.locator('#pr-image').getAttribute('src');
   assert.notEqual(second,initial.src,'Next must request a different actual IIIF canvas');
   await p.locator('#pr-prev').click();
   assert((await p.locator('#pr-counter').innerText()).startsWith('1 /'),'Previous must return to image 1');
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
  }finally{await p.close()}
 });
 await check('Classical catalogue renders its list and the requested work before viewer tests',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=aristotle-poetics&view=pdf');
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.waitForFunction(()=>{const counter=document.querySelector('#classic-count');return Number.parseInt(counter?.textContent||'',10)>=190&&document.querySelectorAll('#classic-list button').length>=190;},{timeout:20000});
   assert.equal(errors.length,0,'Runtime JavaScript error: '+errors.join('; '));
   await p.locator('.classic-tabstrip').waitFor({timeout:15000});
   assert.match(await p.locator('#classic-detail').innerText(),/Po[eé]tica|Περὶ ποιητικῆς|Poetics/i);
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
 await check('Apuleius Spanish reader labels anthology scope without deleting text',async()=>{
  const p=await open('classics-text-reader.html?work=apuleius-metamorphoses&lang=es');
  try{
   await p.waitForFunction(()=>document.querySelector('#method-note')?.textContent?.includes('antología'),null,{timeout:25000});
   const text=await p.locator('#method-note').innerText();
   assert.match(text,/t22.?t245|narración de Metamorfosis/,'Apuleius anthology must identify editorial core');
   assert.match(text,/conserva|conservan/i,'Unrelated source sections must not be suppressed');
   assert.match(text,/no hay alineación|No hay alineación|no existe correspondencia|No existe correspondencia/);
   assert.match(await p.locator('#source-title').innerText(),/312 unidades textuales/);
  }finally{await p.close()}
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
     catullus:catullus.find(r=>r.workId==='catullus-carmina'&&r.language==='la')?.link||'',
     lucretius:lucretius.find(r=>r.workId==='lucretius'&&r.language==='la')?.link||'',
     translation:translation.find(r=>r.workId==='apuleius-metamorphoses'&&r.language==='en')?.link||'',
     diagnostics:api.diagnostics()
    };
   });
   const expected=JSON.parse(fs.readFileSync('data/classics-corpus/search-registry.json','utf8'));
   assert.equal(check.total,expected.entries.length,'Indexed text count must match the actual corpus registry');
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
 await check('Aristotle Poetics defaults to verified 68-page Greek original',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=aristotle-poetics&view=pdf');
  try{
   await p.locator('#classic-panel .classical-pdf-toolbar, #classic-panel .classical-native-pdf').first().waitFor({timeout:25000});
   await p.waitForFunction(()=>document.querySelector('.classical-pdf-total')?.textContent?.includes('68')||
    !!document.querySelector('iframe.classical-native-pdf'),{timeout:25000});
   assert.match(await p.locator('#classic-detail').innerText(),/1893/);
   if(await p.locator('.classical-pdf-total').count() && await p.locator('.classical-pdf-total').innerText()!=='/ —'){
    await p.locator('.classical-pdf-pager button').last().click();
    assert.equal(await p.locator('.classical-pdf-number').inputValue(),'2');
   }
  }finally{await p.close()}
 });
 await check('Virgil Aeneid PDF states Book I is partial; full text available in the reader',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=virgil-aeneid&view=pdf');
  try{
   await p.waitForFunction(()=>document.querySelector('#classic-detail')?.textContent?.includes('Solo libro I'),{timeout:20000});
   await p.waitForFunction(()=>document.querySelector('.classical-pdf-total')?.textContent?.includes('172')||
    !!document.querySelector('iframe.classical-native-pdf'),{timeout:30000});
   // El PDF histórico sigue declarado como parcial (solo libro I); la Eneida completa se lee en la transcripción del sitio.
   assert.match(await p.locator('#classic-detail').innerText(),/Solo libro I/);
   assert.ok(await p.locator('[data-tab="text"], button:has-text("transcripción")').count()>0,'falta la pestaña de transcripción completa');
  }finally{await p.close()}
 });
 await check('Virgil manuscript deep link selects Romanus Vat. lat. 3867',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=virgil-aeneid&view=manuscript&ms=vergil-romanus');
  try{
   await p.locator('.classical-ms-switch select').waitFor({timeout:15000});
   const ms=await p.locator('.classical-ms-switch select option:checked').innerText();
   assert.match(ms,/3867/);
   assert.match(await p.locator('.classical-manuscript-panel').innerText(),/Vat. lat. 3867/);
   assert((await p.locator('.classical-ms-frame').count())===1,'IIIF iframe missing');
  }finally{await p.close()}
 });
 await check('Cicero De officiis exposes 3-panel reader and historical PDF',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=cicero-officiis');
  try{
   await p.locator('.classic-tabstrip').waitFor({timeout:15000});
   const tabs=await p.locator('.classic-tabstrip').innerText();
   assert.match(tabs,/Tres visores/);
   assert.match(tabs,/PDF histórico/);
  }finally{await p.close()}
 });
 await check('Aristotle offers Greek original and historical English translation',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=aristotle-poetics&view=pdf');
  try{
   const select=p.locator('.classic-pdf-version-toolbar select');
   await select.waitFor({timeout:15000});
   assert.equal(await select.locator('option').count(),2);
   const labels=await select.locator('option').allInnerTexts();
   assert(labels.some(x=>x.includes('GRIEGO ORIGINAL')),'Greek original PDF missing');
   assert(labels.some(x=>x.includes('traducción inglesa')),'English PDF missing');
   await select.selectOption('1');
   assert((await p.url()).includes('aristotle-poetics-english-1819.pdf'),'Edition selection not reflected in URL');
   await p.locator('[data-tab="comparepdf"]').click();
   assert.equal(await p.locator('.classic-double-pdf iframe').count(),2);
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
 await check('Collation by locus: V514 against Rose 1899 shows the omission of «cum fuerit» at I.3.2',async()=>{
  const p=await open('colacion.html?locus=1.3.2');
  try{await p.waitForFunction(()=>/fuerit\s*\]\s*om\./.test(document.querySelector('#coll-body')?.textContent||''),{timeout:20000})}finally{await p.close()}
 });
 await check('Indices locorum group Latin forms by lemma (symmetria)',async()=>{
  const p=await open('indices-locorum.html?q=symmetri');
  try{await p.waitForFunction(()=>{const h=[...document.querySelectorAll('.index-row h3')].map(x=>x.textContent);return h.length===1&&h[0]==='symmetria'},{timeout:20000})}finally{await p.close()}
 });
 await check('Lucretius compares Latin original and translations with three independent readers',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=lucretius&view=pdf');
  try{
   const select=p.locator('.classic-pdf-version-toolbar select');
   await select.waitFor({timeout:15000});
   assert.equal(await select.locator('option').count(),2);
   assert((await select.locator('option').first().innerText()).includes('LATÍN ORIGINAL'));
   await p.locator('[data-tab="parallel"]').click();
   assert.equal(await p.locator('.classic-triple-reading iframe').count(),3);
   assert.equal(await p.locator('.classic-triple-reading select option').count(),2,'English and Spanish translation options are missing');
   assert.equal(await p.locator('[data-tab="text"]').count(),1,'Latin transcription tab is hidden');
  }finally{await p.close()}
 });
 await check('Virgil Georgics original Latin PDF is available locally',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=virgil-georgica&view=pdf');
  try{
   await p.waitForFunction(()=>document.querySelector('.classical-pdf-total')?.textContent.includes('76')||
    !!document.querySelector('.classical-native-pdf'),{timeout:25000});
   assert.match(await p.locator('#classic-detail').innerText(),/1849/);
   assert.match(await p.locator('.classic-detail-status').innerText(),/LECTURA EN VITRUVIA/);
  }finally{await p.close()}
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
 await check('Classical catalogue exposes real parallel-reading link for translated works',async()=>{
  const p=await open('bibliotheca-graeca-latina.html?work=didache');
  try{
   await p.locator('#classic-list button[data-id="didache"]').waitFor({timeout:25000});
   const detail=p.locator('#classic-detail');
   await detail.locator('a[href*="classics-parallel-reader.html?work=didache"]').first().waitFor({timeout:12000});
   assert.match(await detail.innerText(),/leer original y traducción lado a lado/i);
   await p.locator('#classic-query').fill('Séneca');
   await p.waitForTimeout(260);
   assert((await p.locator('#classic-list button').count())>0,'Debounced filter did not yield results');
   await p.locator('#classic-clear').click();
   await p.waitForTimeout(260);
   assert((await p.locator('#classic-list button').count())>190,'Clear search did not restore the catalogue');
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
   await p.locator('#pap-file').setInputFiles({name:'fragment.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
   await p.waitForFunction(()=>!document.getElementById('pap-ocr').disabled,{timeout:8000});
   const initial=await p.locator('#pap-zoom-value').innerText();
   await p.locator('#pap-zoom-in').click();
   assert.notEqual(await p.locator('#pap-zoom-value').innerText(),initial,'Zoom button is inert');
   await p.locator('#pap-invert').click();
   assert.equal(await p.locator('#pap-invert').getAttribute('aria-pressed'),'true','Invert button is inert');
   await p.locator('#pap-saturation').fill('180');
   assert.equal(await p.locator('#pap-saturation-value').innerText(),'180 %','Saturation control is inert');
   await p.locator('#pap-loupe-mode').selectOption('rect');
   await p.locator('#pap-loupe-power').selectOption('8');
   await p.locator('#pap-image').hover();
   assert.equal(await p.locator('#pap-loupe').evaluate(el=>getComputedStyle(el).display),'block','Magnifier does not open');
   assert.equal(await p.locator('#pap-ocr-detail').isEnabled(),true,'Detail OCR is unavailable after upload');
   await p.locator('#pap-transcription').fill('ΑΒΓ');
   assert.equal(await p.locator('#pap-graphemes button').count(),3,'Individual character editor failed');
   await p.locator('#pap-clear').click();
   assert.equal(await p.locator('#pap-transcription').inputValue(),'','Clear transcription button is inert');
  }finally{await p.close()}
 });
}finally{if(browser)await browser.close();server.kill()}
if(failed){console.error('CLASSICAL VIEWER CHECK FAILURES',failed);process.exitCode=1}
else console.log('CLASSICAL VIEWER CHECKS: ALL PASS');
