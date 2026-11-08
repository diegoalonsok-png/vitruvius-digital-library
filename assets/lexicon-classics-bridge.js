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
function markedExcerpt(node,excerpt){
 // «...» are generated from source text by the literal search engine.
 // Put markup only around the actual attested fragment, never treat it as HTML.
 const parts=String(excerpt||"").split(/(«[^»]+»)/g);
 for(const part of parts){
  if(/^«[^»]+»$/.test(part)){
   const mark=document.createElement("mark");mark.className="lx-library-highlight";mark.textContent=part.slice(1,-1);node.append(mark);
  }else node.append(document.createTextNode(part));
 }
}
function addResult(row){
 const card=document.createElement("article");card.className="lx-library-result";
 const top=document.createElement("p");top.className="lx-library-meta";
 top.textContent=[row.language?.toUpperCase(),row.edition,row.ocr?"OCR histórico, no cotejado":""].filter(Boolean).join(" · ");
 const passage=document.createElement("a");passage.className="lx-library-result-link";
 passage.href=safeUrl(row.link)||"bibliotheca-graeca-latina.html";
 passage.textContent=[row.author,row.title,row.locus].filter(Boolean).join(" · ")||"Pasaje clásico";
 const count=document.createElement("small");count.className="lx-library-count";
 count.textContent=" · "+row.hitsInPassage+" coincidencia"+(row.hitsInPassage===1?"":"s")+" en este pasaje";
 const excerpt=document.createElement("p");excerpt.className="lx-library-excerpt";excerpt.lang=row.language==="grc"?"grc":row.language==="la"?"la":row.language||"";
 markedExcerpt(excerpt,row.excerpt);
 card.append(passage,count,top,excerpt);list.append(card);
}
function addSummaryResult(row){
 const card=document.createElement("article");card.className="lx-library-result";
 const a=document.createElement("a");a.className="lx-library-result-link";a.href=safeUrl(row.link)||"bibliotheca-graeca-latina.html";a.textContent=row.title||"Texto clásico";
 const desc=document.createElement("p");desc.className="lx-library-meta";desc.textContent=[row.language?.toUpperCase(),row.meta].filter(Boolean).join(" · ");
 const excerpt=document.createElement("p");excerpt.className="lx-library-excerpt";excerpt.textContent=row.excerpt||"";
 card.append(a,desc,excerpt);list.append(card);
}
async function execute(mode="literal"){
 const q=input.value.trim(),token=++serial;list.replaceChildren();
 if(!/[\p{L}]/u.test(q)){status.textContent="Escriba una palabra griega o latina para consultar los textos indexados.";return}
 if(!window.ClassicsCorpusSearch){status.textContent="El motor de textos clásicos no está disponible.";return}
 button.disabled=true;semantic.disabled=true;status.textContent="Buscando pasajes en las ediciones indexadas…";
 try{
  if(mode==="semantic"){
   const rows=await window.ClassicsCorpusSearch.semanticSearch(q,{limit:32});
   if(token!==serial)return;
   rows.forEach(addSummaryResult);
   status.textContent=rows.length?rows.length+" ediciones con correspondencias conceptuales documentadas. Es una búsqueda diferente del recuento literal y de la lematización.":"No se registraron correspondencias conceptuales para este término.";
  }else{
   // Passage-level retrieval: source loci and actual occurrences, not only one preview per edition.
   const greek=/[Ͱ-Ͽἀ-῿]/u.test(q);
   const rows=await window.ClassicsCorpusSearch.searchPassages(q,{limit:160,maxPerEdition:12,language:greek?"grc":""});
   if(token!==serial)return;
   const counts=new Map();
   for(const row of rows){const key=[row.workId,row.language,row.edition,row.source].join("|");counts.set(key,(counts.get(key)||0)+1)}
   const editionCount=counts.size;
   rows.forEach(addResult);
   const diagnostic=window.ClassicsCorpusSearch.diagnostics?.()||{};
   status.textContent=rows.length?
    rows.length+" pasajes mostrados de "+editionCount+" ediciones indexadas, con referencia y término resaltado. La lista tiene un límite de visualización; el recuento por lema de Lexicon se calcula por separado.":
    "No se encontraron pasajes con esta grafía literal en las ediciones consultadas. Esto no equivale a ausencia del lema o de sus formas flexionadas.";
   if(diagnostic.failed)status.textContent+=" "+diagnostic.failed+" fuentes no pudieron cargarse; el resultado puede ser incompleto.";
  }
 }catch(error){if(token===serial)status.textContent="No se pudo completar la búsqueda: "+String(error.message||error)}
 finally{if(token===serial){button.disabled=false;semantic.disabled=false}}
}
button.addEventListener("click",()=>execute("literal"));
semantic.addEventListener("click",()=>execute("semantic"));
window.addEventListener("vitruvia:lexicon-search",event=>{
 const q=String(event.detail?.query||"").trim();
 if(/[\p{L}]/u.test(q)&&q===input.value.trim())execute("literal");
});
// A Lexicon search must also retrieve literal attestations; a missing dictionary headword is not absence from the corpus.
document.getElementById("lx-form")?.addEventListener("submit",()=>{if(/[\p{L}]/u.test(input.value.trim()))execute("literal")});
input.addEventListener("input",()=>{serial++;button.disabled=false;semantic.disabled=false;list.replaceChildren();status.textContent="Pulse «Buscar término en el corpus completo» para consultar el registro.";});
status.textContent="Consulta bajo demanda: no se cargan todas las ediciones al abrir Lexicon.";
// Deep links with an actual term should produce attested corpus results automatically.
// Delay until the parent Lexicon has populated its search control.
const initial=new URLSearchParams(location.search).get("q");
if(initial&&/[\p{L}]/u.test(initial.trim())){
 if(!input.value.trim())input.value=initial;
 execute("literal");
}
})();
