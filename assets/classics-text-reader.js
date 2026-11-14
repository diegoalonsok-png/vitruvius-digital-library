/* Citable Greek/Latin classical editor, not manuscript OCR or guaranteed morphosyntax. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const p=new URLSearchParams(location.search),work=p.get("work")||"apuleius-metamorphoses";
const allowed={"apuleius-metamorphoses":"Apuleyo · Metamorphoses (Asinus aureus)","petronius-satyrica":"Petronio · Satyrica / Satyricon","theophrastus-characters":"Teofrasto · Ἠθικοὶ χαρακτῆρες (Caracteres)"};
const LEX=window.ClassicalLexicon;
if(!/^[a-z0-9-]{3,60}$/.test(work)){$("source-title").textContent="Obra no identificada en este lector";return}
const base="data/classics-corpus/"+work+"-";
const langSelect=$("language"),input=$("query");let data,active=0,results=[],search="",hostedEditions=[],resultPage=0;
// Deep links from documented concordances require literal evidence, not heuristic synonyms.
const exactConcordance=p.get("semantic")!=="1";
/* A trusted same-origin parallel reader may request ordinal passage navigation.
   Does not infer lexical/critical alignment across editions. */
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window.parent===window)return;
 const cmd=event.data;
 if(!cmd||cmd.type!=="vitruvia-parallel-goto"||cmd.work!==work||cmd.lang!==data?.language)return;
 if(!Number.isInteger(cmd.index)||cmd.index<0||cmd.index>=data.passages.length)return;
 select(cmd.index);
});

/* Recover iframe initialization if the parent missed the initial ready event.
   Same-origin parent only; the source edition and active locus are never changed. */
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window.parent===window)return;
 const cmd=event.data;
 if(!cmd||cmd.type!=="vitruvia-parallel-probe"||cmd.work!==work||cmd.lang!==data?.language)return;
 window.parent.postMessage({type:"vitruvia-parallel-ready",work,lang:data.language,count:data.passages.length},location.origin);
});

