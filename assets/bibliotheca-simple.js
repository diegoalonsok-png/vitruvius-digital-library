/* Bibliotheca Graeca et Latina: navegación académica mínima.
 * Una búsqueda literal, selección de una obra o todas, resultados completos
 * ordenados por datación de composición, sin visores incrustados.
 * Los originales griegos/latinos NO se confunden con idiomas de interfaz.
 */
(()=>{"use strict";
const CATALOG="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
const REGISTRY="data/classics-corpus/search-registry.json";
const TR={
 es:{language:"Idioma",heading:"Bibliotheca Graeca et Latina",intro:"Busca una palabra o frase en los textos originales y traducciones indexados. Selecciona una obra o busca en todas.",search:"Buscar",placeholder:"Escribe una palabra o frase, por ejemplo domus…",all:"Todas las obras",lexicon:"Buscar en Lexicon",results:"Resultados",catalogue:"Obras de la biblioteca",indexed:"indexadas",unindexed:"no indexadas",notSearched:"sin indexar; no se examinaron",loading:"Cargando catálogo e índices…",searching:"Buscando en todos los textos indexados…",noResults:"No se encontraron coincidencias en los textos examinados.",termInvalid:"Introduce una palabra o frase de al menos dos letras (máximo 180 caracteres).",loadFail:"No se pudo completar la búsqueda. No se informa ausencia de términos en archivos inaccesibles.",units:"párrafos",occurrences:"apariciones",works:"obras",versions:"versiones",partial:"Consulta parcial: archivos indexados inaccesibles",original:"original",translation:"traducción",citation:"Edición documentada",eraUnknown:"fecha no establecida"},
 en:{language:"Language",heading:"Bibliotheca Graeca et Latina",intro:"Search a word or phrase in indexed original texts and translations. Choose one work or search all works.",search:"Search",placeholder:"Enter a word or phrase, for example domus…",all:"All works",lexicon:"Search in Lexicon",results:"Results",catalogue:"Library works",indexed:"indexed",unindexed:"not indexed",notSearched:"not indexed and not searched",loading:"Loading catalogue and text indices…",searching:"Searching all indexed texts…",noResults:"No matches in the examined texts.",termInvalid:"Enter at least two letters (maximum 180 characters).",loadFail:"Search could not finish. No absence is claimed for unreadable files.",units:"paragraphs",occurrences:"occurrences",works:"works",versions:"versions",partial:"Partial search: indexed files unavailable",original:"original",translation:"translation",citation:"Documented edition",eraUnknown:"date unknown"},
 fr:{language:"Langue",heading:"Bibliotheca Graeca et Latina",intro:"Recherchez un mot ou une expression dans les textes originaux et traductions indexés. Choisissez une œuvre ou toutes les œuvres.",search:"Rechercher",placeholder:"Saisissez un mot ou une expression, par exemple domus…",all:"Toutes les œuvres",lexicon:"Rechercher dans Lexicon",results:"Résultats",catalogue:"Œuvres de la bibliothèque",indexed:"indexées",unindexed:"non indexées",notSearched:"non indexées et non examinées",loading:"Chargement du catalogue et des index…",searching:"Recherche dans les textes indexés…",noResults:"Aucune occurrence dans les textes examinés.",termInvalid:"Saisissez au moins deux lettres (180 caractères maximum).",loadFail:"Recherche inachevée. Aucun résultat négatif n’est attribué aux fichiers inaccessibles.",units:"paragraphes",occurrences:"occurrences",works:"œuvres",versions:"versions",partial:"Recherche partielle : fichiers indexés indisponibles",original:"original",translation:"traduction",citation:"Édition documentée",eraUnknown:"date non établie"}
};
const names={la:{es:"Latín",en:"Latin",fr:"Latin"},grc:{es:"Griego",en:"Greek",fr:"Grec"},es:{es:"Castellano",en:"Spanish",fr:"Espagnol"},en:{es:"Inglés",en:"English",fr:"Anglais"},fr:{es:"Francés",en:"French",fr:"Français"}};
const node=(tag,cls,value)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(value!==undefined)a.textContent=String(value);return a};
const rom={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10,xi:11,xii:12,xiii:13,xiv:14,xv:15};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
function dateValue(w){
 const s=String(w?.dating||"").toLowerCase().trim();
 if(!s||/^(?:edici[oó]n|composici[oó]n y atribuciones)/.test(s))return Infinity;
 if(/tradici[oó]n arcaica|[eé]poca arcaica/.test(s))return -750;
 const bc=/a\.?\s*c\.?|bce|bc\b|avant j/.test(s),ad=/d\.?\s*c\.?|ce\b|ad\b/.test(s);
 const centuries=[...s.matchAll(/(?:siglos?|s\.)\s+([ivx]+)(?:\s*[–-]\s*([ivx]+))?/g)];
 if(centuries.length){
  const nums=centuries.flatMap(m=>[m[1],m[2]].filter(Boolean).map(n=>rom[n]).filter(Boolean));
  if(nums.length)return bc?-100*Math.max(...nums):100*(Math.min(...nums)-1)+1;
 }
 const nums=[...s.matchAll(/(?<!\d)(\d{1,4})(?!\d)/g)].map(m=>+m[1]);
 if(nums.length)return bc?-Math.max(...nums):ad?Math.min(...nums):Infinity;
 return Infinity;
}
const compareWork=(a,b)=>dateValue(a)-dateValue(b)||String(a.title||"").localeCompare(String(b.title||""),"es",{sensitivity:"base"})||String(a.id).localeCompare(String(b.id));
function highlight(parent,text,word){
 const needle=fold(word).trim(),plain=String(text||"");
 if(!needle){parent.textContent=plain;return}
 let flat="",positions=[];
 for(let i=0;i<plain.length;){
  const ch=String.fromCodePoint(plain.codePointAt(i)),f=fold(ch);
  for(let j=0;j<f.length;j++){flat+=f[j];positions.push(i)}
  i+=ch.length;
 }
 let p=flat.indexOf(needle),cursor=0,c=0;
 while(p>=0&&c<350){
  const start=positions[p],last=positions[p+needle.length-1];
  if(start===undefined||last===undefined)break;
  const end=last+(plain.codePointAt(last)>65535?2:1);
  if(start>=cursor){
   parent.append(document.createTextNode(plain.slice(cursor,start)));
   parent.append(node("mark","",plain.slice(start,end)));
   cursor=end;c++;
  }
  p=flat.indexOf(needle,p+Math.max(1,needle.length));
 }
 parent.append(document.createTextNode(plain.slice(cursor)));
}
function start(){
 const language=document.getElementById("classic-ui-language"),
   search=document.getElementById("classic-query"),
   works=document.getElementById("classic-work"),
   submit=document.getElementById("classic-submit"),
   lexicon=document.getElementById("classic-lexicon"),
   intro=document.getElementById("classic-intro"),
   coverage=document.getElementById("classic-coverage"),
   results=document.getElementById("classic-results"),
   title=document.getElementById("classic-result-title"),
   list=document.getElementById("classic-result-list"),
   summary=document.getElementById("classic-summary"),
   unindexed=document.getElementById("classic-unindexed");
 if([language,search,works,submit,lexicon,intro,coverage,results,title,list,summary,unindexed].some(x=>!x))return;
 let lang="es",catalog=null,registry=null,byId=new Map(),indexed=new Set(),query="",runNumber=0,lastRows=[],lastDiagnostics={};
 function t(){return TR[lang]}
 function useLanguage(raw){
  lang=Object.hasOwn(TR,raw)?raw:"es";language.value=lang;
  document.documentElement.lang=lang;
  for(const e of document.querySelectorAll("[data-text]")){const key=e.dataset.text;e.textContent=t()[key]||e.textContent}
  search.placeholder=t().placeholder;search.setAttribute("aria-label",t().placeholder);
  works.setAttribute("aria-label",t().all);works.options[0].textContent=t().all;
  lexicon.textContent=t().lexicon;submit.textContent=t().search;intro.textContent=t().intro;
  if(query&&lastRows.length)render(lastRows);else refreshCoverage();
  try{localStorage.setItem("vitruvius-ui-lang",lang)}catch{}
 }
 function refreshCoverage(){
  if(!catalog||!registry){coverage.textContent=t().loading;return}
  coverage.textContent=catalog.length+" "+t().works+" · "+indexed.size+" "+t().indexed+" · "+(catalog.length-indexed.size)+" "+t().notSearched+".";
 }
 const ready=Promise.allSettled([fetch(CATALOG).then(r=>{if(!r.ok)throw Error("catalog");return r.json()}),
  fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("registry");return r.json()})]).then(([c,i])=>{
  if(c.status==="fulfilled"&&Array.isArray(c.value.works)){catalog=c.value.works;byId=new Map(catalog.map(w=>[w.id,w]))}
  if(i.status==="fulfilled"&&i.value.schema==="vitruvia-classics-search-registry-v1"&&Array.isArray(i.value.entries))registry=i.value.entries;
  if(catalog&&registry){
   indexed=new Set(registry.filter(e=>byId.has(e.workId)&&e.format!=="historical-ocr-pages").map(e=>e.workId));
   const sorted=catalog.slice().sort(compareWork);
   const frag=document.createDocumentFragment();
   for(const w of sorted){
    const option=node("option","",[w.title,w.author].filter(Boolean).join(" · ")+(indexed.has(w.id)?"":" [—]"));
    option.value=w.id;
    frag.append(option);
   }
   works.append(frag);
   const target=new URLSearchParams(location.search).get("work");
   if(target&&byId.has(target))works.value=target;
   refreshCoverage();
  }else{
   coverage.textContent=lang==="es"?"No se pudo verificar la cobertura de la biblioteca.":lang==="fr"?"Impossible de vérifier la couverture de la bibliothèque.":"Library coverage could not be verified.";
  }
 });
 const lexiconURL=()=>{
  const u=new URL("vitruvia-lexicon.html",location.href);
  const q=search.value.trim();
  if(q)u.searchParams.set("q",q);
  return u.href;
 };
 const syncLexicon=()=>{lexicon.href=lexiconURL()};
 search.addEventListener("input",syncLexicon);
 syncLexicon();
 function render(found){
  list.replaceChildren();
  const rows=found.slice().sort((a,b)=>{
   const wa=byId.get(a.workId),wb=byId.get(b.workId);
   return compareWork(wa||{id:a.workId,title:a.title},wb||{id:b.workId,title:b.title})||
    a.workId.localeCompare(b.workId)||a.language.localeCompare(b.language)||
    String(a.locus||"").localeCompare(String(b.locus||""),undefined,{numeric:true});
  });
  let current=null,section=null,workCount=0,versionKey=new Set(),occurrences=0;
  const frag=document.createDocumentFragment();
  for(const row of rows){
   occurrences+=row.hitsInPassage||1;versionKey.add(row.workId+"/"+row.language);
   if(row.workId!==current){
    current=row.workId;workCount++;
    const meta=byId.get(current)||{};
    section=node("li","work-hit");
    const heading=node("h3","",meta.title||row.title);
    const info=node("p","byline",[meta.author||row.author,meta.dating||t().eraUnknown].filter(Boolean).join(" · "));
    section.append(heading,info);
    const citation=(meta.localVersions||[]).find(v=>v.language===row.language&&v.citationChicago18)?.citationChicago18;
    if(citation)section.append(node("p","cite-note",citation));
    const passages=node("div","passages");section.append(passages);
    section._passages=passages;frag.append(section);
   }
   const block=node("article","hit-paragraph");
   const langCode=names[row.language]?.[lang]||row.language;
   block.lang=row.language==="grc"?"el":row.language==="la"?"la":row.language||"es";
   block.append(node("p","hit-locus",[row.locus?"Locus "+row.locus:"Locus no certificado",langCode].join(" · ")));
   const p=node("p","hit-text");highlight(p,row.fullText||row.excerpt||"",query);
   block.append(p);section._passages.append(block);
  }
  list.append(frag);
  title.textContent=t().results;results.hidden=false;
  summary.textContent=rows.length+" "+t().units+" · "+occurrences+" "+t().occurrences+" · "+workCount+" "+t().works+" · "+versionKey.size+" "+t().versions+".";
  if(!rows.length)list.append(node("p","byline",t().noResults));
  if(catalog&&registry){
   const missing=works.value? (indexed.has(works.value)?0:1):catalog.length-indexed.size;
   unindexed.textContent=missing+" "+t().notSearched+".";
  } else unindexed.textContent="";
  if(lastDiagnostics.failed)unindexed.textContent+=" "+lastDiagnostics.failed+" "+t().partial+".";
  if(lastDiagnostics.registrySource==="fallback")unindexed.textContent+=" "+t().loadFail;
 }
 async function run(){
  const q=search.value.trim(),token=++runNumber;query=q;syncLexicon();
  if(fold(q).replace(/[^\p{L}\p{N}]/gu,"").length<2||q.length>180){results.hidden=false;title.textContent=t().results;list.replaceChildren();summary.textContent=t().termInvalid;unindexed.textContent="";return}
  await ready;
  if(token!==runNumber)return;
  if(!catalog||!registry){results.hidden=false;summary.textContent=t().loadFail;return}
  if(!window.ClassicsCorpusSearch?.searchPassages){results.hidden=false;summary.textContent=t().loadFail;return}
  submit.disabled=true;
  coverage.textContent=t().searching;
  try{
   const data=await window.ClassicsCorpusSearch.searchPassages([q],{
    allMatches:true,includeFullText:true,workId:works.value||""
   });
   if(token!==runNumber)return;
   lastRows=data;lastDiagnostics=window.ClassicsCorpusSearch.diagnostics?.()||{};
   render(data);
  }catch(e){
   if(token===runNumber){results.hidden=false;list.replaceChildren();summary.textContent=t().loadFail;unindexed.textContent=String(e.message||"");}
  }finally{if(token===runNumber){submit.disabled=false;refreshCoverage()}}
 }
 document.getElementById("classic-form").addEventListener("submit",e=>{e.preventDefault();void run()});
 works.addEventListener("change",()=>{if(query)void run()});
 language.addEventListener("change",()=>useLanguage(language.value));
 let saved="es";try{saved=localStorage.getItem("vitruvius-ui-lang")||"es"}catch{}
 useLanguage(saved);
 const params=new URLSearchParams(location.search),initial=(params.get("q")||params.get("term")||"").trim();
 if(initial){search.value=initial;syncLexicon();void run()}
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start,{once:true}):start();
})();