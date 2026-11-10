/* Shared reading controls for secondary editorial and reference pages.
 * Do not inject into primary apps, corpus folio viewers or embedded frames.
 * Source texts, facsimiles, citations and sigla remain unchanged.
 */
(()=>{
 "use strict";
 const path=(location.pathname.split("/").pop()||"index.html").toLowerCase();
 const exclude=new Set([
  "index.html","vitruvia.html","vitruvia-lexicon.html","aparato-critico.html",
  "bibliotheca-graeca-latina.html","onomasticon.html","atlas-geographicus.html",
  "lector-bilingue.html","lector-clasico.html","lector-textual-rapido.html",
  "classics-parallel-reader.html","classics-text-reader.html","classics-document-parallel.html",
  "classics-external-source-reader.html","classics-remote-latin-reader.html","classics-remote-text-reader.html",
  "codex-h-doble-folio.html","codex-h-folios-local.html","visor-codex.html",
  "escritorio-h-prueba.html","laboratorio-h.html","papyrologia-ostraca.html",
  "offline.html","google3c5cb2d9ef8db916.html"
 ]);
 if(exclude.has(path)||window.top!==window.self||/[?&]embed=1\b/.test(location.search))return;
 const KEY="vitruvius-color-theme",LANG="vitruvius-ui-lang";
 const vocabulary={
  es:["Idioma","Activar fondo claro","Activar fondo oscuro"],
  en:["Language","Switch to light background","Switch to dark background"],
  fr:["Langue","Activer le fond clair","Activer le fond sombre"]
 };
 const langs=["es","en","fr"];
 const root=document.documentElement;
 let language=langs.includes(root.lang)?root.lang:"es",theme="dark";
 try{
  const saved=localStorage.getItem(LANG);if(langs.includes(saved))language=saved;
  const choice=localStorage.getItem(KEY);if(choice==="light"||choice==="dark")theme=choice;
 }catch{}
 function scriptURL(filename){
  const existing=document.querySelector('script[src*="secondary-reader-controls.js"]');
  try{return new URL(filename,existing?.src||new URL("assets/secondary-reader-controls.js",location.href)).href}
  catch{return "assets/"+filename}
 }
 function emitLanguage(){
  document.dispatchEvent(new CustomEvent("vitruvius:language-changed",{
   detail:{language,origin:"secondary-controls"}}));
 }
 function save(key,value){try{localStorage.setItem(key,value)}catch{}}
 function defaultTheme(){
  try{if(localStorage.getItem(KEY))return theme;}catch{}
  // Preserve the actual authored theme of legacy dark-only pages at first
  // load; theme.js may otherwise set data-theme=light without changing CSS.
  const rgb=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
  if(!rgb||rgb.length<3)return root.dataset.theme==="light"?"light":"dark";
  const [r,g,b]=rgb.slice(0,3).map(Number);
  const luminance=.2126*r+.7152*g+.0722*b;
  return luminance<140?"dark":"light";
 }
 function updateButtons(){
  const t=vocabulary[language]||vocabulary.es;
  const selected=document.getElementById("secondary-language");
  const button=document.getElementById("secondary-theme");
  if(selected){
   selected.value=language;selected.setAttribute("aria-label",t[0]+" ES / EN / FR");
   selected.title=t[0]+" ES / EN / FR";
  }
  if(button){
   const dark=theme==="dark";
   button.textContent=dark?"☀":"☾";
   button.setAttribute("aria-label",dark?t[1]:t[2]);
   button.title=dark?t[1]:t[2];
   button.setAttribute("aria-pressed",String(dark));
  }
  root.lang=language;
 }
 function setTheme(next){
  if(next!=="light"&&next!=="dark")return;
  theme=next;root.dataset.theme=theme;
  save(KEY,theme);updateButtons();
  document.dispatchEvent(new CustomEvent("vitruvius:theme-changed",{
   detail:{theme,origin:"secondary-controls"}}));
 }
 function setLanguage(next){
  if(!langs.includes(next))return;
  language=next;save(LANG,language);updateButtons();
  if(window.PhilologyUI?.select&&window.PhilologyUI.getLanguage?.()!==next)window.PhilologyUI.select(next);
  emitLanguage();
 }
 function loadLocalization(){
  // Pages that already have a scholarly ES/EN/FR translator keep it.
  if(document.querySelector('script[src*="global-language.js"],script[src*="i18n.js"],script[src*="philology-i18n.js"]')){
   document.dispatchEvent(new CustomEvent("vitruvius:interface-mounted",{detail:{root:document.body}}));
   return;
  }
  const script=document.createElement("script");
  script.src=scriptURL("global-language.js?v=20261110-secondary-v1");
  script.dataset.secondaryI18n="1";
  script.addEventListener("load",()=>{
   document.dispatchEvent(new CustomEvent("vitruvius:interface-mounted",{detail:{root:document.body}}));
   emitLanguage();
  },{once:true});
  document.head.append(script);
 }
 function init(){
  if(!document.body||document.getElementById("vitruvius-secondary-toolbar"))return;
  const pane=document.createElement("div");
  pane.id="vitruvius-secondary-toolbar";
  pane.className="vitruvius-secondary-toolbar";
  pane.setAttribute("role","group");
  pane.setAttribute("aria-label","Idioma y apariencia / Language and appearance");
  const label=document.createElement("label");
  label.className="vitruvius-secondary-selector";
  const sr=document.createElement("span");
  sr.className="vitruvius-secondary-sr";sr.textContent="Idioma de interfaz";
  const select=document.createElement("select");
  select.id="secondary-language";
  for(const code of langs){
   const option=document.createElement("option");
   option.value=code;option.textContent=code.toUpperCase();select.append(option);
  }
  label.append(sr,select);
  const button=document.createElement("button");
  button.id="secondary-theme";button.type="button";
  button.className="vitruvius-secondary-theme";
  pane.append(label,button);
  // Keep custom page layouts and manuscript tables unchanged. On standard
  // editorial pages place one compact toolbar in the upper-right corner.
  document.body.append(pane);
  document.body.classList.add("vitruvius-secondary-controls");
  theme=defaultTheme();
  select.addEventListener("change",()=>setLanguage(select.value));
  button.addEventListener("click",()=>setTheme(theme==="dark"?"light":"dark"));
  const css=document.createElement("link");css.rel="stylesheet";
  css.href=scriptURL("secondary-reader-controls.css?v=20261110-v1");
  css.dataset.secondaryControls="";document.head.append(css);
  updateButtons();setTheme(theme);loadLocalization();
  document.addEventListener("vitruvius:language-changed",event=>{
   if(event.detail?.origin==="secondary-controls")return;
   const next=event.detail?.language;
   if(langs.includes(next)){language=next;updateButtons();}
  });
  window.VitruviusSecondaryControls=Object.freeze({setLanguage,setTheme});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
