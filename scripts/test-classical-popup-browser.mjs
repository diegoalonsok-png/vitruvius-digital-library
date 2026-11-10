/* Real Chromium regression of the classical passage's word dictionary.
 * Requires a local HTTP server at 127.0.0.1:8766; no third-party API needed.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";

const base=process.env.BASE||"http://127.0.0.1:8766/";
const browser=await chromium.launch({headless:true});
let checked=0;
try{
 const page=await browser.newPage({viewport:{width:1200,height:830}});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
 // Keep external requests offline while providing a deterministic test image.
 await page.route(/commons\.wikimedia\.org\/wiki\/Special:FilePath/,route=>route.fulfill({
  status:200,contentType:"image/png",
  body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64")
 }));
 const response=await page.goto(base+"classics-text-reader.html?work=caesar-gallico&lang=la&q=virtute",
  {waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(response?.status(),200);
 await page.waitForFunction(()=>!!window.ClassicalLexicon&&!!window.VitruviaClassicalWordPopup);
 await page.waitForFunction(()=>document.querySelector("#toc")?.children.length>0,{timeout:20000});
 assert.equal(await page.locator("html").getAttribute("class"),"classic-reader-scrollbars");
 assert.equal(await page.locator("link[href*='lexicon-reader-scrollbars.css']").count(),1);
 assert.equal(await page.locator("link[href*='classics-lexical-popup.css']").count(),1);

 // Test the actual local Cato glossary, rather than fabricated lexical data.
 const entry=await page.evaluate(async()=>window.ClassicalLexicon.lookup("deus",{
  lang:"la",work:"cato-agricultura",online:false
 }));
 assert(entry.entries.length,"Cato local glossary did not resolve deus");
 assert(entry.entries.some(x=>x.lemma==="deus"),"Wrong Latin lemma for deus");
 checked+=3;

 // Simulate an exact highlighted word on a page after asynchronous rendering.
 const fixture=async(word,lang="la")=>page.evaluate(({word,lang})=>{
  const passages=document.querySelector("#passages");
  passages.setAttribute("lang",lang);
  passages.replaceChildren();
  const p=document.createElement("p");
  const mark=document.createElement("mark");
  mark.className="cl-hit";mark.textContent=word;
  p.append("in contextu ",mark," testis");
  passages.append(p);
 },{word,lang});
 for(let round=1;round<=3;round++){
  await fixture("virtute");
  const word=page.locator("#passages mark.cl-hit");
  await word.waitFor();
  await page.waitForFunction(()=>document.querySelector("#passages mark")?.getAttribute("role")==="button");
  assert.equal(await word.getAttribute("tabindex"),"0");
  await word.click();
  const popup=page.locator("#classics-lexical-popup");
  await popup.waitFor({state:"visible",timeout:8000});
  assert.equal(await popup.locator("h2").textContent(),"virtute");
  await popup.locator(".cl-lemma").first().waitFor({state:"visible",timeout:18000});
  // Existing dictionary beneath the passage must still receive the click.
  await page.waitForFunction(()=>/virt[uū]s/i.test(document.querySelector("#lexicon")?.textContent||""),null,{timeout:18000});
  await popup.locator(".cl-popup-commons").waitFor({state:"attached",timeout:18000});
  assert.match(await popup.locator(".cl-links").textContent(),/Logeion/);
  assert.equal(await popup.locator(".cl-popup-media img").count(),0,
   "Unverified picture may not be attached automatically to a theological word");
  assert.equal(await popup.locator(".cl-popup-commons").count(),1);
  await popup.locator(".cl-popup-close").click();
  assert.equal(await popup.count(),1);
  assert.equal(await popup.evaluate(el=>el.open),false);
  checked+=6;
  console.log("PASS Latin highlighted term, real glossary and modal close: repetition",round);
 }

 // For verified architectural terms, show the existing source-attributed
 // Pompeii photograph; never replace it with a generic generated image.
 await page.evaluate(()=>{
  window.ClassicalLexicon.renderPanel=async(container,word)=>{
   container.replaceChildren();
   const node=document.createElement("div");
   node.className="cl-lemma";node.textContent=word;container.append(node);
  };
 });
 await fixture("domus");
 await page.locator("#passages mark").click();
 await page.locator("#classics-lexical-popup .cl-popup-media img").waitFor({state:"visible"});
 assert.match(await page.locator("#classics-lexical-popup figcaption").textContent(),/Casa de los Vettii/);
 assert.match(await page.locator("#classics-lexical-popup figcaption").textContent(),/Wikimedia Commons/);
 assert.match(await page.locator("#classics-lexical-popup .cl-popup-media a").first().getAttribute("href"),/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
 await page.keyboard.press("Escape");
 assert.equal(await page.locator("#classics-lexical-popup").evaluate(el=>el.open),false);
 checked+=4;

 await fixture("λόγος","grc");
 const mark=page.locator("#passages mark");
 await mark.focus();await mark.press("Enter");
 assert.equal(await page.locator("#classics-lexical-popup h2").textContent(),"λόγος");
 assert.equal(await page.locator("#classics-lexical-popup").evaluate(el=>el.open),true);
 await page.locator("#classics-lexical-popup .cl-popup-close").click();
 checked+=2;

 // A modern-language translation must not be silently treated as Ancient Greek.
 await fixture("house","en");
 await page.locator("#passages mark").click();
 assert.equal(await page.locator("#classics-lexical-popup").evaluate(el=>el.open),false);
 checked++;

 const layout=await page.evaluate(()=>({
  scrollbar:getComputedStyle(document.documentElement).scrollbarColor,
  popupRule:[...document.styleSheets].some(s=>(s.href||"").includes("classics-lexical-popup.css")),
  wordCursor:getComputedStyle(document.querySelector("#passages mark")).cursor
 }));
 assert(layout.scrollbar!=="auto","Scrollbar still uses browser-default white track");
 assert.equal(layout.popupRule,true);
 assert.equal(layout.wordCursor,"pointer");
 checked+=3;
 await page.close();

 // The actual Caton reader from the supplied screenshot uses the separate
 // lector-clasico.html UI, not classics-text-reader.html.
 {
  const cato=await browser.newPage({viewport:{width:1100,height:820}});
  await cato.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  await cato.goto(base+"lector-clasico.html?obra=stoa0079.stoa001&loc=2&q=deus",{
   waitUntil:"domcontentloaded",timeout:30000});
  await cato.waitForFunction(()=>!!window.ClassicalLexicon&&!!window.VitruviaClassicalWordPopup);
  assert.equal(await cato.locator("html").getAttribute("class"),"classic-reader-scrollbars");
  assert.equal(await cato.locator("link[href*='lexicon-reader-scrollbars.css']").count(),1);
  for(let round=0;round<3;round++){
   await cato.evaluate(()=>{
    const host=document.getElementById("original");
    const section=document.getElementById("reader");
    section.hidden=false;host.hidden=false;
    host.innerHTML='<div class="txt" lang="la"><span class="lw" data-l="la"><mark>deus</mark></span> testis</div>';
   });
   const m=cato.locator("#original .txt mark");
   await cato.waitForFunction(()=>document.querySelector("#original .txt mark")?.getAttribute("role")==="button");
   await m.click();
   const popup=cato.locator("#classics-lexical-popup");
   await popup.waitFor({state:"visible",timeout:9000});
   assert.equal(await popup.locator("h2").textContent(),"deus");
   await popup.locator(".cl-lemma").first().waitFor({state:"visible",timeout:18000});
   assert.equal(await cato.locator(".lw-pop").count(),0,
    "Highlighted words should not open competing small popups");
   await popup.locator(".cl-popup-close").click();
   checked+=5;
  }
  await cato.close();
 }

 // Parent Lexicon's own modal has the same grey track; iframe is handled above.
 const lexicon=await browser.newPage({viewport:{width:1200,height:850}});
 await lexicon.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
 await lexicon.goto(base+"vitruvia-lexicon.html?q=deus&mode=palabra&lang=la",{
  waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(await lexicon.locator("link[href*='lexicon-reader-scrollbars.css']").count(),1);
 const scroll=await lexicon.evaluate(()=>{
  const modal=document.createElement("dialog");modal.className="lx-viewer";
  const body=document.createElement("div");body.className="lx-viewer-body";
  modal.append(body);document.body.append(modal);
  const color=getComputedStyle(body).scrollbarColor;
  modal.remove();return color;
 });
 assert(scroll!=="auto","Lexicon parent dialog scrollbar not styled");
 checked+=2;
 // Marked words in the *outer* Lexicon passage (above its embedded reader)
 // must open the same lexical dialog, not only yellow words inside the iframe.
 await lexicon.waitForFunction(()=>!!window.ClassicalLexicon&&!!window.VitruviaClassicalWordPopup);
 await lexicon.evaluate(()=>{
  const modal=document.createElement("dialog");
  modal.className="lx-viewer";modal.id="lx-viewer";
  modal.setAttribute("open","");
  const original=document.createElement("section");
  original.className="lx-viewer-origin";
  original.dataset.work="cato-agricultura";
  original.innerHTML='<p class="lx-passage" lang="la"><mark class="w">deus</mark></p>';
  modal.append(original);document.body.append(modal);
 });
 const outerMark=lexicon.locator("#lx-viewer .lx-viewer-origin mark.w");
 await lexicon.waitForFunction(()=>document.querySelector("#lx-viewer mark.w")?.getAttribute("role")==="button");
 await outerMark.click();
 const outerPopup=lexicon.locator("#classics-lexical-popup");
 await outerPopup.waitFor({state:"visible",timeout:10000});
 assert.equal(await outerPopup.locator("h2").textContent(),"deus");
 await outerPopup.locator(".cl-lemma").first().waitFor({state:"visible",timeout:18000});
 await outerPopup.locator(".cl-popup-close").click();
 assert.equal(await outerPopup.evaluate(el=>el.open),false);
 checked+=4;
 await lexicon.close();
 console.log("PASS "+checked+" real Chromium lexical-popup, keyboard, verified picture and grey scrollbar checks");
}finally{await browser.close()}
