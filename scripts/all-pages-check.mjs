// Visita las páginas sin red externa y falla por errores de JS. Hasta cuatro páginas
// simultáneas para evitar los largos tiempos de una comprobación secuencial.
// Las páginas HTML, folios, visores y archivos del sitio no se alteran.
import {chromium} from "playwright";
import fs from "node:fs";
import {mkdirSync,writeFileSync} from "node:fs";
const base=process.env.BASE||"http://127.0.0.1:8766/";
const pages=fs.readdirSync(".").filter(f=>f.endsWith(".html")&&!f.startsWith("google"));
const browser=await chromium.launch();
const results=new Array(pages.length);
let cursor=0;
async function worker(){
 while(true){
  const index=cursor++;
  if(index>=pages.length)break;
  const filename=pages[index];
  const page=await browser.newPage();
  const errs=[],miss=[];
  page.on("pageerror",e=>errs.push(String(e.stack||e.message).slice(0,460)));
  page.on("response",r=>{
   if(r.url().startsWith(base)&&r.status()>=400)
    miss.push(r.status()+" "+r.url().replace(base,""));
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  let timing=null,controls=null;
  try{
   // DOM-ready reflects usable navigation; resource load is recorded separately.
   await page.goto(base+filename,{waitUntil:"domcontentloaded",timeout:25000});
   await page.waitForTimeout(1200);
   const observed=await page.evaluate(()=>{
    const nav=performance.getEntriesByType("navigation")[0];
    const controlList=[...document.querySelectorAll("button, input[type=button], input[type=submit], [role=button]")];
    const visible=x=>{const r=x.getBoundingClientRect(),st=getComputedStyle(x);return r.width>0&&r.height>0&&st.display!=="none"&&st.visibility!=="hidden"};
    const unnamed=controlList.filter(x=>visible(x)&&!(x.innerText||x.value||x.getAttribute("aria-label")||x.getAttribute("title")||"").trim());
    return {
     timing:{domContentLoadedMs:Math.round(nav?.domContentLoadedEventEnd||0),loadMs:nav?.loadEventEnd?Math.round(nav.loadEventEnd):null,ttfbMs:Math.round((nav?.responseStart||0)-(nav?.requestStart||0)),resourceRequests:performance.getEntriesByType("resource").length},
     controls:{total:controlList.length,visible:controlList.filter(visible).length,unlabeled:unnamed.slice(0,12).map(x=>x.outerHTML.slice(0,180)),disabled:controlList.filter(x=>x.disabled).length}
    };
   });
   timing=observed.timing;controls=observed.controls;
  }catch(e){errs.push("LOAD "+e.message.slice(0,140))}
  finally{await page.close()}
  results[index]={filename,errs:[...new Set(errs)],miss:[...new Set(miss)],timing,controls};
 }
}
await Promise.all(Array.from({length:Math.min(4,pages.length)},()=>worker()));
await browser.close();
let failed=0,missing=0;
for(const r of results){
 if(r.errs.length)failed++;
 if(r.miss.length)missing++;
 if(r.errs.length||r.miss.length)
  console.log(r.filename,"\n  ",r.errs.join("\n   "),"\n  ",r.miss.slice(0,6).join("\n   "));
}
const valid=results.filter(r=>r.timing);
const sorted=[...valid].sort((a,b)=>b.timing.domContentLoadedMs-a.timing.domContentLoadedMs);
const at=p=>{const a=[...valid].map(x=>x.timing.domContentLoadedMs).sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:null};
const totals=results.reduce((acc,r)=>{acc.buttons+=r.controls?.total||0;acc.unlabeled+=r.controls?.unlabeled?.length||0;return acc},{buttons:0,unlabeled:0});
const report={schema:"vitruvius-all-pages-performance-v1",date:new Date().toISOString(),origin:"localhost Chromium GitHub Actions, external HTTP requests blocked",pageCount:pages.length,checked:valid.length,jsErrorPages:failed,missingLocalResourcePages:missing,p50DomMs:at(.5),p95DomMs:at(.95),slowest:sorted.slice(0,25).map(r=>({page:r.filename,...r.timing})),buttonsFound:totals.buttons,unlabeledVisibleControls:totals.unlabeled,pages:results};
mkdirSync("reports",{recursive:true});
writeFileSync("reports/all-pages-performance.json",JSON.stringify(report,null,2)+"\n");
console.log("checked",pages.length,"pages ·",failed,"with JavaScript errors ·",missing,"with local HTTP errors");
console.log("DOM readiness p50/p95:",report.p50DomMs,"/",report.p95DomMs,"ms ·",totals.buttons,"controls inventoried ·",totals.unlabeled,"visible controls missing a name");
console.log("Slowest pages:",JSON.stringify(report.slowest.slice(0,10)));
console.log("Control accessibility is a static runtime inspection, not proof every button action works.");
// An internal 404 also invalidates a page even without a pageerror.
if(failed||missing)process.exitCode=1;
