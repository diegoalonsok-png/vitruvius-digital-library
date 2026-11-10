/* Bibliotheca: accessible, reversible light/dark switch.
 * Uses the shared site theme preference; never changes Greek/Latin text.
 */
(()=>{
 "use strict";
 const root=document.documentElement;
 const KEY="vitruvius-color-theme";
 const names={
  es:{light:"Activar fondo claro",dark:"Activar fondo oscuro"},
  en:{light:"Switch to light appearance",dark:"Switch to dark appearance"},
  fr:{light:"Activer le fond clair",dark:"Activer le fond sombre"}
 };
 let mode="dark";
 try{const saved=localStorage.getItem(KEY);if(saved==="light"||saved==="dark")mode=saved}catch{}
 function paint(){
  root.dataset.theme=mode;
  const button=document.getElementById("bibliotheca-theme");
  if(!button)return;
  const locale=["es","en","fr"].includes(root.lang)?root.lang:"es";
  const label=mode==="dark"?names[locale].light:names[locale].dark;
  button.setAttribute("aria-label",label);
  button.title=label;
  button.setAttribute("aria-pressed",String(mode==="dark"));
  button.textContent=mode==="dark"?"☀":"☾";
 }
 function init(){
  paint();
  const button=document.getElementById("bibliotheca-theme");
  if(!button)return;
  button.addEventListener("click",()=>{
   mode=mode==="dark"?"light":"dark";
   try{localStorage.setItem(KEY,mode)}catch{}
   paint();
  });
  document.addEventListener("vitruvius:language-changed",paint);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
