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
// Explicit expected subjects, not invented expected passages. Exact loci are
// additionally required for directed references. All checks remain provisional
// until the evidence and cited edition have been inspected by a researcher.
const aliases={
 "Vitruvio":["vitruvius","vitruve"],"Estrabón":["strabo","strabon"],"Platón":["plato","platon"],"Aristóteles":["aristotle","aristote"],"Sófocles":["sophocles"],"Homero":["homer","homere"],"Heródoto":["herodotus","herodote"],"Tucídides":["thucydides"],"Julio César":["julius caesar","caius iulius caesar","gaius julius caesar"],"Cicerón":["cicero"],"Séneca":["seneca"],"Lucrecio":["lucretius"],"Ovidio":["ovid","ovidius"],"Virgilio":["virgil","vergilius"],"Tácito":["tacitus"],"Plinio":["pliny","plinius"],"Ptolomeo":["ptolemy","ptolemaeus"],"Euclides":["euclid"],"Hipócrates":["hippocrates"],"Galeno":["galen","galenus"],"Alejandro Magno":["alexander the great","alexander iii"],"Roma":["rome"],"Atenas":["athens","athenes"],"Egipto":["egypt","egypte"],"Alejandría":["alexandria"],"acueducto":["aqueduct","aquaeductus"],"domus":["domus"],"symmetria":["symmetry","simetria"],"proportio":["proportion","proporcion"],"eurythmia":["eurythmy","euritmia"],"logos":["λόγος"],"ἀρχιτεκτονική":["architektonike","architectura"],"λόγος":["logos"],"ἀρετή":["arete","virtud"],"ἱστορία":["historia","history"],"Codex H":["harley 2767","harley ms 2767"],"Harley 2767":["harley ms 2767","harleianus 2767"],"Gudianus 69":["gud lat 69","cod guelf 69 gud lat","gudianus"],"Cesariano":["cesare cesariano"],"Barbaro 1567":["daniele barbaro"],"Vitruvia Lexicon":["lexicon"],"De architectura":["vitruvius","vitruvio"],"Geografía":["geographia","geography"],"La Ilíada":["iliada","iliad","ilias"],"Akenatón":["akhenaten","akhenaton","amenhotep iv","ajenaton"],"Tutankamón":["tutankhamun","tutankhamen"],"Ramsés II":["ramesses ii","rameses ii"],"Hatshepsut":["hatchepsout"],"Imhotep":["imouthes"],"titulatura real egipcia":["egyptian royal titulary","titulature royale egyptienne"],"Gran Templo de Atón":["great temple of the aten","grand temple d aton"],"Hammurabi":["hammurapi"],"Gilgamesh":["gilgames"],"Enheduanna":["enheduana"],"guerra del Peloponeso":["peloponnesian war","guerre du peloponnese"],"guerras médicas":["persian wars","guerres mediques"],"Pausanias":["pausanias"],"Polibio":["polybius"],"Marco Aurelio":["marcus aurelius","marc aurele"],"Epicteto":["epictetus"],"Plotino":["plotinus"],"Porfirio":["porphyry","porphyrius"],"Proclo":["proclus"],"alegoría de la caverna":["allegory of the cave","mito de la caverna"],"motor inmóvil":["unmoved mover","moteur immobile"],"causa final":["final cause","causa finalis"],"ley natural":["natural law","ius naturale"],"animal político":["political animal","zoon politikon"],"teoría humoral":["humoral theory","four humours"],"cuatro humores":["four humours","four humors"],"anatomía del cuerpo humano":["human anatomy","anatomie humaine"],"teorema de Pitágoras":["pythagorean theorem","theoreme de pythagore"],"sección áurea":["golden ratio","extreme and mean ratio"],"orden dórico":["doric order","ordre dorique"],"bóveda de cañón":["barrel vault","voute en berceau"],"inscripción funeraria":["funerary inscription","epitaph","epitafio"],"variante manuscrita":["manuscript variant","variant reading","lectio varia"],"lectio varia":["variant reading","variante manuscrita"],"resurrección de los muertos":["resurrection of the dead","ἀνάστασις νεκρῶν"],"Concilio de Nicea":["council of nicaea","concile de nicee"],"Ireneo de Lyon":["irenaeus of lyons","irenee de lyon"],"Evangelio de Tomás":["gospel of thomas","evangile de thomas"],"ἀνάστασις νεκρῶν":["resurrection of the dead","resurreccion de los muertos"],"τέλος":["telos"],"ius naturale":["natural law","derecho natural"],"Krohn 1912":["krohn"],"Rose 1899":["rose"],"Leon Battista Alberti":["leon battista alberti"],"Palladio":["andrea palladio"],"Le Corbusier":["charles edouard jeanneret"],"Mies van der Rohe":["ludwig mies van der rohe"]
};
const normalized=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const phrase=(a,b)=>Boolean(normalized(b))&&(" "+normalized(a)+" ").includes(" "+normalized(b)+" ");
function acceptance(q,entry,records){
 const errors=[];
 if(entry.completeMs==null)errors.push("completion-not-observed");
 if(entry.completeMs!=null&&entry.completeMs>15000)errors.push("completion-over-15s");
 if(q==="zzzxqjkv"){
  if(records.length)errors.push("negative-query-returned-records");
 }else{
  if(entry.firstMs==null)errors.push("no-first-result");
  else if(entry.firstMs>3000)errors.push("first-result-over-3s");
  const locus=q.match(/^Vitruvio (\d+\.\d+\.\d+)$/)?.[1];
  const candidates=records.slice(0,10);
  const matches=candidates.filter(r=>{
   if(locus)return r.workId==="vitruvius"&&r.locus===locus;
   const hay=[r.title,r.author,r.excerpt,r.source,r.entityCanonical].join(" ");
   return [q,...(aliases[q]||[])].some(a=>phrase(hay,a));
  });
  if(!matches.length)errors.push("expected-subject-not-in-top-10");
  if(matches.length&&!matches.some(r=>r.link&&!/^javascript:/i.test(r.link)))errors.push("no-linked-matching-record");
  if(/^(?:Krohn 1912|Rose 1899|Barbaro 1567)$/.test(q)){
   const year=q.split(" ").at(-1);
   if(!matches.some(r=>phrase([r.title,r.author,r.edition,r.meta,r.year].join(" "),year)))errors.push("edition-year-not-confirmed");
  }
 }
 return {passed:errors.length===0,errors,method:"automated relevance proxy; no independent scholarly collation or URL availability certification"};
}
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
   const previousId=await page.locator("#result-state").getAttribute("data-search-id");
   await page.locator("#query").fill(q,{timeout:4000});
   const t=Date.now();
   await page.locator("#query").press("Enter",{timeout:4000});
   const args={q,previousId};
   const current=({q,previousId})=>{const d=document.querySelector("#result-state")?.dataset||{};return d.searchId!==previousId&&d.searchQuery===q};
   await page.waitForFunction(current,args,{timeout:5000,polling:70});
   try{await page.waitForFunction(({q,previousId})=>{const d=document.querySelector("#result-state")?.dataset||{};return d.searchId!==previousId&&d.searchQuery===q&&Boolean(d.firstResultMs||d.completeMs)},args,{timeout:5000,polling:70})}catch{}
   entry.wallFirstMs=Date.now()-t;
   try{await page.waitForFunction(({q,previousId})=>{const d=document.querySelector("#result-state")?.dataset||{};return d.searchId!==previousId&&d.searchQuery===q&&Boolean(d.completeMs)&&window.VitruviaSearchSnapshot?.query===q},args,{timeout:15000,polling:100})}catch{}
   const result=await page.evaluate(({q,previousId})=>{
    const d=document.querySelector("#result-state")?.dataset||{},snapshot=window.VitruviaSearchSnapshot;
    if(d.searchId===previousId||d.searchQuery!==q)return {records:[],valid:false};
    const records=snapshot?.query===q?(snapshot.academicRows||[]):[];
    return {first:d.firstResultMs,complete:d.completeMs,valid:true,records:records.map(r=>({title:r.title,author:r.author,excerpt:r.excerpt,link:r.link,locus:r.locus,workId:r.workId,source:r.source,entityCanonical:r.entityCanonical,edition:r.edition,meta:r.meta,year:r.year}))};
   },args);
   entry.firstMs=result.first?Number(result.first):null;
   entry.completeMs=result.complete?Number(result.complete):null;
   entry.status=entry.firstMs!==null?"first-result":entry.completeMs!==null?"completed-no-results":"timeout-or-no-result";
   entry.acceptance=acceptance(q,entry,result.records);
   if(!result.valid){entry.acceptance.passed=false;entry.acceptance.errors.push("stale-query")}
   entry.topTitles=result.records.slice(0,5).map(r=>r.title);
  }catch(e){entry.status="error";entry.error=String(e).slice(0,150);entry.acceptance={passed:false,errors:["execution-error"]}}
  entry.sample=i<50?"baseline-50":"academic-extension-50";
  rows.push(entry);
  console.log("QUERY_"+String(i+1).padStart(2,"0")+" "+JSON.stringify(entry));
 }
 const summary={totalQueries:queries.length,
  passed:rows.filter(x=>x.acceptance?.passed).length,failed:rows.filter(x=>!x.acceptance?.passed).length,
  failures:rows.filter(x=>!x.acceptance?.passed).map(x=>({q:x.q,errors:x.acceptance?.errors||["missing-evaluation"]})),
  cohorts:Object.fromEntries(["baseline-50","academic-extension-50"].map(name=>[name,{queries:rows.filter(x=>x.sample===name).length,first:arrStats(rows.filter(x=>x.sample===name).map(x=>x.firstMs)),completed:arrStats(rows.filter(x=>x.sample===name).map(x=>x.completeMs))}])),
  first:arrStats(rows.map(x=>x.firstMs)),
  completed:arrStats(rows.map(x=>x.completeMs)),
  wallToFirstObserved:arrStats(rows.map(x=>x.firstMs===null?null:x.wallFirstMs)),
  noFirstResult:rows.filter(x=>x.firstMs===null).length,
  noCompletion:rows.filter(x=>x.completeMs===null).length,
  errors:rows.filter(x=>x.status==="error").length,
  slowest:rows.filter(x=>x.firstMs!==null).sort((a,b)=>b.firstMs-a.firstMs).slice(0,5)};
 report.summary=summary;
 if(target===100&&summary.passed!==100)process.exitCode=1;
 console.log(("VITRUVIA_"+target+"_BENCHMARK ")+JSON.stringify({load:report.load,...summary}));
}finally{
 await browser.close();
 mkdirSync("reports",{recursive:true});
 writeFileSync("reports/vitruvia-"+target+"-search-timings.json",JSON.stringify(report,null,2)+"\n");
}
