/* Interoperabilidad entre Vitruvius, Vitruvia, Lexicon e Index locorum.
   Preserva el término y la obra al cambiar de herramienta. No crea alineaciones ni loci. */
(()=>{
"use strict";
if(window.top!==window.self||new URLSearchParams(location.search).get("embed")==="1")return;
const page=location.pathname.split("/").pop().toLowerCase();
const applicable=new Set(["vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html","classics-text-reader.html","index-locorum.html","lector-bilingue.html"]);
if(!applicable.has(page))return;
const start=()=>{if(document.getElementById("research-crosslinks"))return;
 const input=document.querySelector(page==="vitruvia.html"?"#query":page==="vitruvia-lexicon.html"?"#lx-q":page==="bibliotheca-graeca-latina.html"?"#classic-query":page==="classics-text-reader.html"?"#query":page==="index-locorum.html"?"#query":"#term");
 const section=document.createElement("nav");section.id="research-crosslinks";section.setAttribute("aria-label","Investigar el mismo término en las plataformas conectadas");
 section.style.cssText="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:12px 0;padding:10px 14px;border:1px solid #aa946f;border-radius:5px;background:var(--surface,#ece4d6);color:var(--ink,#243849);font:12px/1.5 system-ui,sans-serif;position:relative;z-index:5";
 const title=document.createElement("strong");title.textContent="Investigar en los tres espacios:";section.append(title);
 const links=[["Vitruvius · Biblioteca","bibliotheca-graeca-latina.html"],["Vitruvia · Buscador","vitruvia.html"],["Lexicon · Lengua","vitruvia-lexicon.html"],["Index locorum","index-locorum.html"]];
 const anchors=links.map(([name,href])=>{const a=document.createElement("a");a.textContent=name;a.href=href;a.style.cssText="color:inherit;text-decoration:underline;text-underline-offset:3px";if(page===href)a.setAttribute("aria-current","page");section.append(a);return a});
 const info=document.createElement("span");info.style.opacity=".78";info.textContent="Se conserva la consulta; no se presupone correspondencia entre ediciones.";section.append(info);
 const ctx=()=>{const qs=new URLSearchParams(location.search),typed=(input?.value||"").trim().slice(0,180);return {q:typed||qs.get("q")||qs.get("term")||"",work:qs.get("work")||"",locus:qs.get("locus")||"",lang:qs.get("lang")||""}};
 function refresh(){const {q,work,locus,lang}=ctx();
  anchors.forEach((a,i)=>{const u=new URL(links[i][1],location.href);
   if(i===0){if(work)u.searchParams.set("work",work);else if(q)u.searchParams.set("term",q)}
   if(i===1&&q)u.searchParams.set("q",q);
   if(i===2&&q){u.searchParams.set("q",q);u.searchParams.set("mode","palabra")}
   if(i===3){if(work)u.searchParams.set("work",work);if(q)u.searchParams.set("q",q)}
   a.href=u.pathname+u.search;
  });
 }
 const main=document.querySelector("main");const anchor=page==="vitruvia.html"?document.querySelector("#search-form"):page==="vitruvia-lexicon.html"?document.querySelector("#lx-form"):page==="bibliotheca-graeca-latina.html"?document.querySelector(".classic-controls"):page==="index-locorum.html"?document.querySelector(".controls"):page==="classics-text-reader.html"?document.querySelector(".tools"):document.querySelector("#find-form");
 if(anchor&&main?.contains(anchor))anchor.after(section);else if(main)main.prepend(section);else document.body.append(section);
 input?.addEventListener("input",refresh);
 input?.addEventListener("change",refresh);
 section.addEventListener("pointerdown",refresh);
 section.addEventListener("focusin",refresh);
 refresh();
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
