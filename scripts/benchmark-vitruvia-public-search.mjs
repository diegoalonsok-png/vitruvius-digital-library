#!/usr/bin/env node
/** Browser-level academic search benchmark on the PUBLIC Vitruvia site.
 * Separate server render, first result, stabilization, sources, and identity.
 * Reports observations, not ground-truth precision, and never fabricates ranking scores.
 */
import {chromium} from "playwright";
import {mkdirSync,writeFileSync} from "node:fs";
const BASE="https://diegoalonsok-png.github.io/vitruvius-digital-library/vitruvia.html";
const testCases=[
 {term:"Akhenaten",type:"egyptian-person",aliases:["Akhenaten","Akenatón","Ajenatón","Akhenatón"]},
 {term:"Cicerón",type:"classical-person",aliases:["Cicerón","Cicero"]},
 {term:"Vitruvio",type:"classical-person",aliases:["Vitruvio","Vitruvius"]},
 {term:"Jorje Luis Borjes",type:"typo-multiword",aliases:["Jorge Luis Borges","Borges"]},
 {term:"The Rolling Stones",type:"music-group",aliases:["Rolling Stones"]},
 {term:"numerus",type:"latin-word",aliases:["numerus","número"]},
 {term:"domus",type:"latin-word",aliases:["domus","casa"]},
 {term:"Frontino",type:"ancient-author",aliases:["Frontino","Frontinus"]},
 {term:"Platon",type:"ancient-author",aliases:["Platón","Plato","Platon"]},
 {term:"Panteón de Roma",type:"architecture",aliases:["Panteón","Pantheon"]},
 {term:"Nilo",type:"geography",aliases:["Nilo","Nile"]},
 {term:"Julius Caesar",type:"historical-person",aliases:["Julius Caesar","Julio César","César"]}
];
const browser=await chromium.launch({headless:true});
const now=new Date().toISOString(),report={schema:"vitruvia-public-query-benchmark-v1",date:now,
 origin:"GitHub Actions Chromium · hosted Vitruvia · one cold navigation per query",
 caveat:"No son estadísticas de usuarios reales ni evaluación independiente de veracidad. Las coincidencias de nombre son pistas de relevancia, no un juicio filológico. Fuentes externas pueden tener disponibilidad variable.",
 queries:[],failures:[]};
