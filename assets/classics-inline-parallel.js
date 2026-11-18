/* In-place original/translation reader. Indexed translations take precedence.
 * English is preloaded by default. Machine fallback is always marked provisional,
 * and neither the original nor editorial metadata is overwritten. */
(()=>{"use strict";
const article=document.querySelector(".reader");
const passages=document.getElementById("passages");
const lexicon=document.getElementById("lexicon");
const hitnav=document.getElementById("hit-nav");
if(!article||!passages||!lexicon)return;
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const work=new URLSearchParams(location.search).get("work")||"classics";
const key="vdl:classics:split:"+work;
const root=el("div","cl-dual-reader"),original=el("section","cl-source-column"),translation=el("section","cl-translation-column");
root.setAttribute("aria-label","Texto original y traducción automática");
original.setAttribute("aria-label","Texto griego o latino original");
translation.setAttribute("aria-label","Traducción automática orientativa");
const originalHeading=el("p","cl-pane-title","Texto original");
original.prepend(originalHeading);
if(hitnav)original.append(hitnav);
original.append(passages,lexicon);
const separator=el("div","cl-pane-splitter");
separator.tabIndex=0;separator.role="separator";separator.setAttribute("aria-label","Arrastrar para modificar el ancho de los dos lectores");
separator.setAttribute("aria-orientation","vertical");separator.setAttribute("aria-valuemin","25");separator.setAttribute("aria-valuemax","75");
const translationHeading=el("p","cl-pane-title","Traducción");
const controls=el("div","cl-translation-tools");
const languageLabel=el("label",null,"Idioma ");
const select=el("select");
select.setAttribute("aria-label","Idioma de la traducción");select.dataset.contentLanguage="true";
for(const [value,name] of [["en","Inglés"],["es","Castellano"],["fr","Francés"]]){
 const o=el("option",null,name);o.value=value;select.append(o);
}
select.value=["es","en","fr"].includes(new URLSearchParams(location.search).get("to"))
 ?new URLSearchParams(location.search).get("to"):"en";
languageLabel.append(select);
const translate=el("button",null,"Activar traducción automática");
translate.type="button";
translate.title="Traducir el pasaje y los siguientes al navegar. El texto se enviará al servicio externo cuando sea necesario.";
const stop=el("button",null,"Detener");
stop.type="button";stop.hidden=true;
const smaller=el("button",null,"A−"),larger=el("button",null,"A+");
smaller.type=larger.type="button";
smaller.setAttribute("aria-label","Reducir letra de traducción");
larger.setAttribute("aria-label","Aumentar letra de traducción");
controls.append(languageLabel,translate,stop,smaller,larger);
const label=el("p","cl-translation-label","Pasaje seleccionado");
const output=el("div","cl-translation-output","Preparando la traducción inglesa del pasaje…");
output.setAttribute("role","status");output.setAttribute("aria-live","polite");
const note=el("p","cl-translation-meta","Se priorizan las traducciones publicadas. Si no existe una edición para el locus, se solicita una traducción automática orientativa a un proveedor externo; el original permanece intacto.");
translation.append(translationHeading,controls,label,output,note);
root.append(original,separator,translation);
const layout=el("div","cl-edition-layout");
const orderButton=el("button",null,"⇄ Intercambiar columnas");orderButton.type="button";orderButton.setAttribute("aria-pressed","false");
orderButton.setAttribute("aria-label","Cambiar de lugar el latín o griego y la traducción");
orderButton.title="Mover el texto original a la derecha o devolverlo a la izquierda sin cambiar el locus.";
const published=el("a",null,"Traducciones publicadas ↗");published.href="classics-parallel-reader.html?work="+encodeURIComponent(work);
layout.append(orderButton,published);article.append(layout,root);
// Conventional arrangement: source (Latin or Greek) left, translation right.
root.classList.remove("translation-first");
orderButton.addEventListener("click",()=>{
 const reversed=root.classList.toggle("translation-first");
 orderButton.setAttribute("aria-pressed",String(reversed));
 orderButton.textContent=reversed?"⇄ Original a la izquierda":"⇄ Intercambiar columnas";
 orderButton.setAttribute("aria-label",reversed?"Mover el texto original a la izquierda":"Mover el texto original a la derecha");
 setWidth(width);
});
const modeRow=el("label","cl-pane-options","Lectura enfrentada "),mode=el("select");mode.setAttribute("aria-label","Contenido de la lectura enfrentada");
for(const [value,name] of [["translation","Traducción en paralelo"],["pdf","PDF de lectura enfrentada"]]){const o=el("option",null,name);o.value=value;mode.append(o)}
modeRow.append(mode);
// Keep all reading and translation controls together above BOTH columns.
// Moving the existing nodes preserves their listeners and translation state.
const upperActions=el("div","cl-unified-reading-actions");
upperActions.setAttribute("role","group");
upperActions.setAttribute("aria-label","Intercambio de columnas, lectura enfrentada e idioma de traducción");
upperActions.append(orderButton,published,modeRow,controls);
layout.append(upperActions);
let pdfPane=null;
mode.addEventListener("change",()=>{
 const showPdf=mode.value==="pdf";translation.classList.toggle("cl-pdf-mode",showPdf);
 if(showPdf&&!pdfPane){pdfPane=window.ClassicsAcademicReader?.pdfPanel(work);if(pdfPane)translation.append(pdfPane)}
 if(pdfPane)pdfPane.hidden=!showPdf;
 if(showPdf){sequence++;output.removeAttribute("aria-busy")}else showState();
});
// El parámetro to= indica idioma preferido; nunca autoriza por sí solo enviar texto a un proveedor externo.
let enabled=false,autoPaused=false,current=null,sequence=0,translateSize=20,width=50;
try{const stored=Number(localStorage.getItem(key));if(stored>=25&&stored<=75)width=stored}catch{}
function setWidth(value){
 width=Math.max(25,Math.min(75,Math.round(value)));
 root.style.setProperty("--cl-source-percent",width+"%");
 separator.setAttribute("aria-valuenow",String(width));
 separator.setAttribute("aria-valuetext",width+" por ciento para el texto original");
}
setWidth(width);
function resize(event){
 if(event.pointerType==="mouse"&&event.buttons!==1)return;
 const box=root.getBoundingClientRect();
 if(window.matchMedia("(max-width: 900px)").matches)return;
 const percent=100*(event.clientX-box.left)/box.width;setWidth(root.classList.contains("translation-first")?100-percent:percent);
}
separator.addEventListener("pointerdown",event=>{
 if(window.matchMedia("(max-width: 900px)").matches)return;
 event.preventDefault();root.dataset.splitActive="true";separator.setPointerCapture(event.pointerId);resize(event);
});
separator.addEventListener("pointermove",event=>{if(separator.hasPointerCapture(event.pointerId))resize(event)});
function endDrag(event){if(separator.hasPointerCapture(event.pointerId))separator.releasePointerCapture(event.pointerId);
 root.dataset.splitActive="false";try{localStorage.setItem(key,String(width))}catch{}}
separator.addEventListener("pointerup",endDrag);separator.addEventListener("pointercancel",endDrag);
separator.addEventListener("keydown",event=>{
 if(event.key==="ArrowLeft"||event.key==="ArrowRight"||event.key==="Home"||event.key==="End"){
  event.preventDefault();
  setWidth(event.key==="Home"?25:event.key==="End"?75:width+(event.key==="ArrowLeft"?-5:5)*(root.classList.contains("translation-first")?-1:1));
  try{localStorage.setItem(key,String(width))}catch{}
 }
});
// Prioridad editorial: las traducciones indexadas prevalecen sobre servicios automáticos.
// Solo presentamos loci realmente identificados en ambas ediciones; nunca alineamos
// por posición de párrafo ni fabricamos texto para un locus diferente.
const indexedVersions=new Map(),indexedFiles=new Map();
const safeEditionPath=path=>{
 if(typeof path!=="string")return false;
 if(path.startsWith("data/classics-corpus/")||path.startsWith("data/structured/")||path.startsWith("data/lexicon/fontes/"))
  return path.endsWith(".json")&&!path.includes("..")&&!path.includes("?")&&!path.includes("#");
 if(path.startsWith("https://libros.vitruvius-digital-library.org/corpus/"))
  return path.endsWith(".json")&&!path.includes("..")&&!path.includes("?")&&!path.includes("#");
 return false;
};
function registered(e){return e&&e.workId===work&&["es","en","fr"].includes(e.language)&&
 ["json-passages","structured-bilingual"].includes(e.format)&&safeEditionPath(e.path);}
function versionLink(e,locus){
 const u=new URL("classics-text-reader.html",location.href);
 u.searchParams.set("work",work);u.searchParams.set("lang",e.language);
 if(locus)u.searchParams.set("locus",locus);
 return u.pathname+u.search;
}
async function indexedPassages(e){
 if(!indexedFiles.has(e.path))indexedFiles.set(e.path,fetch(e.path).then(r=>{
  if(!r.ok)throw Error("HTTP "+r.status);
  return r.json();
 }).then(j=>Array.isArray(j.passages)?j.passages:[]).catch(()=>[]));
 return indexedFiles.get(e.path);
}
// Start loading the edited English text as soon as the register is available.
document.addEventListener("vitruvia:classics-editions-ready",event=>{
 const info=event.detail;
 if(info?.work!==work||new URLSearchParams(location.search).get("parallel")==="1")return;
 const english=(info.editions||[]).find(e=>registered(e)&&e.language==="en");
 if(english)void indexedPassages(english);
});
async function presentIndexed(entry,target,stamp){
 const e=indexedVersions.get(target);
 if(!e)return false;
 const paragraphs=await indexedPassages(e);
 if(stamp!==sequence||current!==entry||mode.value==="pdf")return true;
 const matched=paragraphs.find(p=>String(p.locus||"").trim()===String(entry.locus||"").trim()&&
  typeof (p.text||p.translation)==="string"&&(p.text||p.translation).trim());
 output.replaceChildren();
 if(matched){
  const para=el("p",null,matched.text||matched.translation);para.lang=target;output.append(para);
  note.textContent="Traducción publicada e indexada · "+(e.sourceDescription||e.edition||"versión bibliográfica")+
   " · Locus editorial coincidente "+entry.locus+" (no implica colación filológica).";
 }else if(!autoPaused&&entry.text&&["la","grc"].includes(entry.language)){
  enabled=true;translate.hidden=true;stop.hidden=false;
  void runTranslation(e);
  return true;
 }else{
  output.append(el("p",null,"Existe una traducción histórica de la obra, pero no se acreditó correspondencia exacta para este locus."));
  note.textContent="Las ediciones se conservan por separado, sin inventar alineaciones.";
 }
 const link=el("a",null,"Leer traducción publicada · "+target.toUpperCase()+" ↗");
 link.href=versionLink(e,matched?entry.locus:null);
 link.style.cssText="display:inline-block;margin:9px 0;color:#d5dde4;text-decoration:underline";
 output.append(link);
 return true;
}
function updateIndexedChoice(info){
 indexedVersions.clear();
 for(const e of (info?.editions||[]))if(registered(e)&&!indexedVersions.has(e.language))indexedVersions.set(e.language,e);
 const hasIndexed=indexedVersions.has(select.value);
 enabled=!hasIndexed&&!autoPaused;
 translate.hidden=hasIndexed||enabled;
 stop.hidden=hasIndexed||!enabled;
 translate.disabled=false;translate.textContent="Activar traducción automática";
 translate.title="Solicitar una traducción provisional del texto original.";
 translation.setAttribute("aria-label",hasIndexed?"Traducción indexada":"Traducción automática orientativa");
 return hasIndexed;
}
function updateLang(){
 const source=current?.language;
 const isOriginal=source==="la"||source==="grc";
 const embedded=new URLSearchParams(location.search).get("parallel")==="1";
 root.classList.toggle("single-source",!isOriginal||embedded);
 translation.hidden=!isOriginal||embedded;
 separator.hidden=!isOriginal||embedded;
 layout.hidden=embedded;
 originalHeading.textContent=isOriginal?"Texto original · "+(source==="grc"?"griego antiguo":"latín"):"Texto de la edición seleccionada";
 if(!isOriginal)output.textContent="La traducción automática está disponible para textos griegos y latinos.";
 return isOriginal;
}
function showState(){
 const ok=updateLang();
 if(!ok)return;
 label.textContent="Locus "+(window.ClassicsAcademicReader?.shortLocus(current?.locus)||current?.locus||"—")+(current?.title?" · "+current.title:"");
 if(mode.value==="pdf")return;
 const hasIndexed=updateIndexedChoice(current);
 if(hasIndexed){
  const stamp=++sequence;
  output.textContent="Cargando traducción publicada al "+({es:"castellano",en:"inglés",fr:"francés"}[select.value]||select.value)+"…";
  void presentIndexed(current,select.value,stamp);return;
 }
 if(!enabled){output.textContent="Traducción automática detenida. Puedes activarla para este pasaje.";return}
 if(!current?.text){output.textContent="El pasaje todavía no está disponible.";return}
 void runTranslation();
}
async function runTranslation(indexedFallback=null){
 const stamp=++sequence,entry=current,target=select.value;
 if(mode.value==="pdf"||!enabled||!entry||!["la","grc"].includes(entry.language))return;
 output.replaceChildren();output.setAttribute("aria-busy","true");
 output.textContent="Traduciendo automáticamente el pasaje "+entry.locus+"…";
 note.textContent="Versión generada por un servicio de traducción automática externo. No constituye traducción filológica.";
 try{
  const translateAPI=window.VitruviaInlineTranslation?.translate;
  if(typeof translateAPI!=="function")throw Error("Servicio de traducción no disponible.");
  const result=await translateAPI(entry.text,entry.language,target);
  if(stamp!==sequence||!enabled||mode.value==="pdf")return;
  output.replaceChildren();
  const para=el("p",null,result.text);para.lang=target;output.append(para);
  const caution=el("p","cl-caution",result.provider+
   (result.partial?" · Traducción parcial: el proveedor limita la extensión del texto.":"")+
   (entry.language==="grc"?" · Griego antiguo procesado como griego moderno; cotejar con el original.":"")+
   " · Traducción automática no verificada.");
  output.append(caution);
   if(indexedFallback){
    const link=el("a",null,"Leer edición publicada sin alineación certificada ↗");
    link.href=versionLink(indexedFallback,null);link.style.cssText="display:block;margin:9px 0;color:#d5dde4;text-decoration:underline";
    output.append(link);
   }
  note.textContent="Locus "+(window.ClassicsAcademicReader?.shortLocus(entry.locus)||entry.locus)+" · "+(entry.number||"")+" de "+(entry.total||"")+" · Texto fuente íntegro en el panel original.";
 }catch(error){
  if(stamp!==sequence||!enabled||mode.value==="pdf")return;
  output.textContent="No fue posible generar la traducción dentro de Bibliotheca. El original permanece intacto.";
  // Alternativa manual, gratuita: el usuario decide abrir Google Traductor.
  // No se envía el contenido a Google hasta que haga clic en el enlace.
  const link=el("a",null,"Abrir este pasaje en Google Traductor ↗");
  const google=new URL("https://translate.google.com/");
  google.searchParams.set("sl",entry.language==="grc"?"el":"la");
  google.searchParams.set("tl",target);
  google.searchParams.set("text",String(entry.text||"").slice(0,1400));
  google.searchParams.set("op","translate");
  link.href=google.href;link.target="_blank";link.rel="noopener noreferrer";
  link.style.cssText="display:inline-block;margin-top:12px;color:#d5dde4;text-decoration:underline";
  output.append(link);
  note.textContent="Servicio externo no disponible ("+(error?.message||"error de acceso")+"). Podés usar el enlace externo sin alterar el original."; translate.hidden=false;translate.textContent="Reintentar traducción";
 }finally{if(stamp===sequence)output.removeAttribute("aria-busy")}
}
function activate(){autoPaused=false;enabled=true;showState()}
translate.addEventListener("click",activate);
stop.addEventListener("click",()=>{
 autoPaused=true;enabled=false;sequence++;translate.hidden=false;stop.hidden=true;
 output.removeAttribute("aria-busy");showState();
});
select.addEventListener("change",()=>{
 const u=new URL(location.href);u.searchParams.set("to",select.value);history.replaceState(null,"",u);
 showState();
});
smaller.addEventListener("click",()=>{translateSize=Math.max(14,translateSize-2);output.style.setProperty("--cl-translation-size",translateSize+"px")});
larger.addEventListener("click",()=>{translateSize=Math.min(36,translateSize+2);output.style.setProperty("--cl-translation-size",translateSize+"px")});
document.addEventListener("vitruvia:classics-passage",event=>{
 const info=event.detail;
 if(!info||info.work!==work||typeof info.text!=="string")return;
 current=info;sequence++;updateIndexedChoice(info);
 const u=new URL("classics-parallel-reader.html",location.href);u.searchParams.set("work",work);u.searchParams.set("left",info.language);u.searchParams.set("locus",info.locus);
 const editorial=(info.editions||[]).find(e=>e.language===select.value)||(info.editions||[]).find(e=>e.language==="en");
 u.searchParams.set("right",editorial?.language||"auto-"+select.value);published.href=u.pathname+u.search;
 published.textContent=editorial?"Traducciones publicadas ↗":"Comparar otras versiones ↗";
 showState();
});
/* Fallback for a passage loaded before this script: only source text from
 * the actual reader is used, never its inline notes or glossary. */
const p=passages.querySelector("p"),textNode=p?.querySelector("span:not(.locus)");
if(textNode?.textContent?.trim()){
 current={work,language:passages.lang||"",locus:p.querySelector(".locus")?.textContent||"",
 text:textNode.textContent};showState();
}else{
 root.classList.add("single-source");translation.hidden=true;separator.hidden=true;
}
})();
