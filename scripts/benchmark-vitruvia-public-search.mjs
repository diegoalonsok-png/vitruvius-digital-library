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
const browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{})});
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

 // Extended cross-site audit: all root HTML pages, every visible button
 // inventory, plus representative real interactions on the site's searchers.
 // Never click unknown controls: they may download, print or alter user state.
 const SITE="https://diegoalonsok-png.github.io/vitruvius-digital-library/";
 const {readdirSync}=await import("node:fs");
 const allPages=readdirSync(".").filter(name=>name.endsWith(".html")&&!name.startsWith("google")).sort();
 const siteAudit={schema:"vitruvius-comprehensive-public-audit-v1",date:now,base:SITE,
  limits:"GitHub-hosted Chromium, not real-user monitoring. Button inventory is structural; only explicitly listed controls receive synthetic clicks. External APIs and cold-cache performance vary.",
  pages:[],searches:[],buttonTests:[],summary:{}};
 let pageCursor=0;
 async function scanPage(){
  while(pageCursor<allPages.length){
   const filename=allPages[pageCursor++];
   const context=await browser.newContext({viewport:{width:1365,height:900}});
   const p=await context.newPage(),errors=[],missing=[];
   p.on("pageerror",e=>errors.push(String(e.message).slice(0,200)));
   p.on("response",response=>{if(response.url().startsWith(SITE)&&response.status()>=400)missing.push(response.status()+" "+response.url().slice(SITE.length,150))});
   const start=Date.now();
   const item={page:filename,status:null,domMs:null,ttfbMs:null,buttons:0,disabledButtons:0,unnamedButtons:0,suspectButtons:[],internalMissing:[],jsErrors:[],error:null};
   try{
    const resp=await p.goto(SITE+filename,{waitUntil:"domcontentloaded",timeout:10000});
    item.status=resp?.status()||null;
    item.domMs=Date.now()-start;
    const observation=await p.evaluate(()=>{
     const nav=performance.getEntriesByType("navigation")[0];
     const controls=[...document.querySelectorAll("button,[role='button'],input[type='submit'],input[type='button']")];
     const label=c=>(c.getAttribute("aria-label")||c.getAttribute("title")||c.innerText||c.value||"").trim();
     return {ttfb:nav?.responseStart-nav?.requestStart,
      count:controls.length,disabled:controls.filter(c=>c.disabled).length,
      unnamed:controls.filter(c=>!c.disabled&&!label(c)).length,
      candidates:controls.filter(c=>!c.disabled&&!label(c)).slice(0,8).map(c=>({tag:c.tagName,id:c.id||"",className:String(c.className||"").slice(0,70)}))};
    });
    item.ttfbMs=Number.isFinite(observation.ttfb)?Math.round(observation.ttfb):null;
    item.buttons=observation.count;item.disabledButtons=observation.disabled;
    item.unnamedButtons=observation.unnamed;item.suspectButtons=observation.candidates;
    await p.waitForTimeout(450);
    // Only non-destructive theme, language, tab and disclosure controls.
    // Record observable state changes rather than claiming that all buttons work.
    const allowed=p.locator("button[aria-expanded],button[aria-pressed],button[data-theme],button[data-lang],button[data-tab]");
    let tested=0;
    for(let index=0;index<Math.min(allowed.count?await allowed.count():0,12)&&tested<2;index++){
     const control=allowed.nth(index);
     if(!await control.isVisible().catch(()=>false)||!await control.isEnabled().catch(()=>false))continue;
     const label=(await control.getAttribute("aria-label")||await control.innerText().catch(()=>"")).trim().slice(0,90);
     if(/eliminar|borrar|delete|remove|comprar|purchase|enviar|send|descargar|download|print|imprimir/i.test(label))continue;
     const state=()=>p.evaluate(()=>[document.documentElement.getAttribute("lang"),
      document.documentElement.getAttribute("data-theme"),document.body.className,
      [...document.querySelectorAll("button[aria-pressed],button[aria-expanded]")].slice(0,30)
       .map(b=>b.getAttribute("aria-pressed")+":"+b.getAttribute("aria-expanded")).join("|")].join("||"));
     const before=await state();let clickError=null;
     try{await control.click({timeout:1300});await p.waitForTimeout(100)}catch(e){clickError=String(e.message||e).slice(0,130)}
     const after=await state().catch(()=>before);
     siteAudit.buttonTests.push({page:filename,label,clicked:!clickError,stateChanged:before!==after,error:clickError});
     tested++;
    }
   }catch(error){item.error=String(error.message||error).slice(0,180)}
   finally{item.jsErrors=[...new Set(errors)].slice(0,8);item.internalMissing=[...new Set(missing)].slice(0,8);siteAudit.pages.push(item);await context.close()}
  }
 }
 await Promise.all(Array.from({length:5},scanPage));
 const searchCases=[
  {name:"Portada: concordancias",page:"index.html",field:"#query",form:"#search-form",query:"domus",ready:"#search-results mark.search-hit,#lexical-occurrences mark.lexical-query-hit"},
  {name:"Vitruvia: búsqueda general",page:"vitruvia.html",field:"#query",form:"#search-form",query:"domus",ready:"#result-list .result-card,#article-body"},
  {name:"Lexicon: literal latino",page:"vitruvia-lexicon.html",field:"#lx-q",form:"#lx-form",query:"domus",ready:"#lx-state"},
  {name:"Lexicon: literal griego",page:"vitruvia-lexicon.html",field:"#lx-q",form:"#lx-form",query:"λόγος",ready:"#lx-state"},
  {name:"Aparato crítico: índice textual",page:"aparato-critico.html",field:"#critical-query",form:"#critical-form",query:"domus",ready:"#critical-results .critical-result"},
  {name:"Aparato crítico: índice unificado",page:"aparato-critico.html",field:"#critical-unified-query",form:"#critical-unified-form",query:"domus",ready:"#critical-unified-results mark,#critical-unified-results article"},
  {name:"Bibliotheca: clásicos",page:"bibliotheca-graeca-latina.html",field:"#classic-query",form:"#search-form",query:"domus",ready:null},
  {name:"Índice locorum",page:"index-locorum.html",field:"#query",form:"#form",query:"domus",ready:null},
  {name:"Párrafos históricos",page:"buscador-parrafos-vitruvio.html",field:"#hp-query",form:"#hp-form",query:"symmetria",ready:null}
 ];
 let searchCursor=0;
 async function searchWorker(){
  while(searchCursor<searchCases.length){
   const c=searchCases[searchCursor++],context=await browser.newContext({viewport:{width:1365,height:900}});
   const p=await context.newPage();let jsErrors=[];p.on("pageerror",e=>jsErrors.push(String(e.message).slice(0,180)));
   const item={name:c.name,page:c.page,query:c.query,navDomMs:null,submitToResponseMs:null,firstMatchingNodes:null,
    controlPresent:false,jsErrors:[],error:null};
   try{
    await p.goto(SITE+c.page,{waitUntil:"domcontentloaded",timeout:16000});
    const timing=await p.evaluate(()=>performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd);
    item.navDomMs=Number.isFinite(timing)?Math.round(timing):null;
    const input=p.locator(c.field),form=p.locator(c.form);
    item.controlPresent=await input.count()>0&&await form.count()>0;
    if(!item.controlPresent)throw Error("Form/input missing");
    await input.fill(c.query);
    const before=await p.evaluate(()=>({text:document.body.innerText.length,html:document.body.innerHTML.length}));
    const started=Date.now();
    await form.evaluate(f=>f.requestSubmit());
    if(c.ready){
     await p.waitForFunction(({selector,baseLen})=>{
      const matches=document.querySelectorAll(selector);
      if(selector==="#lx-state"){
       const state=document.querySelector(selector)?.textContent||"";
       return /coincidenc|sin coincidencias|No se pudo completar|error/i.test(state);
      }
      if(selector==="#result-list .result-card,#article-body"){
       return document.querySelectorAll("#result-list .result-card").length>0||
        (document.querySelector("#article-body")?.textContent||"").trim().length>120;
      }
      return matches.length>0;
     },{selector:c.ready,baseLen:before.text},{timeout:13000});
    }else{
     await p.waitForFunction(before=>document.body.innerHTML.length!==before.html||
      document.body.innerText.length!==before.text,before,{timeout:13000});
    }
    item.submitToResponseMs=Date.now()-started;
    item.firstMatchingNodes=c.ready?await p.locator(c.ready).count():null;
    if(c.page==="aparato-critico.html"){
     const marks=p.locator("#critical-results p[lang='la'] mark,#critical-unified-results [lang='la'] mark");
     if(await marks.count()){
      await marks.first().click({timeout:4000});
      item.lexicalPopupVisible=await p.locator("#vitruvius-lexical-card:not([hidden])").isVisible().catch(()=>false);
     }
    }
   }catch(error){item.error=String(error.message||error).slice(0,280)}
   finally{item.jsErrors=jsErrors.slice(0,10);siteAudit.searches.push(item);await context.close()}
  }
 }
 await Promise.all(Array.from({length:3},searchWorker));
 const numbers=field=>siteAudit.searches.map(x=>x[field]).filter(Number.isFinite).sort((a,b)=>a-b);
 const pct=(field,p)=>{const a=numbers(field);return a.length?a[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:null};
 siteAudit.summary={
  rootPagesAudited:siteAudit.pages.length,totalVisibleButtons:siteAudit.pages.reduce((n,x)=>n+x.buttons,0),
  pagesWithUnnamedButtons:siteAudit.pages.filter(x=>x.unnamedButtons>0).length,
  pagesWithJsErrors:siteAudit.pages.filter(x=>x.jsErrors.length).length,
  pagesWithLocalHTTPFailures:siteAudit.pages.filter(x=>x.internalMissing.length).length,
  pagesWithNavigationErrors:siteAudit.pages.filter(x=>x.error||x.status!==200).length,
  safeButtonsClicked:siteAudit.buttonTests.filter(x=>x.clicked).length,
  safeButtonsWithObservableChange:siteAudit.buttonTests.filter(x=>x.stateChanged).length,
  safeButtonClickErrors:siteAudit.buttonTests.filter(x=>x.error).length,
  searchesAudited:siteAudit.searches.length,searchesObserved:siteAudit.searches.filter(x=>x.submitToResponseMs!==null).length,
  p50SearchMs:pct("submitToResponseMs",.5),p95SearchMs:pct("submitToResponseMs",.95),
  searchFailures:siteAudit.searches.filter(x=>x.error||x.jsErrors.length).map(x=>({name:x.name,error:x.error,js:x.jsErrors.slice(0,2)}))
 };
 writeFileSync("reports/vitruvius-total-public-audit.json",JSON.stringify(siteAudit,null,2)+"\n");
 console.log("TOTAL_SITE_AUDIT "+JSON.stringify(siteAudit.summary));
 console.log("SEARCH_LATENCIES "+JSON.stringify(siteAudit.searches.map(x=>({name:x.name,ms:x.submitToResponseMs,error:x.error,popup:x.lexicalPopupVisible}))));

}finally{
 await browser.close();
 mkdirSync("reports",{recursive:true});
 writeFileSync("reports/vitruvia-search-benchmark.json",JSON.stringify(report,null,2)+"\n");
 if(report.failures.length)process.exitCode=1;
}
