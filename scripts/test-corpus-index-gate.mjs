#!/usr/bin/env node
/* Mide el efecto de la puerta del índice sobre el motor del corpus clásico.
 *
 * Antes de este cambio, una búsqueda léxica descargaba todas las ediciones
 * registradas para escanearlas. La prueba carga el motor real en un navegador
 * simulado, cuenta los archivos que pide y compara con la puerta apagada.
 *
 * Ejecutar: node scripts/test-corpus-index-gate.mjs
 */
import {readFileSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
const require=createRequire(import.meta.url);

if(!existsSync("data/index/classics/manifest.json")){
 console.error("Falta el índice: node scripts/build-classics-lexical-index.mjs");
 process.exit(1);
}

function browser(withIndex){
 const fetched=[];let bytes=0;
 const sandbox={};
 sandbox.window=sandbox;
 sandbox.self=sandbox;
 sandbox.globalThis=sandbox;
 sandbox.console=console;
 sandbox.location={href:"https://example.org/vitruvia-lexicon.html",search:"",pathname:"/vitruvia-lexicon.html",origin:"https://example.org"};
 sandbox.document={documentElement:{lang:"es",dataset:{}},currentScript:{src:"https://example.org/assets/classics-corpus-search.js"},
  getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},
  createElement:()=>({style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(){},append(){},appendChild(){}}),
  head:{append(){},appendChild(){}},body:{append(){},appendChild(){},classList:{add(){},remove(){},contains:()=>false}}};
 sandbox.navigator={language:"es"};
 sandbox.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 sandbox.setTimeout=setTimeout;sandbox.clearTimeout=clearTimeout;
 sandbox.performance={now:()=>Date.now()};
 sandbox.URLSearchParams=URLSearchParams;sandbox.URL=URL;
 sandbox.AbortController=AbortController;
 sandbox.CustomEvent=class{constructor(t,o){this.type=t;Object.assign(this,o)}};
 sandbox.dispatchEvent=()=>true;sandbox.addEventListener=()=>{};
 sandbox.requestIdleCallback=fn=>setTimeout(fn,0);
 sandbox.fetch=async url=>{
  const path=String(url).split("?")[0].replace(/^https?:\/\/[^/]+\//,"");
  fetched.push(path);
  if(!existsSync(path))return {ok:false,status:404,json:async()=>({}),text:async()=>""};
  const text=readFileSync(path,"utf8");
  bytes+=Buffer.byteLength(text);
  return {ok:true,status:200,json:async()=>JSON.parse(text),text:async()=>text};
 };
 const context=vm.createContext(sandbox);
 if(withIndex){
  /* Los dos módulos se exponen como lo haría una etiqueta <script>. */
  for(const file of ["assets/vitruvia-philology.js","assets/classics-lexical-index.js"]){
   vm.runInContext(readFileSync(file,"utf8"),context,{filename:file});
  }
 }
 vm.runInContext(readFileSync("assets/classics-corpus-search.js","utf8"),context,{filename:"classics-corpus-search.js"});
 return {sandbox,fetched,bytesOf:()=>bytes};
}

let pass=0,fail=0;
const yes=(name,value,detail)=>{if(value)pass++;else{fail++;console.log("  FALLA  "+name+(detail?"\n     "+detail:""))}};

console.log("\nMotor del corpus · búsqueda de «symmetria»");
const withGate=browser(true);
yes("el motor se carga en el navegador simulado",!!withGate.sandbox.ClassicsCorpusSearch);
yes("el índice está disponible para el motor",!!withGate.sandbox.VitruviaClassicsIndex);

const rowsWith=await withGate.sandbox.ClassicsCorpusSearch.search("symmetria",{limit:8});
const diagWith=withGate.sandbox.ClassicsCorpusSearch.diagnostics();
const editionsWith=withGate.fetched.filter(p=>p.startsWith("data/classics-corpus/")&&!/search-registry|remote-translations|postings|reconciliation/.test(p)).length;
const bytesWith=withGate.bytesOf();

const withoutGate=browser(false);
const rowsWithout=await withoutGate.sandbox.ClassicsCorpusSearch.search("symmetria",{limit:8});
const editionsWithout=withoutGate.fetched.filter(p=>p.startsWith("data/classics-corpus/")&&!/search-registry|remote-translations|postings|reconciliation/.test(p)).length;
const bytesWithout=withoutGate.bytesOf();

console.log("  con índice:  "+editionsWith+" ediciones descargadas · "+(bytesWith/1048576).toFixed(1)+" MB · "+rowsWith.length+" resultados");
console.log("  sin índice:  "+editionsWithout+" ediciones descargadas · "+(bytesWithout/1048576).toFixed(1)+" MB · "+rowsWithout.length+" resultados");
console.log("  diagnóstico: "+JSON.stringify(diagWith));

yes("la puerta se declara activa",diagWith.indexGate==="activa");
yes("descarga muchas menos ediciones",editionsWith<editionsWithout/5,
 editionsWith+" frente a "+editionsWithout);
yes("descarga muchos menos bytes",bytesWith<bytesWithout/5,
 (bytesWith/1048576).toFixed(1)+" MB frente a "+(bytesWithout/1048576).toFixed(1)+" MB");
yes("no pierde resultados",rowsWith.length>0&&rowsWith.length>=Math.min(rowsWithout.length,1),
 rowsWith.length+" frente a "+rowsWithout.length);
yes("los resultados coinciden en obra",
 JSON.stringify(rowsWith.map(r=>r.workId).sort())===JSON.stringify(rowsWithout.map(r=>r.workId).sort()),
 "con: "+rowsWith.map(r=>r.workId).join(",")+"\n     sin: "+rowsWithout.map(r=>r.workId).join(","));
yes("declara cuántas ediciones se saltó",typeof diagWith.editionsSkipped==="number"&&diagWith.editionsSkipped>0,
 "saltadas: "+diagWith.editionsSkipped);

console.log("\n"+pass+" correctas · "+fail+" fallidas");
process.exit(fail?1:0);
