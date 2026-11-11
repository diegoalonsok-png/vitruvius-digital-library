/* Vitruvia · ordenación de resultados
 *
 * Sustituye la suma de coincidencias que ordenaba antes los resultados. El
 * problema de aquella suma no era la velocidad sino la coherencia: una ficha
 * larga ganaba por repetir la palabra, una pizzería llamada «Alejandro Magno»
 * competía con el rey de Macedonia, y la misma entidad aparecía tres veces
 * porque venía de tres fuentes distintas.
 *
 * Cuatro decisiones, en este orden:
 *
 *  1. BM25 con pesos por campo. El título pesa más que el fragmento, la
 *     repetición satura y la longitud se normaliza, de modo que un artículo
 *     extenso no gana por insistir. El IDF se calcula sobre el conjunto
 *     recuperado: en una búsqueda de humanidades, la palabra que aparece en
 *     todos los resultados no distingue nada.
 *  2. Coincidencia por niveles. Literal, luego clave entre alfabetos, luego
 *     raíz recortada, cada uno con menos peso. Así «symmetriae» encuentra
 *     «symmetria» sin que una coincidencia aproximada desplace a una exacta.
 *  3. Prioridad por fuente y por época. El fondo propio, los repertorios de
 *     autoridades y los textos primarios van por delante de los agregadores.
 *     Las señales de antigüedad suben; el ruido comercial baja.
 *  4. Una entidad, un resultado. Deduplicación por identificador de Wikidata
 *     o por título normalizado, y un tope por fuente para que ningún
 *     proveedor inunde la primera pantalla.
 *
 * Lo que no hace: no decide qué es verdadero ni pondera la calidad académica
 * de un trabajo. Ordena indicios de pertinencia y declara cuáles usó:
 * `explain(fila)` devuelve el desglose, y la página puede mostrarlo.
 *
 * Navegador: window.VitruviaRank. Node: module.exports, para
 *   node scripts/test-vitruvia-rank.mjs
 */
