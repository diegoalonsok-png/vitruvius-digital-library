#!/usr/bin/env node
/**
 * 50-query browser benchmark of the PUBLISHED Vitruvia site.
 * Read-only; results from Chromium on GitHub Actions, NOT a user's device.
 */
import { chromium } from "playwright";
import { mkdirSync,writeFileSync } from "node:fs";

const queries=[
"Vitruvio","Estrabón","Platón","Aristóteles","Sófocles","Homero","Heródoto","Tucídides",
"Julio César","Cicerón","Séneca","Lucrecio","Ovidio","Virgilio","Tácito","Plinio",
"Ptolomeo","Euclides","Hipócrates","Galeno","Alejandro Magno","Roma","Atenas","Egipto",
"Alejandría","acueducto","domus","symmetria","proportio","eurythmia","logos",
"ἀρχιτεκτονική","λόγος","ἀρετή","ἱστορία","Codex H","Harley 2767","Gudianus 69",
"Cesariano","Barbaro 1567","Vitruvia Lexicon","De architectura","Geografía",
"La Ilíada","The Beatles","Rolling Stones","Radiohead","Nirvana",
"Dark Side of the Moon","Bohemian Rhapsody"];
if(queries.length!==50)throw Error("Baseline must retain exactly 50 queries");
const extraQueries=["Akenatón","Tutankamón","Ramsés II","Hatshepsut","Imhotep","titulatura real egipcia","Gran Templo de Atón","Hammurabi","Gilgamesh","Enheduanna","guerra del Peloponeso","guerras médicas","Pausanias","Polibio","Marco Aurelio","Epicteto","Plotino","Porfirio","Proclo","alegoría de la caverna","motor inmóvil","causa final","ley natural","animal político","teoría humoral","cuatro humores","anatomía del cuerpo humano","teorema de Pitágoras","sección áurea","orden dórico","bóveda de cañón","inscripción funeraria","variante manuscrita","lectio varia","resurrección de los muertos","Concilio de Nicea","Ireneo de Lyon","Evangelio de Tomás","ἀνάστασις νεκρῶν","τέλος","ius naturale","Vitruvio 1.3.2","Vitruvio 7.7.2","Krohn 1912","Rose 1899","Leon Battista Alberti","Palladio","Le Corbusier","Mies van der Rohe","zzzxqjkv"];
const target=process.env.VITRUVIA_BENCHMARK_COUNT==="100"?100:50;
if(target===100)queries.push(...extraQueries);
if(queries.length!==target||new Set(queries).size!==target)throw Error("Unexpected or duplicate benchmark queries");
const round=n=>Number.isFinite(n)?Math.round(n*10)/10:null;
const arrStats=xs=>{const n=xs.filter(Number.isFinite).sort((a,b)=>a-b);if(!n.length)return {measured:0,avg:null,median:null,p90:null,min:null,max:null};const avg=n.reduce((s,v)=>s+v,0)/n.length;return{measured:n.length,avg:round(avg),median:round(n[Math.floor((n.length-1)/2)]),p90:round(n[Math.ceil(.9*n.length)-1]),min:round(n[0]),max:round(n.at(-1))}};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const context=await browser.newContext({viewport:{width:1366,height:820},locale:"es-AR"});
const page=await context.newPage();
const rows=[];
const report={schema:target===100?"vdl-vitruvia-browser-100-v1":"vdl-vitruvia-browser-50-v1",timestamp:new Date().toISOString(),source:"Public website in GitHub Actions Chromium; region and network are not user-local",queries,rows,load:{},errors:[]};
try{
 const before=Date.now();
 const response=await page.goto("https://vitruvius-digital-library.org/vitruvia.html",{waitUntil:"domcontentloaded",timeout:45000});
 report.load.navigationWallMs=Date.now()-before;
 report.load.httpStatus=response?.status()||null;
 await page.locator("#query").waitFor({state:"visible",timeout:20000});
 report.load.timing=await page.evaluate(()=>{
  const n=performance.getEntriesByType("navigation")[0],paints=performance.getEntriesByType("paint");
  return {ttfbMs:n?Math.round(n.responseStart-n.requestStart):null,
   domContentLoadedMs:n?Math.round(n.domContentLoadedEventEnd):null,
   loadMs:n&&n.loadEventEnd?Math.round(n.loadEventEnd):null,
   fcpMs:Math.round(paints.find(x=>x.name==="first-contentful-paint")?.startTime||0)||null};
 });
 // Catalogue starts in idle time and is loaded in normal page lifecycle; this
 // makes repeated queries a warm-session sample, not fifty cold page loads.
 await page.waitForTimeout(1200);
 for(let i=0;i<queries.length;i++){
  const q=queries[i],entry={i:i+1,q,firstMs:null,completeMs:null,wallFirstMs:null,status:"unknown"};
  try{
   await page.locator("#query").fill(q,{timeout:4000});
   const t=Date.now();
   await page.locator("#query").press("Enter",{timeout:4000});
   try{
    await page.waitForFunction(()=>{const d=document.querySelector("#result-state")?.dataset||{};return Boolean(d.firstResultMs||d.completeMs);},null,{timeout:5000,polling:70});
   }catch{}
   entry.wallFirstMs=Date.now()-t;
   let d=await page.locator("#result-state").evaluate(el=>({first:el.dataset.firstResultMs,complete:el.dataset.completeMs}));
   entry.firstMs=d.first?Number(d.first):null;
   entry.completeMs=d.complete?Number(d.complete):null;
   if(entry.completeMs==null){
    try{await page.waitForFunction(()=>Boolean(document.querySelector("#result-state")?.dataset.completeMs),null,{timeout:1500,polling:100})}catch{}
    d=await page.locator("#result-state").evaluate(el=>({first:el.dataset.firstResultMs,complete:el.dataset.completeMs}));
    entry.firstMs=d.first?Number(d.first):entry.firstMs;
    entry.completeMs=d.complete?Number(d.complete):null;
   }
   entry.status=entry.firstMs!==null?"first-result":entry.completeMs!==null?"completed-no-results":"timeout-or-no-result";
  }catch(e){entry.status="error";entry.error=String(e).slice(0,150)}
  entry.sample=i<50?"baseline-50":"academic-extension-50";
  // Save titles for human relevance review, not an automatic scholarly score.
  if(entry.firstMs!==null)try{entry.topTitles=await page.locator(".result-card h3").allTextContents().then(v=>v.slice(0,5))}catch{}
  rows.push(entry);
  console.log("QUERY_"+String(i+1).padStart(2,"0")+" "+JSON.stringify(entry));
 }
 const summary={totalQueries:queries.length,
  cohorts:Object.fromEntries(["baseline-50","academic-extension-50"].map(name=>[name,{queries:rows.filter(x=>x.sample===name).length,first:arrStats(rows.filter(x=>x.sample===name).map(x=>x.firstMs)),completed:arrStats(rows.filter(x=>x.sample===name).map(x=>x.completeMs))}])),
  first:arrStats(rows.map(x=>x.firstMs)),
  completed:arrStats(rows.map(x=>x.completeMs)),
  wallToFirstObserved:arrStats(rows.map(x=>x.firstMs===null?null:x.wallFirstMs)),
  noFirstResult:rows.filter(x=>x.firstMs===null).length,
  noCompletion:rows.filter(x=>x.completeMs===null).length,
  errors:rows.filter(x=>x.status==="error").length,
  slowest:rows.filter(x=>x.firstMs!==null).sort((a,b)=>b.firstMs-a.firstMs).slice(0,5)};
 report.summary=summary;
 console.log(("VITRUVIA_"+target+"_BENCHMARK ")+JSON.stringify({load:report.load,...summary}));
}finally{
 await browser.close();
 mkdirSync("reports",{recursive:true});
 writeFileSync("reports/vitruvia-"+target+"-search-timings.json",JSON.stringify(report,null,2)+"\n");
}
