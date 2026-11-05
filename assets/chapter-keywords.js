/* Palabras clave latinas por prefacio y capítulo de De architectura (≈20 por unidad).
   Fuente: data/vitruvius-chapter-keywords.json (scripts/build-chapter-keywords.py, latín de V514).
   Uso: VitruviusKeywords.mount(contenedor, {onPick(term, unit)}) — un panel desplegable común a los buscadores. */
(()=>{
"use strict";
const URL_DATA="data/vitruvius-chapter-keywords.json?v=20261105-kw-v1";
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
let promise=null;
const load=()=>promise||(promise=fetch(URL_DATA).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).catch(e=>{promise=null;throw e}));
const T={es:{title:"Palabras clave por libro, prefacio y capítulo",book:"Libro",unit:"Parte",praef:"Prefacio",cap:"Capítulo",hint:"Términos latinos más característicos de cada parte (texto de V514). Selecciona uno para buscarlo."},
 en:{title:"Keywords by book, preface and chapter",book:"Book",unit:"Part",praef:"Preface",cap:"Chapter",hint:"Most characteristic Latin terms of each part (V514 text). Select one to search it."},
 fr:{title:"Mots-clés par livre, préface et chapitre",book:"Livre",unit:"Partie",praef:"Préface",cap:"Chapitre",hint:"Termes latins les plus caractéristiques de chaque partie (texte de V514). Choisissez-en un pour le rechercher."}};
function mount(container,{onPick,open=false,lang}={}){
 if(!container||container.querySelector(".vk-panel"))return;
 const L=T[(lang||document.documentElement.lang||"es").slice(0,2)]||T.es;
 const d=document.createElement("details");d.className="vk-panel";d.open=open;
 d.style.cssText="margin:12px 0;padding:10px 14px;border:1px solid rgba(160,140,100,.45);border-radius:4px";
 const s=document.createElement("summary");s.textContent=L.title;s.style.cssText="cursor:pointer;font-weight:600";d.append(s);
 const bar=document.createElement("div");bar.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:10px 0 6px";
 const mk=(label)=>{const l=document.createElement("label");l.style.cssText="display:inline-flex;gap:6px;align-items:center";l.append(label);const sel=document.createElement("select");sel.style.cssText="font:inherit;padding:4px 6px";l.append(sel);bar.append(l);return sel};
 const book=mk(L.book),part=mk(L.unit);
 const hint=document.createElement("p");hint.textContent=L.hint;hint.style.cssText="font-size:.85em;margin:4px 0 8px;opacity:.85";
 const chips=document.createElement("div");chips.style.cssText="display:flex;flex-wrap:wrap;gap:6px";
 const range=document.createElement("p");range.style.cssText="font-size:.85em;margin:8px 0 0;opacity:.85";
 d.append(bar,hint,chips,range);container.append(d);
 let data=null;
 const render=()=>{const u=data.units.find(x=>x.unit===part.value);chips.replaceChildren();if(!u)return;
  for(const k of u.keywords){const b=document.createElement("button");b.type="button";b.lang="la";b.textContent=k.term;b.title=k.count+"×";
   b.style.cssText="font:inherit;font-size:.92em;padding:3px 9px;border:1px solid rgba(160,140,100,.6);border-radius:14px;background:transparent;color:inherit;cursor:pointer";
   b.addEventListener("click",()=>onPick&&onPick(k.term,u));chips.append(b)}
  range.textContent="Vitr. "+R[u.book]+(u.part==="praefatio"?", praef.":"."+u.chapter)+" · loci "+u.first+" – "+u.last};
 const fillParts=()=>{part.replaceChildren();for(const u of data.units.filter(x=>String(x.book)===book.value)){const o=document.createElement("option");o.value=u.unit;o.textContent=u.part==="praefatio"?L.praef:L.cap+" "+u.chapter;part.append(o)}render()};
 const init=()=>load().then(j=>{data=j;if(book.options.length)return;for(let b=1;b<=10;b++){const o=document.createElement("option");o.value=String(b);o.textContent=L.book+" "+R[b];book.append(o)}fillParts()}).catch(e=>{hint.textContent="Índice de palabras clave no disponible: "+e.message});
 book.addEventListener("change",fillParts);part.addEventListener("change",render);
 d.addEventListener("toggle",()=>{if(d.open)init()});if(open)init();
 return {select(unit){if(!data)return;const u=data.units.find(x=>x.unit===unit);if(!u)return;book.value=String(u.book);fillParts();part.value=unit;render()}};
}
window.VitruviusKeywords={load,mount,version:"1.0"};
})();
