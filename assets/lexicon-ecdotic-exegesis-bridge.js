/* Vitruvia Lexicon: expediente ecdótico-exegético por locus.
 * No modifica corpus, códices ni ediciones. Datos locales: no certifica variantes.
 */
(()=>{"use strict";
const KEY="vitruvia-lexicon-notebook-v1";
const $=s=>document.querySelector(s);
const asLocus=raw=>{
 let s=String(raw||"").trim().replace(/^Vitr(?:uvius)?\.?\s*/i,"");
 let m=s.match(/^([IVX]+)\.(\d+)\.(\d+)$/i);
 if(m){const v={I:1,V:5,X:10},r=m[1].toUpperCase();let n=0;for(let i=0;i<r.length;i++)n+=(v[r[i+1]]||0)>v[r[i]]?-v[r[i]]:v[r[i]];s=n+"."+m[2]+"."+m[3]}
 return /^(?:[1-9]|10)\.\d+\.\d+$/.test(s)?s:null;
};
const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[]}catch{return []}};
function create(type,attrs={},value=""){const x=document.createElement(type);Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));x.textContent=value;return x}
function status(s){const x=$("#ecdotic-bridge-status");if(x)x.textContent=s}
function transfer(){
 const loc=asLocus($("#col-locus")?.value),base=$("#col-base")?.value?.trim();
 if(!loc)return status("Indique un locus válido: 3.1.2 o III.1.2.");
 if(!base)return status("Primero cargue un texto base y ejecute la colación.");
 if(!$("#col-out")?.textContent?.trim())return status("Ejecute primero «Colacionar».");
 const sig=$("#col-base-sig")?.value?.trim()||"Base";
 const wits=[...document.querySelectorAll("#col-wits .col-wit")].map(x=>({sig:x.querySelector(".col-sig")?.value?.trim(),hasText:!!x.querySelector("textarea")?.value?.trim()})).filter(x=>x.sig&&x.hasText);
 if(!wits.length)return status("Añada al menos un testimonio y ejecute la colación.");
 const cite="Vitr. "+loc,items=load(),current=items.find(x=>x.cite===cite);
 if(current&&!confirm("Ya hay un comentario de "+cite+". ¿Actualizar solo su registro ecdótico sin borrar las notas?"))return;
 const evidence="Colación automática, sin revisión de testimonios originales. Base: "+sig+"; cotejados: "+wits.map(w=>w.sig).join(", ")+". Normalización: "+[
  $("#col-case")?.checked?"sin distinción de mayúsculas":"mayúsculas conservadas",
  $("#col-uv")?.checked?"u/v e i/j normalizadas":"u/v e i/j conservadas",
  $("#col-ortho")?.checked?"grafías equivalentes":"variantes ortográficas conservadas"
 ].join("; ")+". Fuente, signatura, folio y edición deben verificarse antes de atribuir variantes a manuscritos.";
 // Mantener el texto latino intacto. El registro de procedencia es un campo separado.
 if(current){current.collationEvidence=evidence;current.collationUpdated=new Date().toISOString()}
 else items.unshift({id:Date.now(),cite,text:base,lang:"la",notes:{},collationEvidence:evidence,collationUpdated:new Date().toISOString()});
 try{localStorage.setItem(KEY,JSON.stringify(items))}catch{return status("No se pudo guardar. Compruebe el espacio disponible del navegador.")}
 status("Expediente "+cite+" guardado. Abra el Cuaderno para comentarlo; exporte además el aparato TEI desde el Taller.");
 // El módulo central mantiene su propio render; recargar permite que lo lea sin alterar sus interfaces.
 location.href=location.pathname+location.search+"#exegesis";location.reload();
}
function init(){
 const sec=$("#collatio"),buttons=sec?.querySelector(".actions");if(!buttons||$("#ecdotic-bridge-transfer"))return;
 const b=create("button",{type:"button",id:"ecdotic-bridge-transfer",class:"lx-btn"},"Transferir al Cuaderno Exegético");
 b.addEventListener("click",transfer);buttons.append(b);
 const help=create("p",{class:"explain",id:"ecdotic-bridge-status","aria-live":"polite"},"Vinculación por locus; una diferencia de OCR o de edición no es una variante manuscrita certificada.");
 buttons.after(help);
 const notebook=$("#nb-list");if(!notebook)return;
 const decorate=()=>{
  const all=load();for(const art of notebook.querySelectorAll(".lx-nb-item")){
   if(art.querySelector(".ecdotic-source-note"))continue;
   const cite=art.querySelector("h4")?.textContent,entry=all.find(x=>x.cite===cite);
   if(!entry?.collationEvidence)continue;
   const p=create("p",{class:"explain ecdotic-source-note"},entry.collationEvidence);
   art.querySelector("header")?.after(p);
  }
 };
 new MutationObserver(decorate).observe(notebook,{childList:true});decorate();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();