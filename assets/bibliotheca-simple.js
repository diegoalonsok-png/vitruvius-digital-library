/* Bibliotheca simple: single search, single work selector, actual attested paragraphs.
   No readers, facsimile frames, palettes or undocumented translation alignments. */
(()=>{"use strict";
const CATALOG="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
const REGISTRY="data/classics-corpus/search-registry.json";
const $=id=>document.getElementById(id);
const dict={
 es:{home:"Inicio",search:"Buscar",placeholder:"Una palabra o frase, por ejemplo: domus",
 intro:"Busca una palabra o frase en todos los textos clásicos indexados, o elige una obra. Los párrafos aparecen de las obras más antiguas a las más recientes, con su locus y sin inventar equivalencias entre traducciones.",
 work:"Obra",all:"Todos los libros indexados",wait:"Cargando el catálogo de obras…",
 ready:(c,v,n)=>c+" obras catalogadas · "+v+" versiones indexadas · "+n+" obras sin texto indexado.",
 missing:"(no indexada)",label:"Párrafos encontrados",lexicon:"Consultar esta palabra en Lexicon",
 method:"Búsqueda literal en textos realmente indexados. Las obras sin texto no se examinan; fechas y loci según las fuentes.",
 short:"Escribe al menos dos letras o cifras.",loading:"Buscando en las versiones indexadas…",
 unavailable:"No fue posible verificar el índice: búsqueda no disponible.",failed:"Búsqueda parcial: algunas versiones fallaron.",
 none:"No se hallaron coincidencias en los textos examinados.",
 stats:(n,p,w)=>n+" coincidencias · "+p+" párrafos · "+w+" obras",
 outside:n=>n+" obras catalogadas sin texto indexado; no examinadas.",
 wrong:"Esta obra no tiene texto indexado; no se buscó.",citation:"Edición y procedencia",loc:"Locus",noDate:"Datación no determinada"},
 en:{home:"Home",search:"Search",placeholder:"One word or phrase, for example: domus",
 intro:"Search a word or phrase across all indexed classical texts or one work. Paragraphs appear in classical chronological order, with source loci and no invented translation alignments.",
 work:"Work",all:"All indexed books",wait:"Loading the work catalogue…",
 ready:(c,v,n)=>c+" catalogued works · "+v+" indexed versions · "+n+" works with no indexed text.",
 missing:"(not indexed)",label:"Matching paragraphs",lexicon:"Look up this word in Lexicon",
 method:"Literal search of indexed texts only. Unindexed works are not examined; dates and loci follow the sources.",
 short:"Enter at least two letters or digits.",loading:"Searching indexed editions…",
 unavailable:"Could not verify the index; search unavailable.",failed:"Partial results: some text versions failed.",
 none:"No matches in the texts examined.",
 stats:(n,p,w)=>n+" occurrences · "+p+" paragraphs · "+w+" works",
 outside:n=>n+" catalogued works without indexed text, not searched.",
 wrong:"This work has no indexed text; it was not searched.",citation:"Edition and provenance",loc:"Locus",noDate:"Undated"},
 fr:{home:"Accueil",search:"Chercher",placeholder:"Un mot ou une expression, par exemple : domus",
 intro:"Cherchez un mot ou une expression dans tous les textes classiques indexés, ou dans une seule œuvre. Les paragraphes apparaissent par ancienneté avec leur locus, sans alignements inventés.",
 work:"Œuvre",all:"Tous les livres indexés",wait:"Chargement du catalogue…",
 ready:(c,v,n)=>c+" œuvres cataloguées · "+v+" versions indexées · "+n+" œuvres sans texte indexé.",
 missing:"(non indexée)",label:"Paragraphes trouvés",lexicon:"Consulter ce mot dans Lexicon",
 method:"Recherche littérale uniquement dans les textes indexés. Les œuvres non indexées ne sont pas examinées.",
 short:"Saisissez deux lettres ou chiffres au minimum.",loading:"Recherche dans les éditions indexées…",
 unavailable:"Index non vérifiable ; recherche indisponible.",failed:"Résultats partiels : certaines éditions n'ont pu être chargées.",
 none:"Aucune correspondance dans les textes consultés.",
 stats:(n,p,w)=>n+" occurrences · "+p+" paragraphes · "+w+" œuvres",
 outside:n=>n+" œuvres cataloguées sans texte indexé, non examinées.",
 wrong:"Cette œuvre n'a pas de texte indexé ; aucune recherche.",citation:"Édition et provenance",loc:"Locus",noDate:"Datation inconnue"}
};
const languages={la:"Latín",grc:"Griego",es:"Castellano",en:"English",fr:"Français"};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
const roman=x=>{let n=0,last=0;for(const c of [...String(x).toUpperCase()].reverse()){const z={I:1,V:5,X:10,L:50,C:100}[c]||0;n+=z<last?-z:z;last=z}return n};
function dating(w){
 const s=fold(w?.dating);
 if(/tradicion arcaica|epoca arcaica/.test(s))return /homer|odyssey|iliad/.test(w.id||"")?-780:-720;
 if(/edicion editorial|edicion critica impresa|composicion y atribuciones debatidas/.test(s))return Infinity;
 const century=s.match(/(?:siglo|siglos|s\.)\s+([ivx]+)/);
 if(century){const c=roman(century[1]);if(c)return /a\.\s*c\./.test(s)?-c*100:(c-1)*100+1}
 const years=[...s.matchAll(/(\d{1,4})\s*(a\.\s*c\.|d\.\s*c\.)/g)];
 return years.length?Number(years[0][1])*(years[0][2].startsWith("a")?-1:1):Infinity;
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
function refresh(){
 const t=dict[locale],selected=work.value||new URLSearchParams(location.search).get("work")||"";
 work.replaceChildren(new Option(t.all,""));
 for(const w of works.slice().sort((a,b)=>dating(a)-dating(b)||String(a.title).localeCompare(String(b.title),"es"))){
  const name=[w.title,w.author].filter(Boolean).join(" · ")+(indexed.has(w.id)?"":" "+t.missing);
  work.append(new Option(name,w.id));
 }
 if(byId.has(selected))work.value=selected;
 coverage.textContent=t.ready(works.length,entries.length,works.length-indexed.size);
}
function switchLanguage(k){
 locale=Object.hasOwn(dict,k)?k:"es";
 const t=dict[locale];document.documentElement.lang=locale;
 $("home").textContent=t.home;$("search-submit").textContent=t.search;
 input.placeholder=t.placeholder;$("intro").textContent=t.intro;$("work-label").textContent=t.work;
 $("results-heading").textContent=t.label;$("method-note").textContent=t.method;lex.textContent=t.lexicon;
 document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===locale)));
 if(works.length)refresh();else coverage.textContent=t.wait;
 if(current)render(previous,current,diag);
 try{localStorage.setItem("vitruvius-ui-lang",locale)}catch{}
}
function updateLexicon(){
 const q=input.value.trim();bar.hidden=!q;
 if(q){const u=new URL("vitruvia-lexicon.html",location.href);u.searchParams.set("q",q);lex.href=u.href;}
}
const metadata=Promise.all([
 fetch(CATALOG).then(r=>{if(!r.ok)throw Error("catalogue");return r.json()}),
 fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("registry");return r.json()})
]).then(([catalog,registry])=>{
 if(!Array.isArray(catalog.works)||registry.schema!=="vitruvia-classics-search-registry-v1"||
 !Array.isArray(registry.entries)||registry.entries.length!==registry.count)throw Error("inconsistent registry");
 works=catalog.works;entries=registry.entries;byId=new Map(works.map(w=>[w.id,w]));
 indexed=new Set(entries.filter(e=>e.format!=="historical-ocr-pages"&&byId.has(e.workId)).map(e=>e.workId));
 refresh();
}).catch(error=>{coverage.textContent=dict[locale].unavailable;throw error});
function provenance(w,r){
 const version=(w?.localVersions||[]).find(v=>v.language===r.language&&v.citationChicago18);
 return version?.citationChicago18||
  (r.language===w?.language?w?.bibliography?.originalEditionCitation:w?.bibliography?.translationCitation)||
  r.attribution||"";
}
function render(rows,q,details){
 previous=rows;current=q;diag=details||{};
 const t=dict[locale],sorted=rows.slice().sort((a,b)=>{
  const wa=byId.get(a.workId)||{},wb=byId.get(b.workId)||{};
  return dating(wa)-dating(wb)||String(wa.title||a.title).localeCompare(String(wb.title||b.title),"es")||
   a.workId.localeCompare(b.workId)||String(a.language).localeCompare(String(b.language))||
   String(a.locus).localeCompare(String(b.locus),undefined,{numeric:true});
 });
 root.hidden=false;list.replaceChildren();
 const total=sorted.reduce((sum,r)=>sum+(r.hitsInPassage||1),0);
 status.textContent=t.stats(total,sorted.length,new Set(sorted.map(r=>r.workId)).size)+
  (details?.failed?" · "+t.failed:"");
 if(!sorted.length)list.append(el("p","",t.none));
 let last="",section=null,passages=null;const frag=document.createDocumentFragment();
 for(const r of sorted){
  if(last!==r.workId){
   last=r.workId;const w=byId.get(last)||{};section=el("section","group");
   section.append(el("h3","",w.title||r.title));
   section.append(el("p","meta",[w.author||r.author,w.dating||t.noDate].filter(Boolean).join(" · ")));
   const cite=provenance(w,r);if(cite)section.append(el("p","bibliography",t.citation+" · "+cite));
   passages=el("ol","hits");section.append(passages);frag.append(section);
  }
  const li=el("li","hit");li.lang=r.language==="grc"?"el":r.language||"es";
  li.append(el("span","locus",t.loc+" "+(r.locus||"—")+" · "+(languages[r.language]||r.language)+" · "+(r.hitsInPassage||1)));
  const p=el("p","");decorate(p,r.passageText||r.excerpt||"",q);li.append(p);passages.append(li);
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
  const hits=await window.ClassicsCorpusSearch.searchPassages([q],{workId,allMatches:true,includeFullText:true,includeOCR:false});
  if(id!==serial)return;
  const details=window.ClassicsCorpusSearch.diagnostics?.()||{};render(hits,q,details);
  const url=new URL(location.href);url.searchParams.set("q",q);
  if(workId)url.searchParams.set("work",workId);else url.searchParams.delete("work");
  history.replaceState(null,"",url);
 }catch{if(id===serial)status.textContent=dict[locale].unavailable}
 finally{if(id===serial)$("search-submit").disabled=false}
}
$("search-form").addEventListener("submit",ev=>{ev.preventDefault();void search()});
work.addEventListener("change",()=>{if(input.value.trim())void search()});
input.addEventListener("input",updateLexicon);
document.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>switchLanguage(b.dataset.lang)));
const params=new URLSearchParams(location.search),initial=(params.get("q")||params.get("term")||"").trim();
if(initial)input.value=initial;
let stored="es";try{stored=localStorage.getItem("vitruvius-ui-lang")||"es"}catch{}
switchLanguage(params.get("ui")||stored);updateLexicon();
metadata.then(()=>{if(initial)void search()}).catch(()=>{});
})();
