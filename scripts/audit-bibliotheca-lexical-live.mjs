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
const FULL=process.argv.includes("--full");
const BASE="https://libros.vitruvius-digital-library.org/clasicos/indice/";
const WANTED=[
 "apollodorus-poliorcetics","athenaeus-mechanicus","ptolemy-geographia",
 "plutarco-vidas","tucidides-historia","teofrasto-historia-plantas",
 "arquimedes-obras","accius-fragmenta","longino-sublime","longo-dafnis-es",
 "rose-vitruvius-1899","antologia-griega"
];
const rows=new Map(cat.items.map(e=>[e.id,e]));
const refs=FULL?[...rows.keys()]:WANTED.filter(id=>rows.has(id));
const greek=/[\u0370-\u03ff\u1f00-\u1fff]/u;
const codepoints=s=>[...s].map(c=>c.codePointAt(0).toString(16)).join("-");
const stem=word=>P.stem(word,greek.test(word)?"greek":"latin");
// Remote R2 GETs are eventually reliable but an occasional CDN/network
// interruption must not be classified as an absent or corrupted edition.
// Retry only temporary transport/server failures; never retry missing files.
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const read=async(url)=>{
 let last=null;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const resp=await fetch(url,{signal:AbortSignal.timeout(35000),headers:{"Accept":"application/json, text/html"}});
   if(resp.ok)return resp;
   const e=new Error("HTTP "+resp.status+" en "+url);
   if(![408,425,429,500,502,503,504].includes(resp.status))throw e;
   last=e;
  }catch(e){
   if(/^HTTP (?!408|425|429|500|502|503|504)/.test(e.message))throw e;
   last=e;
  }
  if(attempt<3)await pause(500*(attempt+1)*(attempt+1));
 }
 throw Error("Fallo de conexión temporal después de 4 intentos: "+url+" · "+(last?.message||"sin respuesta"));
};
const report={schema:"vdl-bibliotheca-lexical-live-v1",generated:new Date().toISOString(),
 method:"GET de OCR en R2, GET de fragmentos invertidos R2; comparación de palabras atestiguadas y páginas digitales con el mismo normalizador del visor",
 limitations:"El modo --full verifica tres raíces del OCR por edición catalogada; no implica validación total de todas las raíces ni lematización filológica, ni exactitud paleográfica del OCR.",
 cataloguedEditions:cat.items.length,sampledEditionIds:refs,records:[],readerEndpoints:[],
 unexpectedIndexedIds:[],lexicalQueries:[],errors:[],warnings:[],status:"checking"};
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
 if(!cachedFragments.has(key))cachedFragments.set(key,read(BASE+key).then(r=>r.json()).catch(e=>{cachedFragments.delete(key);throw e}));
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
   // La primera aparición de cada raíz queda siempre entre las 24 páginas
   // indexadas para dicha raíz. Se prefiere cuerpo del volumen, no portadas.
   const firstOccurrences=new Map();
   const priority=new Set(["symmetria","architectura","natura","corpus","templum","tempus",
    "opus","aedificium","musica","philosophia","logos","theoria","ratio",
    "λογος","λογου","θεος","ναος","πολις","μετρον","τεχνη","φιλια"]);
   const boilerplate=new Set(["digitized","google","internet","archive","library",
    "copyright","university","scanner","scanning","original","books","volume","printed"]);
   const scanned=FULL?ocr.paginas.length:Math.min(ocr.paginas.length,150);
   for(let i=0;i<scanned;i++){
    for(const word of P.fold(ocr.paginas[i]||"").split(" ")){
     if(word.length<5||word.length>30||boilerplate.has(word))continue;
     const root=stem(word);
     if(!root||root.length<4||firstOccurrences.has(root))continue;
     firstOccurrences.set(root,{word,root,page:i+1,
      score:(priority.has(word)?100:0)+(e.lengua==="grc"&&greek.test(word)?55:0)
        +(i>=8?20:0)+(word.length>=7?5:0)});
    }
   }
   const best=[...firstOccurrences.values()].sort((a,b)=>b.score-a.score);
   item.greekRootsDetected=best.filter(p=>greek.test(p.word)).length;
   let probes=best.slice(0,3);
   // Un término de una traducción no demuestra disponibilidad en griego.
   // Si el OCR contiene escritura griega, comprobar al menos una raíz griega.
   if(e.lengua==="grc"&&!probes.some(p=>greek.test(p.word))){
    const greekCandidate=best.find(p=>greek.test(p.word));
    if(greekCandidate)probes=[...probes.slice(0,2),greekCandidate];
   }
   item.originalScriptProbes=probes.filter(p=>e.lengua==="grc"?greek.test(p.word):!greek.test(p.word)).length;
   if(probes.length<2)throw Error("OCR sin vocabulario suficiente para cotejar");
   for(const probe of probes){
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
// Consultas léxicas explícitas sobre los fragmentos reales de R2.
for(const term of ["symmetria","firmitas","decor","λόγος","συμμετρία"]){
 const query={term,status:"not-checked",indexedEditions:0,validatedPage:null};
 try{
  const word=P.fold(term).split(" ").find(Boolean);
  const root=stem(word);
  let indexFragment=null;
  try{indexFragment=await fragment(root)}
  catch(e){
   if(e.message.includes("HTTP 404 en ")){
    query.root=root;query.status="no-attested-match-in-index";
    report.lexicalQueries.push(query);continue;
   }
   throw e;
  }
  const entries=indexFragment.raices?.[root]||{};
  const inCatalogue=Object.keys(entries).filter(id=>rows.has(id));
  query.root=root;query.indexedEditions=inCatalogue.length;
  query.status=inCatalogue.length?"found":"no-attested-match-in-index";
  if(inCatalogue.length){
   const id=inCatalogue[0],page=entries[id]?.[1]?.[0];
   if(Number.isInteger(page)&&page>0){
    const document=await (await read(rows.get(id).texto)).json();
    const pageText=document.paginas?.[page-1]||"";
    if(!P.fold(pageText).split(" ").some(w=>stem(w)===root))
     throw Error("La página devuelta no contiene la raíz "+root);
    query.validatedPage={editionId:id,page,viewer:"buscador-facsimiles-clasicos.html?obra="+id+"&pagina="+page+"&q="+encodeURIComponent(term)};
   }else throw Error("La entrada no contiene página digital válida");
  }
 }catch(e){query.status="error";query.error=e.message;report.errors.push("Consulta "+term+": "+e.message)}
 report.lexicalQueries.push(query);
}
const endpoints=[
 "https://vitruvius-digital-library.org/bibliotheca-graeca-latina.html",
 "https://vitruvius-digital-library.org/buscador-facsimiles-clasicos.html?obra=apollodorus-poliorcetics",
 "https://diegoalonsok-png.github.io/vitruvius-digital-library/buscador-facsimiles-clasicos.html?obra=athenaeus-mechanicus",
 "https://vitruvius-digital-library.org/lector-bilingue.html?edition=recensio-es",
 "https://vitruvius-digital-library.org/lector-bilingue.html?edition=recensio-fr",
 "https://vitruvius-digital-library.org/lector-bilingue.html?edition=theory-en",
 "https://vitruvius-digital-library.org/classics-text-reader.html?work=virgil-aeneid&lang=la"
];
for(const url of endpoints){
 const row={url,status:"not-checked"};
 try{
  const res=await read(url);const html=await res.text();
  row.status=html.includes("id=\"edition\"")||html.includes("Bibliotheca")||
    html.includes("De architectura")||html.includes("Vitruvius")||
    html.includes("lector-bilingue")?"html-loaded":"html-unexpected";
  row.httpStatus=res.status;
  if(row.status!=="html-loaded")report.warnings.push("HTML inesperado en visor: "+url);
 }catch(e){row.status="unreachable";row.error=e.message;
  report.warnings.push("No se pudo abrir visor público: "+url+" · "+e.message)}
 report.readerEndpoints.push(row);
}
const greekRows=report.records.filter(r=>r.sourceLanguage==="grc");
report.counts={greekAttributedEditions:greekRows.length,
 greekWithOcrGreekRoots:greekRows.filter(r=>r.greekRootsDetected>0).length,
 greekWithoutOcrGreekRoots:greekRows.filter(r=>r.greekRootsDetected===0).length,
 cataloguedEditions:cat.items.length,fullCoverageRequested:FULL,testedEditions:report.records.length,testedWords:report.records.reduce((n,r)=>n+r.lexicalTokensTested,0),
 locatedPages:report.records.reduce((n,r)=>n+r.lexicalMatches.length,0),
 errors:report.errors.length,warnings:report.warnings.length,
 indexEditions:report.indexEntries||0,indexFragments:report.indexFragments||0,
 explicitLexicalQueries:report.lexicalQueries.length,
 lexicalQueriesWithHits:report.lexicalQueries.filter(q=>q.status==="found").length};
if(report.counts.greekWithoutOcrGreekRoots)
 report.warnings.push(report.counts.greekWithoutOcrGreekRoots+
  " ediciones atribuidas a obras griegas no tienen raíces en escritura griega detectadas por el OCR; verificar lengua editorial o renovar OCR griego antes de declarar búsqueda griega.");
report.counts.warnings=report.warnings.length;
report.status=report.errors.length?"errors-detected":report.warnings.length?"verified-sample-with-reservations":"verified-sample";
/* La lista de ediciones sin raíces griegas se deriva de cada auditoría,
   nunca se mantiene a mano. «Sin raíces» no significa ausencia de griego
   en el PDF; puede ser traducción sola o fallo del OCR. */
const greekDeficits=report.records.filter(r=>r.sourceLanguage==="grc"&&r.greekRootsDetected===0)
 .map(r=>{
  const ed=rows.get(r.id)||{};
  return {
   editionId:r.id,work:ed.obra||r.id,
   editionTitle:ed.tituloEdicion||"",
   editionLanguageClaim:ed.idiomaEdicion||"",
   pages:r.ocrPages,greekRootsDetected:0,
   status:"requires_content_language_check",
   reader:"buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(r.id),
   note:"La búsqueda por OCR no ha detectado raíces griegas. Verificar idioma de la edición, páginas interiores y OCR antes de declarar disponible el original griego."
  };
 });
const languageTriage={
 schema:"vdl-greek-ocr-triage-v1",
 generated:report.generated,
 source:"Auditoría léxica R2 sobre "+report.records.length+" ediciones; no sustituye comprobación de portada o folio.",
 summary:{greekWorkEdits:greekRows.length,
 noGreekRootsDetected:greekDeficits.length,editionsToCheck:greekDeficits.length},
 editions:greekDeficits
};
writeFileSync("data/r2/bibliotheca-greek-ocr-triage.json",JSON.stringify(languageTriage,null,2)+"\n","utf8");
writeFileSync("data/r2/bibliotheca-lexical-live-audit.json",JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify({status:report.status,counts:report.counts,readerEndpoints:report.readerEndpoints,
 errors:report.errors,warnings:report.warnings},null,2));
if(REQUIRED&&report.errors.length)process.exitCode=1;
