/* Barra de búsqueda por palabra para las páginas de corpus clásico (corpus/*.html):
   resaltado amarillo de todas las coincidencias, navegación ↑/↓ y diccionario al hacer clic.
   Uso: <script defer src="../assets/classical-find-bar.js" data-work="cicero-officiis" data-lookup="la|off"></script>
   Acepta ?q= en la URL para abrir con una palabra ya resaltada. */
(()=>{
"use strict";
const me=document.currentScript;const work=me?.dataset.work||"";const lookupMode=me?.dataset.lookup||"la";
const base=(me?.src||"").replace(/assets\/classical-find-bar\.js.*$/,"");
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn()}
function loadLex(){return window.ClassicalLexicon?Promise.resolve():new Promise(r=>{const s=document.createElement("script");s.src=base+"assets/classical-lexicon.js?v=20261105-lex-v2";s.onload=r;s.onerror=r;document.head.append(s)})}
ready(async()=>{
 await loadLex();const LEX=window.ClassicalLexicon;if(!LEX)return;LEX.css();
 const root=document.querySelector("main")||document.body;
 const st=document.createElement("style");
 st.textContent=`.cl-findbar{position:fixed;left:14px;bottom:14px;z-index:60;font:13px/1.4 system-ui,-apple-system,sans-serif;color:#1d232a}
.cl-findbar>button.cl-toggle{background:#fffdf7;border:1px solid #b9ad95;border-radius:3px;padding:8px 12px;cursor:pointer;box-shadow:0 3px 10px #0002;color:inherit}
.cl-findbar .cl-box{display:none;width:min(380px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:#fffdf7;border:1px solid #b9ad95;border-radius:3px;box-shadow:0 6px 22px #0003;padding:12px}
.cl-findbar.open .cl-box{display:block}.cl-findbar.open>button.cl-toggle{display:none}
.cl-findbar form{display:flex;gap:6px}.cl-findbar input{flex:1;min-width:0;padding:7px 9px;border:1px solid #b9ad95;border-radius:3px;font:inherit}
.cl-findbar button{background:none;border:1px solid #b9ad95;border-radius:3px;padding:6px 9px;cursor:pointer;color:inherit;font:inherit}
.cl-findbar .cl-row{display:flex;gap:6px;align-items:center;margin-top:8px}.cl-findbar .cl-count{flex:1;color:#5c5a55;font-size:12px}
html[data-theme=dark] .cl-findbar{color:#f3efe8}html[data-theme=dark] .cl-findbar .cl-box,html[data-theme=dark] .cl-findbar>button.cl-toggle{background:#222832;border-color:#596068}
html[data-theme=dark] .cl-findbar input{background:#171a1e;color:#f3efe8;border-color:#596068}
@media print{.cl-findbar{display:none!important}}`;
 document.head.append(st);
 const bar=document.createElement("div");bar.className="cl-findbar cl-ui";bar.setAttribute("role","search");
 bar.innerHTML=`<button type="button" class="cl-toggle" aria-expanded="false">⌕ Buscar palabra · diccionario</button>
<div class="cl-box"><form><label class="cl-sr" style="position:absolute;left:-9999px" for="cl-q">Buscar palabra en el texto</label><input id="cl-q" type="search" placeholder="Palabra latina o griega…" autocomplete="off"><button type="submit">Buscar</button><button type="button" class="cl-close" aria-label="Cerrar">✕</button></form>
<div class="cl-row"><span class="cl-count" role="status" aria-live="polite"></span><button type="button" class="cl-prev" aria-label="Coincidencia anterior">↑</button><button type="button" class="cl-next" aria-label="Coincidencia siguiente">↓</button></div>
<div class="cl-dict-area"></div><p style="font-size:11px;color:#77736b;margin:8px 0 0">${lookupMode==="off"?"Resaltado en amarillo de todas las coincidencias.":"Haga clic en una palabra del texto para consultar el diccionario."}</p></div>`;
 document.body.append(bar);
 const q=bar.querySelector("#cl-q"),count=bar.querySelector(".cl-count"),dict=bar.querySelector(".cl-dict-area");
 let marks=[],at=-1;
 const open=()=>{bar.classList.add("open");bar.querySelector(".cl-toggle").setAttribute("aria-expanded","true");q.focus()};
 const close=()=>{bar.classList.remove("open");bar.querySelector(".cl-toggle").setAttribute("aria-expanded","false")};
 function go(step){if(!marks.length)return;marks[at]?.classList.remove("cl-current");at=(at+step+marks.length)%marks.length;const m=marks[at];m.classList.add("cl-current");
  const det=m.closest("details");if(det&&!det.open)det.open=true;
  m.scrollIntoView({block:"center",behavior:"smooth"});count.textContent=(at+1)+" / "+marks.length+" coincidencias"}
 function run(term){
  marks=LEX.highlightDom(root,term);at=-1;
  count.textContent=term?(marks.length?marks.length+" coincidencias":"Sin coincidencias en esta página"):"";
  if(marks.length)go(1);
  if(term&&lookupMode!=="off"&&marks.length&&!/\s/.test(term.trim())){const w=LEX.wordOfMark(marks[0]);LEX.renderPanel(dict,w,{lang:LEX.detectLang(w),work})}
  const u=new URL(location.href);if(term)u.searchParams.set("q",term);else u.searchParams.delete("q");history.replaceState(null,"",u);
 }
 bar.querySelector(".cl-toggle").addEventListener("click",open);
 bar.querySelector(".cl-close").addEventListener("click",()=>{LEX.clearDom(root);marks=[];count.textContent="";close()});
 bar.querySelector("form").addEventListener("submit",e=>{e.preventDefault();run(q.value.trim())});
 bar.querySelector(".cl-prev").addEventListener("click",()=>go(-1));bar.querySelector(".cl-next").addEventListener("click",()=>go(1));
 document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="f"){e.preventDefault();open()}});
 if(lookupMode!=="off")LEX.attachClick(root,()=>{open();return dict},w=>({lang:LEX.detectLang(w),work}));
 const initial=new URLSearchParams(location.search).get("q");if(initial){q.value=initial;open();run(initial)}
});
})();
