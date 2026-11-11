/* Reproducible browser timings for the principal text-search interfaces.
 * Localhost measurement excludes public-network variability and is NOT a public
 * load-time claim. Each query runs in an isolated browser context.
 */
import {chromium} from "playwright";
import {mkdirSync,writeFileSync} from "node:fs";
const BASE=process.env.BASE||"http://127.0.0.1:8766/";
const CASES=[
 {name:"Portada / concordancias",url:"index.html",input:"#query",form:"#search-form",q:"domus",result:"#search-results article, #search-results .result-card, #search-results .search-result, #lexical-occurrences li",state:"#search-status"},
 {name:"Vitruvia / general",url:"vitruvia.html",input:"#query",form:"#search-form",q:"Vitruvio",result:"#result-list .result-card, #article-body p",state:"#result-state"},
 {name:"Lexicon / palabra exacta",url:"vitruvia-lexicon.html",input:"#lx-q",form:"#lx-form",q:"domus",result:"#lx-results .lx-hit",state:"#lx-state"},
 {name:"Aparato / índice textual",url:"aparato-critico.html",input:"#critical-query",form:"#critical-form",q:"domus",result:"#critical-results .critical-result",state:"#critical-status"},
 {name:"Bibliotheca / palabras",url:"bibliotheca-graeca-latina.html",input:"#classic-query",form:"#search-form",q:"domus",result:"#classic-results li.hit",state:"#search-status"},
 {name:"Index locorum",url:"index-locorum.html",input:"#query",form:"#form",q:"domus",result:"#results article, #results li, #results .card",state:"#status"},
 {name:"Párrafos históricos",url:"buscador-parrafos-vitruvio.html",input:"#hp-query",form:"#hp-form",q:"symmetria",result:"#hp-results .hp-card",state:"#hp-status"}
];
const browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{})});
const records=[];
for(const item of CASES){
 const context=await browser.newContext({viewport:{width:1280,height:900},locale:"es-AR"});
 const page=await context.newPage();
 const errors=[],missing=[];
 page.on("pageerror",e=>errors.push(e.message.slice(0,220)));
 page.on("response",r=>{if(r.status()>=400&&r.url().startsWith(BASE))missing.push(r.status()+" "+r.url().slice(0,180))});
 const row={name:item.name,url:item.url,term:item.q,ttfbMs:null,domMs:null,loadMs:null,firstResultMs:null,settledMs:null,resultElements:0,state:"",controls:0,errors,missing,reason:null};
 try{
  const response=await page.goto(BASE+item.url,{waitUntil:"domcontentloaded",timeout:45000});
  if(!response||response.status()!==200)throw Error("Página HTTP "+response?.status());
  const nav=await page.evaluate(()=>{const e=performance.getEntriesByType("navigation")[0];return {ttfb:Math.round((e?.responseStart||0)-(e?.requestStart||0)),dom:Math.round(e?.domContentLoadedEventEnd||0),load:e?.loadEventEnd?Math.round(e.loadEventEnd):null}});
  row.ttfbMs=nav.ttfb;row.domMs=nav.dom;row.loadMs=nav.load;
  await page.locator(item.input).waitFor({timeout:14000});
  await page.locator(item.input).fill(item.q);
  const start=Date.now();
  // Click the visible submit button as a user would; no synthetic submission.
  const searchButton=page.locator(item.form+" button[type=submit]").first();
  await searchButton.click({timeout:12000});
  try{
   await page.waitForFunction(({result,state})=>{
    const els=document.querySelectorAll(result);
    if(els.length>0&&Array.from(els).some(x=>x.textContent.trim().length>18))return true;
    const value=document.querySelector(state)?.textContent||"";
    return /sin coincidencias|no hay resultados|0 coincidencias|not found|no results|ningún resultado/i.test(value);
   },{result:item.result,state:item.state},{timeout:30000,polling:100});
   row.firstResultMs=Date.now()-start;
  }catch(e){row.reason="No hubo resultados comprobables antes de 30 segundos";}
  await page.waitForTimeout(400);
  row.settledMs=Date.now()-start;
  const body=await page.evaluate(({result,state})=>({
   count:document.querySelectorAll(result).length,
   status:(document.querySelector(state)?.textContent||"").trim().slice(0,250),
   controls:document.querySelectorAll("button,[role=button],input[type=submit]").length
  }),{result:item.result,state:item.state});
  row.resultElements=body.count;row.state=body.status;row.controls=body.controls;
  if(item.url==="vitruvia-lexicon.html")row.literalDomusFound=body.count>0;
  if(item.url==="bibliotheca-graeca-latina.html"){
   const expand=page.locator("#classic-results .bibliotheca-show-more").first();
   row.firstBatchPassages=await page.locator("#classic-results li.hit").count();
   row.firstBatchBounded=row.firstBatchPassages<=60;
   if(await expand.count()){
    await expand.click({timeout:5000});
    row.expandedPassages=await page.locator("#classic-results li.hit").count();
    row.showMoreWorks=row.expandedPassages>row.firstBatchPassages;
   }else row.showMoreWorks="No more button visible";
  }
  // Verify the formerly broken yellow-highlight dictionary interaction.
  if(item.url==="index.html"||item.url==="aparato-critico.html"){
   const markSelector=item.url==="index.html"
    ?"#lexical-occurrences mark.lexical-query-hit, #search-results mark.search-hit"
    :"#critical-results p[lang=la] mark";
   try{
    const highlighted=page.locator(markSelector).first();
    await highlighted.waitFor({state:"visible",timeout:3500});
    await highlighted.click({timeout:3500});
    await page.locator("#vitruvius-lexical-card:not([hidden])").waitFor({state:"visible",timeout:4000});
    row.lexicalPopup="PASS";
    const close=page.locator("#vitruvius-lexical-card .vlc-close");
    await close.click();
    row.lexicalPopupClose=(await page.locator("#vitruvius-lexical-card").getAttribute("hidden"))!==null?"PASS":"FAIL";
   }catch(e){row.lexicalPopup="FAIL: "+String(e.message||e).slice(0,120)}
  }
 }catch(e){row.reason=String(e.message||e).slice(0,240)}
 await context.close();
 records.push(row);
 console.log(JSON.stringify({name:row.name,domMs:row.domMs,firstResultMs:row.firstResultMs,count:row.resultElements,errors:row.errors.length,reason:row.reason}));
}
await browser.close();
const observed=records.filter(r=>r.firstResultMs!==null).map(r=>r.firstResultMs).sort((a,b)=>a-b);
const p=x=>observed.length?observed[Math.min(observed.length-1,Math.ceil(observed.length*x)-1)]:null;
const report={schema:"vitruvius-search-latency-local-v1",date:new Date().toISOString(),environment:"Chromium GitHub Actions · local HTTP server; external API timings are environment-dependent",coverage:"seven primary search flows, one query each; not an exhaustive button verification",medianFirstResultMs:p(.5),p95FirstResultMs:p(.95),queries:records};
mkdirSync("reports",{recursive:true});
writeFileSync("reports/site-search-latency.json",JSON.stringify(report,null,2)+"\n");
console.log("Measured search first-result p50/p95:",p(.5),"/",p(.95),"ms; ",observed.length,"of",CASES.length,"search flows reported results.");
// Baseline collects failures as evidence. They are not hidden or counted as speed successes.
