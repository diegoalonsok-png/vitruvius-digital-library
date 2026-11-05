/* Apariencia de los visores de texto (fondo, color de letra, tipografía, cursiva y tamaño) y acciones de
   cada pasaje (Imprimir / PDF, WhatsApp, Correo). Preferencias locales del visitante, sin servidor.
   Se monta en la portada (tarjetas de locus del buscador) y en el Lector clásico. */
(()=>{
"use strict";
const KEY="vitruvius-viewer-appearance-v1";
const FONTS={original:"",georgia:'Georgia,"Times New Roman",serif',palatino:'Palatino,"Book Antiqua",serif',garamond:'"EB Garamond",Garamond,Georgia,serif',times:'"Times New Roman",Times,serif',arial:"Arial,Helvetica,sans-serif",system:"system-ui,-apple-system,sans-serif"};
const PRESETS={original:null,blanco:["#ffffff","#172a3b"],negro:["#000000","#ffffff"],marfil:["#fffff0","#1c2228"],sepia:["#ede0c9","#382d23"],noche:["#1d2733","#e9e2d4"]};
const hex=x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x);
let st={preset:"original",bg:"#ffffff",ink:"#172a3b",font:"original",italic:false,size:100};
try{const s=JSON.parse(localStorage.getItem(KEY)||"null");if(s&&hex(s.bg)&&hex(s.ink)&&s.font in FONTS)st={...st,...s,size:Math.min(160,Math.max(80,Number(s.size)||100))}}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch{}};
function css(){
 if(document.getElementById("va-css"))return;
 const s=document.createElement("style");s.id="va-css";s.textContent=`
.va-bar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;font:12.5px/1.5 system-ui,sans-serif;margin:10px 0 14px;padding:8px 0;border-top:1px solid rgba(150,140,120,.35);border-bottom:1px solid rgba(150,140,120,.35)}
.va-bar strong{font-weight:600;letter-spacing:.04em}.va-bar select,.va-bar input[type=color]{font:inherit}.va-bar input[type=color]{width:34px;height:24px;padding:0;border:1px solid #999;background:none}
.va-bar button{font:inherit;background:none;border:1px solid rgba(150,140,120,.6);color:inherit;padding:3px 9px;cursor:pointer;border-radius:3px}
[data-va=on] .va-target{background:var(--va-bg)!important;color:var(--va-ink)!important}
[data-va=on] .va-target *:not(mark){color:inherit!important;background-color:transparent!important}
[data-va-font=on] .va-target .va-text,[data-va-font=on] .va-target .parallel-passage,[data-va-font=on] .va-target .txt{font-family:var(--va-font)!important}
.va-scope .va-target .va-text,.va-scope .va-target .parallel-passage,.va-scope .va-target .txt{font-size:calc(var(--va-size,100) * 1%)!important}
[data-va-italic=on] .va-target .parallel-passage,[data-va-italic=on] .va-target .txt{font-style:italic}
.va-actions{display:inline-flex;gap:8px;flex-wrap:wrap;align-items:center}
.va-actions a,.va-actions button{display:inline-flex;align-items:center;gap:6px;font:600 11.5px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;padding:7px 12px!important;border:1px solid var(--gold,#b8955a)!important;border-radius:999px;background:transparent;color:inherit!important;text-decoration:none!important;cursor:pointer;transition:background .15s,color .15s}
.va-actions a:hover,.va-actions button:hover{background:var(--gold,#b8955a);color:#111!important}
.va-actions svg{width:14px;height:14px;fill:currentColor}`;
 document.head.append(s);
}
function apply(scope){
 const custom=st.preset!=="original";const [bg,ink]=st.preset==="personal"?[st.bg,st.ink]:(PRESETS[st.preset]||[st.bg,st.ink]);
 scope.classList.add("va-scope");
 scope.dataset.va=custom?"on":"off";scope.style.setProperty("--va-bg",bg);scope.style.setProperty("--va-ink",ink);
 scope.dataset.vaFont=st.font!=="original"?"on":"off";scope.style.setProperty("--va-font",FONTS[st.font]||"inherit");
 scope.dataset.vaItalic=st.italic?"on":"off";scope.style.setProperty("--va-size",String(st.size));
 // Estilo en línea con prioridad: los paneles tienen reglas propias de tema claro/oscuro con !important.
 for(const t of scope.querySelectorAll(".va-target")){
  if(custom){t.style.setProperty("background",bg,"important");t.style.setProperty("color",ink,"important")}
  else{t.style.removeProperty("background");t.style.removeProperty("color")}
 }
 lastScope=scope;
}
let lastScope=null;
function bar(scope,label){
 css();const b=document.createElement("div");b.className="va-bar";b.setAttribute("role","group");b.setAttribute("aria-label","Apariencia del visor");
 b.innerHTML=`<strong>${label}</strong>
<label>Fondo <select data-k="preset">${["original","blanco","negro","marfil","sepia","noche","personal"].map(p=>`<option value="${p}">${p==="original"?"Original":p==="personal"?"Personalizado":p[0].toUpperCase()+p.slice(1)}</option>`).join("")}</select></label>
<label>Color de fondo <input type="color" data-k="bg"></label><label>Color de letra <input type="color" data-k="ink"></label>
<label>Tipografía <select data-k="font">${Object.keys(FONTS).map(f=>`<option value="${f}">${{original:"Original",georgia:"Georgia",palatino:"Palatino",garamond:"Garamond",times:"Times",arial:"Arial",system:"Sistema"}[f]}</option>`).join("")}</select></label>
<label><input type="checkbox" data-k="italic"> Cursiva</label>
<button type="button" data-k="smaller" aria-label="Letra más chica">A−</button><button type="button" data-k="bigger" aria-label="Letra más grande">A+</button>
<button type="button" data-k="reset">Restablecer</button>`;
 const sync=()=>{b.querySelector("[data-k=preset]").value=st.preset;b.querySelector("[data-k=bg]").value=st.bg;b.querySelector("[data-k=ink]").value=st.ink;b.querySelector("[data-k=font]").value=st.font;b.querySelector("[data-k=italic]").checked=st.italic};
 b.addEventListener("input",e=>{const k=e.target.dataset.k;if(!k)return;
  if(k==="preset"){st.preset=e.target.value;if(PRESETS[st.preset]){[st.bg,st.ink]=PRESETS[st.preset]}}
  else if(k==="bg"||k==="ink"){st[k]=e.target.value;st.preset="personal"}
  else if(k==="font")st.font=e.target.value;else if(k==="italic")st.italic=e.target.checked;
  save();apply(scope);sync()});
 b.addEventListener("click",e=>{const k=e.target.dataset.k;
  if(k==="smaller")st.size=Math.max(80,st.size-10);else if(k==="bigger")st.size=Math.min(160,st.size+10);
  else if(k==="reset")st={preset:"original",bg:"#ffffff",ink:"#172a3b",font:"original",italic:false,size:100};else return;save();apply(scope);sync()});
 sync();apply(scope);return b;
}
/* Acciones por pasaje: imprimir o guardar como PDF solo esa tarjeta, WhatsApp y correo con el enlace al locus. */
function actions(card,title,url){
 const box=document.createElement("span");box.className="va-actions";
 const text=title+" — "+url;
 const icon=d=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';
 const pr=document.createElement("button");pr.type="button";pr.innerHTML=icon("M6 9V2h12v7h2a2 2 0 0 1 2 2v6h-4v5H6v-5H2v-6a2 2 0 0 1 2-2h2zm2-5v5h8V4H8zm0 12v4h8v-4H8z")+"PDF · Imprimir";pr.title="Imprimir o guardar este pasaje como PDF";
 pr.addEventListener("click",()=>{const w=window.open("","_blank");if(!w)return window.print();
  const clone=card.cloneNode(true);clone.querySelectorAll("button,select,.va-actions,.result-actions,dialog").forEach(x=>x.remove());
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title.replace(/</g,"&lt;")}</title><style>body{font:16px/1.7 Georgia,serif;max-width:1000px;margin:30px auto;padding:0 20px;color:#111}mark{background:#ffe14d}.parallel-columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}</style></head><body>${clone.innerHTML}<p style="font:12px system-ui;color:#555">${url.replace(/</g,"&lt;")}</p></body></html>`);
  w.document.close();w.focus();setTimeout(()=>w.print(),300)});
 const wa=document.createElement("a");wa.innerHTML=icon("M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.8-1.1-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z")+"WhatsApp";wa.target="_blank";wa.rel="noopener";wa.href="https://wa.me/?text="+encodeURIComponent(text);
 const ml=document.createElement("a");ml.innerHTML=icon("M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.4V17h16V7.4l-8 5.3-8-5.3zM5.5 7l6.5 4.3L18.5 7h-13z")+"Correo";ml.href="mailto:?subject="+encodeURIComponent(title)+"&body="+encodeURIComponent(text);
 box.append(pr,wa,ml);return box;
}
window.VitruviusViewerAppearance={bar,apply,actions};
function front(){
 const results=document.getElementById("search-results");if(!results)return;
 let mounted=false;
 const decorate=()=>{
  const cards=results.querySelectorAll("article.result-parallel");
  if(cards.length&&!mounted){mounted=true;results.before(bar(results,"Apariencia de los pasajes"))}
  for(const c of cards){if(c.dataset.va)continue;c.dataset.va="1";
   c.querySelectorAll(".parallel-latin,.parallel-translation").forEach(x=>x.classList.add("va-target"));
   if(mounted)apply(results);
   const link=c.querySelector('a[href*="lector-bilingue.html"]');const acts=c.querySelector(".result-actions");
   if(acts){const h=c.querySelector("h2,h3")?.textContent?.trim()||"Vitruvio, De architectura";
    acts.append(actions(c,h,link?link.href:location.href))}
  }
 };
 new MutationObserver(decorate).observe(results,{childList:true,subtree:true});decorate();
}
function classic(){
 const grid=document.querySelector(".lc-grid");if(!grid)return;
 grid.querySelectorAll(".lc-pane").forEach(p=>p.classList.add("va-target"));
 grid.before(bar(grid,"Apariencia del visor"));
}
const start=()=>{front();classic()};
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
})();
