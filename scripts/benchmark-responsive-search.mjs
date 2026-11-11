/* CI browser regression. Measurements are synthetic, not real-user telemetry. */
import {chromium} from 'playwright';
mkdirSync('reports',{recursive:true});
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.SEARCH_AUDIT_BASE||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true});
const report={date:new Date().toISOString(),base,method:'Fresh Chromium contexts; local HTTP server; external encyclopedia latency remains variable',vitruvia:[],lexicon:[],bibliotheca:[],errors:[]};
try{
 for(const q of ['domus','numen','symmetria']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  const errors=[],images=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.resourceType()==='image'&&!r.url().startsWith(base))images.push(r.url())});
  const start=Date.now();
  await page.goto(base+'vitruvia.html?q='+q+'&mode=all',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#result-list .result-card',{timeout:12000});
  const firstMs=Date.now()-start;
  await page.waitForTimeout(500);
  const timing=await page.locator('#result-state').getAttribute('data-first-result-ms');
  assert.equal(images.length,0,'Ordinary search must not request external photographs');
  assert.equal(errors.length,0,errors.join('\n'));
  assert(firstMs<3000,'Local first response exceeds regression budget: '+firstMs);
  report.vitruvia.push({q,navigationToFirstResultMs:firstMs,submitToFirstResultMs:Number(timing),externalImageRequests:images.length,errors});
  await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+'vitruvia-lexicon.html?q=ordinatio&mode=palabra&lang=la',{waitUntil:'domcontentloaded'});
 for(const q of ['ordinatio','numen','dimus','domus','symmetria']){
  const start=Date.now();
  if(q!=='ordinatio'){await page.locator('#lx-q').fill(q);await page.locator('#lx-form').evaluate(f=>f.requestSubmit())}
  await page.waitForFunction(q=>document.querySelector('#lx-state')?.dataset.completeQuery===q,q,{timeout:20000});
  await page.waitForFunction(q=>document.querySelector('#lx-entry h2')?.textContent.trim()===q,q,{timeout:5000});
  const row={q,searchMs:Date.now()-start,state:await page.locator('#lx-state').innerText()};
  if(q==='dimus')assert(/Sin coincidencias/.test(row.state),'Unknown form must not become a related term');
  else{
   await page.locator('#lx-results mark.w').first().click();
   await page.waitForFunction(()=>Number(document.querySelector('#classics-lexical-popup')?.dataset.readyMs)>=0,{timeout:1000});
   row.dictionaryReadyMs=Number(await page.locator('#classics-lexical-popup').getAttribute('data-ready-ms'));
   assert(row.dictionaryReadyMs<250,'Resident dictionary must not wait for a network lexicon');
   await page.locator('.cl-popup-close').click();
  }
  report.lexicon.push(row);
 }
 await page.goto(base+'vitruvia-lexicon.html?q=arquitectura&mode=palabra',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#lx-state')?.dataset.completeQuery==='arquitectura',{timeout:25000});
 const mapped=await page.locator('#lx-entry').innerText();assert(mapped.includes('architectura'));assert(mapped.includes('ἀρχιτεκτονική'));
 assert.equal(await page.locator('.lx-equivalent-language').count(),2);
 report.lexicon.push({q:'arquitectura',documentedLatinGreekEquivalents:true,state:await page.locator('#lx-state').innerText()});
 for(const q of ['logo','logos','god','dieu']){
  await page.locator('#lx-q').fill(q);await page.locator('#lx-q').press('Enter');
  await page.waitForFunction(q=>document.querySelector('#lx-state')?.dataset.completeQuery===q,q,{timeout:20000});
  const terms=await page.locator('#lx-entry .actions').innerText();
  assert(q.startsWith('logo')?terms.includes('λόγος')&&!terms.includes('θεός'):terms.includes('θεός')&&!terms.includes('λόγος'));
  report.lexicon.push({q,state:await page.locator('#lx-state').innerText()});
 }
 await page.goto(base+'bibliotheca-graeca-latina.html?work=vitruvius&q=Domus',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#result')?.dataset.query==='Domus',{timeout:30000});
 for(const q of ['numen','aqua']){
  await page.locator('#classic-query').fill(q);
  assert.equal(await page.locator('#classic-results').textContent(),'','Editing clears prior results immediately');
  await page.locator('#search-form').evaluate(f=>f.requestSubmit());
  await page.waitForFunction(q=>document.querySelector('#result')?.dataset.query===q,q,{timeout:30000});
  assert.equal(new URL(page.url()).searchParams.get('q'),q);
  report.bibliotheca.push({q,firstResultMs:await page.locator('#search-status').getAttribute('data-first-result-ms')});
 }
 await page.goto(base+'bibliotheca-graeca-latina.html?work=horace-odes&q=numen',{waitUntil:'domcontentloaded'});
 await page.locator('#bibliotheca-docx-results mark').first().waitFor({timeout:20000});
 await page.locator('#bibliotheca-docx-results mark').first().click();
 await page.locator('#classics-lexical-popup[data-ready-ms]').waitFor({timeout:3000});
 assert((await page.locator('#classics-lexical-popup').innerText()).includes('Voluntad divina'));
 report.bibliotheca.push({q:'numen',docxDictionary:true,readyMs:Number(await page.locator('#classics-lexical-popup').getAttribute('data-ready-ms'))});
 await page.locator('.cl-popup-close').click();
 await page.goto(base+'classics-work-record.html?work=vitruvio-v554-pdf',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#work-record')?.textContent.includes('10.5281/zenodo.23885110'),{timeout:15000});
 const editionText=await page.locator('#work-record').innerText();assert(editionText.includes('978-631-01-6651-3'));assert(editionText.includes('1166 páginas'));
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 await page.screenshot({path:'reports/responsive-v554.png',fullPage:true});
 await context.close();
 report.passed=true;
}catch(error){report.passed=false;report.failure=String(error.stack||error);process.exitCode=1}
finally{await browser.close();mkdirSync('reports',{recursive:true});writeFileSync('reports/responsive-search.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))}
