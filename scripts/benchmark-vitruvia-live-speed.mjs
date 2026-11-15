#!/usr/bin/env node
/* Public Vitruvia speed audit. Reports observations, never substitutes a
   successful CI exit for a fast search or mislabels network failures as zero. */
import { chromium } from "playwright";
import {mkdirSync,writeFileSync} from "node:fs";
const sites=[
 {site:"Cloudflare",url:"https://vitruvius-digital-library.org/vitruvia.html"},
 {site:"GitHub Pages",url:"https://diegoalonsok-png.github.io/vitruvius-digital-library/vitruvia.html"}
];
const cases=[
 {label:"locus textual",query:"locus 1.1.1"},
 {label:"léxico",query:"symmetria"},
 {label:"arquitectura",query:"Palladio"}
];
mkdirSync("reports",{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{})});
const results=[];
async function run(site,c){
 const ctx=await browser.newContext({locale:"es-AR",viewport:{width:1366,height:768},serviceWorkers:"block"});
 const page=await ctx.newPage();
 const errors=[],bad=[];
 page.on("pageerror",e=>errors.push(e.message.slice(0,140)));
 page.on("response",r=>{if(r.status()>=400&&r.url().startsWith(new URL(site.url).origin))bad.push({status:r.status(),url:r.url().slice(0,150)})});
 const t=Date.now(),record={site:site.site,url:site.url,query:c.query,kind:c.label,status:null,ttfbMs:null,domReadyMs:null,firstContentMs:null,observedResults:null,transferredKb:null,errors:[],httpFailures:[],failure:null};
 try{
  const url=site.url+"?q="+encodeURIComponent(c.query)+"&mode=all";
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:18000});
  record.status=response?.status()??null;
  const timings=await page.evaluate(()=>{
   const n=performance.getEntriesByType("navigation")[0];
   return {ttfb:n?.responseStart-n?.requestStart,dom:n?.domContentLoadedEventEnd,transfer:performance.getEntriesByType("resource").reduce((a,x)=>a+(x.transferSize||0),0)}
  });
  record.ttfbMs=Math.round(timings.ttfb||0);
  record.domReadyMs=Math.round(timings.dom||0);
  try{
   await page.waitForFunction(()=>{
    const list=document.querySelector("#result-list");
    const cards=list?.querySelectorAll(".result-card, article.result, [data-result-id]")?.length||0;
    const article=document.querySelector("#article-body")?.textContent?.trim()||"";
    return cards>0||article.length>=120;
   },null,{timeout:11000,polling:100});
   record.firstContentMs=Date.now()-t;
  }catch{record.failure="No visible result within 11s after DOM ready";}
  record.observedResults=await page.locator("#result-list .result-card").count();
  const bytes=await page.evaluate(()=>performance.getEntriesByType("resource").reduce((a,x)=>a+(x.transferSize||0),0));
  record.transferredKb=Math.round(bytes/1024);
 }catch(e){record.failure=String(e.message||e).slice(0,240)}
 finally{record.errors=errors;record.httpFailures=bad;await ctx.close()}
 return record;
}
try{
 for(const site of sites){
  // Concurrent queries model separate cold users, not a warmed cache.
  const rows=await Promise.all(cases.map(c=>run(site,c)));
  results.push(...rows);
  for(const r of rows)console.log("SPEED "+JSON.stringify(r));
 }
}finally{await browser.close()}
const good=results.filter(r=>r.firstContentMs!==null);
const percentile=(xs,p)=>xs.length?xs.slice().sort((a,b)=>a-b)[Math.min(xs.length-1,Math.ceil(p*xs.length)-1)]:null;
const summary={total:results.length,measured:good.length,unavailable:results.length-good.length,firstContentP50Ms:percentile(good.map(r=>r.firstContentMs),.5),firstContentMaxMs:good.length?Math.max(...good.map(r=>r.firstContentMs)):null,firstContentOverTenSeconds:good.filter(r=>r.firstContentMs>10000).length};
console.log("SPEED_SUMMARY "+JSON.stringify(summary));
writeFileSync("reports/vitruvia-live-speed.json",JSON.stringify({schema:"vitruvia-live-speed-v2",description:"Six Chromium cold navigations. firstContentMs measures first article content (>120 chars) OR a result card; observedResults reports separate result cards. It does not certify a matching passage. Runner observations, not user RUM nor global benchmark.",summary,results},null,2)+"\n");
if(results.some(r=>r.status!==200||r.firstContentMs===null))process.exitCode=1;
