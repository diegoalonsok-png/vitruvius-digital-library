import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8766/apparatus-bude.html?locus=1.1.1&edition=v514&translation=es',{waitUntil:'domcontentloaded'});
 await page.locator('#ab-search-status').getByText(/loci disponibles/).waitFor({timeout:30000});
 await page.locator('#ab-search-query').fill('simmetria');
 await page.locator('#ab-search-form button[type=submit]').click();
 await page.getByText(/Locus sincronizado: I.1.4/).waitFor({timeout:15000});
 assert.match(await page.locator('#ab-search-status').innerText(),/loci encontrados/);
 assert.match(await page.locator('#compare-kurilo').innerText(),/symmetr/i);
 assert.match(await page.locator('#compare-krohn').innerText(),/symmetr/i);
 assert.match(await page.locator('#compare-rose').innerText(),/symmetr/i);
 assert.match(await page.locator('#locus').inputValue(),/^1\.1\.4$/);
 assert.ok(await page.locator('#ab-search-results mark.ab-search-highlight').count()>0,'Search result should show yellow marks');
 assert.ok(await page.locator('#compare-kurilo mark.ab-latin-match').count()>0,'Kurilo match must be highlighted');
 await page.locator('#ab-search-results .ab-search-hit button').nth(1).click();
 assert.match(await page.locator('#locus').inputValue(),/^1\.2\.1$/);
 assert.match(await page.locator('#ab-synchronized-locus').innerText(),/I\.2\.1/);
 assert.match(page.url(),/locus=1\.2\.1/);
 console.log('PASS: simmetria matches, three synchronized readers, yellow hits, next locus and URL');
}finally{await browser.close()}
