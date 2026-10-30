// Browser smoke audit for existing controls (no visual redesign).
// SITE_URL=https://diegoalonsok-png.github.io/vitruvius-digital-library/ node scripts/audit-buttons.mjs
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=(process.env.SITE_URL||'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true});
const findings=[];
const failures=[];
const record=(label,okay,detail='')=>{findings.push({label,status:okay?'PASS':'FAIL',detail});if(!okay)failures.push(label+': '+detail);};
page.on('pageerror',e=>failures.push('Page JS error: '+e.message));
async function check(label,task){try{await task();record(label,true);}catch(e){record(label,false,String(e.message||e).slice(0,250));}}
async function visit(relative){await page.goto(new URL(relative,base).href,{waitUntil:'domcontentloaded',timeout:45000});}
async function clickAndAssert(locator,expected){await locator.click();await expected.waitFor({state:'visible',timeout:10000});}

await check('Inicio carga y buscador existe',async()=>{await visit('index.html');await page.locator('#search-form #query').waitFor();});
await check('Catálogo: pestañas cambian',async()=>{
 await visit('index.html');
 const tab=page.locator('[data-category="historical"]');
 await tab.click();
 assert.equal(await tab.getAttribute('aria-selected'),'true');
 await page.locator('[data-category="recensio"]').click();
});
await check('Ejemplos latinos rellenan campo',async()=>{
 await visit('index.html');await page.locator('[data-query="symmetria"]').click();
 assert.equal(await page.locator('#query').inputValue(),'symmetria');
});
await check('Búsqueda literal symmetria devuelve loci',async()=>{
 await visit('index.html');await page.locator('#query').fill('symmetria');await page.locator('#search-form #search-button').click();
 await page.waitForFunction(()=>document.querySelectorAll('#search-results article.result').length>0,{timeout:25000});
 assert.ok((await page.locator('#search-results article.result').count())>0);
});
await check('Búsqueda por libro LIBER IV',async()=>{
 await visit('index.html');await page.locator('#query').fill('LIBER IV');await page.locator('#search-button').click();
 await page.waitForFunction(()=>document.querySelectorAll('#search-results article.result').length>0,{timeout:25000});
 assert.ok((await page.locator('#search-results article.result').count())>0);
});
await check('Frase de VII.3.3 encuentra pasaje',async()=>{
 await visit('index.html');await page.locator('#query').fill('Cameris dispositis et intextis, imum caelum earum trullissetur');
 await page.locator('#search-button').click();await page.waitForFunction(()=>document.querySelectorAll('#search-results article.result').length>0,{timeout:25000});
 assert.ok((await page.locator('#search-results').innerText()).includes('VII.3.3'));
});
await check('Botones abrir consulta comparada',async()=>{
 await visit('index.html');await page.locator('#open-comparison').click();
 await page.locator('#comparison-dialog[open]').waitFor({timeout:10000});
 await page.locator('#close-comparison').click();
});
await check('Lector bilingüe navega por locus',async()=>{
 await visit('lector-bilingue.html?edition=recensio-es&locus=4.1.6');
 await page.waitForFunction(()=>document.querySelector('#latin-text')?.textContent?.includes('In ea aede'),null,{timeout:25000});
 assert.ok((await page.locator('#translation-text').innerText()).length>30);
 await page.locator('#next').click();
});
await check('Lector: cambio de traducción',async()=>{
 await visit('lector-bilingue.html?edition=recensio-es&locus=4.1.6');
 await page.locator('#latin-text').waitFor();
 await page.locator('#lang').selectOption('fr');
 await page.waitForTimeout(800);
 assert.ok((await page.locator('#translation-text').innerText()).length>20);
});
await check('Enlaces locales no apuntan a archivos inexistentes',async()=>{
 await visit('index.html');
 const hrefs=await page.locator('a[href]').evaluateAll(els=>els.map(a=>a.getAttribute('href')).filter(x=>x&&!x.startsWith('#')&&!x.startsWith('mailto:')&&!/^https?:/i.test(x)));
 for(const href of [...new Set(hrefs)].filter(x=>/\.html(?:[?#]|$)/.test(x))){
  const response=await page.request.get(new URL(href,base).href,{timeout:15000});
  assert.ok(response.ok(),href+' returned '+response.status());
 }
});
await browser.close();
console.log(JSON.stringify({url:base,checked:findings.length,passed:findings.filter(x=>x.status==='PASS').length,failed:failures.length,findings,failures},null,2));
if(failures.length)process.exitCode=1;
