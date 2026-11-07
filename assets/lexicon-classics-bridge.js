/* Lexicon → Bibliotheca: on-demand exact full-text search across registered editions.
   No fabricated lemmata, translations, or alignment. Uses the same registry as Vitruvia.
 */
(()=>{
"use strict";
const input=document.getElementById("lx-q"),results=document.getElementById("lx-results");
if(!input||!results)return;
const parent=document.createElement("section");parent.id="lx-classics-bridge";
parent.style.cssText="margin:14px 0;padding:14px;background:#0c0c0c;color:#f4f1eb;border:1px solid #857250;border-radius:7px";
const title=document.createElement("h3");title.textContent="Bibliotheca · búsqueda en todas las ediciones indexadas";
title.style.cssText="font:600 17px/1.4 Georgia,serif;margin:0 0 8px";
const note=document.createElement("p");note.textContent="Buscar la forma exacta en los textos clásicos griegos, latinos y las traducciones alojadas. No sustituye la lematización de Lexicon ni supone que las versiones estén alineadas por loci.";
note.style.cssText="font:13px/1.5 system-ui;margin:0 0 9px;color:#ccc";
const button=document.createElement("button");button.type="button";button.textContent="Buscar término en el corpus completo";
button.style.cssText="background:#223b50;color:#fff;border:1px solid #b5a177;border-radius:4px;padding:9px 12px;cursor:pointer";
const status=document.createElement("p");status.setAttribute("role","status");status.style.cssText="font:12px/1.5 system-ui;color:#c9c0ad;margin:10px 0";
const list=document.createElement("div");list.style.cssText="display:grid;gap:9px";
parent.append(title,note,button,status,list);
const grid=results.closest(".results-grid");
if(grid)grid.parentNode.insertBefore(parent,grid);else results.parentNode.insertBefore(parent,results);
let serial=0;
const safeUrl=value=>{try{const u=new URL(value,location.href);return ["http:","https:"].includes(u.protocol)?u.href:null}catch{return null}};
function addResult(row){
 const card=document.createElement("article");card.style.cssText="border:1px solid #5d5344;border-radius:4px;padding:10px 12px;background:#141414";
 const link=document.createElement("a");link.textContent=row.title||"Texto clásico";link.href=safeUrl(row.link)||"bibliotheca-graeca-latina.html";link.style.cssText="color:#f1d398;font-weight:600";
 const meta=document.createElement("p");meta.textContent=[row.language?.toUpperCase(),row.meta].filter(Boolean).join(" · ");meta.style.cssText="font:12px/1.5 system-ui;color:#bdb6ac;margin:5px 0";
 const excerpt=document.createElement("p");excerpt.textContent=row.excerpt||"";excerpt.style.cssText="font:14px/1.55 Georgia,serif;margin:5px 0";
 card.append(link,meta,excerpt);list.append(card);
}
async function execute(){
 const q=input.value.trim();const token=++serial;list.replaceChildren();
 if(q.length<3){status.textContent="Escriba al menos tres caracteres para consultar los textos indexados.";return}
 if(!window.ClassicsCorpusSearch){status.textContent="El motor de textos clásicos no está disponible.";return}
 button.disabled=true;status.textContent="Buscando testimonios textuales registrados…";
 try{
  const rows=await window.ClassicsCorpusSearch.search(q,{limit:32});
  if(token!==serial)return;
  rows.forEach(addResult);
  status.textContent=rows.length?rows.length+" ediciones con coincidencias documentadas. Abra cada ficha para consultar su locus y procedencia.":"No se encontraron coincidencias literales en las ediciones actualmente indexadas; no implica ausencia en obras aún no transcritas.";
 }catch(error){if(token===serial)status.textContent="No se pudo completar la búsqueda: "+String(error.message||error)}
 finally{if(token===serial)button.disabled=false}
}
button.addEventListener("click",execute);
input.addEventListener("input",()=>{serial++;button.disabled=false;list.replaceChildren();status.textContent="Pulse «Buscar término en el corpus completo» para consultar el registro.";});
status.textContent="Consulta bajo demanda: no se cargan todas las ediciones al abrir Lexicon.";
})();
