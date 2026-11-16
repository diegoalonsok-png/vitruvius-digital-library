/* Bibliotheca color palette: independent, reversible visual preference. */
(()=>{"use strict";
const KEY="vdl-bibliotheca-background-v1";
const allowed=new Set(["original","graphite","navy","slate","sepia"]);
function init(){
 const root=document.documentElement,menu=document.getElementById("bibliotheca-color-palette");
 if(!menu)return;
 let saved="original";
 try{saved=localStorage.getItem(KEY)||"original"}catch{}
 if(!allowed.has(saved))saved="original";
 function apply(value){
  if(!allowed.has(value))return;
  if(value==="original")delete root.dataset.bibliothecaColor;
  else root.dataset.bibliothecaColor=value;
  menu.querySelectorAll("[data-biblio-color]").forEach(button=>{
   button.setAttribute("aria-pressed",String(button.dataset.biblioColor===value));
  });
  try{localStorage.setItem(KEY,value)}catch{}
 }
 menu.querySelectorAll("[data-biblio-color]").forEach(button=>{
  button.addEventListener("click",()=>{apply(button.dataset.biblioColor);menu.open=false;});
 });
 apply(saved);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();