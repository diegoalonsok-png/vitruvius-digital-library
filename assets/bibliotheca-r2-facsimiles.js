/* Bibliotheca ampliada (R2): capa aditiva, solo lectura.
 * 1) En las portadas (#classics-audit-coverage) agrega el total de obras de la biblioteca
 *    (fichas del repertorio + obras nuevas en facsímil) y el número de facsímiles PDF,
 *    sin alterar el contador auditado de fichas.
 * 2) Junto a cada enlace a una ficha académica (classics-work-record.html?work=…) agrega
 *    el enlace al facsímil de dominio público alojado en libros.vitruvius-digital-library.org.
 * 3) En la ficha académica de una obra, muestra sus facsímiles.
 * No modifica el repertorio ni ningún original.
 */
(()=>{
"use strict";
const lang=(document.documentElement.lang||"es").slice(0,2);
const T=({
 en:{total:"works in the library",fichas:"academic records",nuevas:"new works",fac:"public-domain PDF facsimiles",pdf:"Facsimile PDF",loeb:"Loeb",vol:"vol.",box:"Public-domain facsimile",note:"Hosted at libros.vitruvius-digital-library.org; OCR text not reviewed."},
 fr:{total:"œuvres dans la bibliothèque",fichas:"fiches académiques",nuevas:"œuvres nouvelles",fac:"fac-similés PDF du domaine public",pdf:"Fac-similé PDF",loeb:"Loeb",vol:"vol.",box:"Fac-similé du domaine public",note:"Hébergé sur libros.vitruvius-digital-library.org ; OCR non révisé."}
})[lang]||{total:"obras en la biblioteca",fichas:"fichas académicas",nuevas:"obras nuevas",fac:"facsímiles PDF de dominio público",pdf:"Facsímil PDF",loeb:"Loeb",vol:"vol.",box:"Facsímil de dominio público",note:"Alojado en libros.vitruvius-digital-library.org; el texto OCR no está revisado."};
const fmt=n=>Number(n).toLocaleString("es-AR");
const label=e=>T.pdf+" · "+[e.loeb?T.loeb:"",e.anio,e.volumen?T.vol+" "+String(e.volumen).replace(/^vol(ume)?\.?\s*/i,""):""].filter(Boolean).join(" ");
fetch("data/r2/vinculos-repertorio.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(v=>{
 if(v?.schema!=="vdl-r2-vinculos-repertorio-1"||!v.recuentos||!v.porObra)return;
 const c=v.recuentos;
 // 1) Portadas
 const host=document.getElementById("classics-audit-coverage");
 const row=host&&host.querySelector("div");
 if(row&&!row.querySelector("[data-r2-total]")){
  const total=document.createElement("span");total.dataset.r2Total="";
  const s=document.createElement("strong");s.textContent=fmt(c.obrasTotales);
  total.append(s," "+T.total+" ("+fmt(c.fichasRepertorio)+" "+T.fichas+" + "+fmt(c.obrasNuevas)+" "+T.nuevas+")");
  const fac=document.createElement("span");fac.dataset.r2Facsimiles="";
  const s2=document.createElement("strong");s2.textContent=fmt(c.edicionesFacsimil);
  const a2=document.createElement("a");a2.href="bibliotheca-ampliada.html";a2.textContent=T.fac;
  fac.append(s2," ",a2);
  row.prepend(total,fac);
 }
 // 2) Enlaces junto a fichas académicas
 const decorar=root=>{
  root.querySelectorAll?.('a[href*="classics-work-record.html?work="]:not([data-r2-done])').forEach(link=>{
   link.dataset.r2Done="";
   const id=new URL(link.getAttribute("href"),location.href).searchParams.get("work");
   const eds=v.porObra[id];
   if(!eds||!eds.length||link.closest("[data-r2-box]"))return;
   const frag=document.createDocumentFragment();
   eds.forEach(e=>{const x=document.createElement("a");x.href=e.pdf;x.rel="noopener";x.className=link.className||"genre-work-version";
    x.textContent=label(e);x.title=e.edicion+(e.alcance?" — "+e.alcance:"");x.dataset.r2Pdf="";x.style.marginLeft="8px";frag.append(x)});
   link.after(frag);
  });
 };
 if(!/classics-work-record/.test(location.pathname)){
  decorar(document);
  new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>n.nodeType===1&&decorar(n)))).observe(document.body,{childList:true,subtree:true});
 }
 // 3) Ficha académica
 const work=new URLSearchParams(location.search).get("work");
 if(/classics-work-record/.test(location.pathname)&&work&&v.porObra[work]&&!document.querySelector("[data-r2-box]")){
  const box=document.createElement("aside");box.dataset.r2Box="";
  box.style.cssText="border:1px solid rgba(128,128,128,.45);padding:12px 16px;margin:16px auto;max-width:1100px;font:14px/1.6 Georgia,serif";
  const h=document.createElement("strong");h.textContent=T.box;box.append(h);
  const ul=document.createElement("ul");ul.style.margin="6px 0";
  v.porObra[work].forEach(e=>{const li=document.createElement("li");const a=document.createElement("a");a.href=e.pdf;a.rel="noopener";a.textContent=e.edicion+" ("+e.anio+(e.volumen?", "+T.vol+" "+e.volumen:"")+")";li.append(a);
   if(e.alcance)li.append(" — "+e.alcance);ul.append(li)});
  const p=document.createElement("p");p.style.cssText="font:12px/1.5 system-ui;margin:0;opacity:.8";
  const more=document.createElement("a");more.href="bibliotheca-ampliada.html";more.textContent="Bibliotheca ampliada";
  p.append(T.note+" ",more);
  box.append(ul,p);
  (document.querySelector("main")||document.body).prepend(box);
 }
}).catch(()=>{});
})();
