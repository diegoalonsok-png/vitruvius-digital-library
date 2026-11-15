/* Índice remoto Conceptus: no falsos negativos y concordancia por fuente.
   Prueba el código real del buscador; el corpus está simulado con pasajes.
   No descarga originales ni modifica manuscritos. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const js=readFileSync("assets/bibliotheca-corpus-search.js","utf8");
const BASE="https://libros.vitruvius-digital-library.org/corpus/";
const URL=BASE+"indice/semantic-conceptus-v1.json";
const remote=BASE+"roman-la.json";
const sha="a".repeat(64),manifestSha="b".repeat(64),dictionarySha="c".repeat(64);
const entries=[
 {workId:"house",language:"la",format:"json-passages",path:"data/classics-corpus/house-la.json",reader:"classics-text-reader.html?work=house&lang=la"},
 {workId:"roman",language:"la",format:"json-passages",path:remote,reader:"classics-text-reader.html?work=roman&lang=la"},
 ...Array.from({length:12},(_,i)=>({workId:"extra-"+i,language:"en",format:"json-passages",path:"data/classics-corpus/extra-"+i+"-en.json",reader:"classics-text-reader.html?work=extra-"+i+"&lang=en"}))
];
const source={schema:"vdl-corpus-r2-1",base:BASE,obras:[{archivo:"roman-la.json",workId:"roman",language:"la",pasajes:1,sha256:sha}]};
const meta={schema:"vdl-r2-corpus-conceptus-manifest-v1",url:URL,editionCount:1,sourceManifestSha256:manifestSha,dictionarySha};
const index=(concepts={})=>({schema:"vdl-r2-corpus-conceptus-index-v1",editionCount:1,
 sourceManifestSha256:manifestSha,dictionarySha,documents:[{
  path:remote,workId:"roman",language:"la",sha256:sha,passages:1,concepts
 }]});
const data={
 "data/classics-corpus/search-registry.json":{schema:"vitruvia-classics-search-registry-v1",entries,count:entries.length},
 "data/lexicon/conceptus.json":{concepts:[{id:"home",la:["domus"],grc:["οἶκος"],modern:{es:["casa"]}}]},
 "data/classics-corpus/house-la.json":{workId:"house",language:"la",passages:[{locus:"1",text:"Domus antiqua."}]},
 [remote]:{workId:"roman",language:"la",passages:[{locus:"2",text:"Domus mea."}]},
 "data/r2/corpus-conceptus-manifest.json":meta,
 "data/r2/corpus-manifest.json":source,
};
async function run(remoteIndex,metaOverride=null){
 const requested=[];
 const documentData={...data,[URL]:remoteIndex};
 if(metaOverride)documentData["data/r2/corpus-conceptus-manifest.json"]=metaOverride;
 const fetch=async url=>{
  requested.push(String(url));
  const val=documentData[String(url)];
  return val?{ok:true,status:200,json:async()=>val}:{ok:false,status:404,json:async()=>{throw Error("missing")}};
 };
 const window={};
 const context=vm.createContext({window,fetch,console,Promise,URL,encodeURIComponent});
 vm.runInContext(js,context);
 const results=await window.ClassicsCorpusSearch.semanticSearch("casa",{limit:30});
 return {requested,results,diag:window.ClassicsCorpusSearch.diagnostics()};
}
const negative=await run(index({}));
assert(negative.results.some(r=>r.workId==="house"),"El original local sigue accesible");
assert(!negative.requested.includes(remote),"Una versión R2 validada sin concepto no debe descargarse");
assert(negative.diag.skippedNoHit>0,"El descarte remoto debe figurar en el diagnóstico");

const positive=await run(index({home:{count:1,loci:["2"]}}));
assert(positive.requested.includes(remote),"Una versión R2 con concepto debe verificarse descargando el texto");
assert(positive.results.some(r=>r.workId==="roman"&&/2/.test(r.link)),"Se necesita el locus original en la URL");

const stale=await run(index({}),{...meta,editionCount:2});
assert(stale.requested.includes(remote),"Manifiesto remoto discordante no puede ocultar coincidencias reales");
assert(stale.results.some(r=>r.workId==="roman"),"Un índice desactualizado debe dejar buscar directamente");
console.log("PASS: R2 Conceptus remoto filtra sólo negativos atestiguados, verifica los positivos y conserva fallback.");
