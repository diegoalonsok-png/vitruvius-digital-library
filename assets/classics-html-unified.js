/* Shared presentation for historically hosted HTML-text editions (Catullus,
   Cicero, Lucretius). No changes to the edition's text or source attribution. */
(()=>{"use strict";
const script=document.currentScript;
const work=script?.dataset.work||"";
const language=script?.dataset.lang||document.documentElement.lang||"la";
const KEY="vdl:legacy:edition-appearance";
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function init(){
 const body=document.body;
 if(!body||body.classList.contains("vdl-html-edition-modern"))return;
 body.classList.add("vdl-html-edition-modern");
 const toolbar=make("div","vdl-legacy-top");
 toolbar.setAttribute("role","group");
 toolbar.setAttribute("aria-label","Controles comunes de lectura de Bibliotheca");
 const label=make("span","vdl-legacy-label","Bibliotheca · Lectura");
 toolbar.append(label);
 const home=make("a",null,"← Bibliotheca");home.href="../bibliotheca-graeca-latina.html";toolbar.append(home);
 const record=make("a",null,"Ficha académica");record.href="../classics-work-record.html?work="+encodeURIComponent(work);toolbar.append(record);
 const editions=make("select");editions.setAttribute("aria-label","Seleccionar edición o idioma de esta obra");
 editions.add(new Option("Edición: "+language.toUpperCase(),location.pathname.split("/").pop()));
 const picker=make("label",null,"Ediciones ");picker.append(editions);toolbar.append(picker);
 const smaller=make("button",null,"A−"),larger=make("button",null,"A+");
 smaller.type=larger.type="button";smaller.setAttribute("aria-label","Reducir tamaño de letra");larger.setAttribute("aria-label","Aumentar tamaño de letra");
 const number=make("output",null,"20 px");number.style.minWidth="45px";
 const theme=make("button",null,"Noche");theme.type="button";theme.setAttribute("aria-pressed","false");
 const print=make("button",null,"Imprimir");print.type="button";print.addEventListener("click",()=>window.print());
 toolbar.append(smaller,number,larger,theme,print);
 body.insertBefore(toolbar,body.firstChild);
 // Keep editor's paratext in place; only group existing reading content if it
 // is already a clear <main>. Never reparent unstructured Gutenberg pages.
 const reader=body.querySelector(":scope > main");
 if(reader)reader.classList.add("vdl-legacy-reading-region");
 let size=20,night=false;
 try{const val=JSON.parse(localStorage.getItem(KEY)||"{}");if(val&&Number.isFinite(val.size))size=Math.min(34,Math.max(14,val.size));night=Boolean(val.night)}catch{}
 function apply(){
  body.style.setProperty("--vdl-legacy-text-size",size+"px");
  number.textContent=size+" px";
  body.classList.toggle("vdl-legacy-night",night);
  theme.setAttribute("aria-pressed",String(night));theme.textContent=night?"Día":"Noche";
  try{localStorage.setItem(KEY,JSON.stringify({size,night}))}catch{}
 }
 smaller.addEventListener("click",()=>{size=Math.max(14,size-2);apply()});
 larger.addEventListener("click",()=>{size=Math.min(34,size+2);apply()});
 theme.addEventListener("click",()=>{night=!night;apply()});
 editions.addEventListener("change",()=>{if(editions.value)location.href=editions.value});
 apply();
 if(!work)return;
 fetch("../data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro HTTP "+r.status);return r.json()}).then(j=>{
  const works=(j.entries||[]).filter(e=>e.workId===work&&e.format==="html-text"&&/^corpus\/[a-z0-9/_-]+\.html$/.test(e.path||""));
  if(!works.length)return;
  editions.replaceChildren();
  for(const e of works){
   const o=new Option((e.language==="la"?"Latín original":e.language==="grc"?"Griego original":e.language==="en"?"English":e.language==="es"?"Castellano":e.language==="fr"?"Français":e.language.toUpperCase())+" · "+e.title,e.path.replace(/^corpus\//,""));
   editions.add(o);
  }
  const current=location.pathname.split("/").pop();
  if([...editions.options].some(o=>o.value===current))editions.value=current;
 }).catch(()=>{/* The current edition always remains readable. */});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();