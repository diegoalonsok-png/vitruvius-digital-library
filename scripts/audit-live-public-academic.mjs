#!/usr/bin/env node
/**
 * Real browser audit of the PUBLISHED GitHub Pages site, from GitHub Actions.
 * Distinguishes document HTTP/paint/search timings from local textual verification.
 * No books or artefacts are uploaded to the site.
 */
import {chromium} from "playwright";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import assert from "node:assert/strict";
const URL_ROOT="https://diegoalonsok-png.github.io/vitruvius-digital-library/";
const cases=[
 ["Portada","index.html"],
 ["Vitruvia · Akenatón","vitruvia.html?q=Akhenaten&mode=all"],
 ["Lexicon · numerus","vitruvia-lexicon.html?q=numerus"],
 ["Bibliotheca","bibliotheca-graeca-latina.html"],
 ["Indices locorum","indices-locorum.html"],
 ["Lector clásico","classics-text-reader.html?work=caesar-gallico&lang=la&locus=1.1"],
 ["Versiones enfrentadas","classics-parallel-reader.html?work=seneca-de-brevitate&left=la&right=es"]
];
const report={schema:"vitruvius-public-browser-academic-v1",created:new Date().toISOString(),
 source:"GitHub-hosted headless Chromium, network to public GitHub Pages",
 caveat:"Un agente de GitHub Actions no reproduce la red del usuario ni certifica la exactitud filológica. Las mediciones incluyen sólo esta región y contexto del navegador.",
 pages:[],interactions:[],academicChecks:[],failures:[]};