const norm=t=>String(t||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const take=()=>Date.now();
const ms=(start,end)=>end===null?null:end-start;
async function audit(c){
 const context=await browser.newContext({viewport:{width:1365,height:900},locale:"es-AR"});
 const page=await context.newPage(),errors=[],http=[];
 page.on("pageerror",e=>errors.push(e.message.slice(0,160)));
 page.on("response",r=>{if(r.status()>=400&&r.url().startsWith("https://diegoalonsok-png.github.io/vitruvius-digital-library/"))http.push(r.status()+" "+r.url().slice(0,150))});
 const url=BASE+"?q="+encodeURIComponent(c.term)+"&mode=all";
 const start=take(),row={term:c.term,type:c.type,url,expectedIdentity:c.aliases,code:null,domMs:null,loadMs:null,ttfbMs:null,firstResultMs:null,settledMs:null,firstResultTitles:[],results:0,articleExcerpt:"",sourceLinks:0,academicLinks:0,rightRail:{visible:false,width:0,hasContent:false},hadExpectedIdentity:null,jsErrors:[],internalHTTPFailures:[],error:null};
 try{
  const r=await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});row.code=r?.status()||null;
  const nav=await page.evaluate(()=>{const x=performance.getEntriesByType("navigation")[0];return {dom:x?.domContentLoadedEventEnd,load:x?.loadEventEnd,ttfb:x?.responseStart-x?.requestStart}});
  row.domMs=Math.round(nav.dom||0);row.ttfbMs=Math.round(nav.ttfb||0);
  await page.waitForFunction(()=>{
   const a=document.querySelector("#result-list")?.textContent||"";
   const b=document.querySelector("#article-body")?.textContent||"";
   const cards=document.querySelectorAll("#result-list .result-card").length;
   return cards>0||b.trim().length>120||/No hay resultados|Sin resultados|No confirmed|Aucun résultat/i.test(a);
  },{timeout:17000}).then(()=>{row.firstResultMs=ms(start,take())}).catch(()=>{});
  await page.waitForTimeout(2200);
  row.settledMs=ms(start,take());
  row.loadMs=Math.round((await page.evaluate(()=>performance.getEntriesByType("navigation")[0]?.loadEventEnd||0))||0);
  const result=await page.evaluate(()=>{
   const rail=document.querySelector("#vitruvia-context"),rr=rail?.getBoundingClientRect();
   const article=document.querySelector("#article-body");
   const titles=[...document.querySelectorAll("#result-list .result-card h3, #result-list .result-card h2")].slice(0,8).map(e=>e.textContent.trim());
   return {titles,resultCount:document.querySelectorAll("#result-list .result-card").length,
    preview:(document.querySelector("#result-list")?.innerText||"").slice(0,350),
    article:(article?.textContent||"").trim().slice(0,420),
    sourceLinks:document.querySelectorAll("#source-links a, #article-sources a").length,
    academicLinks:document.querySelectorAll("#vitruvia-academic-links a, .academic-pill").length,
    rail:{visible:!!rail&&!rail.hidden&&!!rr&&rr.width>0,width:Math.round(rr?.width||0),hasContent:(rail?.textContent||"").trim().length>40}
   };
  });
  row.firstResultTitles=result.titles;row.results=result.resultCount;
  row.preview=result.preview;row.articleExcerpt=result.article;
  row.sourceLinks=result.sourceLinks;row.academicLinks=result.academicLinks;row.rightRail=result.rail;
  const text=norm([result.article,result.preview,...result.titles].join(" "));
  row.hadExpectedIdentity=c.aliases.some(v=>text.includes(norm(v)));
 }catch(e){row.error=String(e.message||e).slice(0,400)}
 finally{row.jsErrors=errors;row.internalHTTPFailures=[...new Set(http)];await context.close()}
 return row;
}
try{
 for(let i=0;i<testCases.length;i+=3){
  const batch=await Promise.all(testCases.slice(i,i+3).map(audit));
  report.queries.push(...batch);
  console.log("BENCH_BATCH "+JSON.stringify(batch.map(r=>({q:r.term,code:r.code,dom:r.domMs,first:r.firstResultMs,results:r.results,identity:r.hadExpectedIdentity,errors:r.jsErrors.length,internalHTTP:r.internalHTTPFailures.length}))));
 }
 const numeric=(field)=>report.queries.map(x=>x[field]).filter(x=>Number.isFinite(x)).sort((a,b)=>a-b);
 const percentile=(field,p)=>{const a=numeric(field);return a.length?a[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:null};
 report.summary={
  queries:report.queries.length,http200:report.queries.filter(q=>q.code===200).length,
  noJsErrors:report.queries.filter(q=>!q.jsErrors.length).length,
  firstResultObserved:report.queries.filter(q=>q.firstResultMs!==null).length,
  identityHeuristicMatches:report.queries.filter(q=>q.hadExpectedIdentity).length,
  p50DomMs:percentile("domMs",.5),p95DomMs:percentile("domMs",.95),
  p50FirstResultMs:percentile("firstResultMs",.5),p95FirstResultMs:percentile("firstResultMs",.95),
  noInternalHttpFailures:report.queries.filter(q=>!q.internalHTTPFailures.length).length
 };
 for(const r of report.queries){
  if(r.code!==200||r.jsErrors.length||r.internalHTTPFailures.length||r.error)report.failures.push({term:r.term,error:r.error,code:r.code,jsErrors:r.jsErrors,http:r.internalHTTPFailures});
 }
 console.log("BENCH_SUMMARY "+JSON.stringify(report.summary));
 console.log("BENCH_MISSES "+JSON.stringify(report.queries.filter(r=>!r.hadExpectedIdentity).map(r=>({term:r.term,first:r.firstResultTitles,preview:r.preview?.slice(0,130)}))));
}finally{
 await browser.close();
 mkdirSync("reports",{recursive:true});
 writeFileSync("reports/vitruvia-search-benchmark.json",JSON.stringify(report,null,2)+"\n");
 if(report.failures.length)process.exitCode=1;
}
