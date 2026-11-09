/* Capitula: synchronized by attested editorial chapter labels, never by guessed
   translation equivalences. Source files stay immutable; no external API. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const LANG={la:"Latín",grc:"Griego antiguo",en:"Inglés",es:"Castellano",fr:"Francés",it:"Italiano",de:"Alemán",pt:"Portugués"};
const ORIGINAL=new Set(["la","grc"]);
const CACHE=new Map();
let editions=[],catalog=[],work="",current=null,token=0;
const messages=$("status");
const safeJson=async path=>{const r=await fetch(path);if(!r.ok)throw Error("Archivo no disponible: "+path);return r.json()};
const get=path=>{if(!CACHE.has(path))CACHE.set(path,fetch(path).then(r=>{if(!r.ok)throw Error("HTTP "+r.status+": "+path);return r.text()}).catch(e=>{CACHE.delete(path);throw e}));return CACHE.get(path)};
function sectionOf(locus){
 const s=String(locus||"").trim();
 // A bibliographic locator is not a verified translation alignment.
 // Preserve actual book + chapter when given (Caesar 1.1, Vitruvius 1.1.1).
 let m=s.match(/^(\d+)\.(\d+)\.(\d+)(?:\D|$)/);if(m)return m[1]+"."+m[2];
 m=s.match(/^(\d+)\.(\d+)-\d+$/);if(m)return m[1]; // Verse ranges: book only.
 m=s.match(/^(\d+)\.(\d+)$/);if(m)return m[1]+"."+m[2];
 m=s.match(/^(\d+)$/);if(m)return m[1];
 m=s.match(/^translation-tei-chapter-(\d+)$/);if(m)return m[1];
 m=s.match(/^book[-_. ](\d+)[-_. ]chapter[-_. ](\d+)$/i);if(m)return m[1]+"."+m[2];
 // Partial verse ranges or unmatched TEI segments are NOT chapter-loci.
 return "segmento:"+s;
}
function chapterSort(a,b){
 const al=a.split(".").map(Number),bl=b.split(".").map(Number);
 if(!a.startsWith("segmento:")&&!b.startsWith("segmento:")&&al.every(Number.isFinite)&&bl.every(Number.isFinite)){
  for(let i=0;i<Math.max(al.length,bl.length);i++){const x=(al[i]??-1)-(bl[i]??-1);if(x)return x}return 0;
 }
 return a.localeCompare(b,undefined,{numeric:true});
}
function chapterize(passages){
 const groups=new Map();
 for(const p of passages){const key=sectionOf(p.locus);if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(p);
 }
 return new Map([...groups].sort(([a],[b])=>chapterSort(a,b)));
}
function formatChapter(key){
 if(key.startsWith("segmento:"))return "Unidad "+key.slice(9);
 if(key.includes("."))return "Libro / capítulo "+key;
 return "Capítulo / sección "+key;
}
function selectOptions(select,items,active){
 select.replaceChildren();
 for(const [value,label] of items)select.add(new Option(label,value));
 select.disabled=items.length<2;
 if(items.some(([value])=>value===active))select.value=active;
}
async function load(e){
 const raw=await get(e.path),fmt=e.format;
 if(fmt==="json-passages"||fmt==="structured-bilingual"){
  const j=JSON.parse(raw);
  if(fmt==="json-passages"&&(j.workId!==e.workId||j.language!==e.language||!Array.isArray(j.passages)))throw Error("Edición JSON no corresponde al registro");
  if(fmt==="structured-bilingual"&&(j.edition!==e.edition||!Array.isArray(j.passages)))throw Error("Edición estructurada no corresponde al registro");
  const field=fmt==="structured-bilingual"?(e.language==="la"?"latin":"translation"):"text";
  return {passages:j.passages.filter(p=>typeof p[field]==="string"&&p[field].trim()).map(p=>({
   locus:String(p.locus||""),text:p[field]})),attribution:j.attribution||j.chicago18Bibliography||e.sourceDescription||j.source?.url||e.path,
   alignment:j.alignment||"",unaligned:j.alignmentStatus==="unaligned"};
 }
 if(fmt==="html-text"){
  const doc=new DOMParser().parseFromString(raw,"text/html");
  doc.querySelectorAll("script,style,nav,header,footer,aside,.apparatus,.note").forEach(n=>n.remove());
  let nodes=[...doc.querySelectorAll("main p,main blockquote,main pre")];
  if(!nodes.length)nodes=[...doc.querySelectorAll("body p,body blockquote,body pre")];
  return {passages:nodes.map((node,i)=>({locus:node.closest("article[id],section[id]")?.id||"html-"+(i+1),
   text:(node.textContent||"").replace(/\s+/g," ").trim()})).filter(p=>p.text.length>25),
   attribution:e.sourceDescription||e.path,alignment:"Sin numeración común de capítulos certificada.",unaligned:true};
 }
 throw Error("Formato no admitido para sincronización: "+fmt);
}
function human(e){return (LANG[e.language]||e.language)+(e.edition?" · "+e.edition:"")+" · "+e.path.split("/").at(-1)}
function updateLink(){
 const u=new URL(location.href);u.searchParams.set("work",work);history.replaceState(null,"",u);
}
function titleById(){return catalog.find(w=>w.id===work)}
function rowItems(e){return e?[[e.path+"|"+e.language,human(e)]]:[]}
function fillVersions(){
 const versions=editions.filter(e=>e.workId===work&&["json-passages","structured-bilingual","html-text"].includes(e.format));
 const orig=versions.filter(e=>ORIGINAL.has(e.language));
 const trans=versions.filter(e=>!ORIGINAL.has(e.language));
 selectOptions($("left-version"),orig.map(e=>[keyOf(e),human(e)]),orig.find(e=>e.language==="grc")?keyOf(orig.find(e=>e.language==="grc")):keyOf(orig[0]));
 selectOptions($("right-version"),trans.map(e=>[keyOf(e),human(e)]),trans.find(e=>e.language==="es")?keyOf(trans.find(e=>e.language==="es")):keyOf(trans[0]));
 $("left-version").disabled=orig.length<2;
 $("right-version").disabled=trans.length<2;
 return orig.length&&trans.length;
}
function keyOf(e){return [e.workId,e.language,e.path,e.edition||""].join("|")}
function editionFor(value){return editions.find(e=>keyOf(e)===value)}
const slug=v=>String(v||"").replace(/[^\p{L}\p{N}.:_-]+/gu,"_");
const GREEK_RUN=/[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͯ··’\s,;.·]*[Ͱ-Ͽἀ-῿]|[Ͱ-Ͽἀ-῿]/g;
function workMeta(){return titleById()||{}}
/* Chicago 18 style passage citation built only from recorded data: author, title, locus, version label,
   source attribution as stored, permanent URL and consultation date. Nothing is invented. */
