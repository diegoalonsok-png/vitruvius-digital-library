/* Citable Greek/Latin classical editor, not manuscript OCR or guaranteed morphosyntax. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const p=new URLSearchParams(location.search),work=p.get("work")||"apuleius-metamorphoses";
const allowed={"apuleius-metamorphoses":"Apuleyo · Metamorphoses (Asinus aureus)","petronius-satyrica":"Petronio · Satyrica / Satyricon","theophrastus-characters":"Teofrasto · Ἠθικοὶ χαρακτῆρες (Caracteres)"};
const LEX=window.ClassicalLexicon;
if(!/^[a-z0-9-]{3,60}$/.test(work)){$("source-title").textContent="Obra no identificada en este lector";return}
const base="data/classics-corpus/"+work+"-";
const langSelect=$("language"),input=$("query");let data,active=0,results=[],search="";
/* A trusted same-origin parallel reader may request ordinal passage navigation.
   Does not infer lexical/critical alignment across editions. */
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window.parent===window)return;
 const cmd=event.data;
 if(!cmd||cmd.type!=="vitruvia-parallel-goto"||cmd.work!==work||cmd.lang!==data?.language)return;
 if(!Number.isInteger(cmd.index)||cmd.index<0||cmd.index>=data.passages.length)return;
 select(cmd.index);
});

/* Appearance controls supplied by the same-origin twin reader; editorial text is unchanged. */
const PARALLEL_FONTS={serif:'Georgia, "Times New Roman", serif',sans:'system-ui, sans-serif',mono:'ui-monospace, monospace',classic:'"Palatino Linotype", "Book Antiqua", Palatino, serif'};
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window.parent===window)return;
 const cmd=event.data;
 if(!cmd||cmd.type!=="vitruvia-parallel-style"||cmd.work!==work||cmd.lang!==data?.language)return;
 const validColor=x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x);
 const reader=document.querySelector(".reader"),passages=$("passages");
 if(!reader||!passages)return;
 if(validColor(cmd.background)){reader.style.background=cmd.background;passages.style.background=cmd.background;}
 if(validColor(cmd.foreground)){reader.style.color=cmd.foreground;passages.style.color=cmd.foreground;}
 if(Object.hasOwn(PARALLEL_FONTS,cmd.font))passages.style.fontFamily=PARALLEL_FONTS[cmd.font];
 if(Number.isFinite(cmd.size)&&cmd.size>=14&&cmd.size<=38)passages.style.fontSize=cmd.size+"px";
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
 if(LEX)return LEX.highlightInto(target,text,q);
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
function renderToc(){
 const target=$("toc");target.replaceChildren();
 data.passages.forEach((v,i)=>{
  const li=document.createElement("li"),btn=document.createElement("button");btn.type="button";
  btn.textContent=(data.language==="la"?"§ ":"")+v.locus+(v.title?" · "+v.title:"");if(v.title)btn.lang=data.language;
  btn.setAttribute("aria-current",String(i===active));btn.addEventListener("click",()=>select(i));
  li.append(btn);target.append(li);
 });
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
 const nav=$("hit-nav");if(nav){nav.hidden=!hitMarks.length;$("hit-count").textContent=hitMarks.length?hitMarks.length+" en este pasaje":"";}
 if(hitMarks.length)requestAnimationFrame(()=>focusHit(1));
 for(const [j,btn] of Array.from($("toc").querySelectorAll("button")).entries())btn.setAttribute("aria-current",String(j===active));
 const u=new URL(location.href);u.searchParams.set("locus",rec.locus);if(search)u.searchParams.set("q",search);else u.searchParams.delete("q");history.replaceState(null,"",u);
}
function renderSearch(){
 const target=$("results");target.replaceChildren();
 if(!search){target.textContent="Ingresa una palabra o frase para localizar coincidencias en esta edición.";return}
 results=data.passages.map((r,i)=>({i,r})).filter(x=>match(x.r.text,search,true));
 const lead=document.createElement("strong");
 lead.textContent=results.length+" coincidencias de sección · búsqueda literal + expansión léxica experimental";
 target.append(lead);
 results.slice(0,45).forEach(({i,r})=>{
  const a=document.createElement("a");a.href="#passages";const n=LEX?LEX.find(r.text,search).length:0;a.textContent="§ "+r.locus+(n?" ("+n+")":"");
  a.addEventListener("click",e=>{e.preventDefault();select(i);$("passages").scrollIntoView({block:"start",behavior:"smooth"})});
  target.append(a);
 });
 if(results.length>45)target.append(document.createTextNode("… "+(results.length-45)+" más"));
 if(!results.length)target.append(document.createTextNode(" · No se encontraron coincidencias en el texto editado. Esto no equivale a búsqueda OCR del códice."));
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
 const path=base+language+".json",response=await fetch(path);
 if(!response.ok)throw Error("Edición todavía no incorporada: "+language+" · HTTP "+response.status);
 let corpus=await response.json();
 if(corpus.workId!==work||corpus.language!==language||!Array.isArray(corpus.passages)||(corpus.passages.length<(work==="sulpicia-elegiae"?6:10)))throw Error("El documento no pasó validación de integridad");
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
 $("method-note").textContent=corpus.editorialStatus+". "+corpus.alignment+". Fuente y atribución: "+corpus.attribution;
 $("attribution").textContent=(corpus.chicago18Bibliography?"Referencia bibliográfica (Chicago, 18.ª ed.): "+corpus.chicago18Bibliography+" · ":"")+corpus.source+" · "+corpus.license+" · La biblioteca no atribuye traducciones al códice; toda comparación requiere cotejo filológico.";
 $("toc-help").textContent=corpus.alignment;
 const u=new URL(location.href);u.searchParams.set("lang",language);history.replaceState(null,"",u);
 renderToc();
 const locus=p.get("locus")||new URLSearchParams(location.search).get("locus");
 const at=data.passages.findIndex(x=>x.locus===locus);
 const chosen=at>=0?at:0;setQuery(p.get("q")||input.value||"");
 if(search){renderSearch();const first=data.passages.findIndex(x=>match(x.text,search,true));select(at>=0?at:first>=0?first:chosen)}
 else{renderSearch();select(chosen)}
 if(window.parent!==window)window.parent.postMessage({type:"vitruvia-parallel-ready",work,lang:language,count:data.passages.length},"*");
}
async function swap(lang){try{await load(lang)}catch(err){console.error("Classics reader failed to load",work,lang,err);$("source-title").textContent=err.message;data=null;$("passages").textContent="No se puede mostrar esta traducción sin un archivo local acreditado."}}
const setTitle=t=>{$("work-title").textContent=t;document.title=t+" · Bibliotheca Graeca et Latina"};if(allowed[work])setTitle(allowed[work]);$("codex-link").href="bibliotheca-graeca-latina.html?work="+work+"&view=triplecodex";
$("language").addEventListener("change",e=>swap(e.target.value));
$("find").addEventListener("click",()=>{if(!data)return;setQuery(input.value);renderSearch();if(results.length)select(results[0].i)});
input.addEventListener("keydown",e=>{if(e.key==="Enter"){$("find").click()}});
$("hit-prev")?.addEventListener("click",()=>focusHit(-1));$("hit-next")?.addEventListener("click",()=>focusHit(1));
$("clear").addEventListener("click",()=>{setQuery("");renderSearch();if(data)select(active)});
$("print").addEventListener("click",()=>window.print());
$("theme").addEventListener("click",()=>{const html=document.documentElement;html.dataset.theme=html.dataset.theme==="dark"?"light":"dark"});

