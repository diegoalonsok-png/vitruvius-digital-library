/* VITRUVIA · comprensión de consultas.
   - Corrección de errores de tipeo: sugerencia ortográfica de Wikipedia (CirrusSearch) y búsqueda difusa de títulos.
   - Preguntas en lenguaje natural (es/en/fr): «quién ganó…», «quién es…», «cuándo nació…», «quién diseñó…».
   - Datos de entidades desde Wikidata (fechas, lugares, ocupaciones, estilos, géneros, obras, ganador…).
   Todo dato procede de una fuente consultada en vivo y se muestra con su enlace; nada se inventa. */
(()=>{
"use strict";
if(window.VitruviaUnderstand)return;
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const cache=new Map();
async function j(url,ms=4500){
 if(cache.has(url))return cache.get(url);
 const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal,headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(t)}})();
 cache.set(url,p);p.catch(()=>cache.delete(url));return p;
}
const wapi=lang=>"https://"+lang+".wikipedia.org/w/api.php?";
const L=lang=>["es","en","fr"].includes(lang)?lang:"es";
function dist(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(Math.abs(m-n)>3)return 9;let p=Array.from({length:n+1},(_,i)=>i);
 for(let i=1;i<=m;i++){const c=[i];for(let k=1;k<=n;k++)c[k]=Math.min(p[k]+1,c[k-1]+1,p[k-1]+(a[i-1]===b[k-1]?0:1));p=c}return p[n]}

/* ---------- Preguntas en lenguaje natural ---------- */
const Q=[
 [/^(?:¿\s*)?(?:qui[eé]n(?:es)?|que (?:equipo|pais|seleccion))\s+(?:gan[oó]|ganaron|se consagr[oó]|sali[oó] campe[oó]n(?: de)?)\s+(?:el |la |los |las )?(.+)$/i,"P1346"],
 [/^(?:¿\s*)?(?:qui[eé]n|qu[eé] (?:equipo|pa[ií]s|selecci[oó]n))\s+(?:es|fue)\s+(?:el |la )?campe[oó]n(?:a)?\s+(?:de |del |de la )?(.+)$/i,"P1346"],
 [/^(?:who|which team|which country)\s+won\s+(?:the\s+)?(.+)$/i,"P1346"],
 [/^qui a gagn[eé]\s+(?:la |le |les )?(.+)$/i,"P1346"],
 [/^(?:¿\s*)?cu[aá]ndo\s+naci[oó]\s+(.+)$/i,"P569"],[/^when\s+was\s+(.+?)\s+born$/i,"P569"],
 [/^(?:¿\s*)?d[oó]nde\s+naci[oó]\s+(.+)$/i,"P19"],[/^where\s+was\s+(.+?)\s+born$/i,"P19"],
 [/^(?:¿\s*)?cu[aá]ndo\s+muri[oó]\s+(.+)$/i,"P570"],[/^when\s+did\s+(.+?)\s+die$/i,"P570"],
 [/^(?:¿\s*)?qui[eé]n\s+(?:dise[nñ][oó]|proyect[oó]|construy[oó]|fue el arquitecto de)\s+(?:el |la |los |las )?(.+)$/i,"P84"],[/^who\s+(?:designed|built)\s+(?:the\s+)?(.+)$/i,"P84"],
 [/^(?:¿\s*)?qui[eé]n\s+(?:escribi[oó]|es el autor de|fue el autor de)\s+(.+)$/i,"P50"],[/^who\s+wrote\s+(.+)$/i,"P50"],
 [/^(?:¿\s*)?cu[aá]l\s+es\s+la\s+capital\s+de\s+(.+)$/i,"P36"],[/^(?:what is the\s+)?capital of\s+(.+)$/i,"P36"],
 [/^(?:¿\s*)?(?:qui[eé]n|qu[eé])\s+(?:es|era|fue|son|fueron)\s+(.+)$/i,null],[/^(?:who|what)\s+(?:is|was|are|were)\s+(.+)$/i,null],
 [/^(?:¿\s*)?(?:biograf[ií]a|vida y obra|obras|historia)\s+de\s+(.+)$/i,null]
];
function parseQuestion(raw){
 const q=String(raw||"").trim().replace(/[¿?¡!]+/g," ").replace(/\s+/g," ").trim();
 for(const [re,prop] of Q){const m=q.match(re);if(m)return{subject:m[1].trim().replace(/[.,;:]+$/,""),prop,question:true}}
 return{subject:q,prop:null,question:/^(qui[eé]n|qu[eé]|cu[aá]ndo|d[oó]nde|c[oó]mo|por qu[eé]|cu[aá]l|who|what|when|where|how|why)\b/i.test(q)};
}

