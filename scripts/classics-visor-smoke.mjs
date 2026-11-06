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
   await p.waitForFunction(()=>document.querySelectorAll('#audit-rows tr').length>=221,{timeout:20000});
   assert.equal(await p.locator('#audit-rows tr').count(),221,'Incomplete catalogue audit');
   await p.locator('#audit-filter').selectOption('indexed');
   const expectedIndex=JSON.parse(fs.readFileSync('data/classics-corpus/search-registry.json','utf8'));
   assert.equal(await p.locator('#audit-rows tr').count(),expectedIndex.works,'Indexed classical works should be distinct from language versions');
   await p.locator('#audit-filter').selectOption('local');
   assert.equal(await p.locator('#audit-rows tr').count(),20,'Local catalogue entries should remain distinguishable from PDF-only holdings');
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
}finally{if(browser)await browser.close();server.kill()}
if(failed){console.error('CLASSICAL VIEWER CHECK FAILURES',failed);process.exitCode=1}
else console.log('CLASSICAL VIEWER CHECKS: ALL PASS');
