/* Vitruvia: appearance and locale controls for its native header.
 * Only UI preferences change. Corpus text, indexation and citations remain intact.
 * This page deliberately does not load theme.js, which manages other layouts.
 */
(()=>{
 "use strict";
 const root=document.documentElement,THEME="vitruvia-theme",LANG="vitruvius-ui-lang";
 const langs=new Set(["es","en","fr"]);
 const labels={
  es:{light:"Activar modo claro",dark:"Activar modo oscuro"},
  en:{light:"Switch to light mode",dark:"Switch to dark mode"},
  fr:{light:"Activer le mode clair",dark:"Activer le mode sombre"}
 };
 const store=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 function initialize(){
  const theme=document.getElementById("theme");
  const locale=document.getElementById("ui-language");
  if(!theme||!locale||theme.dataset.vitruviaControls==="1")return;
  theme.dataset.vitruviaControls="1";
  try{
   const preferredTheme=localStorage.getItem(THEME);
   if(["light","dark"].includes(preferredTheme))root.dataset.theme=preferredTheme;
   const preferredLanguage=localStorage.getItem(LANG);
   const initialLanguage=langs.has(preferredLanguage)?preferredLanguage:"en";root.lang=initialLanguage;locale.value=initialLanguage;
  }catch{}
  const paint=()=>{
   const language=langs.has(root.lang)?root.lang:"en";
   const isDark=root.dataset.theme!=="light";
   const next=isDark?"light":"dark";
   theme.setAttribute("aria-label",labels[language][next]);
   theme.title=labels[language][next];
   theme.setAttribute("aria-pressed",String(isDark));
   const svg=theme.querySelector("svg");
   // Preserve the icon node to avoid breaking existing CSS or focus state.
   if(svg)svg.innerHTML=isDark
    ?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
    :'<path d="M20.8 15.4A9 9 0 0 1 8.6 3.2 9 9 0 1 0 20.8 15.4Z"/>';
  };
  theme.addEventListener("click",()=>{
   const next=root.dataset.theme==="light"?"dark":"light";
   root.dataset.theme=next;store(THEME,next);paint();
   document.dispatchEvent(new CustomEvent("vitruvius:theme-changed",{detail:{theme:next,origin:"vitruvia"}}));
  });
  locale.addEventListener("change",()=>{
   const next=locale.value;
   if(!langs.has(next))return;
   const changed=root.lang!==next;
   root.lang=next;store(LANG,next);paint();
   // ui-idioma.js also listens in capture phase. Avoid duplicate translation
   // passes when it already broadcast the change for this same selection.
   if(changed)document.dispatchEvent(new CustomEvent("vitruvius:language-changed",{detail:{language:next,origin:"vitruvia"}}));
  });
  document.addEventListener("vitruvius:language-changed",event=>{
   const next=event.detail?.language;
   if(langs.has(next)){root.lang=next;if(locale.value!==next)locale.value=next;paint();}
  });
  paint();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
 else initialize();
})();
