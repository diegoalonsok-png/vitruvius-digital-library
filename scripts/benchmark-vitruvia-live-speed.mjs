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
 {label:"locus textual",query:"locus 1.1.1",expected:["1.1.1"]},
 {label:"léxico",query:"symmetria",expected:["symmetria"]},
 {label:"arquitectura",query:"Palladio",expected:["palladio"]},
 {label:"autor latino",query:"Cicerón",expected:["cicerón","cicero"]},
 {label:"ingeniería romana",query:"Frontino",expected:["frontino","frontinus"]}
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
 const t=Date.now(),record={site:site.site,url:site.url,query:c.query,kind:c.label,status:null,ttfbMs:null,domReadyMs:null,firstContentMs:null,observedResults:null,transferredKb:null,firstEvidenceMs:null,expectedEvidence:c.expected,evidenceMatched:false,evidenceInArticle:false,evidenceInResults:false,sourceAnchors:0,topResultTitles:[],qualityNote:"Heuristic: matching a name/locus in result body is NOT independent factual, philological or attribution verification.",errors:[],httpFailures:[],failure:null};
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
  // Search accuracy cannot be deduced from HTTP 200 or the first article
  // paint. Look for each query's expected name/locus in ACTUAL content only,
  // not in the query input, headings, navigation or loading messages.
  const evidence=()=>page.evaluate(expected=>{
   const norm=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
   const textOf=e=>e?.textContent?.trim()||"";
   const article=document.querySelector("#article-body");
   const cards=[...document.querySelectorAll("#result-list .result-card")].slice(0,5);
   const matching=t=>expected.some(x=>norm(t).includes(norm(x)));
   const title=e=>e.querySelector("h3,h2,.result-title")?.textContent?.trim().slice(0,150)||"";
   return {articleMatch:matching(textOf(article)),resultsMatch:cards.some(c=>matching(textOf(c))),
    titles:cards.map(title).filter(Boolean),sourceLinks:document.querySelectorAll("#article-body a[href], #result-list .result-card a[href]").length};
  },c.expected);
  const evidenceStart=Date.now();
  let ev=await evidence();
  while(!ev.articleMatch&&!ev.resultsMatch&&Date.now()-evidenceStart<7000){
   await page.waitForTimeout(300);
   ev=await evidence();
  }
  record.firstEvidenceMs=ev.articleMatch||ev.resultsMatch?Date.now()-t:null;
  record.evidenceMatched=ev.articleMatch||ev.resultsMatch;
  record.evidenceInArticle=ev.articleMatch;
  record.evidenceInResults=ev.resultsMatch;
  record.sourceAnchors=ev.sourceLinks;
  record.topResultTitles=ev.titles;
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
const quality=results.filter(r=>r.evidenceMatched);
const summary={total:results.length,measured:good.length,unavailable:results.length-good.length,
 firstContentP50Ms:percentile(good.map(r=>r.firstContentMs),.5),
 firstContentMaxMs:good.length?Math.max(...good.map(r=>r.firstContentMs)):null,
 firstContentOverTenSeconds:good.filter(r=>r.firstContentMs>10000).length,
 expectedTermPresent:quality.length,missingExpectedTerm:results.filter(r=>!r.evidenceMatched).map(r=>({site:r.site,query:r.query,firstContentMs:r.firstContentMs})),
 evidenceP50Ms:percentile(quality.map(r=>r.firstEvidenceMs),.5)};
console.log("SPEED_SUMMARY "+JSON.stringify(summary));
writeFileSync("reports/vitruvia-live-speed.json",JSON.stringify({schema:"vitruvia-live-speed-relevance-v3",description:"Ten Chromium cold navigations. firstContentMs measures first article content or a result card; firstEvidenceMs measures a heuristic expected term in the article or top five cards. This is not independent source, philological, ranking, or scientific relevance verification. Runner observations, not user RUM.",summary,results},null,2)+"\n");
if(results.some(r=>r.status!==200||r.firstContentMs===null))process.exitCode=1;
