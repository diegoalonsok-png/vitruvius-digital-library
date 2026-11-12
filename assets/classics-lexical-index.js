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
  const response=await fetch(path,{headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("HTTP "+response.status+" · "+path);
  return response.json();
 })();
 cache.set(path,promise);
 try{return await promise}
 catch(error){cache.delete(path);throw error}
}

const manifest=()=>load(BASE+"manifest.json");

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
async function shardFor(language,stem){
 const catalogue=await load(BASE+language+"/shards.json");
 let best=null;
 for(const shard of catalogue.shards||[]){
  if(stem.startsWith(shard.k)&&(!best||shard.k.length>best.k.length))best=shard;
 }
 if(!best)return null;
 return load(BASE+language+"/"+best.f);
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
 for(const language of languages){
  let shard=null;
  try{shard=await shardFor(language,stem)}catch{continue}
  const entry=shard&&shard[stem];
  if(!entry)continue;
  /* El fragmento guarda «obra:recuento:pasajes», separadas por barra. */
  const decoded=String(entry).split("|").map(piece=>{
   const [work,count,passages]=piece.split(":");
   return [Number(work),Number(count),passages?passages.split(",").map(Number):[]];
  }).filter(row=>Number.isInteger(row[0])&&row[1]>0);
  for(const [workIndex,count,passages] of decoded){
   const work=info.index[workIndex];
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
