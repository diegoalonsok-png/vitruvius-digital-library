/* Regiones sin datos: que no dejen hueco
 *
 * Vitruvia reservaba espacio para paneles que a veces no reciben nada —el
 * contexto de la entidad, la columna lateral del artículo, la respuesta
 * sintetizada, la cronología— y el resultado era un vacío grande en medio de
 * la página. El panel se quedaba vacío pero su sitio seguía ocupado, y cuando
 * era una columna de una rejilla, la columna seguía reservada aunque su
 * contenido estuviera oculto.
 *
 * Este módulo observa esas regiones y, cuando una no tiene nada que mostrar,
 * la retira del flujo y recompone la rejilla que la contenía. Cuando llegan
 * datos —y llegan tarde, porque muchas fuentes son asíncronas— la devuelve a
 * su sitio. No cambia estilos ni colores: sólo decide si una región ocupa
 * espacio o no.
 *
 * Qué cuenta como vacío: sin texto visible, sin imagen, sin gráfico y sin
 * ningún control. Un panel que muestra «cargando…» tiene texto y por tanto no
 * se retira: el aviso de carga es información.
 */
(()=>{
"use strict";
if(window.__collapseEmptyRegions)return;
window.__collapseEmptyRegions=true;

const REGIONS=[
 "#vitruvia-context","#article-aside","#article-sources","#article-evidence",
 "#answer","#source-links","#vitruvia-reading-shelf","#vitruvia-images",
 "#vitruvia-image-grid","#vitruvia-academic-timeline","#featured",
 "#lx-side-extra","#lx-encyclopedia","#lx-antiguedad-resultados","#lx-dict-results",
 "#lx-entry","[data-collapse-empty]"
].join(",");
const CONTENT="img,svg,canvas,video,iframe,picture,audio,input,select,textarea,button,a[href]";

const style=document.createElement("style");
style.id="collapse-empty-regions-style";
style.textContent=`.region-empty{display:none!important}`;
(document.head||document.documentElement).append(style);

const isEmpty=node=>{
 if(!node||node.hidden)return true;
 if(node.querySelector(CONTENT))return false;
 return !(node.textContent||"").trim();
};

/* Si la región era una columna de una rejilla con pistas declaradas, la pista
   sigue reservada aunque el contenido esté oculto: hay que recomponer. */
function reflow(parent){
 if(!parent||!parent.children)return;
 let computed;
 try{computed=getComputedStyle(parent)}catch{return}
 if(!/grid/.test(computed.display))return;
 const visible=[...parent.children].filter(child=>{
  if(child.classList.contains("region-empty")||child.hidden)return false;
  try{return getComputedStyle(child).display!=="none"}catch{return true}
 });
 const tracks=(computed.gridTemplateColumns||"").trim().split(/\s+/).filter(Boolean).length;
 if(visible.length===1&&tracks>1){
  parent.dataset.regionCollapsed="1";
  parent.style.gridTemplateColumns="minmax(0,1fr)";
 }else if(parent.dataset.regionCollapsed&&visible.length>1){
  delete parent.dataset.regionCollapsed;
  parent.style.gridTemplateColumns="";
 }
}

let scheduled=false;
function review(){
 scheduled=false;
 for(const node of document.querySelectorAll(REGIONS)){
  /* Una región oculta por su propia lógica (atributo hidden) no se toca: su
     dueño sabe cuándo mostrarla. */
  const own=node.hasAttribute("hidden");
  const empty=isEmpty(node)&&!own;
  node.classList.toggle("region-empty",empty);
  if(empty)node.setAttribute("data-region-empty","1");
  else node.removeAttribute("data-region-empty");
  reflow(node.parentElement);
 }
}
const schedule=()=>{
 if(scheduled)return;
 scheduled=true;
 (window.requestAnimationFrame||setTimeout)(()=>setTimeout(review,60));
};

const observer=new MutationObserver(schedule);
function watch(){
 for(const node of document.querySelectorAll(REGIONS)){
  if(node.__regionWatched)continue;
  node.__regionWatched=true;
  observer.observe(node,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["hidden","style","class"]});
 }
 schedule();
}
for(const event of ["vitruvia:results","vitruvia:clear","vitruvia:search","vitruvia:catalogue-core","lexicon:results"]){
 window.addEventListener(event,()=>{watch();schedule()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watch,{once:true});
else watch();
/* Las fuentes externas llegan tarde: se vuelve a revisar unas pocas veces. */
for(const delay of [900,2500,6000])setTimeout(watch,delay);

window.VitruviaCollapseEmpty={review,watch};
})();
