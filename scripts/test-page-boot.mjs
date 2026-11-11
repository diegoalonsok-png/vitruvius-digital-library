#!/usr/bin/env node
/* ¿Arranca la página sin lanzar excepciones?
 *
 * Motivo. El 11 de noviembre de 2026 una edición incompleta dejó en
 * assets/vitruvia-search.js una llamada a una función que no existía:
 * search() lanzaba ReferenceError y el buscador no mostraba ningún resultado.
 * La comprobación de sintaxis no lo veía —la sintaxis era válida— y las
 * pruebas de navegador de integración continua lo detectaron veinte minutos
 * más tarde, ya publicado.
 *
 * Esta prueba carga la página con jsdom, evalúa sus scripts locales en el
 * orden del documento, dispara una búsqueda enlazada con ?q= y exige que no
 * haya ninguna excepción no capturada. No comprueba resultados: sin red no
 * los habría. Comprueba que el código corre.
 *
 * jsdom no está en el repositorio. Si falta, la prueba lo dice y no falla,
 * para no romper un entorno que no lo tenga: `npm i --no-save jsdom`.
 *
 * Ejecutar: node scripts/test-page-boot.mjs
 */
import {readFileSync,existsSync} from "node:fs";

let JSDOM,VirtualConsole;
try{
 const jsdom=await import("jsdom");
 JSDOM=jsdom.JSDOM;VirtualConsole=jsdom.VirtualConsole;
}catch{
 console.log("jsdom no está instalado; la prueba de arranque se omite.");
 console.log("Para ejecutarla: npm i --no-save jsdom");
 process.exit(0);
}

/* Limitaciones conocidas del entorno simulado, no defectos de la página.
   La última cubre los import() dinámicos: evaluados fuera del documento, su
   ruta se resuelve contra el archivo y no contra la URL de la página. */
const IGNORE=[/getContext\(\) method/i,/Not implemented: window\./i,/Could not parse CSS/i,
 /ERR_MODULE_NOT_FOUND/,/Cannot find module/i,/Failed to parse URL/i];
const ignorable=value=>IGNORE.some(pattern=>pattern.test(String(value&&value.message||value||"")));
/* Un import() dinámico fallido llega como rechazo no controlado al proceso y
   mataría la prueba antes de informar. Se filtra aquí. */
process.on("unhandledRejection",reason=>{if(!ignorable(reason)){console.error("Rechazo no controlado:",reason);process.exitCode=1}});
process.on("uncaughtException",error=>{if(!ignorable(error)){console.error("Excepción no capturada:",error);process.exitCode=1}});

const PAGES=[
 {file:"vitruvia.html",query:"?q=domus&mode=all"},
 {file:"vitruvia-lexicon.html",query:"?q=symmetria&mode=palabra"},
 {file:"index.html",query:""}
];

let failures=0;
for(const page of PAGES){
 if(!existsSync(page.file)){console.log("· no existe "+page.file);continue}
 const problems=[];
 const console_=new VirtualConsole();
 console_.on("jsdomError",error=>{
  const message=String(error&&error.message||error);
  if(!ignorable(message))problems.push(message);
 });
 for(const quiet of ["error","warn","log","info","debug"])console_.on(quiet,()=>{});
 const html=readFileSync(page.file,"utf8");
 const dom=new JSDOM(html,{
  url:"http://127.0.0.1:8765/"+page.file+page.query,
  runScripts:"dangerously",pretendToBeVisual:true,virtualConsole:console_,
  beforeParse(window){
   window.fetch=async url=>{
    const path=String(url).split("?")[0].replace(/^https?:\/\/[^/]+\//,"");
    if(!/^(data|assets|corpus|documents|reports)\//.test(path)||!existsSync(path))
     return {ok:false,status:404,json:async()=>({}),text:async()=>""};
    const text=readFileSync(path,"utf8");
    return {ok:true,status:200,type:"basic",json:async()=>JSON.parse(text),text:async()=>text,headers:{get:()=>null}};
   };
   window.requestIdleCallback=fn=>setTimeout(()=>fn({didTimeout:false,timeRemaining:()=>5}),0);
   window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
   window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
   window.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
   window.scrollTo=()=>{};
   window.onerror=(message)=>{problems.push("window.onerror: "+message);return true};
   window.addEventListener("unhandledrejection",event=>{
    const reason=String(event.reason&&event.reason.message||event.reason||"");
    if(reason&&!ignorable(reason))problems.push("promesa rechazada: "+reason);
   });
  }
 });
 const {window}=dom;
 /* Los scripts de módulo no se pueden evaluar con window.eval; se cuentan
    aparte para que quede claro qué quedó sin comprobar. */
 const tags=[...html.matchAll(/<script\b[^>]*src="(assets\/[^"]+)"[^>]*>/g)];
 let evaluated=0,skipped=0;
 for(const tag of tags){
  const file=tag[1].split("?")[0];
  if(!existsSync(file))continue;
  if(/type="module"/.test(tag[0])){skipped++;continue}
  try{window.eval(readFileSync(file,"utf8"));evaluated++}
  catch(error){problems.push("excepción al evaluar "+file+": "+error.message)}
 }
 try{
  window.document.dispatchEvent(new window.Event("DOMContentLoaded",{bubbles:true}));
  window.dispatchEvent(new window.Event("load"));
 }catch(error){problems.push("excepción en los manejadores de carga: "+error.message)}
 await new Promise(done=>setTimeout(done,1200));
 window.close();
 const label=page.file+(page.query||"")+(skipped?" ("+skipped+" de módulo sin evaluar)":"");
 if(problems.length){
  failures++;
  console.log("FALLA  "+label+" · "+evaluated+" scripts evaluados");
  for(const problem of [...new Set(problems)].slice(0,6))console.log("    · "+problem.slice(0,220));
 }else console.log("OK     "+label+" · "+evaluated+" scripts evaluados sin excepciones");
}

console.log(failures?"\n"+failures+" página(s) con excepciones de arranque":"\nNinguna excepción de arranque");
process.exit(failures?1:0);
