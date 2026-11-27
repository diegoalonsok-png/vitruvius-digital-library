/* Vitruvia · consulta del índice léxico del corpus clásico
 *
 * Lee el índice que construye scripts/build-classics-lexical-index.mjs sobre
 * las ediciones de data/classics-corpus. Antes, una búsqueda por palabra en el
 * corpus clásico obligaba a descargar entre 4 y 7 MB; ahora descarga el
 * catálogo de fragmentos y un solo fragmento, y el texto se pide únicamente
 * para los pasajes que se van a mostrar.
 *
 * Regla de autoridad: el índice sólo propone candidatos. La forma exacta, la
 * frase literal y la concordancia se verifican contra el archivo de la
 * edición, que es donde vive el texto. Si el índice y la edición discrepan,
 * manda la edición; el índice se declara desactualizado.
 *
 * Navegador: window.VitruviaClassicsIndex. En node se le puede pasar un
 * lector de archivos, que es como se prueba sin navegador:
 *   node scripts/test-classics-lexical-index.mjs
 */
(function(root,factory){
 const api=factory(typeof require==="function"&&typeof module==="object"?require("./vitruvia-philology.js"):(typeof root!=="undefined"?root.VitruviaPhilology:null));
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(typeof root!=="undefined")root.VitruviaClassicsIndex=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Philology){
"use strict";

const BASE="data/index/classics/";
const LANGUAGES=["grc","la","en","es","fr"];
const cache=new Map();

/* En el navegador se usa fetch; en node se inyecta un lector para poder
   probar el módulo contra los archivos reales del repositorio. */
let reader=null;
function setReader(fn){reader=fn}

async function load(path){
 if(cache.has(path))return cache.get(path);
 const promise=(async()=>{
  if(reader)return reader(path);
  // Canonical cross-origin original text: reuse the existing guarded R2 loader.
  if(/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-z0-9-]+\.json$/.test(path)&&
     typeof globalThis.VitruviaData?.remoteJSON==="function")
   return globalThis.VitruviaData.remoteJSON(path);
  const response=await fetch(path,{headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("HTTP "+response.status+" · "+path);
  return response.json();
 })();
 cache.set(path,promise);
 try{return await promise}
 catch(error){cache.delete(path);throw error}
}

// R2 expansion supplements the original GitHub index. Keep both sources;
// overlapping catalogue identities are counted once, with GitHub first.
let cataloguesTask=null,manifestTask=null;
function catalogues(){
 if(!cataloguesTask)cataloguesTask=(async()=>{
  const local=await load(BASE+"manifest.json");
  const out=[{base:BASE,info:local}];
  // Independently indexed and source-grounded additions; never alter the stable base index.
  try{
   const extra=await load("data/index/classics-additions-2026-11-17/manifest.json");
   if(extra?.schema==="vitruvia-classics-lexical-index-v1"&&extra.works===6&&
      Array.isArray(extra.index)&&extra.index.length===6&&
      extra.index.every(w=>w.file?.startsWith("data/classics-corpus/plato-")&&w.passages>0)){
    out.push({base:"data/index/classics-additions-2026-11-17/",info:extra});
   }
  }catch{/* The pre-existing index remains usable if the addition is unavailable. */}

  try{
   const descriptor=await load("data/r2/classics-expansion-index.json");
   if(descriptor?.schema==="vdl-classics-expansion-index-v1"&&
    /^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/indice\/ampliacion\/[a-f0-9]{24}\/manifest\.json$/.test(descriptor.url||"")){
    const extra=await load(descriptor.url);
    if(extra.works!==descriptor.works)throw Error("Índice ampliado discordante");
    const remoteBase=descriptor.url.replace(/manifest\.json$/,"");
    if(extra.schema==="vdl-classics-index-segments-v1"&&Array.isArray(extra.segments)){
     const segments=await Promise.all(extra.segments.map(async segment=>{
      // Los segmentos anteriores conservan su URL inmutable de R2.
      const rel=/^segment-\d{4}\/manifest\.json$/.test(segment.file);
      const absolute=/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/indice\/ampliacion\/[a-f0-9]{24}\/segment-\d{4}\/manifest\.json$/.test(segment.file);
      if(!rel&&!absolute)throw Error("Ruta de índice inválida");
      const segmentUrl=rel?remoteBase+segment.file:segment.file;
      const info=await load(segmentUrl);
      if(info.schema!=="vitruvia-classics-lexical-index-v1"||!Array.isArray(info.index)||info.index.length!==segment.works)throw Error("Segmento discordante");
      return {base:segmentUrl.slice(0,-"manifest.json".length),info};
     }));
     if(segments.reduce((n,s)=>n+s.info.works,0)!==extra.works)throw Error("Cobertura segmentada discordante");
     out.push(...segments);
    }else{
     if(extra.schema!=="vitruvia-classics-lexical-index-v1"||!Array.isArray(extra.index)||extra.works!==extra.index.length)throw Error("Índice ampliado discordante");
     out.push({base:remoteBase,info:extra});
    }
   }
  }catch{/* The original index remains usable if the optional expansion is offline. */}
  // Independently transcribed critical editions; keep their identities and loci separate.
  try{
   const base="data/index/classics-critical-vitruvius-2026-11-27/";
   const critical=await load(base+"manifest.json");
   const allowed=new Map([["krohn-1912-indexed","data/critical-editions/krohn-1912-tei-loci.json"],["rose-1899-indexed","data/critical-editions/rose-1899-transcribed-loci.json"]]);
   if(critical?.schema==="vitruvia-classics-lexical-index-v1"&&critical.works===2&&Array.isArray(critical.index)&&critical.index.length===2&&new Set(critical.index.map(w=>w.id)).size===2&&critical.index.every(w=>allowed.get(w.id)===w.file&&w.lang==="la"&&w.field==="latin"&&w.passages===731&&w.tokens>0))out.push({base,info:critical});
  }catch{/* The existing index remains operational if this segment is unavailable. */}
  // A complete R2 lexical index is added only after SHA256 verification.
  // Earlier GitHub and R2 expansion editions take precedence on duplicates.
  try{
   const [r2,source]=await Promise.all([
    load("data/index/classics-r2/manifest.json"),
    load("data/r2/corpus-manifest.json")
   ]);
   const sourceDocs=Array.isArray(source?.obras)?new Map(source.obras.map(e=>[source.base+e.archivo,e])):new Map();
   const matches=source?.schema==="vdl-corpus-r2-1"&&
    source.base==="https://libros.vitruvius-digital-library.org/corpus/"&&
    r2?.schema==="vitruvia-classics-lexical-index-v1"&&
    Array.isArray(r2.index)&&r2.works===r2.index.length&&
    r2.r2VerifiedEditions===sourceDocs.size&&r2.works===sourceDocs.size&&
    r2.r2ManifestPath==="data/r2/corpus-manifest.json"&&
    new Set(r2.index.map(w=>w.file)).size===sourceDocs.size&&
    r2.index.every(w=>{
     const original=sourceDocs.get(w.file);
     return original&&w.id===original.workId&&w.lang===original.language&&
      w.sha256===original.sha256&&w.passages===original.pasajes;
    });
   if(matches)out.push({base:"data/index/classics-r2/",info:r2});
  }catch{/* The other indices work before the complete R2 index is generated. */}
  return out;
 })();
 return cataloguesTask;
}
function manifest(){
 if(!manifestTask)manifestTask=catalogues().then(sources=>{
  const first=sources[0].info,index=[],seen=new Set();
  for(const {base,info} of sources)for(const [sourceIndex,work] of info.index.entries()){
   const key=work.id+"|"+work.lang;
   if(seen.has(key))continue;seen.add(key);
   index.push({...work,i:index.length,indexSource:base,indexSourceIndex:sourceIndex});
  }
  return {...first,index,works:index.length,passages:index.reduce((n,w)=>n+(w.passages||0),0),tokens:index.reduce((n,w)=>n+(w.tokens||0),0),
   sourceCount:sources.length,generated:sources.map(s=>s.info.generated).sort().at(-1),
   method:first.method+" La ampliación R2 se consulta por fragmentos y conserva la procedencia de cada edición."};
 });
 return manifestTask;
}

/* Lengua de la consulta. El griego se reconoce por su alfabeto; para el
   alfabeto latino se consulta el latín y, si se piden, las traducciones. */
function languagesFor(query,options){
 const settings=options||{};
 if(settings.languages)return settings.languages.filter(lang=>LANGUAGES.includes(lang));
 const script=Philology?Philology.detectScript(query):"latin";
 if(script==="greek")return ["grc"];
 if(script==="hebrew")return [];
 const list=["la"];
 if(settings.translations)for(const lang of ["es","en","fr"])if(!list.includes(lang))list.push(lang);
 return list;
}

/* El catálogo de fragmentos permite elegir el prefijo más largo que coincida
   con la raíz: así «περ» y «περι» conviven sin ambigüedad. */
async function shardFor(language,stem,base=BASE){
 const catalogue=await load(base+language+"/shards.json");
 let best=null;
 for(const shard of catalogue.shards||[]){
  if(stem.startsWith(shard.k)&&(!best||shard.k.length>best.k.length))best=shard;
 }
 if(!best)return null;
 return load(base+language+"/"+best.f);
}

/* Entrada principal: cuántas veces aparece la raíz de la consulta en cada
   edición. Devuelve recuentos y los índices de los pasajes, nunca texto. */
async function lookup(query,options){
 const settings=options||{};
 const raw=String(query==null?"":query).trim();
 if(!raw)return {query:raw,stem:"",hits:[],total:0,works:0,languages:[]};
 const info=await manifest();
 const script=Philology?Philology.detectScript(raw):"latin";
 const stem=Philology?Philology.stem(raw,script==="greek"?"greek":script==="hebrew"?"hebrew":"latin"):raw.toLowerCase();
 const languages=languagesFor(raw,settings);
 const hits=[];
 let total=0;
 const sourceWorks=new Map(info.index.map(w=>[w.indexSource+"|"+w.indexSourceIndex,w]));
 for(const {base,info:sourceInfo} of await catalogues())for(const language of languages){
  if(Array.isArray(sourceInfo.languages)&&!sourceInfo.languages.some(l=>l.language===language))continue;
  let shard=null;
  try{shard=await shardFor(language,stem,base)}catch{continue}
  const entry=shard&&shard[stem];
  if(!entry)continue;
  /* El fragmento guarda «obra:recuento:pasajes», separadas por barra. */
  const decoded=String(entry).split("|").map(piece=>{
   const [work,count,passages]=piece.split(":");
   return [Number(work),Number(count),passages?passages.split(",").map(Number):[]];
  }).filter(row=>Number.isInteger(row[0])&&row[1]>0);
  for(const [workIndex,count,passages] of decoded){
   const work=sourceWorks.get(base+"|"+workIndex);
   if(!work)continue;
   total+=count;
   hits.push({
    work,
    language,
    count,
    passages:passages||[],
    /* Frecuencia normalizada: sin el tamaño del corpus, un recuento no es
       comparable entre una obra de mil palabras y otra de cien mil. */
    per10k:work.tokens?Number((count/work.tokens*10000).toFixed(2)):null,
    /* Se declara cuando la lista de pasajes está recortada, para que la
       pantalla no presente una concordancia parcial como si fuera completa. */
    truncated:count>(passages||[]).length
   });
  }
 }
 hits.sort((a,b)=>b.count-a.count);
 return {query:raw,stem,hits:settings.limit?hits.slice(0,settings.limit):hits,total,works:hits.length,
  languages,generated:info.generated,method:info.method,limits:info.limits};
}

/* Distribución por autor, lengua y época a partir de los recuentos ya
   obtenidos. No añade datos: reagrupa los que hay. */
function distribution(result){
 const byLanguage=new Map();
 for(const hit of result.hits||[]){
  const key=hit.language;
  const row=byLanguage.get(key)||{language:key,count:0,works:0,tokens:0};
  row.count+=hit.count;row.works+=1;row.tokens+=hit.work.tokens||0;
  byLanguage.set(key,row);
 }
 for(const row of byLanguage.values())row.per10k=row.tokens?Number((row.count/row.tokens*10000).toFixed(2)):null;
 return [...byLanguage.values()].sort((a,b)=>b.count-a.count);
}

/* Concordancia verificada. Se descarga el archivo de la edición —sólo de las
   obras que se van a mostrar— y se comprueba la forma en el texto. La ventana
   de contexto se toma del texto real, no del índice. */
async function concordance(result,options){
 const settings=options||{};
 const works=settings.works||3;
 const perWork=settings.perWork||5;
 const window=settings.window||90;
 const exact=settings.exact?Philology.fold(settings.exact):"";
 const phrase=settings.phrase?Philology.fold(settings.phrase):"";
 /* Conjunto de palabras: todas presentes en el pasaje, en cualquier orden. */
 const allWords=(settings.allWords||[]).map(word=>Philology.fold(word)).filter(Boolean);
 const rows=[];
 for(const hit of (result.hits||[]).slice(0,works)){
  let edition=null;
  try{edition=await load(hit.work.file)}catch{continue}
  const passages=edition.passages||[];
  let shown=0;
  for(const passageIndex of hit.passages){
   if(shown>=perWork)break;
   const passage=passages[passageIndex];
   if(!passage)continue;
   /* Las ediciones propias guardan el texto en «latin» o en «translation»;
      el manifiesto declara cuál, de modo que la verificación lee el mismo
      campo que se indexó y no otro. */
   const field=hit.work.field||"text";
   const text=String(passage[field]||passage.text||passage.original||"");
   const folded=Philology.fold(text);
   /* Verificación contra la edición: si se pidió una forma exacta o una
      frase, el pasaje tiene que contenerla de verdad. */
   if(phrase&&!folded.includes(phrase))continue;
   if(exact&&!new RegExp("(^| )"+exact.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"( |$)").test(folded))continue;
   if(allWords.length){
    const present=new Set(folded.split(" "));
    const stems=new Set([...present].map(word=>Philology.stem(word)));
    if(!allWords.every(word=>present.has(word)||stems.has(Philology.stem(word))))continue;
   }
   const needle=phrase||exact||(allWords.length?allWords.find(word=>folded.includes(word))||allWords[0]:result.stem);
   const at=folded.indexOf(needle);
   const from=at<0?0:Math.max(0,at-window);
   const to=at<0?Math.min(text.length,window*2):Math.min(text.length,at+needle.length+window);
   rows.push({
    work:hit.work,language:hit.language,locus:passage.locus||"",
    left:text.slice(from,at<0?from:at),
    hit:at<0?"":text.slice(at,at+needle.length),
    right:text.slice(at<0?from:at+needle.length,to),
    passageIndex,
    verified:true
   });
   shown++;
  }
 }
 return rows;
}

/* Frase: se buscan las raíces de todas sus palabras, se intersecan por obra y
   se verifica el bloque contiguo contra la edición. La palabra más rara manda,
   porque es la que menos candidatos trae. */
/* Frase: se buscan las raíces de todas sus palabras y se queda con las obras
 * donde están TODAS. Para decidir qué pasajes leer, por cada obra se toma la
 * lista de la palabra que menos veces aparece EN ESA OBRA, no la de la más
 * rara del conjunto: las listas de pasajes están recortadas, y la de la
 * palabra menos frecuente en esa obra es la que tiene más probabilidades de
 * estar completa. Sin esto, «mens sana in corpore sano» no aparecía aunque
 * estuviera, porque se miraban los pasajes de una palabra demasiado común.
 */
async function phraseSearch(text,options){
 const settings=options||{};
 const words=(Philology.fold(text)||"").split(" ").filter(word=>word.length>=3);
 if(!words.length)return {query:text,rows:[],total:0};
 const results=[];
 for(const word of words)results.push(await lookup(word,settings));
 if(results.some(result=>!result.hits.length))
  return {query:text,rows:[],total:0,candidateWorks:0,reason:"alguna palabra de la frase no aparece en el corpus"};
 /* Obras donde están todas las palabras. */
 let allowed=null;
 for(const result of results){
  const present=new Set(result.hits.map(hit=>hit.work.i));
  allowed=allowed===null?present:new Set([...allowed].filter(id=>present.has(id)));
 }
 if(!allowed||!allowed.size)return {query:text,rows:[],total:0,candidateWorks:0,
  reason:"ninguna obra contiene todas las palabras de la frase"};
 /* La señal decisiva no es el recuento sino la COINCIDENCIA DE PASAJE: si dos
    palabras de la frase aparecen en el mismo pasaje de la misma obra, ahí hay
    que mirar. En «mens sana in corpore sano», «sana» y «sano» comparten el
    pasaje 341 de las Sátiras de Juvenal, y es el bueno. Ordenar por recuento
    dejaba a Juvenal en el puesto catorce, fuera del límite de obras que se
    descargan; con la intersección queda primero y se descarga una sola.
    Sólo se intersecan las listas completas: una lista recortada no permite
    concluir que un pasaje no esté. */
 const byWork=new Map();
 for(const result of results){
  for(const hit of result.hits){
   if(!allowed.has(hit.work.i))continue;
   if(!byWork.has(hit.work.i))byWork.set(hit.work.i,[]);
   byWork.get(hit.work.i).push(hit);
  }
 }
 const candidates=[];
 for(const [workIndex,hits] of byWork){
  const complete=hits.filter(hit=>!hit.truncated&&hit.passages.length);
  let shared=null;
  for(const hit of complete){
   const set=new Set(hit.passages);
   shared=shared===null?set:new Set([...shared].filter(passage=>set.has(passage)));
  }
  const intersection=complete.length>=2&&shared?[...shared]:[];
  const leanest=hits.slice().sort((a,b)=>a.count-b.count)[0];
  candidates.push({
   work:leanest.work,language:leanest.language,count:leanest.count,
   passages:intersection.length?intersection:leanest.passages,
   truncated:leanest.truncated,
   evidence:intersection.length?"pasaje compartido por varias palabras de la frase":"pasajes de la palabra menos frecuente",
   rank:intersection.length?0:1
  });
 }
 candidates.sort((a,b)=>a.rank-b.rank||a.count-b.count);
 const narrowed={query:text,stem:results[0].stem,hits:candidates,total:candidates.length};
 const rows=await concordance(narrowed,{works:settings.works||14,perWork:settings.perWork||4,
  window:settings.window||110,phrase:text});
 for(const row of rows)row.match="frase literal";
 /* Segundo nivel, rotulado como lo que es. Muchas sentencias circulan con un
    orden distinto del de su fuente: «alea iacta est» es «iacta alea est» en
    Suetonio, y «ars longa, vita brevis» invierte el orden de Séneca. Si la
    frase literal no aparece, se buscan las mismas palabras dentro de un mismo
    pasaje, y el resultado se presenta como coincidencia de palabras en otro
    orden, nunca como la frase. */
 let reordered=[];
 if(!rows.length&&settings.reordered!==false){
  reordered=await concordance(narrowed,{works:settings.works||14,perWork:settings.perWork||4,
   window:settings.window||110,allWords:words});
  for(const row of reordered)row.match="mismas palabras en el pasaje, en otro orden";
 }
 return {query:text,stem:narrowed.stem,rows:rows.concat(reordered),
  literal:rows.length,reordered:reordered.length,
  total:rows.length+reordered.length,candidateWorks:candidates.length,
  withSharedPassage:candidates.filter(candidate=>!candidate.rank).length};
}

return {lookup,distribution,concordance,phraseSearch,manifest,setReader,languages:LANGUAGES,base:BASE};
});