const COLOR_KEY="vitruvia.classic.colors."+work;
const invertHex=hex=>"#"+[1,3,5].map(i=>(255-parseInt(hex.slice(i,i+2),16)).toString(16).padStart(2,"0")).join("");
function colors(bg,fg){
 const valid=x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x);
 if(!valid(bg)||!valid(fg))return;
 $("reader-bg").value=bg;$("reader-fg").value=fg;
 const pane=document.querySelector(".reader"),text=$("passages");
 if(pane)pane.style.background=bg;
 if(text){text.style.background=bg;text.style.color=fg;}
 try{localStorage.setItem(COLOR_KEY,JSON.stringify({bg,fg}));}catch{}
}
try{
 const saved=JSON.parse(localStorage.getItem(COLOR_KEY)||"null");
 if(saved)colors(saved.bg,saved.fg);
}catch{}
for(const id of ["reader-bg","reader-fg"])$(id)?.addEventListener("input",()=>colors($("reader-bg").value,$("reader-fg").value));
$("reader-invert")?.addEventListener("click",()=>colors(invertHex($("reader-bg").value),invertHex($("reader-fg").value)));

$("prev").addEventListener("click",()=>select(active-1));$("next").addEventListener("click",()=>select(active+1));
(async()=>{
 try{
  const catalog=await(await fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json")).json();
  const record=(catalog.works||[]).find(x=>x.id===work);
  // The search registry is the canonical list of hosted, searchable JSON editions.
  // The bibliographic catalogue may lag behind, notably with partial translations.
  const registry=await fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro editorial no disponible");return r.json()});
  const hosted=(registry.entries||[]).filter(e=>e.workId===work&&e.format==="json-passages"&&e.path==="data/classics-corpus/"+work+"-"+e.language+".json");
  if(!hosted.length)throw Error("Esta obra no tiene una edición JSON disponible para este lector.");
  if(!allowed[work])setTitle((record?.author||hosted[0].author)+" · "+(record?.title||hosted[0].title));
  const available=new Set(hosted.map(e=>e.language));
  for(const o of [...langSelect.options])if(!available.has(o.value))o.remove();
  if(![...langSelect.options].some(o=>o.value===p.get("lang")))langSelect.value=available.has("grc")?"grc":available.has("la")?"la":langSelect.options[0]?.value||"en";
  else langSelect.value=p.get("lang");
  await swap(langSelect.value);
 }catch(err){$("source-title").textContent=err.message;$("method-note").textContent="Se conserva el acceso al códice de la institución; no se publica aquí un texto latino incompleto."}
})();
})();