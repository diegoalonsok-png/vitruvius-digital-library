/* Bibliotheca compact UI: one search field, two genuine destinations. */
(()=>{"use strict";
function init(){
 const $=id=>document.getElementById(id);
 const form=$("search-form"),query=$("classic-query"),text=$("biblio-mode-text"),works=$("biblio-mode-works"),toggle=$("biblio-filter-toggle"),extra=$("biblio-extra-filters"),submit=$("search-submit");
 if(!form||!query||!text||!works||!toggle||!extra)return;
 let mode="text";
 function setMode(next,focus=true){
  mode=next==="works"?"works":"text";
  text.setAttribute("aria-pressed",String(mode==="text"));
  works.setAttribute("aria-pressed",String(mode==="works"));
  query.placeholder=mode==="works"?"Autor u obra: Homero · Ἰλιάς · Cicero":"Palabra o frase: domus · λόγος · symmetria";
  if(submit)submit.textContent=mode==="works"?"Buscar obra ↗":"Buscar en Lexicon ↗";
  document.documentElement.dataset.biblioSearch=mode;
  if(focus)query.focus();
 }
 text.addEventListener("click",()=>setMode("text"));
 works.addEventListener("click",()=>setMode("works"));
 toggle.addEventListener("click",()=>{extra.open=!extra.open;toggle.setAttribute("aria-expanded",String(extra.open));});
 extra.addEventListener("toggle",()=>toggle.setAttribute("aria-expanded",String(extra.open)));
 form.addEventListener("submit",event=>{
  if(mode!=="works")return;
  event.preventDefault();event.stopImmediatePropagation();
  const input=$("bws-query"),region=$("bibliotheca-catalogue-region");
  if(!input||!region){const status=$("catalogue-status");if(status)status.textContent="El índice bibliográfico todavía no está disponible. Consultá el índice alfabético.";return;}
  input.value=query.value.trim();
  input.dispatchEvent(new Event("input",{bubbles:true}));
  if(query.value.trim().length>=2)region.scrollIntoView({behavior:"smooth",block:"nearest"});
  else query.focus();
 },true);
 const params=new URLSearchParams(location.search);
 if(params.get("catalogue")==="1")setMode("works",false);
 else setMode("text",false);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();