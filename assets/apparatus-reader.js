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
 if(window.CodexHConcordance){const hp=document.createElement("p");hp.style.cssText="margin:.2em 0 .8em;font-size:.93em";el.append(hp);
  window.CodexHConcordance.locate(locus).then(c=>{if(my!==ticket)return;const ex=c.exact.find(x=>x.status!=="catalogue"),f=ex?ex.folio:c.estimate&&c.estimate.folio;if(!f)return;
   const a=document.createElement("a");a.href="codex-h-folios-local.html?locus="+encodeURIComponent(locus);a.textContent="Codex H · f. "+f+" →";
   hp.append(a," "+(ex?"("+window.CodexHConcordance.label(ex.status)+")":"(posición estimada en el libro "+c.book.roman+", ff. "+c.book.start+"–"+c.book.end+")"),"  ·  ");
   const l=document.createElement("a");l.href="laboratorio-h.html?locus="+encodeURIComponent(locus);l.textContent="Lectura paralela en el Laboratorio H →";hp.append(l)}).catch(()=>{})}
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
 fetch("data/laminas-historicas.json?v=20261105-v1").then(r=>r.ok?r.json():null).then(d=>{if(!d||my!==ticket)return;
  const ch=locus.split(".").slice(0,2).join("."),rel=d.entries.filter(e=>e.locus&&(e.locus===locus||e.locus.split(".").slice(0,2).join(".")===ch));if(!rel.length)return;
  const h=document.createElement("p");h.className="eyebrow";h.style.marginTop="14px";h.textContent=(lang==="en"?"RELATED HISTORICAL PLATES":lang==="fr"?"PLANCHES HISTORIQUES LIÉES":"LÁMINAS HISTÓRICAS RELACIONADAS");el.append(h);
  const row=document.createElement("div");row.style.cssText="display:flex;gap:12px;flex-wrap:wrap";
  for(const e of rel.slice(0,6)){const a=document.createElement("a");a.href="iconografia-vitruviana.html#lamina-"+e.id;a.style.cssText="display:flex;flex-direction:column;width:170px;font-size:.85em;gap:4px;text-decoration:none";
   const src=e.status==="en el repositorio"?e.local:e.commons?"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(e.commons.replace(/ /g,"_"))+"?width=340":null;
   if(src){const im=document.createElement("img");im.src=src;im.alt=e.title;im.loading="lazy";im.style.cssText="width:170px;height:120px;object-fit:contain;background:#f3eee4";a.append(im)}
   const c=document.createElement("span");c.textContent=e.title+" · "+[e.folio,e.plate].filter(Boolean).join(" · ");a.append(c);row.append(a)}
  el.append(row)}).catch(()=>{})
}
function start(){
 const ref=$("passage-ref");if(!ref)return;
 new MutationObserver(()=>setTimeout(render,60)).observe(ref,{childList:true,characterData:true,subtree:true});
 $("lang")?.addEventListener("change",()=>setTimeout(render,200));
 setTimeout(render,600)
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
})();