function citeFor(source,p){
 const w=workMeta();const e=source.edition;
 const parts=[[w.author||e.author,w.title||e.title].filter(Boolean).join(". ")];
 if(p.locus)parts.push(p.locus);
 const attribution=(source.data.attribution||e.sourceDescription||"").trim();
 if(attribution)parts.push(attribution);
 const u=new URL("bibliotheca-capitula.html",location.href);u.searchParams.set("work",work);if(p.locus)u.searchParams.set("locus",p.locus);u.searchParams.set("side",source.side);
 parts.push(u.href);
 parts.push((({es:"Consultado el ",en:"Accessed ",fr:"Consulté le "})[document.documentElement.lang]||"Consultado el ")+new Date().toISOString().slice(0,10));
 return parts.join(". ").replace(/\.\./g,".");
}
function wrapGreek(node,text){
 let at=0,m;GREEK_RUN.lastIndex=0;
 while((m=GREEK_RUN.exec(text))){
  if(m.index>at)node.append(text.slice(at,m.index));
  const g=document.createElement("span");g.lang="grc";g.textContent=m[0];node.append(g);at=m.index+m[0].length;
 }
 if(at<text.length)node.append(text.slice(at));
}
function readable(id,source,groups,selected){
 const target=$(id+"-text");target.replaceChildren();
 const title=$(id+"-title"),meta=$(id+"-source");
 title.textContent=LANG[source.edition.language]||source.edition.language;
 meta.textContent=source.data.attribution||source.edition.sourceDescription||source.edition.path;
 source.side=id;
 const items=groups.get(selected)||[];
 if(!items.length){target.textContent="Esta versión no tiene pasajes identificados en la unidad elegida.";return}
 const fragment=document.createDocumentFragment();
 for(const p of items){const wrapper=document.createElement("p");
  const lang=source.edition.language==="grc"?"grc":source.edition.language;wrapper.lang=lang;
  if(p.locus){wrapper.id=id+"-"+slug(p.locus);wrapper.dataset.locus=p.locus}
  const loc=document.createElement("span");loc.className="locus";
  const anchor=document.createElement("a");anchor.className="locus-anchor";anchor.textContent=p.locus||"Unidad editorial sin referencia";
  anchor.title=({es:"Enlace permanente a este pasaje",en:"Permanent link to this passage",fr:"Lien permanent vers ce passage"})[document.documentElement.lang]||"Enlace permanente a este pasaje";
  const u=new URL(location.href);u.searchParams.set("work",work);if(p.locus)u.searchParams.set("locus",p.locus);u.searchParams.set("side",id);anchor.href=u.href;
  const cite=document.createElement("button");cite.type="button";cite.className="locus-cite";cite.textContent=({es:"Citar",en:"Cite",fr:"Citer"})[document.documentElement.lang]||"Citar";
  cite.addEventListener("click",()=>{const c=citeFor(source,p);navigator.clipboard?.writeText(c).then(()=>{cite.textContent="✓";setTimeout(()=>cite.textContent=({es:"Citar",en:"Cite",fr:"Citer"})[document.documentElement.lang]||"Citar",1400)}).catch(()=>window.prompt("Cita",c))});
  loc.append(anchor," ",cite);
  wrapper.append(loc);
  if(lang==="la"||lang==="grc")wrapGreek(wrapper,p.text);else wrapper.append(document.createTextNode(p.text));
  fragment.append(wrapper);
 }
 target.append(fragment);target.scrollTop=0;
 pairHighlights();
}
/* Hover pairing: paragraphs with the same recorded locus on both sides light up together.
   Only exact locus identity is paired; nothing is aligned by position. */
