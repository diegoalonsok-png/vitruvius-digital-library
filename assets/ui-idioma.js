/* Idioma de interfaz en todo el sitio.
   1. Las etiquetas con diccionario propio (global-language.js, i18n.js y los de
      cada página) se traducen como siempre.
   2. Lo que quede en castellano lo completa page-autotranslate.js con el
      traductor integrado del navegador (Chrome, en el propio equipo); latín,
      griego, citas y siglas no se tocan y al volver a ES se restaura el original.
   3. Si la página no tiene selector de idioma ni de tema, se monta la pastilla
      de Lexicon (secondary-reader-controls.js), la misma en todas partes. */
(()=>{
"use strict";
if(window.VitruviusUIIdioma)return;window.VitruviusUIIdioma=true;
const base=(()=>{const s=document.currentScript||document.querySelector('script[src*="ui-idioma.js"]');try{return new URL(".",s.src).href}catch{return "assets/"}})();
const cargar=(archivo,marca)=>{if(document.querySelector('script[src*="'+marca+'"]'))return;const s=document.createElement("script");s.src=base+archivo;s.defer=true;document.head.append(s)};
const KEY="vitruvius-ui-lang";
let lang="es";try{lang=localStorage.getItem(KEY)||"es"}catch{}
function iniciar(){
 const selectorIdioma=[...document.querySelectorAll("select")].some(s=>{const v=[...s.options].map(o=>o.value.toLowerCase());return v.includes("en")&&v.includes("fr")&&v.includes("es")&&!s.closest("#lang,form")});
 if(!selectorIdioma&&!document.getElementById("vitruvius-secondary-toolbar"))cargar("secondary-reader-controls.js?v=20261112-pastilla","secondary-reader-controls.js");
 cargar("page-autotranslate.js?v=20261112-sitio","page-autotranslate.js");
 // Cualquier selector de idioma del sitio deja el idioma en <html lang>, que es lo que sigue el traductor.
 document.addEventListener("vitruvius:language-changed",e=>{const l=e.detail?.language;if(["es","en","fr"].includes(l)){document.documentElement.lang=l;try{localStorage.setItem(KEY,l)}catch{}}});
 // Selectores propios de una página (atlas, iconografía…): avisan al resto del sitio.
 document.addEventListener("change",e=>{
  const s=e.target;if(!(s instanceof HTMLSelectElement)||s.closest("#lang"))return;
  const v=[...s.options].map(o=>o.value.toLowerCase());if(!(v.includes("en")&&v.includes("fr")&&v.includes("es")))return;
  const l=s.value.toLowerCase().slice(0,2);
  if(["es","en","fr"].includes(l)&&document.documentElement.lang!==l)document.dispatchEvent(new CustomEvent("vitruvius:language-changed",{detail:{language:l,origin:"ui-idioma"}}));
  // El traductor integrado puede necesitar descargar su modelo: se pide durante el gesto del usuario.
  if(l!=="es"&&self.Translator)try{Translator.create({sourceLanguage:"es",targetLanguage:l}).catch(()=>{})}catch{}
 },true);
 document.addEventListener("ov-locale-changed",e=>{const l=e.detail?.lang;if(["es","en","fr"].includes(l))document.documentElement.lang=l});
 if(["en","fr"].includes(lang)&&document.documentElement.lang!==lang)setTimeout(()=>{if(!["en","fr"].includes(document.documentElement.lang))document.documentElement.lang=lang},1200);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
})();
