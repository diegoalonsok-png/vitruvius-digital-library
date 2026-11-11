/* Respuesta visible al pulsar, en todo el sitio
 *
 * Problema: al pulsar un botón de búsqueda no se veía que se hubiera pulsado.
 * La causa no era que faltara un estilo sino su duración: el estado :active
 * dura lo que dura el dedo sobre el botón —unos treinta milisegundos en un
 * clic rápido—, de modo que la animación no alcanza a verse. Además, la
 * respuesta sólo estaba puesta en Vitruvia y sobre una lista fija de botones.
 *
 * Aquí la pulsación se marca desde JavaScript con una duración mínima
 * garantizada, y los botones que lanzan un trabajo asíncrono quedan en estado
 * «ocupado» hasta que llegan los resultados, con aviso para lectores de
 * pantalla. Los colores salen de currentColor: el módulo no impone paleta ni
 * cambia la disposición, sólo hace visible lo que ya ocurría.
 */
(()=>{
"use strict";
if(window.__buttonPressFeedback)return;
window.__buttonPressFeedback=true;

const PRESS_MS=190;        // duración mínima visible de la pulsación
const BUSY_MIN_MS=380;     // para que un resultado instantáneo no parpadee
const BUSY_MAX_MS=9000;    // nunca se queda ocupado para siempre

const style=document.createElement("style");
style.id="button-press-feedback-style";
style.textContent=`
button,[role="button"],input[type="submit"],input[type="button"]{touch-action:manipulation}
.bp-press{transform:scale(.94)!important;filter:brightness(.92)}
.bp-press,.bp-busy{transition:transform .09s ease,filter .09s ease}
.bp-ring{position:relative}
.bp-ring::after{content:"";position:absolute;inset:-3px;border-radius:inherit;
 border:1px solid currentColor;opacity:.55;pointer-events:none;animation:bp-ring .42s ease-out forwards}
@keyframes bp-ring{from{opacity:.6;transform:scale(.97)}to{opacity:0;transform:scale(1.06)}}
.bp-busy{cursor:progress}
.bp-busy>.bp-spin{display:inline-block;width:.72em;height:.72em;margin-right:.5em;vertical-align:-.08em;
 border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:bp-spin .7s linear infinite}
@keyframes bp-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){
 .bp-press{transform:none!important;filter:brightness(.88)}
 .bp-ring::after{animation:none;opacity:0}
 .bp-busy>.bp-spin{animation:none;border-right-color:currentColor;opacity:.6}
}
`;
(document.head||document.documentElement).append(style);

const pressable=target=>target&&target.closest&&target.closest('button,[role="button"],input[type="submit"],input[type="button"],.tab,.academic-pill,.lx-btn,.lx-library-button');

/* Pulsación: se marca al bajar el puntero y se mantiene un mínimo visible. */
function flash(element){
 if(!element||element.disabled)return;
 element.classList.add("bp-press","bp-ring");
 clearTimeout(element.__bpPress);
 element.__bpPress=setTimeout(()=>{
  element.classList.remove("bp-press");
  setTimeout(()=>element.classList.remove("bp-ring"),420);
 },PRESS_MS);
}
for(const event of ["pointerdown","keydown"]){
 document.addEventListener(event,e=>{
  if(event==="keydown"&&!["Enter"," ","Spacebar"].includes(e.key))return;
  const element=pressable(e.target);
  if(element)flash(element);
 },true);
}

/* Ocupado: para los botones que lanzan una búsqueda u otra tarea asíncrona.
   El rótulo no se cambia —eso alteraría el texto de la interfaz—; se añade un
   indicador delante y se anuncia con aria-busy. */
const BUSY_SELECTOR='button[type="submit"],input[type="submit"],[data-busy],.lx-library-button,'+
 '#submit,#lx-form button,#search-form button[type="submit"],#col-run,#comp-go,.classic-search-button';
let openBusy=new Set();

function clearBusy(element){
 if(!element)return;
 clearTimeout(element.__bpBusyMax);
 const spin=element.querySelector(":scope > .bp-spin");
 if(spin)spin.remove();
 element.classList.remove("bp-busy");
 element.removeAttribute("aria-busy");
 openBusy.delete(element);
}
function setBusy(element){
 if(!element||element.classList.contains("bp-busy"))return;
 element.classList.add("bp-busy");
 element.setAttribute("aria-busy","true");
 const spin=document.createElement("span");
 spin.className="bp-spin";spin.setAttribute("aria-hidden","true");
 element.prepend(spin);
 openBusy.add(element);
 element.__bpBusyAt=Date.now();
 element.__bpBusyMax=setTimeout(()=>clearBusy(element),BUSY_MAX_MS);
}
function releaseAll(){
 for(const element of [...openBusy]){
  const waited=Date.now()-(element.__bpBusyAt||0);
  if(waited>=BUSY_MIN_MS)clearBusy(element);
  else setTimeout(()=>clearBusy(element),BUSY_MIN_MS-waited);
 }
}

/* Vitruvia ya tiene su propio indicador en el botón de buscar, con rótulo
   «Buscando…». No se le añade un segundo: se detecta por la hoja que instala
   ese módulo. */
const hasOwnIndicator=element=>
 element.id==="submit"&&!!document.getElementById("vr-submit-feedback-style");

document.addEventListener("click",e=>{
 const element=e.target.closest&&e.target.closest(BUSY_SELECTOR);
 if(!element||element.disabled||hasOwnIndicator(element))return;
 /* Un botón que no va a hacer nada asíncrono se libera enseguida: el mínimo
    visible evita el parpadeo y nada queda girando sin motivo. */
 setBusy(element);
 setTimeout(()=>{if(openBusy.has(element))clearBusy(element)},BUSY_MAX_MS);
},true);

/* Señales de que el trabajo terminó. Las que ya emite el sitio, más la
   aparición de resultados en los contenedores conocidos. */
for(const event of ["vitruvia:results","vitruvia:clear","vitruvia:search-complete","lexicon:results"]){
 window.addEventListener(event,releaseAll);
}
const observed=["result-list","results","lx-results","lx-library-list","col-out","comp-out"];
const observer=new MutationObserver(releaseAll);
const observe=()=>{
 for(const id of observed){
  const node=document.getElementById(id);
  if(node&&!node.__bpObserved){node.__bpObserved=true;observer.observe(node,{childList:true,subtree:false})}
 }
 for(const node of document.querySelectorAll(".lx-library-list,.results,.result-list")){
  if(!node.__bpObserved){node.__bpObserved=true;observer.observe(node,{childList:true,subtree:false})}
 }
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe,{once:true});
else observe();
setTimeout(observe,1500);

window.VitruviaButtonFeedback={flash,setBusy,clearBusy:releaseAll};
})();
