/* Botonera de fondo e idioma del Lexicon, como módulo reutilizable.

   Estaba dentro de assets/vitruvia-lexicon.js y sólo servía a esa página. Los
   nueve fondos —sepia, pergamino, marfil, pizarra— son los que hacen falta para
   leer un facsímil o un texto latino largo, de modo que conviene que estén en
   todas las páginas de estudio y no sólo en una.

   Comparte la clave de almacenamiento del Lexicon («vitruvia-lexicon-bg»), así
   que el fondo elegido en una página se conserva al pasar a otra.

   Montaje: la página declara un punto de anclaje con [data-lexicon-palette], o
   bien el módulo se coloca en .navtools, .ov-top-controls o el primer header. */
(()=>{
"use strict";
const PALETTE=[["Negro","#0d0d0e","dark"],["Grafito","#17191c","dark"],["Pizarra","#222a32","dark"],
 ["Azul noche","#101b2c","dark"],["Sepia","#292019","dark"],["Verde tinta","#182720","dark"],
 ["Marfil","#f7f5ef","light"],["Papel","#fbfaf6","light"],["Pergamino","#efe6d2","light"]];
const CLAVE_FONDO="vitruvia-lexicon-bg";
const CLAVE_TEMA="vitruvia-theme";
const el=(t,a,...hijos)=>{
 const n=document.createElement(t);
 for(const [k,v] of Object.entries(a||{})){
  if(v==null)continue;
  if(k==="class")n.className=v; else if(k==="text")n.textContent=v;
  else if(k.startsWith("on")&&typeof v==="function")n.addEventListener(k.slice(2),v);
  else n.setAttribute(k,v);
 }
 for(const h of hijos)if(h!=null)n.append(h);
 return n;
};
function aplicarFondo(hex,modo){
 const r=document.documentElement;
 if(!hex){
  r.style.removeProperty("--lx-bg");
  document.body.style.removeProperty("background");
  return;
 }
 r.style.setProperty("--lx-bg",hex);
 document.body.style.removeProperty("background");
 if(modo){
  r.dataset.theme=modo==="light"?"light":"dark";
  try{localStorage.setItem(CLAVE_TEMA,r.dataset.theme)}catch{}
 }
}
function anclaje(){
 return document.querySelector("[data-lexicon-palette]")
  ||document.querySelector(".navtools")
  ||document.querySelector(".ov-top-controls")
  ||document.querySelector("header .wrap")
  ||document.querySelector("header");
}
function construir(){
 if(document.getElementById("lxp-palette"))return;
 const donde=anclaje();
 if(!donde)return;
 const caja=el("details",{class:"lxp-palette",id:"lxp-palette"});
 const resumen=el("summary",{"aria-label":"Color de fondo de la página",title:"Color de fondo de la página"});
 resumen.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" '
  +'stroke="currentColor" stroke-width="1.6"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2'
  +'-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/>'
  +'<circle cx="10.5" cy="7.2" r="1.2"/><circle cx="15" cy="7.4" r="1.2"/></svg>';
 resumen.append(el("span",{text:"Fondo"}));
 const panel=el("div",{class:"lxp-panel"});
 for(const [nombre,hex,modo] of PALETTE)
  panel.append(el("button",{type:"button",class:"lxp-swatch",title:nombre,"aria-label":nombre,
   style:"background:"+hex,onclick:()=>{
    aplicarFondo(hex,modo);
    try{localStorage.setItem(CLAVE_FONDO,JSON.stringify([hex,modo]))}catch{}
   }}));
 const propio=el("input",{type:"color",value:"#0d0d0e","aria-label":"Color de fondo personalizado"});
 propio.addEventListener("input",()=>{
  const h=propio.value;
  const lum=parseInt(h.slice(1,3),16)*.299+parseInt(h.slice(3,5),16)*.587+parseInt(h.slice(5,7),16)*.114;
  const modo=lum>150?"light":"dark";
  aplicarFondo(h,modo);
  try{localStorage.setItem(CLAVE_FONDO,JSON.stringify([h,modo]))}catch{}
 });
 panel.append(el("label",{class:"lxp-small",text:"Personalizado "},propio));
 panel.append(el("button",{type:"button",class:"lxp-reset",text:"Restablecer",onclick:()=>{
  aplicarFondo(null);
  try{localStorage.removeItem(CLAVE_FONDO)}catch{}
 }}));
 caja.append(resumen,panel);
 donde.prepend(caja);
}
function restaurar(){
 try{
  const v=JSON.parse(localStorage.getItem(CLAVE_FONDO)||"null");
  if(v&&typeof v[0]==="string")aplicarFondo(v[0],v[1]);
 }catch{}
}
restaurar();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",construir,{once:true});
else construir();
window.LexiconPalette={aplicarFondo,PALETTE,construir};
})();
