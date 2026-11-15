#!/usr/bin/env node
/* Cotejo de búsqueda léxica real: OCR R2 → raíz → fragmento R2 → página.
 * Nunca escribe en R2. No confunde raíces con lemmas ni OCR con texto crítico.
 */
import {readFileSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");
const cat=JSON.parse(readFileSync("data/r2/catalogo-clasicos-r2.json","utf8"));
const REQUIRED=process.argv.includes("--required");
const BASE="https://libros.vitruvius-digital-library.org/clasicos/indice/";
const WANTED=[
 "apollodorus-poliorcetics","athenaeus-mechanicus","ptolemy-geographia",
 "plutarco-vidas","tucidides-historia","teofrasto-historia-plantas",
 "arquimedes-obras","accius-fragmenta","longino-sublime","longo-dafnis-es",
 "rose-vitruvius-1899","antologia-griega"
];
const rows=new Map(cat.items.map(e=>[e.id,e]));
const refs=WANTED.filter(id=>rows.has(id));
const greek=/[\u0370-\u03ff\u1f00-\u1fff]/u;
const codepoints=s=>[...s].map(c=>c.codePointAt(0).toString(16)).join("-");
const stem=word=>P.stem(word,greek.test(word)?"greek":"latin");
const read=async(url)=>{
 const resp=await fetch(url,{signal:AbortSignal.timeout(35000),headers:{"Accept":"application/json, text/html"}});
 if(!resp.ok)throw Error("HTTP "+resp.status+" en "+url);
 return resp;
};
const report={schema:"vdl-bibliotheca-lexical-live-v1",generated:new Date().toISOString(),
 method:"GET de OCR en R2, GET de fragmentos invertidos R2; comparación de palabras atestiguadas y páginas digitales con el mismo normalizador del visor",
 limitations:"Muestra selectiva de obras y raíces; no acredita todos los 2.510 fragmentos, ni lematización filológica, ni exactitud paleográfica del OCR.",
 cataloguedEditions:cat.items.length,sampledEditionIds:refs,records:[],readerEndpoints:[],
 unexpectedIndexedIds:[],errors:[],warnings:[],status:"checking"};
let index=null;
try{
 index=await (await read(BASE+"fragmentos.json")).json();
 if(index.schema!=="vdl-r2-indice-clasicos-fragmentos-1")throw Error("Esquema desconocido del listado invertido");
 const indexed=new Set((index.obras||[]).map(o=>o.id));
 report.indexEntries=indexed.size;
 report.indexFragments=(index.fragmentos||[]).length;
 report.unexpectedIndexedIds=[...indexed].filter(id=>!rows.has(id)).sort();
 const absent=[...rows.keys()].filter(id=>!indexed.has(id));
 if(absent.length)report.errors.push("Ediciones catalogadas sin entrada en índice: "+absent.join(", "));
 if(report.unexpectedIndexedIds.length)
  report.warnings.push("El índice contiene IDs sin ficha editorial: "+report.unexpectedIndexedIds.join(", "));
}catch(e){report.errors.push("No se pudo leer índice R2 real: "+e.message)}
const cachedFragments=new Map();
async function fragment(root){
 const key="s-"+codepoints([...root].slice(0,2).join(""))+".json";
 if(!cachedFragments.has(key))cachedFragments.set(key,read(BASE+key).then(r=>r.json()));
 return cachedFragments.get(key);
}
if(index){
 for(const id of refs){
  const e=rows.get(id);
  const item={id,sourceLanguage:e.lengua,ocrUrl:e.texto,pdfUrl:e.pdf,ocrPages:null,
   lexicalTokensTested:0,lexicalMatches:[],errors:[]};
  try{
   const ocr=await (await read(e.texto)).json();
   if(ocr.obra!==id||!Array.isArray(ocr.paginas))throw Error("OCR no corresponde a ID de obra o carece de páginas");
   item.ocrPages=ocr.paginas.length;
   if(e.paginas && e.paginas!==ocr.paginas.length)throw Error("Cantidad de páginas OCR difiere del catálogo");
   const probes=new Map();
   for(let i=0;i<Math.min(ocr.paginas.length,18)&&probes.size<3;i++){
    const words=P.fold(ocr.paginas[i]||"").split(" ").filter(w=>w.length>=5&&w.length<=30);
    for(const word of words){
     const root=stem(word);
     if(!root||root.length<3||probes.has(root))continue;
     probes.set(root,{word,root,page:i+1});
     if(probes.size>=3)break;
    }
   }
   if(probes.size<2)throw Error("OCR sin vocabulario suficiente en las primeras 18 páginas");
   for(const probe of probes.values()){
    item.lexicalTokensTested++;
    try{
     const f=await fragment(probe.root);
     const hit=f.raices?.[probe.root]?.[id];
     if(!hit||!Array.isArray(hit[1])||!hit[1].includes(probe.page))
      throw Error("Índice no devuelve la página "+probe.page+" para "+probe.word);
     item.lexicalMatches.push({word:probe.word,root:probe.root,page:probe.page,
      indexedOccurrences:hit[0],viewer:"buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(id)+"&pagina="+probe.page+"&q="+encodeURIComponent(probe.word)});
    }catch(err){item.errors.push(probe.word+" → "+err.message)}
   }
  }catch(e){item.errors.push(e.message)}
  report.records.push(item);
  if(item.errors.length)report.errors.push(id+": "+item.errors.join(" | "));
 }
}
const endpoints=[
 "https://vitruvius-digital-library.org/bibliotheca-graeca-latina.html",
 "https://vitruvius-digital-library.org/buscador-facsimiles-clasicos.html?obra=apollodorus-poliorcetics",
 "https://diegoalonsok-png.github.io/vitruvius-digital-library/buscador-facsimiles-clasicos.html?obra=athenaeus-mechanicus"
];
for(const url of endpoints){
 const row={url,status:"not-checked"};
 try{
  const res=await read(url);const html=await res.text();
  row.status=html.includes("id=\"edition\"")||html.includes("Bibliotheca")?"html-loaded":"html-unexpected";
  row.httpStatus=res.status;
  if(row.status!=="html-loaded")report.warnings.push("HTML inesperado en visor: "+url);
 }catch(e){row.status="unreachable";row.error=e.message;
  report.warnings.push("No se pudo abrir visor público: "+url+" · "+e.message)}
 report.readerEndpoints.push(row);
}
report.counts={testedEditions:report.records.length,testedWords:report.records.reduce((n,r)=>n+r.lexicalTokensTested,0),
 locatedPages:report.records.reduce((n,r)=>n+r.lexicalMatches.length,0),
 errors:report.errors.length,warnings:report.warnings.length,
 indexEditions:report.indexEntries||0,indexFragments:report.indexFragments||0};
report.status=report.errors.length?"errors-detected":report.warnings.length?"verified-sample-with-reservations":"verified-sample";
writeFileSync("data/r2/bibliotheca-lexical-live-audit.json",JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify({status:report.status,counts:report.counts,readerEndpoints:report.readerEndpoints,
 errors:report.errors,warnings:report.warnings},null,2));
if(REQUIRED&&report.errors.length)process.exitCode=1;
