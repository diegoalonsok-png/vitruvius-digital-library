/* Búsqueda de palabras y frases en originales griegos y latinos y traducciones alojadas, desde el buscador
   de la Bibliotheca: lista las obras con coincidencias y abre el lector con la palabra resaltada. */
(()=>{
"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn()}
ready(()=>{
 const input=document.getElementById("classic-query"),controls=document.querySelector(".classic-controls");
 if(!input||!controls||!window.ClassicsCorpusSearch)return;
 const box=document.createElement("div");box.id="classic-fulltext";box.className="classic-fulltext";box.setAttribute("role","status");box.setAttribute("aria-live","polite");
 const st=document.createElement("style");
 st.textContent=`.classic-fulltext{font:13px/1.55 system-ui,-apple-system,sans-serif;margin:8px 0 0}.classic-fulltext:empty{display:none}
.classic-fulltext strong{font-weight:600}.classic-fulltext ul{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.classic-fulltext a{display:inline-block;border:1px solid #c7bba8;border-radius:3px;padding:4px 9px;text-decoration:none;color:inherit;background:#fffdf8}
.classic-fulltext a:hover{border-color:#8c6c39}
.classic-fulltext .classic-fulltext-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:8px;max-height:550px;overflow:auto}
.classic-fulltext .classic-fulltext-list li{min-width:0}
.classic-fulltext .classic-fulltext-list a{display:block;min-height:100px}
.classic-fulltext .classic-fulltext-list small{display:block;font:12px/1.5 system-ui;margin-top:5px}.classic-fulltext mark{background:#ffe45c;color:#14120e;padding:0 2px;border-radius:2px}
html[data-theme=dark] .classic-fulltext a{background:#263d50;border-color:#728396}`;
 document.head.append(st);controls.after(box);
 const selector=document.createElement("label");selector.textContent="Búsqueda dentro de los textos";
 selector.style.cssText="font:600 12px system-ui;display:flex;flex-direction:column;gap:5px;min-width:200px";
 const mode=document.createElement("select");mode.id="classic-fulltext-mode";mode.setAttribute("aria-label","Búsqueda léxica o semántica del corpus");
 for(const [value,name] of [["literal","Palabra o frase · búsqueda textual"],["semantic","Conceptus · equivalencias semánticas documentadas"]]){
  const option=document.createElement("option");option.value=value;option.textContent=name;mode.append(option);
 }
 mode.style.cssText="min-height:44px;padding:8px;background:#fff;color:#203548;border:1px solid #a7a395";
 selector.append(mode);controls.append(selector);
 let timer=0,serial=0;
 async function run(){
  const q=input.value.trim(),me=++serial;
  if(q.replace(/[^\p{L}]/gu,"").length<3||q.split(/\s+/).length>4){box.replaceChildren();return}
  box.textContent="Buscando «"+q+"» en las versiones textuales indexadas…";
  const semantic=mode.value==="semantic";
  let rows=[];
  try{rows=semantic?await window.ClassicsCorpusSearch.semanticSearch(q,{limit:60}):await window.ClassicsCorpusSearch.search(q,{limit:60})}catch(err){if(me===serial)box.textContent="No se pudo consultar el índice textual: "+err.message;return}if(me!==serial)return;
  const coverage=window.ClassicsCorpusSearch.diagnostics?.()||{failed:0,mode:"unknown"};
  box.replaceChildren();
  if(!rows.length&&semantic){box.textContent="No se halló una equivalencia editorial registrada con coincidencias textuales. Solo se buscan términos recogidos en Conceptus; "+(coverage.failed?coverage.failed+" fuentes no se pudieron cargar. ":"")+"esto no demuestra ausencia del concepto en una obra.";return}
  if(!rows.length){box.textContent=coverage.failed?"Búsqueda incompleta: "+coverage.failed+" fuentes no pudieron cargarse. No se puede descartar que exista el término.":"«"+q+"» no aparece en las versiones textuales que fueron examinadas (búsqueda literal, sin diacríticos).";return}
  const head=document.createElement("p");head.style.margin="0";
  head.append(document.createTextNode(semantic?"Concepto documentado: ":"Palabra o frase en los textos: "),Object.assign(document.createElement("mark"),{textContent:q}),document.createTextNode(" · "+rows.reduce((n,r)=>n+(r.count||0),0)+" coincidencias en originales y traducciones locales. Abre la edición identificada para ver la frase. "+(coverage.failed?"Aviso: "+coverage.failed+" fuentes no se cargaron; resultados parciales.":"")));
  if(semantic)head.append(document.createTextNode(" · "+(coverage.concept?"Conceptus: "+coverage.concept+" · ":"")+"Equivalencias editoriales en textos realmente indexados; no es IA vectorial ni lematización certificada."));
  const ul=document.createElement("ul");ul.className="classic-fulltext-list";
  for(const r of rows){
   const li=document.createElement("li"),a=document.createElement("a");
   a.href=r.link;
   const heading=document.createElement("strong");heading.textContent=r.title;
   const detail=document.createElement("small");
   detail.textContent=(r.units||0)+" loci/pasajes · "+(r.count||0)+" coincidencias"+
    (semantic&&r.matchedTerm?" · término: "+r.matchedTerm:"");
   const excerpt=document.createElement("span");excerpt.textContent=r.excerpt||"";
   excerpt.style.cssText="display:block;font:12px/1.45 Georgia,serif;margin-top:5px;opacity:.85;overflow-wrap:anywhere";
   a.append(heading,detail,excerpt);li.append(a);ul.append(li)
  }
  box.append(head,ul);
  // Sin obras por título o autor: se retira el aviso vacío del desplegable para dejar visibles los resultados del texto.
  const list=document.getElementById("classic-search-suggestions");
  if(list&&!list.hidden&&list.querySelector(".classic-suggestion-empty")&&!list.querySelector(".classic-suggestion")){list.hidden=true;input.setAttribute("aria-expanded","false")}
 }
 mode.addEventListener("change",()=>{if(input.value.trim())run()});
 input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(run,650)});
 input.addEventListener("keydown",e=>{if(e.key==="Enter"){clearTimeout(timer);run()}});
 const sp=new URLSearchParams(location.search),t=sp.get("term");
 // Sin obra elegida, «term» abre directamente la búsqueda de la palabra en todos los textos.
 if(t&&!sp.get("work")){input.value=t;setTimeout(run,300)}
});
})();
