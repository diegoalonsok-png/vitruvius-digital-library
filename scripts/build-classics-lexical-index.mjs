#!/usr/bin/env node
/* Índice léxico invertido sobre las ediciones de data/classics-corpus.
 *
 * Problema que resuelve. El Lexicon buscaba léxicamente en sus propios
 * corpus-la.json y corpus-grc.json, que reúnen 14 obras latinas y 9 griegas.
 * Las 261 ediciones del corpus clásico quedaban fuera de la búsqueda por
 * palabra, y cualquier consulta obligaba a descargar entre 4 y 7 MB.
 *
 * Diseño. El índice es un GENERADOR DE CANDIDATOS, no un almacén de texto:
 *
 *   · la clave es la raíz recortada por assets/vitruvia-philology.js, la misma
 *     que aplica el navegador a la consulta, de modo que «symmetriae» y
 *     «symmetria» caen en la misma entrada;
 *   · cada entrada guarda, por obra, el número de apariciones y los índices de
 *     los pasajes donde están, nunca el texto;
 *   · las entradas se reparten en fragmentos por las primeras letras de la
 *     raíz, así una consulta descarga decenas de kilobytes en lugar de
 *     megabytes;
 *   · la forma exacta, la frase literal y la concordancia KWIC se verifican
 *     después contra el archivo de la obra, que ya está publicado y es el
 *     único lugar donde vive el texto.
 *
 * De ese modo el índice no puede contradecir al texto: si discrepan, manda el
 * archivo de la edición. El índice tampoco afirma lematización: recorta
 * desinencias para no perder resultados, y lo declara en su propio manifiesto.
 *
 * Uso: node scripts/build-classics-lexical-index.mjs [--check] [--limit N]
 */