function pairHighlights(){
 const panes=document.querySelector(".panes");if(!panes||panes.dataset.paired)return;panes.dataset.paired="1";
 const find=(side,locus)=>document.querySelector("#"+side+"-text p[data-locus=\""+CSS.escape(locus)+"\"]");
 panes.addEventListener("mouseover",e=>{const p=e.target.closest("p[data-locus]");if(!p)return;const other=p.closest("#left-text")?"right":"left";const twin=find(other,p.dataset.locus);
  document.querySelectorAll(".passages p.paired").forEach(x=>x.classList.remove("paired"));if(twin){p.classList.add("paired");twin.classList.add("paired")}});
 panes.addEventListener("mouseleave",()=>document.querySelectorAll(".passages p.paired").forEach(x=>x.classList.remove("paired")),true);
 panes.addEventListener("dblclick",e=>{
  const p=e.target.closest("p[lang]");if(!p||!["la","grc"].includes(p.lang))return;
  const word=String(window.getSelection?.()||"").trim().split(/\s+/)[0]?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,"");
  if(!word)return;const u=new URL("vitruvia-lexicon.html",location.href);u.searchParams.set("q",word);u.searchParams.set("mode","palabra");window.open(u.href,"_blank","noopener");
 });
}
function revealLocus(){
 const params=new URLSearchParams(location.search),locus=params.get("locus");if(!locus||!current)return false;
 const side=params.get("side")==="right"?"right":"left";
 const key=sectionOf(locus);
 if(current.shared?.includes(key))render(key);else if(current[side].groups.has(key))sideChapter(side,key);
 const target=document.getElementById(side+"-"+slug(locus))||document.querySelector("#"+side+"-text p[data-locus=\""+CSS.escape(locus)+"\"]");
 if(!target)return false;
 target.classList.add("target-locus");target.scrollIntoView({block:"center"});
 return true;
}
function sideChapter(side,selected){
 if(!current)return;
 const source=current[side],groups=source.groups;
 if(!groups.has(selected))selected=[...groups.keys()][0];
 source.selected=selected;
 const opts=[...groups.keys()].map(key=>[key,formatChapter(key)]);
 selectOptions($(side+"-chapter"),opts,selected);
 readable(side,source,groups,selected);
}
function render(sharedKey){
 if(!current)return;
 const left=current.left,right=current.right;
 const commons=[...left.groups.keys()].filter(k=>!k.startsWith("segmento:")&&right.groups.has(k)).sort(chapterSort);
 const both=commons.length>0;
 current.shared=commons;
 $("chapterbar").hidden=!both;
 if(both){
  const key=commons.includes(sharedKey)?sharedKey:commons[0];
  selectOptions($("chapter"),commons.map(k=>[k,formatChapter(k)]),key);
  const idx=commons.indexOf(key);
  $("prev").disabled=idx===0;$("next").disabled=idx===commons.length-1;
  sideChapter("left",key);sideChapter("right",key);
  messages.textContent="Sincronización editorial por "+commons.length+" rótulos comunes de capítulo o sección. No demuestra alineación textual exacta, recensio idéntica ni cotejo de traducción.";
 }else{
  sideChapter("left",left.selected);
  sideChapter("right",right.selected);
  messages.textContent="Las versiones no comparten referencias de capítulo verificables. Se conservan todas sus unidades y cada columna se navega independientemente.";
 }
}
async function chooseWork(){
 work=$("work").value;const id=++token;
 updateLink();
 if(!fillVersions()){messages.textContent="Falta original o traducción textual indexada para esta obra.";return}
 await loadPair(id);
}
async function loadPair(id=++token){
 const l=editionFor($("left-version").value),r=editionFor($("right-version").value);
 if(!l||!r){messages.textContent="No hay dos versiones textuales disponibles.";return}
 messages.textContent="Cargando textos indexados…";$("chapterbar").hidden=true;
 try{
  const [ld,rd]=await Promise.all([load(l),load(r)]);
  if(id!==token)return;
  if(!ld.passages.length||!rd.passages.length)throw Error("La versión carece de pasajes legibles");
  current={left:{edition:l,data:ld,groups:chapterize(ld.passages),selected:""},
           right:{edition:r,data:rd,groups:chapterize(rd.passages),selected:""},shared:[]};
  render();
 }catch(e){if(id!==token)return;current=null;messages.textContent="No se pudo leer esta pareja de versiones: "+e.message}
}
$("work").addEventListener("change",chooseWork);
$("left-version").addEventListener("change",()=>loadPair());
$("right-version").addEventListener("change",()=>loadPair());
$("chapter").addEventListener("change",()=>render($("chapter").value));
$("prev").addEventListener("click",()=>{const i=current?.shared.indexOf($("chapter").value)??-1;if(i>0)render(current.shared[i-1])});
$("next").addEventListener("click",()=>{const i=current?.shared.indexOf($("chapter").value)??-1;if(current&&i>=0&&i<current.shared.length-1)render(current.shared[i+1])});
for(const side of ["left","right"])$(side+"-chapter").addEventListener("change",()=>{
 if(!current)return;
 // Browsing one independent version does not force a false translation match.
 const selected=$(side+"-chapter").value;
 sideChapter(side,selected);
 if(current.shared?.length)messages.textContent="Navegación independiente en "+(side==="left"?"original":"traducción")+". Para volver a capítulos comunes, utiliza la barra superior.";
});
(async()=>{
 try{
  const [registry,c]=await Promise.all([safeJson("data/classics-corpus/search-registry.json"),safeJson("data/bibliotheca-graeca-latina-I-bce-I-ce.json")]);
  if(!Array.isArray(registry.entries)||!Array.isArray(c.works))throw Error("Índice editorial inválido");
  editions=registry.entries.filter(e=>["json-passages","structured-bilingual","html-text"].includes(e.format));
  catalog=c.works;
  const eligible=catalog.filter(w=>{const v=editions.filter(e=>e.workId===w.id);return v.some(e=>ORIGINAL.has(e.language))&&v.some(e=>!ORIGINAL.has(e.language))});
  const selected=new URLSearchParams(location.search).get("work");
  const works=eligible.sort((a,b)=>String(a.title).localeCompare(String(b.title),"es")).map(w=>[w.id,w.author+" · "+w.title]);
  selectOptions($("work"),works,works.some(([id])=>id===selected)?selected:(works[0]?.[0]||""));
  $("work").disabled=works.length<2;
  if(!works.length){messages.textContent="No hay parejas de versiones indexadas.";return}
  await chooseWork();
  if(new URLSearchParams(location.search).get("locus")&&!revealLocus())messages.textContent+=" · El locus solicitado no está entre los pasajes indexados de esta versión.";
 }catch(e){messages.textContent="No se pudo verificar el índice de Bibliotheca: "+e.message}
})();
})();