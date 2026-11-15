import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8766/apparatus-bude.html?locus=1.1.1&edition=v514&translation=es',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#ab-search-status')?.textContent.includes('loci disponibles'),{timeout:30000});
 const cases=[
  ['simmetria','1.1.4',/symmetr/i],
  ['symmetria','1.1.4',/symmetr/i],
  ['decor','1.2.1',/decor/i],
  ['firmitas','1.3.2',/firmit/i],
  ['utilitas','1.3.2',/utilit/i],
  ['architect','1.1.1',/architect/i],
  ['venustas','1.3.2',/venust/i]
 ];
 for(const [term,locus,pattern] of cases){
  await page.locator('#ab-search-query').fill(term);
  await page.locator('#ab-search-form button[type=submit]').click();
  const expected=new RegExp('^'+locus.replaceAll('.','\\.')+'$');
  await page.waitForFunction(x=>document.querySelector('#locus')?.value===x,locus,{timeout:12000});
  assert.match(await page.locator('#locus').inputValue(),expected);
  assert.match(await page.locator('#ab-search-status').innerText(),/loci encontrados/);
  assert.ok(await page.locator('#ab-search-results mark.ab-search-highlight').count()>0,term+' should highlight search snippets');
  for(const id of ['#compare-rose','#compare-krohn','#compare-kurilo','#latin']){
   assert.match(await page.locator(id).innerText(),pattern,term+' missing in '+id);
   assert.ok(await page.locator(id+' mark.ab-latin-match').count()>0,term+' not yellow highlighted in '+id);
  }
  assert.match(await page.locator('#ab-synchronized-locus').innerText(),/Locus sincronizado:/);
  assert.ok(page.url().includes('locus='+locus),'URL must track '+term);
  console.log('PASS '+term+' => '+locus+' · four readings and result snippets highlighted');
 }
 await page.locator('#ab-search-query').fill('symmetria');
 await page.locator('#ab-search-form button[type=submit]').click();
 await page.locator('#ab-search-results .ab-search-hit button').nth(1).click();
 assert.equal(await page.locator('#locus').inputValue(),'1.2.1');
 assert.match(await page.locator('#ab-synchronized-locus').innerText(),/I\.2\.1/);
 console.log('PASS selecting second result updates synchronized locus and URL');
}finally{await browser.close()}
