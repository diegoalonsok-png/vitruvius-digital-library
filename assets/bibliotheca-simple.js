/* Bibliotheca simple: single search, single work selector, actual attested paragraphs.
   No readers, facsimile frames, palettes or undocumented translation alignments. */
(()=>{"use strict";
const CATALOG="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
const REGISTRY="data/classics-corpus/search-registry.json";
/* No borrar fuentes: Bibliotheca expone originales y traducciones inglesas.
   Vitruvio conserva sus ediciones castellana y francesa. */
const bibliothecaLanguagePolicy=e=>e.workId==="vitruvius"||["la","grc","en"].includes(e.language);
const $=id=>document.getElementById(id);
const dict={
 es:{home:"Inicio",search:"Buscar",placeholder:"Una palabra o frase, por ejemplo: domus",
 intro:"Busca palabras y frases en los originales griegos y latinos y en sus traducciones inglesas. El castellano y el francés se reservan para las ediciones de Vitruvio. Pasajes ordenados por antigüedad, sin alineaciones inventadas.",
 work:"Obra",all:"Todos los libros indexados",wait:"Cargando el catálogo de obras…",
 ready:(c,v,n)=>c+" obras catalogadas · "+v+" versiones indexadas · "+n+" obras sin texto indexado.",
 missing:"(no indexada)",label:"Párrafos encontrados",lexicon:"Estudiar etimología en Lexicon",
 method:"Concordancias documentadas; versiones originales y traducciones contadas por separado. Chicago 18 cuando hay datos editoriales; referencias parciales identificadas.",
 short:"Escribe al menos dos letras o cifras.",loading:"Buscando en las versiones indexadas…",
 unavailable:"No fue posible verificar el índice: búsqueda no disponible.",failed:"Búsqueda parcial: algunas versiones fallaron.",
 none:"No se hallaron coincidencias en los textos examinados.",
 stats:(n,p,w)=>n+" apariciones en versiones indexadas · "+p+" pasajes · "+w+" obras",groupCount:n=>n+" apariciones",
 outside:n=>n+" obras catalogadas sin texto indexado; no examinadas.",
 wrong:"Esta obra no tiene texto indexado; no se buscó.",citation:"Edición y procedencia",loc:"Locus",noDate:"Datación no determinada",translit:forms=>"Transliteración griega documentada: "+forms.join(", ")},
 en:{home:"Home",search:"Search",placeholder:"One word or phrase, for example: domus",
 intro:"Search original Greek/Latin texts and English translations. Spanish and French remain available for Vitruvius editions only. Passages appear in chronological order without assumed alignment.",
 work:"Work",all:"All indexed books",wait:"Loading the work catalogue…",
 ready:(c,v,n)=>c+" catalogued works · "+v+" indexed versions · "+n+" works with no indexed text.",
 missing:"(not indexed)",label:"Matching paragraphs",lexicon:"Study etymology in Lexicon",
 method:"Documentary concordance of indexed texts; versions counted separately. Chicago 18 where source metadata are sufficient; partial references identified.",
 short:"Enter at least two letters or digits.",loading:"Searching indexed editions…",
 unavailable:"Could not verify the index; search unavailable.",failed:"Partial results: some text versions failed.",
 none:"No matches in the texts examined.",
 stats:(n,p,w)=>n+" occurrences in indexed versions · "+p+" passages · "+w+" works",groupCount:n=>n+" occurrences",
 outside:n=>n+" catalogued works without indexed text, not searched.",
 wrong:"This work has no indexed text; it was not searched.",citation:"Edition and provenance",loc:"Locus",noDate:"Undated",translit:forms=>"Documented Greek transliteration: "+forms.join(", ")},
 fr:{home:"Accueil",search:"Chercher",placeholder:"Un mot ou une expression, par exemple : domus",
 intro:"Recherchez les textes originaux grecs et latins et leurs traductions anglaises. Les éditions de Vitruve conservent le français et l’espagnol. Résultats ordonnés par ancienneté.",
 work:"Œuvre",all:"Tous les livres indexés",wait:"Chargement du catalogue…",
 ready:(c,v,n)=>c+" œuvres cataloguées · "+v+" versions indexées · "+n+" œuvres sans texte indexé.",
 missing:"(non indexée)",label:"Paragraphes trouvés",lexicon:"Étudier l’étymologie dans Lexicon",
 method:"Concordance des textes indexés; versions comptées séparément. Chicago 18 lorsque les références sont vérifiées; références partielles signalées.",
 short:"Saisissez deux lettres ou chiffres au minimum.",loading:"Recherche dans les éditions indexées…",
 unavailable:"Index non vérifiable ; recherche indisponible.",failed:"Résultats partiels : certaines éditions n'ont pu être chargées.",
 none:"Aucune correspondance dans les textes consultés.",
 stats:(n,p,w)=>n+" occurrences dans les versions indexées · "+p+" passages · "+w+" œuvres",groupCount:n=>n+" occurrences",
 outside:n=>n+" œuvres cataloguées sans texte indexé, non examinées.",
 wrong:"Cette œuvre n'a pas de texte indexé ; aucune recherche.",citation:"Édition et provenance",loc:"Locus",noDate:"Datation inconnue",translit:forms=>"Translittération grecque documentée : "+forms.join(", ")}
};
const languages={la:"Latín",grc:"Griego",es:"Castellano",en:"English",fr:"Français"};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
/* Equivalencia ortográfica griego ↔ transliteración, solo con lemas documentados
   en Conceptus; no sustituye una traducción ni una alineación por locus. */
const greekRoman={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",τ:"t",υ:"y",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
const romanizeGreek=s=>[...String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ")].map(c=>greekRoman[c]||c).join("");
let greekFormsTask=null;
async function attestedGreekForms(query){
 if(!/^[a-z]{3,35}$/i.test(query))return [];
 if(!greekFormsTask)greekFormsTask=fetch("data/lexicon/conceptus.json")
  .then(r=>{if(!r.ok)throw Error("Conceptus unavailable");return r.json()})
  .then(j=>Array.isArray(j?.concepts)?j.concepts:[]).catch(()=>[]);
 const concepts=await greekFormsTask,found=new Set(),key=fold(query);
 for(const c of concepts)for(const g of (Array.isArray(c.grc)?c.grc:[])){
  if(typeof g==="string"&&/^[\p{Script=Greek}\p{M}]+$/u.test(g)&&fold(romanizeGreek(g))===key)found.add(g);
 }
 return [...found].slice(0,8);
}
const roman=x=>{let n=0,last=0;for(const c of [...String(x).toUpperCase()].reverse()){const z={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}[c]||0;n+=z<last?-z:z;last=z}return n};
/* Prioridad: fecha de composición, NUNCA año de publicación de la traducción.
   Los rangos usan el extremo más antiguo; siglos debatidos se ordenan solo
   aproximadamente, mostrando siempre la datación original sin falsear precisión. */
function dating(w){
 // Las grafías cronológicas no comparten normalización u/v con el buscador.
 const s=String(w?.dating||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[–—−]/g,"-").replace(/\s+/g," ");
 if(/edicion editorial|edicion critica impresa|composicion y atribuciones debatidas/.test(s))return Infinity;
 if(/tradicion arcaica|epoca arcaica/.test(s))return /homer|odyssey|iliad/.test(w.id||"")?-780:-720;
 const numeric=s.match(/(\d{1,4})(?:\s*-\s*\d{1,4})?\s*(a\.\s*c\.|d\.\s*c\.)/);
 if(numeric)return Number(numeric[1])*(numeric[2].startsWith("a")?-1:1);
 const century=s.match(/(?:siglos?|s\.)\s+([ivxlcdm]+)/);
 if(century){
  const c=roman(century[1]);if(!c)return Infinity;
  // La primera era explícita prevalece en períodos que cruzan a.C./d.C.
  const era=(s.match(/a\.\s*c\.|d\.\s*c\./)||[])[0]||"d. c.";
  const start=era.startsWith("a")?-100*c:100*(c-1)+1;
  const beforeCentury=s.slice(0,century.index);
  const offset=/finales|final|ultim/.test(beforeCentury)?75:
   /mediados|mitad/.test(beforeCentury)?50:
   /primera mitad|principios|comienzos/.test(beforeCentury)?25:0;
  return start+offset;
 }
 return Infinity;
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const foldedMap=text=>{
 let f="",index=[];
 for(let i=0;i<text.length;){const c=String.fromCodePoint(text.codePointAt(i)),v=fold(c);for(let j=0;j<v.length;j++){f+=v[j];index.push(i)}i+=c.length}
 return {f,index};
};
function decorate(parent,text,query){
 const {f,index}=foldedMap(text),key=fold(query);
 if(!key){parent.textContent=text;return}
 const out=document.createDocumentFragment();let cursor=0,at=f.indexOf(key),count=0;
 const letter=c=>!!c&&/[\p{L}\p{N}]/u.test(c);
 while(at>=0&&count<500){
  const stop=at+key.length;
  if(!letter(f[at-1])&&!letter(f[stop])){
   const start=index[at],last=index[stop-1];
   if(start!==undefined&&last!==undefined){
    const end=last+(text.codePointAt(last)>65535?2:1);
    if(start>=cursor){out.append(document.createTextNode(text.slice(cursor,start)));out.append(el("mark","",text.slice(start,end)));cursor=end;count++}
   }
  }
  at=f.indexOf(key,at+Math.max(1,key.length));
 }
 out.append(document.createTextNode(text.slice(cursor)));parent.append(out);
}
let works=[],entries=[],byId=new Map(),indexed=new Set(),locale="es",previous=[],current="",diag={},serial=0;
const input=$("classic-query"),work=$("classic-work"),coverage=$("catalogue-status"),status=$("search-status"),
 root=$("result"),list=$("classic-results"),lex=$("lexicon-link"),bar=$("lexicon-bar");

/* Traducciones remotas: sólo vínculos y metadatos de ediciones verificadas.
   Jamás contar como corpus local ni intentar descargar indiscriminadamente textos. */
const remoteBox=el("aside","remote-translations");
remoteBox.hidden=true;
document.querySelector(".searcharea")?.append(remoteBox);
let remoteEntries=[];
function drawRemote(){
 remoteBox.replaceChildren();
 const id=work.value||new URLSearchParams(location.search).get("work")||"";
 const rows=remoteEntries.filter(e=>e.workId===id);
 remoteBox.hidden=!rows.length;
 if(!rows.length)return;
 const labels={
  es:{head:"Traducciones consultables sin ocupar espacio",open:"Consultar traducción",note:"El texto permanece en la biblioteca externa: no se incluye en el recuento de concordancias ni está alineado automáticamente."},
  en:{head:"Translations available without local storage",open:"Read translation",note:"The text remains on the external library: it is not counted in local concordances or automatically aligned."},
  fr:{head:"Traductions sans stockage local",open:"Consulter la traduction",note:"Le texte reste hébergé par la bibliothèque externe : il n'est pas compté ni aligné automatiquement."}
 }[locale]||{head:"Traducciones externas",open:"Consultar",note:""};
 remoteBox.append(el("p","remote-title",labels.head));
 for(const e of rows){
  let target;
  try{target=new URL(e.url)}catch{continue}
  if(target.protocol!=="https:"||target.hostname!=="penelope.uchicago.edu")continue;
  const line=el("p","remote-row");
  const a=el("a","remote-link",labels.open+" · "+(languages[e.language]||e.language));
  a.href=target.href;a.target="_blank";a.rel="noopener noreferrer";
  line.append(a,document.createTextNode(" · "+e.translator+" · "+e.edition+" · "+e.host));
  remoteBox.append(line);
 }
 remoteBox.append(el("p","remote-note",labels.note));
}
fetch("data/classics-corpus/remote-translations.json")
 .then(r=>{if(!r.ok)throw Error("remote catalogue");return r.json()})
 .then(d=>{if(d.schema!=="vitruvius-classics-remote-translations-v1"||!Array.isArray(d.entries))throw Error("registry malformed");remoteEntries=d.entries;drawRemote()})
 .catch(()=>{remoteEntries=[];remoteBox.hidden=true});

function refresh(){
 const t=dict[locale],selected=work.value||new URLSearchParams(location.search).get("work")||"";
 work.replaceChildren(new Option(t.all,""));
 for(const w of works.slice().sort((a,b)=>dating(a)-dating(b)||String(a.title).localeCompare(String(b.title),"es"))){
  const name=[w.title,w.author].filter(Boolean).join(" · ")+(indexed.has(w.id)?"":" "+t.missing);
  work.append(new Option(name,w.id));
 }
 if(byId.has(selected))work.value=selected;
 coverage.textContent=t.ready(works.length,entries.length,works.length-indexed.size);
 drawRemote();
}
function switchLanguage(k){
 locale=Object.hasOwn(dict,k)?k:"es";
 const t=dict[locale];document.documentElement.lang=locale;
 $("home").textContent=t.home;$("search-submit").textContent=t.search;
 const chapters=$("capitula-nav");if(chapters)chapters.textContent=({es:"Lectura por capítulos",en:"Chapter reading",fr:"Lecture par chapitres"})[locale];
 input.placeholder=t.placeholder;$("intro").textContent=t.intro;$("work-label").textContent=t.work;
 $("results-heading").textContent=t.label;$("method-note").textContent=t.method;lex.textContent=t.lexicon;
 const button=$("language-toggle");if(button){
  button.textContent=({es:"Idioma · ES",en:"Language · EN",fr:"Langue · FR"})[locale];
  button.setAttribute("aria-label",({es:"Cambiar idioma: español, inglés o francés",en:"Switch language: English, French or Spanish",fr:"Changer de langue : français, espagnol ou anglais"})[locale]);
  button.title=({es:"Cambiar idioma: ES → EN → FR",en:"Switch language: ES → EN → FR",fr:"Changer de langue : ES → EN → FR"})[locale];
 }
 if(works.length)refresh();else coverage.textContent=t.wait;
 drawRemote();
 if(current)render(previous,current,diag);
 updateLexicon();
 try{localStorage.setItem("vitruvius-ui-lang",locale)}catch{}
}
function updateLexicon(){
 const q=input.value.trim();bar.hidden=!q;
 if(q){const u=new URL("vitruvia-lexicon.html",location.href);u.searchParams.set("q",q);u.searchParams.set("mode","palabra");lex.href=u.href;lex.textContent=dict[locale].lexicon+" · "+q;lex.setAttribute("aria-label",dict[locale].lexicon+": "+q);}
}
const metadata=Promise.all([
 fetch(CATALOG).then(r=>{if(!r.ok)throw Error("catalogue");return r.json()}),
 fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("registry");return r.json()})
]).then(([catalog,registry])=>{
 if(!Array.isArray(catalog.works)||registry.schema!=="vitruvia-classics-search-registry-v1"||
 !Array.isArray(registry.entries)||registry.entries.length!==registry.count)throw Error("inconsistent registry");
 works=catalog.works;entries=registry.entries.filter(bibliothecaLanguagePolicy);byId=new Map(works.map(w=>[w.id,w]));
 indexed=new Set(entries.filter(e=>e.format!=="historical-ocr-pages"&&byId.has(e.workId)).map(e=>e.workId));
 refresh();
}).catch(error=>{coverage.textContent=dict[locale].unavailable;throw error});
function provenance(w,r){
 const versions=(w?.localVersions||[]).filter(v=>v.language===r.language&&typeof v.citationChicago18==="string"&&v.citationChicago18.trim());
 if(versions.length===1)return {citation:versions[0].citationChicago18.trim(),chicago:true};
 // No inventar editorial, traductor, fecha o paginación para completar la cita.
 const partial=(r.attribution||"").trim()||
  (r.language===w?.language?w?.bibliography?.originalEditionCitation:w?.bibliography?.translationCitation)||"";
 const label=[w?.author||r.author||"Autor no identificado",w?.title||r.title||"Obra sin título"].join(". ");
 return {citation:partial||label+" Fuente digital: "+(r.source||"sin identificar"),chicago:false};
}

function render(rows,q,details){
 previous=rows;current=q;diag=details||{};
 const t=dict[locale],sorted=rows.slice().sort((a,b)=>{
  const wa=byId.get(a.workId)||{},wb=byId.get(b.workId)||{};
  return dating(wa)-dating(wb)||String(wa.title||a.title).localeCompare(String(wb.title||b.title),"es")||
   a.workId.localeCompare(b.workId)||String(a.locus).localeCompare(String(b.locus),undefined,{numeric:true})||
   String(a.language).localeCompare(String(b.language));
 });
 root.hidden=false;list.replaceChildren();
 const groupCounts=new Map();
 for(const r of sorted)groupCounts.set(r.workId,(groupCounts.get(r.workId)||0)+(r.hitsInPassage||1));
 const total=[...groupCounts.values()].reduce((sum,n)=>sum+n,0);
 status.textContent=t.stats(total,sorted.length,new Set(sorted.map(r=>r.workId)).size)+
  (details?.transliterations?.length?" · "+t.translit(details.transliterations):"")+
  (details?.failed?" · "+t.failed:"");
 if(!sorted.length)list.append(el("p","",t.none));
 let last="",section=null,passages=null;const frag=document.createDocumentFragment();
 for(const r of sorted){
  if(last!==r.workId){
   last=r.workId;const w=byId.get(last)||{};section=el("section","group");
   section.append(el("h3","",w.title||r.title));
   section.append(el("p","meta",[w.author||r.author,w.dating||t.noDate,t.groupCount(groupCounts.get(last)||0)].filter(Boolean).join(" · ")));
   // Un libro puede contener más de una edición o lengua: no se confunden sus recuentos.
   const relevant=sorted.filter(z=>z.workId===last);
   const countsByVersion=new Map(),references=new Map();
   for(const edition of relevant){
    const key=[edition.language,edition.source,edition.edition].join("|");
    countsByVersion.set(key,(countsByVersion.get(key)||0)+(edition.hitsInPassage||1));
    if(!references.has(key))references.set(key,{language:edition.language,record:provenance(w,edition)});
   }
   const versionInfo=[...countsByVersion].map(([key,n])=>{
    const lang=key.split("|")[0];return (languages[lang]||lang)+": "+n;
   }).join(" · ");
   section.append(el("p","version-counts",versionInfo));
   const referenceDetails=el("details","references");
   referenceDetails.append(el("summary","",locale==="es"?"Referencias bibliográficas · Chicago 18":locale==="fr"?"Références bibliographiques · Chicago 18":"Bibliographic references · Chicago 18"));
   const referenceList=el("ul","reference-list");
   for(const {language,record} of references.values()){
    const prefix=record.chicago?"":"["+(locale==="es"?"Referencia parcial: datos insuficientes para Chicago 18":locale==="fr"?"Référence partielle : données insuffisantes pour Chicago 18":"Partial reference: insufficient data for Chicago 18")+"] ";
    referenceList.append(el("li","",(languages[language]||language)+" · "+prefix+record.citation));
   }
   referenceDetails.append(referenceList);section.append(referenceDetails);
   passages=el("ol","hits");section.append(passages);frag.append(section);
  }
  const li=el("li","hit");li.lang=r.language==="grc"?"el":r.language||"es";
  li.append(el("span","locus",t.loc+" "+(r.locus||"—")+" · "+(languages[r.language]||r.language)+" · "+(r.hitsInPassage||1)));
  const p=el("p","");decorate(p,r.passageText||r.excerpt||"",r.term||q);li.append(p);
  // Enlace auténtico al pasaje citado; no crear nuevos loci ni duplicar visores.
  if(typeof r.link==="string"){
   try{const target=new URL(r.link,location.href);
    if(target.origin===location.origin&&/^https?:$/.test(target.protocol)){
     const label=({es:"Abrir pasaje",en:"Open passage",fr:"Ouvrir le passage"})[locale];
     const a=el("a","passage-link",label);a.href=target.href;li.append(a);
    }
   }catch{}
  }
  passages.append(li);
 }
 list.append(frag);
 $("unindexed").textContent=t.outside(works.length-indexed.size)+(details?.failed?" "+t.failed:"");
}
async function search(){
 const id=++serial,q=input.value.trim();updateLexicon();root.hidden=true;list.replaceChildren();
 if(q.length>180||fold(q).replace(/[^\p{L}\p{N}]/gu,"").length<2){status.textContent=dict[locale].short;return}
 status.textContent=dict[locale].loading;$("search-submit").disabled=true;
 try{
  await metadata;if(id!==serial)return;
  const workId=work.value;
  if(workId&&!indexed.has(workId)){status.textContent=dict[locale].wrong;return}
  if(typeof window.ClassicsCorpusSearch?.searchPassages!=="function")throw Error("engine unavailable");
  const transliterations=await attestedGreekForms(q);
  if(id!==serial)return;
  const hits=await window.ClassicsCorpusSearch.searchPassages([q,...transliterations],{workId,allMatches:true,includeFullText:true,includeOCR:false});
  if(id!==serial)return;
  const details={...(window.ClassicsCorpusSearch.diagnostics?.()||{}),transliterations};render(hits,q,details);
  const url=new URL(location.href);url.searchParams.set("q",q);
  if(workId)url.searchParams.set("work",workId);else url.searchParams.delete("work");
  history.replaceState(null,"",url);
 }catch{if(id===serial)status.textContent=dict[locale].unavailable}
 finally{if(id===serial)$("search-submit").disabled=false}
}
$("search-form").addEventListener("submit",ev=>{ev.preventDefault();void search()});
work.addEventListener("change",()=>{drawRemote();if(input.value.trim())void search()});
input.addEventListener("input",updateLexicon);
$("language-toggle").addEventListener("click",()=>{
 const next=({es:"en",en:"fr",fr:"es"})[locale]||"es";
 switchLanguage(next);
});
const params=new URLSearchParams(location.search),initial=(params.get("q")||params.get("term")||"").trim();
if(initial)input.value=initial;
let stored="es";try{stored=localStorage.getItem("vitruvius-ui-lang")||"es"}catch{}
switchLanguage(params.get("ui")||stored);updateLexicon();
metadata.then(()=>{if(initial)void search()}).catch(()=>{});
})();
