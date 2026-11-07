/* Lexicon → Bibliotheca: on-demand exact full-text search across registered editions.
   No fabricated lemmata, translations, or alignment. Uses the same registry as Vitruvia.
 */
(()=>{
"use strict";
const input=document.getElementById("lx-q"),results=document.getElementById("lx-results");
if(!input||!results)return;
const parent=document.createElement("section");parent.id="lx-classics-bridge";
parent.className="lx-library-bridge";
const title=document.createElement("h3");title.textContent="Bibliotheca · búsqueda en todas las ediciones indexadas";
title.className="lx-library-heading";
const note=document.createElement("p");note.textContent="Buscar la forma exacta en los textos clásicos griegos, latinos y las traducciones alojadas. No sustituye la lematización de Lexicon ni supone que las versiones estén alineadas por loci.";
note.className="lx-library-note";
const button=document.createElement("button");button.type="button";button.textContent="Buscar término en el corpus completo";
button.className="lx-library-button";
const semantic=document.createElement("button");semantic.type="button";semantic.textContent="Buscar conceptos documentados";semantic.className="lx-library-button";
const status=document.createElement("p");status.setAttribute("role","status");status.className="lx-library-status";
const list=document.createElement("div");list.className="lx-library-list";
const controls=document.createElement("div");controls.className="lx-library-actions";controls.append(button,semantic);
parent.append(title,note,controls,status,list);
const grid=results.closest(".results-grid");
if(grid)grid.parentNode.insertBefore(parent,grid);else results.parentNode.insertBefore(parent,results);
let serial=0;
const safeUrl=value=>{try{const u=new URL(value,location.href);return ["http:","https:"].includes(u.protocol)?u.href:null}catch{return null}};
function addResult(row){
 const card=document.createElement("article");card.className="lx-library-result";
 const link=document.createElement("a");link.textContent=row.title||"Texto clásico";link.href=safeUrl(row.link)||"bibliotheca-graeca-latina.html";link.className="lx-library-result-link";
 const meta=document.createElement("p");meta.textContent=[row.language?.toUpperCase(),row.meta].filter(Boolean).join(" · ");meta.className="lx-library-meta";
 const excerpt=document.createElement("p");excerpt.textContent=row.excerpt||"";excerpt.className="lx-library-excerpt";
 card.append(link,meta,excerpt);list.append(card);
}
async function execute(mode="literal"){
 const q=input.value.trim();const token=++serial;list.replaceChildren();
 if(q.length<3){status.textContent="Escriba al menos tres caracteres para consultar los textos indexados.";return}
 if(!window.ClassicsCorpusSearch){status.textContent="El motor de textos clásicos no está disponible.";return}
 button.disabled=true;semantic.disabled=true;status.textContent="Buscando testimonios textuales registrados…";
 try{
  const rows=mode==="semantic"?await window.ClassicsCorpusSearch.semanticSearch(q,{limit:32}):await window.ClassicsCorpusSearch.search(q,{limit:32});
  if(token!==serial)return;
  rows.forEach(addResult);
  status.textContent=rows.length?rows.length+" ediciones con "+(mode==="semantic"?"correspondencias conceptuales editoriales":"coincidencias literales")+" comprobables. Consulte cada locus y su procedencia.":mode==="semantic"?"No hay correspondencias conceptuales registradas para esta consulta. No implica que el concepto esté ausente de los textos.":"No se encontraron coincidencias literales en las ediciones actualmente indexadas; no implica ausencia en obras aún no transcritas.";
 }catch(error){if(token===serial)status.textContent="No se pudo completar la búsqueda: "+String(error.message||error)}
 finally{if(token===serial){button.disabled=false;semantic.disabled=false}}
}
button.addEventListener("click",()=>execute("literal"));
semantic.addEventListener("click",()=>execute("semantic"));
// A Lexicon search must also retrieve literal attestations; a missing dictionary headword is not absence from the corpus.
document.getElementById("lx-form")?.addEventListener("submit",()=>{if(input.value.trim().length>=3)execute("literal")});
input.addEventListener("input",()=>{serial++;button.disabled=false;semantic.disabled=false;list.replaceChildren();status.textContent="Pulse «Buscar término en el corpus completo» para consultar el registro.";});
status.textContent="Consulta bajo demanda: no se cargan todas las ediciones al abrir Lexicon.";
// Deep links with an actual term should produce attested corpus results automatically.
// Delay until the parent Lexicon has populated its search control.
const initial=new URLSearchParams(location.search).get("q");
if(initial&&initial.trim().length>=3){
 if(!input.value.trim())input.value=initial;
 execute("literal");
}
})();
