/* Interoperabilidad entre Vitruvius, Vitruvia, Lexicon e Index locorum.
   Preserva el término y la obra al cambiar de herramienta. No crea alineaciones ni loci. */
(()=>{
"use strict";
if(window.top!==window.self||new URLSearchParams(location.search).get("embed")==="1")return;
const page=location.pathname.split("/").pop().toLowerCase();
const applicable=new Set(["vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html","index-locorum.html"]);
if(!applicable.has(page))return;
const start=()=>{if(document.getElementById("research-crosslinks"))return;
 const input=document.querySelector(page==="vitruvia.html"?"#query":page==="vitruvia-lexicon.html"?"#lx-q":page==="bibliotheca-graeca-latina.html"?"#classic-query":page==="classics-text-reader.html"?"#query":page==="index-locorum.html"?"#query":"#term");
 const section=document.createElement("nav");section.id="research-crosslinks";section.setAttribute("aria-label","Investigar el mismo término en las plataformas conectadas");
 section.className="research-crosslinks-neutral";
 const style=document.createElement("style");style.id="research-crosslinks-neutral-style";style.textContent=`
 #research-crosslinks.research-crosslinks-neutral{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;margin:11px 0 19px;padding:10px 0;background:transparent!important;border:0!important;border-top:1px solid rgba(143,148,153,.28)!important;border-radius:0!important;box-shadow:none!important;color:inherit;font:400 12px/1.55 system-ui,sans-serif;position:relative;z-index:1}
 #research-crosslinks .research-crosslinks-title{flex:0 1 auto;font:600 12px/1.5 system-ui,sans-serif;opacity:.7}
 #research-crosslinks .research-crosslinks-link{display:inline-flex;align-items:center;min-height:30px;padding:2px 0;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:inherit;text-decoration:underline;text-decoration-color:rgba(135,145,155,.55);text-underline-offset:3px;font:500 12px/1.45 system-ui,sans-serif}
 #research-crosslinks .research-crosslinks-link:hover{text-decoration-color:currentColor}
 #research-crosslinks .research-crosslinks-link[aria-current=page]{text-decoration:none;opacity:.55}
 #research-crosslinks .research-crosslinks-note{flex-basis:100%;font:400 11px/1.4 system-ui,sans-serif;opacity:.67}
 @media(max-width:650px){#research-crosslinks.research-crosslinks-neutral{gap:4px 11px}#research-crosslinks .research-crosslinks-title{flex-basis:100%}}
 `;document.head.append(style);

 const title=document.createElement("strong");title.textContent="Investigación académica conectada";title.className="research-crosslinks-title";section.append(title);
 const links=[["Vitruvius · Biblioteca","bibliotheca-graeca-latina.html"],["Vitruvia · Buscador","vitruvia.html"],["Lexicon · Lengua","vitruvia-lexicon.html"],["Index locorum","index-locorum.html"],["Laboratorio de escrituras","laboratorio-escrituras.html"]];
 const anchors=links.map(([name,href])=>{const a=document.createElement("a");a.textContent=name;a.href=href;a.className="research-crosslinks-link";if(page===href)a.setAttribute("aria-current","page");section.append(a);return a});
 const info=document.createElement("span");info.className="research-crosslinks-note";info.textContent="Los enlaces conservan el término y la obra cuando están disponibles. Las correspondencias entre ediciones requieren verificación.";section.append(info);
 const ctx=()=>{const qs=new URLSearchParams(location.search),typed=(input?.value||"").trim().slice(0,180);return {q:typed||qs.get("q")||qs.get("term")||"",work:(page==="index-locorum.html"?document.getElementById("work")?.value:"")||qs.get("work")||"",locus:qs.get("locus")||"",lang:qs.get("lang")||""}};
 function refresh(){const {q,work,locus,lang}=ctx();
  anchors.forEach((a,i)=>{const u=new URL(links[i][1],location.href);
   if(i===0){if(work)u.searchParams.set("work",work);if(q)u.searchParams.set("term",q)}
   if(i===1&&q)u.searchParams.set("q",q);
   if(i===2&&q){u.searchParams.set("q",q);u.searchParams.set("mode","palabra")}
   if(i===3){if(work)u.searchParams.set("work",work);if(q)u.searchParams.set("q",q)}
   if(i===4&&q)u.searchParams.set("q",q);
   a.href=u.pathname+u.search;
  });
 }
 const main=document.querySelector("main");const anchor=page==="vitruvia.html"?document.querySelector("#search-form"):page==="vitruvia-lexicon.html"?document.querySelector("#lx-form"):page==="bibliotheca-graeca-latina.html"?document.querySelector(".classic-controls"):page==="index-locorum.html"?document.querySelector(".controls"):page==="classics-text-reader.html"?document.querySelector(".tools"):document.querySelector("#find-form");
 if(anchor&&main?.contains(anchor))anchor.after(section);else if(main)main.prepend(section);else document.body.append(section);
 input?.addEventListener("input",refresh);
 input?.addEventListener("change",refresh);
 document.getElementById("work")?.addEventListener("change",refresh);
 section.addEventListener("click",refresh);
 section.addEventListener("pointerdown",refresh);
 section.addEventListener("focusin",refresh);
 refresh();
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
