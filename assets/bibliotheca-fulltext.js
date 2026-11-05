/* Búsqueda de una palabra (griega o latina) dentro de los textos alojados, desde el buscador
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
.classic-fulltext a:hover{border-color:#8c6c39}.classic-fulltext mark{background:#ffe45c;color:#14120e;padding:0 2px;border-radius:2px}
html[data-theme=dark] .classic-fulltext a{background:#263d50;border-color:#728396}`;
 document.head.append(st);controls.after(box);
 let timer=0,serial=0;
 async function run(){
  const q=input.value.trim(),me=++serial;
  if(q.replace(/[^\p{L}]/gu,"").length<3||q.split(/\s+/).length>4){box.replaceChildren();return}
  box.textContent="Buscando «"+q+"» en los textos griegos y latinos del sitio…";
  const rows=await window.ClassicsCorpusSearch.search(q,{limit:12});if(me!==serial)return;
  box.replaceChildren();
  if(!rows.length){box.textContent="«"+q+"» no aparece en los textos alojados en el sitio (búsqueda por palabra, sin diacríticos).";return}
  const head=document.createElement("p");head.style.margin="0";
  head.append(document.createTextNode("Palabra en los textos: "),Object.assign(document.createElement("mark"),{textContent:q}),document.createTextNode(" · "+rows.reduce((n,r)=>n+(r.count||0),0)+" coincidencias. Abra una obra para verla resaltada y consultar el diccionario."));
  const ul=document.createElement("ul");
  for(const r of rows){const li=document.createElement("li"),a=document.createElement("a");
   a.href=r.link.startsWith("corpus/")?r.link:"bibliotheca-graeca-latina.html?work="+encodeURIComponent(r.workId)+"&view=text&term="+encodeURIComponent(q);
   a.textContent=r.title.replace(/ · (\d+)/," · $1");a.title=r.excerpt;li.append(a);ul.append(li)}
  box.append(head,ul);
  // Sin obras por título o autor: se retira el aviso vacío del desplegable para dejar visibles los resultados del texto.
  const list=document.getElementById("classic-search-suggestions");
  if(list&&!list.hidden&&list.querySelector(".classic-suggestion-empty")&&!list.querySelector(".classic-suggestion")){list.hidden=true;input.setAttribute("aria-expanded","false")}
 }
 input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(run,650)});
 input.addEventListener("keydown",e=>{if(e.key==="Enter"){clearTimeout(timer);run()}});
 const t=new URLSearchParams(location.search).get("term");if(t&&!input.value){/* la obra ya se abre con la palabra resaltada */}
});
})();
