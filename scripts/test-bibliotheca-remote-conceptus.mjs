/* Índice R2 Conceptus: SHA real de manifiesto, diccionario e índice;
   nunca descartar pasajes por datos antiguos o alterados. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash,webcrypto} from "node:crypto";
import vm from "node:vm";
const js=readFileSync("assets/bibliotheca-corpus-search.js","utf8");
const BASE="https://libros.vitruvius-digital-library.org/corpus/";
const REMOTE_INDEX_URL=BASE+"indice/semantic-conceptus-v1.json";
const remote=BASE+"roman-la.json";
const sha="a".repeat(64);
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const entries=[
 {workId:"house",language:"la",format:"json-passages",path:"data/classics-corpus/house-la.json",reader:"classics-text-reader.html?work=house&lang=la"},
 {workId:"roman",language:"la",format:"json-passages",path:remote,reader:"classics-text-reader.html?work=roman&lang=la"},
 ...Array.from({length:12},(_,i)=>({workId:"extra-"+i,language:"en",format:"json-passages",path:"data/classics-corpus/extra-"+i+"-en.json",reader:"classics-text-reader.html?work=extra-"+i+"&lang=en"}))
];
const source={schema:"vdl-corpus-r2-1",base:BASE,obras:[{archivo:"roman-la.json",workId:"roman",language:"la",pasajes:1,sha256:sha}]};
const concepts={concepts:[{id:"home",la:["domus"],grc:["οἶκος"],modern:{es:["casa"]}}]};
const makeIndex=(postings={})=>({
 schema:"vdl-r2-corpus-conceptus-index-v1",editionCount:1,
 sourceManifestSha256:hash(source),dictionarySha256:hash(concepts),
 documents:[{path:remote,workId:"roman",language:"la",sha256:sha,passages:1,concepts:postings}]
});
const makeMeta=index=>({
 schema:"vdl-r2-corpus-conceptus-manifest-v1",url:REMOTE_INDEX_URL,editionCount:1,
 sourceManifestSha256:hash(source),dictionarySha256:hash(concepts),sha256:hash(index)
});
const original={
 "data/classics-corpus/search-registry.json":{schema:"vitruvia-classics-search-registry-v1",entries,count:entries.length},
 "data/lexicon/conceptus.json":concepts,
 "data/classics-corpus/house-la.json":{workId:"house",language:"la",passages:[{locus:"1",text:"Domus antiqua."}]},
 [remote]:{workId:"roman",language:"la",passages:[{locus:"2",text:"Domus mea."}]},
 "data/r2/corpus-manifest.json":source,
};
async function run(index,{mutate={},metaOverride=null}={}){
 const requested=[];
 const data={...original,[REMOTE_INDEX_URL]:index,
  "data/r2/corpus-conceptus-manifest.json":metaOverride||makeMeta(index),...mutate};
 const fetch=async url=>{
  requested.push(String(url));
  const val=data[String(url)];
  return val?{
   ok:true,status:200,json:async()=>val,
   arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(val)).buffer
  }:{ok:false,status:404,json:async()=>{throw Error("missing")}};
 };
 const window={};
 const context=vm.createContext({window,fetch,console,Promise,URL,encodeURIComponent,
  crypto:webcrypto,TextDecoder,TextEncoder});
 vm.runInContext(js,context);
 const results=await window.ClassicsCorpusSearch.semanticSearch("casa",{limit:30});
 return {requested,results,diag:window.ClassicsCorpusSearch.diagnostics()};
}
const absentIndex=makeIndex({});
const negative=await run(absentIndex);
assert(negative.results.some(r=>r.workId==="house"),"El original local debe seguir accesible");
assert(!negative.requested.includes(remote),"La versión R2 probadamente sin concepto no debe descargarse");
assert(negative.diag.skippedNoHit>0,"El descarte seguro debe figurar en el diagnóstico");

const positive=await run(makeIndex({home:{count:1,loci:["2"]}}));
assert(positive.requested.includes(remote),"El concepto positivo requiere comprobar el original R2");
assert(positive.results.some(r=>r.workId==="roman"&&/2/.test(r.link)),"El resultado enlaza el locus original");

for(const [name,opts] of [
 ["metadatos del índice inconsistentes",{metaOverride:{...makeMeta(absentIndex),editionCount:2}}],
 ["diccionario actualizado",{mutate:{"data/lexicon/conceptus.json":{concepts:[...concepts.concepts,{id:"new",la:["verbum"],grc:[],modern:{es:["palabra"]}}]}}}],
 ["manifiesto textual actualizado",{mutate:{"data/r2/corpus-manifest.json":{...source,version:"changed"}}}],
 ["índice público alterado",{metaOverride:{...makeMeta(absentIndex),sha256:"f".repeat(64)}}]
]){
 const result=await run(absentIndex,opts);
 assert(result.requested.includes(remote),name+" no puede ocultar el texto original");
 assert(result.results.some(r=>r.workId==="roman"),name+" debe activar la búsqueda directa");
}
console.log("PASS: Conceptus R2 filtra únicamente negativos autenticados, comprueba positivos por locus y rechaza índice/diccionario/manifiesto alterados.");