/* Appearance controls supplied by the same-origin twin reader; editorial text is unchanged. */
const PARALLEL_FONTS={serif:'Georgia, "Times New Roman", serif',sans:'system-ui, sans-serif',mono:'ui-monospace, monospace',classic:'"Palatino Linotype", "Book Antiqua", Palatino, serif'};
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window.parent===window)return;
 const cmd=event.data;
 if(!cmd||cmd.type!=="vitruvia-parallel-style"||cmd.work!==work||cmd.lang!==data?.language)return;
 applyParentAppearance(cmd);
});
const fold=s=>LEX?LEX.fold(s):String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replaceAll("j","i");
const tokenize=s=>fold(s).match(/[\p{L}]{3,}/gu)||[];
const equivalences=[
 ["asno","burro","asno","asinus","asini","ass","donkey"],
 ["magia","hechizo","bruja","magic","witch","magus","maga","veneficium","venefica"],
 ["amor","amore","amores","amantes","love","loves","cupido","eros"],
 ["banquete","cena","cenae","convivium","feast","dinner","trimalcion","trimalchio"],
 ["metamorfosis","transformacion","transformar","metamorphoses","mutare","mutatio","change"],
 ["esclavo","servus","servi","slaves","slave","libertus","libertini"],
 ["fortuna","azar","destino","fate","chance","fortunae"],
 ["filosofia","sapientia","philosophy","philosophia","sabiduria"],
 ["psique","psyche","cupido","alma","anima","soul"]
];
function expand(q){
 const tokens=tokenize(q),set=new Set(tokens);
 if(tokens.length!==1)return [...set];
 for(const group of equivalences)if(group.some(w=>fold(w)===tokens[0]))group.forEach(w=>set.add(fold(w)));
 return [...set];
}
function stem(w){
 const x=fold(w);
 if(x.length<6)return x;
 // Surface-form heuristic only, never an accredited lemmatizer.
 return x.replace(/(ibus|orum|arum|aeque|oque|orum|arum|arum|orum|ntur|batur|erunt|issent|ibus|arum|ibus|atis|atur|enda|endum|orum|arum|ibus|ium|ere|are|ire|ant|ent|unt|tis|bus|is|us|um|am|em|ae|as|os|es|at|it|et|nt)$/,"").slice(0,9);
}
function match(text,q,semantic=false){
 const normalized=fold(text),target=fold(q);
 if(!target)return false;
 if(normalized.includes(target))return true;
 if(!semantic)return false;
 const qstems=expand(q).filter(x=>x.length>=4);
 const words=tokenize(text);
 return qstems.some(t=>words.some(w=>w===t||((t.length>=5)&&(stem(w).length>=4)&&stem(t)===stem(w))));
}
function markText(target,text,q){
 // Marca visual de todas las coincidencias; el texto editado no se altera.
 if(LEX){const found=LEX.highlightInto(target,text,q)||[];if(p.get("parallel")==="1")for(const mark of found)mark.classList.add("cl-parallel-hit");return found;}
 target.replaceChildren();target.textContent=text;return[];
}
let hitMarks=[],hitAt=-1;
function focusHit(step){
 if(!hitMarks.length)return;
 hitMarks[hitAt]?.classList.remove("cl-current");
 hitAt=(hitAt+step+hitMarks.length)%hitMarks.length;
 const m=hitMarks[hitAt];m.classList.add("cl-current");m.scrollIntoView({block:"center",behavior:"smooth"});
 const c=$("hit-count");if(c)c.textContent=(hitAt+1)+" / "+hitMarks.length;
}
const unitLabel=()=>data?.language==="la"?"Locus":data?.language==="grc"?(work==="theophrastus-characters"?"Carácter":work==="plato-apology"?"Stephanus":"Capítulo"):"Bloque";
function setQuery(q){search=q.trim();input.value=search;}
// Keep direct references instead of re-querying every TOC button on each locus change.
let tocButtons=[],selectedTocButton=null;
function renderToc(){
 const target=$("toc"),fragment=document.createDocumentFragment();
 tocButtons=[];selectedTocButton=null;
 data.passages.forEach((v,i)=>{
  const li=document.createElement("li"),btn=document.createElement("button");btn.type="button";
  btn.textContent=(data.language==="la"?"§ ":"")+v.locus+(v.title?" · "+v.title:"");if(v.title)btn.lang=data.language;
  btn.setAttribute("aria-current",String(i===active));btn.addEventListener("click",()=>select(i));
  tocButtons.push(btn);if(i===active)selectedTocButton=btn;
  li.append(btn);fragment.append(li);
 });
 target.replaceChildren(fragment);
}
function select(i){
 if(!data)return;
 active=Math.max(0,Math.min(data.passages.length-1,i));
 const rec=data.passages[active];
 $("current-locus").textContent=unitLabel()+" "+rec.locus+(rec.title?" · "+rec.title:"")+" · "+(active+1)+"/"+data.passages.length;
 $("prev").disabled=active===0;$("next").disabled=active>=data.passages.length-1;
 const target=$("passages"),p1=document.createElement("p"),label=document.createElement("span");
 label.className="locus";label.textContent=unitLabel()+" "+rec.locus+(rec.title?" · "+rec.title:"");
 p1.append(label);const txt=document.createElement("span");hitMarks=markText(txt,rec.text,search)||[];hitAt=-1;p1.append(txt);
 target.replaceChildren(p1);target.setAttribute("lang",data.language);
 // Original-only editions: on-demand machine translation of ONE selected passage.
 // Never replace the source or count generated output as an accredited translation.
 const localTranslationAvailable=hostedEditions.some(e=>e.workId===work&&["es","en","fr","it","de","pt"].includes(e.language));
 if(p.get("parallel")!=="1"&&["la","grc"].includes(data.language)&&!localTranslationAvailable){
  window.VitruviaInlineTranslation?.attach(p1,{sourceLanguage:data.language,originalText:rec.text});
 }
 const nav=$("hit-nav");if(nav){nav.hidden=!hitMarks.length;$("hit-count").textContent=hitMarks.length?hitMarks.length+" en este pasaje":"";}
 if(hitMarks.length)requestAnimationFrame(()=>focusHit(1));
 // O(1) selection update: no full TOC traversal on every Next/Previous action.
 const nextTocButton=tocButtons[active];
 if(selectedTocButton!==nextTocButton){
  selectedTocButton?.setAttribute("aria-current","false");
  nextTocButton?.setAttribute("aria-current","true");
  selectedTocButton=nextTocButton;
 }
 const u=new URL(location.href);u.searchParams.set("locus",rec.locus);if(search)u.searchParams.set("q",search);else u.searchParams.delete("q");history.replaceState(null,"",u);
 if(p.get("parallel")==="1"&&window.parent!==window){
  window.parent.postMessage({type:"vitruvia-parallel-position",work,lang:data.language,index:active,locus:rec.locus},location.origin);
 }
}
const SEARCH_PAGE_SIZE=18;
function literalLocations(text,query){
 // La lista y el subrayado comparten exactamente el mismo algoritmo de concordancia.
 // Así evitamos que un resultado diga "coincidencia" cuando la palabra no aparece.
 if(LEX?.find)return LEX.find(text,query,{prefix:false});
 const source=fold(text),needle=fold(query);if(!needle)return[];
 const spans=[];let at=0;
 while((at=source.indexOf(needle,at))!==-1){
  const before=source[at-1]||"",after=source[at+needle.length]||"";
  if(!/[\\p{L}]/u.test(before)&&!/[\\p{L}]/u.test(after))spans.push([at,at+needle.length]);
  at+=Math.max(needle.length,1);
 }
 return spans;
}
function makeConcordanceExcerpt(text,from,to){
 const left=Math.max(0,from-95),right=Math.min(text.length,to+150);
 const node=document.createElement("span");node.className="search-passage-excerpt";
 if(left)node.append(document.createTextNode("…"));
 node.append(document.createTextNode(text.slice(left,from)));
 const mark=document.createElement("mark");mark.className="search-excerpt-hit";mark.textContent=text.slice(from,to);
 node.append(mark,document.createTextNode(text.slice(to,right)));
 if(right<text.length)node.append(document.createTextNode("…"));
 return node;
}
function renderSearch(){
 const target=$("results");target.replaceChildren();
 const section=$("search-results-section");
 if(!search){results=[];resultPage=0;if(section)section.hidden=true;return}
 if(section)section.hidden=false;
 // Se examina el corpus cargado COMPLETO; no solamente el locus abierto.
 results=data.passages.map((r,i)=>{
  const locations=literalLocations(r.text,search);
  return {i,r,locations};
 }).filter(x=>exactConcordance?x.locations.length>0:match(x.r.text,search,true));
 const literalTotal=results.reduce((n,x)=>n+x.locations.length,0);
 const header=document.createElement("p");header.className="search-summary";
 header.textContent=results.length+" pasajes encontrados entre "+data.passages.length+" unidades de toda la edición"+
  (exactConcordance?" · "+literalTotal+" apariciones literales documentadas.":" · expansión experimental; compruebe las equivalencias antes de citarlas.");
 target.append(header);
 if(!results.length){
  const no=document.createElement("p");no.className="search-empty";
  no.textContent="No se encontraron pasajes con esta expresión en la edición "+(data.language==="grc"?"griega":data.language==="la"?"latina":"seleccionada")+
   ". Las palabras latinas no se convierten automáticamente en palabras griegas (ni a la inversa). Consulte el diccionario para determinar una forma equivalente y vuelva a buscarla.";
  target.append(no);return;
 }
 const start=resultPage*SEARCH_PAGE_SIZE;
 const page=results.slice(start,start+SEARCH_PAGE_SIZE);
 const list=document.createElement("ol");list.className="search-passage-list";list.start=start+1;
 for(const {i,r,locations} of page){
  const li=document.createElement("li"),button=document.createElement("button");
  button.type="button";button.className="search-passage-jump";
  const title=document.createElement("strong");title.textContent=unitLabel()+" "+r.locus+(r.title?" · "+r.title:"")+
    (locations.length?" · "+locations.length+" "+(locations.length===1?"aparición":"apariciones"):" · coincidencia experimental");
  button.append(title);
  if(locations.length){
   for(const [a,b] of locations.slice(0,3)){
    const excerpt=makeConcordanceExcerpt(r.text,a,b);excerpt.lang=data.language;
    button.append(excerpt);
   }
   if(locations.length>3){
    const more=document.createElement("span");more.className="search-passage-more";
    more.textContent="+"+(locations.length-3)+" apariciones más en este pasaje";button.append(more);
   }
  }else{
   const excerpt=document.createElement("span");excerpt.className="search-passage-excerpt";
   excerpt.textContent=r.text.slice(0,300)+(r.text.length>300?"…":"");excerpt.lang=data.language;
   button.append(excerpt);
  }
  button.addEventListener("click",()=>{
   select(i);
   $("passages").scrollIntoView({block:"start",behavior:"smooth"});
  });
  li.append(button);list.append(li);
 }
 target.append(list);
 const pages=Math.ceil(results.length/SEARCH_PAGE_SIZE);
 if(pages>1){
  const nav=document.createElement("div");nav.className="search-pagination";
  const previous=document.createElement("button");previous.type="button";previous.textContent="← Resultados anteriores";previous.disabled=resultPage===0;
  const label=document.createElement("span");label.textContent="Resultados "+(start+1)+"–"+Math.min(start+SEARCH_PAGE_SIZE,results.length)+" de "+results.length;
  const next=document.createElement("button");next.type="button";next.textContent="Más resultados →";next.disabled=resultPage>=pages-1;
  previous.addEventListener("click",()=>{resultPage--;renderSearch()});
  next.addEventListener("click",()=>{resultPage++;renderSearch()});
  nav.append(previous,label,next);target.append(nav);
 }
}

