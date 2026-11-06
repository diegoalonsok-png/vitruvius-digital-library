/* Lectura léxica: un clic sobre una palabra latina o griega del texto original muestra su lema,
   el análisis morfológico y la glosa breve (Lewis & Short / LSJ), con enlaces a Vitruvia Lexicon.
   Datos: data/lexicon/forms-la.json y forms-grc.json (índices del sitio), cargados solo al primer uso.
   Uso: VitruviaLecturaLexica.wrap(text, lang) → HTML con <span class="lw"> por palabra;
        VitruviaLecturaLexica.attach(contenedor) → activa los clics. */
(()=>{
"use strict";
const ROOT=(()=>{try{return new URL(".",new URL("..",document.currentScript.src)).href}catch{return""}})();
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ").replace(/j/g,"i").replace(/v/g,"u").replace(/[ʼ’]/g,"'");
const TOKEN=/[\p{L}\p{M}][\p{L}\p{M}'ʼ’]*/gu;
const own=(o,k)=>o&&Object.hasOwn(o,k)?o[k]:null;
const cache={};
function index(lang){if(!cache[lang])cache[lang]=fetch(ROOT+`data/lexicon/forms-${lang}.json`,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()});return cache[lang]}
const TAG=[[0,{n:"sustantivo",v:"verbo",a:"adjetivo",d:"adverbio",l:"artículo",g:"partícula",c:"conjunción",r:"preposición",p:"pronombre",m:"numeral",i:"interjección"}],[2,{1:"1.ª pers.",2:"2.ª pers.",3:"3.ª pers."}],[3,{s:"singular",p:"plural",d:"dual"}],[4,{p:"presente",i:"imperfecto",r:"perfecto",l:"pluscuamperfecto",t:"futuro perfecto",f:"futuro",a:"aoristo"}],[5,{i:"indicativo",s:"subjuntivo",o:"optativo",n:"infinitivo",m:"imperativo",p:"participio"}],[6,{a:"activa",p:"pasiva",m:"media",e:"mediopasiva"}],[7,{m:"masculino",f:"femenino",n:"neutro"}],[8,{n:"nominativo",g:"genitivo",d:"dativo",a:"acusativo",v:"vocativo",l:"locativo"}],[9,{c:"comparativo",s:"superlativo"}]];
function decodeTag(t){t=String(t||"");if(t.length===9)t=t[0]+"-"+t.slice(1);return TAG.map(([i,v])=>v[t[i]]).filter(Boolean).join(" · ")}
const lemmaShow=l=>String(l).replace(/\d+$/,"");
function wrap(text,lang,markFn){
 const src=String(text||"");let out="",last=0;
 for(const m of src.matchAll(TOKEN)){out+=markFn?markFn(src.slice(last,m.index)):esc(src.slice(last,m.index));out+=`<span class="lw" data-l="${lang}">${markFn?markFn(m[0]):esc(m[0])}</span>`;last=m.index+m[0].length}
 return out+(markFn?markFn(src.slice(last)):esc(src.slice(last)));
}
let pop=null;
function close(){pop?.remove();pop=null}
async function show(span){
 close();const lang=span.dataset.l==="grc"?"grc":"la";const form=span.textContent.trim();const key=fold(form).replace(/'+$/,"");
 pop=document.createElement("div");pop.className="lw-pop";pop.setAttribute("role","dialog");pop.setAttribute("aria-label","Análisis de "+form);
 pop.innerHTML=`<p class="lw-h"><b lang="${lang}">${esc(form)}</b> <button type="button" class="lw-x" aria-label="Cerrar">×</button></p><p class="lw-m">Cargando el índice léxico…</p>`;
 document.body.append(pop);const r=span.getBoundingClientRect();pop.style.top=(window.scrollY+r.bottom+6)+"px";pop.style.left=Math.max(8,Math.min(window.scrollX+r.left,window.scrollX+document.documentElement.clientWidth-340))+"px";
 pop.querySelector(".lw-x").onclick=close;
 try{
  const D=await index(lang);if(!pop)return;
  const an=own(D.forms,key);const list=Array.isArray(an)?an:[];
  const lex="vitruvia-lexicon.html?mode=palabra&lang="+lang+"&q=";
  let html="";
  if(!list.length)html=`<p class="lw-m">Forma sin análisis en el índice del sitio (puede ser un nombre propio, una variante gráfica o una forma no lematizada).</p>`;
  else{
   const byLemma=new Map();for(const a of list){const l=a[0],t=a.length>2||typeof a[1]==="string"?a[1]:"";if(!byLemma.has(l))byLemma.set(l,new Set());if(t)byLemma.get(l).add(decodeTag(t))}
   if(byLemma.size>1)html+=`<p class="lw-amb">Forma ambigua: ${byLemma.size} lemas posibles; decide el contexto.</p>`;
   for(const [l,tags] of [...byLemma].slice(0,4)){const info=own(D.lemmas,l)||{};const g=info.g||"";
    html+=`<div class="lw-a"><p><a href="${ROOT}${lex}${encodeURIComponent("@"+lemmaShow(l))}" lang="${lang}"><b>${esc(info.h||lemmaShow(l))}</b></a>${g?` — <span class="lw-g">${esc(g.slice(0,140))}</span>`:""}</p>${[...tags].filter(Boolean).slice(0,3).map(t=>`<p class="lw-t">${esc(t)}</p>`).join("")}</div>`}
  }
  html+=`<p class="lw-links"><a href="${ROOT}${lex}${encodeURIComponent(form)}" target="_blank" rel="noopener">Ficha y concordancia en Lexicon ↗</a> · <a href="${ROOT}vitruvia.html?q=${encodeURIComponent(form)}" target="_blank" rel="noopener">Vitruvia ↗</a> · <a href="https://en.wiktionary.org/wiki/${encodeURIComponent(form.normalize("NFC"))}#${lang==="grc"?"Ancient_Greek":"Latin"}" target="_blank" rel="noopener">Wiktionary ↗</a>${lang==="la"?` · <a href="https://logeion.uchicago.edu/${encodeURIComponent(form)}" target="_blank" rel="noopener">Logeion ↗</a>`:` · <a href="https://logeion.uchicago.edu/${encodeURIComponent(form)}" target="_blank" rel="noopener">Logeion ↗</a>`}</p><p class="lw-src">${esc(D.sources||"")}</p>`;
  pop.querySelector(".lw-m").outerHTML=html;
 }catch(e){if(pop)pop.querySelector(".lw-m").textContent="No se pudo cargar el índice léxico ("+e.message+").";}
}
function attach(box){
 if(!box||box.dataset.lwOn)return;box.dataset.lwOn="1";
 box.addEventListener("click",e=>{const s=e.target.closest?.(".lw");if(!s||!box.contains(s))return;if(getSelection&&String(getSelection()).length>1)return;show(s)});
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
document.addEventListener("click",e=>{if(pop&&!pop.contains(e.target)&&!e.target.closest?.(".lw"))close()});
if(!document.querySelector("style[data-lw]")){const st=document.createElement("style");st.dataset.lw="";st.textContent=`.lw{cursor:pointer;border-radius:2px}.lw:hover{background:rgba(160,130,70,.18)}
.lw-pop{position:absolute;z-index:9999;width:330px;max-width:calc(100vw - 16px);padding:10px 14px;background:#fffdf8;color:#1d2a33;border:1px solid #b9a888;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:14px/1.5 system-ui,sans-serif;text-align:left}
.lw-pop p{margin:3px 0}.lw-h{display:flex;justify-content:space-between;align-items:center;font:18px/1.3 Georgia,serif}.lw-x{border:0;background:transparent;font-size:20px;cursor:pointer;color:inherit}
.lw-a{border-top:1px solid #e6dcc8;padding-top:4px;margin-top:4px}.lw-g{font-style:italic}.lw-t{color:#5b6670;font-size:12.5px}.lw-amb{color:#8a5a12;font-size:12.5px}.lw-links{border-top:1px solid #e6dcc8;padding-top:5px;margin-top:6px;font-size:12.5px}.lw-src{color:#7b8186;font-size:11px}
.lw-pop a{color:#24506e}html[data-theme=dark] .lw-pop{background:#1d2126;color:#e8e3d8;border-color:#5a5446}html[data-theme=dark] .lw-pop a{color:#9fc3dd}`;document.head.append(st)}
window.VitruviaLecturaLexica={wrap,attach,fold};
})();