(function(root,factory){
 const api=factory(typeof require==="function"&&typeof module==="object"?require("./vitruvia-philology.js"):(typeof root!=="undefined"?root.VitruviaPhilology:null));
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(typeof root!=="undefined")root.VitruviaRank=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Philology){
"use strict";

const P=Philology||{
 fold:s=>String(s==null?"":s).normalize("NFD").replace(/\p{M}+/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim(),
 scriptKey:s=>s,stem:s=>s,sameFamily:(a,b)=>a===b
};

/* ───────────────────────── señales de materia ───────────────────────── */

/* Ruido comercial y turístico. No es censura de dominios: es la constatación
   de que quien escribe «Alejandro Magno» en un buscador de humanidades no
   busca un restaurante. Una ficha con estas marcas no desaparece; cae al
   final, y puede volver si la consulta pide expresamente lo moderno. */
const NOISE=/(restaurant|restauraci[oó]n de comidas|pizzer|trattoria|taberna moderna|cafeter|hotel|hostal|hostel|apartament|alquiler|men[uú] del d[ií]a|reservar? mesa|tripadvisor|booking\.com|opiniones de clientes|delivery|pedidos? ya|sucursal|franquicia|peluquer|gimnasio|cl[ií]nica dental|inmobiliaria|comprar online|env[ií]o gratis|precio|oferta|descuento|outlet|tienda oficial|camiseta|disfraz|videojuego|tragaperras|casino|apuestas)/i;
const NOISE_LEGAL=/\b(s\.?\s?l\.?\s?u?\.?|s\.?\s?a\.?\s?u?\.?|ltda|gmbh|inc\.|llc|c\.?\s?v\.?)\b/i;
const NOISE_CONTACT=/(\+\d{2,3}[\s.-]?\d{3,}|tel[eé]fono:|horario de atenci|c\/\s?\w+,\s?\d+)/i;

/* Señales de antigüedad y de estudio histórico. Suben la ficha porque son lo
   que el sitio busca: la materia de la que trata. */
const ANCIENT=/(a\.?\s?c\.?\b|\bbce\b|antig[üu]edad|antiquity|antiqu[ií]simo|helen[ií]st|hellenis|grecorromano|greco-roman|\bromano?s?\b|\broman\b|\bgriego?s?\b|\bgreek\b|lat[ií]n|\blatin\b|cl[aá]sic|classical|imperio romano|rep[uú]blica romana|emperador|emperor|fara[oó]n|pharaoh|dinast[ií]a|dynasty|helenismo|bizantin|byzantin|medieval|arqueolog|archaeolog|epigraf|epigraph|papirolog|papyrolog|numism[aá]t|inscripci[oó]n|inscription|manuscrit|manuscript|c[oó]dice|codex|incunable|facs[ií]mil|escoliast|scholia|fil[oó]log|philolog|ecd[oó]tica|textual criticism)/i;
const PERSON_SIGNAL=/(\b(rey|reina|emperador|emperatriz|c[oó]nsul|general|estratego|tirano|fil[oó]sofo|historiador|poeta|orador|dramaturgo|ret[oó]rico|arquitecto|escultor|pintor|pintora|artista|m[eé]dico|astr[oó]nomo|ge[oó]grafo|matem[aá]tico|gram[aá]tico|jurista|obispo|santo|profeta)\b|\b(king|queen|emperor|consul|philosopher|historian|poet|orator|playwright|architect|sculptor|painter|physician|astronomer|geographer|mathematician)\b|\b(\d{1,4})\s?(a\.?\s?c\.?|bce|d\.?\s?c\.?|ce)\b)/i;

/* Prioridad por fuente. El fondo propio del sitio primero, porque es lo que
   el sitio puede mostrar íntegro y con aparato; después las autoridades y los
   textos primarios; los agregadores comerciales al final. */
const SOURCE_PRIOR=[
 [/(bibliotheca vitruviana|biblioteca vitruviana|fondo propio|codex|c[oó]dice|aparato cr[ií]tico|kurilo|edici[oó]n v\d{3})/i,3.2],
 [/(wikidata|viaf|getty|aat|ulan|gnd|isni|library of congress|authority)/i,2.4],
 [/(wikisource|perseus|scaife|thelatinlibrary|documenta catholica|papyri\.info|trismegistos|pleiades|epidoc)/i,2.3],
 [/(wikipedia|enciclopedia|encyclop)/i,2.0],
 [/(internet archive|archive\.org|gallica|hathitrust|e-codices|biblissima|bayerische|mdz|bne|bnf|british library|vatican)/i,2.2],
 [/(crossref|openalex|zenodo|doaj|semantic scholar|europe pmc|jstor|persee|pers[eé]e|dialnet|redalyc)/i,1.9],
 [/(museo|museum|met\b|rijksmuseum|smithsonian|prado|louvre|uffizi|commons)/i,1.7],
 [/(open library|google books|worldcat|goodreads|librarything)/i,1.2],
 [/(musicbrainz|discogs|cover art)/i,1.1]
];
function sourcePrior(row){
 const text=[row.source,row.meta,row.provider].filter(Boolean).join(" ");
 for(const [pattern,weight] of SOURCE_PRIOR)if(pattern.test(text))return weight;
 return 1;
}

/* ───────────────────────── campos y niveles ───────────────────────── */

const FIELDS=[["title",3.4],["author",1.8],["excerpt",1.0],["meta",0.5]];
const TIER={literal:1,key:0.85,stem:0.6};
const K1=1.2,B=0.75;

const tokenise=value=>P.fold(value).split(" ").filter(Boolean);

function rowProfile(row){
 const profile={length:0,fields:{}};
 for(const [field] of FIELDS){
  const tokens=tokenise(row[field]);
  const literal=new Set(tokens);
  const keys=new Set(tokens.map(t=>P.scriptKey(t)).filter(Boolean));
  const stems=new Set(tokens.map(t=>P.stem(t)).filter(t=>t&&t.length>=3));
  profile.fields[field]={tokens,literal,keys,stems,length:tokens.length};
  profile.length+=tokens.length;
 }
 profile.text=FIELDS.map(([field])=>String(row[field]==null?"":row[field])).join(" · ");
 return profile;
}

/* Un término cuenta en el nivel más alto en que aparezca; los niveles no se
   suman entre sí, para que una coincidencia aproximada no simule una exacta. */
function termHits(field,term){
 if(field.literal.has(term.literal))return {tier:"literal",count:field.tokens.filter(t=>t===term.literal).length};
 if(term.key&&field.keys.has(term.key))return {tier:"key",count:1};
 if(term.stem&&field.stems.has(term.stem))return {tier:"stem",count:1};
 return null;
}

function queryTerms(expansion){
 const seen=new Set(),terms=[];
 for(const token of (expansion&&expansion.tokens)||[]){
  const literal=P.fold(token);
  if(!literal||seen.has(literal))continue;
  seen.add(literal);
  terms.push({literal,key:P.scriptKey(literal),stem:P.stem(literal),weight:1});
 }
 /* Las variantes onomásticas entran con menos peso: son candidatas, no la
    palabra que escribió el lector. */
 for(const variant of (expansion&&expansion.variants)||[]){
  for(const token of tokenise(variant)){
   if(seen.has(token))continue;
   seen.add(token);
   terms.push({literal:token,key:P.scriptKey(token),stem:P.stem(token),weight:0.55});
  }
 }
 return terms;
}

/* ───────────────────────── puntuación ───────────────────────── */

function score(row,profile,terms,stats,expansion,phrases){
 const parts=[];
 let relevance=0;
 for(const [field,weight] of FIELDS){
  const data=profile.fields[field];
  if(!data.length)continue;
  const average=stats.averageLength[field]||data.length||1;
  const norm=1-B+B*(data.length/average);
  let fieldScore=0;
  for(const term of terms){
   const hit=termHits(data,term);
   if(!hit)continue;
   const tf=hit.count;
   const saturated=(tf*(K1+1))/(tf+K1*norm);
   fieldScore+=stats.idf[term.literal]*saturated*TIER[hit.tier]*term.weight;
  }
  if(fieldScore){relevance+=fieldScore*weight;parts.push(field+" "+fieldScore.toFixed(2))}
 }

 /* Frase literal: lo que el lector puso entre comillas vale más que sus
    palabras por separado. */
 const haystack=P.fold(profile.text);
 for(const phrase of phrases){
  const folded=P.fold(phrase);
  if(!folded)continue;
  if(P.fold(row.title||"").includes(folded)){relevance+=9;parts.push("frase en título +9")}
  else if(haystack.includes(folded)){relevance+=4.5;parts.push("frase +4,5")}
 }
 /* Proximidad: dos términos de la consulta cerca uno del otro indican que la
    ficha habla de lo buscado y no de dos cosas distintas. */
 if(terms.length>1){
  const tokens=P.fold(profile.text).split(" ");
  const positions=terms.map(term=>tokens.indexOf(term.literal)).filter(index=>index>=0);
  if(positions.length>1){
   const spread=Math.max(...positions)-Math.min(...positions);
   if(spread<=5){relevance+=2.5;parts.push("proximidad +2,5")}
  }
 }

 const prior=sourcePrior(row);
 if(prior!==1)parts.push("fuente ×"+prior.toFixed(2));

 let bonus=0;
 if(ANCIENT.test(profile.text)){bonus+=2.2;parts.push("señal de antigüedad +2,2")}
 if((expansion&&expansion.type)==="person"&&PERSON_SIGNAL.test(profile.text)){bonus+=2.6;parts.push("indicio de persona histórica +2,6")}
 if(row.qid&&expansion&&expansion.qid&&row.qid===expansion.qid){bonus+=6;parts.push("entidad resuelta +6")}
 if(row.localHosted||row.readable){bonus+=1.4;parts.push("texto alojado +1,4")}
 if(row.image||row.thumbnail){bonus+=0.6;parts.push("con imagen +0,6")}

 let penalty=1;
 if(NOISE.test(profile.text)){penalty*=0.12;parts.push("ruido comercial ×0,12")}
 if(NOISE_LEGAL.test(profile.text)){penalty*=0.45;parts.push("forma societaria ×0,45")}
 if(NOISE_CONTACT.test(profile.text)){penalty*=0.4;parts.push("datos de contacto ×0,4")}
 /* Una obra atribuida a la entidad resuelta no tiene por qué repetir el
    nombre de su autor: «La persistencia de la memoria» es de Dalí porque lo
    dice el dato, no porque lo diga el título. Esas fichas entran por relación
    estructural y se ordenan con las demás. Sin esa relación y sin ninguna
    coincidencia textual, una ficha no se sostiene por su fuente. */
 if(row.entityLinked){relevance+=3.2;parts.push("vinculada a la entidad +3,2")}
 if(relevance<=0)return {total:0,parts:["sin coincidencia"]};

 const total=(relevance*prior+bonus)*penalty;
 return {total,parts};
}

/* ───────────────────────── deduplicación ───────────────────────── */

const titleKey=row=>P.fold(row.title).replace(/\b(the|el|la|los|las|le|les|der|die|das)\b/g," ").replace(/\s+/g," ").trim();
function dedupe(rows){
 const byKey=new Map();
 for(const row of rows){
  const key=row.qid?"qid:"+row.qid:"t:"+titleKey(row)+"|"+P.fold(row.author||"");
  const previous=byKey.get(key);
  if(!previous){byKey.set(key,row);continue}
  /* Se conserva la mejor puntuada y se le anexan los enlaces de la otra, para
     no perder el acceso a la fuente desplazada. */
  const best=previous.score>=row.score?previous:row;
  const other=best===previous?row:previous;
  best.alsoIn=[...(best.alsoIn||[]),...(other.alsoIn||[]),{source:other.source,link:other.link}].filter(x=>x&&x.link).slice(0,6);
  byKey.set(key,best);
 }
 return [...byKey.values()];
}

/* Tope por fuente: que un proveedor generoso no ocupe la primera pantalla. */
function diversify(rows,limit){
 const cap=limit||5;
 const used=new Map(),kept=[],deferred=[];
 for(const row of rows){
  const key=P.fold(row.source||"otra");
  const count=used.get(key)||0;
  if(count<cap){used.set(key,count+1);kept.push(row)}
  else deferred.push(row);
 }
 return kept.concat(deferred);
}

/* ───────────────────────── agrupación y orden ───────────────────────── */

const GROUPS={
 identidad:"Identificación",
 obras:"Obras",
 imagenes:"Imágenes",
 escritos:"Escritos y textos",
 manuscritos:"Testimonios manuscritos",
 ediciones:"Ediciones y traducciones",
 pasajes:"Pasajes",
 lexico:"Léxico",
 titulatura:"Titulatura real",
 grabaciones:"Grabaciones",
 estudios:"Estudios",
 enciclopedia:"Enciclopedia y contexto",
 catalogos:"Catálogos y autoridades"
};
const GROUP_ORDER={
 person:["identidad","obras","imagenes","escritos","manuscritos","ediciones","estudios","enciclopedia","grabaciones","catalogos"],
 work:["identidad","ediciones","manuscritos","pasajes","imagenes","estudios","enciclopedia","catalogos"],
 term:["lexico","pasajes","enciclopedia","estudios","obras","catalogos"],
 place:["identidad","imagenes","enciclopedia","estudios","manuscritos","catalogos"],
 citation:["pasajes","ediciones","manuscritos","estudios"],
 concept:["enciclopedia","lexico","pasajes","estudios","obras","imagenes","catalogos"]
};
const GROUP_BY_TYPE={
 person:"identidad",entity:"identidad",artwork:"obras",painting:"obras",work:"obras",
 image:"imagenes",photo:"imagenes",manuscript:"manuscritos",witness:"manuscritos",
 edition:"ediciones",translation:"ediciones",passage:"pasajes",locus:"pasajes",
 lemma:"lexico",term:"lexico",titulary:"titulatura",album:"grabaciones",recording:"grabaciones",
 paper:"estudios",study:"estudios",article:"estudios",book:"escritos",text:"escritos",
 encyclopedia:"enciclopedia",section:"enciclopedia",authority:"catalogos",catalogue:"catalogos"
};
function groupOf(row){
 if(row.group&&GROUPS[row.group])return row.group;
 const byType=GROUP_BY_TYPE[String(row.type||"").toLowerCase()];
 if(byType)return byType;
 if(/wikipedia|enciclop/i.test(row.source||""))return "enciclopedia";
 if(/viaf|wikidata|getty|authority/i.test(row.source||""))return "catalogos";
 if(/archive|gallica|hathi/i.test(row.source||""))return "escritos";
 return "estudios";
}

/* Año utilizable para ordenar «por orden de aparición». Se acepta sólo un
   entero plausible y se respeta el signo de las fechas anteriores a la era. */
const CENTURY=/siglos?\s+([ivxlcdm]+|\d{1,2})\s*(a\.?\s?c\.?|bce|av\.?\s?j|d\.?\s?c\.?|ce|ap\.?\s?j)?/i;
function yearOf(row){
 for(const candidate of [row.year,row.inception,row.date,row.dating,row.published]){
  if(typeof candidate==="number"&&Number.isInteger(candidate)&&candidate>=-4000&&candidate<=2100)return candidate;
  if(typeof candidate!=="string")continue;
  /* Datación por siglos, como la de los códices. Se ordena por el comienzo
     del siglo, que es la convención de los catálogos, y la ficha queda
     marcada como aproximada: no se presenta un siglo como si fuera un año. */
  const century=candidate.match(CENTURY);
  if(century){
   const numeral=century[1];
   const value=/^\d+$/.test(numeral)?Number(numeral):(P.fromRoman?P.fromRoman(numeral):0);
   if(value>0&&value<=21){
    const before=/a|bce|av/i.test(century[2]||"");
    row.yearApprox=true;
    return before?-(value*100):(value-1)*100+1;
   }
  }
  const bce=candidate.match(/(\d{1,4})\s*(?:a\.?\s?c\.?|bce|av\.?\s?j)/i);
  if(bce)return -Number(bce[1]);
  const plain=candidate.match(/\b(1\d{3}|20\d{2}|\d{3})\b/);
  if(plain)return Number(plain[1]);
 }
 return null;
}

/* Dentro de un grupo, si la mayoría de las fichas tiene fecha se ordena por
   fecha —es lo que pide una serie de obras— y si no, por puntuación. Las
   fichas sin fecha van al final, nunca intercaladas como si fuera un orden. */
function orderWithin(rows){
 const dated=rows.filter(row=>yearOf(row)!==null);
 if(dated.length>=Math.max(2,Math.ceil(rows.length*0.6))){
  const undated=rows.filter(row=>yearOf(row)===null).sort((a,b)=>b.score-a.score);
  dated.sort((a,b)=>yearOf(a)-yearOf(b)||b.score-a.score);
  return {rows:dated.concat(undated),order:"cronológico"};
 }
 return {rows:rows.slice().sort((a,b)=>b.score-a.score),order:"pertinencia"};
}

/* ───────────────────────── entrada pública ───────────────────────── */

function rank(input,expansion,options){
 const settings=options||{};
 const rows=(input||[]).filter(Boolean).map(row=>Object.assign({},row));
 if(!rows.length)return [];
 const terms=queryTerms(expansion);
 const phrases=(expansion&&expansion.phrases)||[];
 const profiles=rows.map(rowProfile);

 /* IDF sobre el conjunto recuperado y longitud media por campo. */
 const total=rows.length;
 const df=Object.create(null),sum=Object.create(null);
 for(const [field] of FIELDS)sum[field]=0;
 for(const profile of profiles){
  for(const [field] of FIELDS)sum[field]+=profile.fields[field].length;
  const seen=new Set();
  for(const term of terms){
   if(seen.has(term.literal))continue;
   const present=FIELDS.some(([field])=>termHits(profile.fields[field],term));
   if(present){df[term.literal]=(df[term.literal]||0)+1;seen.add(term.literal)}
  }
 }
 const idf=Object.create(null);
 for(const term of terms){
  const frequency=df[term.literal]||0;
  idf[term.literal]=Math.log(1+(total-frequency+0.5)/(frequency+0.5));
 }
 const averageLength=Object.create(null);
 for(const [field] of FIELDS)averageLength[field]=sum[field]/total;
 const stats={idf,averageLength};

 rows.forEach((row,index)=>{
  const result=score(row,profiles[index],terms,stats,expansion,phrases);
  row.score=result.total;
  row.scoreParts=result.parts;
  row.group=groupOf(row);
  row.year=yearOf(row);
 });

 const kept=rows.filter(row=>row.score>0||row.entityLinked||settings.keepUnmatched);
 const unique=dedupe(kept).sort((a,b)=>b.score-a.score);
 return diversify(unique,settings.perSource);
}

function group(rows,expansion){
 const order=GROUP_ORDER[(expansion&&expansion.type)||"concept"]||GROUP_ORDER.concept;
 const buckets=new Map();
 for(const row of rows||[]){
  const id=row.group||groupOf(row);
  if(!buckets.has(id))buckets.set(id,[]);
  buckets.get(id).push(row);
 }
 const sections=[];
 for(const id of order){
  if(!buckets.has(id))continue;
  const {rows:ordered,order:how}=orderWithin(buckets.get(id));
  sections.push({id,label:GROUPS[id]||id,order:how,rows:ordered});
  buckets.delete(id);
 }
 for(const [id,list] of buckets){
  const {rows:ordered,order:how}=orderWithin(list);
  sections.push({id,label:GROUPS[id]||id,order:how,rows:ordered});
 }
 return sections;
}

const explain=row=>row&&row.scoreParts?row.scoreParts.join(" · "):"";

return {rank,group,explain,dedupe,diversify,orderWithin,groupOf,yearOf,sourcePrior,
 signals:{NOISE,NOISE_LEGAL,NOISE_CONTACT,ANCIENT,PERSON_SIGNAL},
 groups:GROUPS,groupOrder:GROUP_ORDER,fields:FIELDS,tiers:TIER};
});
