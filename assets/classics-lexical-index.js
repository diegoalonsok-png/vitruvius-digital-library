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
   const needle=phrase||exact||result.stem;
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
async function phraseSearch(text,options){
 const settings=options||{};
 const words=(Philology.fold(text)||"").split(" ").filter(word=>word.length>=3);
 if(!words.length)return {query:text,rows:[],total:0};
 const results=[];
 for(const word of words)results.push(await lookup(word,settings));
 const rarest=results.slice().sort((a,b)=>a.total-b.total)[0];
 const allowed=new Set();
 for(const hit of rarest.hits)allowed.add(hit.work.i);
 for(const result of results){
  const present=new Set(result.hits.map(hit=>hit.work.i));
  for(const id of [...allowed])if(!present.has(id))allowed.delete(id);
 }
 const narrowed={...rarest,hits:rarest.hits.filter(hit=>allowed.has(hit.work.i))};
 const rows=await concordance(narrowed,{...settings,phrase:text});
 return {query:text,stem:rarest.stem,rows,total:rows.length,candidateWorks:narrowed.hits.length};
}

return {lookup,distribution,concordance,phraseSearch,manifest,setReader,languages:LANGUAGES,base:BASE};
});
