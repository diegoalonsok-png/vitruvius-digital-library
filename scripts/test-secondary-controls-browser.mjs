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
 // Preserve one interface language while crossing different site sections.
 {
  const page=await browser.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  const itinerary=[
   ['index.html','.header-languages select'],
   ['bibliotheca-graeca-latina.html','#language-toggle'],
   ['vitruvia.html','#ui-language'],
   ['auditoria-academica.html','#secondary-language'],
   ['index.html','.header-languages select']
  ];
  for(const [lang,expected] of [['fr','fr'],['en','en'],['es','es']]){
   await page.goto(base+itinerary[0][0],{waitUntil:'domcontentloaded'});
   const home=page.locator(itinerary[0][1]).first();
   await home.waitFor({state:'visible',timeout:15000});
   await home.selectOption(lang);
   for(const [file,selector] of itinerary.slice(1)){
    await page.goto(base+file,{waitUntil:'domcontentloaded'});
    const chosen=page.locator(selector).first();
    await chosen.waitFor({state:'visible',timeout:15000});
    await page.waitForFunction(l=>document.documentElement.lang===l,expected,{timeout:10000});
    assert.equal(await chosen.inputValue(),expected,'Locale not retained on '+file);
   }
  }
  await page.close();checked+=12;
  console.log('PASS language persistence between home, Bibliotheca, Vitruvia and editorial pages');
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
  const language=page.locator("#language-toggle");
  for(const [code,home] of [["en","Home"],["fr","Accueil"],["es","Inicio"]]){
   await language.selectOption(code);
   await page.waitForFunction(([lang,label])=>
    document.documentElement.lang===lang&&document.querySelector("#home")?.textContent.trim()===label,
    [code,home],{timeout:10000});
   assert.equal((await page.locator("#home").innerText()).trim(),home,"Bibliotheca home link not translated");
  }
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
 // Portada: the colour panel must actually open, apply a colour and reset.
 {
  const page=await browser.newPage({viewport:{width:1350,height:850}});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  await page.goto(base+"index.html",{waitUntil:"domcontentloaded",timeout:30000});
  const toggle=page.locator("#home-palette-toggle");
  await toggle.waitFor({state:"visible",timeout:15000});
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"),"true","Home colour panel did not open");
  const graphite=page.locator("#home-swatch-grid [aria-label='Fondo Grafito']");
  await graphite.click();
  assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue("--front-page-bg").trim()),"#15191e","Home graphite selection did not change background token");
  await toggle.click();
  await page.locator("#home-color-reset").click();
  assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue("--front-page-bg").trim()),"#0b0e12","Home colour reset did not restore black");
  console.log("PASS home colour picker: open, graphite, reset");
  await page.close();checked+=3;
 }
 // Lexicon: regression for the notebook-export selector crash. A failed
 // startup previously left the full language and colour toolbar half-initialized.
 {
  const page=await browser.newPage({viewport:{width:1350,height:850}});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(base+"vitruvia-lexicon.html",{waitUntil:"domcontentloaded",timeout:30000});
  const locale=page.locator("#lx-ui"),theme=page.locator("#theme");
  await locale.waitFor({state:"visible",timeout:15000});
  await theme.waitFor({state:"visible",timeout:15000});
  await page.locator(".lx-palette-panel .lx-swatch").first().waitFor({state:"attached",timeout:10000});
  for(const lang of ["en","fr","es"]){
   await locale.selectOption(lang);
   assert.equal(await page.locator("html").getAttribute("lang"),lang,"Lexicon interface locale did not change");
   assert.equal(await locale.inputValue(),lang,"Lexicon locale select did not retain value");
  }
  const before=await page.locator("html").getAttribute("data-theme");
  await theme.click();
  assert.notEqual(await page.locator("html").getAttribute("data-theme"),before,"Lexicon theme button has no effect");
  await theme.click();
  assert.equal(await page.locator("html").getAttribute("data-theme"),before,"Lexicon theme button cannot revert");
  await page.locator(".lx-palette-panel .lx-swatch[aria-label='Marfil']").evaluate(el=>el.click());
  assert.equal(await page.locator("html").getAttribute("data-theme"),"light","Lexicon marfil should select a light palette");
  assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue("--lx-bg").trim()),"#f7f5ef","Lexicon palette did not set the background");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator(".lx-palette-panel .lx-swatch").first().waitFor({state:"attached",timeout:10000});
  assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue("--lx-bg").trim()),"#f7f5ef","Lexicon background preference was not restored");
  assert(!errors.some(e=>/forEach is not a function|Cannot read properties of null/.test(e)),errors.join("\n"));
  console.log("PASS Lexicon ES/EN/FR, reversible light/dark, marfil and preference persistence");
  await page.close();checked+=8;
 }
 console.log("PASS "+checked+" repeated real-browser controls and background checks");
}finally{await browser.close()}
