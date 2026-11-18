/* Extra browser regression suite: visually effective languages and palette buttons.
 * Read-only, run against a local copy of the public site; no corpus edits.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const base=process.env.BASE||"http://127.0.0.1:8766/";
const browser=await chromium.launch({headless:true});
let checks=0;
async function open(path){
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 await page.route(/^https?:\/\//,route=>{
  const requestUrl=new URL(route.request().url());
  if(requestUrl.host===new URL(base).host)return route.continue();
  return route.abort(); // Never send requests to third-party scripts or services.
 });
 const response=await page.goto(base+path,{waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(response?.status(),200,"HTTP "+path);
 return page;
}
const background=page=>page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
const stored=(page,key)=>page.evaluate(key=>localStorage.getItem(key),key);
try{
 // Home: interface text must REALLY change, not only <html lang>.
 {
  const p=await open("index.html"),select=p.locator(".header-languages select").first();
  await select.waitFor({state:"visible",timeout:15000});
  const link=p.locator('header.site-header nav a[href="#buscar"]').first();
  for(const [language,text] of [["en","Search"],["fr","Rechercher"],["es","Buscar"]]){
   await select.selectOption(language);
   await p.waitForFunction(([lang,expected])=>
    document.documentElement.lang===lang&&
    document.querySelector('header.site-header nav a[href="#buscar"]')?.textContent.trim()===expected,
    [language,text],{timeout:10000});
   assert.equal(await link.innerText(),text,"Home content translation "+language);
   assert.equal(await stored(p,"vitruvius-ui-lang"),language,"Home locale persisted");
   checks+=2;
  }
  await p.close();
 }
 // Vitruvia: a translated navigation item + background actually changing.
 {
  const p=await open("vitruvia.html"),locale=p.locator("#ui-language"),nav=p.locator('[data-i18n="navLibrary"]');
  await locale.waitFor({state:"visible",timeout:15000});
  await locale.selectOption("es");
  const spanish=await nav.innerText();
  await locale.selectOption("en");
  await p.waitForFunction(old=>document.querySelector('[data-i18n="navLibrary"]')?.textContent.trim()!==old&&document.documentElement.lang==="en",spanish);
  const english=await nav.innerText();
  await locale.selectOption("fr");
  await p.waitForFunction(old=>document.querySelector('[data-i18n="navLibrary"]')?.textContent.trim()!==old&&document.documentElement.lang==="fr",english);
  await locale.selectOption("es");
  await p.waitForFunction(expected=>document.querySelector('[data-i18n="navLibrary"]')?.textContent.trim()===expected,spanish);
  checks+=3;
  const before=await background(p);
  await p.locator("#theme").click();
  assert.notEqual(await background(p),before,"Vitruvia theme had no visible effect");
  await p.reload({waitUntil:"domcontentloaded"});
  await p.locator("#theme").waitFor({state:"visible",timeout:10000});
  assert.notEqual(await background(p),before,"Vitruvia theme did not persist");
  await p.locator("#theme").click();
  checks+=2;await p.close();
 }
 // Bibliotheca: all five swatches must paint DIFFERENT actual backgrounds.
 {
  const p=await open("bibliotheca-graeca-latina.html");
  const menu=p.locator("#bibliotheca-color-palette"),summary=menu.locator("summary");
  await summary.waitFor({state:"visible",timeout:15000});
  await p.locator("#language-toggle").selectOption("es");
  let previous=await background(p);
  for(const color of ["graphite","navy","slate","sepia","original"]){
   await summary.click();
   await menu.locator('[data-biblio-color="'+color+'"]').click();
   const actual=await background(p);
   assert.notEqual(actual,previous,"Bibliotheca "+color+" did not change real background");
   assert.equal(await stored(p,"vdl-bibliotheca-background-v1"),color,"Bibliotheca "+color+" not persisted");
   previous=actual;checks+=2;
  }
  await summary.click();
  await menu.locator('[data-biblio-color="graphite"]').click();
  const selected=await background(p);
  await p.reload({waitUntil:"domcontentloaded"});
  await summary.waitFor({state:"visible",timeout:10000});
  assert.equal(await background(p),selected,"Bibliotheca chosen background lost on reload");
  await p.locator("#bibliotheca-theme").click();
  assert.notEqual(await background(p),selected,"Bibliotheca theme did not reset custom palette");
  assert.equal(await stored(p,"vdl-bibliotheca-background-v1"),"original");
  checks+=3;await p.close();
 }
 // Lexicon: the real background (not just data-theme) changes and survives reload.
 {
  const p=await open("vitruvia-lexicon.html"),locale=p.locator("#lx-ui");
  await locale.waitFor({state:"visible",timeout:15000});
  const swatches=p.locator(".lx-palette-panel .lx-swatch");
  await swatches.first().waitFor({state:"attached",timeout:12000});
  for(const language of ["en","fr","es"]){
   await locale.selectOption(language);
   assert.equal(await p.locator("html").getAttribute("lang"),language);
   checks++;
  }
  const previous=await background(p);
  await p.locator('.lx-palette-panel .lx-swatch[aria-label="Marfil"]').evaluate(el=>el.click());
  assert.notEqual(await background(p),previous,"Lexicon ivory did not change displayed page background");
  const ivory=await background(p);
  await p.reload({waitUntil:"domcontentloaded"});
  await p.locator(".lx-palette-panel .lx-swatch").first().waitFor({state:"attached",timeout:12000});
  assert.equal(await background(p),ivory,"Lexicon palette lost on reload");
  checks+=2;await p.close();
 }
 // Classical academic reader has a SEPARATE UI language and a page-wide palette.
 {
  const p=await open("classics-text-reader.html?work=caesar-gallico&lang=la&locus=1.1");
  const locale=p.locator("#reader-ui-language"),topTheme=p.locator("#reader-top-theme");
  await locale.waitFor({state:"visible",timeout:15000});
  for(const language of ["en","fr","es"]){
   await locale.selectOption(language);
   assert.equal(await p.locator("html").getAttribute("lang"),language,"Reader UI language "+language);
   assert.equal(await stored(p,"vitruvius-ui-lang"),language,"Reader UI language not retained");
   checks+=2;
  }
  const bg=p.locator("#reader-bg");
  await bg.waitFor({state:"attached",timeout:10000});
  const before=await bg.inputValue();
  await topTheme.click();
  assert.notEqual(await bg.inputValue(),before,"Reader top theme failed to change background value");
  const mode=await p.evaluate(()=>document.documentElement.style.getPropertyValue("--reader-page-bg").trim());
  assert.equal(mode,await bg.inputValue(),"Reader toolbar not applying page-wide palette");
  checks+=2;
  await p.close();
 }
 // Editorial toolbar: persistence across reload and a second page.
 {
  const p=await open("bibliografia.html");
  const locale=p.locator("#secondary-language"),theme=p.locator("#secondary-theme");
  await locale.waitFor({state:"visible",timeout:15000});
  await theme.waitFor({state:"visible",timeout:15000});
  await locale.selectOption("fr");
  const before=await background(p);
  await theme.click();
  const after=await background(p);
  assert.notEqual(after,before,"Secondary editorial color button had no visual effect");
  await p.reload({waitUntil:"domcontentloaded"});
  await locale.waitFor({state:"visible",timeout:15000});
  assert.equal(await locale.inputValue(),"fr","Editorial locale not persisted");
  assert.equal(await background(p),after,"Editorial background did not persist");
  assert.equal(await p.locator(".site-global-language:visible").count(),0,"Duplicate editorial language control");
  checks+=4;await p.close();
 }
 console.log("PASS "+checks+" additional browser validations of actual translations, backgrounds and persistence");
}finally{await browser.close()}
