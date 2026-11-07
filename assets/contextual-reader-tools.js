/* Non-destructive study tools for contextual philological dossier. */
(()=>{
"use strict";
const layer=document.getElementById("contextual-lexicon");
if(!layer||document.getElementById("ctx-tools"))return;
const dialog=layer.querySelector(".ctx-dialog"),body=layer.querySelector("#ctx-body");
if(!dialog||!body)return;
const toolbar=document.createElement("div");
toolbar.id="ctx-tools";toolbar.className="ctx-tools";toolbar.setAttribute("role","toolbar");
toolbar.setAttribute("aria-label","Herramientas filológicas");
toolbar.innerHTML=[
'<div class="ctx-tools-row"><span>Anotación</span>',
'<button type="button" data-mark="yellow" title="Resaltar amarillo" aria-label="Amarillo">●</button>',
'<button type="button" data-mark="green" title="Resaltar verde" aria-label="Verde">●</button>',
'<button type="button" data-mark="blue" title="Resaltar azul" aria-label="Azul">●</button>',
'<button type="button" data-mark="pink" title="Resaltar rosa" aria-label="Rosa">●</button>',
'<button type="button" data-mark="underline" title="Subrayar selección">Subrayar</button>',
'<button type="button" data-action="clear">Quitar marcas</button></div>',
'<div class="ctx-tools-row"><span>Lectura</span>',
'<button type="button" data-action="speak">▶ Leer</button>',
'<button type="button" data-action="pause">Ⅱ Pausa</button>',
'<button type="button" data-action="stop">■ Detener</button>',
'<label>Velocidad <select id="ctx-speed"><option value="0.8">0,8×</option><option value="1" selected>1×</option><option value="1.2">1,2×</option></select></label>',
'<button type="button" data-action="theme" aria-pressed="false">◐ Invertir colores</button>',
'<button type="button" data-action="large">A+</button><button type="button" data-action="small">A−</button></div>',
'<div class="ctx-tools-row"><span>Compartir</span>',
'<button type="button" data-action="copy">Copiar cita</button>',
'<button type="button" data-action="email">Correo</button>',
'<button type="button" data-action="whatsapp">WhatsApp</button>',
'<button type="button" data-action="print">PDF / Imprimir</button></div>',
'<p id="ctx-tools-status" role="status" aria-live="polite">Seleccione un fragmento para resaltarlo. Las anotaciones no alteran los textos originales.</p>'
].join("");
dialog.querySelector(".ctx-heading").after(toolbar);
const status=toolbar.querySelector("#ctx-tools-status"),synth=window.speechSynthesis;
let savedRange=null,fontSize=15,speechId=0;
function notice(message){status.textContent=message}
function title(){return (layer.querySelector("#ctx-heading")?.textContent||"").trim()}
function source(){return new URL("index.html?q="+encodeURIComponent(title()),location.href).href}
function capture(){
 const sel=window.getSelection();
 if(sel?.rangeCount&&!sel.isCollapsed){
  const range=sel.getRangeAt(0);
  if(body.contains(range.commonAncestorContainer)){savedRange=range.cloneRange();return savedRange}
 }
 return savedRange;
}
body.addEventListener("mouseup",capture);
body.addEventListener("keyup",capture);
toolbar.addEventListener("pointerdown",e=>{if(e.target.closest("[data-mark]"))e.preventDefault()});
function mark(color){
 const range=capture();
 if(!range||range.collapsed||!body.contains(range.startContainer)||!body.contains(range.endContainer)){
  notice("Seleccione primero un fragmento dentro de la ficha.");return;
 }
 if(range.toString().length>12000){notice("Seleccione hasta 12.000 caracteres.");return}
 const element=document.createElement("mark");element.className="ctx-mark ctx-mark-"+color;
 try{range.surroundContents(element)}
 catch{
  try{element.append(range.extractContents());range.insertNode(element)}
  catch{notice("Seleccione un fragmento contenido en un solo párrafo.");return}
 }
 savedRange=null;window.getSelection()?.removeAllRanges();
 notice("Anotación aplicada al visor; use PDF / Imprimir para conservar una copia con sus marcas.");
}
function clear(){
 for(const m of body.querySelectorAll("mark.ctx-mark"))m.replaceWith(...m.childNodes);
 body.normalize();savedRange=null;notice("Se quitaron las marcas de la ficha; los archivos fuente permanecen intactos.");
}
function chosenText(){return capture()?.toString()?.trim()||""}
function citation(){
 const selection=chosenText();
 const text=selection||body.innerText.slice(0,1700);
 const excerpt=savedRange?.startContainer?.parentElement?.closest(".ctx-excerpt");
 const passageUrl=excerpt?.querySelector("a[href]")?.href||source();
 const passageTitle=excerpt?.querySelector("a")?.textContent?.trim()||"Dossier contextual; verificar locus en el lector";
 return "Vitruvius Digital Library · "+title()+"\n"+passageTitle+"\n"+text+"\n\nEdición y pasaje: "+passageUrl+"\nFicha de consulta: "+source()+"\nLa cita debe comprobarse en el lector de la edición.";
}
function stop(){speechId++;synth?.cancel()}
function speak(){
 if(!synth||!window.SpeechSynthesisUtterance){notice("Este navegador no dispone de lectura en voz alta.");return}
 stop();const id=speechId;
 const selected=chosenText(),text=(selected||body.innerText).trim().slice(0,14000);
 if(!text){notice("No hay texto disponible para leer.");return}
 const r=capture(),language=r?.startContainer?.parentElement?.closest("[lang]")?.lang;
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.lang=language==="la"?"la":language==="grc"?"el-GR":language||"es-ES";
 utterance.rate=Number(toolbar.querySelector("#ctx-speed").value)||1;
 utterance.onend=()=>{if(id===speechId)notice("Lectura finalizada.")};
 utterance.onerror=()=>{if(id===speechId)notice("No hay una voz compatible disponible. Seleccione otra voz en el sistema.")};
 synth.speak(utterance);
 notice("Lectura en voz alta. La pronunciación depende de las voces del dispositivo; no representa una reconstrucción histórica.");
}
toolbar.addEventListener("click",async e=>{
 const btn=e.target.closest("button");if(!btn)return;
 const color=btn.dataset.mark,action=btn.dataset.action;
 if(color){mark(color);return}
 if(action==="clear")clear();
 if(action==="speak")speak();
 if(action==="pause"){
  if(!synth){notice("La síntesis de voz no está disponible.");return}
  if(synth.paused){synth.resume();notice("Lectura reanudada.")}
  else if(synth.speaking){synth.pause();notice("Lectura pausada.")}
  else notice("No hay lectura activa.");
 }
 if(action==="stop"){stop();notice("Lectura detenida.")}
 if(action==="theme"){
  const active=dialog.classList.toggle("ctx-inverted");btn.setAttribute("aria-pressed",String(active));
  notice(active?"Modo oscuro activado.":"Modo claro activado.");
 }
 if(action==="large"||action==="small"){
  fontSize=Math.min(26,Math.max(13,fontSize+(action==="large"?1:-1)));
  body.style.fontSize=fontSize+"px";notice("Tamaño de fuente: "+fontSize+" px.");
 }
 if(action==="copy"){
  try{await navigator.clipboard.writeText(citation());notice("Cita y referencia copiadas.")}
  catch{notice("No se pudo acceder al portapapeles; seleccione y copie manualmente.")}
 }
 if(action==="email"){
  location.href="mailto:?subject="+encodeURIComponent("Vitruvius · "+title())+"&body="+encodeURIComponent(citation().slice(0,2400));
  notice("Se solicitó abrir el correo. No se ha enviado nada.");
 }
 if(action==="whatsapp"){
  window.open("https://wa.me/?text="+encodeURIComponent(citation().slice(0,1800)),"_blank","noopener,noreferrer");
  notice("Se abrió WhatsApp para compartir; no se envió ningún mensaje.");
 }
 if(action==="print"){
  const old=document.title;document.title="Vitruvius · "+title();
  window.print();document.title=old;
  notice("Seleccione Guardar como PDF en el diálogo de impresión.");
 }
});
new MutationObserver(()=>{if(layer.hidden){stop();savedRange=null}}).observe(layer,{attributes:true,attributeFilter:["hidden"]});
if(!synth||!window.SpeechSynthesisUtterance)toolbar.querySelectorAll('[data-action="speak"],[data-action="pause"],[data-action="stop"]').forEach(b=>b.disabled=true);
})();