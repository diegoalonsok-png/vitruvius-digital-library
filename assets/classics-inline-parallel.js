/* In-place dual reader for the original Greek/Latin and an optional automatic translation.
 * Reuses the site's existing translator. It never searches for manuscript folios,
 * never fabricates a local translated edition, and never sends a passage before
 * the reader explicitly activates automated translation. */
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
const originalHeading=el("p","cl-pane-title","01 · Texto original");
original.prepend(originalHeading);
if(hitnav)original.append(hitnav);
original.append(passages,lexicon);
const separator=el("div","cl-pane-splitter");
separator.tabIndex=0;separator.role="separator";separator.setAttribute("aria-label","Arrastrar para modificar el ancho de los dos lectores");
separator.setAttribute("aria-orientation","vertical");separator.setAttribute("aria-valuemin","25");separator.setAttribute("aria-valuemax","75");
const translationHeading=el("p","cl-pane-title","02 · Traducción automática");
const controls=el("div","cl-translation-tools");
const languageLabel=el("label",null,"Idioma ");
const select=el("select");
select.setAttribute("aria-label","Idioma de la traducción automática");
for(const [value,name] of [["es","Castellano"],["en","English"],["fr","Français"]]){
 const o=el("option",null,name);o.value=value;select.append(o);
}
select.value=["es","en","fr"].includes(new URLSearchParams(location.search).get("to"))
 ?new URLSearchParams(location.search).get("to"):"es";
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
const output=el("div","cl-translation-output","Selecciona el idioma y pulsá «Activar traducción automática».");
output.setAttribute("role","status");output.setAttribute("aria-live","polite");
const note=el("p","cl-translation-meta","La traducción es automática y orientativa, no una edición académica. El original permanece intacto. No se envía texto a terceros hasta activar la traducción.");
translation.append(translationHeading,controls,label,output,note);
root.append(original,separator,translation);
article.append(root);
let enabled=false,current=null,sequence=0,translateSize=20,width=50;
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
 setWidth(100*(event.clientX-box.left)/box.width);
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
  setWidth(event.key==="Home"?25:event.key==="End"?75:width+(event.key==="ArrowLeft"?-5:5));
  try{localStorage.setItem(key,String(width))}catch{}
 }
});
function updateLang(){
 const source=current?.language;
 const isOriginal=source==="la"||source==="grc";
 root.classList.toggle("single-source",!isOriginal);
 translation.hidden=!isOriginal;
 separator.hidden=!isOriginal;
 originalHeading.textContent=isOriginal?"01 · Texto original · "+(source==="grc"?"griego antiguo":"latín"):"Texto de la edición seleccionada";
 if(!isOriginal)output.textContent="La traducción automática está disponible para textos griegos y latinos.";
 return isOriginal;
}
function showState(){
 const ok=updateLang();
 if(!ok)return;
 label.textContent="Locus "+(current?.locus||"—")+(current?.title?" · "+current.title:"");
 if(!enabled){output.textContent="Elige castellano, inglés o francés y activá la traducción automática.";return}
 if(!current?.text){output.textContent="El pasaje todavía no está disponible.";return}
 runTranslation();
}
async function runTranslation(){
 const stamp=++sequence,entry=current,target=select.value;
 if(!enabled||!entry||!["la","grc"].includes(entry.language))return;
 output.replaceChildren();output.setAttribute("aria-busy","true");
 output.textContent="Traduciendo automáticamente el pasaje "+entry.locus+"…";
 note.textContent="Versión generada por un servicio de traducción automática externo. No constituye traducción filológica.";
 try{
  const translateAPI=window.VitruviaInlineTranslation?.translate;
  if(typeof translateAPI!=="function")throw Error("Servicio de traducción no disponible.");
  const result=await translateAPI(entry.text,entry.language,target);
  if(stamp!==sequence||!enabled)return;
  output.replaceChildren();
  const para=el("p",null,result.text);para.lang=target;output.append(para);
  const caution=el("p","cl-caution",result.provider+
   (result.partial?" · Traducción parcial: el proveedor limita la extensión del texto.":"")+
   (entry.language==="grc"?" · Griego antiguo procesado como griego moderno; cotejar con el original.":"")+
   " · Traducción automática no verificada.");
  output.append(caution);
  note.textContent="Locus "+entry.locus+" · "+(entry.number||"")+" de "+(entry.total||"")+" · Texto fuente conservado íntegro a la izquierda.";
 }catch(error){
  if(stamp!==sequence||!enabled)return;
  output.textContent="No fue posible traducir este pasaje mediante el servicio disponible. El texto original permanece legible a la izquierda.";
  note.textContent="Error del proveedor de traducción: "+(error?.message||"Servicio no disponible")+". No se inventa una traducción.";
 }finally{if(stamp===sequence)output.removeAttribute("aria-busy")}
}
function activate(){enabled=true;translate.hidden=true;stop.hidden=false;showState()}
translate.addEventListener("click",activate);
stop.addEventListener("click",()=>{
 enabled=false;sequence++;translate.hidden=false;stop.hidden=true;
 output.removeAttribute("aria-busy");showState();
});
select.addEventListener("change",()=>{
 const u=new URL(location.href);u.searchParams.set("to",select.value);history.replaceState(null,"",u);
 if(enabled)runTranslation();else showState();
});
smaller.addEventListener("click",()=>{translateSize=Math.max(14,translateSize-2);output.style.setProperty("--cl-translation-size",translateSize+"px")});
larger.addEventListener("click",()=>{translateSize=Math.min(36,translateSize+2);output.style.setProperty("--cl-translation-size",translateSize+"px")});
document.addEventListener("vitruvia:classics-passage",event=>{
 const info=event.detail;
 if(!info||info.work!==work||typeof info.text!=="string")return;
 current=info;sequence++;showState();
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
