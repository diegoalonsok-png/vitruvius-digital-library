/* Bibliotheca: working reversible light/dark mode, shared preference. */
(()=>{"use strict";
 const root=document.documentElement;
 const KEY="vitruvius-color-theme";
 const paletteKey="vdl-bibliotheca-background-v1";
 const labels={
  es:{light:"Cambiar a modo claro",dark:"Cambiar a modo oscuro",lightText:"☀ Claro",darkText:"☾ Oscuro"},
  en:{light:"Switch to light mode",dark:"Switch to dark mode",lightText:"☀ Light",darkText:"☾ Dark"},
  fr:{light:"Passer en mode clair",dark:"Passer en mode sombre",lightText:"☀ Clair",darkText:"☾ Sombre"}
 };
 let mode="light";
 try{const saved=localStorage.getItem(KEY);if(saved==="light"||saved==="dark")mode=saved}catch{}
 function paint(){
  root.dataset.theme=mode;
  const btn=document.getElementById("bibliotheca-theme");
  if(!btn)return;
  const lang=["es","en","fr"].includes(root.lang)?root.lang:"es";
  const next=mode==="dark"?"light":"dark";
  btn.setAttribute("aria-label",labels[lang][next]);
  btn.title=labels[lang][next];
  btn.setAttribute("aria-pressed",String(mode==="dark"));
  btn.textContent=labels[lang][next+"Text"];
 }
 function clearCustomPalette(){
  // Dark/light is a full-page switch even after a custom background was selected.
  delete root.dataset.bibliothecaColor;
  try{localStorage.setItem(paletteKey,"original")}catch{}
  document.querySelectorAll("#bibliotheca-color-palette [data-biblio-color]").forEach(b=>
   b.setAttribute("aria-pressed",String(b.dataset.biblioColor==="original")));
 }
 function init(){
  paint();
  const btn=document.getElementById("bibliotheca-theme");
  if(!btn)return;
  btn.addEventListener("click",()=>{
   mode=mode==="light"?"dark":"light";
   try{localStorage.setItem(KEY,mode)}catch{}
   clearCustomPalette();
   paint();
  });
  document.addEventListener("vitruvius:language-changed",paint);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