const browser=await chromium.launch({headless:true});
const contexts=[],pages=[];
const round=n=>Number.isFinite(n)?Math.round(n*10)/10:null;
const elapsed=t=>round(performance.now()-t);
const check=(name,fn)=>fn().then(v=>report.interactions.push({name,status:"pass",...v})).catch(e=>{
 report.interactions.push({name,status:"fail",error:String(e.message||e).slice(0,450)});
 report.failures.push(name+": "+String(e.message||e).slice(0,230));
});
async function visit(name,path){
 const context=await browser.newContext({viewport:{width:1440,height:900},locale:"es-AR",ignoreHTTPSErrors:false});
 contexts.push(context);const page=await context.newPage();pages.push(page);
 const errors=[],badResponses=[];
 page.on("pageerror",e=>errors.push(e.message.slice(0,170)));
 page.on("response",r=>{if(r.status()>=400&&r.url().startsWith(URL_ROOT))badResponses.push(r.status()+" "+r.url().slice(URL_ROOT.length,URL_ROOT.length+160))});
 let response=null,navWall=null,err=null;
 const t=performance.now();
 try{response=await page.goto(URL_ROOT+path,{waitUntil:"domcontentloaded",timeout:45000});navWall=elapsed(t);
  await page.waitForLoadState("load",{timeout:12000}).catch(()=>{});
  await page.waitForTimeout(700);
 }catch(e){err=String(e.message).slice(0,280)}
 const perf=await page.evaluate(()=>{
  const n=performance.getEntriesByType("navigation")[0];
  if(!n)return {};
  return {redirectMs:n.redirectEnd-n.redirectStart,dnsMs:n.domainLookupEnd-n.domainLookupStart,
   connectMs:n.connectEnd-n.connectStart,ttfbMs:n.responseStart-n.requestStart,
   domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd>0?n.loadEventEnd:null,
   transferBytes:n.transferSize,decodedBodyBytes:n.decodedBodySize};
 }).catch(()=>({}));
 const data={name,path,code:response?.status()??null,navigationWallMs:navWall,
  timing:Object.fromEntries(Object.entries(perf).map(([k,v])=>[k,round(v)])),
  pageErrors:errors,internalHTTPFailures:[...new Set(badResponses)].slice(0,20),error:err};
 report.pages.push(data);
 if(err||data.code!==200||badResponses.length||errors.length)report.failures.push(
  name+": "+(err||"HTTP "+data.code)+" / pageErrors "+errors.length+" / internal HTTP errors "+badResponses.length);
 return page;
}
try{
 for(const [name,path] of cases)await visit(name,path);
 const root=Object.fromEntries(cases.map(([name],i)=>[name,pages[i]]));
 // Bibliotheca: real dropdown and chronological work selection.
 await check("Bibliotheca · catálogo completo y desplegables",async()=>{
  const p=root.Bibliotheca,t=performance.now();
  await p.waitForFunction(()=>document.querySelectorAll("#classic-work option").length>=223,{timeout:27000});
  const initial=await p.evaluate(()=>({
   works:document.querySelectorAll("#classic-work option").length,
   era:document.querySelectorAll("#classic-era option").length,
   genre:document.querySelectorAll("#classic-genre option").length,
   selected:document.querySelector("#classic-work").value
  }));
  assert(initial.works>=223,"El catálogo no cargó 222 obras más selector general");
  assert(initial.era>=2&&initial.genre>=2,"Los filtros de fecha/género no tienen opciones");
  await p.locator("#classic-work").selectOption("caesar-gallico");
  assert.equal(await p.locator("#classic-work").inputValue(),"caesar-gallico");
  return{latencyMs:elapsed(t),...initial};
 });
 await check("Bibliotheca · traducción de interfaz ES/EN/FR",async()=>{
  const p=root.Bibliotheca,t=performance.now();
  const labels=[];
  for(let i=0;i<3;i++){labels.push((await p.locator("#language-toggle").innerText()).trim());await p.locator("#language-toggle").click()}
  assert.deepEqual(labels,["Idioma · ES","Language · EN","Langue · FR"]);
  return{latencyMs:elapsed(t),labels};
 });
 await check("Bibliotheca · búsqueda literal Gallia, César",async()=>{
  const p=root.Bibliotheca,t=performance.now();
  await p.locator("#classic-work").selectOption("caesar-gallico");
  await p.locator("#classic-query").fill("Gallia");
  await p.locator("#search-submit").click();
  await p.waitForFunction(()=>document.querySelector("#classic-results")?.textContent?.includes("Gallia") &&
    document.querySelector("#search-status")?.textContent?.length>10,{timeout:50000});
  const result=await p.evaluate(()=>({snippet:document.querySelector("#classic-results")?.innerText.slice(0,1200),
    status:document.querySelector("#search-status")?.textContent?.slice(0,220),
    links:[...document.querySelectorAll("#classic-results a")].slice(0,6).map(a=>({text:a.textContent.trim(),href:a.href}))}));
  assert(/Gallia/.test(result.snippet),"No aparece la cita original buscada");
  assert(/Caesar|César|1\.1|Gall/i.test(result.snippet),"No hay contexto suficiente de César");
  return{latencyMs:elapsed(t),...result};
 });
 await check("Lexicon · palabra numerus y obras",async()=>{
  const p=root["Lexicon · numerus"],t=performance.now();
  await p.waitForFunction(()=>document.querySelector("#lx-q")&&
    (document.querySelector("#lx-entry")?.textContent?.trim().length>80||
    document.querySelector("#lx-results")?.textContent?.trim().length>200),{timeout:50000});
  const result=await p.evaluate(()=>({
   language:document.querySelector("#lx-lang")?.value,workSelector:document.querySelector("#lx-work")?.options.length,
   entry:document.querySelector("#lx-entry")?.textContent?.slice(0,500),
   results:document.querySelector("#lx-results")?.textContent?.slice(0,750),
   translationControl:!!document.querySelector("#lx-library-translation-lang")
  }));
  assert(result.entry||result.results,"No hay resultados ni ficha lexicográfica");
  assert(result.translationControl,"Falta selector de traducciones");
  return{latencyMs:elapsed(t),...result};
 });
 await check("Indices locorum · alfabeto, agrupamiento, griego",async()=>{
  const p=root["Indices locorum"],t=performance.now();
  await p.waitForFunction(()=>document.querySelector("#index-entries")?.children.length>0,{timeout:25000});
  const state=await p.evaluate(()=>({
   alphabet:document.querySelector("#index-alphabet")?.textContent?.slice(0,150),
   groups:document.querySelector("#index-grouping")?.options.length,
   books:document.querySelector("#index-book")?.options.length,
   grecian:!!document.querySelector("#index-greek-policy")
  }));
  assert(state.alphabet.includes("A")&&state.alphabet.includes("Z"),"Abecedario latino incompleto");
  assert(state.groups>=2&&state.books>=2,"Los desplegables no contienen opciones");
  await p.locator("#index-query").fill("domus");
  await p.waitForTimeout(600);
  const sample=await p.locator("#index-entries").innerText();
  assert(/domus/i.test(sample),"No hay ficha para domus");
  return{latencyMs:elapsed(t),...state,domusExcerpt:sample.slice(0,550)};
 });
 await check("Lector clásico · locus exacto de César",async()=>{
  const p=root["Lector clásico"],t=performance.now();
  await p.waitForFunction(()=>document.querySelector("#passages")?.textContent?.includes("Gallia est omnis divisa"),{timeout:27000});
  const text=await p.locator("#passages").innerText();
  assert(text.includes("Gallia est omnis divisa"),"No se abrió el pasaje latino atestiguado");
  return{latencyMs:elapsed(t),snippet:text.slice(0,300)};
 });
 await check("Lector enfrentado · latín/español y controles de búsqueda",async()=>{
  const p=root["Versiones enfrentadas"],t=performance.now();
  await p.waitForFunction(()=>document.querySelector("#left")?.options.length>=2&&
   document.querySelector("#right")?.options.length>=2,{timeout:35000});
  const state=await p.evaluate(()=>({left:document.querySelector("#left")?.value,
   right:document.querySelector("#right")?.value,iframeCount:document.querySelectorAll("iframe").length,
   separateSearch:!!document.querySelector("#left-query")&&!!document.querySelector("#right-query")}));
  assert.equal(state.left,"la");assert.equal(state.right,"es");assert.equal(state.iframeCount,2);
  assert(state.separateSearch);
  await p.locator("#left-query").fill("vita");
  await p.locator("#right-query").fill("vida");
  await p.locator("#parallel-find").click();
  return{latencyMs:elapsed(t),...state};
 });
 await check("Vitruvia · geometría académica y jeroglíficos",async()=>{
  const p=root["Vitruvia · Akenatón"],t=performance.now();
  await p.waitForFunction(()=>Number(document.querySelector("#metric-works")?.textContent)>=200,{timeout:35000});
  const state=await p.evaluate(()=>{
   const rect=id=>{const x=document.querySelector(id);if(!x)return null;const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
   const script=document.querySelector("#v-egypt-script-panel"),context=document.querySelector("#vitruvia-context");
   return {works:document.querySelector("#metric-works")?.textContent,
    article:rect("#vitruvia-article"),articleBody:rect("#article-body"),
    rail:rect("#vitruvia-context"),egyptPanel:!!script,
    glyphs:[...(script?.textContent||"")].filter(c=>/[\u{13000}-\u{1342F}]/u.test(c)).length,
    resultSnippet:document.querySelector("#result-list")?.innerText.slice(0,250),
    railContent:context?.innerText.slice(0,350)};
  });
  assert(state.works,"No se cargó el catálogo");
  if(state.egyptPanel)assert(state.glyphs>=4,"La titulatura egipcia no contiene glifos Unicode suficientes");
  if(state.rail&&state.articleBody&&state.rail.w>0&&state.articleBody.w>0)
   assert(state.rail.x>=state.articleBody.x+state.articleBody.w-8,"La columna académica derecha se desplaza debajo del texto");
  return{latencyMs:elapsed(t),...state};
 });
 // Academic source control: same-locus alignment must not invent semantic correspondence.
 const read=path=>JSON.parse(readFileSync(path,"utf8"));
 const reg=read("data/classics-corpus/search-registry.json"),road=read("data/classics-corpus/indexation-roadmap-222.json");
 const pairs=read("data/classics-alignment/manifest.json");
 report.academicChecks.push({name:"Obras catalogadas",value:road.targetWorks,status:road.targetWorks===222?"pass":"fail"},
 {name:"Obras con índice original local o remoto",value:road.counts.effectiveOriginalsIndexed,status:"reported"},
 {name:"Versiones textuales locales",value:reg.entries.length,status:reg.entries.length===reg.count?"pass":"fail"},
 {name:"Pares con alineación semántica certificada",value:pairs.pairs.filter(p=>p.status==="verified-semantic-alignment").length,status:"reported"},
 {name:"Apuleyo: no atribuir equivalencias ficticias",value:pairs.pairs.filter(p=>p.workId==="apuleius-metamorphoses").map(p=>({sharedLoci:p.sharedLoci,status:p.status})),status:pairs.pairs.filter(p=>p.workId==="apuleius-metamorphoses").every(p=>p.sharedLoci===0)?"pass":"fail"});
 const benchmarkFixtures=read("data/academic-evaluation/search-fixtures.json");
 report.academicChecks.push({name:"Casos documentales definidos",value:benchmarkFixtures.cases.length,status:"reported"});
}finally{
 for(const page of pages)await page.close().catch(()=>{});
 for(const context of contexts)await context.close().catch(()=>{});
 await browser.close();
 mkdirSync("reports",{recursive:true});
 writeFileSync("reports/academic-live-browser.json",JSON.stringify(report,null,2)+"\n");
 const pageStats=report.pages.map(p=>({name:p.name,code:p.code,domMs:p.timing.domContentLoadedMs,loadMs:p.timing.loadMs,
  ttfbMs:p.timing.ttfbMs,browserNavMs:p.navigationWallMs,internal404:p.internalHTTPFailures.length,errors:p.pageErrors.length}));
 console.log("PUBLIC_PERFORMANCE "+JSON.stringify(pageStats));
 console.log("INTERACTIONS "+JSON.stringify(report.interactions.map(r=>({name:r.name,status:r.status,latencyMs:r.latencyMs,error:r.error}))));
 console.log("ACADEMIC_CHECKS "+JSON.stringify(report.academicChecks));
 console.log("TOTAL_FAILURES "+report.failures.length+" "+JSON.stringify(report.failures.slice(0,30)));
 if(report.failures.length)process.exitCode=1;
}
