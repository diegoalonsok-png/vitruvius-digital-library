#!/usr/bin/env node
/* Read-only browser smoke test for the public Vitruvius search tools.
   Uses actual browser timings. Never modifies catalogue, R2 or UI.
*/
const { chromium } = require("playwright");
const base = process.env.VITRUVIUS_BASE_URL || "https://vitruvius-digital-library.org";
const cases = [
  {name:"Vitruvia: symmetria", path:"/vitruvia?q=symmetria", ready:"#query", result:"#result-state"},
  {name:"Vitruvia: Vitruvius",path:"/vitruvia?q=Vitruvio",ready:"#query",result:"#result-state"},
  {name:"Bibliotheca",path:"/bibliotheca-graeca-latina",ready:"body",result:"body"},
  {name:"Lexicon: numen",path:"/vitruvia-lexicon?q=numen&mode=palabra&lang=es",ready:"body",result:"body"},
  {name:"Lexicon: symmetria",path:"/vitruvia-lexicon?q=symmetria&mode=palabra&lang=es",ready:"body",result:"body"},
];
const browser = await chromium.launch({headless:true});
const output = [];
for(const c of cases){
  const context=await browser.newContext({locale:"es-AR"});
  const page=await context.newPage();
  const errors=[],badRequests=[];
  page.on("pageerror",e=>errors.push(String(e.message||e).slice(0,350)));
  page.on("response",r=>{const url=r.url();if(url.startsWith(base)&&r.status()>=400)badRequests.push({status:r.status(),url});});
  const started=Date.now();let response,readyMs=null,resultMs=null,error=null,observed="";
  try{
    response=await page.goto(base+c.path,{waitUntil:"domcontentloaded",timeout:25000});
    await page.locator(c.ready).first().waitFor({timeout:12000});
    readyMs=Date.now()-started;
    if(c.name.startsWith("Vitruvia")){
      await page.waitForFunction(()=>{
        const t=document.querySelector("#result-state")?.textContent||"";
        return /Búsqueda finalizada|fuentes procesadas|identidad documentada|Identidad documentada|índice no disponible|Índice no disponible/i.test(t);
      },null,{timeout:15000}).catch(()=>{});
    }else{
      await page.waitForTimeout(3000); // Lexicon/Bibliotheca are client-side: allow indexes to settle.
    }
    resultMs=Date.now()-started;
    observed=(await page.locator(c.result).first().innerText().catch(()=>"")).slice(0,450);
  }catch(e){error=String(e.message||e).slice(0,400)}
  const nav=await page.evaluate(()=>{const n=performance.getEntriesByType("navigation")[0];return n?{ttfbMs:Math.round(n.responseStart),domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),loadMs:Math.round(n.loadEventEnd)}:null}).catch(()=>null);
  output.push({case:c.name,url:base+c.path,httpStatus:response?.status()??null,readyMs,resultMs,nav,observed,pageErrors:errors,failedLocalAssets:badRequests,error});
  console.log(JSON.stringify(output.at(-1)));
  await context.close();
}
await browser.close();
const {writeFileSync,mkdirSync}=await import("node:fs");
mkdirSync("audit-output",{recursive:true});
writeFileSync("audit-output/vitruvius-browser-smoke.json",JSON.stringify({checkedAt:new Date().toISOString(),results:output},null,2)+"\n");
const hardFailures=output.filter(x=>!x.httpStatus||x.httpStatus>=400||x.error||x.pageErrors.length||x.failedLocalAssets.length);
const slow=output.filter(x=>(x.resultMs??0)>15000);
console.log(JSON.stringify({failed:hardFailures.length,slowOver15s:slow.length,cases:output.length}));
if(hardFailures.length)process.exitCode=1;
