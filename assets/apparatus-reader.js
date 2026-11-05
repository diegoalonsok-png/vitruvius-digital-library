/* Lector bilingüe: aparato crítico y notas del locus abierto (ediciones V514 · V554 · V297).
   Se actualiza cada vez que cambia la referencia del pasaje. Declara siempre el grado del vínculo. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const R={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
const toLocus=v=>{const m=String(v||"").trim().toLowerCase().match(/^([ivx]+|\d{1,2})\.(praef\.)?(\d+)(?:\.(\d+))?$/);if(!m)return null;
 const b=R[m[1]]||Number(m[1]);return m[2]?b+".praef."+m[3]:m[4]?b+"."+m[3]+"."+m[4]:null};
const T={es:{h:"Aparato crítico y notas de este locus",none:"No hay aparato ni notas vinculados a este locus en el índice de las tres ediciones.",all:"Ver el aparato completo del locus →",pdf:"Página impresa ↗",n:"entradas"},
 fr:{h:"Apparat critique et notes de ce locus",none:"Aucun apparat ni note lié à ce locus dans l’index des trois éditions.",all:"Voir tout l’apparat du locus →",pdf:"Page imprimée ↗",n:"entrées"},
 en:{h:"Critical apparatus and notes for this locus",none:"No apparatus or notes linked to this locus in the index of the three editions.",all:"See the full apparatus for this locus →",pdf:"Printed page ↗",n:"entries"}};
let box,last="",ticket=0;
function ensure(){
 if(box)return box;
 box=document.createElement("section");box.id="locus-apparatus";box.className="scholarly-panel";box.setAttribute("aria-live","polite");
 box.style.cssText="margin:22px 0;padding:18px 20px;border-left:3px solid #C9A84C";
 const anchor=$("other-translations")||$("edition-reference");anchor?.parentNode?.insertBefore(box,anchor.nextSibling);
 return box
}
async function render(){
 const A=window.KuriloApparatus;if(!A)return;
 const locus=toLocus($("locus")?.value);const lang=$("lang")?.value||"es";const key=locus+"|"+lang;
 if(!locus||key===last)return;last=key;const my=++ticket;
 let hits=[];try{hits=await A.forLocus(locus,{lang,limit:8})}catch(e){hits=null}
 if(my!==ticket)return;
 const t=T[lang]||T.es,el=ensure();el.replaceChildren();
 const eyebrow=document.createElement("p");eyebrow.className="eyebrow";eyebrow.textContent=t.h.toUpperCase()+" · "+A.cite(locus);el.append(eyebrow);
 if(!hits){const p=document.createElement("p");p.textContent="Índice del aparato no disponible.";el.append(p);return}
 if(!hits.length){const p=document.createElement("p");p.textContent=t.none;el.append(p)}
 for(const e of hits){
  const d=document.createElement("details"),s=document.createElement("summary");
  s.textContent=A.kindLabel(e.kind,lang)+" · "+e.version+(e.page?" · PDF p. "+e.page:"")+" — "+A.relationLabel(e.relation,lang);
  const p=document.createElement("p");p.textContent=e.text;p.style.cssText="white-space:pre-line;margin:.6em 0";
  const a=document.createElement("a");a.href=e.pdf;a.target="_blank";a.rel="noopener";a.textContent=t.pdf;
  d.append(s,p,a);if(e.relation==="explicit"&&e.edition===({es:"recensio-es",fr:"recensio-fr",en:"theory-en"}[lang]))d.open=!el.querySelector("details[open]");
  el.append(d)
 }
 const more=document.createElement("p"),link=document.createElement("a");link.href="aparato-critico.html?locus="+encodeURIComponent(locus);link.textContent=t.all;more.append(link);el.append(more)
}
function start(){
 const ref=$("passage-ref");if(!ref)return;
 new MutationObserver(()=>setTimeout(render,60)).observe(ref,{childList:true,characterData:true,subtree:true});
 $("lang")?.addEventListener("change",()=>setTimeout(render,200));
 setTimeout(render,600)
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
})();