/* ---------- Corrección y resolución de títulos ---------- */
async function wikiSearch(text,lang){
 const p=new URLSearchParams({action:"query",list:"search",srsearch:text,srlimit:"5",srinfo:"suggestion|totalhits",srprop:"snippet",format:"json",origin:"*"});
 return j(wapi(lang)+p).catch(()=>null);
}
async function fuzzyTitles(text,lang,limit=8){
 const p=new URLSearchParams({action:"opensearch",search:text,limit:String(limit),namespace:"0",profile:"fuzzy",format:"json",origin:"*"});
 const d=await j(wapi(lang)+p,3500).catch(()=>null);return Array.isArray(d)?d[1]||[]:[];
}
/* Devuelve el título de Wikipedia más probable y, si corresponde, la consulta corregida. */
async function bestTitle(text,lang){
 lang=L(lang);const s=await wikiSearch(text,lang);
 const hits=s?.query?.search||[],sug=s?.query?.searchinfo?.suggestion||"";
 let corrected=null,title=hits[0]?.title||null;
 if(sug&&fold(sug)!==fold(text)){
  const s2=await wikiSearch(sug,lang);const h2=s2?.query?.search||[];
  const better=!hits.length||(h2[0]&&(fold(h2[0].title).includes(fold(sug))||(s2.query.searchinfo?.totalhits||0)>(s.query.searchinfo?.totalhits||0)*3));
  if(better&&h2[0]){corrected=sug;title=h2[0].title}
 }
 if(!title||(!corrected&&hits.length&&!fold(hits[0].title).split(" ").some(w=>w.length>3&&fold(text).includes(w)))){
  const fz=await fuzzyTitles(text,lang,3);
  if(fz[0]&&(!title||dist(fold(fz[0]).slice(0,fold(text).length+2),fold(text))<=Math.max(2,Math.floor(fold(text).length/4)))){if(fold(fz[0])!==fold(text))corrected=corrected||fz[0];title=fz[0]}
 }
 return{title,corrected};
}
async function qidFor(title,lang){
 if(!title)return null;
 const p=new URLSearchParams({action:"query",prop:"pageprops",ppprop:"wikibase_item|disambiguation",titles:title,redirects:"1",format:"json",origin:"*"});
 const d=await j(wapi(L(lang))+p).catch(()=>null);const pg=Object.values(d?.query?.pages||{})[0];
 if(!pg||pg.pageprops?.disambiguation!==undefined)return null;
 return{qid:pg.pageprops?.wikibase_item||null,title:pg.title};
}
async function summary(title,lang){
 if(!title)return null;
 return j("https://"+L(lang)+".wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title.replace(/ /g,"_")),4000).catch(()=>null);
}

/* ---------- Wikidata ---------- */
const PROPS={P31:"tipo",P569:"nacimiento",P570:"muerte",P19:"lugar de nacimiento",P20:"lugar de muerte",P106:"ocupación",P135:"movimiento o estilo",P136:"género",P800:"obras destacadas",P1346:"ganador",P585:"fecha",P580:"inicio",P582:"fin",P276:"lugar",P17:"país",P84:"arquitecto",P50:"autor",P36:"capital",P571:"fundación",P527:"integrantes",P264:"sello discográfico",P1303:"instrumento",P166:"premios",P149:"estilo arquitectónico"};
async function labels(ids,lang){
 const out={};ids=[...new Set(ids)].filter(Boolean);
 for(let i=0;i<ids.length;i+=50){
  const p=new URLSearchParams({action:"wbgetentities",ids:ids.slice(i,i+50).join("|"),props:"labels|descriptions|sitelinks",languages:L(lang)+"|en",sitefilter:L(lang)+"wiki|enwiki",format:"json",origin:"*"});
  const d=await j("https://www.wikidata.org/w/api.php?"+p,5000).catch(()=>null);
  for(const [id,e] of Object.entries(d?.entities||{}))out[id]={label:e.labels?.[L(lang)]?.value||e.labels?.en?.value||id,description:e.descriptions?.[L(lang)]?.value||e.descriptions?.en?.value||"",wiki:e.sitelinks?.[L(lang)+"wiki"]?.title||e.sitelinks?.enwiki?.title||""};
 }
 return out;
}
function timeOf(c){const v=c?.mainsnak?.datavalue?.value;if(!v?.time)return null;const m=v.time.match(/^([+-])(\d+)-(\d\d)-(\d\d)/);if(!m)return null;
 const y=(m[1]==="-"?"-":"")+String(+m[2]);return{year:y,iso:v.precision>=11?y+"-"+m[3]+"-"+m[4]:y,precision:v.precision}}
async function facts(qid,lang){
 if(!qid)return null;lang=L(lang);
 const p=new URLSearchParams({action:"wbgetentities",ids:qid,props:"claims|labels|descriptions|sitelinks",languages:lang+"|en",format:"json",origin:"*"});
 const d=await j("https://www.wikidata.org/w/api.php?"+p,5000).catch(()=>null);const e=d?.entities?.[qid];if(!e)return null;
 const C=e.claims||{},items=k=>(C[k]||[]).filter(c=>c.rank!=="deprecated").map(c=>c.mainsnak?.datavalue?.value?.id).filter(Boolean);
 const want=["P31","P19","P20","P106","P135","P136","P800","P1346","P276","P17","P84","P50","P36","P527","P264","P1303","P149"];
 const ids=want.flatMap(k=>items(k).slice(0,k==="P800"?12:8));const lab=await labels(ids,lang);
 const list=k=>items(k).slice(0,k==="P800"?12:8).map(id=>({id,...(lab[id]||{label:id})}));
 const types=items("P31");
 const kind=types.includes("Q5")?"person":types.some(t=>["Q215380","Q5741069","Q2088357","Q9212979"].includes(t))?"band":
  (C.P1346||types.some(t=>/^Q(27020041|500834|1079023|46190676|13406554)$/.test(t)))?"event":(C.P84||C.P149)?"building":"other";
 return{qid,kind,label:e.labels?.[lang]?.value||e.labels?.en?.value||qid,description:e.descriptions?.[lang]?.value||e.descriptions?.en?.value||"",
  wiki:e.sitelinks?.[lang+"wiki"]?.title||e.sitelinks?.enwiki?.title||"",wikiLang:e.sitelinks?.[lang+"wiki"]?lang:"en",
  birth:timeOf(C.P569?.[0]),death:timeOf(C.P570?.[0]),date:timeOf(C.P585?.[0])||timeOf(C.P580?.[0]),founded:timeOf(C.P571?.[0]),
  birthPlace:list("P19")[0]||null,deathPlace:list("P20")[0]||null,occupations:list("P106"),movements:[...list("P135"),...list("P149")],genres:list("P136"),
  works:list("P800"),winner:list("P1346"),place:list("P276")[0]||null,country:list("P17")[0]||null,architect:list("P84"),author:list("P50"),capital:list("P36"),
  members:list("P527"),labelsOf:lab,types};
}

/* ---------- Obras de una persona o grupo (Wikidata SPARQL) ----------
   Intérprete (P175), creador (P170), arquitecto (P84), director (P57), autor (P50), compositor (P86).
   Devuelve las obras ordenadas por fecha de publicación, inicio o inauguración. */
const ALBUM=new Set(["Q482994","Q208569","Q209939","Q222910","Q169930","Q1242743"]);
const FILM=new Set(["Q11424","Q24869","Q202866","Q506240","Q93204","Q229390"]);
const BOOK=new Set(["Q7725634","Q47461344","Q571","Q8261","Q49084","Q1279564","Q5185279","Q25379","Q35760"]);
const PAINT=new Set(["Q3305213","Q860861","Q93184","Q11060274","Q18761202"]);
const SONG=new Set(["Q134556","Q7366","Q105543609"]);
async function works(qid,lang){
 if(!/^Q\d+$/.test(qid||""))return[];lang=L(lang);
 const q=`SELECT ?w (SAMPLE(?lab) AS ?label) (SAMPLE(?desc) AS ?description) (MIN(?date) AS ?when) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?type),"entity/");separator=" ") AS ?types) (SAMPLE(?role) AS ?r) (SAMPLE(?collL) AS ?collection) (SAMPLE(?c) AS ?coord) (SAMPLE(?art) AS ?article) (SAMPLE(?img) AS ?image) WHERE {
 VALUES (?p ?role) { (wdt:P175 "performer") (wdt:P170 "creator") (wdt:P84 "architect") (wdt:P57 "director") (wdt:P50 "author") (wdt:P86 "composer") }
 ?w ?p wd:${qid} .
 OPTIONAL{?w wdt:P577 ?pub} OPTIONAL{?w wdt:P571 ?inc} OPTIONAL{?w wdt:P1619 ?open}
 BIND(COALESCE(?pub,?inc,?open) AS ?date)
 OPTIONAL{?w wdt:P31 ?type}
 OPTIONAL{?w rdfs:label ?l1 FILTER(LANG(?l1)="${lang}")} OPTIONAL{?w rdfs:label ?l2 FILTER(LANG(?l2)="en")} BIND(COALESCE(?l1,?l2) AS ?lab)
 OPTIONAL{?w schema:description ?d1 FILTER(LANG(?d1)="${lang}")} OPTIONAL{?w schema:description ?d2 FILTER(LANG(?d2)="en")} BIND(COALESCE(?d1,?d2) AS ?desc)
 OPTIONAL{?w wdt:P195 ?coll . ?coll rdfs:label ?collL FILTER(LANG(?collL)="${lang}")}
 OPTIONAL{?w wdt:P625 ?c}
 OPTIONAL{?w wdt:P18 ?img}
 OPTIONAL{?art schema:about ?w ; schema:isPartOf <https://${lang}.wikipedia.org/>}
} GROUP BY ?w LIMIT 600`;
 const d=await j("https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q),12000).catch(()=>null);
 const rows=(d?.results?.bindings||[]).map(b=>{const types=(b.types?.value||"").split(" ").filter(Boolean);
  const kind=types.some(t=>ALBUM.has(t))?"album":types.some(t=>FILM.has(t))?"film":types.some(t=>PAINT.has(t))?"painting":types.some(t=>SONG.has(t))?"song":types.some(t=>BOOK.has(t))?"book":b.r?.value==="architect"?"building":b.r?.value==="author"?"book":b.r?.value==="director"?"film":"work";
  const cm=(b.coord?.value||"").match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  return{id:(b.w.value.match(/Q\d+$/)||[])[0],label:b.label?.value||"",description:b.description?.value||"",date:b.when?.value?b.when.value.replace(/T.*$/,""):"",year:b.when?.value?String(parseInt(b.when.value,10)):"",
   kind,role:b.r?.value||"",collection:b.collection?.value||"",image:b.image?.value?b.image.value.replace(/^http:/,"https:")+"?width=200":"",lat:cm?+cm[2]:null,lon:cm?+cm[1]:null,article:b.article?.value||""}}).filter(x=>x.label&&!/^Q\d+$/.test(x.label));
 // Orden cronológico numérico (incluye fechas antes de Cristo).
 const key=r=>{if(!r.date)return 1e9;const m=r.date.match(/^(-?)(\d+)-(\d\d)-(\d\d)/);if(!m)return 1e9;const y=(m[1]?-1:1)*+m[2];return y+(+m[3]-1)/12+(+m[4]-1)/365};
 rows.sort((a,b)=>key(a)-key(b));
 return rows;
}

/* ---------- Libros con tapa (Open Library) ---------- */
const OL="https://openlibrary.org/search.json?";
const cover=id=>id?"https://covers.openlibrary.org/b/id/"+id+"-M.jpg":"";
async function olCover(title,author){
 const d=await j(OL+new URLSearchParams({title,author,limit:"1",fields:"cover_i,first_publish_year,key,edition_count"}),5000).catch(()=>null);const x=d?.docs?.[0];
 return x?{cover:cover(x.cover_i),year:x.first_publish_year||"",key:x.key||"",editions:x.edition_count||0}:null;
}
/* Libros de un autor ordenados por primera publicación (cuando Wikidata registra pocos). */
async function olBooks(author,limit=30){
 const d=await j(OL+new URLSearchParams({author,sort:"old",limit:String(limit),fields:"title,first_publish_year,cover_i,key,edition_count,author_name,language"}),6000).catch(()=>null);
 const seen=new Set(),out=[];
 for(const x of d?.docs||[]){const k=fold(x.title).slice(0,40);if(!x.title||seen.has(k))continue;
  if(!(x.author_name||[]).some(a=>fold(a).split(" ").some(t=>t.length>3&&fold(author).includes(t))))continue;
  seen.add(k);out.push({label:x.title,year:x.first_publish_year?String(x.first_publish_year):"",date:x.first_publish_year?String(x.first_publish_year):"",kind:"book",image:cover(x.cover_i),
   description:(x.edition_count?x.edition_count+(x.edition_count===1?" edición registrada":" ediciones registradas"):"")+" · Open Library",article:"https://openlibrary.org"+x.key,source:"Open Library"})}
 return out.sort((a,b)=>(a.year||"9999").localeCompare(b.year||"9999"));
}

/* ---------- Corrección con el vocabulario propio del sitio (autores, obras, códices, lugares) ---------- */
const vocab=new Map(); // forma plegada → forma original con tildes
// Solo nombres propios (con mayúscula inicial): así no se «corrigen» palabras comunes válidas.
function setVocabulary(list){for(const item of list||[])for(const w of String(item||"").split(/[\s,.;:·()\/«»"-]+/)){const f=fold(w);if(f.length>=4&&/^\p{Lu}/u.test(w)&&!vocab.has(f))vocab.set(f,w)}}
const COMMON=new Set("space espacio odyssey odisea time tiempo world mundo house casa city ciudad love amor night noche life vida book libro song cancion music musica history historia star stars war guerra king rey queen reina man woman hombre mujer black white blanco negro water agua fire fuego earth tierra light luz dark the and with para como sobre entre".split(" "));
function localCorrect(text){
 if(!vocab.size)return null;let changed=false;
 const out=String(text).split(/(\s+)/).map(tok=>{const f=fold(tok);if(f.length<4||vocab.has(f)||COMMON.has(f)||words?.has(f)||/\d/.test(f))return tok;
  let best=null,bd=9;for(const [k,orig] of vocab){if(k[0]!==f[0]||Math.abs(k.length-f.length)>2)continue;const d=dist(k,f);if(d<bd){bd=d;best=orig}}
  if(best&&bd<=(f.length>=7?2:1)){changed=true;return best}return tok});
 return changed?out.join(""):null;
}

/* ---------- Corrección general (cualquier palabra) ----------
   Vocabulario de frecuencias tomado de los textos del sitio (traducción castellana y latín de Vitruvio)
   más los nombres registrados. Se aplica cuando una búsqueda no da resultados o da muy pocos. */
let words=null;
async function loadWords(){
 if(words)return words;words=new Map();
 const add=t=>{for(const w of String(t||"").toLowerCase().match(/[\p{L}]{3,}/gu)||[]){const f=fold(w);const e=words.get(f);if(e)e.n++;else words.set(f,{w,n:1})}};
 try{const d=await fetch("data/structured/recensio-es.json").then(r=>r.json());for(const p of d.passages||[]){add(p.translation);add(p.latin)}}catch{}
 for(const [,orig] of vocab)add(orig);
 return words;
}
async function generalCorrect(text){
 const W=await loadWords();let changed=false;
 const out=String(text).split(/(\s+)/).map(tok=>{const f=fold(tok);if(f.length<4||W.has(f)||vocab.has(f)||/\d/.test(f))return tok;
  const max=f.length>=7?2:1;let best=null,bs=-1;
  for(const [k,v] of W){if(Math.abs(k.length-f.length)>max)continue;if(k[0]!==f[0]&&k.slice(-2)!==f.slice(-2))continue;const d=dist(k,f);if(d>max)continue;const score=(max-d)*1000+Math.min(v.n,999);if(score>bs){bs=score;best=v.w}}
  for(const [k,orig] of vocab){const d=dist(k,f);if(d<=max&&(max-d)*1000+999>bs){bs=(max-d)*1000+999;best=orig}}
  if(best){changed=true;return /^\p{Lu}/u.test(tok)?best.charAt(0).toUpperCase()+best.slice(1):best}return tok});
 return changed?out.join(""):null;
}

/* ---------- API pública ---------- */
/* Sugerencias para el desplegable: entidades (con descripción) y completados de búsqueda. */
async function suggest(text,lang){
 lang=L(lang);const q=String(text||"").trim();if(q.length<2)return{entities:[],completions:[]};
 const p=new URLSearchParams({action:"wbsearchentities",search:q,language:lang,uselang:lang,type:"item",limit:"7",format:"json",origin:"*"});
 const [wd,fz]=await Promise.all([j("https://www.wikidata.org/w/api.php?"+p,3500).catch(()=>null),fuzzyTitles(q,lang,8)]);
 let ents=(wd?.search||[]).filter(x=>x.description&&!/desambiguaci|disambiguation|homonymie|página de categoría|Wikimedia/i.test(x.description));
 // Con errores de tipeo, Wikidata no encuentra nada: se usa el título difuso de Wikipedia.
 if(!ents.length&&fz[0]){const p2=new URLSearchParams({action:"wbsearchentities",search:fz[0],language:lang,uselang:lang,type:"item",limit:"3",format:"json",origin:"*"});
  const w2=await j("https://www.wikidata.org/w/api.php?"+p2,3500).catch(()=>null);ents=(w2?.search||[]).filter(x=>x.description&&!/desambiguaci|disambiguation|homonymie|Wikimedia/i.test(x.description))}
 // Homónimos: se priorizan coincidencias exactas del nombre y descripciones de personas, grupos u obras;
 // los usos religiosos o genéricos («Madonna» como advocación mariana) quedan después.
 const qf=fold(q),rank=x=>{
  const d=fold(x.description),label=fold(x.label);
  const exact=label===qf?80:label.startsWith(qf+" ")?22:0;
  const intellectual=/filosof|philosoph|matematic|mathematic|cientific|scientist|astronom|geometr|pensador|thinker|historiador|historian/.test(d);
  const ancient=/antigu|ancient|grec|grieg|roman|romano|hellen|helen|classical|clasico|siracus|syracus/.test(d);
  const known=/poeta|poet|escritor|writer|cantante|music|singer|actriz|actor|arquitect|architect|pintor|painter|compositor/.test(d);
  const generic=/advocaci|virgen|iconograf|representaci|titulo|apellido|nombre de pila|given name|family name|researcher|investigador/.test(d);
  return exact+(intellectual?32:0)+(ancient?25:0)+(known?12:0)-(generic?35:0);
 };
 ents=ents.map((x,i)=>({x,s:rank(x)-i})).sort((a,b)=>b.s-a.s).map(o=>o.x);
 const entities=ents.slice(0,3).map(x=>({id:x.id,label:x.label,description:x.description}));
 const seen=new Set(entities.map(e=>fold(e.label)));const completions=[];
 const top=entities[0];
 if(top){const d=fold(top.description);const base=top.label.toLowerCase();
  const extra=/arquitect|architect|ingenier|urbanist/.test(d)?["obras","edificios","biografía","libros","planos"]:
   /cantante|music|músic|compositor|banda|grupo musical|singer|band|rapper|composer/.test(d)?["canciones","discografía","biografía","álbumes","conciertos"]:
   /escritor|poeta|novelist|writer|author|filósof|philosoph|historiador/.test(d)?["libros","obras","biografía","frases"]:
   /pintor|painter|escultor|sculptor|artista/.test(d)?["obras","cuadros","biografía","museos"]:
   /futbol|football|copa|torneo|campeonato|tournament|championship/.test(d)?["ganador","final","resultados","sede"]:
   /ciudad|city|país|country|capital|municipio|provincia/.test(d)?["historia","mapa","arquitectura","monumentos"]:["historia","significado","origen"];
  for(const x of extra){const v=base+" "+x;if(!seen.has(fold(v))){seen.add(fold(v));completions.push(v)}}}
 for(const t of fz){if(!seen.has(fold(t))){seen.add(fold(t));completions.push(t.toLowerCase())}}
 return{entities,completions:completions.slice(0,8)};
}
/* Consulta completa: pregunta, corrección, entidad y respuesta directa si existe. */
async function resolve(text,lang){
 lang=L(lang);const parsed=parseQuestion(text);
 // One verified identity for spelling corrections, the article and both panels.
 // A sense explicitly selected by the visitor takes precedence.
 let forced=null;try{forced=JSON.parse(sessionStorage.getItem("vitruvia-sense")||"{}")[fold(parsed.subject)]||null}catch{}
 const authority=!forced&&window.VitruviaEntityResolver?await window.VitruviaEntityResolver.resolve(parsed.subject,lang).catch(()=>null):null;
 let title=authority?.canonical||null,corrected=authority?.spellingMatch?authority.canonical:null;
 if(!authority&&!forced){
  // Keep the question parser's broad lookup, but do not assign an unrelated
  // person to an unrecognised or badly misspelled name.
  if(window.VitruviaEntityResolver&&!parsed.question)return{senses:[],original:text,subject:parsed.subject,question:false,corrected:null,title:null,entity:null,answer:null,lang};
  const result=await bestTitle(parsed.subject,lang);title=result.title;corrected=result.corrected;
  if(!title){const local=localCorrect(parsed.subject);if(local){const retry=await bestTitle(local,lang);title=retry.title;corrected=retry.corrected||local}}
 }
 const ref=forced?{qid:forced,title}:authority?.wikidataId?{qid:authority.wikidataId,title}:await qidFor(title,lang);const f=ref?.qid?await facts(ref.qid,lang):null;
 // Otras acepciones del mismo nombre (homónimos), para ofrecerlas aparte sin mezclarlas.
 let senses=[];try{const p2=new URLSearchParams({action:"wbsearchentities",search:parsed.subject,language:lang,uselang:lang,type:"item",limit:"8",format:"json",origin:"*"});
  const w=await j("https://www.wikidata.org/w/api.php?"+p2,3500);senses=(w?.search||[]).filter(x=>x.id!==f?.qid&&x.description&&!/desambiguaci|disambiguation|homonymie|Wikimedia|categor/i.test(x.description)&&fold(x.label).includes(fold(parsed.subject).split(" ")[0])).slice(0,4).map(x=>({id:x.id,label:x.label,description:x.description}))}catch{}
 let answer=null;
 if(f&&parsed.prop){
  const map={P1346:f.winner,P84:f.architect,P50:f.author,P36:f.capital,P19:f.birthPlace?[f.birthPlace]:[],P569:f.birth?[{label:f.birth.iso}]:[],P570:f.death?[{label:f.death.iso}]:[]};
  const v=map[parsed.prop]||[];
  answer={prop:parsed.prop,label:PROPS[parsed.prop],values:v,source:"https://www.wikidata.org/wiki/"+f.qid,pending:!v.length};
 }
 return{senses,original:text,subject:parsed.subject,question:parsed.question,corrected:corrected&&fold(corrected)!==fold(parsed.subject)?corrected:null,title:ref?.title||title,entity:f,answer,lang};
}
window.VitruviaUnderstand={suggest,resolve,facts,summary,works,olCover,olBooks,setVocabulary,localCorrect,generalCorrect,parseQuestion,bestTitle,fold,dist};
})();
