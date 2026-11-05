/* Barra común entre la biblioteca, sus lectores, la Bibliotheca clásica y Vitruvia.
   Escritorio: una línea fina de texto sobre la cabecera. Celular: línea fija inferior, estilo app.
   Toma los colores de la página (tema claro u oscuro) y no aparece dentro de visores incrustados. */
(()=>{
"use strict";
if(window.top!==window.self||/[?&]embed=1\b/.test(location.search)||document.querySelector(".site-bar"))return;
const me=document.currentScript?.src||"";const root=me.replace(/assets\/site-bar\.js.*$/,"");
const LINKS=[
 ["Biblioteca","Inicio","index.html"],
 ["Lector bilingüe","Lector","lector-bilingue.html"],
 ["Codex H","Codex H","codex-h-folios-local.html"],
 ["Índices y colación","Índices","indices-locorum.html",["lexicon-vitruvianum.html","colacion.html","termino.html","loci.html","comparador-loci.html"]],
 ["Bibliotheca clásica","Clásicos","bibliotheca-graeca-latina.html",["classics-text-reader.html"]],
 ["Vitruvia","Vitruvia","vitruvia.html"]
];
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn()}
ready(()=>{
 const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
 const current=LINKS.findIndex(([, ,u,also])=>u===page||(also||[]).includes(page));
 const nav=document.createElement("nav");nav.className="site-bar";nav.setAttribute("aria-label","Secciones de la biblioteca");
 LINKS.forEach(([long,short,u],i)=>{
  const a=document.createElement("a");a.href=root+u;a.innerHTML='<span class="sb-long"></span><span class="sb-short"></span>';
  a.querySelector(".sb-long").textContent=long;a.querySelector(".sb-short").textContent=short;
  if(i===current)a.setAttribute("aria-current","page");nav.append(a);
 });
 const st=document.createElement("style");st.id="site-bar-style";
 st.textContent=`.site-bar{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 26px;padding:8px 16px;font:500 10.5px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid rgba(150,130,95,.32);position:relative;z-index:40}
.site-bar a{color:inherit;text-decoration:none;opacity:.72;padding:2px 0;border-bottom:1px solid transparent;transition:opacity .15s}
.site-bar a:hover,.site-bar a:focus-visible{opacity:1}
.site-bar a[aria-current=page]{opacity:1;border-bottom-color:#C9A84C}
.site-bar .sb-short{display:none}
@media (max-width:760px){
 .site-bar{position:fixed;left:0;right:0;bottom:0;z-index:8500;justify-content:space-around;flex-wrap:nowrap;gap:0;padding:9px 6px calc(9px + env(safe-area-inset-bottom));letter-spacing:.04em;text-transform:none;font-size:11.5px;border-bottom:0;border-top:1px solid rgba(150,130,95,.35);background:var(--sb-bg);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
 .site-bar .sb-long{display:none}.site-bar .sb-short{display:inline}
 .site-bar a{padding:3px 4px;border-bottom:0;border-top:2px solid transparent}
 .site-bar a[aria-current=page]{border-top-color:#C9A84C;font-weight:700}
 body{padding-bottom:calc(46px + env(safe-area-inset-bottom))}
 .research-folder-fab,.cl-findbar{bottom:calc(58px + env(safe-area-inset-bottom))!important}
}
@media print{.site-bar{display:none!important}}`;
 document.head.append(st);
 // Fondo de la barra inferior: el color de fondo real de la página, levemente translúcido.
 const paint=()=>{let c=getComputedStyle(document.body).backgroundColor;if(!c||c==="rgba(0, 0, 0, 0)"||c==="transparent")c=getComputedStyle(document.documentElement).backgroundColor;
  const m=c.match(/\d+(\.\d+)?/g)||[246,243,237];nav.style.setProperty("--sb-bg",`rgba(${m[0]},${m[1]},${m[2]},.94)`)};
 const skip=document.querySelector("a.skip,.skip-link");
 if(skip)skip.after(nav);else document.body.prepend(nav);
 paint();new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:["class","data-theme","style"]});
 new MutationObserver(paint).observe(document.body,{attributes:true,attributeFilter:["class","data-theme","style"]});
});
})();
