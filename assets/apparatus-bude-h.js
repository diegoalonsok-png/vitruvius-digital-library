/* Codex H: provenance-aware witness panel for the Budé-style apparatus. */
(()=>{
"use strict";
const mount=document.getElementById("ab-h-reading");
if(!mount)return;
let generation=0;
const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const link=(text,href)=>{const a=make("a",text);a.href=href;return a};
async function render(locus){
 const ticket=++generation;mount.replaceChildren(make("p","Buscando el locus "+locus+" en el mapa material de Harley MS 2767…"));
 try{
  if(!window.CodexHConcordance)throw Error("Concordancia no cargada");
  const record=await window.CodexHConcordance.locate(locus);if(ticket!==generation)return;
  mount.replaceChildren();
  const list=record.exact||[];
  if(list.length){
   const label=make("p","Correspondencia(s) registradas: "+list.length+". La calificación corresponde al anclaje folio–locus, no a una colación letra por letra.");mount.append(label);
   const ul=make("ul");
   for(const e of list){
    const li=make("li");const evidence=window.CodexHConcordance.label(e.status)||e.status||"estado no indicado";
    li.append("H, f. "+e.folio+" — "+evidence+". ");
    if(e.note)li.append(make("span",e.note+" "));
    li.append(link("Examinar fotografía ampliable", "codex-h-folios-local.html?folio="+encodeURIComponent(e.folio)+"&locus="+encodeURIComponent(locus)));
    ul.append(li);
   }
   mount.append(ul);
  }else if(record.estimate){
   const e=record.estimate;mount.append(make("p","Sin correspondencia material de locus comprobada. Orientación aproximada: f. "+e.folio+" (intervalo "+e.from+"–"+e.to+"). No utilizar esta estimación como lectura del manuscrito."));
   mount.append(link("Abrir folio orientativo", "codex-h-folios-local.html?folio="+encodeURIComponent(e.folio)+"&locus="+encodeURIComponent(locus)));
  }else mount.append(make("p","Sin folio asignado a este locus; no implica ausencia del pasaje en H."));
  const nav=make("p");
  nav.append(link("Registro ecdótico: observaciones H", "registro-ecdotico.html?tipo=lectura-h&q="+encodeURIComponent(locus)));
  nav.append(" · ");
  nav.append(link("Catálogo institucional de Harley MS 2767", "https://searcharchives.bl.uk/catalog/040-002048598"));
  mount.append(nav);
 }catch(err){if(ticket===generation)mount.replaceChildren(make("p","No se pudo consultar la concordancia H: "+err.message));}
}
window.addEventListener("vitruvius:bude-locus",event=>{if(event.detail?.locus)render(event.detail.locus)});
render(new URLSearchParams(location.search).get("locus")||"1.1.1");
})();