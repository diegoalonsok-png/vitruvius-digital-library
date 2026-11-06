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