import {readFileSync,writeFileSync,readdirSync,statSync,mkdirSync,rmSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");

const SOURCE="data/classics-corpus";
const OUT="data/index/classics";
const CHECK=process.argv.includes("--check");
const LIMIT=(()=>{const i=process.argv.indexOf("--limit");return i>0?Number(process.argv[i+1])||0:0})();
const SHARD_BUDGET=160*1024;      // un fragmento no debería pasar de esto sin comprimir
/* Pasajes guardados por raíz y obra. El recuento total se conserva completo;
   lo que se limita es la lista de pasajes, porque es lo que pesa. Diez
   bastan para una concordancia en pantalla, y quien quiera más abre la
   edición. Para las raíces muy extendidas —las palabras de función, que
   aparecen en casi todas las obras— se guardan menos: su lista no aporta y
   multiplicada por doscientas obras es la mitad del índice. */
const MAX_PASSAGES=10;
const MAX_PASSAGES_COMMON=3;
const COMMON_WORKS=60;
const MIN_TOKEN=2;

const started=Date.now();
const files=readdirSync(SOURCE).filter(name=>name.endsWith(".json")).sort();
const chosen=LIMIT?files.slice(0,LIMIT):files;

/* Memoria de raíces: 15 millones de palabras pero sólo unos cientos de miles
   de formas distintas. Sin esta memoria el recorte domina el tiempo total. */
const stemCache=new Map();
function stemOf(word,script){
 let value=stemCache.get(word);
 if(value!==undefined)return value;
 value=P.stem(word,script);
 if(value&&value.length<2)value="";
 stemCache.set(word,value);
 return value;
}

/* Las ediciones propias de Vitruvio no viven en classics-corpus sino en
   data/structured, con otra forma de campo: cada pasaje trae el latín y su
   traducción en el mismo registro. Se incorporan aquí porque el texto de
   Vitruvio es el centro del sitio y faltaba en la búsqueda léxica.
   El latín base es el MISMO en las tres ediciones bilingües: se indexa una
   sola vez, desde la castellana, para no triplicar los recuentos; las tres
   traducciones se indexan por separado, cada una en su lengua. */
const EXTRA=[
 {file:"data/structured/recensio-es.json",field:"latin",lang:"la",
  id:"vitruvius-recensio-la",title:"Vitruvio · De architectura (texto latino de la recensio)",
  /* El registro de búsqueda del sitio conoce estas ediciones como
     «vitruvius» en es, fr y en: las tres contienen el mismo texto latino.
     Se declara aquí para que la puerta del índice sepa que una coincidencia
     en latín implica a las tres, sin contar el latín tres veces. */
  gate:["vitruvius|es","vitruvius|fr","vitruvius|en"],
  attribution:"Vitruvio · De architectura · recensio latina de la edición Kurilo V514",
  editorialStatus:"Texto latino de la recensio propia; no es facsímil ni cotejo de testimonios",
  reader:"lector-bilingue.html?edition=recensio-es&locus={locus}"},
 {file:"data/structured/recensio-es.json",field:"translation",lang:"es",
  id:"vitruvius-recensio-es",title:"Vitruvio · De architectura (traducción castellana V514)",
  gate:["vitruvius|es"],
  attribution:"Traducción castellana de Diego A. Kurilo, edición V514",
  editorialStatus:"Traducción de autor",
  reader:"lector-bilingue.html?edition=recensio-es&locus={locus}"},
 {file:"data/structured/recensio-fr.json",field:"translation",lang:"fr",
  id:"vitruvius-recensio-fr",title:"Vitruve · De architectura (traduction française V554)",
  gate:["vitruvius|fr"],
  attribution:"Traduction française de Diego A. Kurilo, édition V554",
  editorialStatus:"Traducción de autor",
  reader:"lector-bilingue.html?edition=recensio-fr&locus={locus}"},
 {file:"data/structured/theory-en.json",field:"translation",lang:"en",
  id:"vitruvius-theory-en",title:"Vitruvius · De architectura (English edition V297)",
  gate:["vitruvius|en"],
  attribution:"English edition by Diego A. Kurilo, V297",
  editorialStatus:"Traducción de autor",
  reader:"lector-bilingue.html?edition=theory-en&locus={locus}"}
];

const works=[];
/* raíz → Map(obra → [recuento, [pasajes]]) */
const index=new Map();
let totalTokens=0,totalPassages=0;

for(const name of chosen){
 const raw=JSON.parse(readFileSync(SOURCE+"/"+name,"utf8"));
 const passages=raw.passages||[];
 if(!passages.length)continue;
 const language=String(raw.language||"und");
 const script=language==="grc"?"greek":language==="he"?"hebrew":"latin";
 const workIndex=works.length;
 let tokens=0;
 passages.forEach((passage,passageIndex)=>{
  const folded=P.fold(passage.text||"");
  if(!folded)return;
  const words=folded.split(" ");
  tokens+=words.length;
  /* Una raíz por pasaje se cuenta una vez en la lista de pasajes y tantas
     veces como aparezca en el recuento. */
  const here=new Map();
  for(const word of words){
   if(word.length<MIN_TOKEN)continue;
   const stem=stemOf(word,script);
   if(!stem)continue;
   here.set(stem,(here.get(stem)||0)+1);
  }
  for(const [stem,count] of here){
   let byWork=index.get(stem);
   if(!byWork){byWork=new Map();index.set(stem,byWork)}
   let entry=byWork.get(workIndex);
   if(!entry){entry=[0,[]];byWork.set(workIndex,entry)}
   entry[0]+=count;
   if(entry[1].length<MAX_PASSAGES)entry[1].push(passageIndex);
  }
 });
 totalTokens+=tokens;totalPassages+=passages.length;
 works.push({
  i:workIndex,
  id:raw.workId||name.replace(/\.json$/,""),
  lang:language,
  title:raw.title||"",
  file:SOURCE+"/"+name,
  passages:passages.length,
  tokens,
  urn:raw.sourceUrn||"",
  source:raw.source||"",
  sha256:raw.sourceSha256||"",
  attribution:raw.attribution||"",
  license:raw.license||"",
  editorialStatus:raw.editorialStatus||""
 });
}

/* Ediciones propias, con su campo y su lengua declarados. */
for(const extra of EXTRA){
 if(!existsSync(extra.file))continue;
 const raw=JSON.parse(readFileSync(extra.file,"utf8"));
 const passages=raw.passages||[];
 if(!passages.length)continue;
 const script=extra.lang==="grc"?"greek":extra.lang==="he"?"hebrew":"latin";
 const workIndex=works.length;
 let tokens=0,used=0;
 passages.forEach((passage,passageIndex)=>{
  const folded=P.fold(passage[extra.field]||"");
  if(!folded)return;
  used++;
  const words=folded.split(" ");
  tokens+=words.length;
  const here=new Map();
  for(const word of words){
   if(word.length<MIN_TOKEN)continue;
   const stem=stemOf(word,script);
   if(!stem)continue;
   here.set(stem,(here.get(stem)||0)+1);
  }
  for(const [stem,count] of here){
   let byWork=index.get(stem);
   if(!byWork){byWork=new Map();index.set(stem,byWork)}
   let entry=byWork.get(workIndex);
   if(!entry){entry=[0,[]];byWork.set(workIndex,entry)}
   entry[0]+=count;
   if(entry[1].length<MAX_PASSAGES)entry[1].push(passageIndex);
  }
 });
 if(!used)continue;
 totalTokens+=tokens;totalPassages+=used;
 works.push({
  i:workIndex,id:extra.id,lang:extra.lang,title:extra.title,
  file:extra.file,field:extra.field,passages:used,tokens,
  urn:raw.urn||"",source:extra.file,sha256:"",
  attribution:extra.attribution,license:raw.license||"",
  editorialStatus:extra.editorialStatus,reader:extra.reader||"",
  gate:extra.gate||[]
 });
}

/* Fuentes del Lexicon en data/lexicon/fontes: tienen la misma forma que el
   corpus clásico (locus y text) y el registro de búsqueda las recorre, pero
   no estaban en el índice: el motor las visitaba y no encontraba nada que
   buscar. Se indexan con el id que usa el registro, para que coincidan.
   Se incluyen sólo las tres que el registro señala; las otras cuatro del mismo
   directorio repiten obras ya indexadas desde data/classics-corpus con otro
   id, y añadirlas duplicaría los recuentos. */
const FONTES=[
 {file:"data/lexicon/fontes/frontinus-aquaeductu-la.json",id:"frontinus",lang:"la",
  title:"Frontino · De aquaeductu urbis Romae"},
 {file:"data/lexicon/fontes/pliny-naturalis-la.json",id:"pliny",lang:"la",
  title:"Plinio el Viejo · Naturalis historia"},
 {file:"data/lexicon/fontes/varro-rustica-la.json",id:"varro-rustica",lang:"la",
  title:"Varrón · Rerum rusticarum libri tres"}
];
for(const fonte of FONTES){
 if(!existsSync(fonte.file))continue;
 const raw=JSON.parse(readFileSync(fonte.file,"utf8"));
 const passages=raw.passages||[];
 if(!passages.length)continue;
 const script=fonte.lang==="grc"?"greek":"latin";
 const workIndex=works.length;
 let tokens=0,used=0;
 passages.forEach((passage,passageIndex)=>{
  const folded=P.fold(passage.text||"");
  if(!folded)return;
  used++;
  const words=folded.split(" ");
  tokens+=words.length;
  const here=new Map();
  for(const word of words){
   if(word.length<MIN_TOKEN)continue;
   const stem=stemOf(word,script);
   if(!stem)continue;
   here.set(stem,(here.get(stem)||0)+1);
  }
  for(const [stem,count] of here){
   let byWork=index.get(stem);
   if(!byWork){byWork=new Map();index.set(stem,byWork)}
   let entry=byWork.get(workIndex);
   if(!entry){entry=[0,[]];byWork.set(workIndex,entry)}
   entry[0]+=count;
   if(entry[1].length<MAX_PASSAGES)entry[1].push(passageIndex);
  }
 });
 if(!used)continue;
 totalTokens+=tokens;totalPassages+=used;
 works.push({i:workIndex,id:fonte.id,lang:fonte.lang,title:fonte.title,
  file:fonte.file,passages:used,tokens,urn:raw.sourceUrn||"",source:raw.source||"",
  sha256:raw.sourceSha256||"",attribution:raw.attribution||"",license:raw.license||"",
  editorialStatus:raw.editorialStatus||"",gate:[fonte.id+"|"+fonte.lang]});
}

/* Ediciones servidas como HTML. Se indexan SÓLO para la puerta: se cuenta en
   qué edición está cada raíz, sin guardar índices de pasaje, porque la forma
   en que el motor divide un HTML en pasajes vive en su propio cargador y un
   índice de pasaje calculado aquí podría no corresponder. La concordancia de
   estas ediciones sigue haciéndose sobre el archivo, como hasta ahora. */
const HTML_EDITIONS=[
 {file:"corpus/catullus-carmina-la.html",id:"catullus-carmina",lang:"la",title:"Catulo · Carmina"},
 {file:"corpus/cicero-de-officiis-la.html",id:"cicero-officiis",lang:"la",title:"Cicerón · De officiis"},
 {file:"corpus/cicero-de-officiis-en.html",id:"cicero-officiis",lang:"en",title:"Cicero · On Duties"},
 {file:"corpus/lucretius-de-rerum-natura-la.html",id:"lucretius",lang:"la",title:"Lucrecio · De rerum natura"},
 {file:"corpus/lucretius-de-rerum-natura-es.html",id:"lucretius",lang:"es",title:"Lucrecio · De rerum natura (castellano)"},
 {file:"corpus/lucretius-de-rerum-natura-en.html",id:"lucretius",lang:"en",title:"Lucretius · On the Nature of Things"}
];
for(const edition of HTML_EDITIONS){
 if(!existsSync(edition.file))continue;
 const html=readFileSync(edition.file,"utf8");
 const text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ").replace(/&[a-z]+;|&#\d+;/gi," ");
 const folded=P.fold(text);
 if(!folded)continue;
 const script=edition.lang==="grc"?"greek":"latin";
 const workIndex=works.length;
 const words=folded.split(" ");
 const counts=new Map();
 for(const word of words){
  if(word.length<MIN_TOKEN)continue;
  const stem=stemOf(word,script);
  if(!stem)continue;
  counts.set(stem,(counts.get(stem)||0)+1);
 }
 for(const [stem,count] of counts){
  let byWork=index.get(stem);
  if(!byWork){byWork=new Map();index.set(stem,byWork)}
  byWork.set(workIndex,[count,[]]);
 }
 totalTokens+=words.length;
 works.push({i:workIndex,id:edition.id,lang:edition.lang,title:edition.title,
  file:edition.file,passages:0,tokens:words.length,urn:"",source:edition.file,sha256:"",
  attribution:edition.title+" · edición alojada en HTML",license:"",
  editorialStatus:"Texto alojado en HTML; el índice sólo registra presencia, no pasajes",
  gateOnly:true,gate:[edition.id+"|"+edition.lang]});
}

/* Reparto en fragmentos: dos primeras letras de la raíz, y tres cuando el
   fragmento resultante se pasa del presupuesto. */
/* Las claves se cortan por puntos de código: un jeroglífico ocupa dos
   unidades UTF-16 y cortar por la mitad produce media pareja subrogada, que
   ni es un carácter ni se puede poner en un nombre de archivo. */
const cut=(stem,n)=>[...stem].slice(0,n).join("");
const codepoints=key=>[...key].map(ch=>ch.codePointAt(0).toString(16)).join("-");
const shardFile=key=>"s-"+codepoints(key)+".json";
function shardKey(stem){return cut(stem,2)}
const byLanguage=new Map();
for(const [stem,byWork] of index){
 /* Una raíz puede aparecer en obras de varias lenguas; se guarda en el
    fragmento de cada lengua para que una consulta en griego no descargue
    entradas latinas. */
 const perLanguage=new Map();
 for(const [workIndex,entry] of byWork){
  const language=works[workIndex].lang;
  if(!perLanguage.has(language))perLanguage.set(language,[]);
  perLanguage.get(language).push([workIndex,entry[0],entry[1]]);
 }
 for(const [language,list] of perLanguage){
  if(!byLanguage.has(language))byLanguage.set(language,new Map());
  byLanguage.get(language).set(stem,list);
 }
}

const report=[];
if(!CHECK){
 if(existsSync(OUT))rmSync(OUT,{recursive:true,force:true});
 mkdirSync(OUT,{recursive:true});
}

const languageSummary=[];
for(const [language,entries] of byLanguage){
 const buckets=new Map();
 for(const [stem,list] of entries){
  const key=shardKey(stem);
  if(!buckets.has(key))buckets.set(key,new Map());
  buckets.get(key).set(stem,list);
 }
 /* Los fragmentos que se pasan del presupuesto se parten por la letra
    siguiente, tantas veces como haga falta. Un prefijo que ya no se puede
    alargar —todas sus raíces son iguales de cortas— se deja como está: es
    mejor un fragmento grande que una partición imposible. */
 const finalBuckets=new Map();
 const place=(key,bucket,depth)=>{
  const size=JSON.stringify(Object.fromEntries(bucket)).length;
  if(size<=SHARD_BUDGET||depth>=6||bucket.size<=1){finalBuckets.set(key,bucket);return}
  const split=new Map();
  let splittable=false;
  for(const [stem,list] of bucket){
   const longer=cut(stem,depth+1);
   const deeper=[...longer].length>[...key].length;
   if(deeper)splittable=true;
   const target=deeper?longer:key;
   if(!split.has(target))split.set(target,new Map());
   split.get(target).set(stem,list);
  }
  if(!splittable){finalBuckets.set(key,bucket);return}
  for(const [longer,part] of split){
   /* Las raíces que no admiten un prefijo más largo se quedan en su propia
      clave: el navegador busca el prefijo más largo que coincida, de modo que
      «επ» y «επα» conviven sin ambigüedad. */
   if(longer===key)finalBuckets.set(key,part);
   else place(longer,part,depth+1);
  }
 };
 for(const [key,bucket] of buckets)place(key,bucket,2);
 const shards=[];
 let bytes=0;
 for(const [key,bucket] of [...finalBuckets].sort((a,b)=>a[0].localeCompare(b[0]))){
  /* Codificación compacta. Un objeto JSON por raíz costaba más en corchetes y
     comillas que en datos: «obra:recuento:pasajes separados por coma», y las
     obras separadas por barra. El cliente lo descompone en una línea. */
  const payload={};
  for(const [stem,list] of bucket){
   const ordered=list.slice().sort((a,b)=>b[1]-a[1]);
   const common=ordered.length>=COMMON_WORKS;
   const cap=common?MAX_PASSAGES_COMMON:MAX_PASSAGES;
   payload[stem]=ordered.map(([workIndex,count,passages])=>
    workIndex+":"+count+(passages&&passages.length?":"+passages.slice(0,cap).join(","):"")
   ).join("|");
  }
  const text=JSON.stringify(payload);
  bytes+=text.length;
  shards.push({k:key,f:shardFile(key),stems:bucket.size,bytes:text.length});
  if(!CHECK){
   mkdirSync(OUT+"/"+language,{recursive:true});
   writeFileSync(OUT+"/"+language+"/"+shardFile(key),text);
  }
 }
 /* El navegador no calcula nombres de archivo: lee este catálogo y busca el
    prefijo más largo que coincida con la raíz de su consulta. */
 if(!CHECK)writeFileSync(OUT+"/"+language+"/shards.json",JSON.stringify({
  language,budget:SHARD_BUDGET,
  shards:shards.map(entry=>({k:entry.k,f:entry.f,n:entry.stems}))
 }));
 const biggest=shards.slice().sort((a,b)=>b.bytes-a.bytes)[0];
 languageSummary.push({language,stems:entries.size,shards:shards.length,bytes});
 report.push(`  ${language}: ${entries.size.toLocaleString("es-AR")} raíces · ${shards.length} fragmentos · ${(bytes/1048576).toFixed(1)} MB · mayor fragmento ${(biggest.bytes/1024).toFixed(0)} KB (${biggest.k})`);
}

const manifest={
 schema:"vitruvia-classics-lexical-index-v1",
 generated:new Date().toISOString().slice(0,10),
 method:"Indice invertido de candidatos sobre las ediciones de data/classics-corpus y las ediciones propias de Vitruvio en data/structured. La clave es la raiz recortada por assets/vitruvia-philology.js, la misma que aplica el navegador a la consulta: no es lematizacion morfologica y no afirma analisis gramatical. Cada entrada se codifica como obra:recuento:pasajes y guarda hasta "+MAX_PASSAGES+" pasajes por obra ("+MAX_PASSAGES_COMMON+" para las raices presentes en mas de "+COMMON_WORKS+" obras); el recuento es completo y el texto no se copia. La forma exacta, la frase literal y la concordancia se verifican contra el archivo de la edicion, que es la unica fuente del texto: si el indice y la edicion discrepan, manda la edicion.",
 limits:"Un recuento por raiz agrupa formas flexionadas distintas. La lista de pasajes por obra esta limitada y el recuento total es completo: una concordancia muestra los primeros pasajes, no todos. Las traducciones se indexan por separado y una coincidencia en una traduccion no es una coincidencia en el original.",
 works:works.length,
 passages:totalPassages,
 tokens:totalTokens,
 forms:stemCache.size,
 languages:languageSummary,
 shardBudget:SHARD_BUDGET,
 maxPassagesPerWork:MAX_PASSAGES,maxPassagesCommon:MAX_PASSAGES_COMMON,commonThreshold:COMMON_WORKS,encoding:"obra:recuento:pasajes|…",
 index:works
};
if(!CHECK)writeFileSync(OUT+"/manifest.json",JSON.stringify(manifest));

console.log("Ediciones indexadas: "+works.length+" · pasajes: "+totalPassages.toLocaleString("es-AR")+" · palabras: "+totalTokens.toLocaleString("es-AR")+" · formas distintas: "+stemCache.size.toLocaleString("es-AR"));
console.log(report.join("\n"));
console.log("Tiempo: "+((Date.now()-started)/1000).toFixed(1)+" s"+(CHECK?" — comprobacion, sin escribir —":" — escrito en "+OUT+" —"));