function morphology(token){
 const t=fold(token),x=t.toLowerCase();let possibilities=[];
 if(/(nt|ntur|mus|tis|tur|tur|bat|bant|bit|bunt|avit|ebat|erat|erunt|isse|are|ere|ire)$/.test(x))
  possibilities.push("Posible forma verbal; tiempo, persona y conjugación no establecidos");
 if(/(us|um|is|ae|am|em|ibus|orum|arum|as|os)$/.test(x))
  possibilities.push("Posible flexión nominal o adjetival; caso y número no establecidos");
 if(/(que|ve|ne)$/.test(x))possibilities.push("Posible enclítica: revisar contexto");
 if(!possibilities.length)possibilities.push("Forma no clasificada por reglas de terminación");
 const box=$("lexicon");box.replaceChildren();
 const strong=document.createElement("strong");strong.textContent="Forma observada: "+token;box.append(strong);
 const info=document.createElement("p");info.textContent=possibilities.join(" · ")+". Análisis sintáctico contextual no certificado.";box.append(info);
 const link=document.createElement("a");link.href="https://atlas.perseus.tufts.edu/";link.target="_blank";link.rel="noopener noreferrer";link.textContent="Consultar léxico y formas en Perseus ATLAS ↗";box.append(link);
}
if(LEX)LEX.attachClick($("passages"),$("lexicon"),()=>(data&&["la","grc"].includes(data.language))?{lang:data.language,work}:null);
else{
$("passages").addEventListener("dblclick",()=>{if(data?.language!=="la")return;const selection=window.getSelection()?.toString()?.trim();if(selection&&/^[A-Za-zÀ-ž]{3,40}$/.test(selection))morphology(selection)});
}
async function load(language){
 const indexed=hostedEditions.find(e=>e.language===language);
  const path=indexed?.path||base+language+".json",response=await fetch(path);
 if(!response.ok)throw Error("Edición todavía no incorporada: "+language+" · HTTP "+response.status);
 let corpus=await response.json();
 if(indexed?.format==="structured-bilingual"){
  if(!Array.isArray(corpus.passages)||!corpus.passages.length||!["la","es","en","fr"].includes(language))throw Error("Edición estructurada no disponible");
  const editorial=corpus;
  corpus={
   workId:work,language,sourceType:"structured-bilingual",
   source:editorial.source?.filename||indexed.path,
   attribution:"Vitruvio · "+(editorial.edition||indexed.edition||"edición")+" · "+(editorial.version||"")+" · Diego A. Kurilo",
   license:"Edición académica con derechos y procedencia según el fichero de origen",
   alignment:"Paralelo por loci editoriales; las recensiones difieren y su igualdad textual no se presume.",
   editorialStatus:"Texto de edición estructurada, no OCR ni colación autóptica",
   passages:editorial.passages.map(item=>({
    locus:String(item.locus||""),text:language==="la"?item.latin:item.translation
   })).filter(item=>item.locus&&typeof item.text==="string"&&item.text.trim())
  };
 }
 if(corpus.workId!==(indexed?.sourceWorkId||work)||corpus.language!==language||!Array.isArray(corpus.passages)||!corpus.passages.length||corpus.passages.reduce((n,p)=>n+(typeof p.text==="string"?p.text.trim().length:0),0)<350)throw Error("El documento no pasó validación de integridad");
 if(work==="apuleius-metamorphoses"&&language==="es"){
  // Never block access to any of the 312 original anthology units on optional metadata.
  // The note is visible immediately; the provenance file may refine it asynchronously.
  const fallback="Esta antología histórica conserva sus 312 unidades textuales sin recortar. t22–t245 corresponden provisionalmente a la narración de Metamorfosis; las restantes unidades y paratextos se conservan íntegros. No hay alineación certificada por loci con el latín.";
  corpus={...corpus,alignment:(corpus.alignment||"")+" "+fallback};
  const savedCorpus=corpus;
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),4000);
  fetch("data/classics-corpus/source-scope.json",{signal:abort.signal})
   .then(r=>r.ok?r.json():null)
   .then(scopes=>{
    const scope=(scopes?.entries||[]).find(x=>x.workId===work&&x.language===language&&x.sourcePath===path);
    if(!scope?.noteEs||data!==savedCorpus)return;
    data={...data,alignment:(savedCorpus.alignment||"").replace(fallback,scope.noteEs)};
    $("method-note").textContent=data.editorialStatus+". "+data.alignment+". Fuente y atribución: "+data.attribution;
    $("toc-help").textContent=data.alignment;
   })
   .catch(()=>{})
   .finally(()=>clearTimeout(timeout));
 }

 data=corpus;active=0;
 $("source-title").textContent=corpus.attribution+" · "+corpus.passages.length+" unidades textuales";
 const declaredAlignment=corpus.alignment||"No existe alineación filológica certificada entre este texto, traducciones y manuscritos.";
 const sourceCoverage=indexed?.sourceWorkId?indexed.sourceDescription:"";
 $("method-note").textContent=[corpus.editorialStatus,declaredAlignment,sourceCoverage,"Fuente y atribución: "+corpus.attribution].filter(Boolean).join(" · ");
 $("attribution").textContent=(corpus.chicago18Bibliography?"Referencia bibliográfica (Chicago, 18.ª ed.): "+corpus.chicago18Bibliography+" · ":"")+corpus.source+" · "+corpus.license+" · La biblioteca no atribuye traducciones al códice; toda comparación requiere cotejo filológico.";
 $("toc-help").textContent=sourceCoverage||declaredAlignment;
 const u=new URL(location.href);u.searchParams.set("lang",language);history.replaceState(null,"",u);
 renderToc();
 const locus=p.get("locus")||new URLSearchParams(location.search).get("locus");
 const at=data.passages.findIndex(x=>x.locus===locus);
 const chosen=at>=0?at:0;setQuery(p.get("q")||input.value||"");
 if(search){renderSearch();const first=results[0]?.i;select(at>=0?at:Number.isInteger(first)?first:chosen)}
 else{renderSearch();select(chosen)}
 if(window.parent!==window)window.parent.postMessage({type:"vitruvia-parallel-ready",work,lang:language,count:data.passages.length},"*");
}
async function swap(lang){try{await load(lang)}catch(err){console.error("Classics reader failed to load",work,lang,err);$("source-title").textContent=err.message;data=null;$("passages").textContent="No se puede mostrar esta traducción sin un archivo local acreditado."}}
const setTitle=t=>{$("work-title").textContent=t;document.title=t+" · Bibliotheca Graeca et Latina"};if(allowed[work])setTitle(allowed[work]);$("codex-link").href="bibliotheca-graeca-latina.html?work="+work+"&view=triplecodex";
$("language").addEventListener("change",e=>swap(e.target.value));
$("find").addEventListener("click",()=>{if(!data)return;setQuery(input.value);resultPage=0;renderSearch();if(results.length)select(results[0].i)});
/* Same-origin parallel study: independent literal queries and amber highlights. */
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window.parent===window)return;
 const cmd=event.data;
 if(!cmd||cmd.type!=="vitruvia-parallel-find"||cmd.work!==work||cmd.lang!==data?.language||typeof cmd.query!=="string")return;
 setQuery(cmd.query.slice(0,120));resultPage=0;renderSearch();
 if(results.length)select(results[0].i);else select(active);
 window.parent.postMessage({type:"vitruvia-parallel-search-result",work,lang:data.language,sections:results.length},location.origin);
});
input.addEventListener("keydown",e=>{if(e.key==="Enter"){$("find").click()}});
$("hit-prev")?.addEventListener("click",()=>focusHit(-1));$("hit-next")?.addEventListener("click",()=>focusHit(1));
$("clear").addEventListener("click",()=>{setQuery("");resultPage=0;renderSearch();if(data)select(active)});
$("print").addEventListener("click",()=>window.print());
// Apariencia funcional: variables CSS compartidas por lector independiente y panel comparado.
const READER_STYLE_KEY="vitruvia.classic.appearance.v3."+work;
const OLD_COLOR_KEY="vitruvia.classic.colors."+work;
const APPEARANCE_DEFAULTS=Object.freeze({background:"#000000",foreground:"#e2e2e3",font:"serif",size:20,italic:false,align:"justify"});
const appearance={...APPEARANCE_DEFAULTS};
const validHex=x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x);
const invertHex=x=>"#"+[1,3,5].map(i=>(255-parseInt(x.slice(i,i+2),16)).toString(16).padStart(2,"0")).join("");
function validAppearance(obj){
 if(!obj||typeof obj!=="object")return;
 if(validHex(obj.background))appearance.background=obj.background;
 if(validHex(obj.foreground))appearance.foreground=obj.foreground;
 if(Object.hasOwn(PARALLEL_FONTS,obj.font))appearance.font=obj.font;
 if(Number.isInteger(obj.size)&&obj.size>=14&&obj.size<=38)appearance.size=obj.size;
 if(typeof obj.italic==="boolean")appearance.italic=obj.italic;
 if(["justify","left"].includes(obj.align))appearance.align=obj.align;
}
function paintAppearance(persist=true){
 const reader=document.querySelector(".reader");
 if(!reader)return;
 const vars={
  "--reader-bg":appearance.background,"--reader-fg":appearance.foreground,
  "--reader-font":PARALLEL_FONTS[appearance.font],"--reader-size":appearance.size+"px",
  "--reader-italic":appearance.italic?"italic":"normal","--reader-align":appearance.align
 };
 for(const [key,value] of Object.entries(vars))reader.style.setProperty(key,value);
 $("reader-bg").value=appearance.background;$("reader-fg").value=appearance.foreground;
 $("reader-font").value=appearance.font;$("reader-size").textContent=appearance.size+" px";
 $("reader-italic").setAttribute("aria-pressed",String(appearance.italic));
 $("reader-align").setAttribute("aria-pressed",String(appearance.align==="justify"));
 $("reader-align").textContent=appearance.align==="justify"?"Justificado":"Alineado a izquierda";
 if(persist)try{localStorage.setItem(READER_STYLE_KEY,JSON.stringify(appearance))}catch{}
}
function applyParentAppearance(cmd){
 // La barra del lector paralelo controla únicamente el panel correspondiente.
 if(validHex(cmd.background))appearance.background=cmd.background;
 if(validHex(cmd.foreground))appearance.foreground=cmd.foreground;
 if(Object.hasOwn(PARALLEL_FONTS,cmd.font))appearance.font=cmd.font;
 if(Number.isInteger(cmd.size)&&cmd.size>=14&&cmd.size<=38)appearance.size=cmd.size;
 paintAppearance(false);
}
try{
 const saved=JSON.parse(localStorage.getItem(READER_STYLE_KEY)||"null");
 if(saved)validAppearance(saved);
 else{
  const legacy=JSON.parse(localStorage.getItem(OLD_COLOR_KEY)||"null");
  if(legacy)validAppearance({background:legacy.bg,foreground:legacy.fg});
 }
}catch{}
if(p.get("parallel")==="1")document.documentElement.dataset.parallelView="true";
paintAppearance(false);
for(const [id,bg,fg] of [
 ["reader-ivory","#fffdf7","#202b35"],["reader-sepia","#e6d5b7","#463526"],["reader-night","#000000","#e2e2e3"]
]){
 $(id).addEventListener("click",()=>{appearance.background=bg;appearance.foreground=fg;paintAppearance()});
}
$("reader-invert").addEventListener("click",()=>{
 appearance.background=invertHex(appearance.background);appearance.foreground=invertHex(appearance.foreground);paintAppearance();
});
$("reader-bg").addEventListener("input",e=>{if(validHex(e.target.value)){appearance.background=e.target.value;paintAppearance()}});
$("reader-fg").addEventListener("input",e=>{if(validHex(e.target.value)){appearance.foreground=e.target.value;paintAppearance()}});
$("reader-font").addEventListener("change",e=>{if(Object.hasOwn(PARALLEL_FONTS,e.target.value)){appearance.font=e.target.value;paintAppearance()}});
$("reader-smaller").addEventListener("click",()=>{appearance.size=Math.max(14,appearance.size-2);paintAppearance()});
$("reader-larger").addEventListener("click",()=>{appearance.size=Math.min(38,appearance.size+2);paintAppearance()});
$("reader-italic").addEventListener("click",()=>{appearance.italic=!appearance.italic;paintAppearance()});
$("reader-align").addEventListener("click",()=>{appearance.align=appearance.align==="justify"?"left":"justify";paintAppearance()});
$("reader-reset").addEventListener("click",()=>{Object.assign(appearance,APPEARANCE_DEFAULTS);paintAppearance()});

