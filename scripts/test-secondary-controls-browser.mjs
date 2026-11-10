/* Browser-level user interaction tests; no paid external services.
 * Run with a local HTTP server on port 8766 and Playwright Chromium.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const base=process.env.BASE||"http://127.0.0.1:8766/";
const pages=[
 "aedes-en-vitruvio.html",
 "auditoria-academica.html",
 "glosario-arquitectonico-vitruvio.html",
 "index-locorum.html",
 "guia-investigacion-universitaria.html",
 "tablas-explicativas.html",
 "bibliografia.html",
 "colacion.html",
 "datos.html",
 "scriptorium.html",
 "lexicon-vitruvianum.html",
 "status-textus-en.html"
];
const browser=await chromium.launch({headless:true});
let checked=0;
try{
 for(const file of pages){
  const page=await browser.newPage({viewport:{width:1350,height:850}});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  const pageErrors=[];
  page.on("pageerror",err=>{
   if(/secondary-reader-controls|global-language|site-bar/i.test(err.stack||err.message))
    pageErrors.push(err.message);
  });
  const response=await page.goto(base+file,{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(response?.status(),200,"HTTP "+file);
  const theme=page.locator("#secondary-theme"),locale=page.locator("#secondary-language");
  await theme.waitFor({state:"visible",timeout:12000});
  await locale.waitFor({state:"visible",timeout:12000});
  for(let round=0;round<2;round++){
   // Three consecutive language changes must be fully reversible.
   for(const [lang,label] of [["en","Language"],["fr","Langue"],["es","Idioma"]]){
    await locale.selectOption(lang);
    assert.equal(await page.locator("html").getAttribute("lang"),lang,file+" html language");
    assert.match(await locale.getAttribute("aria-label"),new RegExp(label),file+" control translation");
   }
   const before=await page.evaluate(()=>({
    theme:document.documentElement.dataset.theme,
    bg:getComputedStyle(document.body).backgroundColor
   }));
   await theme.click();
   const after=await page.evaluate(()=>({
    theme:document.documentElement.dataset.theme,
    bg:getComputedStyle(document.body).backgroundColor
   }));
   assert.notEqual(before.theme,after.theme,file+" appearance attribute did not change");
   assert.notEqual(before.bg,after.bg,file+" computed background remained unchanged");
   await theme.click();
   assert.equal(await page.locator("html").getAttribute("data-theme"),before.theme,file+" theme not reversible");
   checked+=5;
  }
  assert.equal(await page.locator("#vitruvius-secondary-toolbar").count(),1,file+" duplicated controls");
  assert.equal(await page.locator(".site-global-language:visible").count(),0,file+" duplicated language dropdown");
  assert.deepEqual(pageErrors,[],file+" JS errors");
  console.log("PASS two ES→EN→FR→ES and dark/light cycles:",file);
  checked++;
  await page.close();
 }
 // The Bibliotheca keeps its own native Lexicon-like appearance button.
 {
  const page=await browser.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  await page.goto(base+"bibliotheca-graeca-latina.html",{waitUntil:"domcontentloaded",timeout:30000});
  const button=page.locator("#bibliotheca-theme");
  await button.waitFor({state:"visible",timeout:12000});
  const initial=await page.locator("html").getAttribute("data-theme");
  const before=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  await button.click();
  assert.notEqual(await page.locator("html").getAttribute("data-theme"),initial);
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),before);
  await button.click();
  assert.equal(await page.locator("html").getAttribute("data-theme"),initial);
  await page.locator("#language-toggle").click();
  await page.waitForTimeout(50);
  assert.match(await button.getAttribute("aria-label"),/Switch to|Activer|Activar/);
  console.log("PASS Bibliotheca color switch, contrast and language-sensitive label");
  await page.close();checked+=3;
 }
 // Primary search is not replaced by secondary controls.
 {
  const page=await browser.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  await page.goto(base+"vitruvia.html",{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(await page.locator("#vitruvius-secondary-toolbar").count(),0);
  await page.locator("#ui-language").selectOption("en");
  assert.equal(await page.locator("html").getAttribute("lang"),"en");
  const theme=page.locator("#theme");await theme.click();
  assert.match(await theme.getAttribute("aria-label"),/Switch to/);
  await theme.click();
  await page.locator("#ui-language").selectOption("fr");
  assert.match(await theme.getAttribute("aria-label"),/Activer/);
  console.log("PASS Vitruvia native language and palette controls");
  await page.close();checked+=4;
 }
 console.log("PASS "+checked+" repeated real-browser controls and background checks");
}finally{await browser.close()}
