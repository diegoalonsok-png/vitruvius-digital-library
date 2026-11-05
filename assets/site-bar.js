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

/* Site-wide reading controls; no modifications to embedded or cross-origin viewers. */
function ensureSelectionAudio(){
 if(!document.querySelector('link[href*="vitruvia-selection-speech.css"]')){
  const style=document.createElement('link');style.rel='stylesheet';
  style.href=root+'assets/vitruvia-selection-speech.css?v=20261105-global-v2';document.head.append(style);
 }
 if(!document.querySelector('script[src*="vitruvia-selection-speech.js"]')){
  const script=document.createElement('script');script.src=root+'assets/vitruvia-selection-speech.js?v=20261105-global-v2';
  script.defer=true;document.head.append(script);
 }
}
function ensureTypography(){
 if(document.getElementById('site-typeface-toggle'))return;
 const families={original:'',georgia:'Georgia, "Times New Roman", serif',palatino:'Palatino, "Book Antiqua", serif',times:'"Times New Roman", Times, serif',arial:'Arial, Helvetica, sans-serif',system:'system-ui, -apple-system, "Segoe UI", sans-serif'};
 const key='vitruvius-global-reading-font-v1';
 let saved={font:'original',italic:false};
 try{const record=JSON.parse(localStorage.getItem(key)||'null');if(record&&families[record.font]!==undefined)saved={font:record.font,italic:record.italic===true}}catch{}
 const style=document.createElement('style');style.id='site-typeface-styles';
 style.textContent=[
  '.site-typeface-tool{position:relative;display:inline-flex;align-items:center;vertical-align:middle}',
  '.site-typeface-button{display:inline-flex;justify-content:center;align-items:center;min-width:36px;min-height:35px;padding:6px 9px;border:1px solid #99896d;border-radius:4px;background:transparent;color:inherit;font:italic 600 19px Georgia,serif;cursor:pointer}',
  '.site-typeface-panel{position:absolute;z-index:15015;top:calc(100% + 6px);right:0;width:min(260px,calc(100vw - 30px));box-sizing:border-box;padding:14px;background:#25282a;border:1px solid #9b927e;color:#f7f3ee;box-shadow:0 10px 32px #0006;font:13px/1.5 system-ui,sans-serif}',
  '.site-typeface-panel[hidden]{display:none!important}',
  '.site-typeface-panel label{display:block;margin:7px 0;color:inherit}',
  '.site-typeface-panel select{display:block;width:100%;margin-top:4px;padding:8px;background:#fff;color:#242424;border:1px solid #999}',
  '.site-typeface-panel input{margin-right:7px}',
  '.site-typeface-panel button{margin-top:7px;padding:7px 10px;border:1px solid #aaa;background:#303d47;color:#fff;cursor:pointer}',
  'html[data-site-reading-font]:not([data-site-reading-font="original"]) main :is(p,li,blockquote,dd,dt,td,th):not([class*=icon]),html[data-site-reading-font]:not([data-site-reading-font="original"]) .classic-read-columns :is(p,li){font-family:var(--site-reading-family)!important}',
  'html[data-site-reading-italic="true"] main :is(p,li,blockquote,dd,dt,td):not([class*=icon]){font-style:italic!important}',
  '@media print{.site-typeface-tool{display:none!important}}'
 ].join('\n');
 document.head.append(style);
 const tool=document.createElement('span');tool.className='site-typeface-tool';
 tool.innerHTML='<button id="site-typeface-toggle" class="site-typeface-button" type="button" aria-label="Elegir tipografía de lectura" title="Tipografía" aria-controls="site-typeface-panel" aria-expanded="false">Aa</button>'+
 '<div id="site-typeface-panel" class="site-typeface-panel" hidden role="group" aria-label="Tipografía de lectura">'+
 '<strong>Tipografía del texto</strong><label>Fuente<select id="site-typeface-select">'+
 '<option value="original">Original</option><option value="georgia">Georgia</option><option value="palatino">Palatino</option><option value="times">Times New Roman</option><option value="arial">Arial</option><option value="system">Sistema</option>'+
 '</select></label><label><input id="site-typeface-italic" type="checkbox"> Cursiva</label>'+
 '<button id="site-typeface-reset" type="button">Restablecer</button></div>';
 const palette=document.getElementById('home-palette-toggle')||document.getElementById('front-background-toggle');
 const theme=document.querySelector('.research-nav-controls .theme-switch, .nav .theme-switch, .theme-switch');
 const anchor=palette?.closest('.home-color-tools, details')||palette||document.querySelector('.classic-view-colorbar')||theme;
 if(anchor?.classList?.contains('classic-view-colorbar'))anchor.append(tool);
 else if(anchor?.parentElement)anchor.after(tool);
 else(document.querySelector('.research-nav-controls')||document.querySelector('header')||document.body).append(tool);
 const button=tool.querySelector('#site-typeface-toggle'),panel=tool.querySelector('#site-typeface-panel'),select=tool.querySelector('#site-typeface-select'),italic=tool.querySelector('#site-typeface-italic');
 function apply(){
  document.documentElement.dataset.siteReadingFont=saved.font;
  document.documentElement.dataset.siteReadingItalic=String(saved.italic);
  if(families[saved.font])document.documentElement.style.setProperty('--site-reading-family',families[saved.font]);
  else document.documentElement.style.removeProperty('--site-reading-family');
  select.value=saved.font;italic.checked=saved.italic;
  try{localStorage.setItem(key,JSON.stringify(saved))}catch{}
 }
 button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden))});
 select.addEventListener('change',()=>{saved.font=families[select.value]!==undefined?select.value:'original';apply()});
 italic.addEventListener('change',()=>{saved.italic=italic.checked;apply()});
 tool.querySelector('#site-typeface-reset').addEventListener('click',()=>{saved={font:'original',italic:false};apply()});
 document.addEventListener('pointerdown',event=>{if(!tool.contains(event.target)){panel.hidden=true;button.setAttribute('aria-expanded','false')}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus()}});
 apply();
}

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
 ensureSelectionAudio();
 // Allow other deferred controls to mount before placing the typography button.
 // The bilingual text reader has its own controls INSIDE the Latin and translation panels.
 // Do not insert another Aa control in the page header.
 if(page!=='lector-bilingue.html')setTimeout(ensureTypography,0);
 paint();new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:["class","data-theme","style"]});
 new MutationObserver(paint).observe(document.body,{attributes:true,attributeFilter:["class","data-theme","style"]});
});
})();