$("prev").addEventListener("click",()=>select(active-1));$("next").addEventListener("click",()=>select(active+1));
(async()=>{
 try{
  const catalog=await(await fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json")).json();
  const record=(catalog.works||[]).find(x=>x.id===work);
  // The search registry is the canonical list of hosted, searchable JSON editions.
  // The bibliographic catalogue may lag behind, notably with partial translations.
  const registry=await fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro editorial no disponible");return r.json()});
  // El registro editorial, no una lista fija de obras, decide qué ediciones se pueden enfrentar.
  const hosted=(registry.entries||[]).filter(e=>e.workId===work&&
   ["json-passages","structured-bilingual"].includes(e.format)&&
   ["grc","la","es","en","fr","it","de","pt"].includes(e.language)&&
   /^data\/(?:classics-corpus|structured|lexicon\/fontes)\/[a-z0-9/_-]+\.json$/.test(e.path||""));
  if(!hosted.length)throw Error("Esta obra no tiene una edición JSON disponible para este lector.");
   hostedEditions=hosted;
  if(!allowed[work])setTitle((record?.author||hosted[0].author)+" · "+(record?.title||hosted[0].title));
  const available=new Set(hosted.map(e=>e.language));
  for(const o of [...langSelect.options])if(!available.has(o.value))o.remove();
  if(![...langSelect.options].some(o=>o.value===p.get("lang")))langSelect.value=available.has("grc")?"grc":available.has("la")?"la":langSelect.options[0]?.value||"en";
  else langSelect.value=p.get("lang");
  await swap(langSelect.value);
 }catch(err){$("source-title").textContent=err.message;$("method-note").textContent="Se conserva el acceso al códice de la institución; no se publica aquí un texto latino incompleto."}
})();
})();